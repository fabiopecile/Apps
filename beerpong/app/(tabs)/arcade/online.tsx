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
 * Opening or joining an arcade game against somebody else's phone.
 *
 * The same four characters as the camera mode, and the same room behind it —
 * the only difference is what the room holds. No account, no friend list, no
 * matchmaking: you read the code out to whoever you are playing.
 */
export default function ArcadeOnlineLobbyScreen() {
  const t = useT();
  const feedback = useFeedback();
  const storedName = useBeerpongStore((s) => s.tracker.teams[0].name);

  const [name, setName] = useState(DEFAULT_TEAM_NAMES.includes(storedName) ? '' : storedName);
  const [cups, setCups] = useState<number>(10);
  const [code, setCode] = useState('');

  const open = () => {
    feedback.tap();
    router.push({
      pathname: '/(tabs)/arcade/onlinematch',
      params: {
        code: makeRoomCode(),
        seat: '0',
        create: '1',
        name: name.trim(),
        cups: String(cups),
      },
    });
  };

  const join = () => {
    feedback.tap();
    router.push({
      pathname: '/(tabs)/arcade/onlinematch',
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
          <Text style={styles.title}>{t('arcadeOnline.title')}</Text>
          <View style={{ width: 26 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.intro}>{t('arcadeOnline.intro')}</Text>

          {!ONLINE_AVAILABLE ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{t('online.notSetUpTitle')}</Text>
              <Text style={styles.body}>{t('online.notSetUpBody')}</Text>
            </View>
          ) : (
            <>
              <View style={styles.card}>
                <Text style={styles.label}>{t('arcadeOnline.yourName')}</Text>
                <TextInput
                  value={name}
                  onChangeText={(text) => setName(text.slice(0, 16))}
                  style={styles.input}
                  maxLength={16}
                  placeholder={t('online.namePlaceholder')}
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <SectionLabel>{t('online.createTitle')}</SectionLabel>
              <View style={styles.card}>
                <Text style={styles.body}>{t('arcadeOnline.createBody')}</Text>
                <Text style={styles.label}>{t('online.cupsLabel')}</Text>
                <View style={styles.cupRow}>
                  {CUP_COUNT_CHOICES.map((choice) => (
                    <Pressable
                      key={choice}
                      onPress={() => {
                        feedback.tap();
                        setCups(choice);
                      }}
                      style={[styles.cupChip, cups === choice && styles.cupChipOn]}
                    >
                      <Text
                        style={[styles.cupChipText, cups === choice && styles.cupChipTextOn]}
                        selectable={false}
                      >
                        {choice}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <GlowButton label={t('online.start')} onPress={open} />
              </View>

              <SectionLabel>{t('online.joinTitle')}</SectionLabel>
              <View style={styles.card}>
                <Text style={styles.body}>{t('online.joinBody')}</Text>
                <TextInput
                  value={code}
                  onChangeText={(text) => setCode(normaliseRoomCode(text))}
                  style={styles.codeInput}
                  maxLength={ROOM_CODE_LENGTH}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  placeholder={t('online.codePlaceholder')}
                  placeholderTextColor={colors.textMuted}
                />
                <GlowButton
                  label={t('online.join')}
                  variant="outline"
                  onPress={join}
                  disabled={!isRoomCode(code)}
                />
              </View>

              <Text style={styles.footnote}>{t('arcadeOnline.fairPlay')}</Text>
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
    paddingBottom: spacing.md,
  },
  title: { fontFamily: fonts.headingBlack, fontSize: 22, color: colors.textPrimary },
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  intro: {
    fontFamily: fonts.bodyRegular,
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  card: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.backgroundCard,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.lg,
    ...glow('soft'),
  },
  cardTitle: { fontFamily: fonts.label, fontSize: 15, color: colors.gold },
  label: {
    fontFamily: fonts.label,
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  body: { fontFamily: fonts.bodyRegular, fontSize: 13, color: colors.textSecondary },
  input: {
    fontFamily: fonts.label,
    fontSize: 16,
    color: colors.textPrimary,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderFaint,
    paddingVertical: 6,
  },
  codeInput: {
    fontFamily: fonts.numeric,
    fontSize: 28,
    letterSpacing: 8,
    textAlign: 'center',
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.borderFaint,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
  },
  cupRow: { flexDirection: 'row', gap: spacing.sm },
  cupChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.borderFaint,
    borderRadius: radius.pill,
    paddingVertical: 8,
    alignItems: 'center',
  },
  cupChipOn: { backgroundColor: colors.neon, borderColor: colors.neon },
  cupChipText: { fontFamily: fonts.numeric, fontSize: 15, color: colors.textSecondary },
  cupChipTextOn: { color: colors.background },
  footnote: {
    fontFamily: fonts.bodyRegular,
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 16,
  },
});
