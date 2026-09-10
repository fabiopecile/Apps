import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { GridBackground } from '@/components/ui/GridBackground';
import { GlowButton } from '@/components/ui/GlowButton';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { ONLINE_AVAILABLE } from '@/lib/onlineConfig';
import {
  CUP_COUNT_CHOICES,
  ROOM_CODE_LENGTH,
  isRoomCode,
  makeRoomCode,
  normaliseRoomCode,
} from '@/lib/onlineProtocol';
import { DEFAULT_TEAM_NAMES, useBeerpongStore } from '@/lib/store';
import { useFeedback } from '@/lib/feedback';
import { useT } from '@/lib/i18n';
import { colors, fonts, glow, radius, spacing } from '@/theme';

/**
 * Opening or joining a game at another table.
 *
 * Four characters and nothing else: no account, no friend list, no lobby to
 * browse. The two sides are already talking to each other — that is how they
 * agreed to play — so the app only has to give them something to say.
 */
export default function OnlineLobbyScreen() {
  const t = useT();
  const feedback = useFeedback();
  const teamName = useBeerpongStore((s) => s.tracker.teams[0].name);

  // Only carried over if they actually chose it: prefilling "Team 1" would put
  // that name on both sides of the table.
  const [name, setName] = useState(DEFAULT_TEAM_NAMES.includes(teamName) ? '' : teamName);
  const [cups, setCups] = useState<number>(10);
  const [code, setCode] = useState('');

  const open = () => {
    feedback.tap();
    router.push({
      pathname: '/(tabs)/camera/room',
      params: { code: makeRoomCode(), seat: '0', create: '1', name: name.trim(), cups: String(cups) },
    });
  };

  const join = () => {
    feedback.tap();
    router.push({
      pathname: '/(tabs)/camera/room',
      params: { code: normaliseRoomCode(code), seat: '1', create: '0', name: name.trim() },
    });
  };

  return (
    <View style={styles.container}>
      <GridBackground />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.title}>{t('online.title')}</Text>
          <View style={{ width: 26 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.intro}>{t('online.intro')}</Text>

          {!ONLINE_AVAILABLE ? (
            // Honest rather than broken: without an address there is nothing to
            // connect to, and saying which one is missing is the whole fix.
            <View style={[styles.card, styles.warnCard]}>
              <Ionicons name="construct" size={22} color={colors.gold} />
              <Text style={styles.cardTitle}>{t('online.notSetUpTitle')}</Text>
              <Text style={styles.cardBody}>{t('online.notSetUpBody')}</Text>
            </View>
          ) : (
            <>
              <SectionLabel>{t('online.teamName')}</SectionLabel>
              <TextInput
                value={name}
                onChangeText={setName}
                maxLength={16}
                style={styles.input}
                placeholder={t('online.namePlaceholder')}
                placeholderTextColor={colors.textMuted}
                selectionColor={colors.neon}
              />

              <SectionLabel>{t('online.createTitle')}</SectionLabel>
              <View style={styles.card}>
                <Text style={styles.cardBody}>{t('online.createBody')}</Text>
                <Text style={styles.cupsLabel}>{t('online.cupsLabel')}</Text>
                <View style={styles.cupsRow}>
                  {CUP_COUNT_CHOICES.map((choice) => (
                    <Pressable
                      key={choice}
                      onPress={() => {
                        feedback.tap();
                        setCups(choice);
                      }}
                      style={[styles.cupsChip, cups === choice && styles.cupsChipOn]}
                    >
                      <Text
                        style={[styles.cupsText, cups === choice && styles.cupsTextOn]}
                        selectable={false}
                      >
                        {choice}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <GlowButton label={t('online.start')} size="sm" onPress={open} />
              </View>

              <SectionLabel>{t('online.joinTitle')}</SectionLabel>
              <View style={styles.card}>
                <Text style={styles.cardBody}>{t('online.joinBody')}</Text>
                <TextInput
                  value={code}
                  onChangeText={(raw) => setCode(normaliseRoomCode(raw))}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={ROOM_CODE_LENGTH}
                  style={[styles.input, styles.codeInput]}
                  placeholder={t('online.codePlaceholder')}
                  placeholderTextColor={colors.textMuted}
                  selectionColor={colors.neon}
                />
                <GlowButton
                  label={t('online.join')}
                  size="sm"
                  variant="outline"
                  disabled={!isRoomCode(code)}
                  onPress={join}
                />
              </View>
            </>
          )}
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
  title: {
    fontFamily: fonts.headingBlack,
    fontSize: 20,
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
    lineHeight: 19,
    marginBottom: spacing.md,
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundCard,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  warnCard: {
    alignItems: 'center',
    borderColor: colors.gold,
    ...glow('soft', colors.gold),
  },
  cardTitle: {
    fontFamily: fonts.label,
    fontSize: 14,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  cardBody: {
    fontFamily: fonts.bodyRegular,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  input: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundElevated,
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  codeInput: {
    fontFamily: fonts.numeric,
    fontSize: 26,
    letterSpacing: 8,
    textAlign: 'center',
    marginBottom: 0,
  },
  cupsLabel: {
    fontFamily: fonts.label,
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  cupsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cupsChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cupsChipOn: {
    borderColor: colors.neon,
    backgroundColor: colors.backgroundElevated,
  },
  cupsText: {
    fontFamily: fonts.numeric,
    fontSize: 17,
    color: colors.textSecondary,
  },
  cupsTextOn: { color: colors.neon },
});
