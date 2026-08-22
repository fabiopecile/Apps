import { useRef, useState } from 'react';
import { View, Text, Image, Pressable, Animated, ScrollView, StyleSheet, type NativeSyntheticEvent, type NativeScrollEvent, type LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/Avatar';
import { CountUp } from '@/components/CountUp';
import { confirmDestructive } from '@/lib/confirm';
import { colors, fontSizes, radii, spacing } from '@/constants/theme';
import type { PostWithAuthor } from '@/lib/database.types';

const DOUBLE_TAP_DELAY = 300;

interface PostCardProps {
  post: PostWithAuthor;
  isOwnPost: boolean;
  isFollowing: boolean;
  onToggleLike: () => void;
  onOpenComments: () => void;
  onDelete: () => void;
  onToggleFollow: () => void;
  onOpenProfile: () => void;
}

export function PostCard({
  post,
  isOwnPost,
  isFollowing,
  onToggleLike,
  onOpenComments,
  onDelete,
  onToggleFollow,
  onOpenProfile,
}: PostCardProps) {
  const lastTap = useRef(0);
  const heartAnim = useRef(new Animated.Value(0)).current;
  const likeScale = useRef(new Animated.Value(1)).current;
  const [showHeart, setShowHeart] = useState(false);
  const [imageWidth, setImageWidth] = useState(0);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const images = post.image_urls && post.image_urls.length > 1 ? post.image_urls : post.image_url ? [post.image_url] : [];
  // Posts made before the cropper existed have no stored ratio and keep the
  // old fixed 4:5 frame.
  const imageAspect = post.image_aspect_ratio ?? 4 / 5;

  const popLikeIcon = () => {
    likeScale.setValue(1);
    Animated.sequence([
      Animated.spring(likeScale, { toValue: 1.35, useNativeDriver: true, speed: 50, bounciness: 16 }),
      Animated.spring(likeScale, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 10 }),
    ]).start();
  };

  const handleLikePress = () => {
    popLikeIcon();
    onToggleLike();
  };

  const handleImagePress = () => {
    const now = Date.now();
    if (now - lastTap.current < DOUBLE_TAP_DELAY) {
      if (!post.liked_by_me) {
        onToggleLike();
        popLikeIcon();
      }
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
        <Pressable style={styles.authorTap} onPress={onOpenProfile}>
          <Avatar
            uri={post.profiles?.avatar_url}
            name={post.profiles?.username}
            size={40}
            ringColor={post.profiles?.equipped_frame_color ?? colors.blue}
          />
          <View style={styles.headerText}>
            <Text style={styles.username}>{post.profiles?.username ?? 'unknown'}</Text>
            {post.location ? (
              <Text style={styles.location} numberOfLines={1}>
                📍 {post.location}
              </Text>
            ) : null}
          </View>
        </Pressable>
        {!isOwnPost ? (
          <Pressable
            style={[styles.followButton, isFollowing && styles.followingButton]}
            onPress={onToggleFollow}
          >
            <Text style={[styles.followText, isFollowing && styles.followingText]}>
              {isFollowing ? 'Gefolgt' : 'Folgen'}
            </Text>
          </Pressable>
        ) : (
          <Pressable onPress={handleDelete} hitSlop={8}>
            <Ionicons name="trash-outline" size={20} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      <View onLayout={(e: LayoutChangeEvent) => setImageWidth(e.nativeEvent.layout.width)}>
        {images.length > 1 ? (
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
              if (imageWidth > 0) setActiveImageIndex(Math.round(e.nativeEvent.contentOffset.x / imageWidth));
            }}
          >
            {images.map((uri) => (
              <Pressable key={uri} onPress={handleImagePress} style={{ width: imageWidth || undefined }}>
                <Image source={{ uri }} style={[styles.image, { aspectRatio: imageAspect }]} />
              </Pressable>
            ))}
          </ScrollView>
        ) : (
          <Pressable onPress={handleImagePress}>
            {images[0] ? (
              <Image source={{ uri: images[0] }} style={[styles.image, { aspectRatio: imageAspect }]} />
            ) : (
              <View style={[styles.image, styles.imageFallback]}>
                <Text style={styles.imageFallbackText}>⚽️</Text>
              </View>
            )}
          </Pressable>
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

        {images.length > 1 ? (
          <View style={styles.dotsRow}>
            {images.map((uri, i) => (
              <View key={uri} style={[styles.dot, i === activeImageIndex && styles.dotActive]} />
            ))}
          </View>
        ) : null}
      </View>

      <View style={styles.actions}>
        <Pressable onPress={handleLikePress} style={styles.actionButton} hitSlop={6}>
          <Animated.Text style={[styles.actionIcon, { transform: [{ scale: likeScale }] }]}>
            {post.liked_by_me ? '❤️' : '🤍'}
          </Animated.Text>
          <CountUp value={post.like_count} style={styles.actionCount} duration={350} />
        </Pressable>
        <Pressable onPress={onOpenComments} style={styles.actionButton} hitSlop={6}>
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
  authorTap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerText: { flex: 1 },
  username: { color: colors.text, fontWeight: '700', fontSize: fontSizes.md },
  location: { color: colors.textMuted, fontSize: fontSizes.xs, marginTop: 2 },
  followButton: {
    borderWidth: 1,
    borderColor: colors.red,
    backgroundColor: colors.red,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  followingButton: { backgroundColor: 'transparent', borderColor: colors.borderStrong },
  followText: { color: colors.white, fontSize: fontSizes.xs, fontWeight: '700' },
  followingText: { color: colors.textMuted },
  image: { width: '100%', backgroundColor: colors.surface },
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
  dotsRow: {
    position: 'absolute',
    bottom: spacing.sm,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.4)' },
  dotActive: { backgroundColor: colors.white },
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
