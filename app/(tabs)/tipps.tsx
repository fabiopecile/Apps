import { useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { TopBar } from '@/components/TopBar';
import { LeagueTabs } from '@/components/LeagueTabs';
import { MatchdayPicker } from '@/components/MatchdayPicker';
import { JokerIndicator } from '@/components/JokerIndicator';
import { MatchTipCard } from '@/components/MatchTipCard';
import { ConfettiBurst } from '@/components/ConfettiBurst';
import { EmptyState } from '@/components/EmptyState';
import { ErrorBanner } from '@/components/ErrorBanner';
import { LoadingScreen } from '@/components/LoadingScreen';
import { useLeagues, useMatchday } from '@/hooks/useTipps';
import { useDuels } from '@/hooks/useDuels';
import { useAuth } from '@/contexts/AuthContext';
import { colors, fontSizes, spacing } from '@/constants/theme';
import { useTranslation } from '@/hooks/useTranslation';
import { hasPro } from '@/lib/pro';

export default function TippsScreen() {
  const { leagues, loading: leaguesLoading } = useLeagues();
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);
  // null means "whatever round is current" - that stays the default on every
  // visit and after every league switch.
  const [selectedMatchdayId, setSelectedMatchdayId] = useState<string | null>(null);
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const router = useRouter();
  const { session, profile } = useAuth();
  const { t } = useTranslation();
  const { duels } = useDuels();

  useEffect(() => {
    if (!selectedLeagueId && leagues.length) setSelectedLeagueId(leagues[0].id);
  }, [leagues, selectedLeagueId]);

  const { matchday, matchdays, currentMatchdayId, matches, loading, error, refresh, submitTip, jokersRemaining } =
    useMatchday(selectedLeagueId, selectedMatchdayId);

  const handleSelectLeague = (leagueId: string) => {
    setSelectedLeagueId(leagueId);
    // Another league has its own rounds, so the hand-picked one is meaningless
    // there - fall back to that league's current round.
    setSelectedMatchdayId(null);
  };

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
          {/* The round moved into the picker below, so the headline names the
              league and the line under it says how long this round is open. */}
          <Text style={styles.title}>{leagues.find((l) => l.id === selectedLeagueId)?.name ?? t('tabs.tipps')}</Text>
          <Text style={styles.subtitle}>
            {matchday
              ? new Date(matchday.deadline).getTime() > Date.now()
                ? `Tippabgabe bis ${new Date(matchday.deadline).toLocaleString('de-DE', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}`
                : t('tipps.closed')
              : ''}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <View style={styles.headerButtonRow}>
            <Pressable style={styles.duelsButton} onPress={() => router.push('/rules')}>
              <Ionicons name="help-circle-outline" size={18} color={colors.white} />
            </Pressable>
            <Pressable style={styles.duelsButton} onPress={() => router.push('/duels')}>
              <Ionicons name="flash" size={16} color={colors.white} />
              {pendingInvites > 0 ? (
                <View style={styles.duelsBadge}>
                  <Text style={styles.duelsBadgeText}>{pendingInvites}</Text>
                </View>
              ) : null}
            </Pressable>
          </View>
          <JokerIndicator remaining={jokersRemaining} />
        </View>
      </View>

      <LeagueTabs leagues={leagues} selectedId={selectedLeagueId} onSelect={handleSelectLeague} />

      <MatchdayPicker
        matchdays={matchdays}
        selectedId={matchday?.id ?? null}
        currentId={currentMatchdayId}
        onSelect={setSelectedMatchdayId}
      />

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
              isPro={hasPro(profile)}
              currentUserId={session?.user.id}
              onSubmit={(h, a, j) => submitTip(item.id, h, a, j)}
              onSuccess={() => setConfettiTrigger((t) => t + 1)}
              onOpenProfile={(userId) => router.push(`/user/${userId}`)}
            />
          )}
          ListHeaderComponent={<ErrorBanner message={error} onRetry={refresh} />}
          ListEmptyComponent={
            error ? null : (
              <EmptyState title={t('tipps.noMatchday')} subtitle={t('tipps.noMatchdaySubtitle')} />
            )
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
  title: { color: colors.white, fontSize: fontSizes.xxl, fontWeight: '800', letterSpacing: -0.4 },
  subtitle: { color: colors.textMuted, fontSize: fontSizes.sm, marginTop: 2 },
  headerActions: { alignItems: 'flex-end', gap: spacing.sm },
  headerButtonRow: { flexDirection: 'row', gap: spacing.sm },
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
