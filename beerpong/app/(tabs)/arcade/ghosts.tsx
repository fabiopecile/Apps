import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { GridBackground } from '@/components/ui/GridBackground';
import { GlowButton } from '@/components/ui/GlowButton';
import { Reveal } from '@/components/ui/Reveal';
import {
  GHOST_MIN_THROWS,
  ghostAccuracy,
  ghostSkill,
  isPlayable,
  type Ghost,
} from '@/lib/ghosts';
import { AI_PRESETS } from '@/lib/competition';
import { useBeerpongStore } from '@/lib/store';
import { useFeedback } from '@/lib/feedback';
import { useT } from '@/lib/i18n';
import { colors, fonts, glow, radius, spacing } from '@/theme';

/**
 * The people you have actually played against, as arcade opponents.
 *
 * Every card shows the numbers it was built from — cups, throws, percentage,
 * games — rather than a difficulty badge alone. That is not decoration: an
 * opponent claiming to throw like somebody has to show its working, or it is
 * indistinguishable from the app inventing a difficulty and putting a friend's
 * name on it.
 */
export default function GhostsScreen() {
  const t = useT();
  const feedback = useFeedback();
  const ghosts = useBeerpongStore((s) => s.ghosts);

  return (
    <View style={styles.container}>
      <GridBackground />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.title}>{t('ghost.title')}</Text>
          <View style={{ width: 26 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.intro}>{t('ghost.explain')}</Text>

          {ghosts.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="camera-outline" size={28} color={colors.textMuted} />
              <Text style={styles.emptyText}>{t('ghost.empty')}</Text>
              <GlowButton
                label={t('tracker.title')}
                variant="outline"
                size="sm"
                onPress={() => router.replace('/(tabs)/camera')}
              />
            </View>
          ) : (
            ghosts.map((ghost, index) => (
              <GhostCard key={ghost.name.toLowerCase()} ghost={ghost} index={index} />
            ))
          )}

          {/* Shown whether or not anybody is short of throws. It is about how
              much a rate is worth, which matters most for the ghosts that
              *are* playable — those are the ones being presented as somebody's
              game. */}
          {ghosts.length > 0 ? (
            <Text style={styles.footnote}>{t('ghost.why', { min: GHOST_MIN_THROWS })}</Text>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </View>
  );

  function GhostCard({ ghost, index }: { ghost: Ghost; index: number }) {
    const playable = isPlayable(ghost);
    const percent = Math.round(ghostAccuracy(ghost) * 100);
    const colour = playable ? AI_PRESETS[ghostSkill(ghost).nearest].color : colors.textMuted;

    return (
      <Reveal index={index}>
        <View style={[styles.card, playable && glow('soft', colour), { borderColor: colour }]}>
          <View style={styles.cardHead}>
            <View style={[styles.rate, { borderColor: colour }]}>
              <Text style={[styles.ratePercent, { color: colour }]}>{percent}%</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{ghost.name}</Text>
              <Text style={styles.record}>
                {t('ghost.record', {
                  hits: ghost.hits,
                  throws: ghost.throws,
                  percent,
                  games: ghost.games,
                })}
              </Text>
              {ghost.bestStreak > 1 ? (
                <Text style={styles.record}>{t('ghost.streak', { streak: ghost.bestStreak })}</Text>
              ) : null}
            </View>
          </View>

          {playable ? (
            <GlowButton
              label={t('ghost.play', { name: ghost.name })}
              size="sm"
              onPress={() => {
                feedback.tap();
                router.push({
                  pathname: '/(tabs)/arcade/match',
                  params: { mode: 'ghost', ghost: ghost.name },
                });
              }}
            />
          ) : (
            <Text style={styles.pending}>
              {t('ghost.needsMore', { left: GHOST_MIN_THROWS - ghost.throws })}
            </Text>
          )}
        </View>
      </Reveal>
    );
  }
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
  title: { fontFamily: fonts.headingBlack, fontSize: 22, color: colors.textPrimary },
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  intro: {
    fontFamily: fonts.bodyRegular,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  empty: {
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.borderFaint,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  emptyText: {
    fontFamily: fonts.bodyRegular,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  card: {
    borderWidth: 1.5,
    borderRadius: radius.lg,
    backgroundColor: colors.backgroundCard,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rate: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundElevated,
  },
  ratePercent: { fontFamily: fonts.headingBlack, fontSize: 15 },
  name: { fontFamily: fonts.label, fontSize: 15, color: colors.textPrimary },
  record: { fontFamily: fonts.bodyRegular, fontSize: 11, color: colors.textMuted, marginTop: 2 },
  pending: { fontFamily: fonts.label, fontSize: 12, color: colors.textMuted },
  footnote: {
    marginTop: spacing.md,
    fontFamily: fonts.bodyRegular,
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 16,
  },
});
