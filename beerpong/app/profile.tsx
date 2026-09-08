import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { GridBackground } from '@/components/ui/GridBackground';
import { Reveal } from '@/components/ui/Reveal';
import { CountUp } from '@/components/ui/CountUp';
import { Card } from '@/components/ui/Card';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { NeonSwitch } from '@/components/ui/NeonSwitch';
import { selectCombinedStats, selectCareerProgress, useBeerpongStore } from '@/lib/store';
import { LANGUAGES, useT } from '@/lib/i18n';
import { colors, fonts, glow, radius, spacing } from '@/theme';

export default function ProfileScreen() {
  const store = useBeerpongStore();
  const combined = selectCombinedStats(store);
  const { level } = selectCareerProgress(store.arcade.careerXP);
  const soundEnabled = useBeerpongStore((s) => s.soundEnabled);
  const hapticsEnabled = useBeerpongStore((s) => s.hapticsEnabled);
  const toggleSound = useBeerpongStore((s) => s.toggleSound);
  const toggleHaptics = useBeerpongStore((s) => s.toggleHaptics);
  const language = useBeerpongStore((s) => s.language);
  const setLanguage = useBeerpongStore((s) => s.setLanguage);
  const t = useT();

  const accuracy =
    store.arcade.totalThrows > 0
      ? Math.round((store.arcade.totalCupsHit / store.arcade.totalThrows) * 100)
      : 0;

  return (
    <View style={styles.container}>
      <GridBackground />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={30} color={colors.neon} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{t('common.player')}</Text>
            <Text style={styles.levelText}>{t('hub.careerLevel', { level })}</Text>
          </View>
          <Pressable onPress={() => router.back()} hitSlop={10} style={styles.closeButton}>
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          <SectionLabel>{t('profile.overall')}</SectionLabel>
          <View style={styles.statGrid}>
            <StatCard index={0} label={t('profile.totalCups')} value={combined.totalCupsHit} />
            <StatCard index={1} label={t('common.wins')} value={combined.totalWins} />
            <StatCard index={2} label={t('profile.bestStreak')} value={combined.bestStreak} />
            <StatCard index={3} label={t('profile.games')} value={combined.gamesPlayed} />
          </View>

          <SectionLabel>{t('profile.cameraTracker')}</SectionLabel>
          <Card style={styles.modeCard}>
            <ModeRow label={t('profile.roundsPlayed')} value={`${store.camera.gamesPlayed}`} />
            <ModeRow label={t('profile.cupsTracked')} value={`${store.camera.totalCupsHit}`} />
            <ModeRow label={t('profile.bestStreak')} value={`${store.camera.bestStreak}`} />
          </Card>

          <SectionLabel>{t('profile.arcade')}</SectionLabel>
          <Card style={styles.modeCard}>
            <ModeRow label={t('profile.totalThrows')} value={`${store.arcade.totalThrows}`} />
            <ModeRow label={t('profile.accuracy')} value={`${accuracy}%`} />
            <ModeRow
              label={t('profile.record')}
              value={t('profile.recordValue', {
                wins: store.arcade.wins,
                losses: store.arcade.losses,
              })}
            />
            <ModeRow label={t('common.coins')} value={`${store.coins}`} />
          </Card>

          <SectionLabel>{t('profile.settings')}</SectionLabel>
          <Card style={styles.modeCard}>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>{t('profile.sound')}</Text>
              <NeonSwitch value={soundEnabled} onValueChange={toggleSound} />
            </View>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>{t('profile.haptics')}</Text>
              <NeonSwitch value={hapticsEnabled} onValueChange={toggleHaptics} />
            </View>
            <View style={[styles.settingRow, styles.settingRowLast]}>
              <Text style={styles.settingLabel}>{t('profile.language')}</Text>
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
            </View>
          </Card>

          <SectionLabel>{t('profile.pro')}</SectionLabel>
          <Pressable
            onPress={() => router.push('/pro')}
            style={({ pressed }) => [styles.proCard, pressed && { opacity: 0.75 }]}
          >
            <View style={styles.proIcon}>
              <Ionicons name="sparkles" size={20} color={colors.gold} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.proTitle}>{t('pro.title')}</Text>
              <Text style={styles.proSubtitle}>{t('pro.teaser')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>

          <Text style={styles.footer}>Beerpong Companion & Arcade · v1.0.0</Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function StatCard({ label, value, index }: { label: string; value: number; index: number }) {
  return (
    <Reveal index={index} style={styles.statCardWrap}>
      <View style={styles.statCard}>
        <CountUp value={value} style={styles.statValue} />
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </Reveal>
  );
}

function ModeRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.modeRow}>
      <Text style={styles.modeLabel}>{label}</Text>
      <Text style={styles.modeValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundElevated,
    borderWidth: 1.5,
    borderColor: colors.border,
    ...glow('soft'),
  },
  name: {
    fontFamily: fonts.headingBlack,
    fontSize: 22,
    color: colors.textPrimary,
  },
  levelText: {
    fontFamily: fonts.label,
    fontSize: 13,
    color: colors.neon,
    marginTop: 2,
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
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCardWrap: {
    flexBasis: '47%',
    flexGrow: 1,
  },
  statCard: {
    backgroundColor: colors.backgroundCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderFaint,
    padding: spacing.md,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: fonts.numeric,
    fontSize: 28,
    color: colors.neon,
  },
  statLabel: {
    fontFamily: fonts.label,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  modeCard: {
    marginBottom: spacing.lg,
  },
  modeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderFaint,
  },
  modeLabel: {
    fontFamily: fonts.bodyRegular,
    color: colors.textSecondary,
    fontSize: 14,
  },
  modeValue: {
    fontFamily: fonts.label,
    color: colors.textPrimary,
    fontSize: 14,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderFaint,
  },
  settingRowLast: {
    borderBottomWidth: 0,
  },
  settingLabel: {
    fontFamily: fonts.body,
    color: colors.textPrimary,
    fontSize: 15,
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
  proCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.gold,
    backgroundColor: colors.backgroundCard,
    marginBottom: spacing.lg,
    ...glow('soft', colors.gold),
  },
  proIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundElevated,
  },
  proTitle: {
    fontFamily: fonts.headingBlack,
    fontSize: 17,
    color: colors.gold,
  },
  proSubtitle: {
    fontFamily: fonts.bodyRegular,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  footer: {
    textAlign: 'center',
    fontFamily: fonts.bodyRegular,
    color: colors.textMuted,
    fontSize: 11,
    marginTop: spacing.sm,
  },
});
