import { useEffect, useRef } from 'react';
import { Modal, View, Text, Pressable, Animated, StyleSheet } from 'react-native';
import { PrimaryButton } from '@/components/PrimaryButton';
import { PopIn } from '@/components/PopIn';
import { colors, fontSizes, radii, spacing } from '@/constants/theme';
import type { StreakReward } from '@/hooks/useDailyLogin';

export function StreakRewardModal({ reward, onClose }: { reward: StreakReward | null; onClose: () => void }) {
  const flicker = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!reward) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(flicker, { toValue: 1.15, duration: 480, useNativeDriver: true }),
        Animated.timing(flicker, { toValue: 0.95, duration: 480, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [reward, flicker]);

  return (
    <Modal visible={!!reward} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <PopIn style={styles.card}>
          <Animated.Text style={[styles.flame, { transform: [{ scale: flicker }] }]}>🔥</Animated.Text>
          <Text style={styles.title}>{reward?.streak}-Tage-Streak!</Text>
          <Text style={styles.subtitle}>Du bist {reward?.streak} Tage in Folge dabei.</Text>

          <View style={styles.rewards}>
            {reward?.xp ? (
              <View style={styles.rewardPill}>
                <Text style={styles.rewardText}>+{reward.xp} XP</Text>
              </View>
            ) : null}
            {reward?.joker ? (
              <View style={[styles.rewardPill, styles.rewardPillGold]}>
                <Text style={styles.rewardText}>⚡ +{reward.joker} Joker</Text>
              </View>
            ) : null}
          </View>

          <PrimaryButton label="Nice!" onPress={onClose} style={styles.button} />
        </PopIn>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    padding: spacing.xl,
    alignItems: 'center',
  },
  flame: { fontSize: 48, marginBottom: spacing.sm },
  title: { color: colors.white, fontSize: fontSizes.xl, fontWeight: '800', marginBottom: spacing.xs },
  subtitle: { color: colors.textMuted, fontSize: fontSizes.sm, textAlign: 'center', marginBottom: spacing.lg },
  rewards: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl },
  rewardPill: {
    backgroundColor: colors.blueDark,
    borderWidth: 1,
    borderColor: colors.blue,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  rewardPillGold: { backgroundColor: colors.goldDark, borderColor: colors.gold },
  rewardText: { color: colors.white, fontWeight: '700', fontSize: fontSizes.sm },
  button: { width: '100%' },
});
