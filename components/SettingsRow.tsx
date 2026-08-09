import { View, Text, Switch, Pressable, StyleSheet } from 'react-native';
import { colors, fontSizes, spacing } from '@/constants/theme';

interface SettingsRowProps {
  icon: string;
  label: string;
  value?: boolean;
  onValueChange?: (value: boolean) => void;
  trailingText?: string;
  onPress?: () => void;
  chevron?: boolean;
}

export function SettingsRow({ icon, label, value, onValueChange, trailingText, onPress, chevron }: SettingsRowProps) {
  const content = (
    <View style={styles.row}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.label}>{label}</Text>
      {onValueChange ? (
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: colors.surfaceAlt, true: colors.red }}
          thumbColor={colors.white}
        />
      ) : (
        <View style={styles.trailing}>
          {trailingText ? <Text style={styles.trailingText}>{trailingText}</Text> : null}
          {chevron ? <Text style={styles.chevron}>›</Text> : null}
        </View>
      )}
    </View>
  );

  if (onPress) {
    return <Pressable onPress={onPress}>{content}</Pressable>;
  }
  return content;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  icon: { fontSize: 18, width: 22, textAlign: 'center' },
  label: { flex: 1, color: colors.text, fontWeight: '600', fontSize: fontSizes.md },
  trailing: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  trailingText: { color: colors.textMuted, fontSize: fontSizes.sm },
  chevron: { color: colors.textFaint, fontSize: fontSizes.lg },
});
