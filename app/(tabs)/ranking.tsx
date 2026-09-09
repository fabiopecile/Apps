import { useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TopBar } from '@/components/TopBar';
import { LeaderboardPodium } from '@/components/LeaderboardPodium';
import { LeaderboardRow } from '@/components/LeaderboardRow';
import { PopIn } from '@/components/PopIn';
import { EmptyState } from '@/components/EmptyState';
import { ErrorBanner } from '@/components/ErrorBanner';
import { LoadingScreen } from '@/components/LoadingScreen';
import { useRanking } from '@/hooks/useRanking';
import { useMonthlyRanking, formatPeriod } from '@/hooks/useMonthlyRanking';
import { PrizeCard } from '@/components/PrizeCard';
import { useAuth } from '@/contexts/AuthContext';
import { colors, fontSizes, radii, spacing } from '@/constants/theme';

type Scope = 'gesamt' | 'monat' | 'freunde';

export default function RankingScreen() {
  const [scope, setScope] = useState<Scope>('monat');
  // The monthly board is a different shape - scores derive from this month's
  // tips, not from the cumulative total on the profile.
  const monthly = useMonthlyRanking();
  const { ranking: allTime, loading: allTimeLoading, error: allTimeError, refresh: refreshAllTime } =
    useRanking(scope === 'monat' ? 'gesamt' : scope);
  const { session } = useAuth();

  const isMonthly = scope === 'monat';
  const loading = isMonthly ? monthly.loading : allTimeLoading;
  const error = isMonthly ? monthly.error : allTimeError;
  const refresh = isMonthly ? monthly.refresh : refreshAllTime;

  // Both boards render the same row shape, so map the monthly entries onto it.
  const ranking = isMonthly
    ? monthly.ranking.map((entry) => ({
        id: entry.id,
        username: entry.username,
        display_name: entry.display_name,
        avatar_url: entry.avatar_url,
        equipped_frame_color: entry.equipped_frame_color,
        points: entry.points,
      }))
    : allTime;

  const myMonthTips = monthly.ranking.find((e) => e.id === session?.user.id)?.tips_count ?? 0;
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
        <Pressable style={[styles.tab, scope === 'monat' && styles.tabActive]} onPress={() => setScope('monat')}>
          <Text style={[styles.tabText, scope === 'monat' && styles.tabTextActive]}>MONAT</Text>
        </Pressable>
        <Pressable style={[styles.tab, scope === 'gesamt' && styles.tabActive]} onPress={() => setScope('gesamt')}>
          <Text style={[styles.tabText, scope === 'gesamt' && styles.tabTextActive]}>GESAMT</Text>
        </Pressable>
        <Pressable style={[styles.tab, scope === 'freunde' && styles.tabActive]} onPress={() => setScope('freunde')}>
          <Text style={[styles.tabText, scope === 'freunde' && styles.tabTextActive]}>FREUNDE</Text>
        </Pressable>
      </View>

      {isMonthly ? (
        <PrizeCard prize={monthly.prize} periodLabel={formatPeriod(monthly.period)} myTips={myMonthTips} />
      ) : null}

      {loading ? (
        <LoadingScreen />
      ) : error ? (
        <ErrorBanner message={error} onRetry={refresh} />
      ) : ranking.length === 0 ? (
        <EmptyState
          title={
            scope === 'freunde'
              ? 'Noch keine Freunde'
              : isMonthly
                ? 'Diesen Monat noch keine Punkte'
                : 'Noch kein Ranking'
          }
          subtitle={
            scope === 'freunde'
              ? 'Folge anderen Spielern, um sie hier zu sehen.'
              : isMonthly
                ? 'Sobald die ersten Spiele des Monats gewertet sind, steht hier die Tabelle.'
                : undefined
          }
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
