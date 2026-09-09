import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/Avatar';
import { WheelModal } from '@/components/WheelModal';
import { PrizePopup } from '@/components/PrizePopup';
import { LevelProgressModal } from '@/components/LevelProgressModal';
import { LevelUpCelebration } from '@/components/LevelUpCelebration';
import { AnimatedBar } from '@/components/AnimatedBar';
import { useAuth } from '@/contexts/AuthContext';
import { useWheel } from '@/hooks/useWheel';
import { colors, fontSizes, radii, spacing } from '@/constants/theme';
import { XP_PER_LEVEL } from '@/constants/game';
import type { WheelSpinResult } from '@/lib/database.types';

export function TopBar() {
  const { profile } = useAuth();
  const { canSpin } = useWheel();
  const router = useRouter();
  const [wheelOpen, setWheelOpen] = useState(false);
  const [prize, setPrize] = useState<WheelSpinResult | null>(null);
  const [levelInfoOpen, setLevelInfoOpen] = useState(false);
  const [celebratedLevel, setCelebratedLevel] = useState<number | null>(null);

  const xpInLevel = (profile?.xp ?? 0) % XP_PER_LEVEL;
  const progress = Math.min(1, xpInLevel / XP_PER_LEVEL);

  // Fires the confetti + badge whenever the level actually goes up, no matter
  // which action caused it (post XP, streak, duel win, wheel prize, referral).
  const previousLevel = useRef<number | null>(null);
  const giftPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const level = profile?.level;
    if (level == null) return;
    if (previousLevel.current !== null && level > previousLevel.current) {
      setCelebratedLevel(level);
    }
    previousLevel.current = level;
  }, [profile?.level]);

  // A gentle heartbeat on the gift button while a free spin is waiting.
  useEffect(() => {
    if (!canSpin) {
      giftPulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(giftPulse, { toValue: 1.14, duration: 620, useNativeDriver: true }),
        Animated.timing(giftPulse, { toValue: 1, duration: 620, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [canSpin, giftPulse]);

  return (
    <View style={styles.container}>
      <View style={styles.logoRow}>
        <Text style={styles.logo}>
          TEAM<Text style={styles.logoAccent}>UP</Text>
          <Text style={styles.logoAccent}>11</Text>
        </Text>
      </View>

      <View style={styles.right}>
        {profile && profile.login_streak > 0 ? (
          <View style={styles.streakPill}>
            <Ionicons name="flame" size={13} color={colors.gold} />
            <Text style={styles.streakText}>{profile.login_streak}</Text>
          </View>
        ) : null}

        <Pressable style={styles.levelPill} onPress={() => setLevelInfoOpen(true)}>
          <Text style={styles.levelText}>LVL {profile?.level ?? 1}</Text>
          <AnimatedBar progress={progress} color={colors.blue} trackStyle={styles.levelBarTrack} />
        </Pressable>

        <Pressable onPress={() => setWheelOpen(true)}>
          <Animated.View style={[styles.giftButton, { transform: [{ scale: giftPulse }] }]}>
            <Ionicons name="gift" size={17} color={colors.gold} />
            {canSpin ? <View style={styles.badgeDot} /> : null}
          </Animated.View>
        </Pressable>

        <Pressable onPress={() => router.push('/(tabs)/profil')}>
          <Avatar
            uri={profile?.avatar_url}
            name={profile?.display_name ?? profile?.username}
            size={40}
            ringColor={profile?.equipped_frame_color ?? undefined}
          />
        </Pressable>
      </View>

      <WheelModal
        visible={wheelOpen}
        onClose={() => setWheelOpen(false)}
        onWon={(result) => {
          setWheelOpen(false);
          setPrize(result);
        }}
      />
      <PrizePopup result={prize} onClose={() => setPrize(null)} />
      <LevelProgressModal
        visible={levelInfoOpen}
        level={profile?.level ?? 1}
        xp={profile?.xp ?? 0}
        onClose={() => setLevelInfoOpen(false)}
      />
      <LevelUpCelebration level={celebratedLevel} onClose={() => setCelebratedLevel(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center' },
  logo: {
    fontSize: fontSizes.xl,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  logoAccent: { color: colors.red },
  right: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  levelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  levelText: { color: colors.blue, fontWeight: '700', fontSize: fontSizes.xs },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  streakText: { color: colors.gold, fontWeight: '700', fontSize: fontSizes.xs },
  levelBarTrack: {
    width: 46,
    height: 5,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  giftButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.goldDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeDot: {
    position: 'absolute',
    top: -1,
    right: -1,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.red,
    borderWidth: 1.5,
    borderColor: colors.background,
  },
});
