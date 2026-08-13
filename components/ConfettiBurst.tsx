import { useEffect, useRef } from 'react';
import { View, Animated, Easing, Dimensions, StyleSheet } from 'react-native';
import { colors } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PIECE_COLORS = [colors.success, colors.gold, colors.red];
const PIECE_COUNT = 24;

interface Piece {
  id: number;
  left: number;
  color: string;
  rounded: boolean;
  delay: number;
  duration: number;
  drift: number;
}

function generatePieces(): Piece[] {
  return Array.from({ length: PIECE_COUNT }, (_, i) => ({
    id: i,
    left: Math.random() * SCREEN_WIDTH,
    color: PIECE_COLORS[Math.floor(Math.random() * PIECE_COLORS.length)],
    rounded: Math.random() > 0.5,
    delay: Math.random() * 150,
    duration: 900 + Math.random() * 500,
    drift: (Math.random() - 0.5) * 80,
  }));
}

export function ConfettiBurst({ trigger }: { trigger: number }) {
  const pieces = useRef<Piece[]>([]);
  const anims = useRef<Animated.Value[]>([]);

  useEffect(() => {
    if (trigger === 0) return;
    pieces.current = generatePieces();
    anims.current = pieces.current.map(() => new Animated.Value(0));

    const animations = anims.current.map((anim, i) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: pieces.current[i].duration,
        delay: pieces.current[i].delay,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      })
    );

    Animated.stagger(10, animations).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  if (trigger === 0) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.current.map((piece, i) => {
        const anim = anims.current[i];
        if (!anim) return null;
        return (
          <Animated.View
            key={`${trigger}-${piece.id}`}
            style={[
              styles.piece,
              {
                left: piece.left,
                backgroundColor: piece.color,
                borderRadius: piece.rounded ? 5 : 0,
                opacity: anim.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] }),
                transform: [
                  { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -260] }) },
                  { translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [0, piece.drift] }) },
                  { rotate: anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '540deg'] }) },
                ],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  piece: { position: 'absolute', bottom: 40, width: 10, height: 10 },
});
