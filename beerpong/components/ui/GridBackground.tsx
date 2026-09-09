import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { colors } from '@/theme';

const LINES = 14;

export function GridBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={['#0A0A0A', '#111312', '#0A0A0A']}
        style={StyleSheet.absoluteFill}
      />
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        {Array.from({ length: LINES }).map((_, i) => (
          <Line
            key={`h-${i}`}
            x1="0%"
            y1={`${(i / LINES) * 100}%`}
            x2="100%"
            y2={`${(i / LINES) * 100}%`}
            stroke={colors.backgroundGrid}
            strokeWidth={1}
          />
        ))}
        {Array.from({ length: LINES }).map((_, i) => (
          <Line
            key={`v-${i}`}
            x1={`${(i / LINES) * 100}%`}
            y1="0%"
            x2={`${(i / LINES) * 100}%`}
            y2="100%"
            stroke={colors.backgroundGrid}
            strokeWidth={1}
          />
        ))}
      </Svg>
      <View style={styles.vignetteTop} />
      <View style={styles.vignetteBottom} />
    </View>
  );
}

const styles = StyleSheet.create({
  vignetteTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 160,
    backgroundColor: colors.background,
    opacity: 0.5,
  },
  vignetteBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 160,
    backgroundColor: colors.background,
    opacity: 0.35,
  },
});
