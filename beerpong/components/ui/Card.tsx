import { type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius, spacing } from '@/theme';

interface CardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  highlighted?: boolean;
}

export function Card({ children, style, highlighted }: CardProps) {
  return (
    <View style={[styles.card, highlighted && styles.highlighted, style]}>{children}</View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.backgroundCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderFaint,
    padding: spacing.md,
  },
  highlighted: {
    borderColor: colors.border,
  },
});
