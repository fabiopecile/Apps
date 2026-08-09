import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TopBar } from '@/components/TopBar';
import { LeagueTabs } from '@/components/LeagueTabs';
import { JokerIndicator } from '@/components/JokerIndicator';
import { MatchTipCard } from '@/components/MatchTipCard';
import { EmptyState } from '@/components/EmptyState';
import { LoadingScreen } from '@/components/LoadingScreen';
import { useLeagues, useMatchday } from '@/hooks/useTipps';
import { colors, fontSizes, spacing } from '@/constants/theme';

export default function TippsScreen() {
  const { leagues, loading: leaguesLoading } = useLeagues();
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedLeagueId && leagues.length) setSelectedLeagueId(leagues[0].id);
  }, [leagues, selectedLeagueId]);

  const { matchday, matches, loading, submitTip, jokersRemaining } = useMatchday(selectedLeagueId);

  if (leaguesLoading) return <LoadingScreen />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <TopBar />
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{matchday ? `Spieltag ${matchday.number}` : 'Spieltag'}</Text>
          <Text style={styles.subtitle}>
            {leagues.find((l) => l.id === selectedLeagueId)?.name ?? ''}
            {matchday ? ` · Tippabgabe bis ${new Date(matchday.deadline).toLocaleString('de-DE', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}` : ''}
          </Text>
        </View>
        <JokerIndicator remaining={jokersRemaining} />
      </View>

      <LeagueTabs leagues={leagues} selectedId={selectedLeagueId} onSelect={setSelectedLeagueId} />

      {loading ? (
        <LoadingScreen />
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MatchTipCard match={item} jokersRemaining={jokersRemaining} onSubmit={(h, a, j) => submitTip(item.id, h, a, j)} />
          )}
          ListEmptyComponent={
            <EmptyState title="Kein Spieltag verfügbar" subtitle="Für diese Liga wurden noch keine Spiele angelegt." />
          }
          contentContainerStyle={styles.listContent}
        />
      )}
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
  title: { color: colors.white, fontSize: fontSizes.xxl, fontWeight: '800' },
  subtitle: { color: colors.textMuted, fontSize: fontSizes.sm, marginTop: 2 },
  listContent: { paddingTop: spacing.md, paddingBottom: spacing.xxl },
});
