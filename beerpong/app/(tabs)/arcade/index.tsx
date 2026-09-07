import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { GridBackground } from '@/components/ui/GridBackground';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { SectionLabel } from '@/components/ui/SectionLabel';
import {
  AI_PRESETS,
  WEEKEND_MATCHES,
  WEEKEND_UNLOCK_DIVISION,
  getDivision,
} from '@/lib/competition';
import {
  ACHIEVEMENTS,
  SEASON_TIERS,
  challengesFor,
  todayKey,
  type AchievementStats,
} from '@/lib/progression';
import { selectCareerProgress, useBeerpongStore } from '@/lib/store';
import { useFeedback } from '@/lib/feedback';
import { colors, fonts, glow, radius, spacing } from '@/theme';

export default function ArcadeHubScreen() {
  const arcade = useBeerpongStore((s) => s.arcade);
  const camera = useBeerpongStore((s) => s.camera);
  const coins = useBeerpongStore((s) => s.coins);
  const rivals = useBeerpongStore((s) => s.rivals);
  const weekend = useBeerpongStore((s) => s.weekend);
  const aiDifficulty = useBeerpongStore((s) => s.aiDifficulty);
  const daily = useBeerpongStore((s) => s.daily);
  const ownedSkinIds = useBeerpongStore((s) => s.ownedSkinIds);
  const claimedAchievements = useBeerpongStore((s) => s.claimedAchievements);
  const claimedSeasonTiers = useBeerpongStore((s) => s.claimedSeasonTiers);
  const { level, progress } = selectCareerProgress(arcade.careerXP);

  const division = getDivision(rivals.division);
  const weekendUnlocked = rivals.division <= WEEKEND_UNLOCK_DIVISION;
  const preset = AI_PRESETS[aiDifficulty];

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
      (t) => arcade.careerXP >= t.xp && !claimedSeasonTiers.includes(t.level),
    ).length;

  return (
    <View style={styles.container}>
      <GridBackground />
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <ScreenHeader
            title="ARCADE"
            subtitle={`Career Level ${level}`}
            right={
              <View style={styles.coinChip}>
                <Ionicons name="logo-bitcoin" size={14} color={colors.gold} />
                <Text style={styles.coinText} selectable={false}>
                  {coins}
                </Text>
              </View>
            }
          />

          <View style={styles.progressWrap}>
            <ProgressBar progress={progress} />
          </View>

          <View style={styles.section}>
            <SectionLabel>Spielmodi</SectionLabel>

            <ModeCard
              icon="hardware-chip"
              title="Offline vs. KI"
              subtitle={`Zuletzt: ${preset.label} · Einfach, Mittel oder Schwer`}
              accent={colors.neon}
              href="/(tabs)/arcade/offline"
            />

            <ModeCard
              icon="people"
              title="Pass & Play"
              subtitle="Zwei Spieler, ein Handy — abwechselnd werfen"
              accent={colors.gold}
              href="/(tabs)/arcade/passplay"
            />

            <ModeCard
              icon="globe"
              title="Division Rivals"
              subtitle={`${division.name} · ${rivals.divisionWins}/${division.winsToPromote} Siege bis Aufstieg`}
              accent={division.color}
              href="/(tabs)/arcade/rivals"
            />

            <ModeCard
              icon="calendar"
              title="Weekend League"
              subtitle={
                weekendUnlocked
                  ? weekend.active
                    ? `Lauf läuft · ${weekend.played}/${WEEKEND_MATCHES} Spiele · ${weekend.wins} Siege`
                    : `${WEEKEND_MATCHES} Spiele, vier Belohnungsstufen`
                  : `Ab Division ${WEEKEND_UNLOCK_DIVISION} freigeschaltet`
              }
              accent={weekendUnlocked ? colors.gold : colors.textMuted}
              href="/(tabs)/arcade/weekend"
              locked={!weekendUnlocked}
            />
          </View>

          <View style={styles.section}>
            <SectionLabel>Fortschritt</SectionLabel>
            <ModeCard
              icon="checkmark-done"
              title="Aufgaben & Erfolge"
              subtitle={
                claimable > 0
                  ? `${claimable} Belohnung${claimable === 1 ? '' : 'en'} abholbereit`
                  : 'Tagesaufgaben, Saison-Stufen und Erfolge'
              }
              accent={claimable > 0 ? colors.gold : colors.neon}
              href="/(tabs)/arcade/challenges"
              badge={claimable > 0 ? claimable : undefined}
            />
          </View>

          <View style={styles.section}>
            <SectionLabel>Sammlung</SectionLabel>
            <ModeCard
              icon="color-palette"
              title="Skins"
              subtitle="Bälle und Tische freischalten"
              accent={colors.neonAlt}
              href="/(tabs)/arcade/skins"
              compact
            />
          </View>

          <View style={styles.statsRow}>
            <HubStat label="Rivals-Siege" value={`${rivals.wins}`} />
            <HubStat label="Beste Division" value={`${rivals.bestDivision}`} />
            <HubStat label="WL-Bestwert" value={`${weekend.bestWins}`} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function ModeCard({
  icon,
  title,
  subtitle,
  accent,
  href,
  locked,
  compact,
  badge,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  accent: string;
  href: Href;
  locked?: boolean;
  compact?: boolean;
  badge?: number;
}) {
  const feedback = useFeedback();
  return (
    <Pressable
      onPress={() => {
        feedback.tap();
        router.push(href);
      }}
      style={({ pressed }) => [
        styles.modeCard,
        compact && styles.modeCardCompact,
        { borderColor: locked ? colors.borderFaint : accent },
        !locked && glow('soft', accent),
        pressed && styles.modeCardPressed,
      ]}
    >
      <View style={[styles.modeIcon, { borderColor: locked ? colors.borderFaint : accent }]}>
        <Ionicons
          name={locked ? 'lock-closed' : icon}
          size={compact ? 18 : 22}
          color={locked ? colors.textMuted : accent}
        />
      </View>
      <View style={styles.modeText}>
        <Text
          style={[styles.modeTitle, locked && { color: colors.textSecondary }]}
          selectable={false}
        >
          {title}
        </Text>
        <Text style={styles.modeSubtitle} selectable={false}>
          {subtitle}
        </Text>
      </View>
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText} selectable={false}>
            {badge}
          </Text>
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
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
  section: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
  },
  coinChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundElevated,
  },
  coinText: {
    fontFamily: fonts.numeric,
    color: colors.gold,
    fontSize: 13,
  },
  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    backgroundColor: colors.backgroundCard,
    marginBottom: spacing.sm,
  },
  modeCardCompact: {
    paddingVertical: spacing.sm,
  },
  modeCardPressed: {
    opacity: 0.7,
  },
  modeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundElevated,
  },
  modeText: { flex: 1 },
  modeTitle: {
    fontFamily: fonts.headingBlack,
    fontSize: 18,
    color: colors.textPrimary,
  },
  modeSubtitle: {
    fontFamily: fonts.bodyRegular,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gold,
  },
  badgeText: {
    fontFamily: fonts.numeric,
    fontSize: 13,
    color: colors.background,
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
