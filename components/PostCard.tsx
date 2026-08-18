import { useRef, useState } from 'react';
import { View, Text, Image, Pressable, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/Avatar';
import { confirmDestructive } from '@/lib/confirm';
import { colors, fontSizes, radii, spacing } from '@/constants/theme';
import type { PostWithAuthor } from '@/lib/database.types';

const DOUBLE_TAP_DELAY = 300;

interface PostCardProps {
  post: PostWithAuthor;
  isOwnPost: boolean;
  onToggleLike: () => void;
  onOpenComments: () => void;
  onDelete: () => void;
}

export function PostCard({ post, isOwnPost, onToggleLike, onOpenComments, onDelete }: PostCardProps) {
  const lastTap = useRef(0);
  const heartAnim = useRef(new Animated.Value(0)).current;
  const [showHeart, setShowHeart] = useState(false);

  const handleImagePress = () => {
    const now = Date.now();
    if (now - lastTap.current < DOUBLE_TAP_DELAY) {
      if (!post.liked_by_me) onToggleLike();
      setShowHeart(true);
      heartAnim.setValue(0);
      Animated.sequence([
        Animated.spring(heartAnim, { toValue: 1, useNativeDriver: true, friction: 4 }),
        Animated.delay(400),
        Animated.timing(heartAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(() => setShowHeart(false));
    }
    lastTap.current = now;
  };

  const handleDelete = () => {
    confirmDestructive('Beitrag löschen?', 'Dieser Beitrag wird endgültig gelöscht.', 'Löschen', onDelete);
  };

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
        ) : (
          <Pressable onPress={handleDelete} hitSlop={8}>
            <Ionicons name="trash-outline" size={20} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      <Pressable onPress={handleImagePress}>
        {post.image_url ? (
          <Image source={{ uri: post.image_url }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.imageFallback]}>
            <Text style={styles.imageFallbackText}>⚽️</Text>
          </View>
        )}
        {showHeart ? (
          <Animated.Text
            style={[
              styles.doubleTapHeart,
              {
                opacity: heartAnim,
                transform: [{ scale: heartAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1.3] }) }],
              },
            ]}
          >
            ❤️
          </Animated.Text>
        ) : null}
      </Pressable>

      <View style={styles.actions}>
        <Pressable onPress={onToggleLike} style={styles.actionButton}>
          <Text style={[styles.actionIcon, post.liked_by_me && styles.actionIconActive]}>
            {post.liked_by_me ? '❤️' : '🤍'}
          </Text>
          <Text style={styles.actionCount}>{post.like_count}</Text>
        </Pressable>
        <Pressable onPress={onOpenComments} style={styles.actionButton}>
          <Text style={styles.actionIcon}>💬</Text>
        </Pressable>
      </View>

      {post.caption ? (
        <Text style={styles.caption}>
          <Text style={styles.username}>{post.profiles?.username} </Text>
          {post.caption}
        </Text>
      ) : null}

      <Pressable onPress={onOpenComments}>
        <Text style={styles.commentsLink}>Kommentare ansehen</Text>
      </Pressable>
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
  doubleTapHeart: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -50,
    marginLeft: -50,
    fontSize: 100,
  },
  actions: { flexDirection: 'row', paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.lg },
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
  commentsLink: { color: colors.textFaint, fontSize: fontSizes.xs, paddingHorizontal: spacing.lg, paddingTop: spacing.xs },
});
