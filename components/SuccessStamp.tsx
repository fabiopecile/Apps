import { useEffect, useRef } from 'react';
import { View, Text, Animated, Easing, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSizes, spacing } from '@/constants/theme';

// The "your tip is in" moment: a ring pulses outward while a checkmark punches
// in, then the whole thing fades. Rendered as an overlay so it never affects
// the card's layout.
export function SuccessStamp({ trigger, label }: { trigger: number; label?: string }) {
  const progress = useRef(new Animated.Value(0)).current;
  const ring = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (trigger === 0) return;
    progress.setValue(0);
    ring.setValue(0);

    const animation = Animated.parallel([
      Animated.sequence([
        Animated.spring(progress, { toValue: 1, useNativeDriver: true, friction: 5, tension: 120 }),
        Animated.delay(700),
        Animated.timing(progress, { toValue: 0, duration: 260, useNativeDriver: true }),
      ]),
      Animated.timing(ring, {
        toValue: 1,
        duration: 620,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]);

    animation.start();
    return () => animation.stop();
  }, [trigger, progress, ring]);

  if (trigger === 0) return null;

  return (
    <View pointerEvents="none" style={styles.overlay}>
      <Animated.View
        style={[
          styles.ring,
          {
            opacity: ring.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] }),
            transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [0.6, 2.2] }) }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.badge,
          {
            opacity: progress,
            transform: [
              { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) },
              { rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ['-25deg', '0deg'] }) },
            ],
          },
        ]}
      >
        <Ionicons name="checkmark" size={30} color={colors.white} />
      </Animated.View>
      {label ? (
        <Animated.View
          style={{
            opacity: progress,
            transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
          }}
        >
          <Text style={styles.label}>{label}</Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  ring: {
    position: 'absolute',
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 3,
    borderColor: colors.success,
  },
  badge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: colors.success,
    fontWeight: '800',
    fontSize: fontSizes.sm,
    marginTop: spacing.sm,
  },
});
