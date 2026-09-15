/**
 * Impressum, Datenschutz, Widerruf, AGB — the paperwork that comes with
 * charging money.
 *
 * It lives here, written out, for the same reason the manual does: it is prose
 * and it has to be read end to end to see what is missing. A translation key
 * per sentence would hide exactly the thing that matters.
 *
 * ## What you have to do before selling anything
 *
 * Fill in `OPERATOR` below. That is the whole job — every document assembles
 * itself from it, in both languages. Until it is filled in, `legalComplete()`
 * is false and `lib/sales.ts` refuses to switch selling on: an app that takes
 * money without an Impressum is the one failure mode worth designing against,
 * because it is the one that costs money rather than a bug report.
 *
 * ## What these texts are and are not
 *
 * They are the usual texts for a one-person operation selling small digital
 * unlocks, written to match what this app actually does — not a template with
 * clauses about shipping and returns that do not apply. They are **not** legal
 * advice, and nobody here is a lawyer. They are a starting point good enough to
 * be checked cheaply rather than written from nothing.
 *
 * The one part worth having looked at properly is the Widerrufsbelehrung, and
 * specifically the waiver: a digital unlock handed over immediately only stops
 * being returnable if the buyer was asked, in the right words, at the right
 * moment. That is why `components/ui/PurchaseConsent.tsx` exists and why it
 * cannot be skipped.
 *
 * ## Numbers are imported, never typed
 *
 * The same rule as `lib/guide.ts`. Prices in these documents come from the
 * catalogue, so a price change cannot leave the AGB claiming the old one.
 */

import { CUP_BUNDLE_CENTS, CUP_PRICE_CENTS } from './catalogue';
import { DEFAULT_PRICE_CENTS } from './licence';
import { FREE_TRACKED_GAMES_PER_WEEK } from './entitlement';
import type { Language } from './languages';

// ------------------------------------------------------------------ who you are

/** Where you are registered. Decides which law the Impressum cites. */
export type OperatorCountry = 'DE' | 'AT' | 'CH';

export interface Operator {
  /**
   * Your name. For a sole trader this is your own first and last name — a
   * fantasy name alone is not enough, in Germany or in Austria.
   */
  name: string;
  /** Street and number. A PO box does not satisfy the Impressum. */
  street: string;
  /** Postcode and town, as one line: "12345 Musterstadt". */
  city: string;
  country: OperatorCountry;
  /** Reachable and read. Legally required, and the only support channel there is. */
  email: string;
  /**
   * Optional. Not strictly required if email is answered promptly, but a second
   * fast channel is what the law is actually after, and it settles the question.
   */
  phone: string;
  /**
   * Your USt-IdNr. / UID, if you have one. Leave empty under the
   * Kleinunternehmerregelung — you do not get one and do not need one.
   */
  vatId: string;
  /**
   * True while you are a Kleinunternehmer (§ 19 UStG in Germany,
   * § 6 Abs 1 Z 27 UStG in Austria): prices carry no VAT and the invoice has to
   * say why.
   */
  smallBusiness: boolean;
}

/**
 * Fill this in. Nothing else in this file needs touching.
 *
 * Empty strings are the "not set up yet" state and are checked for, so a half
 * filled block cannot go live: `legalComplete()` wants name, street, city and
 * email. `phone` and `vatId` are genuinely optional.
 */
export const OPERATOR: Operator = {
  name: '',
  street: '',
  city: '',
  country: 'DE',
  email: '',
  phone: '',
  vatId: '',
  smallBusiness: true,
};

/** The fields a document would otherwise have a hole in. */
export const REQUIRED_OPERATOR_FIELDS = ['name', 'street', 'city', 'email'] as const;

/**
 * Whether there is enough here to publish a shop.
 *
 * Deliberately a function of the data rather than a flag somebody sets: a flag
 * can be true while the address line is still empty, which is the exact
 * situation this is meant to prevent.
 */
export function legalComplete(operator: Operator = OPERATOR): boolean {
  return REQUIRED_OPERATOR_FIELDS.every((field) => operator[field].trim().length > 0);
}

/** Which of them are still blank — named, so the message can say which. */
export function missingOperatorFields(operator: Operator = OPERATOR): string[] {
  return REQUIRED_OPERATOR_FIELDS.filter((field) => operator[field].trim().length === 0);
}

// ------------------------------------------------------------------- the texts

export interface LegalSection {
  de: string;
  en: string;
  body: { de: string; en: string };
}

export interface LegalDocument {
  id: 'impressum' | 'privacy' | 'withdrawal' | 'terms';
  icon: string;
  de: string;
  en: string;
  summary: { de: string; en: string };
  /**
   * False for the privacy notice: the app processes data whether or not
   * anything is for sale, so that one is shown either way. The other three only
   * exist because there is a shop.
   */
  salesOnly: boolean;
  sections: LegalSection[];
}

const euro = (cents: number) => `${(cents / 100).toFixed(2).replace('.', ',')} €`;
const pounds = (cents: number) => `€${(cents / 100).toFixed(2)}`;

/**
 * The statute that makes the Impressum compulsory, per country.
 *
 * Germany's moved: the TMG was replaced by the DDG in May 2024, and an
 * Impressum still citing § 5 TMG is the tell that a text was copied from an old
 * template. Austria has always had it in § 5 ECG, alongside § 63 GewO for the
 * business name.
 */
const IMPRESSUM_LAW: Record<OperatorCountry, { de: string; en: string }> = {
  DE: { de: 'Angaben gemäß § 5 DDG', en: 'Information pursuant to § 5 DDG (Germany)' },
  AT: {
    de: 'Offenlegung gemäß § 5 ECG und § 25 MedienG',
    en: 'Disclosure pursuant to § 5 ECG and § 25 MedienG (Austria)',
  },
  CH: {
    de: 'Angaben gemäß Art. 3 Abs. 1 lit. s UWG',
    en: 'Information pursuant to Art. 3(1)(s) UCA (Switzerland)',
  },
};

/** The small-business VAT note, which is worded differently in each country. */
const SMALL_BUSINESS_NOTE: Record<OperatorCountry, { de: string; en: string }> = {
  DE: {
    de: 'Als Kleinunternehmer im Sinne von § 19 UStG wird keine Umsatzsteuer berechnet und daher auch keine ausgewiesen.',
    en: 'As a small business under § 19 UStG, no VAT is charged and none is shown.',
  },
  AT: {
    de: 'Als Kleinunternehmer im Sinne von § 6 Abs 1 Z 27 UStG wird keine Umsatzsteuer berechnet und daher auch keine ausgewiesen.',
    en: 'As a small business under § 6 (1) (27) UStG, no VAT is charged and none is shown.',
  },
  CH: {
    de: 'Es wird keine Mehrwertsteuer ausgewiesen.',
    en: 'No VAT is shown.',
  },
};

/**
 * The consumer-arbitration sentence.
 *
 * Note what is *not* here: a link to the EU ODR platform. It was shut down on
 * 20 July 2025, and a dead link in an Impressum is worse than no link — it is
 * the thing a warning letter points at. What remains is the declaration itself,
 * which is still required.
 */
const ARBITRATION: Record<OperatorCountry, { de: string; en: string }> = {
  DE: {
    de: 'Ich bin nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.',
    en: 'I am neither willing nor obliged to take part in dispute resolution proceedings before a consumer arbitration board.',
  },
  AT: {
    de: 'Ich bin nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.',
    en: 'I am neither willing nor obliged to take part in dispute resolution proceedings before a consumer arbitration board.',
  },
  CH: {
    de: 'Eine Teilnahme an einem Streitbeilegungsverfahren vor einer Schlichtungsstelle ist nicht vorgesehen.',
    en: 'No participation in dispute resolution proceedings before an arbitration board is provided for.',
  },
};

/** The line that says where a data-protection complaint goes. */
const SUPERVISORY_AUTHORITY: Record<OperatorCountry, { de: string; en: string }> = {
  DE: {
    de: 'Du hast außerdem das Recht, dich bei einer Datenschutz-Aufsichtsbehörde zu beschweren — zuständig ist die Behörde deines Bundeslandes oder die meines Sitzes.',
    en: 'You also have the right to complain to a data protection supervisory authority — either the one for your federal state or the one for my place of business.',
  },
  AT: {
    de: 'Du hast außerdem das Recht, dich bei der österreichischen Datenschutzbehörde zu beschweren.',
    en: 'You also have the right to complain to the Austrian Data Protection Authority.',
  },
  CH: {
    de: 'Du hast außerdem das Recht, dich beim Eidgenössischen Datenschutz- und Öffentlichkeitsbeauftragten (EDÖB) zu beschweren.',
    en: 'You also have the right to complain to the Swiss Federal Data Protection and Information Commissioner (FDPIC).',
  },
};

/**
 * The address block, as it appears in every document that needs it.
 *
 * Built once rather than three times, because three copies is three chances for
 * one of them to keep an old street after a move.
 */
export function addressBlock(operator: Operator = OPERATOR): string {
  const lines = [operator.name, operator.street, operator.city];
  if (operator.email) lines.push(`E-Mail: ${operator.email}`);
  if (operator.phone) lines.push(`Telefon: ${operator.phone}`);
  if (operator.vatId) lines.push(`USt-IdNr.: ${operator.vatId}`);
  return lines.filter((line) => line.trim().length > 0).join('\n');
}

/**
 * Every document, assembled from the block above.
 *
 * A function rather than a constant so the tests can push a filled-in operator
 * through it without editing the file — which is the only way to check that the
 * finished texts have no holes left in them.
 */
export function legalDocuments(operator: Operator = OPERATOR): LegalDocument[] {
  const address = addressBlock(operator);
  const name = operator.name || '—';
  const email = operator.email || '—';
  const vat = operator.smallBusiness
    ? SMALL_BUSINESS_NOTE[operator.country]
    : {
        de: 'Alle Preise verstehen sich als Endpreise inklusive der gesetzlichen Umsatzsteuer.',
        en: 'All prices are final prices including statutory VAT.',
      };

  return [
    // ------------------------------------------------------------- Impressum
    {
      id: 'impressum',
      icon: 'business',
      de: 'Impressum',
      en: 'Legal notice',
      summary: {
        de: 'Wer diese App betreibt und wie du mich erreichst.',
        en: 'Who runs this app and how to reach me.',
      },
      salesOnly: true,
      sections: [
        {
          de: IMPRESSUM_LAW[operator.country].de,
          en: IMPRESSUM_LAW[operator.country].en,
          body: { de: address, en: address },
        },
        {
          de: 'Verantwortlich für den Inhalt',
          en: 'Responsible for the content',
          body: { de: address, en: address },
        },
        {
          de: 'Umsatzsteuer',
          en: 'VAT',
          body: vat,
        },
        {
          de: 'Streitbeilegung',
          en: 'Dispute resolution',
          body: ARBITRATION[operator.country],
        },
        {
          de: 'Haftung für Inhalte und Links',
          en: 'Liability for content and links',
          body: {
            de: 'Die Inhalte dieser App werden mit Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität kann ich keine Gewähr übernehmen. Die App verlinkt nach außen nur auf die Bezahlseite von Stripe; für deren Inhalte ist deren Anbieter verantwortlich.',
            en: 'The contents of this app are compiled with care. I cannot guarantee that they are accurate, complete or up to date. The app links outwards only to Stripe’s payment page; its provider is responsible for its content.',
          },
        },
      ],
    },

    // ------------------------------------------------------------ Datenschutz
    {
      id: 'privacy',
      icon: 'lock-closed',
      de: 'Datenschutz',
      en: 'Privacy',
      summary: {
        de: 'Was die App speichert — und wie wenig davon mich erreicht.',
        en: 'What the app stores — and how little of it reaches me.',
      },
      salesOnly: false,
      sections: [
        {
          de: 'Verantwortlich',
          en: 'Controller',
          body: {
            de: `Verantwortlich im Sinne der DSGVO ist:\n\n${address}`,
            en: `The controller within the meaning of the GDPR is:\n\n${address}`,
          },
        },
        {
          de: 'Der kurze Überblick',
          en: 'The short version',
          body: {
            de: 'Diese App hat keine Benutzerkonten, keine Anmeldung, keine Werbung und keine Analyse-Werkzeuge. Es gibt kein Tracking, keine Cookies zu Werbezwecken und keinen Dienst, der dein Verhalten auswertet. Alles, was du spielst, liegt auf deinem Gerät. Nach außen geht nur, was du selbst auslöst: ein Online-Spiel, eine Party-Anzeigetafel, eine Sicherung in der Cloud oder ein Kauf.',
            en: 'This app has no user accounts, no sign-in, no advertising and no analytics. There is no tracking, no advertising cookies and no service evaluating your behaviour. Everything you play stays on your device. The only things that leave it are the ones you start yourself: an online game, a party scoreboard, a cloud backup or a purchase.',
          },
        },
        {
          de: 'Was auf dem Gerät bleibt',
          en: 'What stays on the device',
          body: {
            de: 'Dein Spielstand — Statistiken, Coins, Becher-Designs, Einstellungen, Sprache — wird ausschließlich lokal gespeichert (im Browser-Speicher bzw. im App-Speicher deines Telefons). Ich habe darauf keinen Zugriff. Löschst du die App oder die Website-Daten, ist er weg.',
            en: 'Your save — stats, coins, cup designs, settings, language — is stored locally only (in browser storage, or your phone’s app storage). I have no access to it. Delete the app or the site data and it is gone.',
          },
        },
        {
          de: 'Die Kamera',
          en: 'The camera',
          body: {
            de: 'Die automatische Becher-Erkennung wertet die Kamerabilder direkt auf deinem Gerät aus. **Es wird kein Bild und kein Video an mich oder an irgendeinen Server übertragen.** Auch die Highlight-Clips bleiben auf dem Gerät; sie liegen im lokalen Speicher deines Browsers und werden nur dann irgendwohin übertragen, wenn du sie selbst teilst. Der Zugriff auf die Kamera wird von deinem Gerät abgefragt und kann dort jederzeit widerrufen werden.',
            en: 'Automatic cup detection analyses the camera frames directly on your device. **No image and no video is transmitted to me or to any server.** Highlight clips stay on the device too; they sit in your browser’s local storage and only go anywhere if you share them yourself. Camera access is requested by your device and can be revoked there at any time.',
          },
        },
        {
          de: 'Online-Spiel und Party-Anzeigetafel',
          en: 'Online play and the party scoreboard',
          body: {
            de: 'Startest du ein Online-Spiel oder eine Party-Anzeigetafel, verbindet sich die App mit einem Server bei Cloudflare (Cloudflare Inc., bzw. Cloudflare Germany GmbH). Übertragen werden der Raumcode, der Spielstand und der Name, den du selbst eingibst — mehr nicht. Der Raum verschwindet, wenn niemand mehr verbunden ist. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO, weil das die Funktion ist, die du gerade angefordert hast. Cloudflare verarbeitet dabei technisch notwendige Verbindungsdaten wie die IP-Adresse; ein Auftragsverarbeitungsvertrag mit Standardvertragsklauseln liegt vor.',
            en: 'When you start an online game or a party scoreboard, the app connects to a server at Cloudflare (Cloudflare Inc., or Cloudflare Germany GmbH). What is transmitted is the room code, the score and the name you type in — nothing else. The room disappears once nobody is connected. The legal basis is Art. 6(1)(b) GDPR, because this is the function you just asked for. Cloudflare processes technically necessary connection data such as your IP address; a data processing agreement with standard contractual clauses is in place.',
          },
        },
        {
          de: 'Sicherung mit Code',
          en: 'Backup with a code',
          body: {
            de: 'Legst du eine Sicherung an, wird genau der lokale Spielstand unter einem zufälligen Code bei Cloudflare abgelegt. Der Code ist der einzige Schlüssel dazu — es hängt kein Name, keine E-Mail-Adresse und kein Konto daran. Wer den Code hat, hat die Sicherung: gib ihn nicht weiter. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO. Du kannst die Sicherung in der App jederzeit wieder löschen.',
            en: 'If you make a backup, exactly that local save is stored at Cloudflare under a random code. The code is the only key to it — no name, no email address and no account is attached. Whoever holds the code holds the backup: do not pass it on. The legal basis is Art. 6(1)(b) GDPR. You can delete the backup again from inside the app at any time.',
          },
        },
        {
          de: 'Bezahlung',
          en: 'Payment',
          body: {
            de: 'Käufe laufen über Stripe (Stripe Payments Europe, Ltd., Dublin). Die Bezahldaten gibst du auf der Seite von Stripe ein; die App sieht sie nie und speichert sie nirgends. Ich erhalte von Stripe nur die Information, dass eine Zahlung erfolgt ist, sowie die Angaben, die ich für die Buchhaltung brauche. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung) und für die Aufbewahrung Art. 6 Abs. 1 lit. c DSGVO (steuerliche Aufbewahrungspflichten). Es gilt die Datenschutzerklärung von Stripe.',
            en: 'Purchases run through Stripe (Stripe Payments Europe, Ltd., Dublin). You enter payment details on Stripe’s own page; the app never sees them and stores them nowhere. All I receive from Stripe is the fact that a payment was made, plus what I need for my books. The legal basis is Art. 6(1)(b) GDPR (performance of a contract) and, for retention, Art. 6(1)(c) GDPR (tax record-keeping duties). Stripe’s own privacy policy applies.',
          },
        },
        {
          de: 'Aufbewahrung',
          en: 'Retention',
          body: {
            de: 'Räume und Anzeigetafeln werden gelöscht, sobald sie leer sind. Sicherungen bleiben, bis du sie löschst. Kaufunterlagen muss ich steuerlich zehn Jahre aufbewahren; das lässt sich nicht abkürzen.',
            en: 'Rooms and scoreboards are deleted as soon as they are empty. Backups stay until you delete them. Purchase records have to be kept for ten years for tax purposes; that cannot be shortened.',
          },
        },
        {
          de: 'Deine Rechte',
          en: 'Your rights',
          body: {
            de: `Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch (Art. 15–21 DSGVO). Schreib dazu einfach an ${email}. ${SUPERVISORY_AUTHORITY[operator.country].de}`,
            en: `You have the right to access, rectification, erasure, restriction of processing, data portability and objection (Art. 15–21 GDPR). Just write to ${email}. ${SUPERVISORY_AUTHORITY[operator.country].en}`,
          },
        },
        {
          de: 'Kinder',
          en: 'Children',
          body: {
            de: 'Die App dreht sich um ein Trinkspiel und richtet sich an Erwachsene. Sie ist nicht für Kinder bestimmt, und es werden wissentlich keine Daten von Kindern verarbeitet.',
            en: 'The app is about a drinking game and is aimed at adults. It is not intended for children, and no children’s data is knowingly processed.',
          },
        },
      ],
    },

    // ---------------------------------------------------------- Widerrufsrecht
    {
      id: 'withdrawal',
      icon: 'return-down-back',
      de: 'Widerrufsrecht',
      en: 'Right of withdrawal',
      summary: {
        de: '14 Tage — und warum sie bei einer Sofort-Freischaltung enden.',
        en: '14 days — and why they end on an instant unlock.',
      },
      salesOnly: true,
      sections: [
        {
          de: 'Widerrufsbelehrung',
          en: 'Instructions on withdrawal',
          body: {
            de: `Du hast das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen. Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag des Vertragsabschlusses.\n\nUm dein Widerrufsrecht auszuüben, musst du mich (${name}, ${email}) mittels einer eindeutigen Erklärung — zum Beispiel einer E-Mail — über deinen Entschluss, diesen Vertrag zu widerrufen, informieren. Zur Wahrung der Widerrufsfrist reicht es, dass du die Mitteilung vor Ablauf der Frist absendest.`,
            en: `You have the right to withdraw from this contract within fourteen days without giving any reason. The withdrawal period is fourteen days from the day the contract was concluded.\n\nTo exercise your right of withdrawal, you must inform me (${name}, ${email}) of your decision by means of a clear statement — an email, for example. To meet the deadline it is enough that you send your notification before the period expires.`,
          },
        },
        {
          de: 'Folgen des Widerrufs',
          en: 'Effects of withdrawal',
          body: {
            de: 'Widerrufst du den Vertrag, erstatte ich dir alle Zahlungen unverzüglich und spätestens binnen vierzehn Tagen ab dem Tag zurück, an dem die Mitteilung über deinen Widerruf bei mir eingegangen ist. Für die Rückzahlung verwende ich dasselbe Zahlungsmittel, das du beim ursprünglichen Kauf eingesetzt hast; dafür werden dir keine Entgelte berechnet. Der freigeschaltete Inhalt wird dabei wieder gesperrt.',
            en: 'If you withdraw from this contract, I will refund all payments without undue delay and no later than fourteen days from the day on which your notification of withdrawal reached me. I will use the same means of payment you used for the original purchase; you will not be charged any fees for this. The unlocked content is locked again in the process.',
          },
        },
        {
          de: 'Wann das Widerrufsrecht vorzeitig erlischt',
          en: 'When the right of withdrawal ends early',
          body: {
            de: 'Alles, was es hier zu kaufen gibt, ist ein digitaler Inhalt, der sofort nach der Zahlung freigeschaltet wird. Das Widerrufsrecht erlischt deshalb vorzeitig, wenn du vor dem Kauf ausdrücklich zustimmst, dass ich sofort mit der Ausführung beginne, und gleichzeitig bestätigst, dass du damit dein Widerrufsrecht verlierst. Genau danach fragt die App vor jedem Kauf, und ohne diese Bestätigung kommst du nicht zur Bezahlseite — weil die Freischaltung nun einmal sofort passiert und nicht wieder eingesammelt werden kann. Möchtest du dein Widerrufsrecht behalten, kaufe hier bitte nicht; alles Gekaufte ist ohnehin reine Optik oder eine Bequemlichkeit, das Spiel selbst ist vollständig kostenlos.',
            en: 'Everything on sale here is digital content that is unlocked immediately after payment. The right of withdrawal therefore ends early if, before buying, you expressly agree that I may begin performance immediately and at the same time confirm that you thereby lose your right of withdrawal. That is exactly what the app asks before every purchase, and without that confirmation you never reach the payment page — because the unlock happens straight away and cannot be collected back in. If you would rather keep your right of withdrawal, please do not buy here; everything on sale is either cosmetic or a convenience, and the game itself is free in full.',
          },
        },
        {
          de: 'Muster-Widerrufsformular',
          en: 'Model withdrawal form',
          body: {
            de: `Wenn du den Vertrag widerrufen willst, kannst du dieses Formular abschreiben und an ${email} schicken — musst du aber nicht.\n\n„Hiermit widerrufe ich den von mir abgeschlossenen Vertrag über den Kauf der folgenden Ware / die Erbringung der folgenden Dienstleistung: …\nBestellt am: …\nName des Verbrauchers: …\nAnschrift des Verbrauchers: …\nDatum: …"`,
            en: `If you want to withdraw from the contract you may copy out this form and send it to ${email} — but you do not have to.\n\n“I hereby give notice that I withdraw from my contract for the purchase of the following goods / the supply of the following service: …\nOrdered on: …\nName of consumer: …\nAddress of consumer: …\nDate: …”`,
          },
        },
      ],
    },

    // ---------------------------------------------------------------- AGB
    {
      id: 'terms',
      icon: 'document-text',
      de: 'Nutzungsbedingungen',
      en: 'Terms of use',
      summary: {
        de: 'Was du kaufst, was es kostet, was es nicht kann.',
        en: 'What you buy, what it costs, what it cannot do.',
      },
      salesOnly: true,
      sections: [
        {
          de: '1. Geltungsbereich und Vertragspartner',
          en: '1. Scope and contracting party',
          body: {
            de: `Diese Bedingungen gelten für alle Käufe in der App „Beerpong Companion & Arcade". Vertragspartner ist:\n\n${address}\n\nAngebote richten sich an Verbraucher und Unternehmer; die Verbraucherrechte gelten nur für Verbraucher.`,
            en: `These terms apply to every purchase inside the “Beerpong Companion & Arcade” app. The contracting party is:\n\n${address}\n\nOffers are addressed to consumers and businesses alike; consumer rights apply only to consumers.`,
          },
        },
        {
          de: '2. Was kostenlos ist',
          en: '2. What is free',
          body: {
            de: `Das gesamte Arcade-Spiel, das Mitzählen von Hand, der Online-Modus, die Turniere, die Party-Anzeigetafel und alle Becher-Designs, die man sich mit Coins erspielt, sind dauerhaft kostenlos. Die automatische Kamera-Erkennung ist ${FREE_TRACKED_GAMES_PER_WEEK}× pro Woche kostenlos.`,
            en: `The whole arcade game, counting by hand, online play, tournaments, the party scoreboard and every cup design earned with coins are free for good. Automatic camera detection is free ${FREE_TRACKED_GAMES_PER_WEEK} times a week.`,
          },
        },
        {
          de: '3. Was es zu kaufen gibt',
          en: '3. What is on sale',
          body: {
            de: `Pro für ${euro(DEFAULT_PRICE_CENTS)} hebt das Wochenlimit der automatischen Erkennung auf. Ein Länder-Becherdesign kostet ${euro(CUP_PRICE_CENTS)}, alle zusammen ${euro(CUP_BUNDLE_CENTS)}. Alles davon ist eine einmalige Zahlung — es gibt kein Abo und keine Folgekosten. ${vat.de}`,
            en: `Pro at ${pounds(DEFAULT_PRICE_CENTS)} lifts the weekly limit on automatic detection. A country cup design costs ${pounds(CUP_PRICE_CENTS)}, or ${pounds(CUP_BUNDLE_CENTS)} for all of them. Every one of these is a single payment — there is no subscription and there are no running costs. ${vat.en}`,
          },
        },
        {
          de: '4. Kein Spielvorteil',
          en: '4. No gameplay advantage',
          body: {
            de: 'Gekaufte Becher-Designs ändern ausschließlich das Aussehen. Sie verbessern keine Trefferchance, geben keine Coins und verschaffen im Online-Spiel keinen Vorteil. Das ist kein Marketingversprechen, sondern steht so im Programmcode.',
            en: 'Bought cup designs change the look and nothing else. They do not improve your odds, pay no coins and give no advantage in an online game. That is not a marketing promise — it is how the code is written.',
          },
        },
        {
          de: '5. Vertragsschluss und Lieferung',
          en: '5. Conclusion of contract and delivery',
          body: {
            de: 'Der Vertrag kommt zustande, wenn die Zahlung bei Stripe abgeschlossen ist. Geliefert wird sofort danach in Form eines Freischaltcodes der Form BP-XXXX-XXXX-XXXX, der in der App angezeigt wird.',
            en: 'The contract is concluded once payment completes at Stripe. Delivery follows immediately, in the form of an unlock code shaped BP-XXXX-XXXX-XXXX shown inside the app.',
          },
        },
        {
          de: '6. Der Code ist die Quittung — bitte notieren',
          en: '6. The code is the receipt — write it down',
          body: {
            de: 'Weil es bewusst keine Benutzerkonten gibt, ist dieser Code der einzige Nachweis des Kaufs und der einzige Weg, ihn auf ein anderes Gerät zu übertragen. Notiere ihn. Geht er verloren, schreib mir mit deiner Stripe-Zahlungsbestätigung — dann kann ich ihn neu ausstellen. Ein Code kann technisch nicht gesperrt werden; wer ihn weitergibt, gibt die Freischaltung weiter.',
            en: 'Because there are deliberately no user accounts, this code is the only proof of purchase and the only way to move it to another device. Write it down. If you lose it, write to me with your Stripe payment confirmation and I can reissue it. A code cannot technically be revoked; passing it on passes the unlock on.',
          },
        },
        {
          de: '7. Verfügbarkeit und Gewährleistung',
          en: '7. Availability and warranty',
          body: {
            de: 'Es gelten die gesetzlichen Gewährleistungsrechte. Die automatische Kamera-Erkennung ist eine Hilfe und kein Schiedsrichter: sie kann Treffer übersehen und Treffer erfinden, was in der Anleitung offen beschrieben ist. Ein bestimmter Erkennungsgrad wird ausdrücklich nicht zugesichert. Sie läuft außerdem nur in der Web-Version. Der Online-Modus setzt eine Internetverbindung voraus; kurze Ausfälle sind möglich.',
            en: 'Statutory warranty rights apply. Automatic camera detection is an aid, not a referee: it can miss hits and invent them, which the manual says openly. No particular detection rate is warranted. It also only runs in the web version. Online play needs an internet connection; short outages are possible.',
          },
        },
        {
          de: '8. Haftung',
          en: '8. Liability',
          body: {
            de: 'Ich hafte unbeschränkt bei Vorsatz und grober Fahrlässigkeit sowie bei Verletzung von Leben, Körper und Gesundheit. Bei leicht fahrlässiger Verletzung wesentlicher Vertragspflichten hafte ich der Höhe nach begrenzt auf den vertragstypischen, vorhersehbaren Schaden. Im Übrigen ist die Haftung ausgeschlossen. Die Haftung nach dem Produkthaftungsgesetz bleibt unberührt.',
            en: 'I am fully liable for intent and gross negligence, and for injury to life, body or health. For slight negligence in breaching an essential contractual duty, my liability is limited to the foreseeable damage typical for this kind of contract. Otherwise liability is excluded. Liability under product liability law is unaffected.',
          },
        },
        {
          de: '9. Trinkspiel',
          en: '9. It is a drinking game',
          body: {
            de: 'Die App begleitet ein Spiel, das üblicherweise mit Alkohol gespielt wird. Sie richtet sich an Erwachsene. Wie viel getrunken wird, entscheidest du — dafür übernehme ich keine Verantwortung. Das Spiel funktioniert vollständig auch ohne Alkohol.',
            en: 'The app accompanies a game usually played with alcohol. It is aimed at adults. How much anyone drinks is your decision, and not something I take responsibility for. The game works perfectly well without alcohol.',
          },
        },
        {
          de: '10. Änderungen und Schlussbestimmungen',
          en: '10. Changes and final provisions',
          body: {
            de: 'Bereits gekaufte Freischaltungen bleiben bestehen, auch wenn sich Preise oder Bedingungen später ändern. Es gilt das Recht des Sitzes des Anbieters unter Ausschluss des UN-Kaufrechts; zwingende Verbraucherschutzvorschriften deines Aufenthaltslandes bleiben davon unberührt. Sollte eine Bestimmung unwirksam sein, bleiben die übrigen wirksam.',
            en: 'Unlocks already bought remain valid even if prices or terms change later. The law of the provider’s place of business applies, excluding the UN Convention on Contracts for the International Sale of Goods; mandatory consumer protection rules of your country of residence are unaffected. Should a provision be invalid, the remainder stay in force.',
          },
        },
      ],
    },
  ];
}

/** Picks the language out of a `{ de, en }` pair. */
export function inLanguage(text: { de: string; en: string }, language: Language): string {
  return language === 'en' ? text.en : text.de;
}

/**
 * The documents that should actually be on screen right now.
 *
 * With nothing for sale that is the privacy notice alone: the app still
 * processes data, so that one is never hidden, but an Impressum and terms of
 * sale for a shop that does not exist would be describing a business that does
 * not exist either.
 */
export function visibleDocuments(
  salesEnabled: boolean,
  operator: Operator = OPERATOR
): LegalDocument[] {
  if (!legalComplete(operator)) return [];
  return legalDocuments(operator).filter((doc) => salesEnabled || !doc.salesOnly);
}
