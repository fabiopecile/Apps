import { supabase } from '@/lib/supabase';

// Opens a 1:1 conversation with another user, reusing the existing one if
// there already is one. Without this, every "Nachricht" tap created a fresh
// conversation and the chat list filled up with duplicates of the same person.
export async function openConversationWith(
  myUserId: string,
  otherUserId: string
): Promise<{ conversationId: string | null; error: string | null }> {
  const { data: mine, error: mineError } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', myUserId);

  if (mineError) return { conversationId: null, error: mineError.message };

  const myIds = (mine ?? []).map((row) => row.conversation_id);

  if (myIds.length > 0) {
    const { data: shared } = await supabase
      .from('conversation_participants')
      .select('conversation_id, conversations!inner(id, is_group)')
      .in('conversation_id', myIds)
      .eq('user_id', otherUserId)
      .eq('conversations.is_group', false)
      .limit(1);

    const existing = (shared ?? [])[0];
    if (existing) return { conversationId: existing.conversation_id, error: null };
  }

  const { data: conversation, error: createError } = await supabase
    .from('conversations')
    .insert({ is_group: false })
    .select()
    .single();

  if (createError || !conversation) {
    return { conversationId: null, error: createError?.message ?? 'Chat konnte nicht erstellt werden' };
  }

  const { error: participantError } = await supabase.from('conversation_participants').insert([
    { conversation_id: conversation.id, user_id: myUserId },
    { conversation_id: conversation.id, user_id: otherUserId },
  ]);

  if (participantError) return { conversationId: null, error: participantError.message };

  return { conversationId: conversation.id, error: null };
}
