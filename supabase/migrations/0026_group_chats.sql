-- Group chats with an admin role.
--
-- conversations already had is_group and title from the very first migration,
-- unused. What was missing is who may add people: only admins, and only
-- admins may promote someone else to admin. The creator starts as the one.

alter table public.conversations
  add column if not exists created_by uuid references public.profiles (id) on delete set null;

alter table public.conversation_participants
  add column if not exists is_admin boolean not null default false;

-- Existing 1:1 chats: both sides count as admin so nothing about them changes.
update public.conversation_participants set is_admin = true;

-- ---------------------------------------------------------------------------
-- Membership checks
-- ---------------------------------------------------------------------------
-- SECURITY DEFINER for the same reason as is_conversation_participant: read
-- the table from inside a policy without re-entering that policy.
create or replace function public.is_conversation_admin(p_conversation_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.conversation_participants
    where conversation_id = p_conversation_id
      and user_id = auth.uid()
      and is_admin
  );
$$;

revoke all on function public.is_conversation_admin(uuid) from public;
grant execute on function public.is_conversation_admin(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Who may add whom
-- ---------------------------------------------------------------------------
drop policy if exists "users can add themselves or be added by a participant" on public.conversation_participants;
create policy "admins add members" on public.conversation_participants
  for insert with check (
    -- Bootstrap: the creator puts themselves in the conversation they just
    -- made. Deliberately not a bare "user_id = auth.uid()" - that would let
    -- anyone who learns a conversation id add themselves to it.
    (
      user_id = auth.uid()
      and exists (
        select 1 from public.conversations c
        where c.id = conversation_id and c.created_by = auth.uid()
      )
    )
    or public.is_conversation_admin(conversation_id)
  );

-- Leaving is always allowed; removing others requires admin.
drop policy if exists "leave or be removed by an admin" on public.conversation_participants;
create policy "leave or be removed by an admin" on public.conversation_participants
  for delete using (
    user_id = auth.uid()
    or public.is_conversation_admin(conversation_id)
  );

-- ---------------------------------------------------------------------------
-- Promotion goes through a function, never a direct update
-- ---------------------------------------------------------------------------
-- An RLS policy picks rows, it cannot restrict columns. The existing
-- "update own read state" policy matches your own row - so without the column
-- grant below, a user could set is_admin = true on themselves in the same
-- statement that touches last_read_at.
revoke update on public.conversation_participants from authenticated;
grant update (last_read_at) on public.conversation_participants to authenticated;

create or replace function public.set_group_admin(
  p_conversation_id uuid,
  p_user_id uuid,
  p_is_admin boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_conversation_admin(p_conversation_id) then
    raise exception 'Nur Admins können Rechte vergeben';
  end if;

  -- Don't let the last admin demote themselves - the group would be stuck
  -- with nobody able to add anyone.
  if not p_is_admin and p_user_id = auth.uid() and (
    select count(*) from public.conversation_participants
    where conversation_id = p_conversation_id and is_admin
  ) <= 1 then
    raise exception 'Die Gruppe braucht mindestens einen Admin';
  end if;

  update public.conversation_participants
  set is_admin = p_is_admin
  where conversation_id = p_conversation_id and user_id = p_user_id;
end;
$$;

revoke all on function public.set_group_admin(uuid, uuid, boolean) from public;
grant execute on function public.set_group_admin(uuid, uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Creating a group
-- ---------------------------------------------------------------------------
-- One call instead of three round trips, so a half-created group can't be
-- left behind if the client dies between them.
create or replace function public.create_group_conversation(
  p_title text,
  p_member_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
  member uuid;
begin
  if auth.uid() is null then
    raise exception 'Nicht angemeldet';
  end if;
  if coalesce(trim(p_title), '') = '' then
    raise exception 'Die Gruppe braucht einen Namen';
  end if;

  insert into public.conversations (is_group, title, created_by)
  values (true, trim(p_title), auth.uid())
  returning id into new_id;

  insert into public.conversation_participants (conversation_id, user_id, is_admin)
  values (new_id, auth.uid(), true);

  foreach member in array coalesce(p_member_ids, '{}'::uuid[]) loop
    if member <> auth.uid() then
      insert into public.conversation_participants (conversation_id, user_id, is_admin)
      values (new_id, member, false)
      on conflict do nothing;
    end if;
  end loop;

  return new_id;
end;
$$;

revoke all on function public.create_group_conversation(text, uuid[]) from public;
grant execute on function public.create_group_conversation(text, uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- 1:1 chats
-- ---------------------------------------------------------------------------
-- These now go through a function too. Under the insert policy above the
-- client would otherwise have to create the conversation, insert its own row,
-- and only then be allowed to insert the other person's - three statements
-- whose middle one has to be visible before the last one is checked. Doing it
-- in one function sidesteps that entirely, and returns the existing
-- conversation when there already is one.
create or replace function public.create_direct_conversation(p_other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  existing uuid;
  new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Nicht angemeldet';
  end if;
  if p_other_user_id = auth.uid() then
    raise exception 'Kein Chat mit sich selbst';
  end if;

  select cp.conversation_id into existing
  from public.conversation_participants cp
  join public.conversations c on c.id = cp.conversation_id
  join public.conversation_participants other
    on other.conversation_id = cp.conversation_id and other.user_id = p_other_user_id
  where cp.user_id = auth.uid() and not c.is_group
  limit 1;

  if existing is not null then
    return existing;
  end if;

  insert into public.conversations (is_group, created_by)
  values (false, auth.uid())
  returning id into new_id;

  insert into public.conversation_participants (conversation_id, user_id, is_admin)
  values (new_id, auth.uid(), true), (new_id, p_other_user_id, true);

  return new_id;
end;
$$;

revoke all on function public.create_direct_conversation(uuid) from public;
grant execute on function public.create_direct_conversation(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Adding someone later
-- ---------------------------------------------------------------------------
create or replace function public.add_group_member(p_conversation_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_conversation_admin(p_conversation_id) then
    raise exception 'Nur Admins können Mitglieder hinzufügen';
  end if;
  if not exists (select 1 from public.conversations where id = p_conversation_id and is_group) then
    raise exception 'Das ist keine Gruppe';
  end if;

  insert into public.conversation_participants (conversation_id, user_id, is_admin)
  values (p_conversation_id, p_user_id, false)
  on conflict do nothing;
end;
$$;

revoke all on function public.add_group_member(uuid, uuid) from public;
grant execute on function public.add_group_member(uuid, uuid) to authenticated;
