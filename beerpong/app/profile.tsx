import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { GridBackground } from '@/components/ui/GridBackground';
import { Card } from '@/components/ui/Card';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { NeonSwitch } from '@/components/ui/NeonSwitch';
import { selectCombinedStats, selectCareerProgress, useBeerpongStore } from '@/lib/store';
import { colors, fonts, glow, radius, spacing } from '@/theme';

export default function ProfileScreen() {
  const store = useBeerpongStore();
  const combined = selectCombinedStats(store);
  const { level } = selectCareerProgress(store.arcade.careerXP);
  const soundEnabled = useBeerpongStore((s) => s.soundEnabled);
  const hapticsEnabled = useBeerpongStore((s) => s.hapticsEnabled);
  const toggleSound = useBeerpongStore((s) => s.toggleSound);
  const toggleHaptics = useBeerpongStore((s) => s.toggleHaptics);

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
            <Text style={styles.name}>Spieler</Text>
            <Text style={styles.levelText}>Career Level {level}</Text>
          </View>
          <Pressable onPress={() => router.back()} hitSlop={10} style={styles.closeButton}>
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          <SectionLabel>Gesamtstatistik</SectionLabel>
          <View style={styles.statGrid}>
            <StatCard label="Cups gesamt" value={combined.totalCupsHit} />
            <StatCard label="Siege" value={combined.totalWins} />
            <StatCard label="Beste Serie" value={combined.bestStreak} />
            <StatCard label="Spiele" value={combined.gamesPlayed} />
          </View>

          <SectionLabel>Kamera-Tracker</SectionLabel>
          <Card style={styles.modeCard}>
            <ModeRow label="Runden gespielt" value={`${store.camera.gamesPlayed}`} />
            <ModeRow label="Cups getrackt" value={`${store.camera.totalCupsHit}`} />
            <ModeRow label="Beste Serie" value={`${store.camera.bestStreak}`} />
          </Card>

          <SectionLabel>Arcade</SectionLabel>
          <Card style={styles.modeCard}>
            <ModeRow label="Würfe gesamt" value={`${store.arcade.totalThrows}`} />
            <ModeRow label="Trefferquote" value={`${accuracy}%`} />
            <ModeRow label="Bilanz" value={`${store.arcade.wins}S / ${store.arcade.losses}N`} />
            <ModeRow label="Coins" value={`${store.coins}`} />
          </Card>

          <SectionLabel>Einstellungen</SectionLabel>
          <Card style={styles.modeCard}>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Sound-Effekte</Text>
              <NeonSwitch value={soundEnabled} onValueChange={toggleSound} />
            </View>
            <View style={[styles.settingRow, styles.settingRowLast]}>
              <Text style={styles.settingLabel}>Haptisches Feedback</Text>
              <NeonSwitch value={hapticsEnabled} onValueChange={toggleHaptics} />
            </View>
          </Card>

          <Text style={styles.footer}>Beerpong Companion & Arcade · v1.0.0</Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
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
  statCard: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: colors.backgroundCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderFaint,
    padding: spacing.md,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: fonts.displayBlack,
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
  footer: {
    textAlign: 'center',
    fontFamily: fonts.bodyRegular,
    color: colors.textMuted,
    fontSize: 11,
    marginTop: spacing.sm,
  },
});
