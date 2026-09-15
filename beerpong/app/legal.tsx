import { useMemo, useState } from 'react';
import {
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { GridBackground } from '@/components/ui/GridBackground';
import { visibleDocuments, type LegalDocument } from '@/lib/legal';
import { SALES_ENABLED } from '@/lib/sales';
import { useFeedback } from '@/lib/feedback';
import { useLanguage, useT } from '@/lib/i18n';
import { colors, fonts, glow, radius, spacing } from '@/theme';

// Android needs this switched on before LayoutAnimation does anything.
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/**
 * Impressum, Datenschutz, Widerruf, AGB.
 *
 * Built like the manual — same accordion, same one-open-at-a-time — because it
 * is the same kind of thing: long prose somebody arrives at with one question
 * and should be able to answer without scrolling past three documents they did
 * not want.
 *
 * `?doc=withdrawal` opens straight to one of them, which is how the purchase
 * confirmation links to the withdrawal notice: the whole point of that link is
 * that it lands on the paragraph being agreed to, not on a contents page.
 *
 * The texts themselves are in `lib/legal.ts`, and which of them exist depends
 * on whether anything is for sale. With no shop the list is the privacy notice
 * alone; terms of sale for a shop that does not exist would be a document about
 * nothing.
 */
export default function LegalScreen() {
  const params = useLocalSearchParams<{ doc?: string }>();
  const language = useLanguage();
  const feedback = useFeedback();
  const t = useT();

  const documents = useMemo(() => visibleDocuments(SALES_ENABLED), []);
  const [open, setOpen] = useState<string | null>(params.doc ?? documents[0]?.id ?? null);

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
          <Text style={styles.title}>{t('legal.title')}</Text>
          <View style={{ width: 26 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.intro}>
            {documents.length ? t('legal.intro') : t('legal.empty')}
          </Text>

          {documents.map((doc) => (
            <Document
              key={doc.id}
              doc={doc}
              language={language}
              open={open === doc.id}
              onPress={() => toggle(doc.id)}
            />
          ))}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Document({
  doc,
  language,
  open,
  onPress,
}: {
  doc: LegalDocument;
  language: 'de' | 'en';
  open: boolean;
  onPress: () => void;
}) {
  return (
    <View style={[styles.doc, open && styles.docOpen]}>
      <Pressable onPress={onPress} style={styles.docHead} accessibilityRole="button">
        <View style={styles.docIcon}>
          <Ionicons
            name={doc.icon as keyof typeof Ionicons.glyphMap}
            size={18}
            color={colors.textSecondary}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.docTitle}>{doc[language]}</Text>
          {open ? null : (
            <Text style={styles.docSummary} numberOfLines={2}>
              {doc.summary[language]}
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
        ? doc.sections.map((section, index) => (
            <View key={index} style={styles.section}>
              <Text style={styles.sectionTitle}>{section[language]}</Text>
              {/* `selectable` on purpose: somebody copying the address out to
                  write to it should not have to type it off a screen. */}
              <Body text={section.body[language]} />
            </View>
          ))
        : null}
    </View>
  );
}

/**
 * The same **bold** the manual understands, and nothing else.
 *
 * Shared behaviour rather than shared code, because these are the only two
 * screens that render prose and a helper imported across them would be a
 * dependency between a manual and a set of contracts for the sake of eight
 * lines.
 */
function Body({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return (
    <Text style={styles.sectionBody} selectable>
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
  doc: {
    borderWidth: 1,
    borderColor: colors.borderFaint,
    borderRadius: radius.lg,
    backgroundColor: colors.backgroundCard,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  docOpen: { borderColor: colors.border, ...glow('soft', colors.textSecondary) },
  docHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  docIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docTitle: { fontFamily: fonts.label, fontSize: 15, color: colors.textPrimary },
  docSummary: {
    fontFamily: fonts.bodyRegular,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  section: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: 4,
  },
  sectionTitle: {
    fontFamily: fonts.label,
    fontSize: 13,
    color: colors.textSecondary,
    letterSpacing: 0.4,
  },
  sectionBody: {
    fontFamily: fonts.bodyRegular,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  strong: { fontFamily: fonts.label, color: colors.textPrimary },
});
