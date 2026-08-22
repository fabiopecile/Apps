import { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, Animated, Easing, Pressable, StyleSheet } from 'react-native';
import { ConfettiBurst } from '@/components/ConfettiBurst';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors, fontSizes, radii, spacing } from '@/constants/theme';
import { LEVEL_UP_REWARD_JOKERS } from '@/constants/game';

// Shown automatically whenever the user's level goes up. The badge drops in,
// spins once, and a glow ring keeps pulsing behind it while confetti flies.
export function LevelUpCelebration({ level, onClose }: { level: number | null; onClose: () => void }) {
  const drop = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const [confetti, setConfetti] = useState(0);

  useEffect(() => {
    if (level == null) return;

    drop.setValue(0);
    setConfetti((c) => c + 1);

    const entrance = Animated.spring(drop, { toValue: 1, useNativeDriver: true, friction: 5, tension: 70 });
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );

    entrance.start();
    pulse.start();
    return () => {
      entrance.stop();
      pulse.stop();
    };
  }, [level, drop, glow]);

  if (level == null) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <ConfettiBurst trigger={confetti} />

        <View style={styles.card}>
          <View style={styles.badgeWrap}>
            <Animated.View
              style={[
                styles.glowRing,
                {
                  opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] }),
                  transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.9] }) }],
                },
              ]}
            />
            <Animated.View
              style={[
                styles.badge,
                {
                  opacity: drop,
                  transform: [
                    { translateY: drop.interpolate({ inputRange: [0, 1], outputRange: [-70, 0] }) },
                    { scale: drop.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) },
                    { rotate: drop.interpolate({ inputRange: [0, 1], outputRange: ['-180deg', '0deg'] }) },
                  ],
                },
              ]}
            >
              <Text style={styles.badgeLevel}>{level}</Text>
            </Animated.View>
          </View>

          <Text style={styles.title}>Level {level} erreicht!</Text>
          <Text style={styles.subtitle}>Weiter so – dein nächstes Level wartet schon.</Text>

          <View style={styles.rewardPill}>
            <Text style={styles.rewardText}>⚡ +{LEVEL_UP_REWARD_JOKERS} Joker</Text>
          </View>

          <PrimaryButton label="Weiter" variant="red" onPress={onClose} style={styles.button} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.blue,
    padding: spacing.xl,
    alignItems: 'center',
  },
  badgeWrap: { alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  glowRing: {
    position: 'absolute',
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 3,
    borderColor: colors.blue,
  },
  badge: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.blueDark,
    borderWidth: 2,
    borderColor: colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeLevel: { color: colors.white, fontSize: 34, fontWeight: '800' },
  title: { color: colors.white, fontSize: fontSizes.xl, fontWeight: '800', letterSpacing: -0.4, marginBottom: spacing.xs },
  subtitle: { color: colors.textMuted, fontSize: fontSizes.sm, textAlign: 'center', marginBottom: spacing.lg },
  rewardPill: {
    backgroundColor: colors.goldDark,
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.xl,
  },
  rewardText: { color: colors.gold, fontWeight: '800', fontSize: fontSizes.sm },
  button: { width: '100%' },
});
