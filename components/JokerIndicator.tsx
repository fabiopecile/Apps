import { View, Text, StyleSheet } from 'react-native';
import { colors, fontSizes, radii, spacing } from '@/constants/theme';

// Jokers start at 3 but can be topped up (e.g. 7-day login streak reward),
// so this shows a live count instead of a fixed-size dot row.
export function JokerIndicator({ remaining }: { remaining: number }) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>⚡</Text>
      <Text style={styles.label}>Joker:</Text>
      <Text style={styles.count}>{remaining}</Text>
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
  icon: { fontSize: fontSizes.sm },
  label: { color: colors.textMuted, fontSize: fontSizes.sm },
  count: { color: colors.red, fontWeight: '700', fontSize: fontSizes.sm },
});
