import { supabase } from '@/lib/supabase';

/**
 * Opens a 1:1 conversation with another user, reusing the existing one if
 * there already is one. Without the reuse, every "Nachricht" tap created a
 * fresh conversation and the chat list filled up with duplicates.
 *
 * The lookup and the creation both happen inside the database function: under
 * the participant insert policy only an admin of a conversation may add
 * someone else to it, which a client doing this in separate statements cannot
 * satisfy for its own first insert.
 */
export async function openConversationWith(
  _myUserId: string,
  otherUserId: string
): Promise<{ conversationId: string | null; error: string | null }> {
  const { data, error } = await supabase.rpc('create_direct_conversation', {
    p_other_user_id: otherUserId,
  });

  if (error) return { conversationId: null, error: error.message };
  return { conversationId: data as string, error: null };
}

/** Creates a group with the caller as its first admin. */
export async function createGroupConversation(
  title: string,
  memberIds: string[]
): Promise<{ conversationId: string | null; error: string | null }> {
  const { data, error } = await supabase.rpc('create_group_conversation', {
    p_title: title,
    p_member_ids: memberIds,
  });

  if (error) return { conversationId: null, error: error.message };
  return { conversationId: data as string, error: null };
}

export async function addGroupMember(conversationId: string, userId: string) {
  const { error } = await supabase.rpc('add_group_member', {
    p_conversation_id: conversationId,
    p_user_id: userId,
  });
  return { error: error?.message ?? null };
}

export async function setGroupAdmin(conversationId: string, userId: string, isAdmin: boolean) {
  const { error } = await supabase.rpc('set_group_admin', {
    p_conversation_id: conversationId,
    p_user_id: userId,
    p_is_admin: isAdmin,
  });
  return { error: error?.message ?? null };
}

export async function leaveConversation(conversationId: string, userId: string) {
  const { error } = await supabase
    .from('conversation_participants')
    .delete()
    .eq('conversation_id', conversationId)
    .eq('user_id', userId);
  return { error: error?.message ?? null };
}
