import { useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, type Href } from 'expo-router';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { PressableScale } from './PressableScale';
import { CupRack } from './CupRack';
import { AMBIENT, useAmbientEnabled, useAmbientLoop } from '@/lib/ambient';
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
 *
 * A light runs around its edge every seven seconds. It is the only card in the
 * app that gets one, for the same reason it is the only one that gets
 * `glow('hero')`: the moment a second card has it, neither is the answer to
 * "what do I do now".
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
  const sweep = useAmbientLoop(AMBIENT.sweep);
  const motionOk = useAmbientEnabled();
  const [size, setSize] = useState({ width: 0, height: 0 });

  /**
   * The light on the rim.
   *
   * There is no conic gradient in React Native, so this is the same trick a
   * browser uses to fake one: a long straight gradient with a single bright
   * slice, spun about the card's centre, with the card's own face laid back
   * over the middle. What survives is the ring — a highlight orbiting the
   * border.
   *
   * It has to be square and as wide as the card's diagonal, or its corners
   * sweep through the card and the light blinks off four times a lap. Hence the
   * measurement: `onLayout` gives the real size, and until it arrives the
   * effect simply does not draw.
   *
   * It is also not drawn at all when ambient motion is off, rather than parked
   * at the start of its cycle. Found by screenshotting the app with
   * reduce-motion on: a stopped orbit leaves a bright spot sitting on the top
   * edge for ever, which reads as a deliberate piece of the design that nobody
   * designed. Off, the card is exactly what it was before any of this — a solid
   * accent border.
   */
  const diagonal = Math.hypot(size.width, size.height);
  const spin = useAnimatedStyle(() => ({
    transform: [{ rotate: `${sweep.value * 360}deg` }],
  }));

  const measure = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize((current) =>
      current.width === width && current.height === height ? current : { width, height }
    );
  };

  return (
    <PressableScale
      scaleTo={0.98}
      onPress={() => {
        feedback.tap();
        router.push(href);
      }}
      onLayout={measure}
      style={[styles.card, { borderColor: accent }, glow('hero', accent)]}
      accessibilityRole="button"
      accessibilityLabel={`${eyebrow}. ${title}. ${subtitle}`}
    >
      {motionOk && diagonal > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.sweep,
            { width: diagonal, height: diagonal, marginLeft: -diagonal / 2, marginTop: -diagonal / 2 },
            spin,
          ]}
        >
          <LinearGradient
            colors={['rgba(57, 255, 20, 0)', 'rgba(57, 255, 20, 0)', accent, 'rgba(57, 255, 20, 0)']}
            locations={[0, 0.44, 0.5, 0.56]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      ) : null}
      {/* The card's face, laid back over the middle so only the rim is lit.
          Inset by the border width — it is what turns the spinning gradient
          into a ring. Opaque, because the gradient below it would otherwise
          smear through at 25% and the card would look wiped rather than
          edge-lit. */}
      <View style={styles.face} pointerEvents="none" />
      <LinearGradient
        colors={['rgba(30, 58, 22, 0.75)', 'rgba(16, 22, 16, 0.9)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.face}
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
  /** Centred on the card, then pulled back by half its own size. */
  sweep: {
    position: 'absolute',
    left: '50%',
    top: '50%',
  },
  /**
   * Inset by the card's 1.5pt border, which is exactly the width of the lit
   * rim. A larger inset makes a thick glowing frame, which is a different and
   * much louder effect.
   */
  face: {
    position: 'absolute',
    top: 1.5,
    left: 1.5,
    right: 1.5,
    bottom: 1.5,
    borderRadius: radius.lg - 1.5,
    backgroundColor: colors.backgroundCard,
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
