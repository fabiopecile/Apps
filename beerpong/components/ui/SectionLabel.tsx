import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, spacing } from '@/theme';

export function SectionLabel({ children }: { children: string }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.bar} />
      <Text style={styles.text}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  bar: {
    width: 3,
    height: 14,
    backgroundColor: colors.neon,
    borderRadius: 2,
  },
  text: {
    fontFamily: fonts.label,
    color: colors.textSecondary,
    fontSize: 13,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
});
