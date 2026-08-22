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

export default function PrivacyScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>Datenschutzerklärung</Text>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="close" size={24} color={colors.textMuted} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.notice}>
          Hinweis: Dies ist ein Entwurf als Ausgangspunkt und ersetzt keine Rechtsberatung. Bitte trage
          deine Kontaktdaten ein und lass den Text im Zweifel von einer Fachperson prüfen, bevor du die
          App veröffentlichst.
        </Text>

        <Section title="1. Verantwortlicher">
          {'[Dein Name / Firmenname]\n[Deine Adresse]\n[Deine E-Mail-Adresse]\n\n'}
          Verantwortlich für die Datenverarbeitung im Sinne der EU-Datenschutz-Grundverordnung (DSGVO)
          und des österreichischen Datenschutzgesetzes (DSG) ist die oben genannte Person.
        </Section>

        <Section title="2. Welche Daten wir verarbeiten">
          {'• Kontodaten: E-Mail-Adresse, Benutzername, Passwort (verschlüsselt gespeichert)\n'}
          {'• Profildaten: Anzeigename, Profilbild, Bio\n'}
          {'• Nutzungsdaten: Tipps, Punkte, Level, Beiträge, Kommentare, Story-Fotos und optional angegebene Standorte, Nachrichten im Chat\n'}
          {'• Einladungsdaten: dein Einladungscode und welche Konten sich damit registriert haben\n'}
          {'• Technische Daten: Geräte- und App-Nutzungsdaten, die zum Betrieb der App notwendig sind (z. B. Sitzungs-Token)'}
        </Section>

        <Section title="3. Zweck und Rechtsgrundlage">
          Wir verarbeiten diese Daten, um dir die Funktionen der App bereitzustellen (Tippspiel, Feed,
          Storys, Chat, Rangliste, Freundschaftseinladungen). Rechtsgrundlage ist die Erfüllung des
          Nutzungsvertrags mit dir (Art. 6 Abs. 1 lit. b DSGVO). Für optionale Angaben (z. B. Standort bei
          Storys, Profilbild) ist die Rechtsgrundlage deine Einwilligung (Art. 6 Abs. 1 lit. a DSGVO), die du
          jederzeit widerrufen kannst.
        </Section>

        <Section title="4. Hosting und Auftragsverarbeiter">
          Die App nutzt Supabase (Datenbank, Authentifizierung, Datei-Speicher) als Auftragsverarbeiter.
          Je nach gewähltem Supabase-Serverstandort können Daten innerhalb oder außerhalb der EU/des EWR
          verarbeitet werden; in diesem Fall stellt Supabase geeignete Garantien (z. B. EU-Standardvertragsklauseln)
          bereit. Für Fußballdaten (Spielpläne, Ergebnisse) wird die öffentliche API von football-data.org
          angefragt – dabei werden keine personenbezogenen Daten von dir übermittelt.
        </Section>

        <Section title="5. Speicherdauer">
          Wir speichern deine Daten, solange dein Konto besteht. Nach Löschung deines Kontos werden deine
          personenbezogenen Daten gelöscht oder anonymisiert, soweit keine gesetzlichen Aufbewahrungspflichten
          entgegenstehen.
        </Section>

        <Section title="6. Deine Rechte">
          Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung,
          Datenübertragbarkeit und Widerspruch gegen die Verarbeitung deiner Daten. Wende dich dazu an die
          oben genannte Kontaktadresse. Du hast außerdem das Recht, dich bei der österreichischen
          Datenschutzbehörde (dsb.gv.at) zu beschweren.
        </Section>

        <Section title="7. Weitergabe an andere Nutzer">
          Dein Benutzername, Profilbild, deine Beiträge, Storys und öffentlichen Statistiken (z. B. Level,
          Rangliste) sind für andere Nutzer der App sichtbar. Private Nachrichten sind nur für die jeweiligen
          Gesprächspartner sichtbar.
        </Section>

        <Section title="8. Kinder">
          Die App richtet sich nicht an Kinder unter 16 Jahren. Solltest du feststellen, dass ein Kind ohne
          Zustimmung der Erziehungsberechtigten personenbezogene Daten übermittelt hat, kontaktiere uns bitte.
        </Section>

        <Section title="9. Kontakt">
          Bei Fragen zum Datenschutz erreichst du uns unter der oben genannten E-Mail-Adresse.
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
  title: { color: colors.white, fontWeight: '800', fontSize: fontSizes.xl, letterSpacing: -0.4 },
  content: { padding: spacing.lg, gap: spacing.lg },
  notice: {
    color: colors.gold,
    fontSize: fontSizes.xs,
    backgroundColor: colors.goldDark,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  section: { gap: spacing.xs },
  sectionTitle: { color: colors.white, fontWeight: '800', fontSize: fontSizes.md },
  sectionText: { color: colors.textMuted, fontSize: fontSizes.sm, lineHeight: 20 },
  updated: { color: colors.textFaint, fontSize: fontSizes.xs, textAlign: 'center', marginTop: spacing.md },
});
