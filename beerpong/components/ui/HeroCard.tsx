import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, type Href } from 'expo-router';

import { PressableScale } from './PressableScale';
import { CupRack } from './CupRack';
import { useFeedback } from '@/lib/feedback';
import { colors, fonts, glow, radius, spacing } from '@/theme';

/**
 * The one loud thing on a screen.
 *
 * This is where the whole redesign lives. A screen is allowed exactly one of
 * these, it is the only element permitted `glow('hero')`, and it answers the
 * question the player actually arrived with: what do I do now. Everything else
 * on the screen is a `ModeRow` — same height, same hairline, quiet.
 *
 * The rule is worth stating as a rule because the failure mode is gradual: one
 * more card that deserves emphasis, then another, and a year later every card
 * glows and the screen is the one we started from. If a second thing on a
 * screen seems to want this, the screen has two answers to "what now", which is
 * a content problem rather than a styling one.
 *
 * `eyebrow` is what makes it specific rather than decorative — "WEITERSPIELEN"
 * over the mode you last played beats a generic "Spielen" over the first item
 * in a list.
 */
export function HeroCard({
  eyebrow,
  title,
  subtitle,
  action,
  href,
  accent = colors.you,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  /** The words on the button. A verb, not a noun. */
  action: string;
  href: Href;
  accent?: string;
}) {
  const feedback = useFeedback();

  return (
    <PressableScale
      scaleTo={0.98}
      onPress={() => {
        feedback.tap();
        router.push(href);
      }}
      style={[styles.card, { borderColor: accent }, glow('hero', accent)]}
      accessibilityRole="button"
      accessibilityLabel={`${eyebrow}. ${title}. ${subtitle}`}
    >
      <LinearGradient
        colors={['rgba(30, 58, 22, 0.75)', 'rgba(16, 22, 16, 0.9)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.body}>
        <Text style={[styles.eyebrow, { color: accent }]} selectable={false}>
          {eyebrow}
        </Text>
        <Text style={styles.title} selectable={false} numberOfLines={2}>
          {title}
        </Text>
        {/* Two lines, because one truncated the only sentence on the card that
            explains the mode — "such dir die Schwieri…" is worse than no
            sentence at all. */}
        <Text style={styles.subtitle} selectable={false} numberOfLines={2}>
          {subtitle}
        </Text>
        {/* Not a GlowButton: this is inside a pressable card, so a second
            pressable would swallow the card's own tap on some platforms. It
            reads as a button and the whole card is the hit target — which is
            larger than the button, not smaller. */}
        <View style={[styles.action, { backgroundColor: accent }]}>
          <Text style={styles.actionText} selectable={false}>
            {action}
          </Text>
        </View>
      </View>
      <View style={styles.art} pointerEvents="none">
        <CupRack size={96} tint={accent} />
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    backgroundColor: colors.backgroundCard,
    overflow: 'hidden',
  },
  body: { flex: 1 },
  eyebrow: {
    fontFamily: fonts.label,
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: fonts.headingBlack,
    fontSize: 26,
    lineHeight: 29,
    color: colors.textPrimary,
    marginTop: 4,
  },
  subtitle: {
    fontFamily: fonts.bodyRegular,
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 3,
  },
  action: {
    height: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  actionText: {
    fontFamily: fonts.headingBlack,
    fontSize: 16,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.background,
  },
  art: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
