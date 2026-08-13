import { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, Image, Pressable, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/Avatar';
import { colors, spacing } from '@/constants/theme';
import type { StoryWithAuthor } from '@/hooks/useStories';

const STORY_DURATION = 5000;

interface StoryViewerProps {
  stories: StoryWithAuthor[];
  startIndex: number;
  onClose: () => void;
}

export function StoryViewer({ stories, startIndex, onClose }: StoryViewerProps) {
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
          <Avatar uri={story.profiles.avatar_url} name={story.profiles.username} size={36} />
          <Text style={styles.username}>{story.profiles.username}</Text>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={26} color={colors.white} />
          </Pressable>
        </View>

        <Image source={{ uri: story.media_url }} style={styles.image} resizeMode="contain" />

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
  username: { flex: 1, color: colors.white, fontWeight: '700' },
  closeButton: { padding: spacing.xs },
  image: { flex: 1, width: '100%', backgroundColor: colors.black },
  tapLeft: { position: 'absolute', top: 0, bottom: 0, left: 0, width: '50%' },
  tapRight: { position: 'absolute', top: 0, bottom: 0, right: 0, width: '50%' },
});
