import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { GridBackground } from '@/components/ui/GridBackground';
import { GlowButton } from '@/components/ui/GlowButton';
import { Confetti } from '@/components/ui/Confetti';
import { ParticleBurst, type ParticleBurstHandle } from '@/components/ui/ParticleBurst';
import { FlashOverlay, type FlashOverlayHandle } from '@/components/ui/FlashOverlay';
import { Table3D } from '@/components/arcade/Table3D';
import { ThrowBall } from '@/components/arcade/ThrowBall';
import { OpponentThrow } from '@/components/arcade/OpponentThrow';
import { PromotionOverlay } from '@/components/arcade/PromotionOverlay';
import { ShareResultButton } from '@/components/ui/ShareableResult';
import {
  generateOpponentRack,
  generatePlayerRack,
  reRackFlags,
  CUP_COUNT,
  OPPONENT_BALL_Y,
  PLAYER_BALL_Y,
  TABLE_WIDTH_REFERENCE,
} from '@/lib/arcadeLayout';
import { cupMouth } from '@/lib/throwPhysics';
import {
  BALLS_PER_TURN,
  afterThrow,
  keepsThrowing,
  startTurn,
  type TurnState,
} from '@/lib/turnRules';
import { useBallFlight } from '@/components/arcade/useBallFlight';
import {
  AI_PRESETS,
  WEEKEND_MATCHES,
  generateOnlineOpponent,
  getDivision,
  type AiDifficulty,
  type MatchMode,
} from '@/lib/competition';
import { LEAGUE_OPPONENTS } from '@/lib/opponents';

/**
 * Screen points per table point at the ball's resting depth.
 *
 * The camera is a perspective one, so this is only exactly right where the ball
 * sits — which is where the drag starts and where it matters. Measured against
 * the running app rather than derived from the projection: dragging a known
 * number of screen points and reading back where the ball ended up.
 */
const SCREEN_POINTS_PER_TABLE_POINT = 1;
import { SKINS } from '@/lib/skins';
import { useBeerpongStore } from '@/lib/store';
import { useFeedback } from '@/lib/feedback';
import { divisionName, translate, useLanguage, useT, type TranslationKey as MatchKey } from '@/lib/i18n';
import { colors, fonts, spacing, radius } from '@/theme';

/**
 * Turns a miss into something the player can act on.
 *
 * The swipe now decides everything, and the two ways to miss want opposite
 * corrections: short means swipe faster, long means ease off. "Daneben" alone
 * would leave that to guesswork.
 */
function missAdvice(
  result: { rimOut?: boolean; overshoot?: number; sideways?: number },
  t: (key: MatchKey, vars?: Record<string, string | number>) => string
): string {
  const overshoot = result.overshoot ?? 0;
  const sideways = Math.abs(result.sideways ?? 0);
  if (result.rimOut) return t('match.missRim');
  // Sideways error dominating means the swipe pointed wrong, not that it was
  // mistimed — saying "too short" there would send them the wrong way.
  if (sideways > Math.abs(overshoot) + 12) return t('match.missWide');
  if (overshoot > 14) return t('match.missLong');
  if (overshoot < -14) return t('match.missShort');
  return t('match.missClose');
}

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
    params.mode === 'rivals' || params.mode === 'weekend' || params.mode === 'passplay'
      ? params.mode
      : 'offline';
  const isPassPlay = mode === 'passplay';

  const { width, height } = useWindowDimensions();
  // Arcade is a portrait game: the table's landmarks — net, ball, both racks —
  // sit at fixed distances down a tall board, and swiping up at a rack only
  // reads right that way round. Sideways the game asks to be turned back
  // (see `landscape` below) rather than rearranging itself.
  const landscape = width > height;

  /**
   * The table is a fixed size in table points and the camera fits it to the
   * screen, so there is nothing to shrink or crop here any more. The stage is
   * simply as tall as the screen can spare.
   */
  const tableWidth = TABLE_WIDTH_REFERENCE;
  const stageHeight = Math.max(300, height - 300);
  const stageWidth = width - spacing.lg * 2;
  const opponentCups = useMemo(() => generateOpponentRack(tableWidth), [tableWidth]);
  const playerCups = useMemo(() => generatePlayerRack(tableWidth), [tableWidth]);

  const [opponentAlive, setOpponentAlive] = useState<boolean[]>(Array(CUP_COUNT).fill(true));
  const [playerAlive, setPlayerAlive] = useState<boolean[]>(Array(CUP_COUNT).fill(true));
  /** Both balls live here: the throw components steer them, the scene draws them. */
  const playerFlight = useBallFlight(tableWidth / 2, PLAYER_BALL_Y);
  const opponentFlight = useBallFlight(tableWidth / 2, OPPONENT_BALL_Y);
  const [turn, setTurn] = useState<Turn>('player');
  /**
   * Two balls a turn, kept per side. The game used to hand over after every
   * single throw, which meant nobody could ever go on a run.
   */
  const [playerTurnState, setPlayerTurnState] = useState<TurnState>(() => startTurn());
  const [opponentTurnState, setOpponentTurnState] = useState<TurnState>(() => startTurn());
  /** The one thing on screen worth shouting about, briefly. */
  const [turnNote, setTurnNote] = useState<'ballsBack' | 'redemption' | null>(null);
  const [roundResult, setRoundResult] = useState<RoundResult>(null);
  const [opponentTurnToken, setOpponentTurnToken] = useState(0);
  const [matchSeed, setMatchSeed] = useState(0);
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  const [resultNote, setResultNote] = useState('');
  const [runFinished, setRunFinished] = useState(false);
  // Pass & Play: the phone changes hands, so a prompt gates each turn.
  const [handOver, setHandOver] = useState(false);
  const [bounceArmed, setBounceArmed] = useState(false);
  /**
   * What went wrong with the last throw. With the swipe deciding everything,
   * "missed" on its own is no help — short and long need opposite corrections.
   */
  const [missNote, setMissNote] = useState<string | null>(null);
  const [reRacksLeft, setReRacksLeft] = useState<[number, number]>([1, 1]);

  const arcade = useBeerpongStore((s) => s.arcade);
  const coins = useBeerpongStore((s) => s.coins);
  const rivals = useBeerpongStore((s) => s.rivals);
  const trackerTeams = useBeerpongStore((s) => s.tracker.teams);
  const weekend = useBeerpongStore((s) => s.weekend);
  const storedDifficulty = useBeerpongStore((s) => s.aiDifficulty);
  const arcadeRecordThrow = useBeerpongStore((s) => s.arcadeRecordThrow);
  const arcadeRecordMatch = useBeerpongStore((s) => s.arcadeRecordMatch);
  const recordRivalsMatch = useBeerpongStore((s) => s.recordRivalsMatch);
  const recordWeekendMatch = useBeerpongStore((s) => s.recordWeekendMatch);
  const trackDaily = useBeerpongStore((s) => s.trackDaily);
  const feedback = useFeedback();
  const t = useT();
  const language = useLanguage();

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
        name: `${character.nickname} · ${translate(language, preset.labelKey)}`,
        accuracy: preset.opponentAccuracy,
        playerSkill: preset.playerSkill,
        color: preset.color,
        badge: translate(language, 'match.badge.ai', {
          difficulty: translate(language, preset.labelKey),
        }),
      };
    }
    if (isPassPlay) {
      return {
        id: 'passplay',
        name: trackerTeams[1].name,
        accuracy: 0,
        playerSkill: 0.58,
        color: colors.gold,
        badge: 'Pass & Play',
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
      badge:
        mode === 'weekend'
          ? translate(language, 'weekend.title')
          : divisionName(language, getDivision(rivals.division)),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, difficulty, rivals.division, matchSeed, isPassPlay, language]);

  const ballSkin = SKINS.find((s) => s.id === arcade.equippedBall) ?? SKINS[0];
  const opponentRemaining = opponentAlive.filter(Boolean).length;
  const playerRemaining = playerAlive.filter(Boolean).length;

  // The hint breathes while you are on the clock, and sits still otherwise —
  // it is the only thing on screen telling you the game is waiting for you.
  const hintPulse = useSharedValue(0);
  const hintStyle = useAnimatedStyle(() => ({
    opacity: 0.72 + hintPulse.value * 0.28,
    transform: [{ scale: 0.99 + hintPulse.value * 0.02 }],
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
    setHandOver(false);
    setBounceArmed(false);
    setReRacksLeft([1, 1]);
    setPlayerTurnState(startTurn());
    setOpponentTurnState(startTurn());
    setTurnNote(null);
  };

  const nextMatch = () => {
    setMatchSeed((s) => s + 1);
    resetRound();
  };

  const scheduleOpponentTurn = () => {
    clearTimers();
    if (isPassPlay) {
      turnTimer.current = setTimeout(() => setHandOver(true), 280);
      return;
    }
    turnTimer.current = setTimeout(() => {
      setTurn('opponent');
      setOpponentTurnToken((t) => t + 1);
    }, 180);
  };

  const returnTurnToPlayer = (delay: number) => {
    clearTimers();
    if (isPassPlay) {
      turnTimer.current = setTimeout(() => setHandOver(true), delay);
      return;
    }
    turnTimer.current = setTimeout(() => setTurn('player'), delay);
  };

  /** Pass & Play: the next player has taken the phone. */
  const confirmHandOver = () => {
    setHandOver(false);
    setBounceArmed(false);
    setTurn((current) => (current === 'player' ? 'opponent' : 'player'));
  };

  const doReRack = (side: 0 | 1) => {
    if (reRacksLeft[side] <= 0) return;
    feedback.tap();
    setReRacksLeft((prev) => {
      const next: [number, number] = [prev[0], prev[1]];
      next[side] -= 1;
      return next;
    });
    if (side === 0) setOpponentAlive((prev) => reRackFlags(prev));
    else setPlayerAlive((prev) => reRackFlags(prev));
  };

  const endRound = (outcome: 'win' | 'lose') => {
    clearTimers();
    const won = outcome === 'win';
    if (won) {
      feedback.victory();
      trackDaily('wins');
    } else {
      feedback.defeat();
    }

    if (isPassPlay) {
      setResultNote(
        t('match.passplayClears', {
          team: won ? trackerTeams[0].name : trackerTeams[1].name,
        })
      );
      endTimer.current = setTimeout(() => setRoundResult(outcome), 200);
      return;
    }

    if (mode === 'rivals') {
      const result = recordRivalsMatch(won);
      const division = getDivision(result.division);
      const name = divisionName(language, division);
      setResultNote(
        result.promoted || result.relegated
          ? name
          : t('match.rivalsNote', {
              wins: result.divisionWins,
              target: result.winsToPromote,
              coins: result.coins,
            })
      );
      if (result.promoted || result.relegated) {
        setCelebration({
          kind: result.promoted ? 'promotion' : 'relegation',
          title: result.promoted ? t('match.promoted') : t('match.relegated'),
          subtitle: result.promoted
            ? t('match.promotedSub', { division: name, coins: result.coins })
            : t('match.relegatedSub', { division: name }),
          badgeLabel: `${result.division}`,
          color: division.color,
        });
      }
    } else if (mode === 'weekend') {
      const result = recordWeekendMatch(won);
      setRunFinished(result.finished);
      setResultNote(
        result.finished
          ? t('match.weekendDone', { wins: result.wins, matches: WEEKEND_MATCHES })
          : t('match.weekendNote', {
              played: result.played,
              matches: WEEKEND_MATCHES,
              wins: result.wins,
              coins: result.coins,
            })
      );
      if (result.finished) {
        setCelebration({
          kind: 'promotion',
          title: t('weekend.title'),
          subtitle: t('match.weekendCelebration', {
            wins: result.wins,
            matches: WEEKEND_MATCHES,
            tier: result.tierKey ? t(result.tierKey) : '—',
            coins: result.coins,
          }),
          badgeLabel: `${result.wins}`,
          color: colors.gold,
        });
      }
    } else {
      arcadeRecordMatch(setup.id, won);
      setResultNote(won ? t('match.offlineWin') : t('match.offlineLose'));
    }

    // Let the last cup finish falling before the overlay covers the table.
    endTimer.current = setTimeout(() => setRoundResult(outcome), 200);
  };

  /** Sinking a bounce shot takes a second cup along with the target. */
  /**
   * Takes the cup that was hit, plus — on a bounce shot — the cup next to it.
   *
   * A bounce counts two at a real table, and this used to pick the second one
   * at random: a cup on the far side of the rack would simply vanish with the
   * ball nowhere near it, which reads as a glitch rather than a rule. The
   * nearest one still standing at least looks like the ball carried on into it.
   */
  const removeCups = (
    alive: boolean[],
    primaryIndex: number,
    extra: boolean,
    rack: typeof opponentCups
  ): boolean[] => {
    const next = alive.map((value, i) => (i === primaryIndex ? false : value));
    if (!extra) return next;
    const from = rack[primaryIndex];
    let nearest = -1;
    let nearestDistance = Infinity;
    rack.forEach((cup) => {
      if (!next[cup.index] || !from) return;
      const distance = Math.hypot(cup.x - from.x, cup.y - from.y);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = cup.index;
      }
    });
    if (nearest >= 0) next[nearest] = false;
    return next;
  };

  /**
   * The side that just lost its last cup shoots to survive: throw until you
   * miss, and clear everything they have left to pull it back.
   */
  /**
   * Sparks over the middle of the table.
   *
   * They used to be thrown at the cup's own coordinates, which stopped meaning
   * anything the moment the table became a 3D scene — the burst is a flat
   * overlay and the cup is somewhere in a perspective projection. Over the
   * table is honest and reads the same.
   */
  const burst = () => particleRef.current?.burst(stageWidth / 2, stageHeight * 0.45);

  /**
   * Back out of a match, always to the Arcade hub.
   *
   * A plain `back()` returns to whichever menu opened the match — the offline
   * list, the rivals ladder, the weekend league — which is almost never where
   * you want to be once a game is over. `dismissTo` unwinds the stack to the
   * hub in one step instead, so the menus in between do not flash past and
   * pressing back again does not walk into them.
   */
  const leaveMatch = () => {
    clearTimers();
    if (router.canDismiss()) {
      router.dismissTo('/(tabs)/arcade');
      return;
    }
    // Opened straight into a match, so there is no hub to unwind to yet.
    router.replace('/(tabs)/arcade');
  };

  const startRedemption = (side: Turn) => {
    setTurnNote('redemption');
    feedback.streak();
    if (side === 'player') {
      setPlayerTurnState(startTurn(true));
      returnTurnToPlayer(760);
    } else {
      setOpponentTurnState(startTurn(true));
      clearTimers();
      turnTimer.current = setTimeout(() => {
        setTurn('opponent');
        setOpponentTurnToken((token) => token + 1);
      }, 760);
    }
  };

  /**
   * Their turn continues: another ball, without handing the phone over. In
   * Pass & Play there is no AI to prod — the phone simply stays where it is.
   */
  const opponentThrowsAgain = (delay: number) => {
    if (isPassPlay) return;
    clearTimers();
    turnTimer.current = setTimeout(() => setOpponentTurnToken((token) => token + 1), delay);
  };

  const handlePlayerResult = (result: {
    cupIndex: number | null;
    hit: boolean;
    bounce: boolean;
    rimOut?: boolean;
    overshoot?: number;
    sideways?: number;
  }) => {
    arcadeRecordThrow(result.hit);
    trackDaily('throws');
    if (result.hit) {
      trackDaily('cupsHit');
      if (result.bounce) trackDaily('bounceHits');
    }
    if (result.cupIndex == null || !result.hit) {
      // A rim-out already clacked when the ball caught the lip.
      if (!result.rimOut) feedback.miss();
      setMissNote(missAdvice(result, t));
      resolvePlayerTurn(false, opponentAlive.filter(Boolean).length);
      return;
    }
    setMissNote(null);
    feedback.cupHit();
    if (result.bounce) feedback.streak();
    flashRef.current?.flash(ballSkin.accent, 0.18);
    burst();
    const next = removeCups(opponentAlive, result.cupIndex, result.bounce, opponentCups);
    setOpponentAlive(next);
    setBounceArmed(false);
    resolvePlayerTurn(true, next.filter((alive) => alive).length);
  };

  /** What your throw means for whose turn it is. */
  const resolvePlayerTurn = (hit: boolean, theirCupsLeft: number) => {
    // Clearing their rack does not end it — they get their redemption first.
    if (!playerTurnState.redemption && theirCupsLeft === 0) {
      startRedemption('opponent');
      return;
    }
    const { next, outcome } = afterThrow(playerTurnState, hit, theirCupsLeft);
    setPlayerTurnState(next);
    if (outcome === 'redeemed') return endRound('win');
    if (outcome === 'eliminated') return endRound('lose');
    if (outcome === 'ballsBack') {
      setTurnNote('ballsBack');
      feedback.streak();
    }
    if (keepsThrowing(outcome)) {
      if (isPassPlay) return;
      returnTurnToPlayer(outcome === 'ballsBack' ? 620 : 260);
      return;
    }
    setTurnNote(null);
    setPlayerTurnState(startTurn());
    scheduleOpponentTurn();
  };

  /** Pass & Play only: player two throws down at your rack. */
  const handleSecondPlayerResult = (result: {
    cupIndex: number | null;
    hit: boolean;
    bounce: boolean;
    rimOut?: boolean;
  }) => {
    arcadeRecordThrow(result.hit);
    if (result.cupIndex == null || !result.hit) {
      if (!result.rimOut) feedback.miss();
      resolveOpponentTurn(false, playerAlive.filter(Boolean).length);
      return;
    }
    feedback.cupHit();
    flashRef.current?.flash(colors.gold, 0.18);
    burst();
    const next = removeCups(playerAlive, result.cupIndex, result.bounce, playerCups);
    setPlayerAlive(next);
    setBounceArmed(false);
    resolveOpponentTurn(true, next.filter((alive) => alive).length);
  };

  const handleOpponentResult = (result: { cupIndex: number; hit: boolean }) => {
    if (!result.hit) {
      feedback.miss();
      resolveOpponentTurn(false, playerAlive.filter(Boolean).length);
      return;
    }
    // Their ball goes in: the cup sound, but the warning colour and haptic.
    feedback.cupHit();
    flashRef.current?.flash(colors.danger, 0.18);
    burst();
    const next = playerAlive.map((alive, i) => (i === result.cupIndex ? false : alive));
    setPlayerAlive(next);
    resolveOpponentTurn(true, next.filter((alive) => alive).length);
  };

  /** The same rules on their side of the table. */
  const resolveOpponentTurn = (hit: boolean, yourCupsLeft: number) => {
    if (!opponentTurnState.redemption && yourCupsLeft === 0) {
      startRedemption('player');
      return;
    }
    const { next, outcome } = afterThrow(opponentTurnState, hit, yourCupsLeft);
    setOpponentTurnState(next);
    if (outcome === 'redeemed') return endRound('lose');
    if (outcome === 'eliminated') return endRound('win');
    if (outcome === 'ballsBack') setTurnNote('ballsBack');
    if (keepsThrowing(outcome)) {
      opponentThrowsAgain(outcome === 'ballsBack' ? 620 : 300);
      return;
    }
    setTurnNote(null);
    setOpponentTurnState(startTurn());
    returnTurnToPlayer(300);
  };

  const playerTurn = turn === 'player' && roundResult == null;

  useEffect(() => {
    if (playerTurn && !handOver) {
      hintPulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 780, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 780, easing: Easing.inOut(Easing.ease) })
        ),
        -1
      );
    } else {
      hintPulse.value = withTiming(0, { duration: 220 });
    }
  }, [playerTurn, handOver, hintPulse]);
  const turnStatus =
    roundResult != null
      ? ''
      : playerTurn
        ? playerTurnState.redemption
          ? t('match.redemptionHint')
          : t('match.yourTurnBall', {
              ball: BALLS_PER_TURN - playerTurnState.ballsLeft + 1,
              of: BALLS_PER_TURN,
            })
        : t('match.opponentAiming', { name: setup.name });

  /** Whichever side is holding the balls right now. */
  const activeTurnState = playerTurn ? playerTurnState : opponentTurnState;
  const showResultCard = roundResult != null && celebration == null;

  return (
    <View style={styles.container}>
      <GridBackground />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable onPress={leaveMatch} hitSlop={10} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerBadge} selectable={false} numberOfLines={1}>
              {setup.badge}
            </Text>
            {mode === 'weekend' ? (
              <Text style={styles.headerSub} selectable={false}>
                {t('match.weekendHeader', {
                  played: Math.min(weekend.played + 1, WEEKEND_MATCHES),
                  matches: WEEKEND_MATCHES,
                  wins: weekend.wins,
                })}
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
            label={t('common.you')}
            count={playerRemaining}
            color={colors.neon}
            active={!playerTurn && roundResult == null}
            align="right"
          />
        </View>

        <View
          style={{
            width: stageWidth,
            height: stageHeight,
            alignSelf: 'center',
            marginTop: spacing.md,
          }}
        >
          <Table3D
            width={tableWidth}
            racks={[
              { cups: opponentCups, aliveFlags: opponentAlive, colour: setup.color },
              { cups: playerCups, aliveFlags: playerAlive, colour: colors.neon },
            ]}
            balls={[playerFlight, opponentFlight]}
            ballColours={[ballSkin.accent, isPassPlay ? colors.gold : colors.danger]}
            watching={playerTurn ? 'far' : 'near'}
          />

          <ThrowBall
            flight={playerFlight}
            startX={tableWidth / 2}
            startY={PLAYER_BALL_Y}
            cups={opponentCups}
            aliveFlags={opponentAlive}
            accent={ballSkin.accent}
            skill={setup.playerSkill}
            bounce={bounceArmed}
            onResult={handlePlayerResult}
            onRim={feedback.rimOut}
            onLaunch={feedback.whoosh}
            inputScale={SCREEN_POINTS_PER_TABLE_POINT}
            disabled={!playerTurn || handOver}
            hidden={!playerTurn}
          />
          {isPassPlay ? (
            <ThrowBall
              flight={opponentFlight}
              startX={tableWidth / 2}
              startY={OPPONENT_BALL_Y}
              cups={playerCups}
              aliveFlags={playerAlive}
              accent={colors.gold}
              skill={setup.playerSkill}
              direction="down"
              bounce={bounceArmed}
              onResult={handleSecondPlayerResult}
              onRim={feedback.rimOut}
              onLaunch={feedback.whoosh}
              inputScale={SCREEN_POINTS_PER_TABLE_POINT}
              disabled={playerTurn || handOver || roundResult != null}
              hidden={playerTurn || roundResult != null}
            />
          ) : (
            <OpponentThrow
              flight={opponentFlight}
              startX={tableWidth / 2}
              startY={OPPONENT_BALL_Y}
              cups={playerCups}
              aliveFlags={playerAlive}
              accuracy={setup.accuracy}
              accent={colors.danger}
              turnToken={opponentTurnToken}
              onResult={handleOpponentResult}
            />
          )}

          <ParticleBurst ref={particleRef} />
          <FlashOverlay ref={flashRef} />
        </View>

        <View style={styles.actionRow}>
          <Pressable
            onPress={() => {
              feedback.tap();
              setBounceArmed((armed) => !armed);
            }}
            disabled={roundResult != null || handOver}
            style={({ pressed }) => [
              styles.actionButton,
              bounceArmed && styles.actionButtonActive,
              pressed && styles.actionButtonPressed,
            ]}
          >
            <Ionicons
              name="tennisball"
              size={15}
              color={bounceArmed ? colors.background : colors.neon}
            />
            <Text
              style={[styles.actionText, bounceArmed && { color: colors.background }]}
              selectable={false}
            >
              {t('match.bounce')}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => doReRack(playerTurn ? 0 : 1)}
            disabled={roundResult != null || handOver || reRacksLeft[playerTurn ? 0 : 1] <= 0}
            style={({ pressed }) => [
              styles.actionButton,
              reRacksLeft[playerTurn ? 0 : 1] <= 0 && styles.actionButtonDisabled,
              pressed && styles.actionButtonPressed,
            ]}
          >
            <Ionicons
              name="grid"
              size={15}
              color={reRacksLeft[playerTurn ? 0 : 1] > 0 ? colors.neon : colors.textMuted}
            />
            <Text
              style={[
                styles.actionText,
                reRacksLeft[playerTurn ? 0 : 1] <= 0 && { color: colors.textMuted },
              ]}
              selectable={false}
            >
              {t('match.reRack', { left: reRacksLeft[playerTurn ? 0 : 1] })}
            </Text>
          </Pressable>
        </View>

        {/* Two balls a turn, and which of them you are on. Without this the
            rule is invisible: you would just find yourself throwing twice. */}
        {roundResult == null ? (
          <View style={styles.ballRow}>
            {activeTurnState.redemption ? (
              <Text style={[styles.turnNote, { color: colors.danger }]} selectable={false}>
                {t('match.redemption')}
              </Text>
            ) : (
              <>
                {Array.from({ length: BALLS_PER_TURN }).map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.ballPip,
                      {
                        borderColor: playerTurn ? colors.neon : colors.danger,
                        backgroundColor:
                          i < activeTurnState.ballsLeft
                            ? playerTurn
                              ? colors.neon
                              : colors.danger
                            : 'transparent',
                      },
                    ]}
                  />
                ))}
                {turnNote === 'ballsBack' ? (
                  <Text style={[styles.turnNote, { color: colors.gold }]} selectable={false}>
                    {t('match.ballsBack')}
                  </Text>
                ) : null}
              </>
            )}
          </View>
        ) : null}

        <Animated.Text
          style={[styles.hint, { color: playerTurn ? colors.neon : colors.danger }, hintStyle]}
          selectable={false}
        >
          {bounceArmed ? t('match.bounceArmed') : (missNote ?? turnStatus)}
        </Animated.Text>
      </SafeAreaView>

      {/* Arcade is played upright. Rather than squeeze the board sideways, the
          game keeps running underneath and asks for the phone back. */}
      {landscape ? (
        <View style={styles.rotateOverlay}>
          <Ionicons name="phone-portrait-outline" size={48} color={colors.neon} />
          <Text style={styles.rotateTitle} selectable={false}>
            {t('match.rotateTitle')}
          </Text>
          <Text style={styles.rotateBody} selectable={false}>
            {t('match.rotateBody')}
          </Text>
          <GlowButton label={t('common.back')} variant="outline" size="sm" onPress={leaveMatch} />
        </View>
      ) : null}

      {showResultCard ? (
        <View style={styles.resultOverlay}>
          {roundResult === 'win' || isPassPlay ? <Confetti /> : null}
          <View
            style={[styles.resultCard, roundResult === 'lose' && { borderColor: colors.danger }]}
          >
            <Ionicons
              name={isPassPlay || roundResult === 'win' ? 'trophy' : 'skull'}
              size={40}
              color={isPassPlay || roundResult === 'win' ? colors.gold : colors.danger}
            />
            <Text
              style={[
                styles.resultTitle,
                {
                  color: isPassPlay
                    ? colors.neon
                    : roundResult === 'win'
                      ? colors.neon
                      : colors.danger,
                },
              ]}
            >
              {isPassPlay
                ? t('match.teamWins', {
                    team: roundResult === 'win' ? trackerTeams[0].name : trackerTeams[1].name,
                  })
                : roundResult === 'win'
                  ? t('match.win')
                  : t('match.lose')}
            </Text>
            <Text style={styles.resultBody}>{resultNote}</Text>
            <View style={styles.resultButtons}>
              {mode === 'weekend' && runFinished ? null : (
                <GlowButton
                  label={t('weekend.nextMatch')}
                  size="sm"
                  onPress={nextMatch}
                  style={styles.resultButton}
                />
              )}
              <GlowButton
                label={t('common.back')}
                variant="outline"
                size="sm"
                onPress={leaveMatch}
                style={styles.resultButton}
              />
              <ShareResultButton
                data={{
                  headline: isPassPlay
                    ? t('match.teamWins', {
                        team: roundResult === 'win' ? trackerTeams[0].name : trackerTeams[1].name,
                      })
                    : roundResult === 'win'
                      ? t('match.shareWin')
                      : t('match.shareLose'),
                  subline: t('match.shareSubline', { badge: setup.badge, name: setup.name }),
                  leftLabel: t('common.you'),
                  leftValue: `${CUP_COUNT - playerRemaining}`,
                  rightLabel: setup.name,
                  rightValue: `${CUP_COUNT - opponentRemaining}`,
                }}
              />
            </View>
          </View>
        </View>
      ) : null}

      {handOver ? (
        <Pressable style={styles.handOverOverlay} onPress={confirmHandOver}>
          <Ionicons name="swap-horizontal" size={44} color={colors.neon} />
          <Text style={styles.handOverTitle} selectable={false}>
            {t('match.handOverTitle', {
              team: turn === 'player' ? trackerTeams[1].name : trackerTeams[0].name,
            })}
          </Text>
          <Text style={styles.handOverBody} selectable={false}>
            {t('match.handOverBody')}
          </Text>
          <GlowButton
            label={t('match.handOverReady')}
            size="lg"
            onPress={confirmHandOver}
            style={styles.handOverButton}
          />
        </Pressable>
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
  rotateOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    backgroundColor: 'rgba(10,10,10,0.96)',
  },
  rotateTitle: {
    fontFamily: fonts.headingBlack,
    fontSize: 20,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  rotateBody: {
    fontFamily: fonts.bodyRegular,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  viewport: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderFaint,
    backgroundColor: colors.backgroundCard,
    overflow: 'hidden',
  },
  /**
   * Shrunk from its top left corner rather than its centre, so the table stays
   * inside the box the layout gave it instead of spilling out on both sides.
   */
  viewportScaled: {
    alignSelf: 'flex-start',
    transformOrigin: 'top left',
  },
  table: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  ballRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    minHeight: 18,
  },
  ballPip: {
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 1.5,
  },
  turnNote: {
    fontFamily: fonts.displayBlack,
    fontSize: 13,
    letterSpacing: 2,
    marginLeft: spacing.xs,
  },
  hint: {
    textAlign: 'center',
    fontFamily: fonts.label,
    fontSize: 13,
    letterSpacing: 1,
    marginTop: spacing.md,
    minHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  actionButton: {
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
  actionButtonActive: {
    backgroundColor: colors.neon,
    borderColor: colors.neon,
  },
  actionButtonDisabled: {
    borderColor: colors.borderFaint,
  },
  actionButtonPressed: {
    opacity: 0.65,
  },
  actionText: {
    fontFamily: fonts.label,
    fontSize: 12,
    color: colors.neon,
    letterSpacing: 0.5,
  },
  handOverOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  handOverTitle: {
    fontFamily: fonts.headingBlack,
    fontSize: 26,
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  handOverBody: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  handOverButton: {
    minWidth: 200,
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
