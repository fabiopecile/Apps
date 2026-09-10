import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { GridBackground } from '@/components/ui/GridBackground';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { Reveal } from '@/components/ui/Reveal';
import { CUP_WIDTH, generateOpponentRack, TABLE_WIDTH_REFERENCE } from '@/lib/arcadeLayout';
import {
  FORM_LENGTH,
  RACK_POSITIONS,
  bestRun,
  divisionTrail,
  form,
  hitRate,
  hitShares,
  netForm,
  secondsPerCup,
  totalCupsRecorded,
  type StatsMode,
} from '@/lib/stats';
import { useBeerpongStore } from '@/lib/store';
import { useT } from '@/lib/i18n';
import { colors, fonts, glow, radius, spacing } from '@/theme';

/**
 * Your own game, looked at.
 *
 * The counters elsewhere say how much you have played. These say something
 * about *how* you play: where on the rack your throws land, whether you are in
 * form, and how long a game is taking you. Everything here is measured from
 * throws that actually happened — where there is nothing yet, it says so rather
 * than drawing a confident picture of nothing.
 */
export default function StatsScreen() {
  const stats = useBeerpongStore((s) => s.stats);
  const t = useT();

  const shares = hitShares(stats);
  const total = totalCupsRecorded(stats);
  const results = form(stats, FORM_LENGTH);
  const net = netForm(stats);
  const trail = divisionTrail(stats);

  return (
    <View style={styles.container}>
      <GridBackground />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.title}>{t('stats.title')}</Text>
          <View style={{ width: 26 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <SectionLabel>{t('stats.heatmapLabel')}</SectionLabel>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('stats.heatmapTitle')}</Text>
            <Text style={styles.cardBody}>
              {total > 0 ? t('stats.heatmapBody', { cups: total }) : t('stats.heatmapEmpty')}
            </Text>
            <Heatmap shares={shares} hasData={total > 0} />
            {total > 0 ? <HeatmapLegend /> : null}
          </View>

          <SectionLabel>{t('stats.formLabel')}</SectionLabel>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('stats.formTitle', { count: FORM_LENGTH })}</Text>
            {results.length > 0 ? (
              <>
                <View style={styles.formRow}>
                  {results.map((won, i) => (
                    <Reveal key={i} index={i} delay={40}>
                      <View style={[styles.chip, won ? styles.chipWin : styles.chipLoss]}>
                        <Text
                          style={[styles.chipText, won ? styles.chipTextWin : styles.chipTextLoss]}
                          selectable={false}
                        >
                          {won ? t('stats.win') : t('stats.loss')}
                        </Text>
                      </View>
                    </Reveal>
                  ))}
                </View>
                <Text style={styles.cardBody}>{t('stats.formOrder')}</Text>
                <View style={styles.netRow}>
                  <Text
                    style={[
                      styles.netValue,
                      { color: net > 0 ? colors.neon : net < 0 ? colors.danger : colors.textMuted },
                    ]}
                    selectable={false}
                  >
                    {net > 0 ? `+${net}` : `${net}`}
                  </Text>
                  <Text style={styles.netLabel}>{t('stats.net')}</Text>
                </View>
              </>
            ) : (
              <Text style={styles.cardBody}>{t('stats.formEmpty')}</Text>
            )}
          </View>

          <SectionLabel>{t('stats.paceLabel')}</SectionLabel>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('stats.paceTitle')}</Text>
            <View style={styles.paceRow}>
              <Pace label={t('hub.offline.title')} seconds={secondsPerCup(stats, 'offline')} t={t} />
              <Pace label={t('hub.passplay.title')} seconds={secondsPerCup(stats, 'passplay')} t={t} />
              <Pace label={t('tab.camera')} seconds={secondsPerCup(stats, 'tracker')} t={t} />
            </View>
            <Text style={styles.cardBody}>{t('stats.paceBody')}</Text>
          </View>

          <SectionLabel>{t('stats.numbersLabel')}</SectionLabel>
          <View style={styles.statGrid}>
            <Stat
              label={t('stats.hitRate')}
              value={hitRate(stats) == null ? '—' : `${Math.round((hitRate(stats) as number) * 100)}%`}
            />
            <Stat label={t('stats.bestRun')} value={`${bestRun(stats)}`} />
            <Stat label={t('stats.recorded')} value={`${stats.matches.length}`} />
          </View>

          {trail.length > 1 ? (
            <>
              <SectionLabel>{t('stats.divisionLabel')}</SectionLabel>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{t('stats.divisionTitle')}</Text>
                <DivisionTrail trail={trail} />
                <Text style={styles.cardBody}>{t('stats.divisionBody')}</Text>
              </View>
            </>
          ) : null}

          <Text style={styles.footnote}>{t('stats.footnote')}</Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

/**
 * The rack, drawn where the cups actually stand.
 *
 * The positions come from the same layout the game throws at, so this is a
 * picture of the rack rather than a grid that stands for one — a lean towards
 * the back left is visible as a lean towards the back left.
 */
function Heatmap({ shares, hasData }: { shares: number[]; hasData: boolean }) {
  const cups = useMemo(() => generateOpponentRack(TABLE_WIDTH_REFERENCE), []);
  const box = useMemo(() => {
    const xs = cups.map((cup) => cup.x);
    const ys = cups.map((cup) => cup.y);
    return {
      minX: Math.min(...xs) - CUP_WIDTH / 2,
      maxX: Math.max(...xs) + CUP_WIDTH / 2,
      minY: Math.min(...ys) - CUP_WIDTH / 2,
      maxY: Math.max(...ys) + CUP_WIDTH / 2,
    };
  }, [cups]);

  const width = box.maxX - box.minX;
  const height = box.maxY - box.minY;
  // Drawn at a fixed width and scaled; the rack's own proportions decide the
  // height, so the triangle never comes out squashed.
  const drawWidth = 260;
  const scale = drawWidth / width;
  const size = CUP_WIDTH * scale * 0.94;
  const hottest = Math.max(...shares, 0.0001);

  return (
    <View style={{ width: drawWidth, height: height * scale, alignSelf: 'center', marginVertical: spacing.sm }}>
      {cups.map((cup) => {
        const share = shares[cup.index] ?? 0;
        // Relative to the hottest cup rather than absolute: with ten cups every
        // share is around 0.1, and an absolute scale would make the whole rack
        // look uniformly cold whatever the shape.
        const heat = hasData ? share / hottest : 0;
        return (
          <View
            key={cup.index}
            style={[
              styles.heatCup,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                left: (cup.x - box.minX) * scale - size / 2,
                top: (cup.y - box.minY) * scale - size / 2,
                backgroundColor: heatColour(heat),
                borderColor: heat > 0.66 ? colors.neon : colors.borderFaint,
              },
            ]}
          >
            <Text style={[styles.heatText, heat > 0.55 && { color: colors.background }]} selectable={false}>
              {hasData ? `${Math.round(share * 100)}` : '–'}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/** Cold to hot, staying inside the app's own green rather than a rainbow. */
function heatColour(heat: number): string {
  if (heat <= 0) return 'rgba(255,255,255,0.05)';
  const alpha = 0.12 + heat * 0.88;
  return `rgba(57, 255, 20, ${alpha.toFixed(2)})`;
}

function HeatmapLegend() {
  return (
    <View style={styles.legendRow}>
      {[0, 0.33, 0.66, 1].map((heat) => (
        <View key={heat} style={[styles.legendSwatch, { backgroundColor: heatColour(heat) }]} />
      ))}
    </View>
  );
}

function Pace({
  label,
  seconds,
  t,
}: {
  label: string;
  seconds: number | null;
  t: (key: 'stats.perCup' | 'stats.noData') => string;
}) {
  return (
    <View style={styles.paceCell}>
      <Text style={styles.paceLabel} selectable={false} numberOfLines={1}>
        {label}
      </Text>
      <Text style={styles.paceValue} selectable={false}>
        {seconds == null ? '—' : formatDuration(seconds)}
      </Text>
      <Text style={styles.paceUnit} selectable={false}>
        {seconds == null ? t('stats.noData') : t('stats.perCup')}
      </Text>
    </View>
  );
}

/** Minutes and seconds, because "184 s" is not a length anybody feels. */
function formatDuration(seconds: number): string {
  const whole = Math.round(seconds);
  if (whole < 60) return `${whole}s`;
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

function DivisionTrail({ trail }: { trail: number[] }) {
  // Division 1 is the top, so a smaller number is higher up the chart.
  const best = Math.min(...trail);
  const worst = Math.max(...trail);
  const span = Math.max(1, worst - best);
  return (
    <View style={styles.trailRow}>
      {trail.map((division, i) => (
        <View key={i} style={styles.trailColumn}>
          {/* Full width and centred: without it the bar sizes against a column
              that has shrunk to its own contents, and comes out a hairline. */}
          <View style={{ flex: 1, width: '100%', alignItems: 'center', justifyContent: 'flex-end' }}>
            <View
              style={[
                styles.trailBar,
                {
                  height: 8 + ((worst - division) / span) * 46,
                  backgroundColor: i === trail.length - 1 ? colors.gold : colors.neon,
                },
              ]}
            />
          </View>
          <Text style={styles.trailLabel} selectable={false}>
            {division}
          </Text>
        </View>
      ))}
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCell}>
      <Text style={styles.statValue} selectable={false}>
        {value}
      </Text>
      <Text style={styles.statLabel} selectable={false} numberOfLines={2}>
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
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  title: { fontFamily: fonts.headingBlack, fontSize: 20, color: colors.textPrimary },
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderFaint,
    backgroundColor: colors.backgroundCard,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: 6,
  },
  cardTitle: { fontFamily: fonts.label, fontSize: 14, color: colors.textPrimary },
  cardBody: {
    fontFamily: fonts.bodyRegular,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  heatCup: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  heatText: {
    fontFamily: fonts.numeric,
    fontSize: 12,
    color: colors.textPrimary,
  },
  legendRow: {
    flexDirection: 'row',
    alignSelf: 'center',
    gap: 4,
  },
  legendSwatch: {
    width: 26,
    height: 6,
    borderRadius: 3,
  },
  formRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginVertical: 4,
  },
  chip: {
    width: 26,
    height: 26,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  chipWin: { borderColor: colors.neon, backgroundColor: 'rgba(57,255,20,0.16)' },
  chipLoss: { borderColor: colors.danger, backgroundColor: 'rgba(255,59,78,0.14)' },
  chipText: { fontFamily: fonts.label, fontSize: 12 },
  chipTextWin: { color: colors.neon },
  chipTextLoss: { color: colors.danger },
  netRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  netValue: { fontFamily: fonts.numeric, fontSize: 26 },
  netLabel: { fontFamily: fonts.label, fontSize: 11, color: colors.textMuted, letterSpacing: 1 },
  paceRow: { flexDirection: 'row', gap: spacing.sm, marginVertical: 4 },
  paceCell: { flex: 1, alignItems: 'center', gap: 1 },
  paceLabel: { fontFamily: fonts.label, fontSize: 11, color: colors.textMuted },
  paceValue: { fontFamily: fonts.numeric, fontSize: 22, color: colors.textPrimary },
  paceUnit: { fontFamily: fonts.bodyRegular, fontSize: 10, color: colors.textMuted },
  statGrid: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  statCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderFaint,
    backgroundColor: colors.backgroundCard,
    gap: 2,
  },
  statValue: { fontFamily: fonts.numeric, fontSize: 22, color: colors.neon },
  statLabel: {
    fontFamily: fonts.label,
    fontSize: 10,
    color: colors.textMuted,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  trailRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 76, marginVertical: 4 },
  trailColumn: { flex: 1, alignItems: 'center', height: '100%' },
  trailBar: { width: '70%', borderRadius: 3, ...glow('soft') },
  trailLabel: { fontFamily: fonts.numeric, fontSize: 10, color: colors.textMuted, marginTop: 3 },
  footnote: {
    fontFamily: fonts.bodyRegular,
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
