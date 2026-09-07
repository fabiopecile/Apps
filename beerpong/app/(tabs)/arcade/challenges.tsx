import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { GridBackground } from '@/components/ui/GridBackground';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { SectionLabel } from '@/components/ui/SectionLabel';
import {
  ACHIEVEMENTS,
  SEASON_TIERS,
  challengesFor,
  seasonProgress,
  todayKey,
  type AchievementStats,
} from '@/lib/progression';
import { useBeerpongStore } from '@/lib/store';
import { useFeedback } from '@/lib/feedback';
import { colors, fonts, glow, radius, spacing } from '@/theme';

export default function ChallengesScreen() {
  const daily = useBeerpongStore((s) => s.daily);
  const claimDaily = useBeerpongStore((s) => s.claimDaily);
  const camera = useBeerpongStore((s) => s.camera);
  const arcade = useBeerpongStore((s) => s.arcade);
  const rivals = useBeerpongStore((s) => s.rivals);
  const weekend = useBeerpongStore((s) => s.weekend);
  const ownedSkinIds = useBeerpongStore((s) => s.ownedSkinIds);
  const claimedAchievements = useBeerpongStore((s) => s.claimedAchievements);
  const claimAchievement = useBeerpongStore((s) => s.claimAchievement);
  const claimedSeasonTiers = useBeerpongStore((s) => s.claimedSeasonTiers);
  const claimSeasonTier = useBeerpongStore((s) => s.claimSeasonTier);
  const feedback = useFeedback();

  const today = todayKey();
  const challenges = challengesFor(today);
  // A stale day means yesterday's counters — show them as zero.
  const counters = daily.date === today ? daily : null;

  const stats: AchievementStats = {
    totalCupsHit: camera.totalCupsHit + arcade.totalCupsHit,
    arcadeWins: arcade.wins,
    bestStreak: camera.bestStreak,
    bestDivision: rivals.bestDivision,
    weekendBestWins: weekend.bestWins,
    ownedSkins: ownedSkinIds.length,
    trackerGames: camera.gamesPlayed,
  };

  const season = seasonProgress(arcade.careerXP);

  return (
    <View style={styles.container}>
      <GridBackground />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.title}>Aufgaben</Text>
          <View style={{ width: 26 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <SectionLabel>Heute</SectionLabel>
          {challenges.map((challenge) => {
            const current = counters ? counters[challenge.metric] : 0;
            const done = current >= challenge.target;
            const claimed = counters?.claimed.includes(challenge.id) ?? false;
            return (
              <View key={challenge.id} style={[styles.card, done && !claimed && glow('soft')]}>
                <View style={styles.cardTop}>
                  <Text style={styles.cardTitle} selectable={false}>
                    {challenge.title}
                  </Text>
                  <Text style={styles.cardCoins} selectable={false}>
                    +{challenge.coins}
                  </Text>
                </View>
                <ProgressBar progress={Math.min(1, current / challenge.target)} height={6} />
                <View style={styles.cardBottom}>
                  <Text style={styles.cardMeta} selectable={false}>
                    {Math.min(current, challenge.target)}/{challenge.target}
                  </Text>
                  {claimed ? (
                    <Text style={styles.claimedText} selectable={false}>
                      Abgeholt
                    </Text>
                  ) : done ? (
                    <Pressable
                      style={styles.claimButton}
                      onPress={() => {
                        feedback.cupHit();
                        claimDaily(challenge.id, challenge.coins);
                      }}
                    >
                      <Text style={styles.claimButtonText} selectable={false}>
                        Einsammeln
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            );
          })}

          <View style={styles.sectionGap} />
          <SectionLabel>Saison</SectionLabel>
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.cardTitle} selectable={false}>
                Stufe {season.reached}/{SEASON_TIERS.length}
              </Text>
              <Text style={styles.cardMeta} selectable={false}>
                {arcade.careerXP} XP
              </Text>
            </View>
            <ProgressBar progress={season.progress} height={6} />
            {season.next ? (
              <Text style={styles.cardMeta} selectable={false}>
                Noch {season.next.xp - arcade.careerXP} XP bis Stufe {season.next.level}
              </Text>
            ) : (
              <Text style={styles.cardMeta} selectable={false}>
                Alle Stufen erreicht.
              </Text>
            )}
          </View>

          <View style={styles.tierRow}>
            {SEASON_TIERS.map((tier) => {
              const unlocked = arcade.careerXP >= tier.xp;
              const claimed = claimedSeasonTiers.includes(tier.level);
              return (
                <Pressable
                  key={tier.level}
                  disabled={!unlocked || claimed}
                  onPress={() => {
                    feedback.cupHit();
                    claimSeasonTier(tier.level, tier.coins);
                  }}
                  style={[
                    styles.tier,
                    unlocked && !claimed && styles.tierReady,
                    claimed && styles.tierClaimed,
                  ]}
                >
                  <Text
                    style={[styles.tierLevel, unlocked && { color: colors.neon }]}
                    selectable={false}
                  >
                    {tier.level}
                  </Text>
                  <Text style={styles.tierCoins} selectable={false}>
                    {claimed ? '✓' : `+${tier.coins}`}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.sectionGap} />
          <SectionLabel>Erfolge</SectionLabel>
          {ACHIEVEMENTS.map((achievement) => {
            const { current, target } = achievement.progress(stats);
            const done = current >= target;
            const claimed = claimedAchievements.includes(achievement.id);
            return (
              <View key={achievement.id} style={[styles.card, done && !claimed && glow('soft')]}>
                <View style={styles.achievementRow}>
                  <View
                    style={[
                      styles.achievementIcon,
                      { borderColor: done ? colors.neon : colors.borderFaint },
                    ]}
                  >
                    <Ionicons
                      name={achievement.icon as keyof typeof Ionicons.glyphMap}
                      size={18}
                      color={done ? colors.neon : colors.textMuted}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle} selectable={false}>
                      {achievement.title}
                    </Text>
                    <Text style={styles.cardMeta} selectable={false}>
                      {achievement.description}
                    </Text>
                  </View>
                  {claimed ? (
                    <Ionicons name="checkmark-circle" size={20} color={colors.neon} />
                  ) : done ? (
                    <Pressable
                      style={styles.claimButton}
                      onPress={() => {
                        feedback.cupHit();
                        claimAchievement(achievement.id, achievement.coins);
                      }}
                    >
                      <Text style={styles.claimButtonText} selectable={false}>
                        +{achievement.coins}
                      </Text>
                    </Pressable>
                  ) : (
                    <Text style={styles.cardMeta} selectable={false}>
                      {Math.min(current, target)}/{target}
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    fontFamily: fonts.headingBlack,
    fontSize: 22,
    color: colors.textPrimary,
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  sectionGap: {
    height: spacing.lg,
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderFaint,
    backgroundColor: colors.backgroundCard,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: 8,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontFamily: fonts.label,
    fontSize: 14,
    color: colors.textPrimary,
  },
  cardCoins: {
    fontFamily: fonts.numeric,
    fontSize: 15,
    color: colors.gold,
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardMeta: {
    fontFamily: fonts.bodyRegular,
    fontSize: 12,
    color: colors.textMuted,
  },
  claimButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.neon,
  },
  claimButtonText: {
    fontFamily: fonts.label,
    fontSize: 12,
    color: colors.background,
    letterSpacing: 0.5,
  },
  claimedText: {
    fontFamily: fonts.label,
    fontSize: 12,
    color: colors.neon,
  },
  tierRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: spacing.sm,
  },
  tier: {
    width: 62,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderFaint,
    backgroundColor: colors.backgroundCard,
  },
  tierReady: {
    borderColor: colors.neon,
  },
  tierClaimed: {
    opacity: 0.5,
  },
  tierLevel: {
    fontFamily: fonts.numeric,
    fontSize: 18,
    color: colors.textMuted,
  },
  tierCoins: {
    fontFamily: fonts.label,
    fontSize: 11,
    color: colors.gold,
    marginTop: 2,
  },
  achievementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  achievementIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
