import { useMemo, useState } from 'react';
import { LayoutAnimation, Platform, Pressable, ScrollView, StyleSheet, Text, UIManager, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { GridBackground } from '@/components/ui/GridBackground';
import { GUIDE, GUIDE_ITEM_COUNT, type GuideChapter } from '@/lib/guide';
import { useFeedback } from '@/lib/feedback';
import { useLanguage, useT } from '@/lib/i18n';
import { colors, fonts, glow, radius, spacing } from '@/theme';

// Android needs this switched on before LayoutAnimation does anything.
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/**
 * The manual.
 *
 * Everything the app does, in chapters that open one at a time. Deliberately
 * *not* the first thing anybody sees: an app that makes you read nine chapters
 * before you can throw a ball is an app people close. The three slides at the
 * start stay three slides, and this sits behind a button on the last one and in
 * the profile, for whoever wants the whole thing.
 *
 * One chapter open at a time, because the point of collapsing them is to make
 * the list of chapters readable — leave them all open and you have the wall of
 * text again, just with headings in it.
 */
export default function GuideScreen() {
  const params = useLocalSearchParams<{ chapter?: string }>();
  const language = useLanguage();
  const feedback = useFeedback();
  const t = useT();
  const [open, setOpen] = useState<string | null>(params.chapter ?? null);

  const chapters = useMemo(() => GUIDE, []);

  const toggle = (id: string) => {
    feedback.tap();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((current) => (current === id ? null : id));
  };

  return (
    <View style={styles.container}>
      <GridBackground />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.title}>{t('guide.title')}</Text>
          <View style={{ width: 26 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.intro}>
            {t('guide.intro', { chapters: chapters.length, items: GUIDE_ITEM_COUNT })}
          </Text>

          {chapters.map((chapter) => (
            <Chapter
              key={chapter.id}
              chapter={chapter}
              language={language}
              open={open === chapter.id}
              onPress={() => toggle(chapter.id)}
            />
          ))}

          <Text style={styles.footnote}>{t('guide.footnote')}</Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Chapter({
  chapter,
  language,
  open,
  onPress,
}: {
  chapter: GuideChapter;
  language: 'de' | 'en';
  open: boolean;
  onPress: () => void;
}) {
  return (
    <View style={[styles.chapter, open && styles.chapterOpen]}>
      <Pressable onPress={onPress} style={styles.chapterHead} accessibilityRole="button">
        <View style={styles.chapterIcon}>
          <Ionicons
            name={chapter.icon as keyof typeof Ionicons.glyphMap}
            size={18}
            color={open ? colors.background : colors.neon}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.chapterTitle}>{chapter[language]}</Text>
          {open ? null : (
            <Text style={styles.chapterSummary} numberOfLines={2}>
              {chapter.summary[language]}
            </Text>
          )}
        </View>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.textMuted}
        />
      </Pressable>

      {open
        ? chapter.items.map((item, index) => (
            <View key={index} style={styles.item}>
              <Text style={styles.itemTitle}>{item[language]}</Text>
              <Body text={item.body[language]} />
            </View>
          ))
        : null}
    </View>
  );
}

/**
 * Renders the one piece of markup the manual uses: **bold**.
 *
 * A markdown library for a single emphasis would be a dependency to keep
 * updated forever; the manual is written by hand and this is the one thing it
 * needs to be able to stress a word.
 */
function Body({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return (
    <Text style={styles.itemBody}>
      {parts.map((part, index) =>
        part.startsWith('**') && part.endsWith('**') ? (
          <Text key={index} style={styles.strong}>
            {part.slice(2, -2)}
          </Text>
        ) : (
          <Text key={index}>{part}</Text>
        )
      )}
    </Text>
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
    marginBottom: spacing.md,
    lineHeight: 19,
  },
  chapter: {
    borderWidth: 1.5,
    borderColor: colors.borderFaint,
    borderRadius: radius.lg,
    backgroundColor: colors.backgroundCard,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  chapterOpen: { borderColor: colors.neon, ...glow('soft') },
  chapterHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  chapterIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: colors.neon,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chapterTitle: { fontFamily: fonts.label, fontSize: 15, color: colors.textPrimary },
  chapterSummary: {
    fontFamily: fonts.bodyRegular,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  item: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: 4,
  },
  itemTitle: { fontFamily: fonts.label, fontSize: 13, color: colors.gold },
  itemBody: {
    fontFamily: fonts.bodyRegular,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  strong: { color: colors.textPrimary, fontFamily: fonts.label },
  footnote: {
    marginTop: spacing.lg,
    fontFamily: fonts.bodyRegular,
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 16,
  },
});
