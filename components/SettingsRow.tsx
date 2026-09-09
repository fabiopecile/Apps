import { View, Text, Switch, Pressable, Platform, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSizes, radii, spacing } from '@/constants/theme';

// react-native-web reads the ON-state knob color from `activeThumbColor`, not
// `thumbColor`, so without this the switch fell back to the library's default
// green knob on web. The prop doesn't exist in React Native's own types.
const webThumbProps = Platform.OS === 'web' ? ({ activeThumbColor: colors.white } as object) : {};

interface SettingsRowProps {
  icon: keyof typeof Ionicons.glyphMap;
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
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={17} color={colors.textMuted} />
      </View>
      <Text style={styles.label}>{label}</Text>
      {onValueChange ? (
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: colors.surfaceAlt, true: colors.red }}
          thumbColor={colors.white}
          ios_backgroundColor={colors.surfaceAlt}
          {...webThumbProps}
        />
      ) : (
        <View style={styles.trailing}>
          {trailingText ? <Text style={styles.trailingText}>{trailingText}</Text> : null}
          {chevron ? <Ionicons name="chevron-forward" size={16} color={colors.textFaint} /> : null}
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
    paddingVertical: spacing.md + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { flex: 1, color: colors.text, fontWeight: '500', fontSize: fontSizes.md },
  trailing: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  trailingText: { color: colors.textMuted, fontSize: fontSizes.sm },
});
