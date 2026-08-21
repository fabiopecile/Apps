import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/Avatar';
import { EmptyState } from '@/components/EmptyState';
import { LoadingScreen } from '@/components/LoadingScreen';
import { useConversations } from '@/hooks/useConversations';
import { useFriendRequests } from '@/hooks/useFriendRequests';
import { formatRelativeShort } from '@/lib/dates';
import { colors, fontSizes, spacing } from '@/constants/theme';

export default function ChatScreen() {
  const { conversations, loading } = useConversations();
  const { incoming } = useFriendRequests();
  const router = useRouter();

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
              <Avatar
                uri={item.otherUser?.avatar_url}
                name={item.otherUser?.username}
                size={52}
                ringColor={item.otherUser?.equipped_frame_color ?? undefined}
              />
              <View style={styles.rowText}>
                <Text style={styles.username}>{item.otherUser?.username ?? 'Unbekannt'}</Text>
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
          ListEmptyComponent={
            <EmptyState title="Keine Chats" subtitle="Starte eine Unterhaltung über das Symbol oben rechts." />
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
  title: { color: colors.white, fontSize: fontSizes.xxl, fontWeight: '800' },
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
  username: { color: colors.text, fontWeight: '700', fontSize: fontSizes.md },
  preview: { color: colors.textMuted, fontSize: fontSizes.sm, marginTop: 2 },
  rowMeta: { alignItems: 'flex-end', gap: spacing.xs },
  time: { color: colors.textFaint, fontSize: fontSizes.xs },
  unreadDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.red },
});
