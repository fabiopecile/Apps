import { useCallback, useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TopBar } from '@/components/TopBar';
import { PostCard } from '@/components/PostCard';
import { PrimaryButton } from '@/components/PrimaryButton';
import { StoryAvatar } from '@/components/StoryAvatar';
import { StoryViewer } from '@/components/StoryViewer';
import { PopIn } from '@/components/PopIn';
import { ReportSheet } from '@/components/ReportSheet';
import { ErrorBanner } from '@/components/ErrorBanner';
import { AdCard } from '@/components/AdCard';
import { CommentsSheet } from '@/components/CommentsSheet';
import { EmptyState } from '@/components/EmptyState';
import { LoadingScreen } from '@/components/LoadingScreen';
import { usePosts } from '@/hooks/usePosts';
import { useStories, adAsStory } from '@/hooks/useStories';
import { useFollows } from '@/hooks/useFollows';
import { useModeration } from '@/hooks/useModeration';
import { useAds, interleaveAds } from '@/hooks/useAds';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/hooks/useTranslation';
import { colors, spacing } from '@/constants/theme';

export default function FeedScreen() {
  const { posts, loading, error, refresh, toggleLike, deletePost } = usePosts();
  const { stories, groups, error: storiesError, refresh: refreshStories, deleteStory, saveHighlight } = useStories();
  const { isFollowing, toggleFollow, refresh: refreshFollows } = useFollows();
  const { report, blockUser } = useModeration();
  const { ads, trackImpression, openAd } = useAds('feed');
  const {
    ads: storyAds,
    trackImpression: trackStoryImpression,
    openAd: openStoryAd,
  } = useAds('story');
  const [reportTarget, setReportTarget] = useState<{ postId: string; userId: string } | null>(null);
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
      refreshFollows();
    }, [refresh, refreshStories, refreshFollows])
  );

  if (loading) return <LoadingScreen />;

  // One sponsored post after every fourth organic one. Pro subscribers get an
  // empty ads array, so this collapses back to the plain post list for them.
  const feedItems = interleaveAds(posts, ads, 4);

  // A sponsored story sits after the third group, the way Instagram slots one
  // between people's stories rather than at the front.
  const storyItems =
    storyAds.length > 0 && stories.length > 0
      ? [...stories.slice(0, 3), adAsStory(storyAds[0]), ...stories.slice(3)]
      : stories;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <TopBar />
      <FlatList
        data={feedItems}
        keyExtractor={(entry, index) =>
          // The same ad can fill more than one slot when there are fewer ads
          // than gaps, so its id alone would not be unique.
          entry.kind === 'ad' ? `ad-${entry.ad.id}-${index}` : entry.item.id
        }
        refreshControl={<RefreshControl tintColor={colors.red} refreshing={false} onRefresh={refresh} />}
        ListHeaderComponent={
          <View>
            <ErrorBanner
              message={error ?? storiesError}
              onRetry={() => {
                refresh();
                refreshStories();
              }}
            />
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
                  frameColor={profile?.equipped_frame_color}
                  isAddButton
                  onPress={() => router.push('/story/new')}
                />
              }
              renderItem={({ item, index }) => (
                <PopIn delay={index * 60}>
                  <StoryAvatar
                    name={item.profile.username}
                    uri={item.profile.avatar_url}
                    frameColor={item.profile.equipped_frame_color}
                    hasUnseen
                    onPress={() => setStoryIndex(storyItems.findIndex((s) => s.id === item.stories[0].id))}
                  />
                </PopIn>
              )}
            />
          </View>
        }
        renderItem={({ item: entry, index }) => {
          if (entry.kind === 'ad') {
            return (
              <PopIn variant="slide" delay={Math.min(index, 6) * 70}>
                <AdCard
                  ad={entry.ad}
                  onPress={() => openAd(entry.ad)}
                  onImpression={() => trackImpression(entry.ad.id)}
                />
              </PopIn>
            );
          }
          const item = entry.item;
          return (
            <PopIn variant="slide" delay={Math.min(index, 6) * 70}>
              <PostCard
                post={item}
                isOwnPost={item.user_id === session?.user.id}
                isFollowing={isFollowing(item.user_id)}
                onToggleLike={() => toggleLike(item)}
                onOpenComments={() => setCommentsPostId(item.id)}
                onDelete={() => deletePost(item.id)}
                onToggleFollow={() => toggleFollow(item.user_id)}
                onOpenProfile={() => router.push(`/user/${item.user_id}`)}
                onReport={() => setReportTarget({ postId: item.id, userId: item.user_id })}
              />
            </PopIn>
          );
        }}
        ListEmptyComponent={
          <EmptyState title={t('feed.emptyTitle')} subtitle={t('feed.emptySubtitle')} />
        }
        contentContainerStyle={styles.listContent}
      />

      {storyIndex !== null ? (
        <StoryViewer
          stories={storyItems}
          startIndex={storyIndex}
          currentUserId={session?.user.id}
          isPro={profile?.is_pro}
          onClose={() => setStoryIndex(null)}
          onDelete={(storyId) => deleteStory(storyId)}
          onSaveHighlight={(storyId) => saveHighlight(storyId)}
          onOpenProfile={(userId) => router.push(`/user/${userId}`)}
          onAdImpression={trackStoryImpression}
          onAdPress={openStoryAd}
        />
      ) : null}

      <ReportSheet
        visible={!!reportTarget}
        targetType="post"
        targetLabel="Diesen Beitrag"
        onClose={() => setReportTarget(null)}
        onSubmit={(reason) => report('post', reportTarget!.postId, reason)}
        onBlock={async () => {
          const result = await blockUser(reportTarget!.userId);
          if (!result.error) refresh();
          return result;
        }}
      />

      <CommentsSheet
        postId={commentsPostId}
        onClose={() => setCommentsPostId(null)}
        onOpenProfile={(userId) => router.push(`/user/${userId}`)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  ctaWrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  storiesRow: { paddingHorizontal: spacing.lg, paddingVertical: spacing.lg, gap: spacing.md },
  listContent: { paddingBottom: spacing.xxl },
});
