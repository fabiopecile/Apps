import { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, Image, Pressable, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/Avatar';
import { ReportSheet } from '@/components/ReportSheet';
import { useModeration } from '@/hooks/useModeration';
import { confirmDestructive } from '@/lib/confirm';
import { colors, radii, spacing } from '@/constants/theme';
import type { StoryWithAuthor } from '@/hooks/useStories';

const STORY_DURATION = 5000;

interface StoryViewerProps {
  stories: StoryWithAuthor[];
  /** Called when a sponsored story is shown / tapped through. */
  onAdImpression?: (adId: string) => void;
  onAdPress?: (ad: NonNullable<StoryWithAuthor['ad']>) => void;
  startIndex: number;
  currentUserId?: string;
  isPro?: boolean;
  onClose: () => void;
  onDelete: (storyId: string) => void;
  onSaveHighlight: (storyId: string) => void;
  onOpenProfile: (userId: string) => void;
}

export function StoryViewer({
  stories,
  startIndex,
  currentUserId,
  isPro,
  onClose,
  onDelete,
  onSaveHighlight,
  onOpenProfile,
  onAdImpression,
  onAdPress,
}: StoryViewerProps) {
  const [index, setIndex] = useState(startIndex);
  const [reportOpen, setReportOpen] = useState(false);
  const { report, blockUser } = useModeration();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setIndex(startIndex);
  }, [startIndex]);

  // The story auto-advances, but not while the report sheet is open - the
  // reported story shouldn't slide out from under the person reporting it.
  useEffect(() => {
    if (reportOpen) return;
    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: STORY_DURATION,
      useNativeDriver: false,
    });
    animation.start(({ finished }) => {
      if (finished) goNext();
    });
    return () => animation.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, reportOpen]);

  const goNext = () => {
    if (index < stories.length - 1) setIndex(index + 1);
    else onClose();
  };

  const goPrevious = () => {
    if (index > 0) setIndex(index - 1);
    else {
      progress.setValue(0);
      Animated.timing(progress, { toValue: 1, duration: STORY_DURATION, useNativeDriver: false }).start(({ finished }) => {
        if (finished) goNext();
      });
    }
  };

  const story = stories[index];
  const ad = story?.ad;

  // Counted once per ad the viewer actually lands on, not per render.
  useEffect(() => {
    if (ad) onAdImpression?.(ad.id);
  }, [ad, onAdImpression]);

  if (!story) return null;

  const isOwnStory = !ad && story.user_id === currentUserId;

  const handleDelete = () => {
    confirmDestructive('Story löschen?', 'Diese Story wird endgültig gelöscht.', 'Löschen', () => {
      onDelete(story.id);
      if (stories.length <= 1) onClose();
      else goNext();
    });
  };

  return (
    <Modal visible transparent={false} animationType="fade" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.progressRow}>
          {stories.map((_, i) => (
            <View key={i} style={styles.progressTrack}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width:
                      i < index
                        ? '100%'
                        : i === index
                          ? progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] })
                          : '0%',
                  },
                ]}
              />
            </View>
          ))}
        </View>

        <View style={styles.header}>
          <Pressable
            style={styles.authorTap}
            onPress={() => {
              // A sponsored story has no profile behind it to open.
              if (ad) return;
              onClose();
              onOpenProfile(story.user_id);
            }}
            disabled={!!ad}
          >
            <Avatar
              uri={story.profiles.avatar_url}
              name={story.profiles.username}
              size={36}
              ringColor={story.profiles.equipped_frame_color ?? undefined}
            />
            <View>
              <Text style={styles.username}>{story.profiles.username}</Text>
              {ad ? <Text style={styles.sponsored}>Gesponsert</Text> : null}
            </View>
          </Pressable>
          {!ad && isOwnStory && isPro && !story.is_highlight ? (
            <Pressable onPress={() => onSaveHighlight(story.id)} style={styles.deleteButton} hitSlop={8}>
              <Ionicons name="star-outline" size={20} color={colors.gold} />
            </Pressable>
          ) : null}
          {ad ? null : isOwnStory ? (
            <Pressable onPress={handleDelete} style={styles.deleteButton} hitSlop={8}>
              <Ionicons name="trash" size={20} color={colors.white} />
            </Pressable>
          ) : (
            <Pressable onPress={() => setReportOpen(true)} style={styles.deleteButton} hitSlop={8}>
              <Ionicons name="ellipsis-horizontal" size={20} color={colors.white} />
            </Pressable>
          )}
          <Pressable onPress={onClose} style={styles.closeButton} hitSlop={8}>
            <Ionicons name="close" size={26} color={colors.white} />
          </Pressable>
        </View>

        {/* Cropped stories are already 9:16, so they can fill the screen.
            Older ones from before the cropper keep being fitted so nothing
            important gets cut off. */}
        <Image
          source={{ uri: story.media_url }}
          style={styles.image}
          resizeMode={story.media_aspect_ratio ? 'cover' : 'contain'}
        />

        {story.location ? (
          <View style={styles.locationBadge}>
            <Ionicons name="location" size={14} color={colors.white} />
            <Text style={styles.locationBadgeText}>{story.location}</Text>
          </View>
        ) : null}

        <Pressable style={styles.tapLeft} onPress={goPrevious} />
        <Pressable style={styles.tapRight} onPress={goNext} />

        {ad ? (
          <Pressable style={styles.adCta} onPress={() => onAdPress?.(ad)}>
            <Text style={styles.adCtaText}>{ad.cta_label}</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.black} />
          </Pressable>
        ) : null}

        <ReportSheet
          visible={reportOpen}
          targetType="story"
          targetLabel="Diese Story"
          blockLabel={`@${story.profiles.username} blockieren`}
          onClose={() => setReportOpen(false)}
          onSubmit={(reason) => report('story', story.id, reason)}
          onBlock={async () => {
            const result = await blockUser(story.user_id);
            if (!result.error) onClose();
            return result;
          }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  progressRow: { position: 'absolute', top: 56, left: 10, right: 10, flexDirection: 'row', gap: 4, zIndex: 20 },
  progressTrack: { flex: 1, height: 3, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.white },
  header: { position: 'absolute', top: 72, left: spacing.lg, right: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, zIndex: 20 },
  authorTap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  username: { color: colors.white, fontWeight: '700' },
  sponsored: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 1 },
  adCta: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.xxl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: radii.pill,
    paddingVertical: spacing.md,
    zIndex: 30,
  },
  adCtaText: { color: colors.black, fontWeight: '800', fontSize: 16 },
  deleteButton: { padding: spacing.xs },
  closeButton: { padding: spacing.xs },
  image: { flex: 1, width: '100%', backgroundColor: colors.black },
  locationBadge: {
    position: 'absolute',
    bottom: spacing.xl,
    left: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    zIndex: 15,
  },
  locationBadgeText: { color: colors.white, fontWeight: '700', fontSize: 13 },
  tapLeft: { position: 'absolute', top: 0, bottom: 0, left: 0, width: '50%' },
  tapRight: { position: 'absolute', top: 0, bottom: 0, right: 0, width: '50%' },
});
