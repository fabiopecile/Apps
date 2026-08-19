import { useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { TopBar } from '@/components/TopBar';
import { LeagueTabs } from '@/components/LeagueTabs';
import { JokerIndicator } from '@/components/JokerIndicator';
import { MatchTipCard } from '@/components/MatchTipCard';
import { ConfettiBurst } from '@/components/ConfettiBurst';
import { EmptyState } from '@/components/EmptyState';
import { LoadingScreen } from '@/components/LoadingScreen';
import { useLeagues, useMatchday } from '@/hooks/useTipps';
import { useDuels } from '@/hooks/useDuels';
import { useAuth } from '@/contexts/AuthContext';
import { colors, fontSizes, spacing } from '@/constants/theme';

export default function TippsScreen() {
  const { leagues, loading: leaguesLoading } = useLeagues();
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const router = useRouter();
  const { session, profile } = useAuth();
  const { duels } = useDuels();

  useEffect(() => {
    if (!selectedLeagueId && leagues.length) setSelectedLeagueId(leagues[0].id);
  }, [leagues, selectedLeagueId]);

  const { matchday, matches, loading, submitTip, jokersRemaining } = useMatchday(selectedLeagueId);

  const pendingInvites = useMemo(
    () => duels.filter((d) => d.status === 'pending' && d.opponent_id === session?.user.id).length,
    [duels, session?.user.id]
  );

  if (leaguesLoading) return <LoadingScreen />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <TopBar />
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{matchday ? `Spieltag ${matchday.number}` : 'Spieltag'}</Text>
          <Text style={styles.subtitle}>
            {leagues.find((l) => l.id === selectedLeagueId)?.name ?? ''}
            {matchday ? ` · Tippabgabe bis ${new Date(matchday.deadline).toLocaleString('de-DE', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}` : ''}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable style={styles.duelsButton} onPress={() => router.push('/duels')}>
            <Ionicons name="flash" size={16} color={colors.white} />
            {pendingInvites > 0 ? (
              <View style={styles.duelsBadge}>
                <Text style={styles.duelsBadgeText}>{pendingInvites}</Text>
              </View>
            ) : null}
          </Pressable>
          <JokerIndicator remaining={jokersRemaining} />
        </View>
      </View>

      <LeagueTabs leagues={leagues} selectedId={selectedLeagueId} onSelect={setSelectedLeagueId} />

      {loading ? (
        <LoadingScreen />
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MatchTipCard
              match={item}
              jokersRemaining={jokersRemaining}
              isPro={profile?.is_pro}
              onSubmit={(h, a, j) => submitTip(item.id, h, a, j)}
              onSuccess={() => setConfettiTrigger((t) => t + 1)}
            />
          )}
          ListEmptyComponent={
            <EmptyState title="Kein Spieltag verfügbar" subtitle="Für diese Liga wurden noch keine Spiele angelegt." />
          }
          contentContainerStyle={styles.listContent}
        />
      )}

      <ConfettiBurst trigger={confettiTrigger} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  headerText: { flex: 1 },
  title: { color: colors.white, fontSize: fontSizes.xxl, fontWeight: '800' },
  subtitle: { color: colors.textMuted, fontSize: fontSizes.sm, marginTop: 2 },
  headerActions: { alignItems: 'flex-end', gap: spacing.sm },
  duelsButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  duelsBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  duelsBadgeText: { color: colors.white, fontSize: 10, fontWeight: '700' },
  listContent: { paddingTop: spacing.md, paddingBottom: spacing.xxl },
});
