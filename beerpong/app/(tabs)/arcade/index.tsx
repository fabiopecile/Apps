import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CoinChip } from '@/components/ui/CoinChip';
import { GridBackground } from '@/components/ui/GridBackground';
import { HeroCard } from '@/components/ui/HeroCard';
import { ModeRow } from '@/components/ui/ModeRow';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { SectionLabel } from '@/components/ui/SectionLabel';
import {
  AI_PRESETS,
  WEEKEND_MATCHES,
  WEEKEND_UNLOCK_DIVISION,
  getDivision,
  weekendAvailability,
} from '@/lib/competition';
import {
  ACHIEVEMENTS,
  SEASON_TIERS,
  challengesFor,
  todayKey,
  type AchievementStats,
} from '@/lib/progression';
import { canPlayLucky } from '@/lib/luckyShot';
import { opponentById, roundKey } from '@/lib/knockout';
import { ONLINE_AVAILABLE } from '@/lib/onlineConfig';
import { SALES_ENABLED } from '@/lib/sales';
import { selectCareerProgress, useBeerpongStore } from '@/lib/store';
import { divisionName, useLanguage, useT } from '@/lib/i18n';
import { colors, fonts, radius, spacing } from '@/theme';

export default function ArcadeHubScreen() {
  const arcade = useBeerpongStore((s) => s.arcade);
  const camera = useBeerpongStore((s) => s.camera);
  const coins = useBeerpongStore((s) => s.coins);
  const rivals = useBeerpongStore((s) => s.rivals);
  const weekend = useBeerpongStore((s) => s.weekend);
  const knockout = useBeerpongStore((s) => s.knockout);
  const ghosts = useBeerpongStore((s) => s.ghosts);
  const aiDifficulty = useBeerpongStore((s) => s.aiDifficulty);
  const daily = useBeerpongStore((s) => s.daily);
  const ownedSkinIds = useBeerpongStore((s) => s.ownedSkinIds);
  const claimedAchievements = useBeerpongStore((s) => s.claimedAchievements);
  const claimedSeasonTiers = useBeerpongStore((s) => s.claimedSeasonTiers);
  const lucky = useBeerpongStore((s) => s.lucky);
  const luckyReady = canPlayLucky(lucky, new Date());
  const { level, progress } = selectCareerProgress(arcade.careerXP);
  const t = useT();
  const language = useLanguage();

  const division = getDivision(rivals.division);
  const weekendUnlocked = rivals.division <= WEEKEND_UNLOCK_DIVISION;
  const preset = AI_PRESETS[aiDifficulty];
  /**
   * Whether the hero card says "carry on" or "get started".
   *
   * Counted from throws rather than wins: somebody who has played and lost is
   * still somebody who has played, and greeting them as a newcomer is the kind
   * of small wrongness that makes an app feel like it is not paying attention.
   */
  const played = arcade.totalThrows > 0;
  /** Whether the league is open today, and whether a run is still alive. */
  const league = weekendAvailability(weekend, new Date());

  // How many rewards are sitting there unclaimed — shown on the tasks card.
  const today = todayKey();
  const counters = daily.date === today ? daily : null;
  const achievementStats: AchievementStats = {
    totalCupsHit: camera.totalCupsHit + arcade.totalCupsHit,
    arcadeWins: arcade.wins,
    bestStreak: camera.bestStreak,
    bestDivision: rivals.bestDivision,
    weekendBestWins: weekend.bestWins,
    ownedSkins: ownedSkinIds.length,
    trackerGames: camera.gamesPlayed,
  };
  const claimable =
    challengesFor(today).filter(
      (c) => (counters ? counters[c.metric] : 0) >= c.target && !counters?.claimed.includes(c.id),
    ).length +
    ACHIEVEMENTS.filter((a) => {
      const { current, target } = a.progress(achievementStats);
      return current >= target && !claimedAchievements.includes(a.id);
    }).length +
    SEASON_TIERS.filter(
      (tier) => arcade.careerXP >= tier.xp && !claimedSeasonTiers.includes(tier.level),
    ).length;

  return (
    <View style={styles.container}>
      <GridBackground />
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <ScreenHeader
            title={t('hub.title')}
            subtitle={t('hub.careerLevel', { level })}
            right={
              <CoinChip coins={coins} />
            }
          />

          <View style={styles.progressWrap}>
            <ProgressBar progress={progress} />
          </View>

          {/* The one loud thing on this screen, and the answer to the question
              somebody actually opened the app with. Everything below is a row
              of the same height with a hairline border — see the rationing
              rule in `theme/glow.ts`. */}
          <View style={styles.heroWrap}>
            <HeroCard
              eyebrow={played ? t('hub.hero.eyebrow') : t('hub.hero.firstEyebrow')}
              title={t('hub.offline.title')}
              subtitle={
                played
                  ? t('hub.hero.lastPlayed', { last: t(preset.labelKey) })
                  : t('hub.hero.firstSubtitle')
              }
              action={t('hub.hero.action')}
              href="/(tabs)/arcade/offline"
            />
          </View>

          <View style={styles.section}>
            <SectionLabel>{t('hub.others')}</SectionLabel>

            <ModeRow
              icon="people"
              title={t('hub.passplay.title')}
              subtitle={t('hub.passplay.subtitle')}
              href="/(tabs)/arcade/passplay"
              index={0}
            />

            <ModeRow
              icon="wifi"
              title={t('hub.arcadeOnline.title')}
              subtitle={
                ONLINE_AVAILABLE ? t('hub.arcadeOnline.subtitle') : t('hub.arcadeOnline.off')
              }
              href="/(tabs)/arcade/online"
              // Not locked — there is nothing to unlock, the address is simply
              // absent from this build. Grey says "not for you yet", which
              // would be a lie.
              accent={ONLINE_AVAILABLE ? colors.you : colors.locked}
              index={1}
            />

            <ModeRow
              icon="globe"
              title={t('hub.rivals.title')}
              subtitle={t('hub.rivals.subtitle', {
                division: divisionName(language, division),
                wins: rivals.divisionWins,
                target: division.winsToPromote,
              })}
              href="/(tabs)/arcade/rivals"
              index={2}
            />

            <ModeRow
              icon="trophy"
              title={t('knockout.title')}
              subtitle={
                knockout
                  ? t('knockout.next', {
                      round: t(`knockout.round.${roundKey(knockout.teams, knockout.round)}`),
                      name: opponentById(knockout.opponentIds[knockout.round - 1]).nickname,
                    })
                  : t('knockout.tagline')
              }
              href="/(tabs)/arcade/knockout"
              accent={colors.reward}
              index={3}
              badge={knockout ? 1 : undefined}
            />

            {/* Only once there is somebody to play. An empty list dressed up as
                a mode is a promise the app has not kept yet. */}
            {ghosts.length > 0 ? (
              <ModeRow
                icon="footsteps"
                title={t('ghost.title')}
                subtitle={t('ghost.hubSubtitle', { count: ghosts.length })}
                href="/(tabs)/arcade/ghosts"
                index={4}
              />
            ) : null}

            {/* Last in the section, because most days it is the one you
                cannot have. Two different reasons for that, and they are not
                the same thing to a player: not good enough yet (climb), and
                not today (come back Friday). */}
            <ModeRow
              icon="calendar"
              title={t('hub.weekend.title')}
              subtitle={
                !weekendUnlocked
                  ? t('hub.weekend.locked', { division: WEEKEND_UNLOCK_DIVISION })
                  : !league.open
                    ? league.daysAway === 1
                      ? t('hub.weekend.closed1')
                      : t('hub.weekend.closedN', { days: league.daysAway })
                    : league.runLive
                      ? t('hub.weekend.running', {
                          played: weekend.played,
                          matches: WEEKEND_MATCHES,
                          wins: weekend.wins,
                        })
                      : t('hub.weekend.idle', { matches: WEEKEND_MATCHES })
              }
              href="/(tabs)/arcade/weekend"
              accent={colors.reward}
              index={5}
              locked={!weekendUnlocked || !league.open}
            />
          </View>

          <View style={styles.section}>
            <SectionLabel>{t('hub.progress')}</SectionLabel>
            {/* First in its section on purpose: it is the one thing here that
                expires today. Gold only while it is actually claimable — a
                reward colour on a spent reward is the palette lying. */}
            <ModeRow
              icon="star"
              title={t('lucky.hubTitle')}
              subtitle={luckyReady ? t('lucky.hubReady') : t('lucky.hubDone')}
              href="/(tabs)/arcade/lucky"
              accent={luckyReady ? colors.reward : colors.locked}
              index={0}
              badge={luckyReady ? 1 : undefined}
            />
            <ModeRow
              icon="checkmark-done"
              title={t('hub.challenges.title')}
              subtitle={
                claimable > 0
                  ? t(claimable === 1 ? 'hub.challenges.ready1' : 'hub.challenges.readyN', {
                      count: claimable,
                    })
                  : t('hub.challenges.subtitle')
              }
              href="/(tabs)/arcade/challenges"
              accent={claimable > 0 ? colors.reward : colors.you}
              index={1}
              badge={claimable > 0 ? claimable : undefined}
            />
            <ModeRow
              icon="stats-chart"
              title={t('stats.hubTitle')}
              subtitle={t('stats.hubSubtitle')}
              href="/(tabs)/arcade/stats"
              index={2}
            />
          </View>

          <View style={styles.section}>
            <SectionLabel>{t('hub.collection')}</SectionLabel>
            {/* The country flags are the paid ones, so with nothing for sale
                this tile leads nowhere worth going — Skins → Becher already
                holds every design that can be earned, and equips them. */}
            {SALES_ENABLED ? (
              <ModeRow
                icon="flag"
                title={t('hub.cups.title')}
                subtitle={t('hub.cups.subtitle')}
                href="/(tabs)/arcade/cups"
                accent={colors.reward}
                index={0}
              />
            ) : null}

            <ModeRow
              icon="color-palette"
              title={t('hub.skins.title')}
              subtitle={t('hub.skins.subtitle')}
              href="/(tabs)/arcade/skins"
              index={1}
            />
          </View>

          <View style={styles.statsRow}>
            <HubStat label={t('hub.stat.rivalsWins')} value={`${rivals.wins}`} />
            <HubStat label={t('hub.stat.bestDivision')} value={`${rivals.bestDivision}`} />
            <HubStat label={t('hub.stat.weekendBest')} value={`${weekend.bestWins}`} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function HubStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.hubStat}>
      <Text style={styles.hubStatValue} selectable={false}>
        {value}
      </Text>
      <Text style={styles.hubStatLabel} selectable={false}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  safe: { flex: 1 },
  scroll: { paddingBottom: spacing.xl },
  progressWrap: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  heroWrap: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  hubStat: { alignItems: 'center' },
  hubStatValue: {
    fontFamily: fonts.numeric,
    fontSize: 24,
    color: colors.neon,
  },
  hubStatLabel: {
    fontFamily: fonts.label,
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 1,
    marginTop: 2,
    textTransform: 'uppercase',
  },
});
