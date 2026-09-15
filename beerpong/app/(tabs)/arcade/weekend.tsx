import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { GridBackground } from '@/components/ui/GridBackground';
import { Reveal } from '@/components/ui/Reveal';
import { GlowButton } from '@/components/ui/GlowButton';
import { SectionLabel } from '@/components/ui/SectionLabel';
import {
  WEEKEND_MATCHES,
  WEEKEND_TIERS,
  WEEKEND_UNLOCK_DIVISION,
  getDivision,
  weekendAvailability,
  weekendTierFor,
} from '@/lib/competition';
import { PERFECT_WEEKEND_CUP, cupDesign } from '@/lib/cupSkins';
import { CupPreview } from '@/components/arcade/CupPreview';
import { useBeerpongStore } from '@/lib/store';
import { divisionName, useLanguage, useT } from '@/lib/i18n';
import { colors, fonts, glow, radius, spacing } from '@/theme';

export default function WeekendScreen() {
  const rivals = useBeerpongStore((s) => s.rivals);
  const weekend = useBeerpongStore((s) => s.weekend);
  const ownedCupSkins = useBeerpongStore((s) => s.ownedCupSkins);
  const startWeekendRun = useBeerpongStore((s) => s.startWeekendRun);
  const resetWeekendRun = useBeerpongStore((s) => s.resetWeekendRun);
  const t = useT();
  const language = useLanguage();

  const unlocked = rivals.division <= WEEKEND_UNLOCK_DIVISION;
  const projected = weekendTierFor(weekend.wins);
  const remaining = WEEKEND_MATCHES - weekend.played;
  /**
   * Worked out once per render from the clock rather than kept in state.
   *
   * A stored "is it the weekend" would be wrong the moment somebody leaves the
   * app open past midnight on Sunday, which is exactly when it matters.
   */
  const league = weekendAvailability(weekend, new Date());
  const perfectDesign = cupDesign(PERFECT_WEEKEND_CUP);
  const hasPerfectCup = ownedCupSkins.includes(PERFECT_WEEKEND_CUP);

  const startRun = () => {
    startWeekendRun();
    router.push({ pathname: '/(tabs)/arcade/match', params: { mode: 'weekend' } });
  };

  return (
    <View style={styles.container}>
      <GridBackground />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.title}>{t('weekend.title')}</Text>
          <View style={{ width: 26 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {!unlocked ? (
            <View style={styles.lockedCard}>
              <Ionicons name="lock-closed" size={28} color={colors.textMuted} />
              <Text style={styles.lockedTitle} selectable={false}>
                {t('weekend.locked.title')}
              </Text>
              <Text style={styles.lockedBody} selectable={false}>
                {t('weekend.locked.body', {
                  required: divisionName(language, getDivision(WEEKEND_UNLOCK_DIVISION)),
                  current: divisionName(language, getDivision(rivals.division)),
                })}
              </Text>
              <GlowButton
                label={t('weekend.locked.cta')}
                variant="outline"
                size="sm"
                onPress={() => router.replace('/(tabs)/arcade/rivals')}
                style={styles.lockedButton}
              />
            </View>
          ) : !league.open ? (
            /* Monday to Thursday. Not a failure state and not dressed as one:
               the league is an event, and an event you cannot have right now
               is the reason it is worth having at all. */
            <View style={styles.closedCard}>
              <Ionicons name="calendar-outline" size={28} color={colors.reward} />
              <Text style={styles.closedTitle} selectable={false}>
                {t('weekend.closed.title')}
              </Text>
              <Text style={styles.closedCountdown} selectable={false}>
                {league.daysAway === 1
                  ? t('weekend.closed.days1')
                  : t('weekend.closed.daysN', { days: league.daysAway })}
              </Text>
              <Text style={styles.closedBody} selectable={false}>
                {t('weekend.closed.body')}
              </Text>
              <Text style={styles.closedHint} selectable={false}>
                {t('weekend.closed.meanwhile')}
              </Text>
            </View>
          ) : league.runExpired ? (
            /* A run left behind in a weekend that has ended. Said plainly,
               including what was and was not lost — a run that vanishes with
               no explanation reads as a bug. */
            <View style={styles.closedCard}>
              <Ionicons name="hourglass-outline" size={28} color={colors.textSecondary} />
              <Text style={styles.closedTitle} selectable={false}>
                {t('weekend.expired.title')}
              </Text>
              <Text style={styles.closedBody} selectable={false}>
                {t('weekend.expired.body')}
              </Text>
              <GlowButton
                label={t('weekend.expired.cta')}
                size="lg"
                onPress={startRun}
                style={styles.runButton}
              />
            </View>
          ) : (
            <View style={[styles.runCard, glow('soft', colors.gold)]}>
              <View style={styles.openChip}>
                <View style={styles.openDot} />
                <Text style={styles.openChipText} selectable={false}>
                  {t('weekend.open.chip')}
                </Text>
              </View>
              <Text style={styles.runTitle} selectable={false}>
                {weekend.active ? t('weekend.runActive') : t('weekend.runNew')}
              </Text>
              <Text style={styles.runSubtitle} selectable={false}>
                {t('weekend.runSubtitle', { matches: WEEKEND_MATCHES })}
              </Text>

              <View style={styles.matchGrid}>
                {Array.from({ length: WEEKEND_MATCHES }).map((_, i) => {
                  const played = i < weekend.played;
                  const won = i < weekend.wins;
                  return (
                    <View
                      key={i}
                      style={[
                        styles.matchPip,
                        played && {
                          backgroundColor: won ? colors.neon : colors.danger,
                          borderColor: won ? colors.neon : colors.danger,
                        },
                      ]}
                    />
                  );
                })}
              </View>

              <View style={styles.runStats}>
                <RunStat label={t('common.wins')} value={`${weekend.wins}`} color={colors.neon} />
                <RunStat
                  label={t('weekend.remaining')}
                  value={`${Math.max(0, remaining)}`}
                  color={colors.textPrimary}
                />
                <RunStat label={t('weekend.tier')} value={t(projected.nameKey)} color={projected.color} />
              </View>

              {weekend.active ? (
                <>
                  <GlowButton
                    label={t('weekend.nextMatch')}
                    size="lg"
                    onPress={() => router.push({ pathname: '/(tabs)/arcade/match', params: { mode: 'weekend' } })}
                    style={styles.runButton}
                  />
                  <GlowButton
                    label={t('weekend.abortRun')}
                    variant="ghost"
                    size="sm"
                    onPress={resetWeekendRun}
                    style={styles.runButton}
                  />
                </>
              ) : (
                <GlowButton label={t('weekend.startRun')} size="lg" onPress={startRun} style={styles.runButton} />
              )}
            </View>
          )}

          <View style={styles.tiersSection}>
            <SectionLabel>{t('weekend.rewards')}</SectionLabel>
            {WEEKEND_TIERS.map((tier, position) => {
              const reached = weekend.wins >= tier.minWins;
              return (
                <Reveal key={tier.nameKey} index={position} delay={120}>
                <View style={[styles.tierRow, reached && { borderColor: tier.color }]}>
                  <View style={[styles.tierDot, { backgroundColor: tier.color }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.tierName, { color: tier.color }]} selectable={false}>
                      {t(tier.nameKey)}
                    </Text>
                    <Text style={styles.tierMeta} selectable={false}>
                      {t('weekend.tierFrom', { wins: tier.minWins })}
                    </Text>
                  </View>
                  <Text style={styles.tierCoins} selectable={false}>
                    +{tier.coins}
                  </Text>
                </View>
                </Reveal>
              );
            })}

            {/* Above the coin tiers in worth, below them in the list, because
                it is the only one that is not coins — and the only one that
                cannot be had any other way. */}
            <Reveal index={WEEKEND_TIERS.length} delay={120}>
              <View
                style={[
                  styles.perfectRow,
                  hasPerfectCup && { borderColor: perfectDesign.accent },
                ]}
              >
                <CupPreview design={perfectDesign} size={44} />
                <View style={{ flex: 1 }}>
                  <View style={styles.perfectTitleRow}>
                    <Text
                      style={[styles.tierName, { color: perfectDesign.accent }]}
                      selectable={false}
                    >
                      {t('weekend.perfect.label')}
                    </Text>
                    <View style={styles.notForSaleChip}>
                      <Text style={styles.notForSaleText} selectable={false}>
                        {t('skins.earnedOnly')}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.tierMeta} selectable={false}>
                    {hasPerfectCup
                      ? t('weekend.perfect.owned', { count: weekend.perfectRuns })
                      : t('weekend.perfect.reward', {
                          matches: WEEKEND_MATCHES,
                          design: perfectDesign.name,
                        })}
                  </Text>
                </View>
                {hasPerfectCup ? (
                  <Ionicons name="checkmark-circle" size={22} color={perfectDesign.accent} />
                ) : null}
              </View>
            </Reveal>
          </View>

          <View style={styles.historyRow}>
            <RunStat label={t('weekend.bestRun')} value={`${weekend.bestWins}`} color={colors.gold} />
            <RunStat
              label={t('weekend.runs')}
              value={`${weekend.runsCompleted}`}
              color={colors.textPrimary}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function RunStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.runStat}>
      <Text style={[styles.runStatValue, { color }]} selectable={false}>
        {value}
      </Text>
      <Text style={styles.runStatLabel} selectable={false}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  closedCard: {
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderQuiet,
    backgroundColor: colors.backgroundCard,
  },
  closedTitle: {
    fontFamily: fonts.headingBlack,
    fontSize: 20,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  closedCountdown: {
    fontFamily: fonts.numeric,
    fontSize: 26,
    color: colors.reward,
  },
  closedBody: {
    fontFamily: fonts.bodyRegular,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  closedHint: {
    fontFamily: fonts.bodyRegular,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textMuted,
    textAlign: 'center',
  },
  openChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.you,
    marginBottom: spacing.sm,
  },
  openDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.you },
  openChipText: {
    fontFamily: fonts.label,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.you,
  },
  perfectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderQuiet,
    backgroundColor: colors.backgroundCard,
    marginTop: spacing.sm,
  },
  perfectTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  notForSaleChip: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderQuiet,
  },
  notForSaleText: {
    fontFamily: fonts.label,
    fontSize: 9,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
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
  lockedCard: {
    borderWidth: 1,
    borderColor: colors.borderFaint,
    borderRadius: radius.xl,
    backgroundColor: colors.backgroundCard,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  lockedTitle: {
    fontFamily: fonts.headingBlack,
    fontSize: 20,
    color: colors.textPrimary,
  },
  lockedBody: {
    fontFamily: fonts.bodyRegular,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  lockedButton: { marginTop: spacing.sm },
  runCard: {
    borderWidth: 1.5,
    borderColor: colors.gold,
    borderRadius: radius.xl,
    backgroundColor: colors.backgroundCard,
    padding: spacing.lg,
    alignItems: 'center',
  },
  runTitle: {
    fontFamily: fonts.headingBlack,
    fontSize: 22,
    color: colors.gold,
  },
  runSubtitle: {
    fontFamily: fonts.bodyRegular,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  matchGrid: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
    marginTop: spacing.lg,
  },
  matchPip: {
    width: 22,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: colors.borderFaint,
    backgroundColor: colors.backgroundElevated,
  },
  runStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  runStat: { alignItems: 'center' },
  runStatValue: {
    fontFamily: fonts.numeric,
    fontSize: 22,
  },
  runStatLabel: {
    fontFamily: fonts.label,
    fontSize: 10,
    color: colors.textSecondary,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  runButton: { width: '100%', marginTop: spacing.sm },
  tiersSection: { marginTop: spacing.xl },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
    marginBottom: 4,
  },
  tierDot: { width: 10, height: 10, borderRadius: 5 },
  tierName: {
    fontFamily: fonts.label,
    fontSize: 14,
  },
  tierMeta: {
    fontFamily: fonts.bodyRegular,
    fontSize: 11,
    color: colors.textMuted,
  },
  tierCoins: {
    fontFamily: fonts.numeric,
    fontSize: 16,
    color: colors.gold,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.xl,
  },
});
