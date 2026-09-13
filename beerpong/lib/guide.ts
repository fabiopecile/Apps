import { FREE_TRACKED_GAMES_PER_WEEK } from './entitlement';
import { HIGHLIGHT_LIMIT, HIGHLIGHT_SECONDS } from './highlightsShared';
import { BALLS_PER_TURN } from './turnRules';
import { OVERTIME_CUP_COUNT } from './arcadeLayout';
import { CUP_BUNDLE_CENTS, CUP_PRICE_CENTS } from './catalogue';
import { DEFAULT_PRICE_CENTS } from './licence';
import { COIN_CUP_DESIGNS, PAID_CUP_DESIGNS } from './cupSkins';
import { WEEKLY_OFFER_SIZE } from './cupShop';
import { KNOCKOUT_SIZES, KNOCKOUT_STAKES } from './knockout';
import { WEEKEND_MATCHES, WEEKEND_UNLOCK_DIVISION } from './competition';
import {
  LUCKY_CUP_COINS,
  LUCKY_GOLDEN_COINS,
  LUCKY_MAX_STREAK,
  LUCKY_STREAK_BONUS,
} from './luckyShot';

/**
 * The manual: what every part of the app does, in full.
 *
 * Written out here rather than as translation keys because it is prose, not
 * labels — several thousand words of it — and a key per sentence would bury the
 * thing that matters about a manual, which is being able to read it end to end
 * and notice what is missing or no longer true.
 *
 * Numbers are imported rather than typed. A manual that says "three games a
 * week" while the code says four is worse than no manual, and that drift is
 * exactly what happens six months later. Anything quoted here that could change
 * comes from the constant it is about.
 *
 * Honesty rule for this file, since it is the one place a new player is told
 * how the app works: every limitation goes in beside the feature it belongs to,
 * not in a footnote. The camera detection only running in the web version, the
 * online game trusting the phone that threw, the cup designs changing nothing —
 * all of it is in the chapter where somebody would otherwise find out the hard
 * way.
 */

export interface GuideItem {
  /** Short heading. */
  de: string;
  en: string;
  body: { de: string; en: string };
}

export interface GuideChapter {
  id: string;
  icon: string;
  de: string;
  en: string;
  /** One line under the chapter title, before it is opened. */
  summary: { de: string; en: string };
  items: GuideItem[];
}

const euro = (cents: number) => `${(cents / 100).toFixed(2).replace('.', ',')} €`;

export const GUIDE: GuideChapter[] = [
  // ---------------------------------------------------------------- basics
  {
    id: 'start',
    icon: 'sparkles',
    de: 'Was die App überhaupt ist',
    en: 'What this app is',
    summary: {
      de: 'Zwei Dinge in einer App — und was sie nicht tut.',
      en: 'Two things in one app — and what it does not do.',
    },
    items: [
      {
        de: 'Zwei Modi, unten umschaltbar',
        en: 'Two modes, switched at the bottom',
        body: {
          de: 'KAMERA ist für ein echtes Spiel an einem echten Tisch: die App zählt mit, du wirfst mit der Hand. ARCADE ist ein eigenes Spiel im Handy: du wischst, der Ball fliegt. Die beiden haben nichts miteinander zu tun und können unabhängig benutzt werden.',
          en: 'CAMERA is for a real game at a real table: the app keeps score, you throw with your hand. ARCADE is a game inside the phone: you swipe, the ball flies. The two are independent and can be used on their own.',
        },
      },
      {
        de: 'Kein Konto, keine Anmeldung',
        en: 'No account, no sign-up',
        body: {
          de: 'Es gibt nirgends eine Registrierung. Alles liegt auf deinem Gerät. Der Preis dafür: Gelöschte Browserdaten oder ein neues Handy nehmen deinen Spielstand mit — dagegen gibt es den Spielstand-Code, siehe eigenes Kapitel.',
          en: 'There is no sign-up anywhere. Everything lives on your device. The price: clearing browser data or changing phones takes your progress with it — which is what the save code is for, in its own chapter.',
        },
      },
      {
        de: 'Was nie passiert',
        en: 'What never happens',
        body: {
          de: 'Kein Video verlässt dein Gerät. Keine Werbung. Nichts wird über ein Spiel hinaus auf einem Server gespeichert, außer du schaltest die Sicherung selbst ein. Ein Online-Raum löscht sich zwölf Stunden nach der letzten Nachricht von selbst.',
          en: 'No video leaves your device. No adverts. Nothing is kept on a server beyond a game unless you switch the backup on yourself. An online room deletes itself twelve hours after its last message.',
        },
      },
      {
        de: 'Als App auf den Homescreen',
        en: 'Onto your home screen',
        body: {
          de: 'Im Safari auf Teilen → „Zum Home-Bildschirm". Danach startet sie wie eine normale App, ohne Adressleiste. Das ist auch die Version, in der die Kamera-Erkennung und die Highlights funktionieren.',
          en: 'In Safari: Share → "Add to Home Screen". After that it opens like a normal app, without an address bar. That is also the version where camera detection and highlights work.',
        },
      },
    ],
  },

  // ---------------------------------------------------------------- camera
  {
    id: 'camera',
    icon: 'camera',
    de: 'Kamera: ein echtes Spiel mitzählen',
    en: 'Camera: scoring a real game',
    summary: {
      de: 'Von Hand tippen oder automatisch erkennen lassen.',
      en: 'Tap by hand, or let it watch the cups.',
    },
    items: [
      {
        de: 'Von Hand zählen',
        en: 'Counting by hand',
        body: {
          de: 'Der einfachste Weg und der, der immer funktioniert: Trifft das werfende Team, tippst du irgendwo auf den Tisch. Daneben? „Fehlwurf". Vertippt? „Zurück" nimmt den letzten Eintrag wieder weg. Oben steht, wer gerade wirft.',
          en: 'The simplest way, and the one that always works: when the throwing team scores, tap anywhere on the table. Missed? "Miss". Tapped wrong? "Back" removes the last entry. The top of the screen says whose throw it is.',
        },
      },
      {
        de: 'Teams und Becherzahl',
        en: 'Teams and cup count',
        body: {
          de: 'Über „Team" benennst du beide Seiten — die Namen stehen dann auch im Online-Spiel und auf dem geteilten Ergebnisbild. Die Becherzahl (6, 10 oder 15) stellst du beim Neuen Spiel ein.',
          en: 'Use "Team" to name both sides — the names also show in an online game and on the shared result image. The cup count (6, 10 or 15) is set when you start a new game.',
        },
      },
      {
        de: 'House Rules',
        en: 'House rules',
        body: {
          de: 'Hinter dem Regler-Symbol: Re-Racks (Becher zusammenschieben, bis zu zweimal), Island (ein einzeln stehender Becher zählt doppelt) und Redemption (das verlierende Team bekommt einen letzten Wurf). Ihr stellt ein, wie ihr spielt — die App zwingt euch nichts auf.',
          en: 'Behind the sliders icon: re-racks (pushing the cups together, up to twice), island (a cup standing alone counts double) and redemption (the losing team gets a last throw). Set it to the way you play — the app imposes nothing.',
        },
      },
      {
        de: 'Automatische Erkennung einschalten',
        en: 'Turning on automatic detection',
        body: {
          de: 'Das Scan-Symbol ⛶ oben öffnet sie. Du legst je Rack ein Ringraster über die echten Becher: ziehen zum Verschieben, zwei Finger zum Vergrößern und Drehen, der 90°-Knopf dreht in Vierteln. Dann „Passt — los".',
          en: 'The scan icon ⛶ at the top opens it. You lay a ring grid over the real cups for each rack: drag to move, two fingers to resize and turn, the 90° button turns in quarters. Then "Looks right — go".',
        },
      },
      {
        de: 'Wie die Erkennung arbeitet',
        en: 'How the detection works',
        body: {
          de: 'Sie sucht nicht den Ball — der ist in sechs verwischten Bildern quer durchs Bild und praktisch nicht zu verfolgen. Sie beobachtet stattdessen den kleinen Bildausschnitt jedes Bechers, alle 180 ms, und meldet, wenn einer aufhört wie ein Becher auszusehen. Dann fragt sie: „Becher weg — Treffer?"',
          en: 'It does not look for the ball — that crosses the frame in about six blurred frames and is practically impossible to follow. Instead it watches the small patch of image where each cup is, every 180 ms, and reports when one stops looking like a cup. Then it asks: "Cup gone — was that a hit?"',
        },
      },
      {
        de: 'Warum sie fragt statt zu zählen',
        en: 'Why it asks instead of counting',
        body: {
          de: 'Sie kann einen Treffer nicht davon unterscheiden, dass jemand den Becher weggestellt hat. Also fragt sie, statt zu raten. Du tippst einmal statt jedes Mal mitzuzählen — und ein Fehlalarm kostet dich einen Tipp, keinen Punkt.',
          en: 'It cannot tell a hit from somebody picking the cup up. So it asks rather than guessing. You tap once instead of counting every throw — and a false alarm costs you a tap, not a point.',
        },
      },
      {
        de: 'Wie du das Handy aufstellst',
        en: 'How to set the phone up',
        body: {
          de: 'Das ist der Punkt, an dem es steht und fällt. Quer halten, von der Längsseite filmen — das zeigt fast dreimal so viel Tisch. Und hoch genug: ab etwa 80 cm über der Tischplatte vom Tischende, ab etwa 100 cm von der Seite. Ein Beerpong-Tisch ist rund 70 cm hoch, das sind also gut anderthalb Meter über dem Boden, schräg nach unten geneigt.',
          en: 'This is what it stands or falls on. Hold it sideways and film from the long side — that shows nearly three times as much table. And high enough: about 80 cm above the table top from the end, about 100 cm from the side. A beer pong table is around 70 cm tall, so that is a good metre and a half off the floor, tilted down.',
        },
      },
      {
        de: 'Warum die Höhe nicht egal ist',
        en: 'Why the height matters',
        body: {
          de: 'Das Ringraster ist ein flaches Dreieck. Ein echtes Rack von schräg unten ist auf dem Bild ein Trapez — die hinteren Reihen rücken zusammen. Gemessen: unter 60 cm liegen die hinteren Ringe mehr als eine halbe Becheröffnung neben ihren Bechern, und ab da findet die Erkennung nur noch jeden zweiten Treffer. Mit Licht oder Geduld ist das nicht zu beheben.',
          en: 'The ring grid is a flat triangle. A real rack seen from low down is a trapezoid on screen — the far rows crowd together. Measured: below 60 cm the back rings land more than half a cup mouth from their cups, and from there the detector finds only every second hit. No amount of light or patience fixes that.',
        },
      },
      {
        de: 'Das Handy darf sich nicht bewegen',
        en: 'The phone must not move',
        body: {
          de: 'Jeder Stoß verschiebt alle Ausschnitte auf einmal. Die App merkt das („Rack komplett verändert") und liest das Bild nach etwa dreieinhalb Sekunden neu ein — ein Wurf in dieser Zeit ist aber weg. Anlehnen, festklemmen, Stativ.',
          en: 'Every knock moves all the patches at once. The app notices ("rack changed all at once") and re-reads the view after about three and a half seconds — but a throw in that window is lost. Prop it, wedge it, use a stand.',
        },
      },
      {
        de: 'Licht',
        en: 'Light',
        body: {
          de: 'Langsam dunkler werdendes Licht ist gemessen kein Problem — die App rechnet die Helligkeit heraus. Eine Lampe, vor der ständig jemand vorbeiläuft, oder Discolicht schon. Und stell dich nicht zwischen Handy und Becher: drei verdeckte Becher hält sie für einen Schatten und meldet absichtlich nichts.',
          en: 'Light that fades slowly is measured to be no problem — the app corrects for brightness. A lamp somebody keeps walking in front of, or a strobe, is. And do not stand between the phone and the cups: three covered at once is taken for a shadow and deliberately reported as nothing.',
        },
      },
      {
        de: 'Nur in der Web-Version',
        en: 'Web version only',
        body: {
          de: 'Die automatische Erkennung läuft nur im Browser bzw. in der vom Homescreen gestarteten App. In einer installierten Android-App fehlt der Zugriff auf einzelne Kamerabilder — dort steht das auch so auf dem Bildschirm.',
          en: 'Automatic detection only runs in the browser, or in the app started from the home screen. An installed Android build has no access to individual camera frames — and says so on screen.',
        },
      },
      {
        de: `Kostenlos: ${FREE_TRACKED_GAMES_PER_WEEK} Spiele pro Woche`,
        en: `Free: ${FREE_TRACKED_GAMES_PER_WEEK} games a week`,
        body: {
          de: `Die automatische Erkennung gibt es ${FREE_TRACKED_GAMES_PER_WEEK}× pro Woche gratis, der Zähler beginnt montags neu. Von Hand mitzählen ist immer und unbegrenzt kostenlos, genauso das ganze Arcade-Spiel, der Online-Modus und die Turniere.`,
          en: `Automatic detection is free ${FREE_TRACKED_GAMES_PER_WEEK} times a week, and the counter starts again on Monday. Counting by hand is always free and unlimited, as are the whole arcade game, online play and tournaments.`,
        },
      },
    ],
  },

  // ------------------------------------------------------------ highlights
  {
    id: 'highlights',
    icon: 'film',
    de: 'Highlights: die Sekunden vor dem Treffer',
    en: 'Highlights: the seconds before a hit',
    summary: {
      de: 'Clips, die schon aufgenommen sind, bevor jemand danach fragt.',
      en: 'Clips already recorded by the time anybody asks.',
    },
    items: [
      {
        de: 'Einschalten',
        en: 'Turning it on',
        body: {
          de: 'Im selben Feld, in dem du die Ringe auf die Becher legst: das Häkchen „Highlights aufnehmen". Setzen, bevor du auf „Passt — los" tippst.',
          en: 'In the same panel where you place the rings on the cups: the "Record highlights" checkbox. Tick it before you press "Looks right — go".',
        },
      },
      {
        de: 'Wie es funktioniert',
        en: 'How it works',
        body: {
          de: `Das Interessante an einem Treffer ist vorbei, bevor jemand zum Handy greift. Deshalb läuft eine Aufnahme ständig in einen kurzen Ringspeicher, und bei jedem bestätigten Treffer werden die letzten ${HIGHLIGHT_SECONDS} Sekunden daraus behalten. Es werden ${HIGHLIGHT_LIMIT} Clips aufgehoben, danach fällt der älteste heraus.`,
          en: `The interesting part of a hit is over before anybody reaches for a phone. So a recording runs continuously into a short ring buffer, and every confirmed hit keeps the last ${HIGHLIGHT_SECONDS} seconds of it. ${HIGHLIGHT_LIMIT} clips are kept; after that the oldest drops out.`,
        },
      },
      {
        de: 'Ansehen und teilen',
        en: 'Watching and sharing',
        body: {
          de: 'Das Film-Symbol 🎞 oben im Kamera-Modus. Von dort kannst du einen Clip auch teilen.',
          en: 'The film icon 🎞 at the top of the camera mode. From there a clip can also be shared.',
        },
      },
      {
        de: 'Wo die Clips liegen',
        en: 'Where the clips live',
        body: {
          de: 'Im Browser auf diesem Gerät — nicht in deiner Fotomediathek und nirgends in einer Cloud. Löschst du die Website-Daten, sind sie weg. Auch das geht nur in der Web-Version.',
          en: 'In the browser on this device — not in your photo library and not in any cloud. Clearing website data removes them. This too is web-only.',
        },
      },
    ],
  },

  // --------------------------------------------------------------- arcade
  {
    id: 'arcade',
    icon: 'game-controller',
    de: 'Arcade: selbst werfen',
    en: 'Arcade: throwing yourself',
    summary: {
      de: 'Wischen, treffen, aufsteigen. Die Regeln sind die echten.',
      en: 'Swipe, sink, climb. The rules are the real ones.',
    },
    items: [
      {
        de: 'Werfen',
        en: 'Throwing',
        body: {
          de: 'Vom Ball nach oben wischen. Die **Länge** des Wischens macht die Stärke, die **Richtung** das Ziel. Nicht die Geschwindigkeit — wie schnell dein Daumen war, sieht man nicht, wie weit er gezogen ist, schon. Du darfst vor dem Loslassen innehalten und zielen.',
          en: 'Swipe up from the ball. The **length** of the swipe sets the strength, the **direction** the target. Not the speed — you cannot see how fast your thumb moved, but you can see how far it went. You may pause before letting go and aim.',
        },
      },
      {
        de: 'Wenn du zu kurz oder zu weit wirfst',
        en: 'Short and long',
        body: {
          de: 'Unter dem Tisch steht, was schiefging: „Zu kurz — weiter ziehen" oder „Zu weit — kürzer ziehen". Die Stärke wird dabei ein Stück weit nachgeholfen, die Richtung nie — zielen musst du selbst.',
          en: 'Under the table it says what went wrong: "too short — drag further" or "too far — drag less". The strength is helped along a little, the direction never — aiming is yours.',
        },
      },
      {
        de: `${BALLS_PER_TURN} Bälle pro Zug`,
        en: `${BALLS_PER_TURN} balls a turn`,
        body: {
          de: `Du wirfst ${BALLS_PER_TURN} Bälle, dann ist die andere Seite dran. Versenkst du **beide**, bekommst du sie zurück und wirfst noch einmal ${BALLS_PER_TURN} — das ist eine Serie, und dort werden Spiele gewonnen.`,
          en: `You throw ${BALLS_PER_TURN} balls, then it is the other side's turn. Sink **both** and you get them back and throw ${BALLS_PER_TURN} more — that is a run, and it is where games are won.`,
        },
      },
      {
        de: 'Letzte Chance und Verlängerung',
        en: 'Redemption and overtime',
        body: {
          de: `Verlierst du deinen letzten Becher, bist du noch nicht raus: du wirfst, bis du einmal danebengehst. Triffst du dabei alles, was noch steht, ist es **ausgeglichen** — und es geht in die Verlängerung mit ${OVERTIME_CUP_COUNT} Bechern pro Seite, so oft wie nötig. Eine geglückte letzte Chance ist keine Niederlage für die andere Seite, sondern ein Gleichstand.`,
          en: `Losing your last cup is not the end: you throw until you miss once. Clear what is left of their rack and it is **level** — into overtime with ${OVERTIME_CUP_COUNT} cups a side, for as many as it takes. A redemption that comes good is not a defeat for the other side, it is a tie.`,
        },
      },
      {
        de: 'Bounce ×2',
        en: 'Bounce ×2',
        body: {
          de: 'Der Knopf unter dem Tisch macht den nächsten Wurf zum Aufsetzer: Der Ball springt vor dem Rack auf und kommt flach an. Geht er rein, nimmt er **zwei** Becher — den getroffenen und den nächsten, der noch steht. Dafür streut er deutlich weiter: gemessen geht ein gezielter normaler Wurf zu etwa 87 % rein, ein Bounce zu etwa 58 %.',
          en: 'The button under the table makes the next throw a bounce: the ball lands in front of the rack and comes in low. If it goes in, it takes **two** cups — the one it landed in and the nearest one still standing. In exchange it scatters much more: measured, an aimed normal throw goes in about 87 % of the time, a bounce about 58 %.',
        },
      },
      {
        de: 'Was zählt und was nicht',
        en: 'What counts and what does not',
        body: {
          de: 'Nur ein Ball, der wirklich in den Becher fällt. Streift er den Rand und springt weg, zählt es nicht — das ist seit der letzten Korrektur auch genau so gemessen: Der Fangbereich ist jetzt der gezeichnete Becher und nicht mehr ein Stück größer als er.',
          en: 'Only a ball that really drops into the cup. Clipping the rim and kicking away does not count — and since the last correction that is measured to be true: the catching area is now the drawn cup rather than a bit larger than it.',
        },
      },
      {
        de: 'Re-Rack',
        en: 'Re-rack',
        body: {
          de: 'Einmal pro Spiel und Seite darfst du die verbliebenen Becher zusammenschieben. Lohnt sich, wenn nur noch verstreute Einzelne stehen.',
          en: 'Once per game per side you may push the remaining cups together. Worth it when only scattered singles are left.',
        },
      },
    ],
  },

  // ------------------------------------------------------------ the modes
  {
    id: 'modes',
    icon: 'trophy',
    de: 'Die Arcade-Modi',
    en: 'The arcade modes',
    summary: {
      de: 'Gegen den Computer, gegen Freunde, gegen Fremde.',
      en: 'Against the computer, against friends, against strangers.',
    },
    items: [
      {
        de: 'Offline gegen den Computer',
        en: 'Offline against the computer',
        body: {
          de: 'Vier Stufen von Einfach bis Profi. Sie unterscheiden sich nicht nur darin, wie oft der Gegner trifft, sondern darin, ob er ein Spiel **zumachen** kann: Die besseren Gegner werden ruhiger, je leerer dein Rack wird, und zielen in die geschützte Mitte.',
          en: 'Four levels from easy to pro. They differ not only in how often the opponent scores but in whether they can **close** a game: the better ones steady as your rack empties and aim into the sheltered middle.',
        },
      },
      {
        de: 'Pass & Play',
        en: 'Pass & Play',
        body: {
          de: 'Zwei Leute, ein Handy. Nach jedem Zug kommt eine Aufforderung, das Gerät weiterzugeben — damit niemand versehentlich für die andere Seite wirft.',
          en: 'Two people, one phone. After each turn a prompt asks you to hand it over, so nobody throws for the other side by accident.',
        },
      },
      {
        de: 'Online gegen Freunde',
        en: 'Online against friends',
        body: {
          de: 'Einer eröffnet einen Raum und bekommt einen Code aus vier Zeichen, der andere tippt ihn ein. Ab da wird abwechselnd geworfen, und du siehst die Würfe der anderen Seite wirklich fliegen. Kostet nichts.',
          en: 'One opens a room and gets a four-character code, the other types it in. From there you throw in turns, and you really see the other side’s throws fly. Free.',
        },
      },
      {
        de: 'Division Rivals',
        en: 'Division Rivals',
        body: {
          de: `Zehn Divisionen, von 10 (Rookie) bis 1. Siege bringen dich hoch, Niederlagen runter. Zwei Knöpfe: „Echten Gegner suchen" stellt dich in eine Warteschlange deiner Division; „Gegner suchen" spielt gegen den Computer. **Beides zählt** für die Division.`,
          en: `Ten divisions, from 10 (rookie) to 1. Wins move you up, losses down. Two buttons: "find a real opponent" puts you in a queue for your division; "find opponent" plays the computer. **Both count** towards the division.`,
        },
      },
      {
        de: 'Wenn niemand wartet',
        en: 'When nobody is waiting',
        body: {
          de: 'Nach 25 Sekunden sagt die App genau das und bietet den Computer an. Es wird dir nie eine KI als Mensch verkauft — der Computer heißt „KI", ein Mensch trägt seinen eigenen Namen.',
          en: 'After 25 seconds the app says exactly that and offers the computer. You are never sold an AI as a person — the computer is labelled as such, a person shows their own name.',
        },
      },
      {
        de: 'Weekend League',
        en: 'Weekend league',
        body: {
          de: `Ab Division ${WEEKEND_UNLOCK_DIVISION} freigeschaltet: ein Lauf über ${WEEKEND_MATCHES} Spiele, bei dem die Anzahl der Siege eine Stufe und eine Belohnung ergibt. Läuft gegen den Computer — online wäre ein Lauf, der abbricht, sobald mal niemand da ist, und das ist genau die Mechanik, die den Modus trägt.`,
          en: `Unlocked from division ${WEEKEND_UNLOCK_DIVISION}: a run of ${WEEKEND_MATCHES} matches where the number of wins gives you a tier and a reward. Played against the computer — online it would be a run that breaks the moment nobody is around, and that run is the whole point of the mode.`,
        },
      },
      {
        de: 'Turnier (Arcade, mit Einsatz)',
        en: 'Knockout (arcade, with a stake)',
        body: {
          de: `Im Arcade-Hub. Du zahlst einen Einsatz (${KNOCKOUT_STAKES.join(', ')} Coins) und wählst ein Feld aus ${KNOCKOUT_SIZES.join(' oder ')} Teams. Jede Runde ist ein echtes Match gegen einen Gegner, der von Runde zu Runde härter wird — das Feld wird vor dem Bezahlen ausgelost, du siehst also, wer im Finale wartet. Gewinnst du alles, bekommst du den ganzen Topf: **Einsatz mal Teamanzahl**. Verlierst du eine Runde, ist der Einsatz weg. **Ein Match, das du mittendrin verlässt, zählt als Niederlage** — sonst könnte man jede Runde so lange wiederholen, bis sie passt. Der Topf ist bewusst knapp berechnet: Wer die Hälfte seiner Spiele gewinnt, kommt auf Dauer ungefähr auf null raus.`,
          en: `In the arcade hub. You pay a stake (${KNOCKOUT_STAKES.join(', ')} coins) and pick a field of ${KNOCKOUT_SIZES.join(' or ')} teams. Every round is a real match against an opponent who gets harder each time — the field is drawn before you pay, so you can see who is waiting in the final. Win it all and the whole pot is yours: **the stake times the number of teams**. Lose a round and the stake is gone. **A match you walk out of counts as a loss** — otherwise any round could be replayed until it went your way. The pot is deliberately tight: winning half your matches comes out roughly level in the long run.`,
        },
      },
      {
        de: 'Turnier (Party, am echten Tisch)',
        en: 'Tournament (party, at a real table)',
        body: {
          de: 'Für eine ganze Runde: Teams eintragen, die App macht den Baum und führt euch durch die Partien. Zu finden im Kamera-Modus. Hier gibt es **keine Coins** — die Sieger trägt jemand von Hand ein, und ein Preis, den man sich antippen kann, wäre keiner.',
          en: 'For a whole party: enter the teams, the app builds the bracket and walks you through the ties. Found in the camera mode. There are **no coins** in this one — winners are entered by hand, and a prize you can simply tap for yourself is not a prize.',
        },
      },
    ],
  },

  // ------------------------------------------------------- coins and stats
  {
    id: 'progress',
    icon: 'stats-chart',
    de: 'Coins, Level, Statistiken',
    en: 'Coins, levels, statistics',
    summary: {
      de: 'Was du beim Spielen verdienst und was die App mitschreibt.',
      en: 'What you earn by playing, and what the app records.',
    },
    items: [
      {
        de: 'Coins',
        en: 'Coins',
        body: {
          de: 'Jeder Treffer bringt 10 Coins, jeder Wurf 2, ein gewonnenes Spiel 75, ein verlorenes 20. Dazu kommen tägliche Aufgaben und der Lucky Shot. Coins gibt es **nur** durchs Spielen — sie sind nirgends für Geld zu kaufen.',
          en: 'Every hit is 10 coins, every throw 2, a win 75, a loss 20. Plus daily tasks and the lucky shot. Coins come **only** from playing — they are not for sale anywhere.',
        },
      },
      {
        de: 'Level und XP',
        en: 'Level and XP',
        body: {
          de: 'Ein Treffer bringt 15 XP, ein Wurf 2. Daraus wächst dein Karriere-Level, das oben im Arcade-Hub steht. Steigt es mitten im Spiel, wird es dir nach der Partie gezeigt.',
          en: 'A hit is 15 XP, a throw 2. Out of that grows your career level, shown at the top of the arcade hub. If it turns over mid-game you are told after the match.',
        },
      },
      {
        de: 'Skins für Coins',
        en: 'Skins for coins',
        body: {
          de: 'Bälle und Tische, bezahlt mit Coins. Der teuerste kostet etwa zwei Wochen Spielen — absichtlich, weil etwas übrig bleiben muss, worauf man hinspielt.',
          en: 'Balls and tables, paid for with coins. The dearest costs about a fortnight of playing — deliberately, because something has to be left to play towards.',
        },
      },
      {
        de: 'Becher-Designs der Woche',
        en: 'The week’s cup designs',
        body: {
          de: `Unter **Skins → Becher** stehen jede Woche ${WEEKLY_OFFER_SIZE} Becher-Designs für Coins zum Kauf. Insgesamt gibt es ${COIN_CUP_DESIGNS.length}, jedes ist alle ${COIN_CUP_DESIGNS.length / WEEKLY_OFFER_SIZE} Wochen einmal dran — was du diese Woche nicht kaufst, kommt wieder. Unter dem Angebot siehst du die ganze Sammlung mit dem Hinweis, wann das jeweilige Design das nächste Mal im Angebot ist. Gewechselt wird in der Nacht auf Montag, und zwar für alle gleichzeitig: Zwei Leute am selben Tisch sehen immer dasselbe Angebot. Das sind Muster — Carbon, Camo, Sonnenuntergang. Die **Länderflaggen** sind etwas anderes und gibt es weiterhin nur im Becher-Shop für echtes Geld.`,
          en: `Under **Skins → Cups**, ${WEEKLY_OFFER_SIZE} cup designs are on offer for coins each week. There are ${COIN_CUP_DESIGNS.length} in all and each comes round once every ${COIN_CUP_DESIGNS.length / WEEKLY_OFFER_SIZE} weeks, so one you skip this week is not gone. Below the offer is the whole collection, each with when it is next up. It changes overnight on Monday, and for everybody at once: two people at the same table always see the same three. These are patterns — carbon, camouflage, sunset. The **country flags** are a separate thing and stay in the cup shop, for money.`,
        },
      },
      {
        de: 'Lucky Shot',
        en: 'Lucky shot',
        body: {
          de: `Einmal pro Tag: ein Wurf auf ein Rack mit einem goldenen Becher. Goldener Becher ${LUCKY_GOLDEN_COINS} Coins, jeder andere ${LUCKY_CUP_COINS}. Wer mehrere Tage hintereinander kommt, bekommt bis zu ${LUCKY_MAX_STREAK} Tage lang je ${LUCKY_STREAK_BONUS} Coins extra.`,
          en: `Once a day: one throw at a rack with a golden cup in it. The golden one is ${LUCKY_GOLDEN_COINS} coins, any other ${LUCKY_CUP_COINS}. Coming back on consecutive days adds ${LUCKY_STREAK_BONUS} coins a day for up to ${LUCKY_MAX_STREAK} days.`,
        },
      },
      {
        de: 'Deine Zahlen',
        en: 'Your numbers',
        body: {
          de: 'Der Statistik-Bildschirm zeigt dein Trefferbild (welche Becher-Positionen du triffst, an den echten Rack-Stellen), deine Form über die letzten Partien, dein Tempo und den Weg durch die Divisionen. Gezählt werden nur deine eigenen Würfe — es geht um dein Zielen, nicht um deren.',
          en: 'The statistics screen shows your hit map (which rack positions you sink, at the real cup positions), your form over recent matches, your pace, and your path through the divisions. Only your own throws count — it is about your aim, not theirs.',
        },
      },
      {
        de: 'Tägliche Aufgaben, Erfolge, Season',
        en: 'Daily tasks, achievements, season',
        body: {
          de: 'Kleine Ziele, die es jeden Tag neu gibt, dauerhafte Erfolge und eine laufende Season mit Stufen. Alles bringt Coins und nichts davon lässt sich kaufen.',
          en: 'Small goals that renew daily, permanent achievements and a running season with tiers. All of it pays coins, and none of it can be bought.',
        },
      },
    ],
  },

  // -------------------------------------------------------------- payments
  {
    id: 'money',
    icon: 'card',
    de: 'Was Geld kostet — und was nicht',
    en: 'What costs money — and what does not',
    summary: {
      de: 'Zwei Sachen, beide einmalig, beide ohne Spielvorteil.',
      en: 'Two things, both one-off, neither a game advantage.',
    },
    items: [
      {
        de: `Pro: ${euro(DEFAULT_PRICE_CENTS)} einmalig`,
        en: `Pro: ${euro(DEFAULT_PRICE_CENTS)} once`,
        body: {
          de: `Hebt das Wochenlimit für die automatische Kamera-Erkennung auf. Das ist alles, was es tut — kein Abo, keine Folgekosten. Von Hand zählen, Arcade, Online und Turniere waren und bleiben kostenlos.`,
          en: `Lifts the weekly limit on automatic camera detection. That is all it does — no subscription, no running costs. Counting by hand, arcade, online and tournaments were and stay free.`,
        },
      },
      {
        de: `Becher-Designs: ${euro(CUP_PRICE_CENTS)} je Land`,
        en: `Cup designs: ${euro(CUP_PRICE_CENTS)} per country`,
        body: {
          de: `${PAID_CUP_DESIGNS.length} Länder-Flaggen für deine Becher im Arcade-Spiel, alle zusammen ${euro(CUP_BUNDLE_CENTS)}. Sie ändern **nichts** am Spiel: kein Vorteil, keine besseren Chancen, nur das Aussehen. Im Online-Spiel sieht die andere Seite sie.`,
          en: `${PAID_CUP_DESIGNS.length} country flags for your cups in the arcade game, or all of them for ${euro(CUP_BUNDLE_CENTS)}. They change **nothing** about the game: no advantage, no better odds, only the look. The other table sees them in an online game.`,
        },
      },
      {
        de: 'Dein Code ist die Quittung',
        en: 'Your code is the receipt',
        body: {
          de: 'Nach dem Kauf bekommst du einen Code der Form BP-XXXX-XXXX-XXXX. Notiere ihn. Weil es keine Konten gibt, ist er der einzige Weg, den Kauf auf ein neues Handy zu bekommen — dort unter „Ich habe schon einen Code" eintippen.',
          en: 'After buying you get a code shaped BP-XXXX-XXXX-XXXX. Write it down. With no accounts it is the only way to move the purchase to a new phone — type it in there under "I already have a code".',
        },
      },
      {
        de: 'Ein Code gilt für genau eine Sache',
        en: 'A code opens one thing',
        body: {
          de: `Ein Code für Österreich schaltet Österreich frei — nicht Deutschland, nicht das Paket und nicht die Kamera. Das ist mit Absicht so gebaut, sonst würde ein ${euro(CUP_PRICE_CENTS)}-Code die ${euro(DEFAULT_PRICE_CENTS)}-Funktion öffnen.`,
          en: `A code for Austria unlocks Austria — not Germany, not the bundle and not the camera. Built that way on purpose, or a ${euro(CUP_PRICE_CENTS)} code would open the ${euro(DEFAULT_PRICE_CENTS)} feature.`,
        },
      },
      {
        de: 'Bezahlt wird bei Stripe',
        en: 'Payment happens at Stripe',
        body: {
          de: 'Der Kauf läuft über die Bezahlseite von Stripe. Die App sieht deine Kartendaten nie, und es gibt in der App nichts, wo sie gespeichert wären.',
          en: 'The purchase runs through Stripe’s own page. The app never sees your card details, and there is nowhere in the app they would be stored.',
        },
      },
    ],
  },

  // ------------------------------------------------------------- save code
  {
    id: 'save',
    icon: 'cloud-upload',
    de: 'Damit nichts verloren geht',
    en: 'So nothing gets lost',
    summary: {
      de: 'Ein Code statt eines Logins — und was er kann.',
      en: 'A code instead of a login — and what it does.',
    },
    items: [
      {
        de: 'Warum es das braucht',
        en: 'Why this exists',
        body: {
          de: 'Ohne Sicherung liegt dein ganzer Fortschritt — Coins, Level, Division, Skins, Statistiken, Käufe — nur im Speicher dieses Browsers. Neues Handy, gelöschte Website-Daten, anderer Browser: weg.',
          en: 'Without a backup your whole progress — coins, level, division, skins, statistics, purchases — lives only in this browser’s storage. New phone, cleared site data, a different browser: gone.',
        },
      },
      {
        de: 'Einschalten',
        en: 'Switching it on',
        body: {
          de: 'Im Profil unter „Sicherung". Du bekommst einen Code der Form SV-XXXX-XXXX-XXXX. Ab dann wird dein Spielstand nach jeder Änderung automatisch hochgeladen — ein paar Sekunden nachdem du aufgehört hast zu spielen.',
          en: 'In the profile under "Backup". You get a code shaped SV-XXXX-XXXX-XXXX. From then on your progress is uploaded automatically after any change — a few seconds after you stop playing.',
        },
      },
      {
        de: 'Auf ein neues Gerät holen',
        en: 'Getting it onto a new device',
        body: {
          de: 'Dort denselben Code eingeben. Achtung: Das **ersetzt** den Spielstand auf diesem Gerät, deshalb wird vorher nachgefragt.',
          en: 'Enter the same code there. Careful: this **replaces** the progress on that device, which is why it asks first.',
        },
      },
      {
        de: 'Der Code ist das einzige Geheimnis',
        en: 'The code is the only secret',
        body: {
          de: 'Wer ihn hat, kommt an den Spielstand. Also nicht öffentlich posten. Dafür gibt es keine E-Mail-Adresse, kein Passwort und nichts, was man vergessen kann.',
          en: 'Anybody who has it can reach the save. So do not post it publicly. In exchange there is no email address, no password and nothing to forget.',
        },
      },
    ],
  },

  // ----------------------------------------------------------- limitations
  {
    id: 'limits',
    icon: 'alert-circle',
    de: 'Was die App nicht kann',
    en: 'What the app cannot do',
    summary: {
      de: 'Ehrlich aufgelistet, damit es niemand selbst herausfinden muss.',
      en: 'Listed plainly, so nobody has to find out the hard way.',
    },
    items: [
      {
        de: 'Sie erkennt keine Treffer von allein',
        en: 'It does not score hits by itself',
        body: {
          de: 'Sie sieht, dass ein Becher verschwunden ist, und fragt nach. Ein Ball, der im Becher landet und wieder herausspringt, ist für sie dasselbe wie einer, der drin bleibt — den Unterschied musst du tippen.',
          en: 'It sees that a cup has gone and asks. A ball that lands in a cup and bounces out is the same to it as one that stays in — you tap the difference.',
        },
      },
      {
        de: 'Im Online-Spiel kann man schummeln',
        en: 'Online play can be cheated',
        body: {
          de: 'Das Ergebnis eines Wurfs kommt von dem Handy, das geworfen hat — anders geht es nicht, das Wischen passiert dort. Wer unbedingt will, kann also einen Treffer behaupten. Deine Division liegt deshalb auf deinem Gerät: Wer dort schummelt, schummelt sich selbst etwas vor.',
          en: 'The result of a throw comes from the phone that threw it — there is no other way, the swipe happens there. So somebody determined could claim a hit. Your division therefore lives on your device: cheating there only fools yourself.',
        },
      },
      {
        de: 'Keine Rangliste über alle Spieler',
        en: 'No global leaderboard',
        body: {
          de: 'Aus demselben Grund. Eine öffentliche Rangliste mit Preisen wäre das Erste, was jemand ausnutzt — dafür bräuchte es Konten und einen Server, der jeden Wurf selbst rechnet.',
          en: 'For the same reason. A public leaderboard with prizes would be the first thing anybody exploited — that needs accounts and a server that computes every throw itself.',
        },
      },
      {
        de: 'Nur im Web: Erkennung und Highlights',
        en: 'Web only: detection and highlights',
        body: {
          de: 'Beides braucht Zugriff auf einzelne Kamerabilder, den eine installierte native App nicht hat. Alles andere läuft überall.',
          en: 'Both need access to individual camera frames, which an installed native build does not have. Everything else runs anywhere.',
        },
      },
      {
        de: 'Die Kamera ist noch nicht am echten Tisch bewiesen',
        en: 'The camera is not yet proven at a real table',
        body: {
          de: 'Die Erkennung ist gegen simulierte Bilder gemessen: 0 Fehlalarme, alle Treffer gefunden, über tausende Bilder. Ein echter Tisch mit echtem Licht ist damit nicht dasselbe. Probiere sie an einem echten Tisch aus, bevor du dich darauf verlässt.',
          en: 'The detector is measured against simulated frames: zero false alarms, every hit found, over thousands of frames. A real table in real light is not the same thing. Try it at one before relying on it.',
        },
      },
    ],
  },

  // -------------------------------------------------------------- settings
  {
    id: 'settings',
    icon: 'person',
    de: 'Profil und Einstellungen',
    en: 'Profile and settings',
    summary: { de: 'Sprache, Ton, Vibration, Sicherung.', en: 'Language, sound, haptics, backup.' },
    items: [
      {
        de: 'Sprache',
        en: 'Language',
        body: {
          de: 'Deutsch und Englisch, jederzeit umschaltbar. Ländernamen der Becher-Designs bleiben in ihrer eigenen Sprache.',
          en: 'German and English, switchable at any time. The cup designs keep their own country names.',
        },
      },
      {
        de: 'Ton und Vibration',
        en: 'Sound and haptics',
        body: {
          de: 'Beides einzeln abschaltbar. Der Ton ist hilfreich, wenn das Handy am Tisch steht und du nicht draufschaust.',
          en: 'Both can be switched off separately. Sound helps when the phone is standing on the table and you are not looking at it.',
        },
      },
      {
        de: 'Diese Anleitung',
        en: 'This guide',
        body: {
          de: 'Steht im Profil und ist jederzeit wieder aufrufbar — du musst dir nichts merken.',
          en: 'Lives in the profile and can be reopened at any time — nothing here has to be memorised.',
        },
      },
    ],
  },
];

/** Every item across every chapter, for a count on the entry card. */
export const GUIDE_ITEM_COUNT = GUIDE.reduce((sum, chapter) => sum + chapter.items.length, 0);
