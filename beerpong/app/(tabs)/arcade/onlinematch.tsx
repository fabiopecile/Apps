import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { GridBackground } from '@/components/ui/GridBackground';
import { GlowButton } from '@/components/ui/GlowButton';
import { Confetti } from '@/components/ui/Confetti';
import { ParticleBurst, type ParticleBurstHandle } from '@/components/ui/ParticleBurst';
import { FlashOverlay, type FlashOverlayHandle } from '@/components/ui/FlashOverlay';
import { Table3D } from '@/components/arcade/Table3D';
import { ThrowBall, type ThrowResult } from '@/components/arcade/ThrowBall';
import { RemoteThrow } from '@/components/arcade/RemoteThrow';
import { useBallFlight } from '@/components/arcade/useBallFlight';
import {
  CUP_COUNT,
  OPPONENT_BALL_Y,
  PLAYER_BALL_Y,
  TABLE_WIDTH_REFERENCE,
  companionCup,
  generateOpponentRack,
  generatePlayerRack,
} from '@/lib/arcadeLayout';
import { BALLS_PER_TURN } from '@/lib/turnRules';
import { isRoomCode, otherSeat, type Seat } from '@/lib/onlineProtocol';
import { useOnlineRoom } from '@/lib/onlineRoom';
import { SKINS } from '@/lib/skins';
import { cupDesign } from '@/lib/cupSkins';
import { useBeerpongStore } from '@/lib/store';
import { useFeedback } from '@/lib/feedback';
import { useT } from '@/lib/i18n';
import { colors, fonts, radius, spacing } from '@/theme';

/** See the note on the same constant in `match.tsx`. */
const SCREEN_POINTS_PER_TABLE_POINT = 1;

/**
 * The arcade game against somebody else's phone.
 *
 * Deliberately its own screen rather than a mode inside `match.tsx`. That one
 * owns its match: it holds the racks, runs the AI, hands the phone over and
 * writes the result into the career. Here the *room* owns the match — whose
 * turn it is, what the score is, when it is over — and this screen only throws
 * and draws. Bolting one onto the other would have meant every piece of state
 * existing twice, with a network in between to make them disagree.
 *
 * What crosses the network is one throw's landing point. Both ends build the
 * flight from it with the same function, so the ball you watch is the ball they
 * watched, and there is nothing left to drift.
 */
export default function ArcadeOnlineMatchScreen() {
  const params = useLocalSearchParams<{
    code?: string;
    seat?: string;
    create?: string;
    name?: string;
    cups?: string;
  }>();
  const code = (params.code ?? '').toUpperCase();
  const seatParam: Seat = params.seat === '1' ? 1 : 0;
  const creating = params.create === '1';
  const cups = Number(params.cups ?? '10');

  const t = useT();
  const feedback = useFeedback();
  const { width, height } = useWindowDimensions();
  const equippedBall = useBeerpongStore((s) => s.arcade.equippedBall);
  const equippedCupSkin = useBeerpongStore((s) => s.equippedCupSkin);
  const ballSkin = SKINS.find((skin) => skin.id === equippedBall) ?? SKINS[0];

  const room = useOnlineRoom(
    isRoomCode(code)
      ? {
          code,
          seat: seatParam,
          create: creating,
          name: (params.name ?? '').slice(0, 16),
          cups: creating ? cups : undefined,
          game: 'arcade',
        }
      : null
  );
  const { match, send } = room;
  const mySeat = room.seat;
  const theirSeat = otherSeat(mySeat);

  const tableWidth = TABLE_WIDTH_REFERENCE;
  const stageHeight = Math.max(300, height - 300);
  const stageWidth = width - spacing.lg * 2;
  const landscape = width > height;

  const rackSize = match?.startCups ?? CUP_COUNT;
  const theirCups = useMemo(
    () => generateOpponentRack(tableWidth, rackSize),
    [tableWidth, rackSize]
  );
  const myCups = useMemo(() => generatePlayerRack(tableWidth, rackSize), [tableWidth, rackSize]);

  const myFlight = useBallFlight(tableWidth / 2, PLAYER_BALL_Y);
  const theirFlight = useBallFlight(tableWidth / 2, OPPONENT_BALL_Y);
  const flashRef = useRef<FlashOverlayHandle>(null);
  const particleRef = useRef<ParticleBurstHandle>(null);
  const burst = () => particleRef.current?.burst(stageWidth / 2, stageHeight * 0.45);

  /**
   * The racks as they are being *shown*, which lags the room on purpose.
   *
   * The room takes a cup off the moment it accepts the throw. Drawn straight
   * from that, a cup would vanish and only then would the ball arrive at the
   * gap — so the flags are held at their old values while a ball is in the air
   * and caught up when it lands.
   */
  const [shown, setShown] = useState<[boolean[], boolean[]]>(() => [
    Array(rackSize).fill(true),
    Array(rackSize).fill(true),
  ]);
  const flyingRef = useRef(false);
  /** The last throw this screen has already played. */
  const playedShot = useRef(0);
  const [remote, setRemote] = useState<{
    id: number;
    landing: { x: number; y: number };
    cupIndex: number | null;
  } | null>(null);
  /** Set while our own throw is on its way to the room, so it cannot be taken twice. */
  const [sending, setSending] = useState(false);

  const bothHere = room.present[0] && room.present[1];
  const winner = match?.winner ?? null;
  const myTurn = match != null && winner == null && match.activeTeam === mySeat;
  const canThrow = myTurn && bothHere && !sending && remote == null && room.status === 'open';

  // Catch the drawn racks up whenever nothing is in the air. Also covers the
  // first state, a rematch, and coming back after the phone slept.
  //
  // The second condition is not redundant with `flyingRef`: the state carrying
  // their throw and the effect below that starts the ball arrive in the same
  // render, and this one runs first. Without it the cup vanished and only then
  // did the ball set off towards the gap where it had been.
  useEffect(() => {
    if (!match?.alive) return;
    const shot = match.lastShot;
    const unplayed = shot != null && shot.seat !== mySeat && shot.id > playedShot.current;
    if (flyingRef.current || unplayed) return;
    setShown([[...match.alive[0]], [...match.alive[1]]]);
  }, [match?.version, match?.alive, match?.lastShot, mySeat]);

  // Their throw arrived: play it, and only then let the racks catch up.
  useEffect(() => {
    const shot = match?.lastShot;
    if (!shot || shot.id <= playedShot.current) return;
    playedShot.current = shot.id;
    if (shot.seat === mySeat) return;
    flyingRef.current = true;
    setRemote({ id: shot.id, landing: shot.landing, cupIndex: shot.cups[0] ?? null });
  }, [match?.lastShot, mySeat]);

  // Tell the other table which cups we are playing with, once connected and
  // again whenever it changes.
  useEffect(() => {
    if (room.status !== 'open') return;
    if (match?.teams[mySeat].skin === equippedCupSkin) return;
    send({ type: 'skin', id: equippedCupSkin });
  }, [room.status, equippedCupSkin, match?.teams, mySeat, send]);

  // Our own throw came back from the room, so the ball is free again.
  useEffect(() => {
    if (match?.lastShot?.seat === mySeat) setSending(false);
  }, [match?.lastShot, mySeat]);

  const remoteLanded = () => {
    const shot = match?.lastShot;
    if (shot?.hit) {
      feedback.cupHit();
      flashRef.current?.flash(colors.danger, 0.18);
      burst();
    } else {
      feedback.miss();
    }
    flyingRef.current = false;
    setRemote(null);
    if (match?.alive) setShown([[...match.alive[0]], [...match.alive[1]]]);
  };

  /** Our throw has landed on their rack. */
  const onMyThrow = (result: ThrowResult) => {
    const hit = result.hit && result.cupIndex != null;
    const falling: number[] = [];
    if (hit && result.cupIndex != null) {
      falling.push(result.cupIndex);
      if (result.bounce) {
        const companion = companionCup(
          theirCups,
          shown[theirSeat].map((up, index) => (index === result.cupIndex ? false : up)),
          result.cupIndex
        );
        if (companion != null) falling.push(companion);
      }
    }

    if (hit) {
      feedback.cupHit();
      if (result.bounce) feedback.streak();
      flashRef.current?.flash(ballSkin.accent, 0.18);
      burst();
      // Shown straight away rather than waiting for the room: the cup has to go
      // as the ball drops into it, and the room's answer confirms it a moment
      // later.
      setShown((current) => {
        const next: [boolean[], boolean[]] = [[...current[0]], [...current[1]]];
        falling.forEach((index) => (next[theirSeat][index] = false));
        return next;
      });
    } else {
      if (!result.rimOut) feedback.miss();
    }

    setSending(true);
    send({ type: 'shot', hit, cups: falling, landing: result.landing, bounce: result.bounce });
  };

  const leave = () => {
    if (router.canDismiss()) {
      router.dismissTo('/(tabs)/arcade');
      return;
    }
    router.replace('/(tabs)/arcade');
  };

  const note = match?.note ?? null;
  const turn = match?.turn;
  const statusLine = (() => {
    if (room.status === 'refused') return t(`online.refused.${room.refusal ?? 'missing'}` as never);
    if (room.status === 'connecting') return t('online.connecting');
    if (room.status === 'reconnecting') return t('online.reconnecting');
    if (!bothHere) return t('online.waitingForOther');
    if (winner != null) return winner === mySeat ? t('online.youWon') : t('online.theyWon');
    if (note === 'overtime') return t('match.overtimeNote');
    if (note === 'redemption') return t('match.redemption');
    if (note === 'ballsBack') return t('match.ballsBack');
    return myTurn ? t('online.yourTurn') : t('online.theirTurn');
  })();

  if (landscape) {
    return (
      <View style={styles.container}>
        <GridBackground />
        <SafeAreaView style={styles.rotate}>
          <Ionicons name="phone-portrait-outline" size={34} color={colors.neon} />
          <Text style={styles.rotateTitle}>{t('match.rotateTitle')}</Text>
          <Text style={styles.rotateText}>{t('match.rotateBody')}</Text>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <GridBackground />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable onPress={leave} hitSlop={10}>
            <Ionicons name="close" size={26} color={colors.textPrimary} />
          </Pressable>
          <View style={styles.headerMiddle}>
            <Text style={styles.code} selectable={false}>
              {code}
            </Text>
            <Text style={styles.status} selectable={false}>
              {statusLine}
            </Text>
          </View>
          <View style={{ width: 26 }} />
        </View>

        <View style={styles.scoreRow}>
          <Score
            name={match?.teams[mySeat].name ?? t('online.yourRack')}
            cups={shown[mySeat].filter(Boolean).length}
            colour={colors.neon}
            active={myTurn}
          />
          <Text style={styles.balls} selectable={false}>
            {winner == null && turn
              ? turn.redemption
                ? t('match.redemption')
                : `${turn.ballsLeft}/${BALLS_PER_TURN}`
              : ''}
          </Text>
          <Score
            name={match?.teams[theirSeat].name ?? t('online.theirRack')}
            cups={shown[theirSeat].filter(Boolean).length}
            colour={colors.gold}
            active={!myTurn && winner == null}
          />
        </View>

        <View style={{ width: stageWidth, height: stageHeight, alignSelf: 'center' }}>
          <Table3D
            width={tableWidth}
            racks={[
              {
                cups: theirCups,
                aliveFlags: shown[theirSeat],
                colour: colors.gold,
                // Their cups wear whatever they bought. Half the point of a
                // country on your cups is the other table seeing it.
                design: match?.teams[theirSeat].skin
                  ? cupDesign(match.teams[theirSeat].skin!)
                  : undefined,
              },
              {
                cups: myCups,
                aliveFlags: shown[mySeat],
                colour: colors.neon,
                design: cupDesign(equippedCupSkin),
              },
            ]}
            balls={[myFlight, theirFlight]}
            ballColours={[ballSkin.accent, colors.danger]}
            watching={myTurn ? 'far' : 'near'}
          />

          <ThrowBall
            flight={myFlight}
            startX={tableWidth / 2}
            startY={PLAYER_BALL_Y}
            cups={theirCups}
            aliveFlags={shown[theirSeat]}
            accent={ballSkin.accent}
            skill={0.55}
            onResult={onMyThrow}
            onRim={feedback.rimOut}
            onLaunch={feedback.whoosh}
            inputScale={SCREEN_POINTS_PER_TABLE_POINT}
            disabled={!canThrow}
            hidden={!myTurn || winner != null}
          />

          <RemoteThrow
            flight={theirFlight}
            startX={tableWidth / 2}
            startY={OPPONENT_BALL_Y}
            cups={myCups}
            accent={colors.danger}
            landing={remote?.landing ?? null}
            cupIndex={remote?.cupIndex ?? null}
            shotId={remote?.id ?? 0}
            onDone={remoteLanded}
          />

          <ParticleBurst ref={particleRef} />
          <FlashOverlay ref={flashRef} />
        </View>


        {winner != null ? (
          <View style={styles.resultCard}>
            {winner === mySeat ? <Confetti /> : null}
            <Text style={styles.resultTitle}>
              {winner === mySeat ? t('online.youWon') : t('online.theyWon')}
            </Text>
            <GlowButton
              label={t('online.rematch')}
              onPress={() => {
                feedback.tap();
                playedShot.current = 0;
                send({ type: 'rematch' });
              }}
            />
            <Pressable onPress={leave} style={styles.leaveLink}>
              <Text style={styles.leaveText}>{t('online.leave')}</Text>
            </Pressable>
          </View>
        ) : null}
      </SafeAreaView>
    </View>
  );
}

function Score({
  name,
  cups,
  colour,
  active,
}: {
  name: string;
  cups: number;
  colour: string;
  active: boolean;
}) {
  return (
    <View style={[styles.score, active && { borderColor: colour }]}>
      <Text style={[styles.scoreName, { color: colour }]} numberOfLines={1} selectable={false}>
        {name}
      </Text>
      <Text style={styles.scoreCups} selectable={false}>
        {cups}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  safe: { flex: 1 },
  rotate: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  rotateTitle: {
    fontFamily: fonts.headingBlack,
    fontSize: 18,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  rotateText: {
    fontFamily: fonts.bodyRegular,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  headerMiddle: { alignItems: 'center', flex: 1 },
  code: {
    fontFamily: fonts.numeric,
    fontSize: 18,
    color: colors.textPrimary,
    letterSpacing: 4,
  },
  status: {
    fontFamily: fonts.bodyRegular,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  score: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.borderFaint,
    borderRadius: radius.md,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
  },
  scoreName: { fontFamily: fonts.label, fontSize: 11, letterSpacing: 0.5 },
  scoreCups: { fontFamily: fonts.numeric, fontSize: 20, color: colors.textPrimary },
  balls: { fontFamily: fonts.numeric, fontSize: 13, color: colors.textMuted, minWidth: 34, textAlign: 'center' },
  resultCard: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.backgroundCard,
    padding: spacing.lg,
    gap: spacing.md,
    alignItems: 'center',
  },
  resultTitle: {
    fontFamily: fonts.headingBlack,
    fontSize: 22,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  leaveLink: { paddingVertical: 4 },
  leaveText: { fontFamily: fonts.bodyRegular, fontSize: 13, color: colors.textMuted },
});
