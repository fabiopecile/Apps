import { useCallback, useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TopBar } from '@/components/TopBar';
import { PostCard } from '@/components/PostCard';
import { PrimaryButton } from '@/components/PrimaryButton';
import { StoryAvatar } from '@/components/StoryAvatar';
import { StoryViewer } from '@/components/StoryViewer';
import { CommentsSheet } from '@/components/CommentsSheet';
import { EmptyState } from '@/components/EmptyState';
import { LoadingScreen } from '@/components/LoadingScreen';
import { usePosts } from '@/hooks/usePosts';
import { useStories } from '@/hooks/useStories';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/hooks/useTranslation';
import { colors, spacing } from '@/constants/theme';

export default function FeedScreen() {
  const { posts, loading, refresh, toggleLike, deletePost } = usePosts();
  const { stories, groups, refresh: refreshStories, deleteStory } = useStories();
  const { profile, session } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const [storyIndex, setStoryIndex] = useState<number | null>(null);
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null);

  // Returning from "Neuer Beitrag" (or switching back to this tab) doesn't
  // remount this screen, so re-fetch on focus to pick up what was just posted.
  useFocusEffect(
    useCallback(() => {
      refresh();
      refreshStories();
    }, [refresh, refreshStories])
  );

  if (loading) return <LoadingScreen />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <TopBar />
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl tintColor={colors.red} refreshing={false} onRefresh={refresh} />}
        ListHeaderComponent={
          <View>
            <View style={styles.ctaWrap}>
              <PrimaryButton label={t('feed.addPost')} onPress={() => router.push('/post/new')} />
            </View>
            <FlatList
              data={groups}
              keyExtractor={(item) => item.profile.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.storiesRow}
              ListHeaderComponent={
                <StoryAvatar
                  name="Deine Story"
                  uri={profile?.avatar_url}
                  isAddButton
                  onPress={() => router.push('/story/new')}
                />
              }
              renderItem={({ item }) => (
                <StoryAvatar
                  name={item.profile.username}
                  uri={item.profile.avatar_url}
                  hasUnseen
                  onPress={() => setStoryIndex(stories.findIndex((s) => s.id === item.stories[0].id))}
                />
              )}
            />
          </View>
        }
        renderItem={({ item }) => (
          <PostCard
            post={item}
            isOwnPost={item.user_id === session?.user.id}
            onToggleLike={() => toggleLike(item)}
            onOpenComments={() => setCommentsPostId(item.id)}
            onDelete={() => deletePost(item.id)}
          />
        )}
        ListEmptyComponent={
          <EmptyState title={t('feed.emptyTitle')} subtitle={t('feed.emptySubtitle')} />
        }
        contentContainerStyle={styles.listContent}
      />

      {storyIndex !== null ? (
        <StoryViewer
          stories={stories}
          startIndex={storyIndex}
          currentUserId={session?.user.id}
          onClose={() => setStoryIndex(null)}
          onDelete={(storyId) => deleteStory(storyId)}
        />
      ) : null}

      <CommentsSheet postId={commentsPostId} onClose={() => setCommentsPostId(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  ctaWrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  storiesRow: { paddingHorizontal: spacing.lg, paddingVertical: spacing.lg, gap: spacing.md },
  listContent: { paddingBottom: spacing.xxl },
});
