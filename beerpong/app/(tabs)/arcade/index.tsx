import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { GridBackground } from '@/components/ui/GridBackground';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { GlowButton } from '@/components/ui/GlowButton';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ParticleBurst, type ParticleBurstHandle } from '@/components/ui/ParticleBurst';
import { FlashOverlay, type FlashOverlayHandle } from '@/components/ui/FlashOverlay';
import { CupPyramid } from '@/components/arcade/CupPyramid';
import { ThrowBall } from '@/components/arcade/ThrowBall';
import { generateCupLayout, TABLE_HEIGHT, CUP_COUNT } from '@/lib/arcadeLayout';
import { LEAGUE_OPPONENTS } from '@/lib/opponents';
import { SKINS } from '@/lib/skins';
import { selectCareerProgress, useBeerpongStore } from '@/lib/store';
import { useFeedback } from '@/lib/feedback';
import { colors, fonts, spacing, radius } from '@/theme';

export default function ArcadeScreen() {
  const { width } = useWindowDimensions();
  const tableWidth = width - spacing.lg * 2;
  const cups = useMemo(() => generateCupLayout(tableWidth), [tableWidth]);
  const [aliveFlags, setAliveFlags] = useState<boolean[]>(Array(CUP_COUNT).fill(true));
  const [roundWon, setRoundWon] = useState(false);

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

  const startX = tableWidth / 2;
  const startY = TABLE_HEIGHT - 24;
  const cupsRemaining = aliveFlags.filter(Boolean).length;

  const handleResult = (result: { cupIndex: number | null; hit: boolean }) => {
    arcadeRecordThrow(result.hit);
    if (result.cupIndex == null) {
      feedback.miss();
      return;
    }
    if (result.hit) {
      const cup = cups[result.cupIndex];
      feedback.cupHit();
      flashRef.current?.flash(ballSkin.accent);
      particleRef.current?.burst(cup.x, cup.y);
      setAliveFlags((prev) => {
        const next = [...prev];
        next[result.cupIndex as number] = false;
        return next;
      });
    } else {
      feedback.miss();
    }
  };

  useEffect(() => {
    setAliveFlags(Array(CUP_COUNT).fill(true));
    setRoundWon(false);
  }, [currentOpponentId]);

  useEffect(() => {
    if (cupsRemaining === 0 && !roundWon) {
      setRoundWon(true);
      feedback.victory();
      arcadeRecordMatch(opponent.id, true);
    }
  }, [cupsRemaining, roundWon]); // eslint-disable-line react-hooks/exhaustive-deps

  const nextOpponent = () => {
    const idx = LEAGUE_OPPONENTS.findIndex((o) => o.id === opponent.id);
    const next = LEAGUE_OPPONENTS[(idx + 1) % LEAGUE_OPPONENTS.length];
    setCurrentOpponentId(next.id);
    setAliveFlags(Array(CUP_COUNT).fill(true));
    setRoundWon(false);
  };

  const retryRack = () => {
    setAliveFlags(Array(CUP_COUNT).fill(true));
    setRoundWon(false);
  };

  return (
    <View style={styles.container}>
      <GridBackground />
      <SafeAreaView style={styles.safe}>
        <ScreenHeader
          title="ARCADE"
          subtitle={`vs. ${opponent.nickname} · Lvl ${level}`}
          right={
            <View style={styles.coinChip}>
              <Ionicons name="logo-bitcoin" size={14} color={colors.gold} />
              <Text style={styles.coinText}>{coins}</Text>
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

        <View style={[styles.table, { width: tableWidth, height: TABLE_HEIGHT }]}>
          <CupPyramid cups={cups} aliveFlags={aliveFlags} accent={opponent.color} />
          <ThrowBall
            startX={startX}
            startY={startY}
            cups={cups}
            aliveFlags={aliveFlags}
            accent={ballSkin.accent}
            opponentDifficulty={opponent.difficulty}
            onResult={handleResult}
            disabled={roundWon}
          />
          <ParticleBurst ref={particleRef} />
          <FlashOverlay ref={flashRef} />
        </View>

        <Text style={styles.hint}>Nach oben wischen: Richtung = Ziel, Weite = Kraft</Text>

        <View style={styles.statsRow}>
          <Stat label="Cups übrig" value={`${cupsRemaining}/${CUP_COUNT}`} />
          <Stat label="Career Cups" value={`${arcade.totalCupsHit}`} />
          <Stat label="Siege" value={`${arcade.wins}`} />
        </View>
      </SafeAreaView>

      {roundWon ? (
        <View style={styles.victoryOverlay}>
          <View style={styles.victoryCard}>
            <Ionicons name="trophy" size={40} color={colors.gold} />
            <Text style={styles.victoryTitle}>SIEG!</Text>
            <Text style={styles.victoryBody}>
              {opponent.nickname} besiegt · +75 Coins · +Career XP
            </Text>
            <View style={styles.victoryButtons}>
              <GlowButton label="Rack wiederholen" variant="outline" size="sm" onPress={retryRack} />
              <GlowButton label="Nächster Gegner" size="sm" onPress={nextOpponent} />
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
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
  table: {
    alignSelf: 'center',
    marginTop: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderFaint,
    backgroundColor: colors.backgroundCard,
    overflow: 'hidden',
  },
  hint: {
    textAlign: 'center',
    fontFamily: fonts.bodyRegular,
    color: colors.textMuted,
    fontSize: 12,
    marginTop: spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 'auto',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  statBox: {
    alignItems: 'center',
  },
  statValue: {
    fontFamily: fonts.displayBlack,
    fontSize: 22,
    color: colors.neon,
  },
  statLabel: {
    fontFamily: fonts.label,
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 1,
    marginTop: 2,
    textTransform: 'uppercase',
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
    fontFamily: fonts.label,
    color: colors.gold,
    fontSize: 13,
  },
  victoryOverlay: {
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
  victoryCard: {
    width: '100%',
    backgroundColor: colors.backgroundElevated,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  victoryTitle: {
    fontFamily: fonts.displayBlack,
    fontSize: 32,
    color: colors.neon,
    letterSpacing: 2,
  },
  victoryBody: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  victoryButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
