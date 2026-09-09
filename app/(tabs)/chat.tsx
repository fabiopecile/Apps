import { useCallback } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/Avatar';
import { GroupAvatar } from '@/components/GroupAvatar';
import { EmptyState } from '@/components/EmptyState';
import { ErrorBanner } from '@/components/ErrorBanner';
import { LoadingScreen } from '@/components/LoadingScreen';
import { useConversations } from '@/hooks/useConversations';
import { useFriendRequests } from '@/hooks/useFriendRequests';
import { formatRelativeShort } from '@/lib/dates';
import { colors, fontSizes, radii, spacing } from '@/constants/theme';

export default function ChatScreen() {
  const { conversations, loading, error, refresh } = useConversations();
  const { incoming } = useFriendRequests();
  const router = useRouter();

  // A chat started from someone's profile won't be in this list yet when the
  // user swipes back to the tab, so re-fetch whenever it regains focus.
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Nachrichten</Text>
        <View style={styles.headerActions}>
          <Pressable onPress={() => router.push('/friends/requests')} style={styles.newButton}>
            <Ionicons name="people" size={20} color={colors.white} />
            {incoming.length > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{incoming.length}</Text>
              </View>
            ) : null}
          </Pressable>
          <Pressable onPress={() => router.push('/chat/new?group=1')} style={styles.newButton}>
            <Ionicons name="chatbubbles" size={19} color={colors.white} />
          </Pressable>
          <Pressable onPress={() => router.push('/chat/new')} style={styles.newButton}>
            <Ionicons name="person-add" size={20} color={colors.white} />
          </Pressable>
        </View>
      </View>

      {loading ? (
        <LoadingScreen />
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => router.push(`/chat/${item.id}`)}>
              {item.isGroup ? (
                <GroupAvatar members={item.others} size={52} />
              ) : (
                <Avatar
                  uri={item.otherUser?.avatar_url}
                  name={item.otherUser?.username}
                  size={52}
                  ringColor={item.otherUser?.equipped_frame_color ?? undefined}
                />
              )}
              <View style={styles.rowText}>
                <View style={styles.nameRow}>
                  {item.isGroup ? <Ionicons name="people" size={13} color={colors.textFaint} /> : null}
                  <Text style={styles.username} numberOfLines={1}>
                    {item.isGroup
                      ? (item.title ?? 'Gruppe')
                      : (item.otherUser?.username ?? 'Unbekannt')}
                  </Text>
                </View>
                <Text style={styles.preview} numberOfLines={1}>
                  {item.lastMessage ?? 'Noch keine Nachrichten'}
                </Text>
              </View>
              <View style={styles.rowMeta}>
                {item.lastMessageAt ? <Text style={styles.time}>{formatRelativeShort(item.lastMessageAt)}</Text> : null}
                {item.unread ? <View style={styles.unreadDot} /> : null}
              </View>
            </Pressable>
          )}
          ListHeaderComponent={<ErrorBanner message={error} onRetry={refresh} />}
          ListEmptyComponent={
            error ? null : (
            <View>
              <EmptyState
                title="Noch keine Chats"
                subtitle="Schreibe jemandem – such nach dem Nutzernamen oder tippe im Feed auf ein Profil."
              />
              <Pressable style={styles.startChatButton} onPress={() => router.push('/chat/new')}>
                <Ionicons name="create-outline" size={18} color={colors.white} />
                <Text style={styles.startChatText}>Chat starten</Text>
              </Pressable>
            </View>
            )
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  title: { color: colors.white, fontSize: fontSizes.xxl, fontWeight: '800', letterSpacing: -0.4 },
  headerActions: { flexDirection: 'row', gap: spacing.sm },
  newButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: colors.white, fontSize: 10, fontWeight: '700' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowText: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  username: { color: colors.text, fontWeight: '700', fontSize: fontSizes.md },
  preview: { color: colors.textMuted, fontSize: fontSizes.sm, marginTop: 2 },
  rowMeta: { alignItems: 'flex-end', gap: spacing.xs },
  time: { color: colors.textFaint, fontSize: fontSizes.xs },
  unreadDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.red },
  startChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    gap: spacing.sm,
    backgroundColor: colors.red,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  startChatText: { color: colors.white, fontWeight: '700', fontSize: fontSizes.sm },
});
