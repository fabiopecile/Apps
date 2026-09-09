import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PopIn } from '@/components/PopIn';
import { colors, fontSizes, radii, spacing, typography } from '@/constants/theme';

export interface Stat {
  value: string;
  label: string;
  accent?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
}

export function StatRow({ stats }: { stats: Stat[] }) {
  return (
    <View style={styles.container}>
      {stats.map((stat, i) => (
        <PopIn key={stat.label} delay={i * 70} style={[styles.item, i < stats.length - 1 && styles.divider]}>
          <View style={styles.valueRow}>
            {stat.icon ? (
              <Ionicons name={stat.icon} size={15} color={stat.iconColor ?? colors.textMuted} />
            ) : null}
            <Text style={[styles.value, stat.accent && styles.valueAccent]}>{stat.value}</Text>
          </View>
          <Text style={styles.label}>{stat.label}</Text>
        </PopIn>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  item: { flex: 1, alignItems: 'center', gap: 5, justifyContent: 'center' },
  divider: { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: colors.border },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  value: { color: colors.text, fontSize: fontSizes.xl, ...typography.heading, fontVariant: ['tabular-nums'] },
  valueAccent: { color: colors.red },
  label: { color: colors.textFaint, fontSize: 10, ...typography.label },
});
