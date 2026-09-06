import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { GridBackground } from '@/components/ui/GridBackground';
import { GlowButton } from '@/components/ui/GlowButton';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { ALL_DIVISIONS, getDivision } from '@/lib/competition';
import { useBeerpongStore } from '@/lib/store';
import { colors, fonts, glow, radius, spacing } from '@/theme';

export default function RivalsScreen() {
  const rivals = useBeerpongStore((s) => s.rivals);
  const division = getDivision(rivals.division);

  return (
    <View style={styles.container}>
      <GridBackground />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.title}>Division Rivals</Text>
          <View style={{ width: 26 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={[styles.currentCard, { borderColor: division.color }, glow('soft', division.color)]}>
            <View style={[styles.currentBadge, { borderColor: division.color }]}>
              <Text style={[styles.currentBadgeText, { color: division.color }]} selectable={false}>
                {division.id}
              </Text>
            </View>
            <Text style={[styles.currentName, { color: division.color }]} selectable={false}>
              {division.name}
            </Text>

            <View style={styles.pipRow}>
              {Array.from({ length: division.winsToPromote }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.pip,
                    {
                      backgroundColor: i < rivals.divisionWins ? division.color : colors.backgroundElevated,
                      borderColor: i < rivals.divisionWins ? division.color : colors.borderFaint,
                    },
                  ]}
                />
              ))}
            </View>
            <Text style={styles.currentHint} selectable={false}>
              {rivals.divisionWins}/{division.winsToPromote} Siege bis zum Aufstieg ·{' '}
              {division.lossesToRelegate - rivals.divisionLosses} Niederlagen bis zum Abstieg
            </Text>

            <View style={styles.balanceRow}>
              <Balance label="Siege" value={rivals.wins} color={colors.neon} />
              <Balance label="Niederlagen" value={rivals.losses} color={colors.danger} />
              <Balance label="Beste Div." value={rivals.bestDivision} color={colors.gold} />
            </View>

            <GlowButton
              label="Gegner suchen"
              size="lg"
              onPress={() => router.push({ pathname: '/(tabs)/arcade/match', params: { mode: 'rivals' } })}
              style={styles.playButton}
            />
            <Text style={styles.matchmakingNote} selectable={false}>
              Gegner werden aktuell lokal simuliert — Skill passend zu deiner Division.
            </Text>
          </View>

          <View style={styles.ladderSection}>
            <SectionLabel>Leiter</SectionLabel>
            {ALL_DIVISIONS.map((entry) => {
              const isCurrent = entry.id === rivals.division;
              const reached = entry.id >= rivals.bestDivision;
              return (
                <View
                  key={entry.id}
                  style={[
                    styles.ladderRow,
                    isCurrent && { borderColor: entry.color, backgroundColor: colors.backgroundCard },
                  ]}
                >
                  <View style={[styles.ladderBadge, { borderColor: reached ? entry.color : colors.borderFaint }]}>
                    <Text
                      style={[
                        styles.ladderBadgeText,
                        { color: reached ? entry.color : colors.textMuted },
                      ]}
                      selectable={false}
                    >
                      {entry.id}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[styles.ladderName, !reached && { color: colors.textMuted }]}
                      selectable={false}
                    >
                      {entry.name}
                    </Text>
                    <Text style={styles.ladderMeta} selectable={false}>
                      {entry.winsToPromote} Siege zum Aufstieg · +{entry.winCoins} Coins pro Sieg
                    </Text>
                  </View>
                  {isCurrent ? (
                    <View style={[styles.hereChip, { borderColor: entry.color }]}>
                      <Text style={[styles.hereText, { color: entry.color }]} selectable={false}>
                        Hier
                      </Text>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Balance({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.balance}>
      <Text style={[styles.balanceValue, { color }]} selectable={false}>
        {value}
      </Text>
      <Text style={styles.balanceLabel} selectable={false}>
        {label}
      </Text>
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
    paddingBottom: spacing.md,
  },
  title: {
    fontFamily: fonts.headingBlack,
    fontSize: 22,
    color: colors.textPrimary,
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  currentCard: {
    borderWidth: 1.5,
    borderRadius: radius.xl,
    backgroundColor: colors.backgroundCard,
    padding: spacing.lg,
    alignItems: 'center',
  },
  currentBadge: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundElevated,
  },
  currentBadgeText: {
    fontFamily: fonts.numeric,
    fontSize: 34,
  },
  currentName: {
    fontFamily: fonts.headingBlack,
    fontSize: 20,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  pipRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: spacing.md,
  },
  pip: {
    width: 26,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
  },
  currentHint: {
    fontFamily: fonts.bodyRegular,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  balance: { alignItems: 'center' },
  balanceValue: {
    fontFamily: fonts.numeric,
    fontSize: 22,
  },
  balanceLabel: {
    fontFamily: fonts.label,
    fontSize: 10,
    color: colors.textSecondary,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  playButton: { width: '100%' },
  matchmakingNote: {
    fontFamily: fonts.bodyRegular,
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  ladderSection: { marginTop: spacing.xl },
  ladderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
    marginBottom: 4,
  },
  ladderBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ladderBadgeText: {
    fontFamily: fonts.numeric,
    fontSize: 14,
  },
  ladderName: {
    fontFamily: fonts.label,
    fontSize: 13,
    color: colors.textPrimary,
  },
  ladderMeta: {
    fontFamily: fonts.bodyRegular,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  hereChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  hereText: {
    fontFamily: fonts.label,
    fontSize: 10,
    letterSpacing: 0.5,
  },
});
