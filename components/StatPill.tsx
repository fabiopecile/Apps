import { View, Text, StyleSheet } from 'react-native';
import { PopIn } from '@/components/PopIn';
import { colors, fontSizes, spacing } from '@/constants/theme';

export function StatRow({ stats }: { stats: { value: string; label: string; accent?: boolean }[] }) {
  return (
    <View style={styles.container}>
      {stats.map((stat, i) => (
        <PopIn key={stat.label} delay={i * 70} style={[styles.item, i < stats.length - 1 && styles.divider]}>
          <Text style={[styles.value, stat.accent && styles.valueAccent]}>{stat.value}</Text>
          <Text style={styles.label}>{stat.label.toUpperCase()}</Text>
        </PopIn>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  item: { flex: 1, alignItems: 'center', gap: 4, justifyContent: 'center' },
  divider: { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: colors.border },
  value: { color: colors.white, fontSize: fontSizes.xl, fontWeight: '800' },
  valueAccent: { color: colors.red },
  label: { color: colors.textMuted, fontSize: 10, fontWeight: '600', letterSpacing: 0.5 },
});
