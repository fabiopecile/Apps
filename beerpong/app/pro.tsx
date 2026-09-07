import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { GridBackground } from '@/components/ui/GridBackground';
import { GlowButton } from '@/components/ui/GlowButton';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { useBeerpongStore } from '@/lib/store';
import { useFeedback } from '@/lib/feedback';
import { useT, type TranslationKey } from '@/lib/i18n';
import { colors, fonts, glow, radius, spacing } from '@/theme';

const FEATURES: {
  icon: keyof typeof Ionicons.glyphMap;
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
}[] = [
  { icon: 'scan', titleKey: 'pro.feature.detect.title', bodyKey: 'pro.feature.detect.body' },
  { icon: 'stats-chart', titleKey: 'pro.feature.stats.title', bodyKey: 'pro.feature.stats.body' },
  { icon: 'videocam', titleKey: 'pro.feature.replay.title', bodyKey: 'pro.feature.replay.body' },
  { icon: 'cloud-upload', titleKey: 'pro.feature.sync.title', bodyKey: 'pro.feature.sync.body' },
  { icon: 'color-palette', titleKey: 'pro.feature.skins.title', bodyKey: 'pro.feature.skins.body' },
];

export default function ProScreen() {
  const notifyRequested = useBeerpongStore((s) => s.proNotifyRequested);
  const setNotifyRequested = useBeerpongStore((s) => s.setProNotifyRequested);
  const feedback = useFeedback();
  const t = useT();

  return (
    <View style={styles.container}>
      <GridBackground />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('pro.title')}</Text>
          <Pressable onPress={() => router.back()} hitSlop={10} style={styles.closeButton}>
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={[styles.hero, glow('soft', colors.gold)]}>
            <View style={styles.heroIcon}>
              <Ionicons name="sparkles" size={30} color={colors.gold} />
            </View>
            <Text style={styles.heroTitle}>{t('pro.heroTitle')}</Text>
            <Text style={styles.heroBody}>{t('pro.heroBody')}</Text>
            <View style={styles.soonChip}>
              <Text style={styles.soonText} selectable={false}>
                {t('pro.inDevelopment')}
              </Text>
            </View>
          </View>

          <SectionLabel>{t('pro.whatsInside')}</SectionLabel>
          {FEATURES.map((feature) => (
            <View key={feature.titleKey} style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Ionicons name={feature.icon} size={18} color={colors.gold} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.featureTitle}>{t(feature.titleKey)}</Text>
                <Text style={styles.featureBody}>{t(feature.bodyKey)}</Text>
              </View>
            </View>
          ))}

          <SectionLabel>{t('pro.howItWorks')}</SectionLabel>
          <View style={styles.explainCard}>
            <Text style={styles.explainBody}>{t('pro.explainBody')}</Text>
          </View>

          <GlowButton
            label={notifyRequested ? t('pro.notifyOn') : t('pro.notifyCta')}
            variant={notifyRequested ? 'outline' : 'filled'}
            accent={colors.gold}
            size="lg"
            onPress={() => {
              feedback.tap();
              setNotifyRequested(!notifyRequested);
            }}
            style={styles.notifyButton}
          />
          <Text style={styles.disclaimer}>{t('pro.disclaimer')}</Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    fontFamily: fonts.headingBlack,
    fontSize: 22,
    color: colors.gold,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundElevated,
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  hero: {
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.gold,
    borderRadius: radius.xl,
    backgroundColor: colors.backgroundCard,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  heroIcon: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 2,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundElevated,
  },
  heroTitle: {
    fontFamily: fonts.headingBlack,
    fontSize: 22,
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  heroBody: {
    fontFamily: fonts.bodyRegular,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
  },
  soonChip: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.gold,
  },
  soonText: {
    fontFamily: fonts.label,
    fontSize: 11,
    color: colors.gold,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderFaint,
    backgroundColor: colors.backgroundCard,
    marginBottom: spacing.sm,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTitle: {
    fontFamily: fonts.label,
    fontSize: 14,
    color: colors.textPrimary,
  },
  featureBody: {
    fontFamily: fonts.bodyRegular,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  explainCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderFaint,
    backgroundColor: colors.backgroundCard,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  explainBody: {
    fontFamily: fonts.bodyRegular,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  notifyButton: {
    width: '100%',
  },
  disclaimer: {
    fontFamily: fonts.bodyRegular,
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
