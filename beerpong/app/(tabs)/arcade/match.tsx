import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { GridBackground } from '@/components/ui/GridBackground';
import { GlowButton } from '@/components/ui/GlowButton';
import { Confetti } from '@/components/ui/Confetti';
import { ParticleBurst, type ParticleBurstHandle } from '@/components/ui/ParticleBurst';
import { FlashOverlay, type FlashOverlayHandle } from '@/components/ui/FlashOverlay';
import { CupPyramid } from '@/components/arcade/CupPyramid';
import { ThrowBall } from '@/components/arcade/ThrowBall';
import { OpponentThrow } from '@/components/arcade/OpponentThrow';
import { PromotionOverlay } from '@/components/arcade/PromotionOverlay';
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
import {
  AI_PRESETS,
  WEEKEND_MATCHES,
  generateOnlineOpponent,
  getDivision,
  type AiDifficulty,
  type MatchMode,
} from '@/lib/competition';
import { LEAGUE_OPPONENTS } from '@/lib/opponents';
import { SKINS } from '@/lib/skins';
import { useBeerpongStore } from '@/lib/store';
import { useFeedback } from '@/lib/feedback';
import { colors, fonts, spacing, radius } from '@/theme';

type Turn = 'player' | 'opponent';
type RoundResult = 'win' | 'lose' | null;

interface Celebration {
  kind: 'promotion' | 'relegation';
  title: string;
  subtitle: string;
  badgeLabel: string;
  color: string;
}

export default function MatchScreen() {
  const params = useLocalSearchParams<{ mode?: string; difficulty?: string }>();
  const mode: MatchMode =
    params.mode === 'rivals' || params.mode === 'weekend' ? params.mode : 'offline';

  const { width } = useWindowDimensions();
  const tableWidth = width - spacing.lg * 2;
  const opponentCups = useMemo(() => generateOpponentRack(tableWidth), [tableWidth]);
  const playerCups = useMemo(() => generatePlayerRack(tableWidth), [tableWidth]);

  const [opponentAlive, setOpponentAlive] = useState<boolean[]>(Array(CUP_COUNT).fill(true));
  const [playerAlive, setPlayerAlive] = useState<boolean[]>(Array(CUP_COUNT).fill(true));
  const [turn, setTurn] = useState<Turn>('player');
  const [roundResult, setRoundResult] = useState<RoundResult>(null);
  const [opponentTurnToken, setOpponentTurnToken] = useState(0);
  const [matchSeed, setMatchSeed] = useState(0);
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  const [resultNote, setResultNote] = useState('');
  const [runFinished, setRunFinished] = useState(false);

  const arcade = useBeerpongStore((s) => s.arcade);
  const coins = useBeerpongStore((s) => s.coins);
  const rivals = useBeerpongStore((s) => s.rivals);
  const weekend = useBeerpongStore((s) => s.weekend);
  const storedDifficulty = useBeerpongStore((s) => s.aiDifficulty);
  const arcadeRecordThrow = useBeerpongStore((s) => s.arcadeRecordThrow);
  const arcadeRecordMatch = useBeerpongStore((s) => s.arcadeRecordMatch);
  const recordRivalsMatch = useBeerpongStore((s) => s.recordRivalsMatch);
  const recordWeekendMatch = useBeerpongStore((s) => s.recordWeekendMatch);
  const feedback = useFeedback();

  const flashRef = useRef<FlashOverlayHandle>(null);
  const particleRef = useRef<ParticleBurstHandle>(null);
  const turnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const difficulty: AiDifficulty =
    params.difficulty === 'easy' || params.difficulty === 'medium' || params.difficulty === 'hard'
      ? params.difficulty
      : storedDifficulty;

  // Who you're up against and how the throws are weighted, per mode. For the
  // online modes this stands in for matchmaking until there's a backend.
  const setup = useMemo(() => {
    if (mode === 'offline') {
      const preset = AI_PRESETS[difficulty];
      const pool = LEAGUE_OPPONENTS.filter((o) =>
        difficulty === 'easy'
          ? o.difficulty <= 2
          : difficulty === 'medium'
            ? o.difficulty === 3
            : o.difficulty >= 4
      );
      const character = pool[Math.floor(Math.random() * pool.length)] ?? LEAGUE_OPPONENTS[0];
      return {
        id: character.id,
        name: `${character.nickname} · ${preset.label}`,
        accuracy: preset.opponentAccuracy,
        playerSkill: preset.playerSkill,
        color: preset.color,
        badge: `KI · ${preset.label}`,
      };
    }
    const boost = mode === 'weekend' ? 0.06 : 0;
    const online = generateOnlineOpponent(rivals.division, boost);
    return {
      id: online.name,
      name: online.name,
      accuracy: online.accuracy,
      playerSkill: mode === 'weekend' ? 0.53 : 0.55,
      color: online.color,
      badge: mode === 'weekend' ? 'Weekend League' : getDivision(rivals.division).name,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, difficulty, rivals.division, matchSeed]);

  const ballSkin = SKINS.find((s) => s.id === arcade.equippedBall) ?? SKINS[0];
  const opponentRemaining = opponentAlive.filter(Boolean).length;
  const playerRemaining = playerAlive.filter(Boolean).length;

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
    setCelebration(null);
    setResultNote('');
    setTurn('player');
  };

  const nextMatch = () => {
    setMatchSeed((s) => s + 1);
    resetRound();
  };

  const scheduleOpponentTurn = () => {
    clearTimers();
    turnTimer.current = setTimeout(() => {
      setTurn('opponent');
      setOpponentTurnToken((t) => t + 1);
    }, 550);
  };

  const returnTurnToPlayer = (delay: number) => {
    clearTimers();
    turnTimer.current = setTimeout(() => setTurn('player'), delay);
  };

  const endRound = (outcome: 'win' | 'lose') => {
    clearTimers();
    const won = outcome === 'win';
    if (won) feedback.victory();

    if (mode === 'rivals') {
      const result = recordRivalsMatch(won);
      const division = getDivision(result.division);
      setResultNote(
        result.promoted || result.relegated
          ? division.name
          : `${result.divisionWins}/${result.winsToPromote} Siege bis zum Aufstieg · +${result.coins} Coins`
      );
      if (result.promoted || result.relegated) {
        setCelebration({
          kind: result.promoted ? 'promotion' : 'relegation',
          title: result.promoted ? 'AUFSTIEG!' : 'ABSTIEG',
          subtitle: result.promoted
            ? `Willkommen in ${division.name} · +${result.coins} Coins`
            : `Zurück in ${division.name} — hol sie dir wieder.`,
          badgeLabel: `${result.division}`,
          color: division.color,
        });
      }
    } else if (mode === 'weekend') {
      const result = recordWeekendMatch(won);
      setRunFinished(result.finished);
      setResultNote(
        result.finished
          ? `Lauf beendet: ${result.wins}/${WEEKEND_MATCHES} Siege`
          : `Spiel ${result.played}/${WEEKEND_MATCHES} · ${result.wins} Siege · +${result.coins} Coins`
      );
      if (result.finished) {
        setCelebration({
          kind: 'promotion',
          title: 'WEEKEND LEAGUE',
          subtitle: `${result.wins}/${WEEKEND_MATCHES} Siege · Stufe ${result.tierName} · +${result.coins} Coins`,
          badgeLabel: `${result.wins}`,
          color: colors.gold,
        });
      }
    } else {
      arcadeRecordMatch(setup.id, won);
      setResultNote(won ? '+75 Coins · +Career XP' : '+20 Coins');
    }

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

  const playerTurn = turn === 'player' && roundResult == null;
  const turnStatus =
    roundResult != null ? '' : playerTurn ? 'Dein Wurf — nach oben wischen' : `${setup.name} zielt …`;

  const showResultCard = roundResult != null && celebration == null;

  return (
    <View style={styles.container}>
      <GridBackground />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerBadge} selectable={false} numberOfLines={1}>
              {setup.badge}
            </Text>
            {mode === 'weekend' ? (
              <Text style={styles.headerSub} selectable={false}>
                Spiel {Math.min(weekend.played + 1, WEEKEND_MATCHES)}/{WEEKEND_MATCHES} · {weekend.wins} Siege
              </Text>
            ) : null}
          </View>
          <View style={styles.coinChip}>
            <Ionicons name="logo-bitcoin" size={13} color={colors.gold} />
            <Text style={styles.coinText} selectable={false}>
              {coins}
            </Text>
          </View>
        </View>

        <View style={styles.scoreRow}>
          <RackBadge label={setup.name} count={opponentRemaining} color={setup.color} active={playerTurn} />
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

            <CupPyramid cups={opponentCups} aliveFlags={opponentAlive} accent={setup.color} />
            <CupPyramid cups={playerCups} aliveFlags={playerAlive} accent={colors.neon} />

            <ThrowBall
              startX={tableWidth / 2}
              startY={PLAYER_BALL_Y}
              cups={opponentCups}
              aliveFlags={opponentAlive}
              accent={ballSkin.accent}
              skill={setup.playerSkill}
              onResult={handlePlayerResult}
              disabled={!playerTurn}
              hidden={!playerTurn}
            />
            <OpponentThrow
              startX={tableWidth / 2}
              startY={OPPONENT_BALL_Y}
              cups={playerCups}
              aliveFlags={playerAlive}
              accuracy={setup.accuracy}
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
      </SafeAreaView>

      {showResultCard ? (
        <View style={styles.resultOverlay}>
          {roundResult === 'win' ? <Confetti /> : null}
          <View
            style={[styles.resultCard, roundResult === 'lose' && { borderColor: colors.danger }]}
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
            <Text style={styles.resultBody}>{resultNote}</Text>
            <View style={styles.resultButtons}>
              {mode === 'weekend' && runFinished ? null : (
                <GlowButton
                  label="Nächstes Spiel"
                  size="sm"
                  onPress={nextMatch}
                  style={styles.resultButton}
                />
              )}
              <GlowButton
                label="Zurück"
                variant="outline"
                size="sm"
                onPress={() => router.back()}
                style={styles.resultButton}
              />
            </View>
          </View>
        </View>
      ) : null}

      {celebration ? (
        <PromotionOverlay
          kind={celebration.kind}
          title={celebration.title}
          subtitle={celebration.subtitle}
          badgeLabel={celebration.badgeLabel}
          color={celebration.color}
          onDismiss={() => setCelebration(null)}
        />
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
      <View style={[styles.rackBadgeDot, { backgroundColor: color, opacity: active ? 1 : 0.3 }]} />
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
  container: { flex: 1, backgroundColor: colors.background },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerBadge: {
    fontFamily: fonts.label,
    fontSize: 13,
    color: colors.textPrimary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  headerSub: {
    fontFamily: fonts.bodyRegular,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  coinChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundElevated,
  },
  coinText: {
    fontFamily: fonts.numeric,
    color: colors.gold,
    fontSize: 12,
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
  rackBadgeDot: { width: 10, height: 10, borderRadius: 5 },
  rackBadgeLabel: {
    fontFamily: fonts.label,
    fontSize: 12,
    color: colors.textSecondary,
    letterSpacing: 0.5,
    maxWidth: 120,
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
  tableRailLeft: { left: 0 },
  tableRailRight: { right: 0 },
  hint: {
    textAlign: 'center',
    fontFamily: fonts.label,
    fontSize: 13,
    letterSpacing: 1,
    marginTop: spacing.md,
    minHeight: 18,
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
