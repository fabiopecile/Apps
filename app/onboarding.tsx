import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PopIn } from '@/components/PopIn';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { colors, fontSizes, radii, spacing } from '@/constants/theme';
import { useTranslation } from '@/hooks/useTranslation';

interface Step {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  title: string;
  body: string;
  action?: { label: string; href: string };
}

const STEPS: Step[] = [
  {
    icon: 'football-outline',
    color: colors.red,
    title: 'Tippe jedes Spiel',
    body: 'Trag vor Anpfiff dein Ergebnis ein. Exakt getippt gibt 5 Punkte, richtiger Sieger 3, daneben keine. Nach dem Anpfiff siehst du, was die anderen getippt haben.',
  },
  {
    icon: 'flash-outline',
    color: colors.gold,
    title: 'Setz deine Joker',
    body: 'Pro Spieltag hast du Joker: verdoppeln, würfeln oder einen Punkt retten. Jedes Level bringt dir einen dazu.',
    action: { label: 'Alle Regeln ansehen', href: '/rules' },
  },
  {
    icon: 'people-outline',
    color: colors.blue,
    title: 'Hol deine Freunde dazu',
    body: 'Allein ist ein Tippspiel halb so lustig. Lade Freunde ein – für jeden, der sich registriert, bekommst du 100 XP und einen Joker.',
    action: { label: 'Freunde einladen', href: '/(tabs)/profil' },
  },
  {
    icon: 'gift-outline',
    color: colors.success,
    title: 'Jeden Tag etwas holen',
    body: 'Einmal täglich am Glücksrad drehen und die Login-Serie halten. Coins gibt es auch für jeden richtigen Tipp – im Shop werden daraus Rahmen und Titel.',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { profile, refreshProfile } = useAuth();
  const { width } = useWindowDimensions();
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const [finishing, setFinishing] = useState(false);

  const step = STEPS[index];
  const isLast = index === STEPS.length - 1;

  const finish = async (then?: string) => {
    setFinishing(true);
    if (profile) {
      await supabase.from('profiles').update({ onboarding_done: true }).eq('id', profile.id);
      await refreshProfile();
    }
    setFinishing(false);
    router.replace(then ?? '/(tabs)');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.skipRow}>
        <Pressable onPress={() => finish()} hitSlop={8}>
          <Text style={styles.skip}>{t('onboarding.skip')}</Text>
        </Pressable>
      </View>

      <View style={styles.body}>
        <PopIn key={step.title} style={styles.stepWrap}>
          <View style={[styles.iconCircle, { borderColor: step.color }]}>
            <Ionicons name={step.icon} size={44} color={step.color} />
          </View>
          <Text style={styles.title}>{step.title}</Text>
          <Text style={[styles.text, { maxWidth: Math.min(width - spacing.xl * 2, 420) }]}>{step.body}</Text>

          {step.action ? (
            <Pressable style={styles.actionLink} onPress={() => finish(step.action!.href)}>
              <Text style={styles.actionText}>{step.action.label}</Text>
              <Ionicons name="arrow-forward" size={15} color={colors.blue} />
            </Pressable>
          ) : null}
        </PopIn>
      </View>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {STEPS.map((s, i) => (
            <View key={s.title} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>

        <PrimaryButton
          label={isLast ? t('onboarding.start') : t('common.next')}
          loading={finishing}
          onPress={() => (isLast ? finish() : setIndex((i) => i + 1))}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  skipRow: { alignItems: 'flex-end', padding: spacing.lg },
  skip: { color: colors.textFaint, fontSize: fontSizes.sm, fontWeight: '600' },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  stepWrap: { alignItems: 'center' },
  iconCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 2,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    color: colors.text,
    fontSize: fontSizes.xxl,
    fontWeight: '800',
    letterSpacing: -0.6,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  text: { color: colors.textMuted, fontSize: fontSizes.md, lineHeight: 23, textAlign: 'center' },
  actionLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  actionText: { color: colors.blue, fontWeight: '700', fontSize: fontSizes.sm },
  footer: { padding: spacing.xl, gap: spacing.lg },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.borderStrong },
  dotActive: { backgroundColor: colors.red, width: 22 },
});
