import { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, Image, Pressable, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/Avatar';
import { confirmDestructive } from '@/lib/confirm';
import { colors, radii, spacing } from '@/constants/theme';
import type { StoryWithAuthor } from '@/hooks/useStories';

const STORY_DURATION = 5000;

interface StoryViewerProps {
  stories: StoryWithAuthor[];
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
}: StoryViewerProps) {
  const [index, setIndex] = useState(startIndex);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setIndex(startIndex);
  }, [startIndex]);

  useEffect(() => {
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
  }, [index]);

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
  if (!story) return null;

  const isOwnStory = story.user_id === currentUserId;

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
              onClose();
              onOpenProfile(story.user_id);
            }}
          >
            <Avatar
              uri={story.profiles.avatar_url}
              name={story.profiles.username}
              size={36}
              ringColor={story.profiles.equipped_frame_color ?? undefined}
            />
            <Text style={styles.username}>{story.profiles.username}</Text>
          </Pressable>
          {isOwnStory && isPro && !story.is_highlight ? (
            <Pressable onPress={() => onSaveHighlight(story.id)} style={styles.deleteButton} hitSlop={8}>
              <Ionicons name="star-outline" size={20} color={colors.gold} />
            </Pressable>
          ) : null}
          {isOwnStory ? (
            <Pressable onPress={handleDelete} style={styles.deleteButton} hitSlop={8}>
              <Ionicons name="trash" size={20} color={colors.white} />
            </Pressable>
          ) : null}
          <Pressable onPress={onClose} style={styles.closeButton} hitSlop={8}>
            <Ionicons name="close" size={26} color={colors.white} />
          </Pressable>
        </View>

        <Image source={{ uri: story.media_url }} style={styles.image} resizeMode="contain" />

        {story.location ? (
          <View style={styles.locationBadge}>
            <Ionicons name="location" size={14} color={colors.white} />
            <Text style={styles.locationBadgeText}>{story.location}</Text>
          </View>
        ) : null}

        <Pressable style={styles.tapLeft} onPress={goPrevious} />
        <Pressable style={styles.tapRight} onPress={goNext} />
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
