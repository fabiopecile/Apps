import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { GridBackground } from '@/components/ui/GridBackground';
import { GlowButton } from '@/components/ui/GlowButton';
import { useBeerpongStore } from '@/lib/store';
import { useFeedback } from '@/lib/feedback';
import { LANGUAGES, useT, type TranslationKey } from '@/lib/i18n';
import { colors, fonts, glow, radius, spacing } from '@/theme';

const SLIDES: {
  icon: keyof typeof Ionicons.glyphMap;
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
  accent: string;
}[] = [
  {
    icon: 'camera',
    titleKey: 'onboarding.tracker.title',
    bodyKey: 'onboarding.tracker.body',
    accent: colors.neon,
  },
  {
    icon: 'game-controller',
    titleKey: 'onboarding.arcade.title',
    bodyKey: 'onboarding.arcade.body',
    accent: colors.neonAlt,
  },
  {
    icon: 'trophy',
    titleKey: 'onboarding.progress.title',
    bodyKey: 'onboarding.progress.body',
    accent: colors.gold,
  },
];

export default function OnboardingScreen() {
  const [index, setIndex] = useState(0);
  const completeOnboarding = useBeerpongStore((s) => s.completeOnboarding);
  const language = useBeerpongStore((s) => s.language);
  const setLanguage = useBeerpongStore((s) => s.setLanguage);
  const feedback = useFeedback();
  const t = useT();
  const { width } = useWindowDimensions();

  const slide = SLIDES[index];
  const isLast = index === SLIDES.length - 1;

  const finish = () => {
    completeOnboarding();
    router.replace('/(tabs)/camera');
  };

  const next = () => {
    feedback.tap();
    if (isLast) finish();
    else setIndex((i) => i + 1);
  };

  return (
    <View style={styles.container}>
      <GridBackground />
      <SafeAreaView style={styles.safe}>
        <View style={styles.topRow}>
          <View style={styles.languageRow}>
            {LANGUAGES.map((entry) => {
              const active = entry.id === language;
              return (
                <Pressable
                  key={entry.id}
                  onPress={() => setLanguage(entry.id)}
                  style={[styles.languageChip, active && styles.languageChipActive]}
                >
                  <Text
                    style={[styles.languageText, active && styles.languageTextActive]}
                    selectable={false}
                  >
                    {entry.flag} {entry.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Pressable onPress={finish} hitSlop={10}>
            <Text style={styles.skip} selectable={false}>
              {t('onboarding.skip')}
            </Text>
          </Pressable>
        </View>

        <Animated.View
          key={index}
          entering={FadeIn.duration(320)}
          exiting={FadeOut.duration(160)}
          style={styles.slide}
        >
          <View
            style={[
              styles.iconRing,
              { borderColor: slide.accent, width: width * 0.4, height: width * 0.4 },
              glow('medium', slide.accent),
            ]}
          >
            <Ionicons name={slide.icon} size={width * 0.16} color={slide.accent} />
          </View>
          <Text style={styles.title}>{t(slide.titleKey)}</Text>
          <Text style={styles.body}>{t(slide.bodyKey)}</Text>
        </Animated.View>

        <View style={styles.bottom}>
          <View style={styles.dots}>
            {SLIDES.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i === index && { backgroundColor: colors.neon, width: 22 },
                ]}
              />
            ))}
          </View>
          <GlowButton
            label={isLast ? t('onboarding.start') : t('common.continue')}
            size="lg"
            onPress={next}
            style={styles.button}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  safe: { flex: 1, paddingHorizontal: spacing.lg },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
  },
  languageRow: {
    flexDirection: 'row',
    gap: 6,
  },
  languageChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderFaint,
    backgroundColor: colors.backgroundElevated,
  },
  languageChipActive: {
    borderColor: colors.neon,
    backgroundColor: colors.neonFaint,
  },
  languageText: {
    fontFamily: fonts.label,
    fontSize: 12,
    color: colors.textSecondary,
  },
  languageTextActive: {
    color: colors.neon,
  },
  skip: {
    fontFamily: fonts.label,
    fontSize: 13,
    color: colors.textMuted,
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  iconRing: {
    borderRadius: 999,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundCard,
    marginBottom: spacing.lg,
  },
  title: {
    fontFamily: fonts.headingBlack,
    fontSize: 28,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  body: {
    fontFamily: fonts.bodyRegular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  bottom: {
    paddingBottom: spacing.lg,
    gap: spacing.lg,
    alignItems: 'center',
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  button: { width: '100%' },
});
