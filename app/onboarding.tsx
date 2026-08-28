import { useCallback, useRef, useState, type ComponentType } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  Animated,
  StyleSheet,
  useWindowDimensions,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '@/components/PrimaryButton';
import {
  WelcomeArt,
  TipArt,
  PointsArt,
  JokerArt,
  InsuranceArt,
  SocialArt,
  DuelArt,
  WheelArt,
  RankingArt,
  ProArt,
} from '@/components/onboarding/Illustrations';
import { useEnter, enterStyle } from '@/components/onboarding/animations';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { colors, fontSizes, radii, spacing } from '@/constants/theme';
import { useTranslation } from '@/hooks/useTranslation';

interface Slide {
  key: string;
  art: ComponentType<{ active: boolean }>;
  eyebrow: string;
  eyebrowColor: string;
  title: string;
  body: string;
}

// The whole app in ten screens, in the voice of the promo graphics: one idea
// per slide, one accent colour, nothing that needs a second reading.
const SLIDES: Slide[] = [
  {
    key: 'welcome',
    art: WelcomeArt,
    eyebrow: 'WILLKOMMEN',
    eyebrowColor: colors.red,
    title: 'Tippen. Posten.\nGewinnen.',
    body: 'TeamUp11 ist Tippspiel und soziales Netzwerk in einem. Auf den nächsten Seiten siehst du alles, was drin steckt – in einer Minute durch.',
  },
  {
    key: 'tip',
    art: TipArt,
    eyebrow: 'SO GEHT TIPPEN',
    eyebrowColor: colors.blue,
    title: 'Tippe jedes Spiel',
    body: 'Trag vor Anpfiff dein Ergebnis ein. Ändern kannst du es beliebig oft – jedes Spiel hat seine eigene Deadline, nicht der ganze Spieltag. Danach siehst du, was alle anderen getippt haben.',
  },
  {
    key: 'points',
    art: PointsArt,
    eyebrow: 'DIE REGELN',
    eyebrowColor: colors.success,
    title: '5, 3 oder 0 Punkte',
    body: 'Exaktes Ergebnis bringt 5 Punkte. Richtiger Sieger bei falschem Ergebnis bringt 3. Daneben bringt nichts. Ein Unentschieden zählt als eigene Tendenz: 1:1 getippt, 2:2 gespielt – das sind 3 Punkte.',
  },
  {
    key: 'joker',
    art: JokerArt,
    eyebrow: 'DIE REGELN',
    eyebrowColor: colors.gold,
    title: 'Setz deine Joker',
    body: 'Jede Woche hast du mindestens 3 Joker, jeder gilt für ein einzelnes Spiel. Boost verdoppelt deine Punkte, Risiko würfelt zwischen der Hälfte und dem Anderthalbfachen, Sicher rettet dir 1 Punkt bei einem Fehltipp. Für jedes Level kommt einer dazu – gesammelte Joker verfallen nie.',
  },
  {
    key: 'insurance',
    art: InsuranceArt,
    eyebrow: 'NEU',
    eyebrowColor: colors.gold,
    title: 'Versichere\nden Spieltag',
    body: 'Für 150 Coins bekommst du mindestens 1 Punkt für jedes Spiel, das du getippt hast. Läuft der Spieltag gut, greift sie nicht. Bezahlbar nur mit verdienten Coins – Punkte gibt es hier nie für Geld.',
  },
  {
    key: 'social',
    art: SocialArt,
    eyebrow: 'DAS SOZIALE',
    eyebrowColor: colors.red,
    title: 'Feed und Storys',
    body: 'Poste aus dem Stadion, folge deinen Freunden, kommentiere und schreib im Chat – auch in Gruppen. Der erste Beitrag am Tag bringt +50 XP, Storys verschwinden nach 24 Stunden.',
  },
  {
    key: 'duel',
    art: DuelArt,
    eyebrow: 'GEGENEINANDER',
    eyebrowColor: colors.blue,
    title: 'Fordere Freunde\nheraus',
    body: 'Ein Duell läuft über einen ganzen Spieltag: Wer mehr Punkte holt, gewinnt und bekommt +30 XP. Herausfordern kannst du direkt aus dem Chat heraus.',
  },
  {
    key: 'coins',
    art: WheelArt,
    eyebrow: 'JEDEN TAG',
    eyebrowColor: colors.gold,
    title: 'Glücksrad\nund Coins',
    body: 'Einmal täglich drehen und die Login-Serie halten. Coins gibt es auch für jeden richtigen Tipp – 10 Stück pro Treffer. Ausgeben kannst du sie für Rahmen, Titel und die Versicherung.',
  },
  {
    key: 'ranking',
    art: RankingArt,
    eyebrow: 'DER WETTBEWERB',
    eyebrowColor: colors.gold,
    title: 'Jeden Monat\nvon vorne',
    body: 'Neben der Gesamtwertung läuft eine Monatswertung, die nur die Punkte dieses Monats zählt. Wer heute anfängt, kann diesen Monat gewinnen – und auf die vordersten Plätze wartet ein Preis.',
  },
  {
    key: 'pro',
    art: ProArt,
    eyebrow: 'OPTIONAL',
    eyebrowColor: colors.gold,
    title: 'Pro',
    body: 'Ohne Werbung, mit KI-Statistik zu jeder Partie und eigenem Profilrahmen. Kostenlos spielen geht immer und für immer – Pro ändert nichts an deinen Punkten.',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { profile, refreshProfile } = useAuth();
  const { width } = useWindowDimensions();
  const { t } = useTranslation();
  const listRef = useRef<FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);
  // The pager measures itself instead of trusting the window: on web the app
  // sits inside a fixed phone-width frame, so window width is the browser's,
  // not the page's. Sizing the slides from it pushed every illustration off
  // to the right and left the intro looking empty.
  const [pager, setPager] = useState({ width: 0, height: 0 });
  const [finishing, setFinishing] = useState(false);

  const pageWidth = pager.width || width;
  const isLast = index === SLIDES.length - 1;

  const finish = async () => {
    setFinishing(true);
    if (profile) {
      await supabase.from('profiles').update({ onboarding_done: true }).eq('id', profile.id);
      await refreshProfile();
    }
    setFinishing(false);
    router.replace('/(tabs)');
  };

  const goNext = () => {
    if (isLast) {
      finish();
      return;
    }
    listRef.current?.scrollToOffset({ offset: (index + 1) * pageWidth, animated: true });
    setIndex(index + 1);
  };

  // The index has to follow a swipe as well as the button, or the progress bar
  // and the button label drift apart from what is on screen.
  const handleScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const next = Math.round(event.nativeEvent.contentOffset.x / pageWidth);
      setIndex(Math.max(0, Math.min(SLIDES.length - 1, next)));
    },
    [pageWidth]
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.topRow}>
        <View style={styles.progress}>
          {SLIDES.map((slide, i) => (
            <View key={slide.key} style={[styles.segment, i <= index && styles.segmentFilled]} />
          ))}
        </View>
        <Pressable onPress={finish} hitSlop={10}>
          <Text style={styles.skip}>{t('onboarding.skip')}</Text>
        </Pressable>
      </View>

      <FlatList
        ref={listRef}
        style={styles.pager}
        data={SLIDES}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        getItemLayout={(_, i) => ({ length: pageWidth, offset: pageWidth * i, index: i })}
        // A row child cannot take its height from `flex: 1` - that grows it
        // sideways. Without a measured height every slide collapsed to nothing,
        // which is the other half of why the intro came up blank.
        onLayout={(event) =>
          setPager({ width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height })
        }
        extraData={pager}
        renderItem={({ item, index: i }) => (
          <SlideView slide={item} width={pageWidth} height={pager.height} active={i === index} />
        )}
      />

      <View style={styles.footer}>
        <PrimaryButton
          label={isLast ? t('onboarding.start') : t('common.next')}
          variant={isLast ? 'red' : 'blue'}
          loading={finishing}
          onPress={goNext}
        />
      </View>
    </SafeAreaView>
  );
}

function SlideView({
  slide,
  width,
  height,
  active,
}: {
  slide: Slide;
  width: number;
  height: number;
  active: boolean;
}) {
  const Art = slide.art;
  const eyebrow = useEnter(active, 120);
  const title = useEnter(active, 220);
  const body = useEnter(active, 340);

  return (
    <View style={[styles.slide, { width }, height > 0 && { height }]}>
      <View style={styles.artArea}>
        <Art active={active} />
      </View>

      <View style={styles.textArea}>
        <Animated.View style={[styles.eyebrowPill, { borderColor: slide.eyebrowColor }, enterStyle(eyebrow, 10)]}>
          <Text style={[styles.eyebrow, { color: slide.eyebrowColor }]}>{slide.eyebrow}</Text>
        </Animated.View>
        <Animated.Text style={[styles.title, enterStyle(title, 14)]}>{slide.title}</Animated.Text>
        <Animated.Text style={[styles.body, enterStyle(body, 14)]}>{slide.body}</Animated.Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  // Story-style segments rather than dots: with ten slides, dots stop reading
  // as progress and start reading as decoration.
  progress: { flex: 1, flexDirection: 'row', gap: 4 },
  segment: { flex: 1, height: 3, borderRadius: 2, backgroundColor: colors.surfaceAlt },
  segmentFilled: { backgroundColor: colors.red },
  skip: { color: colors.textFaint, fontSize: fontSizes.sm, fontWeight: '600' },

  pager: { flex: 1 },
  // No flex here: in a horizontal list that would fight the fixed page width.
  slide: { paddingHorizontal: spacing.xl, justifyContent: 'flex-end' },
  artArea: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 200 },
  textArea: { gap: spacing.md, paddingBottom: spacing.xl, maxWidth: 460, alignSelf: 'center', width: '100%' },
  eyebrowPill: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  eyebrow: { fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  title: { color: colors.white, fontSize: 34, fontWeight: '900', letterSpacing: -1, lineHeight: 38 },
  body: { color: colors.textMuted, fontSize: fontSizes.md, lineHeight: 23 },

  footer: { paddingHorizontal: spacing.xl, paddingBottom: spacing.lg, paddingTop: spacing.md },
});
