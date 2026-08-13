import { useRef, useState } from 'react';
import { View, Text, Pressable, Modal, Animated, Easing, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useWheel } from '@/hooks/useWheel';
import { WHEEL_PRIZES, WHEEL_SEGMENT_ANGLE } from '@/constants/wheel';
import { wedgePath, wedgeLabelPosition, rotationToLandOn } from '@/lib/wheelGeometry';
import { colors, fontSizes, radii, spacing } from '@/constants/theme';
import type { WheelSpinResult } from '@/lib/database.types';

const SIZE = 280;
const CENTER = SIZE / 2;
const RADIUS = SIZE / 2;
const LABEL_RADIUS = RADIUS * 0.68;

interface WheelModalProps {
  visible: boolean;
  onClose: () => void;
  onWon: (result: WheelSpinResult) => void;
}

export function WheelModal({ visible, onClose, onWon }: WheelModalProps) {
  const { canSpin, spin } = useWheel();
  const [spinning, setSpinning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rotation = useRef(new Animated.Value(0)).current;
  const totalRotationRef = useRef(0);

  const rotateInterpolated = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '1deg'],
  });

  const handleSpin = async () => {
    if (spinning || !canSpin) return;
    setSpinning(true);
    setError(null);

    try {
      const result = await spin();
      const landing = rotationToLandOn(result.prize_index, WHEEL_SEGMENT_ANGLE);
      const spins = 4 + Math.floor(Math.random() * 3);
      totalRotationRef.current += spins * 360 + landing;

      Animated.timing(rotation, {
        toValue: totalRotationRef.current,
        duration: 4200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        setSpinning(false);
        onWon(result);
      });
    } catch (err) {
      setSpinning(false);
      setError(err instanceof Error ? err.message : 'Drehen fehlgeschlagen');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.closeButton} onPress={onClose}>
          <Ionicons name="close" size={28} color={colors.textMuted} />
        </Pressable>

        <Text style={styles.title}>TÄGLICHES GLÜCKSRAD</Text>
        <Text style={styles.subtitle}>
          {canSpin ? 'Drehe einmal pro Tag kostenlos' : 'Komm morgen wieder für die nächste Drehung'}
        </Text>

        <View style={styles.wheelWrapper}>
          <View style={styles.wheelOuter} />
          <View style={styles.pointer} />

          <Animated.View style={[styles.wheel, { transform: [{ rotate: rotateInterpolated }] }]}>
            <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
              {WHEEL_PRIZES.map((_, i) => {
                const start = i * WHEEL_SEGMENT_ANGLE;
                const end = start + WHEEL_SEGMENT_ANGLE;
                return (
                  <Path
                    key={i}
                    d={wedgePath(CENTER, CENTER, RADIUS, start, end)}
                    fill={i % 2 === 0 ? colors.red : colors.white}
                    stroke={colors.black}
                    strokeWidth={2}
                  />
                );
              })}
            </Svg>

            {WHEEL_PRIZES.map((prize, i) => {
              const start = i * WHEEL_SEGMENT_ANGLE;
              const end = start + WHEEL_SEGMENT_ANGLE;
              const pos = wedgeLabelPosition(CENTER, CENTER, LABEL_RADIUS, start, end);
              return (
                <Text
                  key={i}
                  style={[styles.wedgeEmoji, { left: pos.x - 16, top: pos.y - 16 }]}
                >
                  {prize.emoji}
                </Text>
              );
            })}
          </Animated.View>

          <Pressable
            style={[styles.spinButton, (!canSpin || spinning) && styles.spinButtonDisabled]}
            onPress={handleSpin}
            disabled={!canSpin || spinning}
          >
            <Ionicons name="play" size={26} color={colors.white} />
          </Pressable>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  closeButton: { position: 'absolute', top: 60, right: spacing.xl, zIndex: 10 },
  title: { color: colors.white, fontSize: fontSizes.xxl, fontWeight: '900', marginBottom: spacing.xs },
  subtitle: { color: colors.textMuted, fontSize: fontSizes.sm, marginBottom: spacing.xxl, textAlign: 'center' },
  wheelWrapper: { width: SIZE + 20, height: SIZE + 20, alignItems: 'center', justifyContent: 'center' },
  wheelOuter: {
    position: 'absolute',
    width: SIZE + 16,
    height: SIZE + 16,
    borderRadius: (SIZE + 16) / 2,
    borderWidth: 8,
    borderColor: colors.red,
  },
  pointer: {
    position: 'absolute',
    top: -6,
    width: 0,
    height: 0,
    borderLeftWidth: 16,
    borderRightWidth: 16,
    borderTopWidth: 28,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: colors.gold,
    zIndex: 30,
  },
  wheel: { width: SIZE, height: SIZE, borderRadius: RADIUS, overflow: 'hidden' },
  wedgeEmoji: { position: 'absolute', fontSize: 26, width: 32, height: 32, textAlign: 'center' },
  spinButton: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.red,
    borderWidth: 4,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  spinButtonDisabled: { opacity: 0.5 },
  error: { color: colors.danger, marginTop: spacing.lg, textAlign: 'center' },
});
