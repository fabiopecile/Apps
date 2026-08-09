import { View, Text, StyleSheet } from 'react-native';
import { colors, fontSizes, radii, spacing } from '@/constants/theme';
import { MAX_JOKERS } from '@/constants/game';

export function JokerIndicator({ remaining }: { remaining: number }) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Joker:</Text>
      <View style={styles.dots}>
        {Array.from({ length: MAX_JOKERS }).map((_, i) => (
          <View key={i} style={[styles.dot, i < remaining && styles.dotActive]} />
        ))}
      </View>
      <Text style={styles.count}>
        {remaining}/{MAX_JOKERS}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  label: { color: colors.textMuted, fontSize: fontSizes.sm },
  dots: { flexDirection: 'row', gap: 3 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.surfaceAlt },
  dotActive: { backgroundColor: colors.red },
  count: { color: colors.red, fontWeight: '700', fontSize: fontSizes.sm },
});
