import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { GridBackground } from '@/components/ui/GridBackground';
import { PressableScale } from '@/components/ui/PressableScale';
import { Reveal } from '@/components/ui/Reveal';
import { Card } from '@/components/ui/Card';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { AI_PRESETS, type AiDifficulty } from '@/lib/competition';
import { LEAGUE_OPPONENTS } from '@/lib/opponents';
import { useBeerpongStore } from '@/lib/store';
import { useFeedback } from '@/lib/feedback';
import { useT } from '@/lib/i18n';
import { colors, fonts, glow, radius, spacing } from '@/theme';

const ORDER: AiDifficulty[] = ['easy', 'medium', 'hard', 'pro'];

export default function OfflineScreen() {
  const aiDifficulty = useBeerpongStore((s) => s.aiDifficulty);
  const setAiDifficulty = useBeerpongStore((s) => s.setAiDifficulty);
  const defeatedIds = useBeerpongStore((s) => s.arcade.defeatedOpponentIds);
  const feedback = useFeedback();
  const t = useT();

  const start = (difficulty: AiDifficulty) => {
    feedback.tap();
    setAiDifficulty(difficulty);
    router.push({ pathname: '/(tabs)/arcade/match', params: { mode: 'offline', difficulty } });
  };

  return (
    <View style={styles.container}>
      <GridBackground />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.title}>{t('offline.title')}</Text>
          <View style={{ width: 26 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.intro}>{t('offline.intro')}</Text>

          {ORDER.map((id, position) => {
            const preset = AI_PRESETS[id];
            const selected = aiDifficulty === id;
            return (
              <Reveal key={id} index={position}>
              <PressableScale
                onPress={() => start(id)}
                style={[
                  styles.difficultyCard,
                  { borderColor: preset.color },
                  selected && glow('soft', preset.color),
                ]}
              >
                <View style={styles.difficultyHead}>
                  <Text style={[styles.difficultyLabel, { color: preset.color }]} selectable={false}>
                    {t(preset.labelKey)}
                  </Text>
                  {selected ? (
                    <View style={styles.selectedChip}>
                      <Text style={styles.selectedText} selectable={false}>
                        {t('offline.lastPlayed')}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.difficultyDescription} selectable={false}>
                  {t(preset.descriptionKey)}
                </Text>
                <View style={styles.meterRow}>
                  <Meter
                    label={t('offline.meter.opponent')}
                    value={preset.opponentAccuracy}
                    color={preset.color}
                  />
                  <Meter label={t('offline.meter.you')} value={preset.playerSkill} color={colors.neon} />
                </View>
                <View style={styles.startRow}>
                  <Ionicons name="play" size={14} color={preset.color} />
                  <Text style={[styles.startText, { color: preset.color }]} selectable={false}>
                    {t('offline.startWith', { coins: preset.rewardCoins })}
                  </Text>
                </View>
              </PressableScale>
              </Reveal>
            );
          })}

          <View style={styles.opponentsSection}>
            <SectionLabel>{t('offline.gallery')}</SectionLabel>
            {LEAGUE_OPPONENTS.map((opponent, position) => {
              const defeated = defeatedIds.includes(opponent.id);
              return (
                <Reveal key={opponent.id} index={position} delay={180}>
                <Card style={styles.opponentCard} highlighted={defeated}>
                  <View style={[styles.avatar, { borderColor: opponent.color }]}>
                    <Ionicons
                      name={defeated ? 'checkmark' : 'person'}
                      size={16}
                      color={opponent.color}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.opponentName} selectable={false}>
                      {opponent.name}
                    </Text>
                    <View style={styles.starsRow}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Ionicons
                          key={i}
                          name={i < opponent.difficulty ? 'star' : 'star-outline'}
                          size={11}
                          color={i < opponent.difficulty ? colors.gold : colors.textMuted}
                        />
                      ))}
                    </View>
                  </View>
                  {defeated ? (
                    <Text style={styles.defeatedText} selectable={false}>
                      {t('offline.defeated')}
                    </Text>
                  ) : null}
                </Card>
                </Reveal>
              );
            })}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Meter({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.meter}>
      <Text style={styles.meterLabel} selectable={false}>
        {label}
      </Text>
      <View style={styles.meterTrack}>
        <View style={[styles.meterFill, { width: `${Math.round(value * 100)}%`, backgroundColor: color }]} />
      </View>
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
  difficultyCard: {
    borderWidth: 1.5,
    borderRadius: radius.lg,
    backgroundColor: colors.backgroundCard,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  pressed: { opacity: 0.75 },
  difficultyHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  difficultyLabel: {
    fontFamily: fonts.headingBlack,
    fontSize: 20,
  },
  selectedChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.neonFaint,
  },
  selectedText: {
    fontFamily: fonts.label,
    fontSize: 10,
    color: colors.neon,
    letterSpacing: 0.5,
  },
  difficultyDescription: {
    fontFamily: fonts.bodyRegular,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  meterRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  meter: { flex: 1 },
  meterLabel: {
    fontFamily: fonts.label,
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  meterTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.backgroundElevated,
    overflow: 'hidden',
  },
  meterFill: {
    height: 6,
    borderRadius: 3,
  },
  startRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.md,
  },
  startText: {
    fontFamily: fonts.label,
    fontSize: 12,
    letterSpacing: 0.5,
  },
  opponentsSection: {
    marginTop: spacing.lg,
  },
  opponentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  opponentName: {
    fontFamily: fonts.label,
    fontSize: 14,
    color: colors.textPrimary,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 3,
  },
  defeatedText: {
    fontFamily: fonts.label,
    fontSize: 11,
    color: colors.neon,
  },
});
