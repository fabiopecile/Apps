import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

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
  generateCupLayout,
  mirrorRack,
  RACK_HEIGHT,
  NET_ZONE,
  TABLE_HEIGHT,
  CUP_COUNT,
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
  const opponentCups = useMemo(() => generateCupLayout(tableWidth), [tableWidth]);
  const playerCups = useMemo(() => mirrorRack(opponentCups), [opponentCups]);

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

  const opponent = LEAGUE_OPPONENTS.find((o) => o.id === currentOpponentId) ?? LEAGUE_OPPONENTS[0];
  const ballSkin = SKINS.find((s) => s.id === arcade.equippedBall) ?? SKINS[0];
  const { level, progress } = selectCareerProgress(arcade.careerXP);

  const playerBallStart = { x: tableWidth / 2, y: RACK_HEIGHT + NET_ZONE - 22 };
  const opponentBallStart = { x: tableWidth / 2, y: RACK_HEIGHT + 22 };
  const opponentRemaining = opponentAlive.filter(Boolean).length;
  const playerRemaining = playerAlive.filter(Boolean).length;

  const resetRound = () => {
    setOpponentAlive(Array(CUP_COUNT).fill(true));
    setPlayerAlive(Array(CUP_COUNT).fill(true));
    setRoundResult(null);
    setTurn('player');
  };

  useEffect(() => {
    resetRound();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOpponentId]);

  const sendOpponentToThrow = () => {
    setTimeout(() => {
      setTurn('opponent');
      setOpponentTurnToken((t) => t + 1);
    }, 500);
  };

  const handlePlayerResult = (result: { cupIndex: number | null; hit: boolean }) => {
    arcadeRecordThrow(result.hit);
    if (result.cupIndex == null) {
      feedback.miss();
      sendOpponentToThrow();
      return;
    }
    if (!result.hit) {
      feedback.miss();
      sendOpponentToThrow();
      return;
    }
    const cup = opponentCups[result.cupIndex];
    feedback.cupHit();
    flashRef.current?.flash(ballSkin.accent);
    particleRef.current?.burst(cup.x, cup.y);
    setOpponentAlive((prev) => {
      const next = [...prev];
      next[result.cupIndex as number] = false;
      const remaining = next.filter(Boolean).length;
      if (remaining === 0) {
        setTimeout(() => {
          setRoundResult('win');
          feedback.victory();
          arcadeRecordMatch(opponent.id, true);
        }, 400);
      } else {
        sendOpponentToThrow();
      }
      return next;
    });
  };

  const handleOpponentResult = (result: { cupIndex: number; hit: boolean }) => {
    if (!result.hit) {
      setTurn('player');
      return;
    }
    const cup = playerCups[result.cupIndex];
    flashRef.current?.flash(colors.danger);
    particleRef.current?.burst(cup.x, cup.y);
    setPlayerAlive((prev) => {
      const next = [...prev];
      next[result.cupIndex] = false;
      const remaining = next.filter(Boolean).length;
      if (remaining === 0) {
        setTimeout(() => {
          setRoundResult('lose');
          arcadeRecordMatch(opponent.id, false);
        }, 400);
      } else {
        setTurn('player');
      }
      return next;
    });
  };

  const nextOpponent = () => {
    const idx = LEAGUE_OPPONENTS.findIndex((o) => o.id === opponent.id);
    const next = LEAGUE_OPPONENTS[(idx + 1) % LEAGUE_OPPONENTS.length];
    setCurrentOpponentId(next.id);
  };

  const turnStatusText =
    roundResult != null
      ? ''
      : turn === 'player'
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
            <RackBadge label={opponent.nickname} count={opponentRemaining} color={opponent.color} />
            <Text style={styles.vsText} selectable={false}>
              VS
            </Text>
            <RackBadge label="Du" count={playerRemaining} color={colors.neon} align="right" />
          </View>

          <View style={[styles.table, { width: tableWidth, height: TABLE_HEIGHT }]}>
            <LinearGradient
              colors={['#151b12', '#0d100b', '#151b12']}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
            <View style={styles.tableCenterLine} pointerEvents="none" />
            <View style={[styles.tableRail, styles.tableRailLeft]} pointerEvents="none" />
            <View style={[styles.tableRail, styles.tableRailRight]} pointerEvents="none" />

            <CupPyramid cups={opponentCups} aliveFlags={opponentAlive} accent={opponent.color} />
            <CupPyramid cups={playerCups} aliveFlags={playerAlive} accent={colors.neon} />

            <ThrowBall
              startX={playerBallStart.x}
              startY={playerBallStart.y}
              cups={opponentCups}
              aliveFlags={opponentAlive}
              accent={ballSkin.accent}
              opponentDifficulty={opponent.difficulty}
              onResult={handlePlayerResult}
              disabled={turn !== 'player' || roundResult != null}
            />
            <OpponentThrow
              startX={opponentBallStart.x}
              startY={opponentBallStart.y}
              cups={playerCups}
              aliveFlags={playerAlive}
              accuracy={opponent.accuracy}
              accent={colors.danger}
              turnToken={opponentTurnToken}
              onResult={handleOpponentResult}
            />

            <ParticleBurst ref={particleRef} />
            <FlashOverlay ref={flashRef} />
          </View>

          <Text style={styles.hint} selectable={false}>
            {turnStatusText}
          </Text>
        </ScrollView>
      </SafeAreaView>

      {roundResult === 'win' ? (
        <View style={styles.resultOverlay}>
          <View style={styles.resultCard}>
            <Ionicons name="trophy" size={40} color={colors.gold} />
            <Text style={[styles.resultTitle, { color: colors.neon }]}>SIEG!</Text>
            <Text style={styles.resultBody}>
              {opponent.nickname} besiegt · +75 Coins · +Career XP
            </Text>
            <View style={styles.resultButtons}>
              <GlowButton label="Rack wiederholen" variant="outline" size="sm" onPress={resetRound} />
              <GlowButton label="Nächster Gegner" size="sm" onPress={nextOpponent} />
            </View>
          </View>
        </View>
      ) : null}

      {roundResult === 'lose' ? (
        <View style={styles.resultOverlay}>
          <View style={[styles.resultCard, { borderColor: colors.danger }]}>
            <Ionicons name="skull" size={40} color={colors.danger} />
            <Text style={[styles.resultTitle, { color: colors.danger }]}>NIEDERLAGE</Text>
            <Text style={styles.resultBody}>
              {opponent.nickname} hat dein Rack leergeräumt · +20 Coins
            </Text>
            <View style={styles.resultButtons}>
              <GlowButton label="Nochmal versuchen" variant="outline" size="sm" onPress={resetRound} />
              <GlowButton label="Anderer Gegner" size="sm" onPress={nextOpponent} />
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
  align = 'left',
}: {
  label: string;
  count: number;
  color: string;
  align?: 'left' | 'right';
}) {
  return (
    <View style={[styles.rackBadge, align === 'right' && styles.rackBadgeReverse]}>
      <View style={[styles.rackBadgeDot, { backgroundColor: color }]} />
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
  table: {
    alignSelf: 'center',
    marginTop: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderFaint,
    backgroundColor: colors.backgroundCard,
    overflow: 'hidden',
  },
  tableCenterLine: {
    position: 'absolute',
    top: RACK_HEIGHT + NET_ZONE / 2,
    left: '8%',
    right: '8%',
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
    fontFamily: fonts.bodyRegular,
    color: colors.textMuted,
    fontSize: 12,
    marginTop: spacing.sm,
    minHeight: 16,
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
    fontSize: 32,
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
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
