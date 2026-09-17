import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { CoinChip } from '@/components/ui/CoinChip';
import { GridBackground } from '@/components/ui/GridBackground';
import { GlowButton } from '@/components/ui/GlowButton';
import { SectionLabel } from '@/components/ui/SectionLabel';
import {
  KNOCKOUT_SIZES,
  KNOCKOUT_STAKES,
  difficultyForRound,
  opponentById,
  potFor,
  roundKey,
  roundsFor,
} from '@/lib/knockout';
import { AI_PRESETS } from '@/lib/competition';
import { useBeerpongStore } from '@/lib/store';
import { useFeedback } from '@/lib/feedback';
import { useT } from '@/lib/i18n';
import { colors, fonts, glow, radius, spacing } from '@/theme';

/**
 * The arcade tournament: pay to enter, play the bracket, take the pot.
 *
 * Why this is here and not in the party tournament over in the camera tab: a
 * prize has to sit behind something that cannot simply be asserted. That
 * bracket is filled in by tapping a winning team's name, which is exactly right
 * for a room full of people and would let anybody mint coins in half a minute.
 * Every round of this one is a match somebody has to actually play.
 */
export default function KnockoutScreen() {
  const t = useT();
  const feedback = useFeedback();
  const coins = useBeerpongStore((s) => s.coins);
  const run = useBeerpongStore((s) => s.knockout);
  const knockoutStart = useBeerpongStore((s) => s.knockoutStart);
  const knockoutBeginMatch = useBeerpongStore((s) => s.knockoutBeginMatch);
  const knockoutForfeitPending = useBeerpongStore((s) => s.knockoutForfeitPending);
  const knockoutGiveUp = useBeerpongStore((s) => s.knockoutGiveUp);

  const [stake, setStake] = useState<number>(KNOCKOUT_STAKES[0]);
  const [teams, setTeams] = useState<number>(KNOCKOUT_SIZES[0]);
  const [forfeited, setForfeited] = useState(false);

  /**
   * A run whose match was walked out of is settled the moment this screen
   * opens, and the player is told. Doing it here rather than in the match
   * screen is deliberate: the match screen can be closed by the back gesture,
   * by the phone ringing, or by the browser being killed, and none of those
   * run cleanup code.
   */
  useEffect(() => {
    if (knockoutForfeitPending()) setForfeited(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const play = () => {
    feedback.tap();
    knockoutBeginMatch();
    router.push({ pathname: '/(tabs)/arcade/match', params: { mode: 'knockout' } });
  };

  const enter = () => {
    if (!knockoutStart(stake, teams)) return;
    feedback.streak();
    setForfeited(false);
  };

  return (
    <View style={styles.container}>
      <GridBackground />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.title}>{t('knockout.title')}</Text>
          <CoinChip coins={coins} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {forfeited ? (
            <View style={styles.forfeitCard}>
              <Ionicons name="alert-circle" size={18} color={colors.danger} />
              <Text style={styles.forfeitText}>{t('knockout.forfeited')}</Text>
            </View>
          ) : null}

          {run ? (
            <View style={[styles.card, glow('soft', colors.gold)]}>
              <Text style={styles.cardTitle}>{t('knockout.running')}</Text>
              <Text style={styles.cardBody}>
                {t('knockout.next', {
                  round: t(`knockout.round.${roundKey(run.teams, run.round)}`),
                  name: opponentById(run.opponentIds[run.round - 1]).nickname,
                })}
              </Text>
              <Text style={styles.pot}>
                {t('knockout.sizeNote', {
                  rounds: roundsFor(run.teams),
                  pot: potFor(run.stake, run.teams),
                })}
              </Text>

              <Bracket run={run} />

              <GlowButton
                label={t('knockout.play', {
                  round: t(`knockout.round.${roundKey(run.teams, run.round)}`),
                })}
                onPress={play}
                style={styles.action}
              />
              <Text style={styles.smallprint}>{t('knockout.walkout')}</Text>
              {/* A way out that is not "start a match and close the tab". Same
                  outcome either way — the stake was spent on entry — but one of
                  them is a button and the other is a discovery. */}
              <GlowButton
                label={t('knockout.give')}
                variant="ghost"
                size="sm"
                onPress={() => {
                  feedback.tap();
                  knockoutGiveUp();
                }}
              />
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{t('knockout.tagline')}</Text>
              <Text style={styles.cardBody}>{t('knockout.explain')}</Text>

              <SectionLabel>{t('knockout.stake')}</SectionLabel>
              <View style={styles.choiceRow}>
                {KNOCKOUT_STAKES.map((value) => (
                  <Pressable
                    key={value}
                    onPress={() => {
                      feedback.tap();
                      setStake(value);
                    }}
                    style={[styles.choice, stake === value && styles.choiceOn]}
                  >
                    <Text style={[styles.choiceText, stake === value && styles.choiceTextOn]}>
                      {value}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <SectionLabel>{t('knockout.bracket')}</SectionLabel>
              <View style={styles.choiceRow}>
                {KNOCKOUT_SIZES.map((value) => (
                  <Pressable
                    key={value}
                    onPress={() => {
                      feedback.tap();
                      setTeams(value);
                    }}
                    style={[styles.choice, teams === value && styles.choiceOn]}
                  >
                    <Text style={[styles.choiceText, teams === value && styles.choiceTextOn]}>
                      {t('knockout.size', { teams: value })}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.pot}>
                {t('knockout.sizeNote', {
                  rounds: roundsFor(teams),
                  pot: potFor(stake, teams),
                })}
              </Text>

              {/* What each round will be up against, before anything is paid.
                  The field is drawn at entry, so this shows the difficulty
                  ladder rather than names — the names come with the draw. */}
              <View style={styles.ladder}>
                {Array.from({ length: roundsFor(teams) }, (_, index) => {
                  const level = AI_PRESETS[difficultyForRound(teams, index + 1)];
                  return (
                    <View key={index} style={styles.ladderRow}>
                      <Text style={styles.ladderRound}>
                        {t(`knockout.round.${roundKey(teams, index + 1)}`)}
                      </Text>
                      <View style={[styles.ladderPill, { borderColor: level.color }]}>
                        <Text style={[styles.ladderLevel, { color: level.color }]}>
                          {t(level.labelKey)}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>

              <GlowButton
                label={
                  coins >= stake ? t('knockout.enter', { stake }) : t('knockout.tooPoor')
                }
                variant={coins >= stake ? 'filled' : 'ghost'}
                disabled={coins < stake}
                onPress={enter}
                style={styles.action}
              />
              <Text style={styles.smallprint}>{t('knockout.walkout')}</Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

/** The draw, with the rounds already won marked off. */
function Bracket({ run }: { run: ReturnType<typeof useBeerpongStore.getState>['knockout'] }) {
  const t = useT();
  if (!run) return null;
  return (
    <View style={styles.ladder}>
      {run.opponentIds.map((id, index) => {
        const round = index + 1;
        const done = round < run.round;
        const now = round === run.round;
        const opponent = opponentById(id);
        return (
          <View key={id} style={[styles.ladderRow, now && styles.ladderRowNow]}>
            <Ionicons
              name={done ? 'checkmark-circle' : now ? 'ellipse-outline' : 'lock-closed'}
              size={15}
              color={done ? colors.neon : now ? colors.gold : colors.textMuted}
            />
            <Text style={[styles.ladderRound, now && { color: colors.textPrimary }]}>
              {t(`knockout.round.${roundKey(run.teams, round)}`)}
            </Text>
            <View style={[styles.ladderPill, { borderColor: opponent.color }]}>
              <Text style={[styles.ladderLevel, { color: opponent.color }]}>
                {opponent.nickname}
              </Text>
            </View>
          </View>
        );
      })}
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
  title: { fontFamily: fonts.headingBlack, fontSize: 22, color: colors.textPrimary },
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  card: {
    borderWidth: 1.5,
    borderColor: colors.borderFaint,
    borderRadius: radius.lg,
    backgroundColor: colors.backgroundCard,
    padding: spacing.md,
    gap: spacing.xs,
  },
  cardTitle: { fontFamily: fonts.label, fontSize: 15, color: colors.textPrimary },
  cardBody: {
    fontFamily: fonts.bodyRegular,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.xs,
  },
  pot: {
    fontFamily: fonts.label,
    fontSize: 13,
    color: colors.gold,
    marginTop: spacing.xs,
  },
  choiceRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xs },
  choice: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundElevated,
  },
  choiceOn: { borderColor: colors.neon, ...glow('soft') },
  choiceText: { fontFamily: fonts.label, fontSize: 13, color: colors.textMuted },
  choiceTextOn: { color: colors.neon },
  ladder: { gap: spacing.xs, marginVertical: spacing.sm },
  ladderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.backgroundElevated,
  },
  ladderRowNow: { borderWidth: 1, borderColor: colors.gold },
  ladderRound: { flex: 1, fontFamily: fonts.label, fontSize: 12, color: colors.textSecondary },
  ladderPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  ladderLevel: { fontFamily: fonts.label, fontSize: 11 },
  action: { marginTop: spacing.sm },
  smallprint: {
    fontFamily: fonts.bodyRegular,
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 16,
    marginTop: spacing.xs,
  },
  forfeitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  forfeitText: {
    flex: 1,
    fontFamily: fonts.bodyRegular,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },
});
