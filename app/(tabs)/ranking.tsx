import { useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TopBar } from '@/components/TopBar';
import { LeaderboardPodium } from '@/components/LeaderboardPodium';
import { LeaderboardRow } from '@/components/LeaderboardRow';
import { PopIn } from '@/components/PopIn';
import { EmptyState } from '@/components/EmptyState';
import { LoadingScreen } from '@/components/LoadingScreen';
import { useRanking } from '@/hooks/useRanking';
import { useAuth } from '@/contexts/AuthContext';
import { colors, fontSizes, radii, spacing } from '@/constants/theme';

type Scope = 'gesamt' | 'freunde';

export default function RankingScreen() {
  const [scope, setScope] = useState<Scope>('gesamt');
  const { ranking, loading } = useRanking(scope);
  const { session } = useAuth();
  const router = useRouter();

  const openProfile = (userId: string) => {
    if (userId === session?.user.id) router.push('/(tabs)/profil');
    else router.push(`/user/${userId}`);
  };

  const top3 = ranking.slice(0, 3);
  const rest = ranking.slice(3);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <TopBar />

      <View style={styles.tabs}>
        <Pressable style={[styles.tab, scope === 'gesamt' && styles.tabActive]} onPress={() => setScope('gesamt')}>
          <Text style={[styles.tabText, scope === 'gesamt' && styles.tabTextActive]}>GESAMT</Text>
        </Pressable>
        <Pressable style={[styles.tab, scope === 'freunde' && styles.tabActive]} onPress={() => setScope('freunde')}>
          <Text style={[styles.tabText, scope === 'freunde' && styles.tabTextActive]}>FREUNDE</Text>
        </Pressable>
      </View>

      {loading ? (
        <LoadingScreen />
      ) : ranking.length === 0 ? (
        <EmptyState
          title={scope === 'freunde' ? 'Noch keine Freunde' : 'Noch kein Ranking'}
          subtitle={scope === 'freunde' ? 'Folge anderen Spielern, um sie hier zu sehen.' : undefined}
        />
      ) : (
        <FlatList
          data={rest}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            <LeaderboardPodium top3={top3} currentUserId={session?.user.id} onSelect={openProfile} />
          }
          renderItem={({ item, index }) => (
            <PopIn variant="slide" delay={Math.min(index, 8) * 45}>
              <LeaderboardRow
                profile={item}
                rank={index + 4}
                isMe={item.id === session?.user.id}
                onPress={() => openProfile(item.id)}
              />
            </PopIn>
          )}
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    padding: 4,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: radii.pill },
  tabActive: { backgroundColor: colors.redDark },
  tabText: { color: colors.textMuted, fontWeight: '700', fontSize: fontSizes.xs },
  tabTextActive: { color: colors.white },
  listContent: { paddingBottom: spacing.xxl },
});
