import { useCallback } from 'react';
import { useBeerpongStore } from './store';
import type { Language } from './languages';

export type { Language };
export { LANGUAGES } from './languages';

type Vars = Record<string, string | number>;

/**
 * Every piece of user-facing copy in the app. German is the source language;
 * `t()` falls back to it whenever an English string is missing, so a gap shows
 * up as untranslated text rather than a blank screen.
 */
const STRINGS = {
  // ---------------------------------------------------------------- common
  'common.back': { de: 'Zurück', en: 'Back' },
  'common.cancel': { de: 'Abbrechen', en: 'Cancel' },
  'common.close': { de: 'Schließen', en: 'Close' },
  'common.continue': { de: 'Weiter', en: 'Continue' },
  'common.start': { de: 'Start', en: 'Start' },
  'common.coins': { de: 'Coins', en: 'Coins' },
  'common.wins': { de: 'Siege', en: 'Wins' },
  'common.cups': { de: 'Cups', en: 'Cups' },
  'common.throws': { de: 'Würfe', en: 'Throws' },
  'common.streak': { de: 'Serie', en: 'Streak' },
  'common.player': { de: 'Spieler', en: 'Player' },
  'common.you': { de: 'Du', en: 'You' },
  'common.vs': { de: 'gegen', en: 'vs' },
  'common.soon': { de: 'Bald', en: 'Soon' },
  'share.button': { de: 'Ergebnis teilen', en: 'Share result' },
  'share.footer': { de: 'Gespielt mit der Beerpong App', en: 'Played with the Beerpong app' },
  'tab.camera': { de: 'Kamera', en: 'Camera' },
  'tab.arcade': { de: 'Arcade', en: 'Arcade' },

  // ------------------------------------------------------------ difficulty
  'ai.pro.label': { de: 'Profi', en: 'Pro' },
  'ai.pro.description': {
    de: 'Zielt auf die geschützte Mitte und wird ruhiger, je leerer dein Rack wird. Wer hier gewinnt, hat gut geworfen.',
    en: 'Aims at the sheltered middle and steadies as your rack empties. Beating this one means you threw well.',
  },
  'ai.easy.label': { de: 'Einfach', en: 'Easy' },
  'ai.easy.description': {
    de: 'Lockerer Gegner, viel Spielraum für deine Würfe.',
    en: 'A relaxed opponent — plenty of room for your throws.',
  },
  'ai.medium.label': { de: 'Mittel', en: 'Medium' },
  'ai.medium.description': {
    de: 'Trifft regelmäßig — Fehlwürfe werden bestraft.',
    en: 'Scores regularly — misses get punished.',
  },
  'ai.hard.label': { de: 'Schwer', en: 'Hard' },
  'ai.hard.description': {
    de: 'Räumt dein Rack ab, wenn du zu oft danebenwirfst.',
    en: 'Clears your rack if you miss too often.',
  },

  // ---------------------------------------------------------------- profile
  'profile.open': { de: 'Profil öffnen', en: 'Open profile' },
  'profile.overall': { de: 'Gesamtstatistik', en: 'Overall stats' },
  'profile.totalCups': { de: 'Cups gesamt', en: 'Cups total' },
  'profile.bestStreak': { de: 'Beste Serie', en: 'Best streak' },
  'profile.games': { de: 'Spiele', en: 'Games' },
  'profile.cameraTracker': { de: 'Kamera-Tracker', en: 'Camera tracker' },
  'profile.roundsPlayed': { de: 'Runden gespielt', en: 'Rounds played' },
  'profile.cupsTracked': { de: 'Cups getrackt', en: 'Cups tracked' },
  'profile.arcade': { de: 'Arcade', en: 'Arcade' },
  'profile.totalThrows': { de: 'Würfe gesamt', en: 'Throws total' },
  'profile.accuracy': { de: 'Trefferquote', en: 'Accuracy' },
  'profile.record': { de: 'Bilanz', en: 'Record' },
  'profile.recordValue': { de: '{wins}S / {losses}N', en: '{wins}W / {losses}L' },
  'profile.settings': { de: 'Einstellungen', en: 'Settings' },
  'profile.sound': { de: 'Sound-Effekte', en: 'Sound effects' },
  'profile.haptics': { de: 'Haptisches Feedback', en: 'Haptic feedback' },
  'profile.language': { de: 'Sprache', en: 'Language' },
  'profile.pro': { de: 'Beerpong Pro', en: 'Beerpong Pro' },

  // ------------------------------------------------------------- onboarding
  'onboarding.skip': { de: 'Überspringen', en: 'Skip' },
  'onboarding.guide': { de: 'Alles im Detail erklärt', en: 'Everything, explained in full' },
  'guide.title': { de: 'Anleitung', en: 'Guide' },
  'guide.intro': {
    de: 'Alles, was die App kann — {chapters} Kapitel, {items} Abschnitte. Tippe ein Kapitel an. Du musst das nicht auf einmal lesen; die Anleitung steht jederzeit im Profil.',
    en: 'Everything the app does — {chapters} chapters, {items} sections. Tap a chapter. You do not have to read it in one go; the guide is always in your profile.',
  },
  'guide.footnote': {
    de: 'Steht hier etwas, das nicht stimmt? Dann ist es ein Fehler in der Anleitung oder in der App — beides gehört gemeldet. Die Zahlen in diesem Text kommen direkt aus dem Programm, damit sie nicht auseinanderlaufen.',
    en: 'Something here not true? Then it is a fault in the guide or in the app — both are worth reporting. The numbers in this text come straight out of the program so the two cannot drift apart.',
  },
  'profile.guide': { de: 'Anleitung', en: 'Guide' },
  'profile.guideBody': {
    de: 'Alles erklärt: Kamera, Arcade, Online, Codes, Preise, Grenzen.',
    en: 'Everything explained: camera, arcade, online, codes, prices, limits.',
  },
  /** The same line without "Preise", for a build that has none. */
  'profile.guideBodyFree': {
    de: 'Alles erklärt: Kamera, Arcade, Online, Coins, Grenzen.',
    en: 'Everything explained: camera, arcade, online, coins, limits.',
  },
  'onboarding.start': { de: 'Los geht’s', en: "Let's go" },
  'onboarding.tracker.title': { de: 'Zähl dein echtes Spiel', en: 'Score your real game' },
  'onboarding.tracker.body': {
    de: 'Stell das Handy an den Tisch, gib beiden Teams einen Namen und tippe bei jedem Treffer auf den Bildschirm. Die App führt Cups, Serien und den Sieger.',
    en: 'Stand your phone at the table, name both teams and tap the screen on every hit. The app tracks cups, streaks and the winner.',
  },
  'onboarding.arcade.title': { de: 'Oder wirf selbst', en: 'Or throw yourself' },
  'onboarding.arcade.body': {
    de: 'Im Arcade-Modus liegt der Ball unter deinem Finger und geht mit, solange du hältst. Wie weit du ziehst, entscheidet, wie weit er fliegt — je länger der Zug, desto weiter. Auf das Tempo kommt es nicht an, du kannst dir also Zeit lassen. Getroffen wird der Becher, in dem er aufkommt.',
    en: 'In arcade mode the ball sits under your finger and moves with it while you hold. How far you drag decides how far it flies — the longer the drag, the further. Speed does not come into it, so take your time. You sink whatever cup it lands in.'
  },
  'onboarding.progress.title': { de: 'Alles zählt mit', en: 'Everything counts' },
  'onboarding.progress.body': {
    de: 'Jeder Cup bringt Coins und XP. Damit schaltest du Skins frei, steigst von Division 10 bis 1 auf und holst dir Tagesaufgaben und Erfolge ab.',
    en: 'Every cup earns coins and XP. Spend them on skins, climb from Division 10 to 1, and claim daily tasks and achievements along the way.',
  },

  // ------------------------------------------------------------ pro paywall
  'pro.title': { de: 'Beerpong Pro', en: 'Beerpong Pro' },
  'pro.teaser': {
    de: 'Kamera-Kontingent, Cup-Erkennung ohne Nachfragen — in Arbeit',
    en: 'Your camera allowance, and cup detection without the questions',
  },
  'pro.heroTitle': { de: 'Die Kamera zählt mit', en: 'Let the camera keep score' },
  'pro.heroBody': {
    de: 'Die App erkennt heute schon, wenn ein Becher verschwindet — fragt aber jedes Mal nach. Pro soll ohne Nachfrage auskommen.',
    en: 'The app already spots a cup going missing — but asks every time. Pro is meant to do without the question.',
  },
  'pro.inDevelopment': { de: 'In Entwicklung', en: 'In development' },
  'pro.whatsInside': { de: 'Was geplant ist', en: "What's planned" },
  'pro.feature.detect.title': { de: 'Echte Objekterkennung', en: 'Real object detection' },
  'pro.feature.detect.body': {
    de: 'Cups und Ball werden im Kamerabild erkannt, Treffer zählen sich selbst.',
    en: 'Cups and ball recognised in the camera feed, so hits count themselves.',
  },
  'pro.feature.stats.title': { de: 'Tiefe Statistiken', en: 'Deep stats' },
  'pro.feature.stats.body': {
    de: 'Trefferzonen, Formkurve über die Saison und Vergleich mit deinen Freunden.',
    en: 'Hit zones, form over the season and a comparison with your friends.',
  },
  'pro.feature.skins.title': { de: 'Pro-Skins', en: 'Pro skins' },
  'pro.feature.skins.body': {
    de: 'Exklusive Bälle und Tische, die es nicht für Coins gibt.',
    en: 'Exclusive balls and tables you cannot buy with coins.',
  },
  'pro.howItWorks': { de: 'Wie das funktionieren soll', en: 'How it is meant to work' },
  'pro.explainDetectTitle': { de: 'Cups automatisch zählen', en: 'Counting cups automatically' },
  'pro.explainOnlineTitle': {
    de: 'Zwei Tische, ein Spiel — und kostenlos',
    en: 'Two tables, one game — and free',
  },
  'pro.explainOnlineBody': {
    de: 'Der Online-Modus ist fertig und kostet nichts: Einer eröffnet eine Partie und teilt den Code, die andere Seite tritt bei. Ab da zählt jedes Team nur sein eigenes Rack — der Spielstand läuft zusammen, und wer dran ist, steht auf beiden Bildschirmen. Übertragen werden nur Treffer und Züge, kein Videobild. Zu finden über den Globus oben im Kamera-Modus.',
    en: 'Online play is built, and free: one side opens a game and shares the code, the other joins. From then on each team only counts its own rack — the score comes together and both screens show whose turn it is. Only hits and turns travel over the network, never video. It is behind the globe at the top of the camera screen.',
  },
  'pro.explainBody': {
    de: 'Heute musst du das Rack einmal von Hand ausrichten, und bei jedem erkannten Becher fragt die App nach. Mit Pro soll ein kleines Bilderkennungsmodell direkt auf dem Handy die Becher selbst finden — dann fallen Ausrichten und Nachfragen weg. Alles bleibt auf dem Gerät, es werden keine Videos hochgeladen.',
    en: 'Today you line the rack up by hand once, and the app asks about every cup it spots. With Pro a small vision model on the phone would find the cups itself — no lining up, no questions. Everything stays on the device; no video is uploaded.',
  },
  'pro.notifyCta': { de: 'Benachrichtige mich', en: 'Notify me' },
  'pro.notifyOn': { de: 'Vorgemerkt ✓', en: 'On the list ✓' },
  'pro.disclaimer': {
    de: 'Pro ist noch nicht kaufbar. Die Vormerkung wird nur lokal auf diesem Gerät gespeichert.',
    en: 'Pro is not purchasable yet. Your reminder is stored locally on this device only.',
  },

  // --------------------------------------------------------------- backup
  'backup.title': { de: 'Spielstand sichern', en: 'Back up your save' },
  'backup.offBody': {
    de: 'Alles — Coins, Level, Division, Skins, Statistiken und dein Kauf — liegt nur auf diesem Gerät. Neues Handy oder gelöschte Browserdaten heißt: weg. Mit der Sicherung liegt eine Kopie auf dem Server, und ein Code holt sie zurück.',
    en: 'Everything — coins, level, division, skins, stats and your purchase — lives on this device only. A new phone or cleared browser data means it is gone. With backup on, a copy sits on the server and one code brings it back.',
  },
  'backup.onBody': {
    de: 'Läuft. Nach jeder Änderung geht eine Kopie an den Server — ohne Konto, ohne E-Mail.',
    en: 'Running. A copy goes to the server after every change — no account, no email.',
  },
  'backup.turnOn': { de: 'Sicherung einschalten', en: 'Turn backup on' },
  'backup.turnOff': { de: 'Sicherung ausschalten und Kopie löschen', en: 'Turn backup off and delete the copy' },
  'backup.yourCode': { de: 'Dein Spielstand-Code', en: 'Your save code' },
  'backup.private': {
    de: 'Schreib ihn dir auf, am besten woanders als auf diesem Handy. Wer diesen Code hat, hat deinen Spielstand — gib ihn niemandem.',
    en: 'Write it down, ideally somewhere other than this phone. Whoever has this code has your save — do not give it to anyone.',
  },
  'backup.share': { de: 'Code an mich selbst schicken', en: 'Send the code to myself' },
  'backup.shareText': {
    de: 'Mein Beerpong-Spielstand-Code. Damit hole ich meinen Fortschritt auf ein neues Handy:',
    en: 'My Beerpong save code. This is how I get my progress onto a new phone:',
  },
  'backup.lastSync': { de: 'Zuletzt gesichert: {when}', en: 'Last backed up: {when}' },
  'backup.syncing': { de: 'Wird gesichert …', en: 'Backing up…' },
  'backup.today': { de: 'heute', en: 'today' },
  'backup.haveCode': { de: 'Ich habe einen Spielstand-Code', en: 'I have a save code' },
  'backup.enterBody': {
    de: 'Code von deinem alten Gerät eintippen. Der Spielstand von dort ersetzt dann alles, was auf diesem Gerät steht.',
    en: 'Type in the code from your old device. That save then replaces everything on this one.',
  },
  'backup.fetch': { de: 'Spielstand holen', en: 'Fetch the save' },
  'backup.notFound': {
    de: 'Zu diesem Code liegt nichts auf dem Server. Vertippt?',
    en: 'Nothing on the server under that code. A typo?',
  },
  'backup.thatIsTheUnlockCode': {
    de: 'Das ist dein Freischalt-Code (BP-…). Der Spielstand-Code fängt mit SV- an.',
    en: 'That is your unlock code (BP-…). A save code starts with SV-.',
  },
  'backup.failed': {
    de: 'Hat nicht geklappt. Internet weg?',
    en: 'That did not work. Connection gone?',
  },
  'backup.confirmTitle': { de: 'Alles hier überschreiben?', en: 'Overwrite everything here?' },
  'backup.confirmBody': {
    de: 'Gefunden: Stand von {when}. Der ersetzt Coins, Level, Division, Skins und Statistiken auf diesem Gerät vollständig. Was du hier seit der letzten Sicherung gespielt hast, ist danach weg — das lässt sich nicht rückgängig machen.',
    en: 'Found a save from {when}. It fully replaces the coins, level, division, skins and stats on this device. Anything played here since your last backup is gone afterwards — this cannot be undone.',
  },
  'backup.confirmAction': { de: 'Ja, überschreiben', en: 'Yes, overwrite' },
  'backup.noServer': {
    de: 'Dafür braucht die App die Server-Adresse aus dem Abschnitt „Online spielen" in der README. Ohne die gibt es keinen Ort für die Kopie.',
    en: 'This needs the server address from the “Playing online” section of the README. Without one there is nowhere to put the copy.',
  },
  'backup.oneDevice': {
    de: 'Gedacht für deine eigenen Geräte, eines nach dem anderen. Spielst du gleichzeitig auf zweien, gewinnt das, das zuletzt gesichert hat.',
    en: 'Meant for your own devices, one at a time. Play on two at once and the one that backed up last wins.',
  },

  // ----------------------------------------------------------------- shop
  'shop.buy': { de: 'Freischalten · {price}', en: 'Unlock · {price}' },
  'shop.buySub': {
    de: 'Einmalig. Kein Abo, keine Folgekosten.',
    en: 'One time. No subscription, nothing recurring.',
  },
  'shop.owned': { de: 'Freigeschaltet ✓', en: 'Unlocked ✓' },
  'shop.ownedBody': {
    de: 'Kamera-Tracking ohne Wochenlimit. Danke — im Ernst.',
    en: 'Camera tracking with no weekly limit. Thank you — genuinely.',
  },
  'shop.yourCode': { de: 'Dein Code', en: 'Your code' },
  'shop.codeHint': {
    de: 'Schreib ihn dir auf. Damit schaltest du auch ein zweites oder neues Handy frei — ohne Konto, ohne Anmeldung.',
    en: 'Write it down. It unlocks a second or replacement phone too — no account, no sign-in.',
  },
  'shop.restore': { de: 'Ich habe schon einen Code', en: 'I already have a code' },
  'shop.restoreAction': { de: 'Code einlösen', en: 'Redeem code' },
  'shop.codePlaceholder': { de: 'BP-XXXX-XXXX-XXXX', en: 'BP-XXXX-XXXX-XXXX' },
  'shop.badCode': {
    de: 'Diesen Code kennt der Server nicht. Vertippt?',
    en: 'The server does not know that code. A typo?',
  },
  'shop.notPaid': {
    de: 'Zu dieser Zahlung findet der Server nichts. Wurde sie abgebrochen?',
    en: 'The server finds no payment for that. Was it cancelled?',
  },
  'shop.cancelled': { de: 'Kauf abgebrochen. Alles unverändert.', en: 'Purchase cancelled. Nothing changed.' },
  'shop.startFailed': {
    de: 'Der Kauf ließ sich nicht öffnen. Internet weg?',
    en: 'Could not open the checkout. Connection gone?',
  },
  'shop.checking': { de: 'Zahlung wird geprüft …', en: 'Checking the payment…' },
  'shop.nativeHint': {
    de: 'Der Kauf läuft im Browser. Danach steht dort dein Code — den hier eintragen, dann ist auch diese App frei.',
    en: 'The purchase happens in the browser. Your code is shown there — type it in here and this app unlocks too.',
  },
  'shop.plannedNote': {
    de: 'Achtung: Das hier ist noch nicht gebaut und im Kauf nicht enthalten. Bezahlt wird allein das Kamera-Tracking ohne Wochenlimit.',
    en: 'Note: none of this is built yet and none of it is included. What the money buys is camera tracking without the weekly limit — that is all.',
  },
  'shop.stripeNote': {
    de: 'Bezahlt wird über Stripe. Die App sieht deine Kartendaten nie.',
    en: 'Payment goes through Stripe. The app never sees your card details.',
  },

  // ------------------------------------------------------------- free tier
  'free.label': { de: 'Dein Kontingent', en: 'Your allowance' },
  'free.left': {
    de: 'Noch {left} von {total} Kamera-Spielen diese Woche',
    en: '{left} of {total} camera games left this week',
  },
  'free.none': {
    de: 'Die {total} freien Kamera-Spiele dieser Woche sind aufgebraucht',
    en: "This week's {total} free camera games are used up",
  },
  'free.resets': {
    de: 'Am Montag gibt es wieder {total}. Ohne Kamera weiterzählen geht immer — tippt die Becher einfach von Hand ab.',
    en: 'You get {total} more on Monday. Counting by hand always works — just tap the cups yourself.',
  },
  'free.unlimited': {
    de: 'Kamera-Tracking ohne Limit',
    en: 'Camera tracking with no limit',
  },
  'free.arcadeFree': {
    de: 'Das Arcade-Spiel, alle Modi, Coins, Skins und Turniere bleiben vollständig kostenlos. Bezahlt wird nur, wenn die Kamera an einem echten Tisch für euch mitzählt.',
    en: 'The arcade game, every mode, coins, skins and tournaments stay completely free. The only thing money buys is the camera keeping score at a real table.',
  },
  // What the Pro screen says in a build that sells nothing. Not "coming soon"
  // and not a price with the button greyed out: this version genuinely has no
  // shop in it, and saying so plainly is shorter than explaining.
  'free.allFree.title': { de: 'Alles kostenlos', en: 'All free' },
  'free.allFree.body': {
    de: 'In dieser Version kostet nichts etwas. Die Kamera zählt ohne Wochenlimit mit, das ganze Arcade-Spiel, der Online-Modus, die Turniere und alle Becher-Designs, die man sich erspielt, sind dabei. Es gibt keinen Shop, keine Werbung und kein Abo.',
    en: 'Nothing in this version costs anything. The camera keeps score with no weekly limit, and the whole arcade game, online play, tournaments and every cup design you can earn are included. There is no shop, no advertising and no subscription.',
  },
  'free.allFree.teaser': {
    de: 'Was die App kann — und was es kostet: nichts',
    en: 'What the app does — and what it costs: nothing',
  },
  // The paid build's version of this line ends "…bezahlt wird nur, wenn die
  // Kamera mitzählt", which directly contradicts the card it sits under in a
  // build with no shop. Two sentences apart, and readers notice.
  'free.allFree.everything': {
    de: 'Das Arcade-Spiel, alle Modi, Coins, Skins, Turniere und die Kamera an einem echten Tisch — alles ohne Limit und ohne Bezahlung.',
    en: 'The arcade game, every mode, coins, skins, tournaments and the camera at a real table — all of it with no limit and nothing to pay.',
  },
  // The card at the foot of the screen. Deliberately not a third restatement
  // of "everything is free" — the header and the hero have said that twice
  // already. This answers the question somebody actually has by then: so what
  // is the catch?
  'free.allFree.noCatch': {
    de: 'Und es gibt keinen Haken: keine Werbung, keine Analyse-Werkzeuge, keine Konten. Was du spielst, bleibt auf deinem Gerät.',
    en: 'And there is no catch: no advertising, no analytics, no accounts. What you play stays on your device.',
  },
  'pro.explainBodyFree': {
    de: 'Heute musst du das Rack einmal von Hand ausrichten, und bei jedem erkannten Becher fragt die App nach. Später soll ein kleines Bilderkennungsmodell direkt auf dem Handy die Becher selbst finden — dann fallen Ausrichten und Nachfragen weg. Alles bleibt auf dem Gerät, es werden keine Videos hochgeladen.',
    en: 'Today you line the rack up by hand once, and the app asks about every cup it spots. Later a small vision model on the phone should find the cups itself — no lining up, no questions. Everything stays on the device; no video is uploaded.',
  },
  'free.devTitle': { de: 'Entwickler-Schalter', en: 'Developer switch' },
  'free.devBody': {
    de: 'Solange es nichts zu kaufen gibt, schaltet dieser Schalter das Limit ab. Er verschwindet, sobald es einen echten Kauf gibt.',
    en: 'While there is nothing to buy, this switch turns the limit off. It disappears once a real purchase exists.',
  },
  'free.devOn': { de: 'Limit abgeschaltet ✓', en: 'Limit switched off ✓' },
  'free.devOff': { de: 'Limit abschalten', en: 'Switch the limit off' },
  'shop.whyNoServer': {
    de: 'Grund: In dieser Version steckt keine Server-Adresse. Sie kommt aus der Variablen ONLINE_URL bei GitHub → Settings → Secrets and variables → Actions → Variables, und sie wirkt erst nach einem neuen Veröffentlichen der Web-App.',
    en: 'Reason: this build carries no server address. It comes from the ONLINE_URL variable under GitHub → Settings → Secrets and variables → Actions → Variables, and only takes effect after the web app is published again.',
  },
  'shop.whyUnreachable': {
    de: 'Grund: {url} antwortet nicht. Läuft der Server, und stimmt die Adresse?',
    en: 'Reason: {url} is not answering. Is the server running, and is the address right?',
  },
  'shop.whyNoKeys': {
    de: 'Grund: Der Server läuft, aber dort fehlt: {missing}. Beide müssen als Secret gesetzt sein, genau so geschrieben. Prüfen: {url}',
    en: 'Reason: the server is up, but it is missing: {missing}. Both must be set as secrets, spelled exactly. Check: {url}',
  },
  'shop.whyNoKeysBoth': {
    de: 'STRIPE_SECRET_KEY und LICENCE_SECRET',
    en: 'STRIPE_SECRET_KEY and LICENCE_SECRET',
  },
  'shop.whyNoLegal': {
    de: 'Grund: Der Verkauf wurde eingeschaltet, aber in lib/legal.ts fehlt noch: {missing}. Ohne vollständige Anbieterangaben bleibt der Shop zu — genau dafür ist die Sperre da.',
    en: 'Reason: selling was switched on, but lib/legal.ts is still missing: {missing}. Without complete provider details the shop stays shut — that is exactly what the block is for.',
  },

  // ----------------------------------------------------------- online play
  'online.title': { de: 'Online-Spiel', en: 'Online game' },
  'online.intro': {
    de: 'Ihr steht an eurem Tisch, die anderen an ihrem. Jede Seite filmt nur ihre eigenen Becher — der Spielstand läuft zusammen. Übertragen werden nur Treffer und Züge, niemals ein Videobild.',
    en: 'You stand at your table, they stand at theirs. Each side films only its own cups — the score comes together. Only hits and turns travel; never a video frame.',
  },
  'online.createTitle': { de: 'Raum eröffnen', en: 'Open a room' },
  'online.createBody': {
    de: 'Ihr bekommt einen Code aus vier Zeichen und gebt ihn weiter.',
    en: 'You get a four-character code and pass it on.',
  },
  'online.joinTitle': { de: 'Beitreten', en: 'Join' },
  'online.joinBody': {
    de: 'Code eintippen, den die andere Seite euch geschickt hat.',
    en: 'Type in the code the other side sent you.',
  },
  'online.codePlaceholder': { de: 'CODE', en: 'CODE' },
  'online.teamName': { de: 'Wie heißt euer Team?', en: 'What is your team called?' },
  'online.namePlaceholder': {
    de: 'Frei lassen geht auch',
    en: 'Leaving it empty is fine',
  },
  'online.cupsLabel': { de: 'Becher pro Seite', en: 'Cups per side' },
  'online.start': { de: 'Raum eröffnen', en: 'Open the room' },
  'online.join': { de: 'Beitreten', en: 'Join' },
  'online.codeTitle': { de: 'Euer Code', en: 'Your code' },
  'online.codeHint': {
    de: 'Sagt oder schickt den Code der anderen Seite. Er gilt, bis das Spiel vorbei ist.',
    en: 'Say or send the code to the other side. It lasts until the game is over.',
  },
  'online.shareCode': { de: 'Code teilen', en: 'Share the code' },
  'online.connecting': { de: 'Verbinde …', en: 'Connecting…' },
  'online.reconnecting': {
    de: 'Verbindung weg — es wird weiter versucht',
    en: 'Connection lost — still trying',
  },
  'online.waitingForOther': {
    de: 'Warten auf die andere Seite …',
    en: 'Waiting for the other side…',
  },
  'online.otherLeft': {
    de: 'Die andere Seite ist gerade weg. Der Spielstand bleibt.',
    en: 'The other side is away right now. The score stays.',
  },
  'online.refused.full': {
    de: 'In diesem Raum spielen schon zwei.',
    en: 'There are already two phones in this room.',
  },
  'online.refused.missing': {
    de: 'Diesen Code gibt es nicht. Vertippt, oder das Spiel ist vorbei.',
    en: 'No such code. Either a typo, or the game is over.',
  },
  'online.refused.taken': {
    de: 'Der Code ist gerade belegt — probiert es noch einmal.',
    en: 'That code is in use — try once more.',
  },
  'online.refused.badCode': { de: 'Der Code passt nicht.', en: 'That is not a code.' },
  'online.tryAgain': { de: 'Noch einmal', en: 'Try again' },
  'online.yourRack': { de: 'Eure Becher', en: 'Your cups' },
  'online.theirRack': { de: 'Ihre Becher', en: 'Their cups' },
  'online.yourTurn': { de: 'Ihr seid dran', en: 'Your throw' },
  'online.theirTurn': { de: 'Die andere Seite wirft', en: 'They are throwing' },
  'online.reportTitle': { de: 'Was ist an eurem Tisch passiert?', en: 'What happened at your table?' },
  'online.cupDown': { de: 'Becher weg', en: 'Cup gone' },
  'online.missed': { de: 'Daneben', en: 'Missed' },
  'online.reportHint': {
    de: 'Ihr meldet nur, was mit euren eigenen Bechern passiert — den Rest meldet die andere Seite.',
    en: 'You only report what happens to your own cups — the other side reports the rest.',
  },
  'online.leave': { de: 'Spiel verlassen', en: 'Leave the game' },
  'online.youWon': { de: 'Ihr habt gewonnen', en: 'You won' },
  'online.theyWon': { de: 'Die andere Seite gewinnt', en: 'The other side wins' },
  'online.rematch': { de: 'Revanche', en: 'Rematch' },
  'online.notSetUpTitle': { de: 'Noch kein Server eingetragen', en: 'No server set up yet' },
  'online.notSetUpBody': {
    de: 'Der Online-Modus braucht eine Adresse, unter der die Spiel-Räume laufen. Wie das kostenlos geht, steht in der README unter „Online spielen". Danach erscheint dieser Bildschirm von selbst.',
    en: 'Online play needs an address where the rooms run. The README explains how to get one for free under “Playing online”. This screen then works by itself.',
  },
  'online.cameraHint': {
    de: 'Kamera einschalten und eure eigenen Becher mitzählen lassen',
    en: 'Turn the camera on and let it count your own cups',
  },

  // -------------------------------------------------------------- not found
  'notFound.title': { de: 'Nicht gefunden', en: 'Not found' },
  'notFound.body': { de: 'Diese Seite existiert nicht.', en: 'This page does not exist.' },
  'notFound.link': { de: 'Zurück zum Tracker', en: 'Back to the tracker' },

  // --------------------------------------------------------- pass and play
  'passplay.intro': {
    de: 'Zwei Spieler an einem Handy. Ihr werft abwechselnd — nach jedem Wurf sagt die App, wer dran ist, und ihr gebt das Handy weiter.',
    en: 'Two players, one phone. You throw in turns — after each throw the app says who is up, and you pass the phone along.',
  },
  'passplay.playerN': { de: 'Spieler {n}', en: 'Player {n}' },
  'passplay.throwsUp': { de: 'wirft nach oben', en: 'throws upwards' },
  'passplay.throwsDown': { de: 'wirft nach unten', en: 'throws downwards' },
  // Was "the faster your hand as you let go". That stopped being true when the
  // throw moved to being measured by how far you drag — see ThrowBall, where
  // the origin of the gesture is kept for exactly this reason. A rules card
  // that teaches the old control is worse than no rules card.
  'passplay.rule.swipe': {
    de: 'Ball wie sonst mit dem Finger führen — je weiter du zurückziehst, desto weiter der Wurf.',
    en: 'Guide the ball with your finger as usual — the further you drag back, the further it flies.',
  },
  'passplay.rule.reRack': {
    de: 'Einmal pro Spiel darf jede Seite ihre eigenen Becher zusammenschieben.',
    en: 'Once a game each side may push their own cups together.',
  },
  'passplay.rule.camera': {
    de: 'Nach jedem Wurf wechselt die Ansicht auf die andere Seite.',
    en: 'After each throw the view swings round to the other side.',
  },
  'passplay.startGame': { de: 'Spiel starten', en: 'Start game' },

  // --------------------------------------------------------- camera tracker
  'tracker.title': { de: 'TRACKER', en: 'TRACKER' },
  'tracker.permission.title': { de: 'Kamera-Zugriff nötig', en: 'Camera access needed' },
  'tracker.permission.body': {
    de: 'Beerpong nutzt die Kamera, um dein Live-Spiel zu tracken. Erlaube den Zugriff, um Treffer per Tap zu zählen.',
    en: 'Beerpong uses the camera to track your live game. Allow access to count hits by tapping.',
  },
  'tracker.permission.cta': { de: 'Kamera erlauben', en: 'Allow camera' },
  'tracker.finished': { de: 'Spiel beendet', en: 'Game over' },
  'tracker.throwingAt': { de: '{shooter} wirft auf {target}', en: '{shooter} is throwing at {target}' },
  // ------------------------------------------------------- cup auto-detect
  'detect.button': { de: 'Auto-Erkennung', en: 'Auto detect' },
  'detect.alignStep': { de: '{step}/2 · Rack von {team}', en: '{step}/2 · {team}’s rack' },
  'detect.alignBody': {
    de: 'Ringe auf die echten Becher legen: ziehen zum Verschieben, zwei Finger zum Vergrößern und Drehen. Steht das Handy an der Längsseite, liegen die Racks quer — dafür ist der 90°-Knopf da.',
    en: 'Put the rings on the real cups: drag to move, two fingers to resize and turn. With the phone at the side of the table the racks lie sideways — that is what the 90° button is for.',
  },
  'detect.turnTip': {
    de: 'Handy quer halten zeigt fast dreimal so viel vom Tisch — dann von der Längsseite filmen.',
    en: 'Turning the phone sideways shows nearly three times as much table — then film from the long side.',
  },
  'detect.heightTip': {
    de: 'Hoch genug aufstellen: mindestens etwa 80 cm über der Tischplatte, schräg von oben. Flacher gehalten läuft das Raster mit der Perspektive auseinander, und die hinteren Ringe sitzen neben ihren Bechern.',
    en: 'Stand it high enough: about 80 cm above the table top or more, looking down at an angle. Held flatter, the grid and the perspective drift apart and the back rings sit beside their cups.',
  },
  'detect.alignOwn': { de: 'Euer eigenes Rack', en: 'Your own rack' },
  'detect.nextRack': { de: 'Weiter zum 2. Rack', en: 'On to rack 2' },
  'detect.onlyOne': { de: 'Nur ein Rack', en: 'Just one rack' },
  'detect.start': { de: 'Passt — los', en: 'Looks right — go' },
  'detect.watchingBoth': {
    de: 'Beide Racks im Blick · {left} Becher',
    en: 'Watching both racks · {left} cups',
  },
  'detect.watchingOne': {
    de: 'Ein Rack im Blick · {left} Becher',
    en: 'Watching one rack · {left} cups',
  },
  'detect.recalibrate': { de: 'Neu ausrichten', en: 'Line up again' },
  'detect.stop': { de: 'Beenden', en: 'Stop' },
  'detect.hitTitle': { de: 'Becher weg — Treffer?', en: 'Cup gone — was that a hit?' },
  'detect.hitBody': {
    de: 'Bei {loser} fehlt ein Becher — bestätige, dann geht der Punkt an {scorer}.',
    en: 'A cup is missing from {loser} — confirm and the point goes to {scorer}.',
  },
  'detect.wasAHit': { de: 'Treffer', en: 'Hit' },
  'detect.notAHit': { de: 'War nichts', en: 'False alarm' },
  'detect.disturbed': {
    de: 'Rack von {team} komplett verändert — Kamera bewegt oder Licht gewechselt. Bei Fehlern neu ausrichten.',
    en: '{team}’s rack changed all at once — camera moved or the light did. Line up again if it starts guessing.',
  },
  'detect.rebaselined': {
    de: 'Bild neu eingelesen ({team}) — falls dabei ein Becher gefallen ist, bitte von Hand nachtragen.',
    en: 'View re-read ({team}) — if a cup went down meanwhile, add it by hand.',
  },
  'detect.noFrame': {
    de: 'Kein Kamerabild — Zugriff erlaubt und Kamera frei?',
    en: 'No camera image — is access allowed and the lens clear?',
  },
  'detect.unsupported': {
    de: 'Die Auto-Erkennung läuft nur in der Web-Version. In der installierten App fehlt der Zugriff auf einzelne Kamerabilder.',
    en: 'Auto detection only runs in the web version. The installed app has no access to individual camera frames.',
  },

  'rivals.findHuman': { de: 'Echten Gegner suchen', en: 'Find a real opponent' },
  'rivals.searching': {
    de: 'Suche einen Gegner … {seconds} s',
    en: 'Looking for an opponent… {seconds}s',
  },
  'rivals.nobodyThere': {
    de: 'Gerade wartet niemand. Du kannst weitersuchen oder unten gegen den Computer spielen — der zählt genauso für die Division.',
    en: 'Nobody is waiting right now. Keep looking, or play the computer below — that counts for the division just the same.',
  },
  'rivals.bothCount': {
    de: 'Beides zählt für deine Division. Gegen den Computer steht „KI" dran, gegen einen Menschen der Name der anderen Seite.',
    en: 'Both count towards your division. The computer is labelled as such; a person shows their own name.',
  },

  // ---------------------------------------------------------- cup designs
  'cups.title': { de: 'Becher-Designs', en: 'Cup designs' },
  'cups.intro': {
    de: 'Spielt unter eurer Flagge. Jedes Design gehört dir dauerhaft, gilt auf allen Geräten mit deinem Code — und die andere Seite sieht es im Online-Spiel.',
    en: 'Play under your own flag. Each design is yours for good, works on any device with your code — and the other table sees it in an online game.',
  },
  'cups.yours': { de: 'Deine Becher', en: 'Your cups' },
  'cups.forSale': { de: 'Zu haben', en: 'For sale' },
  'cups.onTheTable': { de: 'AUF DEM TISCH', en: 'ON THE TABLE' },
  'cups.owned': { de: 'Gehört dir', en: 'Yours' },
  'cups.oneOff': { de: 'Einmalig, kein Abo', en: 'One-off, no subscription' },
  'cups.closed': {
    de: 'Kaufen geht noch nicht — auf dem Pro-Bildschirm steht, woran es liegt.',
    en: 'Buying is not possible yet — the Pro screen says why.',
  },
  'cups.bundleTitle': { de: 'Alle Länder auf einmal', en: 'Every country at once' },
  'cups.bundleBody': {
    de: 'Alle {count} Designs für {price} statt einzeln. Wer mehr als vier will, fährt damit besser.',
    en: 'All {count} designs for {price} instead of one at a time. Better value past four of them.',
  },
  'cups.bundleBuy': { de: 'Alle für {price}', en: 'All for {price}' },
  'cups.bought': {
    de: 'Freigeschaltet. Dein Code: {code} — notiere ihn, damit du das Design auf einem neuen Handy wiederbekommst.',
    en: 'Unlocked. Your code: {code} — write it down so you can get the design back on a new phone.',
  },
  'cups.restore': { de: 'Code eingeben (schon gekauft)', en: 'Enter a code (already bought)' },
  'cups.restoreBody': {
    de: 'Code aus einem früheren Kauf eintippen. Er schaltet genau das Design frei, für das er ausgestellt wurde.',
    en: 'Type a code from an earlier purchase. It unlocks exactly the design it was issued for.',
  },
  'cups.footnote': {
    de: 'Becher-Designs ändern nichts am Spiel — kein Vorteil, keine besseren Chancen, nur das Aussehen. Bezahlt wird einmal, über Stripe.',
    en: 'Cup designs change nothing about the game — no advantage, no better odds, only the look. Paid once, through Stripe.',
  },
  // The paid intro and footnote both talk about a code and about Stripe. With
  // no shop there is neither, and this screen is then only the shelf of what
  // you already own.
  'cups.introFree': {
    de: 'Deine Becher. Designs bekommst du unter Skins → Becher für Coins, die du dir erspielst — hier suchst du aus, welches auf dem Tisch steht.',
    en: 'Your cups. Designs are earned with coins under Skins → Cups; here you pick which one goes on the table.',
  },
  'cups.footnoteFree': {
    de: 'Becher-Designs ändern nichts am Spiel — kein Vorteil, keine besseren Chancen, nur das Aussehen.',
    en: 'Cup designs change nothing about the game — no advantage, no better odds, only the look.',
  },
  // ------------------------------------------------------------- rechtliches
  'legal.title': { de: 'Rechtliches', en: 'Legal' },
  'legal.teaser': {
    de: 'Impressum, Datenschutz, Widerruf und Bedingungen',
    en: 'Legal notice, privacy, withdrawal and terms',
  },
  'legal.privacyOnlyTeaser': {
    de: 'Datenschutz — was die App speichert',
    en: 'Privacy — what the app stores',
  },
  'legal.intro': {
    de: 'Die vollständigen Texte, direkt in der App. Zum Aufklappen antippen.',
    en: 'The full texts, right here in the app. Tap to open one.',
  },
  // Only reachable by typing the address in: nothing links here while the
  // block in lib/legal.ts is blank. It still has to say something, because an
  // empty page under the heading "Rechtliches" looks like a broken app rather
  // than an unconfigured one.
  'legal.empty': {
    de: 'Für diese Version sind keine Anbieterangaben hinterlegt. Sie werden gebraucht, sobald etwas verkauft wird — einzutragen im Block OPERATOR in lib/legal.ts.',
    en: 'No provider details are set for this build. They are needed as soon as anything is sold — fill in the OPERATOR block in lib/legal.ts.',
  },

  // --------------------------------------------------------- kaufbestätigung
  'consent.title': { de: 'Vor dem Kauf', en: 'Before you buy' },
  'consent.what': { de: '{item} · {price} · einmalig', en: '{item} · {price} · one-off' },
  'consent.terms': {
    de: 'Ich habe die Nutzungsbedingungen und die Datenschutzerklärung gelesen und bin damit einverstanden.',
    en: 'I have read the terms of use and the privacy policy and agree to them.',
  },
  'consent.waiver': {
    de: 'Ich verlange ausdrücklich, dass sofort mit der Ausführung begonnen wird. Mir ist bekannt, dass ich mit der vollständigen Freischaltung mein Widerrufsrecht verliere.',
    en: 'I expressly request that performance begins immediately. I understand that I lose my right of withdrawal once the unlock is complete.',
  },
  'consent.why': {
    de: 'Die Freischaltung passiert sofort nach der Zahlung und lässt sich danach nicht mehr zurücknehmen — deshalb muss beides angehakt sein. Willst du dein Widerrufsrecht behalten, kauf hier bitte nicht: das Spiel selbst ist ohnehin vollständig kostenlos.',
    en: 'The unlock happens straight after payment and cannot be taken back afterwards — which is why both boxes are needed. If you would rather keep your right of withdrawal, please do not buy: the game itself is free in full anyway.',
  },
  'consent.read': { de: 'Texte lesen', en: 'Read the texts' },
  'consent.continue': { de: 'Weiter zur Bezahlung', en: 'Continue to payment' },

  'hub.cups.title': { de: 'Becher-Designs', en: 'Cup designs' },
  'hub.cups.subtitle': {
    de: 'Länder-Becher — spielt unter eurer Flagge',
    en: 'Country cups — play under your own flag',
  },

  // ------------------------------------------------- arcade against a phone
  'arcadeOnline.title': { de: 'Online spielen', en: 'Play online' },
  'arcadeOnline.intro': {
    de: 'Das Arcade-Spiel gegen einen echten Menschen statt gegen den Computer. Einer eröffnet, gibt den Code weiter, der andere tritt bei — dann wird abwechselnd geworfen, und ihr seht die Würfe der anderen Seite fliegen.',
    en: 'The arcade game against a real person instead of the computer. One opens a room, passes the code on, the other joins — then you throw in turns and watch each other’s balls fly.',
  },
  'arcadeOnline.yourName': { de: 'Wie heißt du?', en: 'What is your name?' },
  'arcadeOnline.createBody': {
    de: 'Ihr bekommt einen Code aus vier Zeichen. Gib ihn weiter, dann kann die andere Seite beitreten.',
    en: 'You get a four-character code. Pass it on and the other side can join.',
  },
  'arcadeOnline.fairPlay': {
    de: 'Jede Seite wirft auf dem eigenen Handy, und das Ergebnis eines Wurfs kommt von dort. Wer unbedingt will, kann also schummeln — ein Code, den man jemandem vorliest, ist kein Turnier. Spielt mit Leuten, die ihr mögt.',
    en: 'Each side throws on its own phone, and the result of a throw comes from there. So somebody determined could cheat — a code you read out to a friend is not a tournament. Play with people you like.',
  },
  'hub.arcadeOnline.title': { de: 'Online gegen Freunde', en: 'Online against friends' },
  'hub.arcadeOnline.subtitle': {
    de: 'Zwei Handys, ein Tisch — abwechselnd werfen',
    en: 'Two phones, one table — throwing in turns',
  },
  'hub.arcadeOnline.off': {
    de: 'Kein Server eingetragen',
    en: 'No server set up',
  },

  'tracker.openOnline': {
    de: 'Online gegen anderen Tisch spielen (Pro)',
    en: 'Play online against another table (Pro)',
  },
  'tracker.openTournament': { de: 'Turnier öffnen', en: 'Open tournament' },
  'tracker.openHouseRules': { de: 'House Rules öffnen', en: 'Open house rules' },
  'tracker.tapHint': {
    de: 'Tippe irgendwo, wenn {shooter} trifft',
    en: 'Tap anywhere when {shooter} scores',
  },
  'tracker.miss': { de: 'Fehlwurf', en: 'Miss' },
  'tracker.team': { de: 'Team', en: 'Team' },
  'tracker.newGame': { de: 'Neues Spiel', en: 'New game' },
  'tracker.rematch': { de: 'Revanche', en: 'Rematch' },
  'tracker.hitsPercent': { de: 'Treffer · {percent}%', en: 'Hits · {percent}%' },
  'tracker.bestStreak': { de: 'Beste Serie {value}', en: 'Best streak {value}' },
  'tracker.throwsMeta': {
    de: '{hits}/{throws} Würfe · Serie {streak}',
    en: '{hits}/{throws} throws · streak {streak}',
  },

  // ----------------------------------------------------------- house rules
  'rules.reRacks': {
    de: 'Cups dürfen bis zu zweimal neu aufgestellt werden.',
    en: 'Cups may be re-racked up to twice.',
  },
  'rules.island': {
    de: 'Letzter Cup ohne Nachbarn zählt doppelt.',
    en: 'A lone cup with no neighbours counts double.',
  },
  'rules.redemption': {
    de: 'Verlierendes Team bekommt einen letzten Wurf.',
    en: 'The losing team gets one last throw.',
  },

  // ------------------------------------------------------------- tournament
  'tournament.title': { de: 'Turnier', en: 'Tournament' },
  'tournament.intro': {
    de: 'Trage {min} bis {max} Teams ein. Die App erstellt den Turnierbaum, ihr spielt am echten Tisch, und der Sieger jedes Spiels rückt automatisch weiter.',
    en: 'Enter {min} to {max} teams. The app builds the bracket, you play at the real table, and each winner advances automatically.',
  },
  'tournament.teams': { de: 'Teams', en: 'Teams' },
  'tournament.addTeam': { de: 'Team hinzufügen', en: 'Add team' },
  'tournament.start': {
    de: 'Turnier mit {count} Teams starten',
    en: 'Start tournament with {count} teams',
  },
  'tournament.needMore': { de: 'Mindestens {min} Teams', en: 'At least {min} teams' },
  'tournament.champion': { de: 'Turniersieger', en: 'Tournament winner' },
  'tournament.newTournament': { de: 'Neues Turnier', en: 'New tournament' },
  'tournament.upNext': { de: 'Als Nächstes', en: 'Up next' },
  'tournament.playInTracker': { de: 'Im Tracker spielen', en: 'Play in the tracker' },
  'tournament.open': { de: 'offen', en: 'open' },
  'tournament.wins': { de: 'gewinnt', en: 'wins' },
  'tournament.round.final': { de: 'Finale', en: 'Final' },
  'tournament.round.semi': { de: 'Halbfinale', en: 'Semi-final' },
  'tournament.round.quarter': { de: 'Viertelfinale', en: 'Quarter-final' },
  'tournament.round.n': { de: 'Runde {round}', en: 'Round {round}' },

  // ------------------------------------------------------------- arcade hub
  'hub.title': { de: 'ARCADE', en: 'ARCADE' },
  'hub.careerLevel': { de: 'Career Level {level}', en: 'Career level {level}' },
  'hub.modes': { de: 'Spielmodi', en: 'Game modes' },
  // The hero card at the top. "Weiterspielen" rather than "Spielen" because it
  // names the mode you last chose — a generic verb over the first item in a
  // list is just a list with a bigger first row.
  'hub.hero.eyebrow': { de: 'Weiterspielen', en: 'Carry on' },
  'hub.hero.firstEyebrow': { de: 'Loslegen', en: 'Get started' },
  'hub.hero.action': { de: 'Werfen', en: 'Throw' },
  'hub.hero.firstSubtitle': {
    de: 'Ein Rack, ein Gegner — such dir die Schwierigkeit aus',
    en: 'One rack, one opponent — pick your difficulty',
  },
  'hub.hero.lastPlayed': { de: 'Zuletzt: {last}', en: 'Last: {last}' },
  'hub.others': { de: 'Gegen andere', en: 'Against others' },
  'hub.offline.title': { de: 'Offline vs. KI', en: 'Offline vs. AI' },
  'hub.offline.subtitle': {
    de: 'Zuletzt: {last} · Einfach, Mittel oder Schwer',
    en: 'Last: {last} · Easy, Medium or Hard',
  },
  'hub.passplay.title': { de: 'Pass & Play', en: 'Pass & Play' },
  'hub.passplay.subtitle': {
    de: 'Zwei Spieler, ein Handy — abwechselnd werfen',
    en: 'Two players, one phone — throw in turns',
  },
  'hub.rivals.title': { de: 'Division Rivals', en: 'Division Rivals' },
  'hub.rivals.subtitle': {
    de: '{division} · {wins}/{target} Siege bis Aufstieg',
    en: '{division} · {wins}/{target} wins to promotion',
  },
  'hub.weekend.title': { de: 'Weekend League', en: 'Weekend League' },
  'hub.weekend.running': {
    de: 'Lauf läuft · {played}/{matches} Spiele · {wins} Siege',
    en: 'Run in progress · {played}/{matches} games · {wins} wins',
  },
  'hub.weekend.idle': {
    de: '{matches} Spiele, vier Belohnungsstufen',
    en: '{matches} games, four reward tiers',
  },
  'hub.weekend.locked': {
    de: 'Ab Division {division} freigeschaltet',
    en: 'Unlocks at Division {division}',
  },
  'hub.progress': { de: 'Fortschritt', en: 'Progress' },
  'hub.challenges.title': { de: 'Aufgaben & Erfolge', en: 'Challenges & achievements' },
  'hub.challenges.subtitle': {
    de: 'Tagesaufgaben, Saison-Stufen und Erfolge',
    en: 'Daily tasks, season tiers and achievements',
  },
  'hub.challenges.ready1': { de: '1 Belohnung abholbereit', en: '1 reward ready to claim' },
  'hub.challenges.readyN': { de: '{count} Belohnungen abholbereit', en: '{count} rewards ready to claim' },
  'hub.collection': { de: 'Sammlung', en: 'Collection' },
  'hub.skins.title': { de: 'Skins', en: 'Skins' },
  'hub.skins.subtitle': { de: 'Bälle und Tische freischalten', en: 'Unlock balls and tables' },
  'hub.stat.rivalsWins': { de: 'Rivals-Siege', en: 'Rivals wins' },
  'hub.stat.bestDivision': { de: 'Beste Division', en: 'Best division' },
  'hub.stat.weekendBest': { de: 'WL-Bestwert', en: 'WL best' },

  // ----------------------------------------------------------- match screen
  'match.badge.ai': { de: 'KI · {difficulty}', en: 'AI · {difficulty}' },
  'match.yourTurn': {
    de: 'Dein Wurf — Ball ziehen: je weiter, desto weiter fliegt er',
    en: 'Your throw — drag the ball: the further you drag, the further it flies',
  },
  'match.opponentAiming': { de: '{name} zielt …', en: '{name} is aiming …' },
  'match.weekendHeader': {
    de: 'Spiel {played}/{matches} · {wins} Siege',
    en: 'Game {played}/{matches} · {wins} wins',
  },
  'match.ballsBack': { de: 'BÄLLE ZURÜCK', en: 'BALLS BACK' },
  'match.yourTurnBall': {
    de: 'Ball {ball} von {of} — beide treffen und du bekommst sie zurück',
    en: 'Ball {ball} of {of} — sink both and you get them back',
  },
  'match.redemption': { de: 'LETZTE CHANCE', en: 'REDEMPTION' },
  'match.redemptionHint': {
    de: 'Letzte Chance — triff, solange du kannst. Ein Fehlwurf und es ist vorbei.',
    en: 'Redemption — keep sinking them. One miss and it is over.',
  },
  // ----------------------------------------------------------- highlights
  'highlights.title': { de: 'Highlights', en: 'Highlights' },
  'highlights.toggle': { de: 'Highlights aufnehmen', en: 'Record highlights' },
  'highlights.toggleHint': {
    de: 'Die Sekunden vor jedem bestätigten Becher werden als kurzer Clip gespeichert — nur auf diesem Gerät.',
    en: 'The seconds before each confirmed cup are kept as a short clip — on this device only.',
  },
  'highlights.saved': { de: 'Highlight gespeichert', en: 'Highlight saved' },
  'highlights.empty': {
    de: 'Noch keine Clips. Schalte im Kamera-Modus „Highlights aufnehmen" ein — danach wird bei jedem bestätigten Becher der Anlauf gespeichert.',
    en: 'No clips yet. Turn on “Record highlights” in camera mode, and the run-up to every confirmed cup is kept.',
  },
  'highlights.unsupported': {
    de: 'Dieses Gerät kann im Hintergrund nicht mitschneiden. In der Web-App auf dem Handy funktioniert es.',
    en: 'This device cannot record in the background. It works in the web app on a phone.',
  },
  'highlights.count': { de: '{count} von {max} Clips', en: '{count} of {max} clips' },
  'highlights.delete': { de: 'Löschen', en: 'Delete' },
  'highlights.clearAll': { de: 'Alle löschen', en: 'Delete all' },
  'highlights.clip': { de: '{seconds} s · {size}', en: '{seconds}s · {size}' },
  'highlights.note': {
    de: 'Clips liegen nur auf diesem Gerät und werden nirgendwohin hochgeladen. Ist die Liste voll, fällt der älteste heraus.',
    en: 'Clips stay on this device and are uploaded nowhere. When the list is full the oldest drops off.',
  },

  // ---------------------------------------------------------------- stats
  'stats.title': { de: 'Deine Zahlen', en: 'Your numbers' },
  'stats.hubTitle': { de: 'Statistiken', en: 'Stats' },
  'stats.hubSubtitle': {
    de: 'Trefferbild, Form und wie lange du für einen Becher brauchst',
    en: 'Where you hit, your form, and how long a cup takes you',
  },
  'stats.heatmapLabel': { de: 'Trefferbild', en: 'Where you hit' },
  'stats.heatmapTitle': { de: 'Verteilung über das Rack', en: 'Spread across the rack' },
  'stats.heatmapBody': {
    de: 'Anteil deiner {cups} versenkten Becher, nach Position im Rack. Gleichmäßig heißt: du wirfst überallhin gleich gut.',
    en: 'Share of your {cups} sunk cups by position in the rack. Even means you throw equally well everywhere.',
  },
  'stats.heatmapEmpty': {
    de: 'Noch keine Treffer im Arcade aufgezeichnet. Nach ein paar Würfen steht hier, wo deine Bälle landen.',
    en: 'No arcade hits recorded yet. After a few throws this shows where your balls land.',
  },
  'stats.formLabel': { de: 'Form', en: 'Form' },
  'stats.formTitle': { de: 'Die letzten {count} Spiele', en: 'The last {count} games' },
  'stats.formOrder': { de: 'Neueste links.', en: 'Newest on the left.' },
  'stats.formEmpty': {
    de: 'Noch kein Spiel zu Ende gespielt.',
    en: 'No finished games yet.',
  },
  'stats.win': { de: 'S', en: 'W' },
  'stats.loss': { de: 'N', en: 'L' },
  'stats.net': { de: 'Siege minus Niederlagen', en: 'Wins minus losses' },
  'stats.paceLabel': { de: 'Tempo', en: 'Pace' },
  'stats.paceTitle': { de: 'Zeit pro Becher', en: 'Time per cup' },
  'stats.paceBody': {
    de: 'Gesamtdauer geteilt durch die Becher, die du selbst versenkt hast.',
    en: 'Total time divided by the cups you sank yourself.',
  },
  'stats.perCup': { de: 'pro Becher', en: 'per cup' },
  'stats.noData': { de: 'noch nichts', en: 'nothing yet' },
  'stats.numbersLabel': { de: 'Kurz gefasst', en: 'In short' },
  'stats.hitRate': { de: 'Trefferquote', en: 'Hit rate' },
  'stats.bestRun': { de: 'Längste Siegesserie', en: 'Longest win run' },
  'stats.recorded': { de: 'Aufgezeichnete Spiele', en: 'Games recorded' },
  'stats.divisionLabel': { de: 'Aufstieg', en: 'Climb' },
  'stats.divisionTitle': { de: 'Division nach jedem Rivalen-Spiel', en: 'Division after each rivals game' },
  'stats.divisionBody': {
    de: 'Höher heißt weiter oben: Division 1 ist die Spitze.',
    en: 'Higher is better: Division 1 is the top.',
  },
  'stats.footnote': {
    de: 'Aufgezeichnet werden die letzten 30 Spiele, nur auf diesem Gerät. Das Trefferbild zählt deine eigenen Arcade-Würfe — am echten Tisch weiß die App nur, dass ein Becher weg ist, nicht wer wohin gezielt hat.',
    en: 'The last 30 games are kept, on this device only. The heatmap counts your own arcade throws — at a real table the app only knows a cup went, not who was aiming where.',
  },

  // ------------------------------------------------------------ lucky shot
  'lucky.title': { de: 'Lucky Shot', en: 'Lucky Shot' },
  'lucky.hubTitle': { de: 'Lucky Shot', en: 'Lucky Shot' },
  'lucky.hubReady': {
    de: 'Ein Wurf, ein goldener Becher — heute noch frei',
    en: 'One throw, one golden cup — still free today',
  },
  'lucky.hubDone': {
    de: 'Heute schon geworfen. Morgen wieder.',
    en: 'Today’s throw is gone. Back tomorrow.',
  },
  'lucky.prize': { de: 'Goldener Becher: {coins} Coins', en: 'Golden cup: {coins} coins' },
  'lucky.streak': { de: '{days} Tage in Folge', en: '{days} days in a row' },
  'lucky.hint': {
    de: 'Ein Ball. Triff den goldenen Becher — jeder andere bringt ein Trostgeld.',
    en: 'One ball. Sink the golden cup — any other one is a consolation.',
  },
  'lucky.wonTitle': { de: 'GOLDENER BECHER', en: 'GOLDEN CUP' },
  'lucky.wonSub': {
    de: '{coins} Coins. In {hours} Stunden gibt es den nächsten Wurf.',
    en: '{coins} coins. Your next throw is in {hours} hours.',
  },
  'lucky.cupTitle': { de: 'Getroffen — aber nicht der goldene', en: 'In — but not the gold one' },
  'lucky.missTitle': { de: 'Daneben', en: 'Missed' },
  'lucky.comeBack': { de: 'In {hours} Stunden gibt es den nächsten Wurf.', en: 'Your next throw is in {hours} hours.' },
  'lucky.doneTitle': { de: 'Heute schon geworfen', en: 'Today’s throw is gone' },
  'lucky.doneBody': {
    de: 'Der nächste Lucky Shot kommt in {hours} h {minutes} min.',
    en: 'The next Lucky Shot comes in {hours}h {minutes}m.',
  },
  'lucky.lastGolden': { de: 'Zuletzt: goldener Becher, +{coins}', en: 'Last time: golden cup, +{coins}' },
  'lucky.lastCup': { de: 'Zuletzt: ein Becher, +{coins}', en: 'Last time: a cup, +{coins}' },
  'lucky.lastMiss': { de: 'Zuletzt: daneben', en: 'Last time: a miss' },

  'match.levelUp': { de: 'LEVEL {level}', en: 'LEVEL {level}' },
  'match.levelUpSub': {
    de: 'Karrierestufe {level} erreicht. Jeder Wurf bringt dich weiter — auch die daneben.',
    en: 'Career level {level}. Every throw counts towards it, the misses included.',
  },
  'match.overtimeNote': { de: 'VERLÄNGERUNG', en: 'OVERTIME' },
  'match.overtimeChip': {
    de: 'Verlängerung · {cups} Becher',
    en: 'Overtime · {cups} cups',
  },
  'match.overtimeRound': {
    de: '{round}. Verlängerung · {cups} Becher',
    en: 'Overtime {round} · {cups} cups',
  },
  'match.overtimeHint': {
    de: 'Ausgeglichen! Neue Racks mit {cups} Bechern — jetzt entscheidet es sich.',
    en: 'All square! Fresh racks of {cups} — this is where it is decided.',
  },
  // Deliberately not 'match.reRack': that one belongs to the camera tracker,
  // where a re-rack is a house rule two people agree on at a real table. This
  // is the arcade button, and its wording has to say *whose* cups move — being
  // able to rearrange the opponent's was the bug.
  'match.reRackOwn': {
    de: 'Eigene Becher zusammenschieben',
    en: 'Tidy your own cups',
  },
  'match.reRack': { de: 'Re-Rack {left}', en: 'Re-rack {left}' },
  'match.missShort': { de: 'Zu kurz — weiter ziehen', en: 'Short — drag further' },
  'match.missLong': { de: 'Zu weit — kürzer ziehen', en: 'Long — drag less far' },
  'match.missWide': { de: 'Daneben — Richtung stimmt nicht', en: 'Wide — check your line' },
  'match.missRim': { de: 'Rand erwischt — ganz knapp', en: 'Caught the rim — so close' },
  'match.missClose': { de: 'Knapp vorbei', en: 'Just past it' },
  'match.rotateTitle': { de: 'Handy hochkant halten', en: 'Hold the phone upright' },
  'match.rotateBody': {
    de: 'Arcade wird im Hochformat gespielt — der Tisch ist lang, und nach oben gewischt wird auch. Das Spiel läuft weiter, sobald du drehst.',
    en: 'Arcade is played upright — the table is long, and so is the swipe. The game picks up again as soon as you turn back.',
  },
  'match.win': { de: 'SIEG!', en: 'WIN!' },
  'match.lose': { de: 'NIEDERLAGE', en: 'DEFEAT' },
  'match.teamWins': { de: '{team} gewinnt!', en: '{team} wins!' },
  'match.passplayClears': { de: '{team} räumt ab!', en: '{team} clears the table!' },
  'match.rivalsNote': {
    de: '{wins}/{target} Siege bis zum Aufstieg · +{coins} Coins',
    en: '{wins}/{target} wins to promotion · +{coins} coins',
  },
  'match.promoted': { de: 'AUFSTIEG!', en: 'PROMOTED!' },
  'match.relegated': { de: 'ABSTIEG', en: 'RELEGATED' },
  'match.promotedSub': {
    de: 'Willkommen in {division} · +{coins} Coins',
    en: 'Welcome to {division} · +{coins} coins',
  },
  'match.relegatedSub': {
    de: 'Zurück in {division} — hol sie dir wieder.',
    en: 'Back in {division} — go win it back.',
  },
  'match.weekendDone': {
    de: 'Lauf beendet: {wins}/{matches} Siege',
    en: 'Run finished: {wins}/{matches} wins',
  },
  'match.weekendNote': {
    de: 'Spiel {played}/{matches} · {wins} Siege · +{coins} Coins',
    en: 'Game {played}/{matches} · {wins} wins · +{coins} coins',
  },
  'match.weekendCelebration': {
    de: '{wins}/{matches} Siege · Stufe {tier} · +{coins} Coins',
    en: '{wins}/{matches} wins · {tier} tier · +{coins} coins',
  },
  'match.offlineWin': { de: '+75 Coins · +Career XP', en: '+75 coins · +career XP' },
  'match.offlineLose': { de: '+20 Coins', en: '+20 coins' },
  'match.shareWin': { de: 'Sieg!', en: 'Win!' },
  'match.shareLose': { de: 'Knapp verloren', en: 'Close loss' },
  'match.shareSubline': { de: '{badge} · gegen {name}', en: '{badge} · vs {name}' },
  'match.handOverTitle': { de: '{team} ist dran', en: "{team}'s turn" },
  'match.handOverBody': {
    de: 'Handy weitergeben, dann tippen.',
    en: 'Pass the phone, then tap.',
  },
  'match.handOverReady': { de: 'Bereit', en: 'Ready' },

  // --------------------------------------------------------- offline screen
  'offline.title': { de: 'Offline', en: 'Offline' },
  'offline.intro': {
    de: 'Spiel ohne Verbindung gegen die KI. Die Schwierigkeit bestimmt, wie sicher dein Gegner trifft — und wie viel Spielraum deine eigenen Würfe haben.',
    en: 'Play the AI with no connection. The difficulty sets how reliably your opponent scores — and how much room your own throws get.',
  },
  'offline.lastPlayed': { de: 'Zuletzt gespielt', en: 'Last played' },
  'offline.meter.opponent': { de: 'Gegner trifft', en: 'Opponent scores' },
  'offline.meter.you': { de: 'Deine Chance', en: 'Your chance' },
  'offline.startWith': {
    de: 'Spiel starten · +{coins} Coins bei Sieg',
    en: 'Start game · +{coins} coins on a win',
  },
  'offline.gallery': { de: 'Gegner-Galerie', en: 'Opponent gallery' },
  'offline.defeated': { de: 'Besiegt', en: 'Beaten' },

  // ---------------------------------------------------------- rivals screen
  'rivals.title': { de: 'Division Rivals', en: 'Division Rivals' },
  'rivals.progress': {
    de: '{wins}/{target} Siege bis zum Aufstieg · {losses} Niederlagen bis zum Abstieg',
    en: '{wins}/{target} wins to promotion · {losses} losses to relegation',
  },
  'rivals.losses': { de: 'Niederlagen', en: 'Losses' },
  'rivals.bestDiv': { de: 'Beste Div.', en: 'Best div.' },
  'rivals.findOpponent': { de: 'Gegner suchen', en: 'Find opponent' },
  'rivals.matchmakingNote': {
    de: 'Gegner werden aktuell lokal simuliert — Skill passend zu deiner Division.',
    en: 'Opponents are simulated locally for now — skill matched to your division.',
  },
  'rivals.ladder': { de: 'Leiter', en: 'Ladder' },
  'rivals.ladderMeta': {
    de: '{wins} Siege zum Aufstieg · +{coins} Coins pro Sieg',
    en: '{wins} wins to promotion · +{coins} coins per win',
  },
  'rivals.here': { de: 'Hier', en: 'Here' },

  // --------------------------------------------------------- weekend league
  'weekend.title': { de: 'Weekend League', en: 'Weekend League' },
  'weekend.locked.title': { de: 'Noch gesperrt', en: 'Still locked' },
  'weekend.locked.body': {
    de: 'Die Weekend League öffnet ab {required}. Du stehst aktuell in {current}.',
    en: 'The Weekend League opens at {required}. You are currently in {current}.',
  },
  'weekend.locked.cta': { de: 'Zu Division Rivals', en: 'Go to Division Rivals' },
  'weekend.runActive': { de: 'Lauf läuft', en: 'Run in progress' },
  'weekend.runNew': { de: 'Neuer Lauf', en: 'New run' },
  'weekend.runSubtitle': {
    de: '{matches} Spiele am Stück — je mehr Siege, desto besser die Belohnungsstufe.',
    en: '{matches} games in a row — the more wins, the better the reward tier.',
  },
  'weekend.remaining': { de: 'Offen', en: 'Left' },
  'weekend.tier': { de: 'Stufe', en: 'Tier' },
  'weekend.nextMatch': { de: 'Nächstes Spiel', en: 'Next game' },
  'weekend.abortRun': { de: 'Lauf abbrechen', en: 'Abandon run' },
  'weekend.startRun': { de: 'Lauf starten', en: 'Start run' },
  'weekend.rewards': { de: 'Belohnungen', en: 'Rewards' },
  'weekend.tierFrom': { de: 'ab {wins} Siegen', en: 'from {wins} wins' },
  'weekend.bestRun': { de: 'Bester Lauf', en: 'Best run' },
  'weekend.runs': { de: 'Läufe', en: 'Runs' },

  // ------------------------------------------------- the Friday–Sunday window
  'weekend.closed.title': { de: 'Geschlossen bis Freitag', en: 'Closed until Friday' },
  'weekend.closed.body': {
    de: 'Die Weekend League gibt es nur von Freitag bis Sonntag. Deshalb heißt sie so — und deshalb ist sie etwas wert.',
    en: 'The Weekend League runs Friday to Sunday only. That is what the name means — and what makes it worth something.',
  },
  'weekend.closed.days1': { de: 'Noch 1 Tag', en: '1 day to go' },
  'weekend.closed.daysN': { de: 'Noch {days} Tage', en: '{days} days to go' },
  'weekend.closed.meanwhile': {
    de: 'Bis dahin: Division Rivals zählt weiter, und der Lucky Shot gibt es jeden Tag.',
    en: 'Until then: Division Rivals still counts, and there is a Lucky Shot every day.',
  },
  'weekend.open.chip': { de: 'Jetzt offen', en: 'Open now' },
  'hub.weekend.closed1': { de: 'Öffnet morgen', en: 'Opens tomorrow' },
  'hub.weekend.closedN': { de: 'Öffnet in {days} Tagen', en: 'Opens in {days} days' },
  'weekend.expired.title': { de: 'Lauf abgelaufen', en: 'Run expired' },
  'weekend.expired.body': {
    de: 'Dein Lauf gehörte zu einem Wochenende, das vorbei ist. Die Coins aus den einzelnen Spielen hast du behalten — nur der Abschluss-Bonus ist weg, den du noch nicht erspielt hattest.',
    en: 'Your run belonged to a weekend that is over. You kept the coins from the individual games — only the finishing bonus is gone, and that had not been earned yet.',
  },
  'weekend.expired.cta': { de: 'Neuen Lauf starten', en: 'Start a new run' },
  'match.weekendExpired': {
    de: 'Dein Wochenende ist inzwischen vorbei — dieses Spiel zählt nicht mehr für den Lauf. Ab Freitag geht es wieder los.',
    en: 'Your weekend has ended in the meantime — this game no longer counts towards the run. It opens again on Friday.',
  },

  // ------------------------------------------------------- the perfect run
  'weekend.perfect.label': { de: 'Makellos', en: 'Flawless' },
  'weekend.perfect.reward': {
    de: 'Alle {matches} gewinnen: Becher-Design „{design}“',
    en: 'Win all {matches}: the “{design}” cup design',
  },
  'weekend.perfect.owned': {
    de: 'Geschafft — {count}× makellos',
    en: 'Done — {count}× flawless',
  },
  'weekend.perfect.celebrate': {
    de: 'Makellos! {matches} von {matches}. Das Becher-Design „{design}“ gehört dir — es ist für Coins und für Geld nirgends zu haben.',
    en: 'Flawless! {matches} out of {matches}. The “{design}” cup design is yours — it is not for sale for coins or for money anywhere.',
  },
  'skins.earnedOnly': { de: 'Nicht käuflich', en: 'Not for sale' },
  'skins.earnHow.perfect': {
    de: 'Gewinne alle {matches} Spiele einer Weekend League',
    en: 'Win all {matches} games of a Weekend League run',
  },

  // -------------------------------------------------------------- divisions
  'division.name': { de: 'Division {id} · {rank}', en: 'Division {id} · {rank}' },
  'division.short': { de: 'Division {id}', en: 'Division {id}' },
  'division.rank.rookie': { de: 'Rookie', en: 'Rookie' },
  'division.rank.amateur': { de: 'Amateur', en: 'Amateur' },
  'division.rank.challenger': { de: 'Challenger', en: 'Challenger' },
  'division.rank.contender': { de: 'Contender', en: 'Contender' },
  'division.rank.pro': { de: 'Pro', en: 'Pro' },
  'division.rank.veteran': { de: 'Veteran', en: 'Veteran' },
  'division.rank.elite': { de: 'Elite', en: 'Elite' },
  'division.rank.master': { de: 'Master', en: 'Master' },
  'division.rank.legend': { de: 'Legende', en: 'Legend' },
  'division.rank.champion': { de: 'Champion', en: 'Champion' },

  'weekend.tier.elite': { de: 'Elite', en: 'Elite' },
  'weekend.tier.gold': { de: 'Gold', en: 'Gold' },
  'weekend.tier.silver': { de: 'Silber', en: 'Silver' },
  'weekend.tier.bronze': { de: 'Bronze', en: 'Bronze' },

  // ----------------------------------------------------------- skins screen
  'skins.title': { de: 'Skins', en: 'Skins' },
  'skins.balls': { de: 'Bälle', en: 'Balls' },
  'skins.tables': { de: 'Tische', en: 'Tables' },
  'skins.active': { de: 'Aktiv', en: 'Active' },
  'skins.equip': { de: 'Ausrüsten', en: 'Equip' },
  'skins.buy': { de: '{cost} Coins', en: '{cost} coins' },
  'skins.cups': { de: 'Becher', en: 'Cups' },

  'reel.title': { de: 'Video des Abends', en: 'The evening, in one video' },
  'reel.cardTitle': { de: 'BEERPONG', en: 'BEERPONG' },
  'reel.body': {
    de: 'Aus {clips} Clips wird ein Video — jeweils die letzten Sekunden, in denen der Becher fällt. Das dauert etwa {seconds} Sekunden, weil die Clips dafür einmal abgespielt und neu aufgenommen werden müssen. Das Handy muss dabei an bleiben und dieser Bildschirm offen.',
    en: 'One video out of {clips} clips — the last seconds of each, where the cup goes down. It takes about {seconds} seconds, because the clips have to be played through and re-recorded. Keep the phone awake and this screen open while it runs.',
  },
  'reel.make': { de: 'Video schneiden', en: 'Cut the video' },
  'reel.again': { de: 'Neu schneiden', en: 'Cut it again' },
  'reel.building': { de: 'Clip {clip} von {of} …', en: 'Clip {clip} of {of}…' },
  'reel.saveHow': {
    de: 'Zum Speichern oder Teilen: lange auf das Video tippen → „Video sichern". Es heißt {name}.',
    en: 'To save or share it: press and hold the video → "Save video". It is called {name}.',
  },
  'reel.failed': {
    de: 'Hat nicht geklappt. Meistens liegt es daran, dass der Bildschirm zwischendurch aus war — noch einmal probieren und das Handy wach lassen.',
    en: 'That did not work. Usually it means the screen went off part-way through — try again and keep the phone awake.',
  },

  'party.title': { de: 'Live-Anzeige', en: 'Live scoreboard' },
  'party.hubTitle': { de: 'Anzeige teilen', en: 'Share the score' },
  'party.how': {
    de: 'Handykamera drauf halten, Link öffnen — fertig. Wer den Code scannt, sieht den Spielstand live auf dem eigenen Handy. Nichts zu installieren, nichts anzumelden.',
    en: 'Point a phone camera at it and open the link. Whoever scans it sees the score live on their own phone. Nothing to install, nothing to sign into.',
  },
  'party.connecting': { de: 'Verbinde …', en: 'Connecting…' },
  'party.watching1': { de: '1 Person schaut zu', en: '1 person watching' },
  'party.watchingN': { de: '{count} Personen schauen zu', en: '{count} people watching' },
  'party.honest': {
    de: 'Gezählt wird weiter nur auf diesem Handy. Die anderen sehen zu und können nichts ändern — das ist die einzige Aufteilung, die stimmen kann, weil nur dieses Handy auf den Tisch schaut.',
    en: 'The counting still happens only on this phone. The others watch and can change nothing — the only arrangement that can be true, since this is the phone pointed at the table.',
  },
  'party.nativeNote': {
    de: 'In der installierten App zeigt der Code auf die App selbst: Wer sie schon hat, landet direkt in der Anzeige. Wer nicht, braucht die Web-Adresse. Am zuverlässigsten ist es, die Anzeige aus der Web-Version zu teilen.',
    en: 'In the installed app the code points at the app itself, so it opens for anybody who already has it and does nothing for anybody who does not. Sharing from the web version is the reliable way.',
  },
  'party.noServer': { de: 'Kein Server eingerichtet', en: 'No server configured' },
  'party.noServerBody': {
    de: 'Die Live-Anzeige braucht die Server-Adresse (EXPO_PUBLIC_ONLINE_URL) — dieselbe wie der Online-Modus. Siehe README.',
    en: 'The live scoreboard needs the server address (EXPO_PUBLIC_ONLINE_URL) — the same one the online mode uses. See the README.',
  },
  'party.live': { de: 'Live', en: 'Live' },
  'party.hostGone': { de: 'Zähl-Handy weg', en: 'The scoring phone has gone' },
  'party.full': { de: 'Zu viele Zuschauer', en: 'Too many watchers' },
  'party.badCode': { de: 'Code passt nicht', en: 'Not a code' },
  'party.badCodeBody': {
    de: 'Dieser Link führt nirgendwo hin. Scanne den Code noch einmal vom Handy, das mitzählt.',
    en: 'This link goes nowhere. Scan the code again from the phone that is counting.',
  },
  'party.waiting': {
    de: 'Warte auf den Spielstand vom Handy, das mitzählt.',
    en: 'Waiting for the score from the phone that is counting.',
  },
  'party.record': {
    de: '{hits}/{throws} · {percent}%',
    en: '{hits}/{throws} · {percent}%',
  },
  'party.turn': { de: 'ist dran', en: 'to throw' },
  'party.won': { de: 'Gewonnen', en: 'Won' },
  'party.watcherNote': {
    de: 'Du schaust nur zu. Gezählt wird am Tisch.',
    en: 'You are watching. The counting happens at the table.',
  },
  'party.openApp': { de: 'App öffnen', en: 'Open the app' },

  'ghost.title': { de: 'Echte Gegner', en: 'Real opponents' },
  'ghost.badge': { de: 'Aus echten Spielen', en: 'From real games' },
  'ghost.tagline': {
    de: 'Spiele gegen die Trefferquote von Leuten am echten Tisch',
    en: 'Play the hit rate of people at a real table',
  },
  'ghost.explain': {
    // No **bold** here: that markup is the manual's, and only the manual
    // renders it. On this screen it would show as literal asterisks, which is
    // what the first screenshot of it did.
    de: 'Die Kamera zählt bei jedem echten Spiel mit, wie oft jedes Team trifft. Daraus wird hier ein Arcade-Gegner, der genauso oft trifft wie die Person am Tisch. Das ist kein Abbild der Person — nur ihre Quote und ihr Name. Und es ist kein Online-Spiel: Die Person selbst spielt nicht mit, ihr Handy weiß nichts davon.',
    en: 'The camera counts how often each team scores in every real game. That becomes an arcade opponent here who sinks cups as often as the person at the table did. It is not a copy of the person — only their rate and their name. It is not an online match either: they are not playing, and their phone knows nothing about it.',
  },
  'ghost.empty': {
    de: 'Noch niemand da. Spiele ein Spiel im Kamera-Modus zu Ende, dann steht hier jedes Team, das mitgespielt hat.',
    en: 'Nobody here yet. Finish a game in camera mode and every team that played will appear here.',
  },
  'ghost.record': {
    de: '{hits}/{throws} Becher · {percent}% · {games} Spiele',
    en: '{hits}/{throws} cups · {percent}% · {games} games',
  },
  'ghost.needsMore': {
    de: 'Noch {left} Würfe, dann spielbar',
    en: '{left} more throws and they can be played',
  },
  'ghost.why': {
    de: 'Ab {min} Würfen — etwa zwei Spielen — wird jemand spielbar. Ehrlich dazu: Auch dann ist die Quote noch ungenau. Wer in Wahrheit 30 % trifft, landet nach {min} Würfen irgendwo zwischen 15 % und 45 %. Das wird mit jedem Spiel besser, und der Gegner wird mit.',
    en: 'From {min} throws — about two games — somebody becomes playable. Honestly, though: the rate is still rough there. A true 30% shooter lands anywhere between 15% and 45% after {min} throws. It sharpens with every game, and so does the opponent.',
  },
  'ghost.play': { de: 'Gegen {name} spielen', en: 'Play {name}' },
  'ghost.streak': { de: 'Beste Serie: {streak}', en: 'Best run: {streak}' },
  'ghost.hubSubtitle': {
    de: '{count} aus echten Spielen',
    en: '{count} from real games',
  },

  'knockout.title': { de: 'Turnier', en: 'Knockout' },
  'knockout.tagline': {
    de: 'Einsatz zahlen, Bracket gewinnen, Topf mitnehmen',
    en: 'Pay in, win the bracket, take the pot',
  },
  'knockout.round.final': { de: 'Finale', en: 'Final' },
  'knockout.round.semi': { de: 'Halbfinale', en: 'Semi-final' },
  'knockout.round.quarter': { de: 'Viertelfinale', en: 'Quarter-final' },
  'knockout.size': { de: '{teams} Teams', en: '{teams} teams' },
  'knockout.sizeNote': {
    de: '{rounds} Runden · Topf {pot} Coins',
    en: '{rounds} rounds · pot {pot} coins',
  },
  'knockout.stake': { de: 'Einsatz', en: 'Stake' },
  'knockout.enter': { de: 'Für {stake} Coins antreten', en: 'Enter for {stake} coins' },
  'knockout.tooPoor': { de: 'Nicht genug Coins', en: 'Not enough coins' },
  'knockout.explain': {
    de: 'Du zahlst den Einsatz einmal. Gewinnst du jede Runde bis zum Finale, bekommst du den ganzen Topf — das ist dein Einsatz mal Teamanzahl. Verlierst du eine Runde, ist der Einsatz weg. Die Gegner werden vorher ausgelost und stehen fest: Du siehst also, wer im Finale wartet, bevor du dich entscheidest.',
    en: 'You pay the stake once. Win every round through to the final and the whole pot is yours — your stake times the number of teams. Lose a round and the stake is gone. The field is drawn before you decide, so you can see who is waiting in the final.',
  },
  'knockout.walkout': {
    de: 'Ein abgebrochenes Match zählt als Niederlage. Wer aus einem Finale aussteigt, das schlecht läuft, hat das Turnier verloren — sonst könnte man jede Runde so lange wiederholen, bis sie passt.',
    en: 'A match you walk out of counts as a loss. Quitting a final that is going badly loses the tournament — otherwise every round could simply be replayed until it went your way.',
  },
  'knockout.forfeited': {
    de: 'Das letzte Turnier wurde mitten im Match verlassen und gilt als verloren.',
    en: 'The last tournament was left mid-match and counts as lost.',
  },
  'knockout.running': { de: 'Laufendes Turnier', en: 'Tournament in progress' },
  'knockout.next': { de: 'Jetzt: {round} gegen {name}', en: 'Now: {round} against {name}' },
  'knockout.play': { de: '{round} spielen', en: 'Play the {round}' },
  'knockout.give': { de: 'Aufgeben — Einsatz verfällt', en: 'Give up — the stake is lost' },
  'knockout.bracket': { de: 'Das Feld', en: 'The field' },
  'knockout.wonPot': { de: 'Turnier gewonnen · +{coins} Coins', en: 'Tournament won · +{coins} coins' },
  'knockout.throughTo': { de: 'Weiter ins {round}', en: 'Through to the {round}' },
  'knockout.knockedOut': {
    de: 'Ausgeschieden · {stake} Coins Einsatz weg',
    en: 'Knocked out · {stake} coins staked and lost',
  },
  'knockout.champion': { de: 'Turniersieg', en: 'Tournament won' },
  'knockout.championSub': {
    de: 'Das ganze Bracket gewonnen — {coins} Coins.',
    en: 'The whole bracket — {coins} coins.',
  },
  'knockout.backToBracket': { de: 'Zum Turnier', en: 'Back to the bracket' },
  'skins.weekly': { de: 'Diese Woche', en: 'This week' },
  'skins.rotationHours': {
    de: 'Neue Auswahl in {hours} Std.',
    en: 'New selection in {hours} h',
  },
  'skins.rotationDays': {
    de: 'Neue Auswahl in {days} Tagen',
    en: 'New selection in {days} days',
  },
  'skins.cupsNote': {
    de: 'Drei Designs pro Woche, für Coins. Alle zwölf kommen im Monat einmal dran — was du diese Woche verpasst, ist nicht weg. Die Länderflaggen gibt es weiterhin nur im Becher-Shop für echtes Geld.',
    en: 'Three designs a week, for coins. All twelve come round once a month, so what you miss this week is not gone. The country flags stay in the cup shop, for money.',
  },
  'skins.collection': { de: 'Deine Sammlung', en: 'Your collection' },
  'skins.earned': { de: 'Nur erspielbar', en: 'Earned only' },
  'skins.soon': { de: 'In {weeks} Wochen', en: 'In {weeks} weeks' },
  'skins.soonNext': { de: 'Nächste Woche', en: 'Next week' },
  'skins.locked': {
    de: 'Noch nicht im Angebot',
    en: 'Not on offer yet',
  },

  'skin.ball-classic': { de: 'Der Standardball. Immer verfügbar.', en: 'The default ball. Always available.' },
  'skin.ball-neon': { de: 'Leuchtet in sattem Neongrün.', en: 'Glows in deep neon green.' },
  'skin.ball-inferno': { de: 'Feuriger Trail bei jedem Wurf.', en: 'A fiery trail on every throw.' },
  'skin.ball-cryo': { de: 'Eiskalte Flugbahn.', en: 'An ice-cold flight path.' },
  'skin.ball-gold': { de: 'Für echte Liga-Champions.', en: 'For real league champions.' },
  'skin.table-classic': { de: 'Der Standardtisch.', en: 'The default table.' },
  'skin.table-arena': { de: 'eSport-Arena-Optik mit Rasterlinien.', en: 'eSport arena look with grid lines.' },
  'skin.table-midnight': { de: 'Tiefviolette Club-Atmosphäre.', en: 'Deep purple club atmosphere.' },
  'skin.table-champion': { de: 'Das Finale wartet.', en: 'The final is waiting.' },

  // ------------------------------------------------------ challenges screen
  'challenges.title': { de: 'Aufgaben', en: 'Challenges' },
  'challenges.today': { de: 'Heute', en: 'Today' },
  'challenges.claim': { de: 'Einsammeln', en: 'Claim' },
  'challenges.claimed': { de: 'Abgeholt', en: 'Claimed' },
  'challenges.season': { de: 'Saison', en: 'Season' },
  'challenges.seasonLevel': { de: 'Stufe {reached}/{total}', en: 'Tier {reached}/{total}' },
  'challenges.xp': { de: '{xp} XP', en: '{xp} XP' },
  'challenges.seasonNext': {
    de: 'Noch {xp} XP bis Stufe {level}',
    en: '{xp} XP to go until tier {level}',
  },
  'challenges.seasonDone': { de: 'Alle Stufen erreicht.', en: 'All tiers reached.' },
  'challenges.achievements': { de: 'Erfolge', en: 'Achievements' },

  // ------------------------------------------------------- daily challenges
  'daily.cups15': { de: '15 Cups versenken', en: 'Sink 15 cups' },
  'daily.cups30': { de: '30 Cups versenken', en: 'Sink 30 cups' },
  'daily.throws40': { de: '40 Würfe machen', en: 'Take 40 throws' },
  'daily.wins2': { de: '2 Spiele gewinnen', en: 'Win 2 games' },
  'daily.wins4': { de: '4 Spiele gewinnen', en: 'Win 4 games' },
  'daily.tracker10': { de: '10 Cups im Tracker zählen', en: 'Count 10 cups in the tracker' },

  // ----------------------------------------------------------- achievements
  'achv.first-blood.title': { de: 'Erster Cup', en: 'First Cup' },
  'achv.first-blood.description': { de: 'Versenke deinen ersten Cup.', en: 'Sink your first cup.' },
  'achv.century.title': { de: 'Hundert Cups', en: 'Century' },
  'achv.century.description': { de: 'Versenke insgesamt 100 Cups.', en: 'Sink 100 cups in total.' },
  'achv.streak-5.title': { de: 'Heiße Serie', en: 'Hot Streak' },
  'achv.streak-5.description': { de: 'Triff fünf Mal in Folge.', en: 'Hit five times in a row.' },
  'achv.wins-10.title': { de: 'Zehn Siege', en: 'Ten Wins' },
  'achv.wins-10.description': { de: 'Gewinne 10 Arcade-Spiele.', en: 'Win 10 arcade games.' },
  'achv.division-5.title': { de: 'Aufsteiger', en: 'Climber' },
  'achv.division-5.description': { de: 'Erreiche Division 5.', en: 'Reach Division 5.' },
  'achv.division-1.title': { de: 'Champion', en: 'Champion' },
  'achv.division-1.description': { de: 'Erreiche Division 1.', en: 'Reach Division 1.' },
  'achv.weekend-6.title': { de: 'Gold-Wochenende', en: 'Golden Weekend' },
  'achv.weekend-6.description': {
    de: 'Hol 6 Siege in einer Weekend League.',
    en: 'Take 6 wins in one Weekend League.',
  },
  'achv.collector.title': { de: 'Sammler', en: 'Collector' },
  'achv.collector.description': { de: 'Besitze 5 Skins.', en: 'Own 5 skins.' },
  'achv.host.title': { de: 'Gastgeber', en: 'Host' },
  'achv.host.description': { de: 'Tracke 5 echte Spiele.', en: 'Track 5 real games.' },
} satisfies Record<string, Record<Language, string>>;

export type TranslationKey = keyof typeof STRINGS;

export function translate(language: Language, key: TranslationKey, vars?: Vars): string {
  const entry = STRINGS[key] as Record<Language, string> | undefined;
  let out = entry?.[language] ?? entry?.de ?? key;
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      out = out.split(`{${name}}`).join(String(value));
    }
  }
  return out;
}

/** `const t = useT();` then `t('common.back')` — re-renders on a language switch. */
export function useT() {
  const language = useBeerpongStore((s) => s.language);
  return useCallback(
    (key: TranslationKey, vars?: Vars) => translate(language, key, vars),
    [language]
  );
}

export function useLanguage() {
  return useBeerpongStore((s) => s.language);
}

/** "Division 6 · Pro" — the number is fixed, the rank name is translated. */
export function divisionName(
  language: Language,
  division: { id: number; rankKey: TranslationKey }
): string {
  return translate(language, 'division.name', {
    id: division.id,
    rank: translate(language, division.rankKey),
  });
}
