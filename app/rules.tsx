import type { ReactNode } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSizes, radii, spacing } from '@/constants/theme';

function PointRow({ points, title, detail, color }: { points: string; title: string; detail: string; color: string }) {
  return (
    <View style={styles.pointRow}>
      <View style={[styles.pointBadge, { borderColor: color }]}>
        <Text style={[styles.pointValue, { color }]}>{points}</Text>
      </View>
      <View style={styles.pointText}>
        <Text style={styles.pointTitle}>{title}</Text>
        <Text style={styles.pointDetail}>{detail}</Text>
      </View>
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export default function RulesScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>So funktioniert's</Text>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="close" size={24} color={colors.textMuted} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        <Section title="Punkte pro Spiel">
          <PointRow
            points="5"
            title="Exaktes Ergebnis"
            detail="Du tippst 2:1, es endet 2:1."
            color={colors.success}
          />
          <PointRow
            points="3"
            title="Richtige Tendenz"
            detail="Du tippst 2:1, es endet 3:0. Sieger stimmt, Ergebnis nicht."
            color={colors.blue}
          />
          <PointRow points="0" title="Daneben" detail="Falscher Sieger oder Unentschieden verpasst." color={colors.textFaint} />
          <Text style={styles.note}>
            Ein Unentschieden zählt als eigene Tendenz: Wer 1:1 tippt und es endet 2:2, bekommt 3 Punkte.
          </Text>
        </Section>

        <Section title="Joker">
          <Text style={styles.intro}>
            Pro Spieltag hast du eine begrenzte Zahl an Jokern. Du setzt sie vor Anpfiff auf ein einzelnes Spiel.
          </Text>

          <View style={styles.jokerCard}>
            <View style={styles.jokerHead}>
              <Text style={styles.jokerEmoji}>⚡</Text>
              <Text style={styles.jokerName}>BOOST</Text>
            </View>
            <Text style={styles.jokerText}>
              Verdoppelt deine Punkte, wenn du richtig liegst. Aus 5 werden 10, aus 3 werden 6. Bei einem
              Fehltipp ändert er nichts.
            </Text>
          </View>

          <View style={styles.jokerCard}>
            <View style={styles.jokerHead}>
              <Text style={styles.jokerEmoji}>🎲</Text>
              <Text style={styles.jokerName}>RISIKO</Text>
            </View>
            <Text style={styles.jokerText}>
              Bei einem Treffer wird gewürfelt: Du bekommst zwischen der Hälfte und dem Anderthalbfachen
              deiner Punkte. Kann besser als Boost ausgehen – oder schlechter als gar kein Joker.
            </Text>
          </View>

          <View style={styles.jokerCard}>
            <View style={styles.jokerHead}>
              <Text style={styles.jokerEmoji}>🛡️</Text>
              <Text style={styles.jokerName}>SICHER</Text>
            </View>
            <Text style={styles.jokerText}>
              Das Gegenteil: Er greift nur, wenn du danebenliegst, und rettet dir 1 Punkt statt null. Bei
              einem Treffer bringt er nichts.
            </Text>
          </View>
        </Section>

        <Section title="Deadline">
          <Text style={styles.intro}>
            Jedes Spiel ist bis zum Anpfiff tippbar – nicht bis zum Ende des Spieltags. Ein Sonntagsspiel
            kannst du also noch tippen, wenn die Samstagsspiele längst laufen.
          </Text>
          <Text style={styles.intro}>
            Nach dem Anpfiff siehst du auf der Spielkarte unter „Tipps der anderen", wer was getippt hat.
            Vorher ist das für niemanden einsehbar.
          </Text>
        </Section>

        <Section title="XP und Level">
          <Text style={styles.intro}>
            Punkte bestimmen die Rangliste, XP dein Level. XP bekommst du fürs Tippen, für Beiträge
            (+50 einmal pro Tag), für die Login-Serie, am Glücksrad und für gewonnene Duelle. Pro Level
            brauchst du 1.000 XP, und jedes Level bringt dir einen zusätzlichen Joker.
          </Text>
        </Section>

        <Section title="Coins">
          <Text style={styles.intro}>
            Coins bekommst du für richtige Tipps, am Glücksrad und für eingeladene Freunde. Ausgeben kannst
            du sie im Shop für Rahmen und Titel – reine Kosmetik. Auf deine Punkte oder deinen Platz in der
            Rangliste haben sie keinen Einfluss.
          </Text>
        </Section>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  title: { color: colors.text, fontWeight: '800', fontSize: fontSizes.xl, letterSpacing: -0.4 },
  content: { padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xxl },
  section: { gap: spacing.md },
  sectionTitle: { color: colors.text, fontWeight: '800', fontSize: fontSizes.lg, letterSpacing: -0.3 },
  intro: { color: colors.textMuted, fontSize: fontSizes.sm, lineHeight: 20 },
  note: { color: colors.textFaint, fontSize: fontSizes.xs, lineHeight: 17 },
  pointRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  pointBadge: {
    width: 52,
    height: 52,
    borderRadius: radii.lg,
    borderWidth: 2,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointValue: { fontSize: fontSizes.xl, fontWeight: '800' },
  pointText: { flex: 1 },
  pointTitle: { color: colors.text, fontWeight: '700', fontSize: fontSizes.sm },
  pointDetail: { color: colors.textMuted, fontSize: fontSizes.xs, marginTop: 2, lineHeight: 17 },
  jokerCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  jokerHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  jokerEmoji: { fontSize: 18 },
  jokerName: { color: colors.gold, fontWeight: '800', fontSize: fontSizes.xs, letterSpacing: 1 },
  jokerText: { color: colors.textMuted, fontSize: fontSizes.sm, lineHeight: 19 },
});
