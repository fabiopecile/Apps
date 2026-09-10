import { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { GridBackground } from '@/components/ui/GridBackground';
import { GlowButton } from '@/components/ui/GlowButton';
import { Confetti } from '@/components/ui/Confetti';
import { CountUp } from '@/components/ui/CountUp';
import { ParticleBurst, type ParticleBurstHandle } from '@/components/ui/ParticleBurst';
import { FlashOverlay, type FlashOverlayHandle } from '@/components/ui/FlashOverlay';
import { Table3D } from '@/components/arcade/Table3D';
import { ThrowBall } from '@/components/arcade/ThrowBall';
import { useBallFlight } from '@/components/arcade/useBallFlight';
import {
  CUP_COUNT,
  PLAYER_BALL_Y,
  TABLE_WIDTH_REFERENCE,
  generateOpponentRack,
} from '@/lib/arcadeLayout';
import {
  canPlayLucky,
  dayKeyOf,
  goldenCupFor,
  goldenPrizeFor,
  hoursUntilNextShot,
  streakAfter,
  type LuckyOutcome,
} from '@/lib/luckyShot';
import { SKINS } from '@/lib/skins';
import { useBeerpongStore } from '@/lib/store';
import { useFeedback } from '@/lib/feedback';
import { useT } from '@/lib/i18n';
import { colors, fonts, glow, radius, spacing } from '@/theme';

/**
 * One throw a day at a golden cup.
 *
 * Deliberately not a game mode: there is no opponent, no rack of your own and
 * nothing to lose. You get one ball, the gold cup is wherever the date says it
 * is, and then it is over for the day either way — which is the only reason it
 * is worth opening tomorrow.
 */
export default function LuckyShotScreen() {
  const { width, height } = useWindowDimensions();
  const t = useT();
  const feedback = useFeedback();

  const lucky = useBeerpongStore((s) => s.lucky);
  const playLuckyShot = useBeerpongStore((s) => s.playLuckyShot);
  const arcade = useBeerpongStore((s) => s.arcade);
  const coins = useBeerpongStore((s) => s.coins);

  const now = new Date();
  const available = canPlayLucky(lucky, now);
  const goldenIndex = useMemo(() => goldenCupFor(dayKeyOf(now), CUP_COUNT), [now.getDate()]);
  const streakIfPlayed = streakAfter(lucky, now);
  const prize = goldenPrizeFor(streakIfPlayed);

  const tableWidth = TABLE_WIDTH_REFERENCE;
  // Taller than the match stage because there is less around it — the camera's
  // field of view is fixed, so a taller canvas simply puts more pixels on the
  // table instead of leaving dead space under it.
  const stageHeight = Math.max(320, height - 210);
  const stageWidth = width - spacing.lg * 2;
  const cups = useMemo(() => generateOpponentRack(tableWidth), [tableWidth]);
  const [alive, setAlive] = useState<boolean[]>(() => Array(CUP_COUNT).fill(true));
  const flight = useBallFlight(tableWidth / 2, PLAYER_BALL_Y);
  const ballSkin = SKINS.find((s) => s.id === arcade.equippedBall) ?? SKINS[0];

  const [result, setResult] = useState<{ outcome: LuckyOutcome; coins: number } | null>(null);
  const [thrown, setThrown] = useState(false);
  const flashRef = useRef<FlashOverlayHandle>(null);
  const particleRef = useRef<ParticleBurstHandle>(null);

  const onResult = (shot: { cupIndex: number | null; hit: boolean }) => {
    // The day is spent on the throw, hit or miss — see lib/luckyShot.ts.
    if (thrown) return;
    setThrown(true);
    const outcome: LuckyOutcome =
      shot.hit && shot.cupIndex === goldenIndex ? 'golden' : shot.hit ? 'cup' : 'miss';
    if (shot.hit && shot.cupIndex != null) {
      setAlive((flags) => flags.map((value, i) => (i === shot.cupIndex ? false : value)));
    }
    const paid = playLuckyShot(outcome);
    if (outcome === 'golden') {
      feedback.victory();
      flashRef.current?.flash(colors.gold, 0.5);
      particleRef.current?.burst(stageWidth / 2, stageHeight * 0.45);
    } else if (outcome === 'cup') {
      feedback.cupHit();
      flashRef.current?.flash(ballSkin.accent, 0.2);
    } else {
      feedback.miss();
    }
    setResult({ outcome, coins: paid.coins });
  };

  const wait = hoursUntilNextShot(now);

  return (
    <View style={styles.container}>
      <GridBackground />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.title} selectable={false}>
            {t('lucky.title')}
          </Text>
          <View style={styles.coinChip}>
            <Ionicons name="logo-bitcoin" size={13} color={colors.gold} />
            <CountUp value={coins} style={styles.coinText} />
          </View>
        </View>

        {available && !thrown ? (
          <View style={styles.prizeRow}>
            <Text style={styles.prizeText} selectable={false}>
              {t('lucky.prize', { coins: prize })}
            </Text>
            {streakIfPlayed > 1 ? (
              <Text style={styles.streakText} selectable={false}>
                {t('lucky.streak', { days: streakIfPlayed })}
              </Text>
            ) : null}
          </View>
        ) : null}

        <View style={{ width: stageWidth, height: stageHeight, alignSelf: 'center' }}>
          <Table3D
            width={tableWidth}
            racks={[
              {
                cups,
                aliveFlags: alive,
                colour: colors.neon,
                highlight: { index: goldenIndex, colour: colors.gold },
              },
            ]}
            balls={[flight]}
            ballColours={[ballSkin.accent]}
            watching="far"
          />

          {available && !thrown ? (
            <ThrowBall
              flight={flight}
              startX={tableWidth / 2}
              startY={PLAYER_BALL_Y}
              cups={cups}
              aliveFlags={alive}
              accent={ballSkin.accent}
              // A shade steadier than a league match: it is one ball a day, and
              // being beaten by the spread rather than by the aim would be sour.
              skill={0.62}
              onResult={onResult}
            />
          ) : null}

          <ParticleBurst ref={particleRef} />
          <FlashOverlay ref={flashRef} />
        </View>

        <Text style={styles.hint} selectable={false}>
          {available && !thrown ? t('lucky.hint') : ''}
        </Text>
      </SafeAreaView>

      {!available && !thrown ? (
        <View style={styles.overlay}>
          <View style={styles.card}>
            <Ionicons name="time" size={34} color={colors.textSecondary} />
            <Text style={styles.cardTitle} selectable={false}>
              {t('lucky.doneTitle')}
            </Text>
            <Text style={styles.cardBody} selectable={false}>
              {t('lucky.doneBody', { hours: wait.hours, minutes: wait.minutes })}
            </Text>
            {lucky.lastOutcome ? (
              <Text style={styles.cardBody} selectable={false}>
                {lucky.lastOutcome === 'golden'
                  ? t('lucky.lastGolden', { coins: lucky.lastPrize })
                  : lucky.lastOutcome === 'cup'
                    ? t('lucky.lastCup', { coins: lucky.lastPrize })
                    : t('lucky.lastMiss')}
              </Text>
            ) : null}
            {lucky.streak > 1 ? (
              <Text style={styles.streakText} selectable={false}>
                {t('lucky.streak', { days: lucky.streak })}
              </Text>
            ) : null}
            <GlowButton label={t('common.back')} size="sm" onPress={() => router.back()} />
          </View>
        </View>
      ) : null}

      {result ? (
        <View style={styles.overlay}>
          {result.outcome === 'golden' ? <Confetti /> : null}
          <View
            style={[
              styles.card,
              result.outcome === 'golden' && { borderColor: colors.gold, ...glow('soft', colors.gold) },
            ]}
          >
            <Ionicons
              name={result.outcome === 'golden' ? 'trophy' : result.outcome === 'cup' ? 'beer' : 'close-circle'}
              size={40}
              color={result.outcome === 'miss' ? colors.textSecondary : colors.gold}
            />
            <Text style={styles.cardTitle} selectable={false}>
              {result.outcome === 'golden'
                ? t('lucky.wonTitle')
                : result.outcome === 'cup'
                  ? t('lucky.cupTitle')
                  : t('lucky.missTitle')}
            </Text>
            {result.coins > 0 ? (
              <Text style={styles.reward} selectable={false}>
                +{result.coins}
              </Text>
            ) : null}
            <Text style={styles.cardBody} selectable={false}>
              {t('lucky.comeBack', { hours: wait.hours })}
            </Text>
            <GlowButton label={t('common.close')} size="sm" onPress={() => router.back()} />
          </View>
        </View>
      ) : null}
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
  },
  title: {
    fontFamily: fonts.headingBlack,
    fontSize: 19,
    color: colors.gold,
  },
  coinChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.gold,
  },
  coinText: {
    fontFamily: fonts.numeric,
    fontSize: 13,
    color: colors.gold,
  },
  prizeRow: {
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: 2,
  },
  prizeText: {
    fontFamily: fonts.label,
    fontSize: 14,
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  streakText: {
    fontFamily: fonts.label,
    fontSize: 12,
    color: colors.gold,
    letterSpacing: 1,
  },
  hint: {
    textAlign: 'center',
    fontFamily: fonts.label,
    fontSize: 12,
    color: colors.textSecondary,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
    minHeight: 34,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundElevated,
  },
  cardTitle: {
    fontFamily: fonts.headingBlack,
    fontSize: 22,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  cardBody: {
    fontFamily: fonts.bodyRegular,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
  },
  reward: {
    fontFamily: fonts.numeric,
    fontSize: 40,
    color: colors.gold,
  },
});
