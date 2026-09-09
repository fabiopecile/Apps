import { useEffect, useRef, useState } from 'react';
import { View, Text, FlatList, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMessages } from '@/hooks/useMessages';
import { useConversationDetail } from '@/hooks/useConversationDetail';
import { useChatDuels } from '@/hooks/useChatDuels';
import { useDuels } from '@/hooks/useDuels';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { LoadingScreen } from '@/components/LoadingScreen';
import { Avatar } from '@/components/Avatar';
import { GroupAvatar } from '@/components/GroupAvatar';
import { ChallengeModal } from '@/components/ChallengeModal';
import { ChallengeMessageCard } from '@/components/ChallengeMessageCard';
import { colors, fontSizes, radii, spacing } from '@/constants/theme';
import type { DuelType, Profile } from '@/lib/database.types';

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const { messages, loading, sendMessage } = useMessages(id);
  const chatDuels = useChatDuels(messages);
  const { challengeFromChat, respond } = useDuels();
  const { conversation, members, others, isGroup, partner } = useConversationDetail(id);
  const [draft, setDraft] = useState('');
  const [challengeModalOpen, setChallengeModalOpen] = useState(false);
  const [challengeError, setChallengeError] = useState<string | null>(null);
  const listRef = useRef<FlatList>(null);

  const handleSend = () => {
    if (!draft.trim()) return;
    sendMessage(draft);
    setDraft('');
  };

  const handleChallenge = async (type: DuelType) => {
    if (!partner) return;
    setChallengeModalOpen(false);
    const { error } = await challengeFromChat(partner.profiles.id, type, id);
    if (error) setChallengeError(error);
  };

  if (loading) return <LoadingScreen />;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color={colors.white} />
        </Pressable>
        <Pressable
          style={styles.partnerTap}
          onPress={() =>
            isGroup
              ? router.push(`/chat/members/${id}`)
              : partner && router.push(`/user/${partner.profiles.id}`)
          }
          disabled={!isGroup && !partner}
        >
          {isGroup ? (
            <GroupAvatar members={others.map((m) => m.profiles)} size={32} />
          ) : (
            <Avatar
              uri={partner?.profiles.avatar_url}
              name={partner?.profiles.username}
              size={32}
              ringColor={partner?.profiles.equipped_frame_color ?? undefined}
            />
          )}
          <View style={styles.headerText}>
            <Text style={styles.title} numberOfLines={1}>
              {isGroup ? (conversation?.title ?? 'Gruppe') : (partner?.profiles.username ?? 'Chat')}
            </Text>
            {isGroup ? (
              <Text style={styles.memberCount}>{members.length} Mitglieder</Text>
            ) : null}
          </View>
        </Pressable>
        {isGroup ? (
          <Pressable style={styles.challengeButton} onPress={() => router.push(`/chat/members/${id}`)}>
            <Ionicons name="people" size={14} color={colors.white} />
          </Pressable>
        ) : (
          <Pressable style={styles.challengeButton} onPress={() => setChallengeModalOpen(true)}>
            <Ionicons name="trophy" size={14} color={colors.white} />
            <Text style={styles.challengeButtonText}>Challenge</Text>
          </Pressable>
        )}
      </View>

      {challengeError ? <Text style={styles.error}>{challengeError}</Text> : null}

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => {
            const isMine = item.sender_id === session?.user.id;
            const duel = item.duel_id ? chatDuels[item.duel_id] : null;

            if (item.duel_id && duel) {
              return (
                <View style={[styles.bubbleRow, isMine ? styles.bubbleRowMine : styles.bubbleRowTheirs]}>
                  <ChallengeMessageCard
                    duel={duel}
                    currentUserId={session?.user.id ?? ''}
                    onAccept={() => respond(duel.id, true)}
                    onDecline={() => respond(duel.id, false)}
                  />
                </View>
              );
            }

            // In a group the bubble alone doesn't say who wrote it.
            const sender =
              isGroup && !isMine ? members.find((m) => m.user_id === item.sender_id) : null;

            return (
              <View style={[styles.bubbleRow, isMine ? styles.bubbleRowMine : styles.bubbleRowTheirs]}>
                {sender ? (
                  <Pressable onPress={() => router.push(`/user/${sender.profiles.id}`)} style={styles.senderAvatar}>
                    <Avatar
                      uri={sender.profiles.avatar_url}
                      name={sender.profiles.username}
                      size={26}
                      ringColor={sender.profiles.equipped_frame_color ?? undefined}
                    />
                  </Pressable>
                ) : null}
                <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
                  {sender ? <Text style={styles.senderName}>{sender.profiles.username}</Text> : null}
                  <Text style={styles.bubbleText}>{item.content}</Text>
                </View>
              </View>
            );
          }}
        />

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder="Nachricht..."
            placeholderTextColor={colors.textFaint}
            multiline
          />
          <Pressable onPress={handleSend} style={styles.sendButton} disabled={!draft.trim()}>
            <Ionicons name="send" size={18} color={colors.white} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <ChallengeModal
        visible={challengeModalOpen}
        recipientName={partner?.profiles.username ?? ''}
        onClose={() => setChallengeModalOpen(false)}
        onSelect={handleChallenge}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  partnerTap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerText: { flex: 1 },
  memberCount: { color: colors.textFaint, fontSize: fontSizes.xs, marginTop: 1 },
  title: { color: colors.white, fontWeight: '700', fontSize: fontSizes.md },
  senderAvatar: { alignSelf: 'flex-end', marginRight: 6 },
  senderName: { color: colors.blue, fontSize: fontSizes.xs, fontWeight: '700', marginBottom: 3 },
  challengeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.goldDark,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  challengeButtonText: { color: colors.white, fontWeight: '700', fontSize: fontSizes.xs },
  error: { color: colors.danger, textAlign: 'center', paddingVertical: spacing.sm, fontSize: fontSizes.sm },
  listContent: { padding: spacing.lg, gap: spacing.sm },
  bubbleRow: { flexDirection: 'row' },
  bubbleRowMine: { justifyContent: 'flex-end' },
  bubbleRowTheirs: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '78%', borderRadius: radii.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginBottom: spacing.xs },
  bubbleMine: { backgroundColor: colors.blueDark, borderWidth: 1, borderColor: colors.blue },
  bubbleTheirs: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  bubbleText: { color: colors.white, fontSize: fontSizes.md },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.blueDark,
    borderWidth: 1,
    borderColor: colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
