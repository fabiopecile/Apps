-- Fixes "infinite recursion detected in policy for relation
-- conversation_participants".
--
-- The SELECT policy on conversation_participants asked whether the reader is a
-- participant by querying conversation_participants - which is itself subject
-- to that same policy, so Postgres recursed and gave up. Every read of the
-- table failed, which is why the chat list came back empty. The bug has been
-- there since the first migration; it only became visible once the app started
-- showing fetch errors instead of an empty list.
--
-- The fix is the standard one: do the membership check inside a SECURITY
-- DEFINER function. Its body runs as the function owner and therefore does not
-- re-enter the policy.

create or replace function public.is_conversation_participant(p_conversation_id uuid)
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
  );
$$;

revoke all on function public.is_conversation_participant(uuid) from public;
grant execute on function public.is_conversation_participant(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- conversation_participants
-- ---------------------------------------------------------------------------
drop policy if exists "participants can read participant rows" on public.conversation_participants;
create policy "participants can read participant rows" on public.conversation_participants
  for select using (
    -- Your own rows need no lookup at all; the function only decides whether
    -- you may also see the other people in a conversation you belong to.
    user_id = auth.uid()
    or public.is_conversation_participant(conversation_id)
  );

drop policy if exists "users can add themselves or be added by a participant" on public.conversation_participants;
create policy "users can add themselves or be added by a participant" on public.conversation_participants
  for insert with check (
    user_id = auth.uid()
    or public.is_conversation_participant(conversation_id)
  );

drop policy if exists "participants can update own read state" on public.conversation_participants;
create policy "participants can update own read state" on public.conversation_participants
  for update using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- conversations and messages
-- ---------------------------------------------------------------------------
-- These read conversation_participants too, so they hit the same recursion.
-- Routing them through the function as well keeps the check in one place.
drop policy if exists "participants can read conversations" on public.conversations;
create policy "participants can read conversations" on public.conversations
  for select using (public.is_conversation_participant(id));

drop policy if exists "participants can read messages" on public.messages;
create policy "participants can read messages" on public.messages
  for select using (public.is_conversation_participant(conversation_id));

drop policy if exists "participants can send messages" on public.messages;
create policy "participants can send messages" on public.messages
  for insert with check (
    sender_id = auth.uid()
    and public.is_conversation_participant(conversation_id)
  );
