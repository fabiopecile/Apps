import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { GridBackground } from '@/components/ui/GridBackground';
import { GlowButton } from '@/components/ui/GlowButton';
import { SectionLabel } from '@/components/ui/SectionLabel';
import {
  WEEKEND_MATCHES,
  WEEKEND_TIERS,
  WEEKEND_UNLOCK_DIVISION,
  getDivision,
  weekendTierFor,
} from '@/lib/competition';
import { useBeerpongStore } from '@/lib/store';
import { divisionName, useLanguage, useT } from '@/lib/i18n';
import { colors, fonts, glow, radius, spacing } from '@/theme';

export default function WeekendScreen() {
  const rivals = useBeerpongStore((s) => s.rivals);
  const weekend = useBeerpongStore((s) => s.weekend);
  const startWeekendRun = useBeerpongStore((s) => s.startWeekendRun);
  const resetWeekendRun = useBeerpongStore((s) => s.resetWeekendRun);
  const t = useT();
  const language = useLanguage();

  const unlocked = rivals.division <= WEEKEND_UNLOCK_DIVISION;
  const projected = weekendTierFor(weekend.wins);
  const remaining = WEEKEND_MATCHES - weekend.played;

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
          ) : (
            <View style={[styles.runCard, glow('soft', colors.gold)]}>
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
            {WEEKEND_TIERS.map((tier) => {
              const reached = weekend.wins >= tier.minWins;
              return (
                <View
                  key={tier.nameKey}
                  style={[styles.tierRow, reached && { borderColor: tier.color }]}
                >
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
              );
            })}
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
