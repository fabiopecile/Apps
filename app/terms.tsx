import type { ReactNode } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSizes, radii, spacing } from '@/constants/theme';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionText}>{children}</Text>
    </View>
  );
}

export default function TermsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>Nutzungsbedingungen</Text>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="close" size={24} color={colors.textMuted} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.notice}>
          Hinweis: Dies ist ein Entwurf als Ausgangspunkt und ersetzt keine Rechtsberatung. Trage deine
          Kontaktdaten ein und lass den Text im Zweifel prüfen, bevor du die App veröffentlichst.
        </Text>

        <Section title="1. Geltungsbereich">
          Diese Bedingungen regeln die Nutzung der App TeamUp11, betrieben von
          {' [Dein Name / Firmenname], [Deine Adresse], [Deine E-Mail-Adresse]'}. Mit der Erstellung eines
          Kontos erklärst du dich mit diesen Bedingungen einverstanden.
        </Section>

        <Section title="2. Konto">
          Für die Nutzung ist ein Konto erforderlich. Du bist für die Geheimhaltung deiner Zugangsdaten
          verantwortlich und darfst dein Konto nicht an Dritte weitergeben. Pro Person ist ein Konto zulässig.
          Die Nutzung ist ab 16 Jahren gestattet.
        </Section>

        <Section title="3. Verhaltensregeln">
          {'Verboten sind insbesondere:\n'}
          {'• Beleidigende, hetzerische, gewaltverherrlichende oder pornografische Inhalte\n'}
          {'• Inhalte, die Rechte Dritter verletzen (Urheberrecht, Persönlichkeitsrecht)\n'}
          {'• Belästigung, Bedrohung oder Bloßstellung anderer Nutzer\n'}
          {'• Spam, Werbung und automatisierte Zugriffe\n'}
          {'• Manipulation des Tippspiels, Mehrfachkonten oder das Ausnutzen von Fehlern\n\n'}
          Wir dulden keine anstößigen Inhalte und kein missbräuchliches Verhalten. Verstöße können zur
          Entfernung von Inhalten und zur Sperrung des Kontos führen – bei schweren Verstößen ohne
          Vorwarnung.
        </Section>

        <Section title="4. Deine Inhalte">
          Die Rechte an deinen Beiträgen und Storys bleiben bei dir. Du räumst uns das einfache Recht ein,
          diese Inhalte innerhalb der App darzustellen, solange du sie veröffentlicht hast. Du sicherst zu,
          dass du die nötigen Rechte an hochgeladenen Inhalten besitzt.
        </Section>

        <Section title="5. Meldungen und Moderation">
          Jeder Beitrag, jede Story und jeder Nutzer kann in der App gemeldet werden. Gemeldete Inhalte
          werden geprüft und bei Verstoß entfernt. Zusätzlich kannst du andere Nutzer blockieren – deren
          Inhalte werden dir dann nicht mehr angezeigt.
        </Section>

        <Section title="6. Pro-Abo">
          TeamUp11 Pro ist ein kostenpflichtiges Abo mit zusätzlichen Funktionen. Es verlängert sich
          automatisch um die gewählte Laufzeit, solange du es nicht kündigst. Die Kündigung ist jederzeit zum
          Ende der laufenden Periode über die Abo-Verwaltung möglich. Bereits gezahlte Beträge für die
          laufende Periode werden nicht erstattet. Gesetzliche Widerrufsrechte für Verbraucher bleiben
          unberührt.
        </Section>

        <Section title="7. Virtuelle Güter">
          Coins, Joker, Rahmen und Titel sind rein virtuelle Gegenstände ohne Geldwert. Sie können nicht
          ausgezahlt, übertragen oder gegen echtes Geld getauscht werden. Bei Löschung des Kontos verfallen
          sie ersatzlos.
        </Section>

        <Section title="8. Kein Glücksspiel">
          Das Tippspiel dient der Unterhaltung. Es werden keine Geldeinsätze getätigt und keine Geldgewinne
          ausgeschüttet.
        </Section>

        <Section title="9. Verfügbarkeit">
          Wir bemühen uns um einen zuverlässigen Betrieb, können aber keine ununterbrochene Verfügbarkeit
          zusichern. Fußballdaten stammen von Drittanbietern; für deren Richtigkeit übernehmen wir keine
          Gewähr.
        </Section>

        <Section title="10. Kündigung und Löschung">
          Du kannst dein Konto jederzeit in der App unter Profil löschen. Dabei werden deine
          personenbezogenen Daten und Inhalte entfernt. Wir können Konten bei Verstößen gegen diese
          Bedingungen sperren oder löschen.
        </Section>

        <Section title="11. Haftung">
          Wir haften unbeschränkt bei Vorsatz und grober Fahrlässigkeit sowie bei Verletzung von Leben,
          Körper und Gesundheit. Im Übrigen ist die Haftung auf den vorhersehbaren, vertragstypischen Schaden
          begrenzt.
        </Section>

        <Section title="12. Änderungen">
          Wir können diese Bedingungen ändern. Über wesentliche Änderungen informieren wir dich in der App.
          Nutzt du die App danach weiter, gelten die geänderten Bedingungen.
        </Section>

        <Section title="13. Anwendbares Recht">
          Es gilt österreichisches Recht unter Ausschluss des UN-Kaufrechts. Zwingende
          Verbraucherschutzbestimmungen deines Wohnsitzstaates bleiben unberührt.
        </Section>

        <Text style={styles.updated}>Stand: {new Date().toLocaleDateString('de-AT')}</Text>
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
  content: { padding: spacing.lg, gap: spacing.lg },
  notice: {
    color: colors.gold,
    fontSize: fontSizes.xs,
    backgroundColor: colors.goldDark,
    borderRadius: radii.lg,
    padding: spacing.md,
    lineHeight: 18,
  },
  section: { gap: spacing.xs },
  sectionTitle: { color: colors.text, fontWeight: '700', fontSize: fontSizes.md },
  sectionText: { color: colors.textMuted, fontSize: fontSizes.sm, lineHeight: 20 },
  updated: { color: colors.textFaint, fontSize: fontSizes.xs, textAlign: 'center', marginTop: spacing.md },
});
