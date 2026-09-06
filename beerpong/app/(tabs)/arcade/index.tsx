import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { GridBackground } from '@/components/ui/GridBackground';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { GlowButton } from '@/components/ui/GlowButton';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ParticleBurst, type ParticleBurstHandle } from '@/components/ui/ParticleBurst';
import { FlashOverlay, type FlashOverlayHandle } from '@/components/ui/FlashOverlay';
import { CupPyramid } from '@/components/arcade/CupPyramid';
import { ThrowBall } from '@/components/arcade/ThrowBall';
import { OpponentThrow } from '@/components/arcade/OpponentThrow';
import {
  generateOpponentRack,
  generatePlayerRack,
  CAMERA_PAN,
  CUP_COUNT,
  NET_Y,
  OPPONENT_BALL_Y,
  PLAYER_BALL_Y,
  TABLE_HEIGHT,
  VIEWPORT_HEIGHT,
} from '@/lib/arcadeLayout';
import { LEAGUE_OPPONENTS } from '@/lib/opponents';
import { SKINS } from '@/lib/skins';
import { selectCareerProgress, useBeerpongStore } from '@/lib/store';
import { useFeedback } from '@/lib/feedback';
import { colors, fonts, spacing, radius } from '@/theme';

type Turn = 'player' | 'opponent';
type RoundResult = 'win' | 'lose' | null;

export default function ArcadeScreen() {
  const { width } = useWindowDimensions();
  const tableWidth = width - spacing.lg * 2;
  const opponentCups = useMemo(() => generateOpponentRack(tableWidth), [tableWidth]);
  const playerCups = useMemo(() => generatePlayerRack(tableWidth), [tableWidth]);

  const [opponentAlive, setOpponentAlive] = useState<boolean[]>(Array(CUP_COUNT).fill(true));
  const [playerAlive, setPlayerAlive] = useState<boolean[]>(Array(CUP_COUNT).fill(true));
  const [turn, setTurn] = useState<Turn>('player');
  const [roundResult, setRoundResult] = useState<RoundResult>(null);
  const [opponentTurnToken, setOpponentTurnToken] = useState(0);

  const arcade = useBeerpongStore((s) => s.arcade);
  const coins = useBeerpongStore((s) => s.coins);
  const currentOpponentId = useBeerpongStore((s) => s.currentOpponentId);
  const setCurrentOpponentId = useBeerpongStore((s) => s.setCurrentOpponentId);
  const arcadeRecordThrow = useBeerpongStore((s) => s.arcadeRecordThrow);
  const arcadeRecordMatch = useBeerpongStore((s) => s.arcadeRecordMatch);
  const feedback = useFeedback();

  const flashRef = useRef<FlashOverlayHandle>(null);
  const particleRef = useRef<ParticleBurstHandle>(null);
  const turnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const opponent = LEAGUE_OPPONENTS.find((o) => o.id === currentOpponentId) ?? LEAGUE_OPPONENTS[0];
  const ballSkin = SKINS.find((s) => s.id === arcade.equippedBall) ?? SKINS[0];
  const { level, progress } = selectCareerProgress(arcade.careerXP);

  const opponentRemaining = opponentAlive.filter(Boolean).length;
  const playerRemaining = playerAlive.filter(Boolean).length;

  // The table is taller than the window you look through: on your turn the
  // camera sits behind your own rack looking down at the opponent's, on their
  // turn it swings around to your rack.
  const cameraY = useSharedValue(0);
  useEffect(() => {
    cameraY.value = withTiming(turn === 'player' ? 0 : -CAMERA_PAN, {
      duration: 650,
      easing: Easing.inOut(Easing.cubic),
    });
  }, [turn, cameraY]);
  const cameraStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: cameraY.value }],
  }));

  const clearTimers = () => {
    if (turnTimer.current) clearTimeout(turnTimer.current);
    if (endTimer.current) clearTimeout(endTimer.current);
    turnTimer.current = null;
    endTimer.current = null;
  };

  useEffect(() => clearTimers, []);

  const resetRound = () => {
    clearTimers();
    setOpponentAlive(Array(CUP_COUNT).fill(true));
    setPlayerAlive(Array(CUP_COUNT).fill(true));
    setRoundResult(null);
    setTurn('player');
  };

  useEffect(() => {
    resetRound();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOpponentId]);

  const scheduleOpponentTurn = () => {
    clearTimers();
    turnTimer.current = setTimeout(() => {
      setTurn('opponent');
      setOpponentTurnToken((t) => t + 1);
    }, 550);
  };

  const endRound = (outcome: 'win' | 'lose') => {
    clearTimers();
    arcadeRecordMatch(opponent.id, outcome === 'win');
    if (outcome === 'win') feedback.victory();
    // Let the last cup finish falling before the overlay covers the table.
    endTimer.current = setTimeout(() => setRoundResult(outcome), 420);
  };

  const handlePlayerResult = (result: { cupIndex: number | null; hit: boolean }) => {
    arcadeRecordThrow(result.hit);
    if (result.cupIndex == null || !result.hit) {
      feedback.miss();
      scheduleOpponentTurn();
      return;
    }
    const cup = opponentCups[result.cupIndex];
    feedback.cupHit();
    flashRef.current?.flash(ballSkin.accent, 0.18);
    particleRef.current?.burst(cup.x, cup.y);
    const next = opponentAlive.map((alive, i) => (i === result.cupIndex ? false : alive));
    setOpponentAlive(next);
    if (next.every((alive) => !alive)) {
      endRound('win');
    } else {
      scheduleOpponentTurn();
    }
  };

  // Hold on their side of the table for a beat so you can see what happened
  // before the camera swings back to you.
  const returnTurnToPlayer = (delay: number) => {
    clearTimers();
    turnTimer.current = setTimeout(() => setTurn('player'), delay);
  };

  const handleOpponentResult = (result: { cupIndex: number; hit: boolean }) => {
    if (!result.hit) {
      returnTurnToPlayer(700);
      return;
    }
    const cup = playerCups[result.cupIndex];
    feedback.miss();
    flashRef.current?.flash(colors.danger, 0.18);
    particleRef.current?.burst(cup.x, cup.y);
    const next = playerAlive.map((alive, i) => (i === result.cupIndex ? false : alive));
    setPlayerAlive(next);
    if (next.every((alive) => !alive)) {
      endRound('lose');
    } else {
      returnTurnToPlayer(1000);
    }
  };

  // Prefer an opponent you haven't beaten yet, then wrap around the ladder.
  const nextOpponent = () => {
    const idx = LEAGUE_OPPONENTS.findIndex((o) => o.id === opponent.id);
    const ordered = [...LEAGUE_OPPONENTS.slice(idx + 1), ...LEAGUE_OPPONENTS.slice(0, idx)];
    const next =
      ordered.find((o) => !arcade.defeatedOpponentIds.includes(o.id)) ?? ordered[0] ?? opponent;
    resetRound();
    setCurrentOpponentId(next.id);
  };

  const playerTurn = turn === 'player' && roundResult == null;
  const turnStatus =
    roundResult != null
      ? ''
      : playerTurn
        ? 'Dein Wurf — nach oben wischen'
        : `${opponent.nickname} zielt …`;

  return (
    <View style={styles.container}>
      <GridBackground />
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <ScreenHeader
            title="ARCADE"
            subtitle={`vs. ${opponent.nickname} · Lvl ${level}`}
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

          <View style={styles.navRow}>
            <Pressable style={styles.navButton} onPress={() => router.push('/(tabs)/arcade/league')}>
              <Ionicons name="trophy" size={16} color={colors.neon} />
              <Text style={styles.navButtonText}>Liga</Text>
            </Pressable>
            <Pressable style={styles.navButton} onPress={() => router.push('/(tabs)/arcade/skins')}>
              <Ionicons name="color-palette" size={16} color={colors.neon} />
              <Text style={styles.navButtonText}>Skins</Text>
            </Pressable>
          </View>

          <View style={styles.scoreRow}>
            <RackBadge
              label={opponent.nickname}
              count={opponentRemaining}
              color={opponent.color}
              active={playerTurn}
            />
            <Text style={styles.vsText} selectable={false}>
              VS
            </Text>
            <RackBadge
              label="Du"
              count={playerRemaining}
              color={colors.neon}
              active={!playerTurn && roundResult == null}
              align="right"
            />
          </View>

          <View style={[styles.viewport, { width: tableWidth, height: VIEWPORT_HEIGHT }]}>
            <Animated.View
              style={[styles.table, { width: tableWidth, height: TABLE_HEIGHT }, cameraStyle]}
            >
              <LinearGradient
                colors={['#0b0f0a', '#151b12', '#1a2216']}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
              />
              <View style={styles.tableCenterLine} pointerEvents="none" />
              <View style={[styles.tableRail, styles.tableRailLeft]} pointerEvents="none" />
              <View style={[styles.tableRail, styles.tableRailRight]} pointerEvents="none" />

              <CupPyramid cups={opponentCups} aliveFlags={opponentAlive} accent={opponent.color} />
              <CupPyramid cups={playerCups} aliveFlags={playerAlive} accent={colors.neon} />

              <ThrowBall
                startX={tableWidth / 2}
                startY={PLAYER_BALL_Y}
                cups={opponentCups}
                aliveFlags={opponentAlive}
                accent={ballSkin.accent}
                opponentDifficulty={opponent.difficulty}
                onResult={handlePlayerResult}
                disabled={!playerTurn}
                hidden={!playerTurn}
              />
              <OpponentThrow
                startX={tableWidth / 2}
                startY={OPPONENT_BALL_Y}
                cups={playerCups}
                aliveFlags={playerAlive}
                accuracy={opponent.accuracy}
                accent={colors.danger}
                turnToken={opponentTurnToken}
                onResult={handleOpponentResult}
              />

              <ParticleBurst ref={particleRef} />
              <FlashOverlay ref={flashRef} />
            </Animated.View>
          </View>

          <Text
            style={[styles.hint, { color: playerTurn ? colors.neon : colors.danger }]}
            selectable={false}
          >
            {turnStatus}
          </Text>
        </ScrollView>
      </SafeAreaView>

      {roundResult != null ? (
        <View style={styles.resultOverlay}>
          <View
            style={[
              styles.resultCard,
              roundResult === 'lose' && { borderColor: colors.danger },
            ]}
          >
            <Ionicons
              name={roundResult === 'win' ? 'trophy' : 'skull'}
              size={40}
              color={roundResult === 'win' ? colors.gold : colors.danger}
            />
            <Text
              style={[
                styles.resultTitle,
                { color: roundResult === 'win' ? colors.neon : colors.danger },
              ]}
            >
              {roundResult === 'win' ? 'SIEG!' : 'NIEDERLAGE'}
            </Text>
            <Text style={styles.resultBody}>
              {roundResult === 'win'
                ? `${opponent.nickname} besiegt · +75 Coins · +Career XP`
                : `${opponent.nickname} hat dein Rack leergeräumt · +20 Coins`}
            </Text>
            <View style={styles.resultButtons}>
              <GlowButton
                label="Nochmal spielen"
                variant="outline"
                size="sm"
                onPress={resetRound}
                style={styles.resultButton}
              />
              <GlowButton
                label="Nächster Gegner"
                size="sm"
                onPress={nextOpponent}
                style={styles.resultButton}
              />
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function RackBadge({
  label,
  count,
  color,
  active,
  align = 'left',
}: {
  label: string;
  count: number;
  color: string;
  active: boolean;
  align?: 'left' | 'right';
}) {
  return (
    <View style={[styles.rackBadge, align === 'right' && styles.rackBadgeReverse]}>
      <View
        style={[
          styles.rackBadgeDot,
          { backgroundColor: color, opacity: active ? 1 : 0.3 },
        ]}
      />
      <View style={align === 'right' ? { alignItems: 'flex-end' } : undefined}>
        <Text style={styles.rackBadgeLabel} selectable={false} numberOfLines={1}>
          {label}
        </Text>
        <Text style={[styles.rackBadgeCount, { color }]} selectable={false}>
          {count}/{CUP_COUNT}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safe: {
    flex: 1,
  },
  scroll: {
    paddingBottom: spacing.lg,
  },
  progressWrap: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  navRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundElevated,
  },
  navButtonText: {
    fontFamily: fonts.label,
    color: colors.textPrimary,
    fontSize: 13,
    letterSpacing: 1,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  rackBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  rackBadgeReverse: {
    flexDirection: 'row-reverse',
    justifyContent: 'flex-start',
  },
  rackBadgeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  rackBadgeLabel: {
    fontFamily: fonts.label,
    fontSize: 12,
    color: colors.textSecondary,
    letterSpacing: 0.5,
    maxWidth: 110,
  },
  rackBadgeCount: {
    fontFamily: fonts.numeric,
    fontSize: 20,
  },
  vsText: {
    fontFamily: fonts.headingBlack,
    fontSize: 13,
    color: colors.textMuted,
    marginHorizontal: spacing.sm,
  },
  viewport: {
    alignSelf: 'center',
    marginTop: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderFaint,
    backgroundColor: colors.backgroundCard,
    overflow: 'hidden',
  },
  table: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  tableCenterLine: {
    position: 'absolute',
    top: NET_Y,
    left: '6%',
    right: '6%',
    height: 1,
    backgroundColor: colors.neonFaint,
  },
  tableRail: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 6,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  tableRailLeft: {
    left: 0,
  },
  tableRailRight: {
    right: 0,
  },
  hint: {
    textAlign: 'center',
    fontFamily: fonts.label,
    fontSize: 13,
    letterSpacing: 1,
    marginTop: spacing.md,
    minHeight: 18,
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
  resultOverlay: {
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
  resultCard: {
    width: '100%',
    backgroundColor: colors.backgroundElevated,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  resultTitle: {
    fontFamily: fonts.displayBlack,
    fontSize: 30,
    letterSpacing: 2,
  },
  resultBody: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  resultButtons: {
    width: '100%',
    gap: spacing.sm,
  },
  resultButton: {
    width: '100%',
  },
});
