import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { GridBackground } from '@/components/ui/GridBackground';
import { GlowButton } from '@/components/ui/GlowButton';
import { useBeerpongStore, type TeamIndex } from '@/lib/store';
import { useFeedback } from '@/lib/feedback';
import { useT } from '@/lib/i18n';
import { colors, fonts, glow, radius, spacing } from '@/theme';

export default function PassPlayScreen() {
  const teams = useBeerpongStore((s) => s.tracker.teams);
  const setTeamName = useBeerpongStore((s) => s.trackerSetTeamName);
  const feedback = useFeedback();
  const t = useT();

  const start = () => {
    feedback.tap();
    router.push({ pathname: '/(tabs)/arcade/match', params: { mode: 'passplay' } });
  };

  return (
    <View style={styles.container}>
      <GridBackground />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.title}>Pass & Play</Text>
          <View style={{ width: 26 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.intro}>{t('passplay.intro')}</Text>

          <View style={styles.playersCard}>
            {([0, 1] as TeamIndex[]).map((index) => (
              <View key={index} style={styles.playerRow}>
                <View
                  style={[
                    styles.playerBadge,
                    { borderColor: index === 0 ? colors.neon : colors.gold },
                  ]}
                >
                  <Text
                    style={[
                      styles.playerBadgeText,
                      { color: index === 0 ? colors.neon : colors.gold },
                    ]}
                    selectable={false}
                  >
                    {index + 1}
                  </Text>
                </View>
                <TextInput
                  value={teams[index].name}
                  onChangeText={(text) => setTeamName(index, text.slice(0, 14))}
                  style={styles.playerInput}
                  maxLength={14}
                  selectTextOnFocus
                  placeholder={t('passplay.playerN', { n: index + 1 })}
                  placeholderTextColor={colors.textMuted}
                />
                <Text style={styles.playerHint} selectable={false}>
                  {index === 0 ? t('passplay.throwsUp') : t('passplay.throwsDown')}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.rulesCard}>
            <Rule icon="hand-left" text={t('passplay.rule.swipe')} />
            <Rule icon="tennisball" text={t('passplay.rule.bounce')} />
            <Rule icon="grid" text={t('passplay.rule.reRack')} />
            <Rule icon="swap-horizontal" text={t('passplay.rule.camera')} />
          </View>

          <GlowButton
            label={t('passplay.startGame')}
            size="lg"
            onPress={start}
            style={styles.startButton}
          />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Rule({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.rule}>
      <Ionicons name={icon} size={16} color={colors.neon} />
      <Text style={styles.ruleText} selectable={false}>
        {text}
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
  intro: {
    fontFamily: fonts.bodyRegular,
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  playersCard: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.backgroundCard,
    padding: spacing.md,
    gap: spacing.md,
    ...glow('soft'),
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  playerBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerBadgeText: {
    fontFamily: fonts.numeric,
    fontSize: 16,
  },
  playerInput: {
    flex: 1,
    fontFamily: fonts.label,
    fontSize: 16,
    color: colors.textPrimary,
    padding: 0,
  },
  playerHint: {
    fontFamily: fonts.bodyRegular,
    fontSize: 11,
    color: colors.textMuted,
  },
  rulesCard: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  rule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  ruleText: {
    flex: 1,
    fontFamily: fonts.bodyRegular,
    fontSize: 13,
    color: colors.textSecondary,
  },
  startButton: {
    marginTop: spacing.xl,
  },
});
