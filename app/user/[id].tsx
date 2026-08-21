import { useState } from 'react';
import { View, Text, Image, FlatList, Pressable, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/Avatar';
import { StatRow } from '@/components/StatPill';
import { EmptyState } from '@/components/EmptyState';
import { LoadingScreen } from '@/components/LoadingScreen';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useFollows } from '@/hooks/useFollows';
import { openConversationWith } from '@/lib/chat';
import { colors, fontSizes, radii, spacing } from '@/constants/theme';
import { XP_PER_LEVEL } from '@/constants/game';

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const { profile, posts, followerCount, followingCount, loading, refresh } = useUserProfile(id);
  const { isFollowing, toggleFollow } = useFollows();
  const [openingChat, setOpeningChat] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMe = !!session && profile?.id === session.user.id;

  if (loading) return <LoadingScreen />;

  if (!profile) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <EmptyState title="Profil nicht gefunden" />
      </SafeAreaView>
    );
  }

  const quote = profile.tips_count > 0 ? Math.round((profile.correct_tips_count / profile.tips_count) * 100) : 0;
  const xpInLevel = profile.xp % XP_PER_LEVEL;
  const following = isFollowing(profile.id);

  const handleFollow = async () => {
    await toggleFollow(profile.id);
    refresh();
  };

  const handleMessage = async () => {
    if (!session) return;
    setOpeningChat(true);
    setError(null);
    const { conversationId, error: chatError } = await openConversationWith(session.user.id, profile.id);
    setOpeningChat(false);
    if (chatError || !conversationId) {
      setError(chatError ?? 'Chat konnte nicht geöffnet werden');
      return;
    }
    router.push(`/chat/${conversationId}`);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={colors.white} />
        </Pressable>
        <Text style={styles.headerTitle}>{profile.username}</Text>
        <View style={{ width: 26 }} />
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        numColumns={3}
        ListHeaderComponent={
          <View>
            <View style={styles.profileHeader}>
              <Avatar
                uri={profile.avatar_url}
                name={profile.display_name ?? profile.username}
                size={88}
                ringColor={profile.equipped_frame_color ?? (profile.is_pro ? colors.gold : colors.red)}
              />
              <View style={styles.profileInfo}>
                <View style={styles.usernameRow}>
                  <Text style={styles.username}>{profile.username}</Text>
                  {profile.is_pro ? (
                    <View style={styles.proBadge}>
                      <Text style={styles.proBadgeText}>PRO</Text>
                    </View>
                  ) : null}
                  {profile.equipped_title ? (
                    <View style={styles.titleBadge}>
                      <Text style={styles.titleBadgeText}>👑 {profile.equipped_title}</Text>
                    </View>
                  ) : null}
                </View>
                <View style={styles.levelRow}>
                  <View style={styles.levelPill}>
                    <Text style={styles.levelText}>LVL {profile.level}</Text>
                  </View>
                  <View style={styles.xpBarTrack}>
                    <View style={[styles.xpBarFill, { width: `${Math.min(100, (xpInLevel / XP_PER_LEVEL) * 100)}%` }]} />
                  </View>
                </View>
                <Text style={styles.followCounts}>
                  {followerCount} Follower · {followingCount} gefolgt
                </Text>
              </View>
            </View>

            {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

            {!isMe ? (
              <View style={styles.actions}>
                <Pressable
                  style={[styles.actionButton, following ? styles.followingButton : styles.followButton]}
                  onPress={handleFollow}
                >
                  <Ionicons
                    name={following ? 'checkmark' : 'person-add'}
                    size={16}
                    color={following ? colors.text : colors.white}
                  />
                  <Text style={[styles.actionText, following && styles.followingText]}>
                    {following ? 'Gefolgt' : 'Folgen'}
                  </Text>
                </Pressable>
                <Pressable style={[styles.actionButton, styles.messageButton]} onPress={handleMessage} disabled={openingChat}>
                  <Ionicons name="chatbubble-ellipses" size={16} color={colors.text} />
                  <Text style={[styles.actionText, styles.messageText]}>
                    {openingChat ? 'Öffnet...' : 'Nachricht'}
                  </Text>
                </Pressable>
              </View>
            ) : null}

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <StatRow
              stats={[
                { value: String(profile.tips_count), label: 'Tipps' },
                { value: `${quote}%`, label: 'Quote' },
                { value: profile.points.toLocaleString('de-DE'), label: 'Punkte', accent: true },
                { value: `🔥 ${profile.login_streak}`, label: 'Streak' },
              ]}
            />

            <Text style={styles.sectionTitle}>BEITRÄGE</Text>
          </View>
        }
        renderItem={({ item }) =>
          item.image_url ? (
            <Image source={{ uri: item.image_url }} style={styles.gridImage} />
          ) : (
            <View style={[styles.gridImage, styles.gridImageFallback]}>
              <Text>⚽️</Text>
            </View>
          )
        }
        ListEmptyComponent={<EmptyState title="Noch keine Beiträge" />}
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}

const GRID_GAP = 2;

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
  headerTitle: { color: colors.white, fontWeight: '700', fontSize: fontSizes.md },
  listContent: { paddingBottom: spacing.xxl },
  profileHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, padding: spacing.lg },
  profileInfo: { flex: 1, gap: spacing.sm },
  usernameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  username: { color: colors.white, fontSize: fontSizes.xl, fontWeight: '800' },
  proBadge: { backgroundColor: colors.gold, borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  proBadgeText: { color: colors.black, fontSize: fontSizes.xs, fontWeight: '900' },
  titleBadge: { backgroundColor: colors.goldDark, borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  titleBadgeText: { color: colors.gold, fontSize: fontSizes.xs, fontWeight: '700' },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  levelPill: {
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  levelText: { color: colors.blue, fontWeight: '700', fontSize: fontSizes.xs },
  xpBarTrack: { flex: 1, height: 6, borderRadius: radii.pill, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  xpBarFill: { height: '100%', backgroundColor: colors.blue },
  followCounts: { color: colors.textMuted, fontSize: fontSizes.xs },
  bio: { color: colors.textMuted, fontSize: fontSizes.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  actions: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
  },
  followButton: { backgroundColor: colors.red, borderColor: colors.red },
  followingButton: { backgroundColor: 'transparent', borderColor: colors.borderStrong },
  messageButton: { backgroundColor: colors.surface, borderColor: colors.borderStrong },
  actionText: { color: colors.white, fontWeight: '700', fontSize: fontSizes.sm },
  followingText: { color: colors.text },
  messageText: { color: colors.text },
  error: { color: colors.danger, fontSize: fontSizes.sm, textAlign: 'center', paddingBottom: spacing.md },
  sectionTitle: {
    color: colors.textFaint,
    fontWeight: '700',
    fontSize: fontSizes.xs,
    letterSpacing: 0.5,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  gridImage: { flex: 1 / 3, aspectRatio: 1, margin: GRID_GAP, backgroundColor: colors.surface },
  gridImageFallback: { alignItems: 'center', justifyContent: 'center' },
});
