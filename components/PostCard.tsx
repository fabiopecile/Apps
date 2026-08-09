import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { colors, fontSizes, radii, spacing } from '@/constants/theme';
import type { PostWithAuthor } from '@/lib/database.types';

interface PostCardProps {
  post: PostWithAuthor;
  isOwnPost: boolean;
  onToggleLike: () => void;
}

export function PostCard({ post, isOwnPost, onToggleLike }: PostCardProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Avatar uri={post.profiles?.avatar_url} name={post.profiles?.username} size={40} ringColor={colors.blue} />
        <View style={styles.headerText}>
          <Text style={styles.username}>{post.profiles?.username ?? 'unknown'}</Text>
          {post.location ? (
            <Text style={styles.location} numberOfLines={1}>
              📍 {post.location}
            </Text>
          ) : null}
        </View>
        {!isOwnPost ? (
          <Pressable style={styles.followButton}>
            <Text style={styles.followText}>Folgen</Text>
          </Pressable>
        ) : null}
      </View>

      {post.image_url ? (
        <Image source={{ uri: post.image_url }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.imageFallback]}>
          <Text style={styles.imageFallbackText}>⚽️</Text>
        </View>
      )}

      <View style={styles.actions}>
        <Pressable onPress={onToggleLike} style={styles.actionButton}>
          <Text style={[styles.actionIcon, post.liked_by_me && styles.actionIconActive]}>
            {post.liked_by_me ? '❤️' : '🤍'}
          </Text>
          <Text style={styles.actionCount}>{post.like_count}</Text>
        </Pressable>
      </View>

      {post.caption ? (
        <Text style={styles.caption}>
          <Text style={styles.username}>{post.profiles?.username} </Text>
          {post.caption}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.lg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  headerText: { flex: 1 },
  username: { color: colors.text, fontWeight: '700', fontSize: fontSizes.md },
  location: { color: colors.textMuted, fontSize: fontSizes.xs, marginTop: 2 },
  followButton: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  followText: { color: colors.text, fontSize: fontSizes.xs, fontWeight: '600' },
  image: { width: '100%', aspectRatio: 4 / 5, backgroundColor: colors.surface },
  imageFallback: { alignItems: 'center', justifyContent: 'center' },
  imageFallbackText: { fontSize: 48 },
  actions: { flexDirection: 'row', paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  actionButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  actionIcon: { fontSize: 22 },
  actionIconActive: {},
  actionCount: { color: colors.textMuted, fontSize: fontSizes.sm },
  caption: {
    color: colors.text,
    fontSize: fontSizes.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
  },
});
