import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TopBar } from '@/components/TopBar';
import { PostCard } from '@/components/PostCard';
import { PrimaryButton } from '@/components/PrimaryButton';
import { StoryAvatar } from '@/components/StoryAvatar';
import { EmptyState } from '@/components/EmptyState';
import { LoadingScreen } from '@/components/LoadingScreen';
import { usePosts } from '@/hooks/usePosts';
import { useStories } from '@/hooks/useStories';
import { useAuth } from '@/contexts/AuthContext';
import { colors, spacing } from '@/constants/theme';

export default function FeedScreen() {
  const { posts, loading, refresh, toggleLike } = usePosts();
  const { stories } = useStories();
  const { profile, session } = useAuth();
  const router = useRouter();

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
              <PrimaryButton label="+ Beitrag hinzufügen (+50 XP)" onPress={() => router.push('/post/new')} />
            </View>
            <FlatList
              data={stories}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.storiesRow}
              ListHeaderComponent={
                <StoryAvatar
                  name="Deine Story"
                  uri={profile?.avatar_url}
                  isAddButton
                  onPress={() => router.push('/post/new')}
                />
              }
              renderItem={({ item }) => (
                <StoryAvatar name={item.profiles.username} uri={item.profiles.avatar_url} hasUnseen />
              )}
            />
          </View>
        }
        renderItem={({ item }) => (
          <PostCard post={item} isOwnPost={item.user_id === session?.user.id} onToggleLike={() => toggleLike(item)} />
        )}
        ListEmptyComponent={
          <EmptyState
            title="Noch keine Beiträge"
            subtitle="Sei der Erste und teile einen Beitrag aus dem Stadion – dafür gibt's +50 XP."
          />
        }
        contentContainerStyle={styles.listContent}
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
