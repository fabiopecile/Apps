import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius, spacing } from '@/theme';
import { NeonSwitch } from '@/components/ui/NeonSwitch';
import { useBeerpongStore, type HouseRules } from '@/lib/store';

interface HouseRulesPanelProps {
  visible: boolean;
  onClose: () => void;
}

const RULES: { key: keyof HouseRules; title: string; description: string }[] = [
  { key: 'reRacks', title: 'Re-Racks', description: 'Cups dürfen bis zu zweimal neu aufgestellt werden.' },
  { key: 'island', title: 'Island', description: 'Letzter Cup ohne Nachbarn zählt doppelt.' },
  { key: 'redemption', title: 'Redemption', description: 'Verlierendes Team bekommt einen letzten Wurf.' },
];

export function HouseRulesPanel({ visible, onClose }: HouseRulesPanelProps) {
  const houseRules = useBeerpongStore((s) => s.houseRules);
  const toggleHouseRule = useBeerpongStore((s) => s.toggleHouseRule);
  const translateY = useSharedValue(400);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    translateY.value = withTiming(visible ? 0 : 400, { duration: 320 });
    backdropOpacity.value = withTiming(visible ? 1 : 0, { duration: 260 });
  }, [visible, translateY, backdropOpacity]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={visible ? 'auto' : 'none'}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <Animated.View style={[styles.sheet, sheetStyle]}>
        <View style={styles.handle} />
        <View style={styles.headerRow}>
          <Text style={styles.title}>House Rules</Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </Pressable>
        </View>
        {RULES.map((rule) => (
          <View key={rule.key} style={styles.ruleRow}>
            <View style={styles.ruleText}>
              <Text style={styles.ruleTitle}>{rule.title}</Text>
              <Text style={styles.ruleDescription}>{rule.description}</Text>
            </View>
            <NeonSwitch
              value={houseRules[rule.key]}
              onValueChange={() => toggleHouseRule(rule.key)}
            />
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: colors.overlay,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.backgroundElevated,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderFaint,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontFamily: fonts.headingBlack,
    fontSize: 22,
    color: colors.textPrimary,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderFaint,
  },
  ruleText: {
    flex: 1,
    marginRight: spacing.md,
  },
  ruleTitle: {
    fontFamily: fonts.label,
    fontSize: 15,
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  ruleDescription: {
    fontFamily: fonts.bodyRegular,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
