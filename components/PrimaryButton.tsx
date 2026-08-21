import { Text, StyleSheet, type StyleProp, type ViewStyle, ActivityIndicator } from 'react-native';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { colors, radii, shadows, spacing, fontSizes } from '@/constants/theme';

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'blue' | 'red' | 'outline';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function PrimaryButton({ label, onPress, variant = 'blue', disabled, loading, style }: PrimaryButtonProps) {
  const isOutline = variant === 'outline';

  return (
    <AnimatedPressable
      disabled={disabled || loading}
      onPress={onPress}
      scaleTo={0.96}
      style={[
        styles.base,
        variant === 'blue' && styles.blue,
        variant === 'red' && styles.red,
        isOutline && styles.outline,
        !isOutline && shadows.blueButton,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.white} />
      ) : (
        <Text style={[styles.label, isOutline && styles.outlineLabel]}>{label}</Text>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.lg,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blue: {
    backgroundColor: colors.blueDark,
    borderWidth: 1,
    borderColor: colors.blue,
  },
  red: {
    backgroundColor: colors.redDark,
    borderWidth: 1,
    borderColor: colors.red,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    color: colors.white,
    fontSize: fontSizes.md,
    fontWeight: '700',
  },
  outlineLabel: {
    color: colors.text,
  },
});
