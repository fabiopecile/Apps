import { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, Pressable, Animated, Easing, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PrimaryButton } from '@/components/PrimaryButton';
import { PopIn } from '@/components/PopIn';
import { ConfettiBurst } from '@/components/ConfettiBurst';
import { colors, fontSizes, radii, spacing } from '@/constants/theme';
import type { WheelSpinResult } from '@/lib/database.types';

const PRIZE_ICON: Record<WheelSpinResult['prize_type'], keyof typeof Ionicons.glyphMap> = {
  xp: 'star',
  joker: 'gift',
  coins: 'ellipse',
  booster: 'rocket',
  title: 'ribbon',
};

export function PrizePopup({ result, onClose }: { result: WheelSpinResult | null; onClose: () => void }) {
  const iconSpin = useRef(new Animated.Value(0)).current;
  const [confetti, setConfetti] = useState(0);

  useEffect(() => {
    if (!result) return;
    setConfetti((c) => c + 1);
    iconSpin.setValue(0);
    const animation = Animated.timing(iconSpin, {
      toValue: 1,
      duration: 900,
      easing: Easing.out(Easing.back(2)),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [result, iconSpin]);

  return (
    <Modal visible={!!result} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <ConfettiBurst trigger={confetti} />
        <PopIn style={styles.card}>
          <Animated.View
            style={[
              styles.icon,
              {
                transform: [
                  { scale: iconSpin.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) },
                  { rotate: iconSpin.interpolate({ inputRange: [0, 1], outputRange: ['-90deg', '0deg'] }) },
                ],
              },
            ]}
          >
            <Ionicons name={result ? PRIZE_ICON[result.prize_type] : 'trophy'} size={56} color={colors.gold} />
          </Animated.View>
          <Text style={styles.title}>GEWONNEN!</Text>
          <Text style={styles.desc}>
            {result?.prize_type === 'title'
              ? `Du hast den Titel "${result.prize_label}" freigeschaltet`
              : `Du hast ${result?.prize_label} erhalten`}
          </Text>
          <PrimaryButton label="SUPER!" onPress={onClose} variant="red" style={styles.button} />
        </PopIn>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.red,
    borderRadius: radii.xl,
    padding: spacing.xxl,
    alignItems: 'center',
  },
  icon: { marginBottom: spacing.md },
  title: { color: colors.white, fontSize: fontSizes.xxl, fontWeight: '800', letterSpacing: -0.4, marginBottom: spacing.sm },
  desc: { color: colors.textMuted, fontSize: fontSizes.md, textAlign: 'center', marginBottom: spacing.xl },
  button: { width: '100%' },
});
