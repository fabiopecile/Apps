# Beerpong

Kamera-Tracker für echtes Beer Pong plus Arcade-Spiel — Expo / React Native (TypeScript).

## Voraussetzungen

- **Node.js 20 oder neuer** — https://nodejs.org (LTS-Version nehmen)
- **Git** — https://git-scm.com

Prüfen, ob beides da ist:

```bash
node -v    # sollte v20.x oder höher zeigen
git -v
```

## Projekt holen und starten

```bash
git clone https://github.com/fabiopecile/Apps.git
cd Apps/beerpong
git checkout claude/beerpong-mobile-app-845mv3
npm install
npx expo start
```

Danach hast du drei Möglichkeiten, die App zu öffnen.

### 1. Im Browser (funktioniert immer)

Im laufenden `expo start` die Taste **`w`** drücken, oder direkt:

```bash
npm run web
```

Öffnet http://localhost:8081. Gut für Layout und Spielablauf. Haptisches Feedback
fehlt im Browser, und die Kamera verhält sich anders als auf dem Handy.

### 2. Auf dem Handy mit Expo Go

- **Expo Go** installieren: [App Store](https://apps.apple.com/app/expo-go/id982107779) ·
  [Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)
- Handy und Rechner müssen im **selben WLAN** sein
- QR-Code aus dem Terminal scannen: iOS mit der Kamera-App, Android direkt in Expo Go

Klappt der Scan nicht, liegt es fast immer am Netzwerk. Dann:

```bash
npx expo start --tunnel
```

Das leitet über einen Expo-Server um und funktioniert auch über Mobilfunk oder
hinter einer Firewall (dafür etwas langsamer).

### 3. Als installierbare App (ohne Expo Go)

Baut in der Expo-Cloud, du brauchst nur einen kostenlosen Expo-Account:

```bash
npm install -g eas-cli
eas login
eas init          # legt einmalig die Projekt-ID an
eas build --profile preview --platform android
```

Am Ende bekommst du einen Link zu einer **APK**, die du direkt auf einem
Android-Handy installieren kannst. Für iOS geht dieser Weg nur mit einem
Apple-Developer-Account (99 $/Jahr) über TestFlight.

## An Freunde verteilen (kostenlos)

Zwei Wege, beide ohne Gebühren. Der Web-Weg funktioniert auf **iPhone und
Android**, der APK-Weg nur auf Android — dafür ist er eine echte App.

### Weg 1: Web-App auf GitHub Pages — einmalig 2 Minuten einrichten

Das ist der wichtigere Weg, weil er auch auf dem iPhone funktioniert. Es gibt
**keinen kostenlosen Weg, eine echte App aufs iPhone zu bringen** — Apple
verlangt dafür 99 €/Jahr, auch für TestFlight und auch für die EU-Alternativstores.
Die Web-App umgeht das komplett.

> **Voraussetzung: das Repository muss öffentlich sein.** Bei privaten Repos
> gibt es GitHub Pages nur mit einem Bezahlplan (GitHub Pro, ca. 4 $/Monat).
> Umstellen unter **Settings** → ganz unten **Danger Zone** → *Change
> repository visibility* → **Public**. In diesem Repo liegen nur die App, die
> beiden Workflows und diese README — keine Schlüssel, Passwörter oder
> Zugangsdaten, öffentlich ist also unbedenklich.

**Einrichten (nur einmal nötig):**

1. **Pages einschalten.** Direkt zu dieser Adresse gehen — am Handy ist der
   Weg über die Menüs mühsam, weil „Settings" hinter dem **⋯**-Menü liegt:

   ```
   https://github.com/fabiopecile/Apps/settings/pages
   ```

   Unter *Build and deployment* bei **Source** von „Deploy from a branch" auf
   **GitHub Actions** umstellen. Mehr ist dort nicht zu tun — es gibt keinen
   Speichern-Knopf, die Auswahl greift sofort.

2. **Änderungen nach `main` bringen.** Der Workflow läuft nur von dort, und
   Pages veröffentlicht standardmäßig nur vom Hauptzweig: **Pull requests** →
   *New pull request* → base `main`, compare `claude/beerpong-mobile-app-845mv3`
   → *Create* → *Merge*. Der Merge startet den Workflow von selbst.

> **Schritt 1 lässt sich nicht automatisieren.** Die Option `enablement: true`
> von `actions/configure-pages` sieht danach aus, verlangt laut eigener
> Beschreibung aber ein Token mit `administration:write` — das kann ein
> Workflow-Token nicht bekommen. Ohne Schritt 1 bricht jeder Lauf mit
> **„Get Pages site failed"** ab, bevor überhaupt gebaut wird.

> **Ein „Re-run" wiederholt den alten Stand.** Er nimmt die Workflow-Datei aus
> dem Commit, zu dem der Lauf gehört — eine seitdem gepushte Korrektur ist
> darin nicht enthalten. Nach einer Änderung am Workflow also einen *neuen*
> Lauf starten, nicht den alten wiederholen.

> Die Warnung „Node.js 20 is deprecated" im Protokoll ist harmlos — sie betrifft
> GitHubs eigene Actions, nicht diese App, und lässt den Lauf durchgehen.

Nach ein paar Minuten steht die Adresse oben im Workflow-Ergebnis, normalerweise:

```
https://fabiopecile.github.io/Apps/
```

Ab jetzt aktualisiert sich die Seite bei jedem Push auf `main` von allein.

Das alles geht **komplett vom Handy** — github.com in Safari öffnen, kein
Rechner nötig.

**Installieren auf dem Handy:**

| Gerät | So geht's |
|---|---|
| **iPhone** | Link in **Safari** öffnen (nicht Chrome!) → Teilen-Symbol unten → „Zum Home-Bildschirm" |
| **Android** | Link in Chrome öffnen → Menü (⋮) → „App installieren" bzw. „Zum Startbildschirm hinzufügen" |

Danach liegt ein Icon auf dem Handy und die App startet im Vollbild — ohne
Browser-Leiste, wie eine normale App. Dank Service Worker läuft sie auch
**ohne Internet** weiter, sobald sie einmal geladen wurde.

**Was in der Web-Version fehlt:**

- **Kein Vibrieren** — Haptik gibt es im Browser nicht
- **Ergebnis-Teilen als Bild** ist deaktiviert (auf iOS nicht sauber machbar)
- **Ton** startet erst nach der ersten Berührung — Browser-Regel gegen Autoplay
- Die **Kamera** funktioniert, braucht aber HTTPS — bei GitHub Pages automatisch dabei

### Weg 2: APK für Android

Unter **Actions** → **„Android-APK bauen"** → **Run workflow**. Nach ein paar
Minuten hängt die fertige APK unten am Workflow-Ergebnis als Download
(„beerpong-apk").

Soll die APK eine feste Adresse zum Verschicken bekommen, stattdessen ein
Versions-Tag pushen — dann landet sie automatisch unter „Releases":

```bash
git tag v1.0.0
git push origin v1.0.0
```

Deine Freunde laden die Datei herunter und öffnen sie. Android fragt einmalig,
ob Installationen aus dieser Quelle erlaubt sind — bestätigen, fertig.

> **Zur Signatur:** Die APK wird mit dem Standard-Debug-Schlüssel signiert, den
> jedes Expo-Projekt mitbringt. Zum Verteilen an Freunde reicht das, und
> Updates lassen sich installieren, weil der Schlüssel gleich bleibt. Für den
> Google Play Store bräuchtest du einen eigenen Schlüssel — dann ist
> `eas build` (siehe oben) der einfachere Weg, weil Expo den Schlüssel für dich
> verwaltet.

### Was das kostet

| | Preis |
|---|---|
| GitHub Pages + Actions (öffentliches Repo) | **0 €** |
| APK direkt verteilen | **0 €** |
| Amazon Appstore, Samsung Galaxy Store | **0 €**, kleine Reichweite |
| Google Play | **25 $ einmalig** — neue Privatkonten müssen erst 14 Tage mit 12 Testern testen |
| Apple App Store / TestFlight | **99 €/Jahr**, kein kostenloser Ersatz |

## Becher-Erkennung über die Kamera

Im Tracker gibt es oben das Scan-Symbol. Damit muss die App nicht mehr bei
jedem Treffer angetippt werden.

**Wo das Handy hin muss — zwei Möglichkeiten:**

- **Quer an der Längsseite** (empfohlen). Im Querformat ist der volle
  Sensor-Ausschnitt zu sehen, im Hochformat nur ein Streifen von gut einem
  Drittel — quer passt also fast dreimal so viel Tisch ins Bild, und beide
  Racks sind gleich weit von der Linse entfernt. Die Ringe stehen dann schon
  von selbst richtig: links und rechts, jeweils eine Vierteldrehung.
- **Hochkant an einem Tischende**, erhöht und leicht nach unten geneigt: das
  nahe Rack unten, das ferne oben. Funktioniert, aber das ferne Rack ist klein.

Die App merkt selbst, wie das Handy gehalten wird, und setzt die Ringe beim
Drehen passend neu — eine schon gestartete Ausrichtung geht dabei verloren und
muss einmal neu bestätigt werden.

Quer drehen lohnt sich nur hier. **Arcade bleibt Hochformat** — der Tisch ist
lang, und nach oben gewischt wird auch. Wird das Handy im Match gedreht, fragt
die App danach, es zurückzudrehen; das laufende Spiel bleibt dabei stehen.

**So läuft es ab:**

1. Handy hinstellen — angelehnt oder auf einem Stativ, es darf sich nicht mehr
   bewegen
2. Scan-Symbol antippen. Schritt **1/2**: Ringe auf das erste Rack legen
   (ziehen zum Verschieben, zwei Finger zum Vergrößern und Drehen, **90°** für
   Vierteldrehungen)
3. **Weiter zum 2. Rack**, dasselbe für die andere Seite. Ist nur ein Rack im
   Bild: **Nur ein Rack** drücken
4. **Passt — los**. Ab jetzt beobachtet die App beide Racks
5. Verschwindet ein Becher, fragt sie **„Becher weg — Treffer?"** und sagt
   dazu, bei welchem Team er fehlt — bestätigen oder verwerfen

Antippen funktioniert weiter wie bisher; die Erkennung ist nur eine Abkürzung.

**Warum beide Racks besser sind:** Der Punkt geht immer an das Team, dessen
Rack *nicht* verloren hat — unabhängig davon, wen die App gerade als „am Zug"
führt. Mit nur einem Rack im Bild ist bloß die Hälfte des Spiels automatisch.

**Warum sie nachfragt statt selbst zu zählen:** Am Tisch stehen Leute, Hände
greifen ins Bild, jemand räumt um. Die Nachfrage kostet einen Knopfdruck und
verhindert falsche Punkte. Verändert sich ein ganzes Rack auf einmal, meldet
die App das als Störung — und zwar **pro Rack**: eine Hand über einem Rack ist
zwar nur die Hälfte aller Becher, aber das komplette Rack, und würde bei einer
gemeinsamen Prüfung als fünf einzelne Treffer durchrutschen.

**Einschränkungen, ehrlich:**

- **Nur in der Web-Version.** Die installierte APK kann keine einzelnen
  Kamerabilder lesen — `expo-camera` liefert nur fertige Fotos. Dafür bräuchte
  es `react-native-vision-camera` mit Frame-Processors und einen eigenen
  Dev-Client. Die Erkennungslogik selbst (`lib/cupVision.ts`) ist davon
  unabhängig und würde unverändert weiterlaufen; auszutauschen wäre nur
  `lib/frameSampler.ts`.
- **Das Handy muss stillstehen.** Wackelt es, stimmt die Ausrichtung nicht mehr
  → „Neu ausrichten" drücken.
- **Nach einem Re-Rack neu ausrichten**, weil die Becher dann woanders stehen.
- **Im Hochformat ist das ferne Rack klein im Bild.** Je länger der Tisch,
  desto weniger Pixel pro Becher — irgendwann reicht es nicht mehr. Genau
  deshalb ist quer die bessere Wahl. Wie weit das trägt, zeigt erst der echte
  Tisch.

**Getestet mit:**

```bash
npm test                                               # alles auf einmal
npm run test:vision                                    # 17 Prüfungen der Erkennung, ohne Kamera
python3 tools/gen_test_table_video.py t.y4m one        # Testvideo: ein Rack
python3 tools/gen_test_table_video.py t.y4m both       # Testvideo: beide Racks, hochkant
python3 tools/gen_test_table_video.py t.y4m side       # Testvideo: beide Racks, quer
```

Die Testvideos zeigen Racks, über die erst eine Hand streicht (darf **nicht**
zählen) und aus denen danach Becher verschwinden (müssen **genau einmal** und
dem **richtigen Team** gemeldet werden). Chromium kann sie per
`--use-file-for-fake-video-capture=t.y4m` als Kamera ausgeben.

## Zwei Bälle, Bälle zurück, letzte Chance

Das Spiel gab den Zug vorher nach **jedem** Wurf ab, Treffer wie Fehlwurf. Das
ist nicht Beer Pong, und vor allem hat es keine Dramaturgie: Wer sich streng
abwechselt, kann nie einen Lauf haben, nie etwas zurückholen und nie spüren, wie
ein Spiel kippt. Jetzt gelten die echten Regeln:

- Du wirfst **zwei Bälle** pro Zug.
- Triffst du **beide**, bekommst du sie **zurück** und wirfst nochmal. Das ist
  ein Lauf, und dort werden Spiele gewonnen. Nichts begrenzt ihn.
- Fällt dein **letzter Becher**, bist du noch nicht raus: du bekommst die
  **letzte Chance** und wirfst, bis du danebengehst. Räumst du ab, was vom
  gegnerischen Rack übrig ist, hast du es zurückgeholt. Ein Fehlwurf und es ist
  vorbei.

Die Regeln liegen in `lib/turnRules.ts`, absichtlich getrennt vom Bildschirm,
damit ganze Spiele ohne Browser durchgerechnet werden können
(`npm run test:turns`, 10 Prüfungen). Im laufenden Spiel nachgewiesen: „BÄLLE
ZURÜCK" nach einem Doppel, „LETZTE CHANCE" als das erste Rack leer war, 52 Würfe
ohne Fehler.

Der Ball-Zähler unter dem Tisch zeigt, bei welchem der beiden Bälle du bist, und
der Hinweistext sagt die Regel dazu („Ball 1 von 2 — beide treffen und du
bekommst sie zurück"). Beides zusammen, weil die Punkte allein zu leise waren:
wer die Regel nicht kennt, wundert sich nur, dass er zweimal werfen darf.

**Achtung beim Ausprobieren:** Die Regel ist erst seit dem Merge von PR #13 in
der veröffentlichten Fassung. Eine PWA, die noch im Speicher liegt, zeigt
weiterhin die alte — App komplett schließen und neu öffnen.

**Nebenbei repariert:** Der Funkenregen beim Treffer wurde noch an den
2D-Koordinaten des Bechers gezündet, was seit dem 3D-Umbau nichts mehr bedeutet.
Er sitzt jetzt über der Tischmitte.

## Der Tisch ist echtes 3D

Seit dieser Fassung rendert der Arcade-Modus mit **WebGL** (three.js über
react-three-fiber) statt mit gezeichneter Perspektive. Die Becher sind
Rotationskörper aus einem Profil, der Tisch ist eine Platte, die Kamera macht
die Perspektive.

**Die Konsequenz, die man leicht übersieht:** Sobald eine echte Kamera da ist,
sind **alle Becher gleich groß**. Die alte Layout-Datei machte ferne Becher
schmaler (34 Punkte hinten, 68 vorne), damit sie *kleiner gezeichnet* wurden —
zusammen mit einer Kamera hätte das sie doppelt schrumpfen lassen. Das Layout
ist deshalb jetzt in **Bodenkoordinaten**: `x` quer über den Tisch, `y` den
Tisch hinunter, beides flach auf der Platte. Damit fällt einiges weg, was vorher
schiefgehen konnte — ein Bechermund ist wieder ein **Kreis** und liegt genau
über dem Becher, statt eine Ellipse ein Drittel Becherhöhe darüber zu sein.

**Und du wirfst von hinter deinem eigenen Rack.** Der Ball lag vorher in der
Tischmitte. Mit einer echten Kamera war er damit unsichtbar: deine eigenen
Becher stehen zwischen dir und der Tischmitte. Der Wurf fliegt jetzt über die
eigenen Becher hinweg, wie im echten Leben.

**Was die Leistung angeht, bin ich ehrlich:** In dieser Umgebung gibt es keine
GPU, WebGL läuft dort im Software-Rasterisierer. Echte Bildraten auf einem
iPhone kann ich hier **nicht** messen. Was messbar ist, ist die relative Last:
Pixeldichte auf höchstens 2 begrenzt, Kantenglättung aus, zwei Punktlichter
gestrichen und die Geometrie gröber gestuft haben aus 6 fps 18 fps gemacht — die
gleiche Szene, dreimal billiger. Auf einer echten GPU ist das eine kleine Szene.

**Was dabei verloren ging:** Der Funkenregen beim Treffer sitzt noch in
2D-Koordinaten und wird deshalb nicht mehr an der richtigen Stelle gezündet.

## Der Wurf im Arcade-Modus

Ursprünglich war der Wurf ein Würfelwurf: `Trefferchance = Können + Kraft`,
dann `Math.random()`. Man konnte nicht besser werden. Danach kam ein Zielkreuz
— besser, aber es fühlte sich an wie Zielen, nicht wie Werfen.

Jetzt wirfst du wirklich — die Geste ist die von Pokémon GO:

1. **Der Ball hängt am Finger — überall hin, ohne Leine.** Solange du langsam
   ziehst, sitzt er punktgenau unter deiner Fingerspitze: nach links, nach
   rechts, zurück für einen Anlauf, quer über den halben Tisch. Gemessen über
   einen 240-Punkte-Zug: 0 Punkte Abstand.
2. **Beim schnellen Ziehen rutscht er.** Ab etwa 300 pt/s Handgeschwindigkeit kommt er
   nur noch anteilig mit, bei 900 pt/s nur noch zu einem Drittel. Das muss so
   sein: ein harter Flick läuft zwei Drittel des Tisches hoch, und ein Ball,
   der daran kleben bliebe, wäre schon am Becher, bevor er überhaupt fliegt.
   Gemessen ohne diese Bremse: ein 160-Punkte-Flick trug 179 von 187 Punkten,
   es blieben 8 Punkte Flug übrig. Mit ihr sind es 60.
3. **Beim Loslassen zählt die Länge des Zuges**, nicht sein Tempo. Ein zu
   kurzer Zug (unter 38 Punkten) ist kein Wurf — der Ball rollt zurück auf
   seine Stelle und der Zug ist nicht verbraucht.
4. **Wie weit du ihn schon getragen hast, wird abgezogen.** Die Gesamtstrecke ab
   der Ausgangsstelle hängt nur an deiner Wischgeschwindigkeit — egal, von wo du
   losgelassen hast. Sonst wäre jeder Zug nach vorne geschenkte Weite, und man
   könnte den Ball bis zum Becher tragen und hineintippen.
5. **Der Ball fliegt eine echte Parabel.** Er steigt, erreicht nach 0,20 s
   seinen Scheitel bei rund 116 Punkten Höhe und ist nach 0,40 s unten. Am
   Schatten unter ihm siehst du, wo er auf dem Tisch gerade ist — Höhe und
   Entfernung teilen sich sonst dieselbe Bildschirmachse.
6. **Getroffen ist der Becher, in dessen Öffnung er aufkommt** — und dann fällt
   er sichtbar hinein. Am Rand prallt er ab: zwei Hüpfer, der zweite mit 60 %
   vom ersten, dieselbe Zahl wie beim Aufsetzer. Zu fest geworfen segelt er über
   das Rack, zu sanft fällt er davor auf den Tisch.

### Die Becher sind Körper, keine Aufkleber

Vorher wurde **jeder** Becher mit derselben Öffnungs-Ellipse gezeichnet
(`rx=37, ry=9.6`), egal ob er vorne oder hinten stand. Das ist der Grund, warum
sie flach wirkten: in echter Perspektive sieht man einen nahen Becher von oben,
seine Öffnung ist fast rund, und einen fernen fast von der Seite, seine Öffnung
ist ein Schlitz.

Die Form liegt jetzt in `lib/cupGeometry.ts` und wird aus der Becherbreite
berechnet — 0,28 hinten bis 0,54 vorne. Daraus folgt der Rest von selbst: eine
rundere Öffnung braucht mehr Platz, also bleibt weniger Körper sichtbar, und
das ist echte Verkürzung statt derselben Grafik in zwei Größen.

**Die Kamera steht hoch**, rund 32 Grad über dem Filz statt der 12, mit denen
sie angefangen hat. Von unten ist das ferne Rack ein dünnes Band aus Rändern,
das man nicht lesen kann; von oben schaut man in die Becher hinein. Ganz
senkrecht aber nicht: ohne ein Stück Becherwand im Bild ist die Höhe des Balls
nicht mehr ablesbar, und der Bogen geht mit ihr verloren.

**Warum die Breite und nicht eine Kamera:** Der Tisch ist keine einheitliche
Perspektive. Der Versuch, eine Lochkamera an die beiden Racks zu fitten, landet
6,35 pt daneben und läuft in die Suchgrenzen — weil die Kamera den Tisch
entlangschwenkt und jedes Rack dafür ausgelegt ist, für sich betrachtet zu
werden. Die Tiefe steckt hier in der Breite.

**Gezielt wird auf das Loch, nicht auf den Becher.** Grafik und Physik lesen
beide dieselbe Geometrie, und ein Test prüft für jeden der zwanzig Becher, dass
der Punkt, auf den geworfen wird, auf den Pixel mit dem gezeichneten Rand
zusammenfällt. Genau das war einmal auseinandergelaufen: die Physik zielte auf
die Bechermitte, das Loch lag ein Drittel der Becherhöhe höher, und ein Treffer
zählte, ohne je wie einer auszusehen.

**Der Tisch ist eine Platte.** Keine Rechteckfläche mehr, sondern ein Trapez mit
sichtbarer Kante an den Seiten und vorne — am fernen Ende halb so breit wie an
deinem.

### Tiefensortierung: was vorne steht, verdeckt was hinten steht

Vorher lag die Zeichenreihenfolge fest: erst Tisch, dann Becher, dann Ball —
also **immer** Ball über allen Bechern. Ein Ball, der hinter der letzten Reihe
landete, rollte sichtbar über das ganze Rack hinweg. Das war kein Schönheits-
fehler, sondern der Hauptgrund, warum sich das Spiel flach anfühlte.

Jeder Becher und der Ball tragen jetzt eine Tiefe aus ihrer Position auf dem
Tisch. Der Ball wird nach seiner **Bodenposition** einsortiert, nicht nach
seiner Höhe: ein Ball, der über die hintere Reihe segelt, ist trotzdem hinter
den Bechern, die vor ihm stehen.

Gemessen: das kostet nichts. Drei Läufe mit Sortierung (1041/1452/1417 ms
blockiert) gegen drei ohne (1390/1152/1431 ms) — kein Unterschied. Die
Vermutung, das animierte `zIndex` sei teuer, ließ sich in einem A/B ebenfalls
nicht bestätigen.

**Der Ball schrumpft mit der Entfernung.** Er war vorher exakt gleich groß, ob
er in deiner Hand lag oder an der hinteren Reihe — gemessen sind es jetzt 24,1
pt vorne und 19,0 pt hinten. Sein Schatten nimmt die Tischskalierung flach mit,
ohne den Höhenanteil; genau diese Differenz zwischen Ball und Schatten ist der
Tiefenhinweis.

Dazu kommt ein kleiner Streuungsfehler für die ruhige Hand
(`50 × (1 − Ruhe) × (0,8 + Kraft × 0,35)`, dreieckig verteilt). Er wird größer,
je härter du wirfst — deshalb ist die hintere Reihe schwerer.

**Eine Untergrenze für die Mundhöhe**, damit die ehrliche Perspektive das Spiel
nicht heimlich schwerer macht: ein ferner Becher wird fast von der Seite
gesehen, sein gezeichnetes Loch ist ein Schlitz — aber der Ball fällt beinahe
senkrecht hinein, und was ihn fängt, ist der Kreis auf dem Tisch, nicht die
Sichel, die die Kamera zeigt. Ohne sie fiel die hintere Reihe von 46 % auf 36 %,
allein weil die Zeichnung ehrlich wurde. Gemessen greift sie ausschließlich
hinten: die Quote des vordersten Bechers bewegt sich kein Prozent, wenn man sie
von 6 auf 12 zieht.

**Der Bounce-Wurf ist jetzt wirklich ein Aufsetzer.** Der Ball kommt vor dem
Rack auf, behält 60 % seiner Aufwärtsgeschwindigkeit und springt flach in den
Becher. Wo er aufsetzen muss, ergibt sich aus dieser Zahl: der zweite Hüpfer
ist genau 60 % so lang wie der erste.

### Die Kraft kommt aus der Länge des Zuges, nicht aus dem Tempo

Das war der eigentliche Fehler, und er hat vier Runden gebraucht. Die Stärke
hing an der **Geschwindigkeit** der Hand — und die kann man nicht sehen. Nichts
auf dem Bildschirm sagt dir, wie schnell dein Daumen gerade war, korrigieren
kannst du sie mitten in der Bewegung auch nicht, und du lernst aus einem Wurf
pro Zug. Jede Zielhilfe obendrauf kuriert nur das Symptom.

Jetzt entscheidet die **Länge**: 2,1 Punkte Flug pro Punkt Fingerweg. Der Ball
liegt die ganze Zeit unter deinem Finger, du siehst also direkt, wie weit du
gezogen hast, und kannst nachjustieren, bevor du loslässt.

| Ziel | Entfernung | nötiger Zug |
|---|---|---|
| vorderster Becher | 525 pt | 114 pt |
| hintere Reihe | 650 pt | 141 pt |

**Das Tempo spielt keine Rolle mehr.** Damit fällt auch die alte Regel weg, dass
eine stehengebliebene Hand nicht wirft — du darfst ziehen, zielen, kurz
überlegen und dann loslassen. Vorher wurde genau das verworfen.

Im Browser gemessen, mit absichtlich schlampigem Zug (±7 %) und Zielen auf den
jeweils nächsten übrigen Becher: **10 von 16 Würfen sitzen.** Mit dem
Geschwindigkeitsmodell waren es 1 von 12, nach der ersten Zielhilfe 4 von 12.
Die Entfernung stimmt inzwischen fast auf den Punkt (Landung 324 pt bei einem
Loch auf 324 pt) — was noch danebengeht, geht seitlich daneben, und das ist der
Teil, den man sehen und zielen kann.

### Die Stärke wird geführt, die Richtung nicht

Wie hart man wischen muss, ist der schwerste Teil der Geste und der
uninteressanteste: nichts auf dem Bildschirm sagt dir, wie schnell dein Daumen
gerade war, und du bekommst eine Rückmeldung pro Zug. Die Richtung siehst du und
kannst sie zielen — die Stärke nicht.

Deshalb wird **nur die Entfernung** nachgezogen, entlang der Wurflinie, nie zur
Seite. Wie viel das ausmacht, gemessen über je 15 000 Würfe:

| Fehler in der Wischstärke | −35 % | −15 % | 0 % | +15 % | +25 % |
|---|---|---|---|---|---|
| volles Rack | 58 % | 82 % | 87 % | 80 % | 43 % |
| vorderster Becher weg | 0 % | 62 % | 69 % | 45 % | 41 % |
| nur hintere Reihe | 0 % | 40 % | 52 % | 38 % | 23 % |

Die Streuung der Hand geht zu 60 % in die Tiefe und voll zur Seite. Auch das
ist gemessen und nicht geschätzt: die Hilfe *nach* der Streuung anzuwenden
statt davor macht den vordersten Becher selbst bei 40 % Stärke zu 100 %, und
der Test, der sagt, dass eine ruhige Hand mehr treffen muss, hat das gefangen.

Das Fenster ist 95 pt breit, und das ist nicht geraten: im Browser gemessen
springt das nächste Ziel von 212 pt auf 273 pt, sobald der vorderste Becher
fällt. Mit dem alten 58-pt-Fenster bekam ein Wurf, der 114 pt zu kurz war,
überhaupt keine Hilfe — in einem echten Durchgang saß dadurch nur 1 von 12
Würfen. Danach 2 von 4.

Ein wilder Überwurf wird trotzdem nicht gerettet: gezogen wird nur auf einen
Becher, den der Wurf ohnehin fast erreicht hätte. Ein Test hält beides fest.

Die Zahlen dazu (`npm run test:throw`):

| Ziel | Entfernung | nötiger Zug |
|---|---|---|
| vorderster Becher | 525 pt | 114 pt |
| hintere Reihe | 650 pt | 141 pt |

Trefferquoten bei perfektem Schwung, je 8 000 simulierte Würfe:

| gezielt auf | wacklig | normal | ruhig |
|---|---|---|---|
| nächster Becher | 95 % | 99 % | 100 % |
| hintere Reihe | 57 % | 66 % | 78 % |

Dass der vorderste Becher praktisch sicher ist, ist Absicht — am echten Tisch
ist er das auch. Der Test verlangte früher, dass selbst er danebengehen kann;
diese Forderung ist bewusst auf die hintere Reihe umgezogen, weil sie an der
falschen Stelle stand und das ganze Spiel steif gemacht hat. Das Rack als
Ganzes muss weiterhin Risiko haben: hintere Reihe unter 85 %, aber über 20 %.

Das ist die entschärfte Fassung: die Trefferfläche ist großzügiger als das
gezeichnete Loch (0,52 statt 0,37 der Becherbreite — ein Ball, der die
Innenkante streift, fällt am echten Tisch auch hinein), und die Streuung ist
kleiner. Ursprünglich lagen die Werte bei 52 % und 27 %.

**Der Aufsetzer nimmt den Nachbarbecher.** Zwei Becher pro Aufsetzer ist eine
echte Beerpong-Regel, aber der zweite wurde vorher **zufällig** aus dem ganzen
Rack gezogen — ein Becher am anderen Ende verschwand, ohne dass der Ball in
seiner Nähe war. Das liest sich wie ein Fehler, nicht wie eine Regel. Jetzt ist
es der nächststehende.

**Wichtig beim Ändern dieser Zahlen:** Der Bechermund gilt auch für den Gegner.
Ihn zu vergrößern hat jeden Gegner still besser gemacht, als sein Profil
behauptet — der Test hat es gefangen, und die Tabelle in `throwPhysics.ts`
musste neu gemessen werden.

**Der Gegner wirft genauso.** Früher entschied bei ihm `Math.random() < accuracy`,
und der Ball rutschte flach zur Antwort — neben deiner Flugbahn sah das aus wie
zwei verschiedene Spiele. Jetzt fliegt er dieselbe Parabel, und sein Können ist
eine Streuung um den Becher, den er sich ausgesucht hat. Welche Streuung zu
welcher Trefferquote gehört, ist gemessen und nicht hergeleitet (Tabelle in
`lib/throwPhysics.ts`), weil ein weit danebengegangener Ball bei vollem Rack
trotzdem im Nachbarbecher landet.

**Auch der Gegner zielte auf die Bechermitte statt aufs Loch** — derselbe
Fehler, der beim eigenen Wurf schon behoben war, nur beim Gegner übersehen. Er
warf damit jeden Ball eine Mundhöhe zu tief, und nur die Streuung rettete ihn:
ein absolut ruhiger Gegner mit 15 pt Streuung traf **2,7 %**. Die alte Tabelle
war um diesen Fehler herum gemessen, deshalb kam sie nie unter etwa ein Viertel.
Richtig gezielt reicht sie von 98 % bis 18 %, und ein schwacher Gegner darf
endlich schwach sein. Gemessen wird auf *deinem* Rack, denn dorthin wirft er —
und das ist das nahe, breite. Ein Test prüft
für jeden Gegner der Liga, dass er ungefähr so oft trifft, wie sein Profil
behauptet.

**Nach einem Fehlwurf sagt die App, was schiefging** — „Zu kurz — mehr
Schwung", „Zu weit — sanfter wischen", „Daneben — Richtung stimmt nicht".
Bei einer Schwung-Geste ist „daneben" allein nutzlos: zu kurz und zu weit
brauchen entgegengesetzte Korrekturen.

### Es gibt keine Zielanzeige mehr

Der gestrichelte Bogen und der Ring am Landepunkt sind weg — deiner und der des
Gegners. Sie waren der Grund, warum sich die Geste zäh anfühlte, und das ist
gemessen, nicht vermutet: bei sechsfach gedrosselter CPU, iPhone-13-Größe,
echte Touch-Ereignisse.

| während des Wischens | mit Bogen | ohne |
|---|---|---|
| Bilder pro Sekunde | 41 | **60** |
| 95. Perzentil pro Bild | 50,1 ms | **16,8 ms** |
| längster Aussetzer | 133 ms | **16,8 ms** |

Der Grund: der Ball wird auf dem UI-Thread bewegt und kostet nichts. Der Bogen
war React — jedes Neuzeichnen rendert die Komponente neu und baut einen
SVG-Pfad aus 22 Punkten, bei jedem Bild der Wischbewegung.

**Zwei weitere Bremsen, die dabei auffielen** (Blockaden des Hauptthreads
während eines ganzen Wurfs, gleiche Drosselung):

- Die Geste wurde über `enabled={!flying}` aus dem React-State abgeschaltet.
  Das hieß: neu rendern und die `Pan`-Geste neu aufbauen **genau in dem
  Moment, in dem der Ball die Hand verlässt** — dort, wo man am genauesten
  hinsieht. Jetzt prüfen die Handler einen Shared Value, und nichts rendert neu.
- `Cup` und `TableSurface` waren nicht memoisiert. Jede Änderung an Punktestand,
  Hinweistext oder Zug baute alle zwanzig Becher-SVGs (je rund vierzig Elemente)
  und die komplette Tischfläche neu auf. Ein CPU-Profil eines einzelnen Wurfs
  hatte `createElement`, `jsx` und `createDOMProps` mit Abstand an der Spitze.
  `TableSurface` braucht dafür ein stabiles `racks`-Array — das liegt in
  `match.tsx` in einem `useMemo`.

Zusammen: **3011 ms blockiert → rund 1100 ms** (Median aus drei Läufen), der
längste Einzelaussetzer von 1129 ms auf 335 ms. Und das ist der Entwicklungs-Build
— in der veröffentlichten Fassung fallen Reacts Prüfungen im Entwicklungsmodus
weg, die im Profil deutlich sichtbar sind.

Eine Modellierungsentscheidung, ehrlich benannt: Der Wurf ist ein **Lob** mit
fester Flugzeit — die Wischbewegung bestimmt nur, wie kräftig der Ball nach
vorne geschoben wird, nicht den Abwurfwinkel. So macht man es auch am echten
Tisch. Lässt man den Winkel frei, wächst die Weite mit dem *Quadrat* der
Geschwindigkeit, und der ganze Tisch liegt dann in einem 35-%-Band von
Wischgeschwindigkeiten — auf einem Handy nicht mehr zielbar.

## Wenn etwas nicht läuft

| Problem | Lösung |
|---|---|
| QR-Code wird gescannt, aber nichts passiert | `npx expo start --tunnel` |
| „Project is incompatible with this version of Expo Go" | Expo Go im Store aktualisieren |
| Rote Fehlerseite über Paketversionen | `npx expo install --check` und die Vorschläge bestätigen |
| Metro hängt oder zeigt alte Stände | `npx expo start -c` (löscht den Cache) |
| `npm install` bricht ab | Node-Version prüfen, `node_modules` und `package-lock.json` löschen, neu installieren |
| Pages-Seite zeigt nur eine leere Seite | Unter Settings → Pages muss „Source" auf **GitHub Actions** stehen, nicht auf einen Branch |
| Web-App zeigt nach einem Update alte Inhalte | Einmal schließen und neu öffnen — der Service Worker holt sich die neue Version beim nächsten Start |
| iPhone: „Zum Home-Bildschirm" fehlt | Der Link muss in **Safari** geöffnet werden, in Chrome gibt es die Option nicht |
| Erkennung meldet ständig Treffer | Handy steht nicht still, oder das Licht flackert — „Neu ausrichten" drücken |
| Erkennung meldet gar nichts | Ringe sitzen daneben oder die Becher heben sich kaum vom Tisch ab — neu ausrichten, notfalls antippen |

## Was drin ist

- **Kamera-Tracker** — Live-Kamera mit Overlay, zwei Teams mit eigenen Namen,
  Treffer per Tap zählen, Undo für Verzähler, Re-Racks, House Rules
  (Re-Racks, Island, Redemption)
- **Turnier** — K.-o.-Baum für 3 bis 8 Teams; jede Partie lässt sich direkt im
  Tracker spielen, Sieger rücken automatisch weiter
- **Arcade** — geworfen wird mit einer Wischbewegung: der Schwung deiner Hand
  wird zur Geschwindigkeit des Balls, der im Bogen fliegt und in dem Becher
  landet, in dem er aufkommt. Zwei Racks, abwechselnde Züge, Kamera schwenkt
  pro Zug ans jeweilige Tischende
  - Offline gegen die KI (Einfach / Mittel / Schwer)
  - Pass & Play — zwei Spieler an einem Handy, mit Übergabe-Bildschirm
  - Division Rivals (Division 10 bis 1, Auf- und Abstieg)
  - Weekend League (10 Spiele, Belohnungsstufen Bronze bis Elite)
  - Bounce-Wurf (schwerer, nimmt zwei Cups) und Re-Rack im Spiel
- **Halbautomatische Becher-Erkennung** (Web-Version) — beide Racks einmal
  ausrichten, danach meldet die App jeden verschwundenen Becher, ordnet ihn dem
  richtigen Team zu und fragt nach
- **Aufgaben & Erfolge** — drei Tagesaufgaben, zehn Saison-Stufen und neun
  modusübergreifende Erfolge, alle mit Coin-Belohnung
- **Profil** — Statistiken über beide Modi, Sound-, Haptik- und Sprachschalter
- **Skins** — Bälle und Tische aus Coins freischalten
- **Ergebnis teilen** — Sieg als Bildkarte exportieren (auf dem Gerät, nicht im Web)
- **Deutsch und Englisch** — umschaltbar im Profil, greift sofort
- **Intro beim ersten Start** — drei Karten, danach nie wieder

## Bekannte Einschränkungen

- **Kein echtes Online-Multiplayer.** Gegner in Rivals und Weekend League werden
  lokal simuliert (`lib/competition.ts`, `generateOnlineOpponent`). Das ist die
  Stelle, an der später ein Server andockt.
- **Die Becher-Erkennung ist halbautomatisch und nur im Web.** Sie schlägt vor,
  entschieden wird per Knopfdruck — siehe eigenen Abschnitt unten. Vollautomatik
  und Online-Spiel im Kamera-Modus stehen als Pro-Funktion auf `app/pro.tsx`
  (erreichbar über das Globus-Symbol im Tracker und über das Profil) — kaufbar
  ist dort nichts, die Vormerkung bleibt lokal auf dem Gerät.
- **Keine echte Wurfphysik.** Treffer werden über eine Wahrscheinlichkeit
  entschieden und dann animiert; Fehlwürfe können am Becherrand abprallen.
- **Sounds sind synthetisch erzeugt** — `tools/gen_sounds.py` baut sie aus
  Rauschen, Sinus- und Dreieckstönen; kein aufgenommenes Sounddesign.
  Neu erzeugen mit `python3 tools/gen_sounds.py`.
- **Das Logo wird gezeichnet, nicht gemalt** — `tools/gen_icons.py` erzeugt
  alle App-, Android- und Web-Icons aus einer Beschreibung. Nach einer
  Änderung `python3 tools/gen_icons.py` laufen lassen; die Geometrie steckt
  parallel in `components/ui/LogoMark.tsx`, damit In-App-Logo und Icon
  identisch aussehen.
- `expo-av` ist veraltet und sollte vor einem Release auf `expo-audio` umziehen.
- **Kein Fortschritt in der Cloud.** Alles liegt in AsyncStorage auf dem Gerät;
  App löschen heißt Fortschritt weg.

## Projektstruktur

```
.github/workflows/       Web-Deploy und APK-Build (im Repo-Wurzelverzeichnis)
app/                     Routen (expo-router)
  +html.tsx              HTML-Gerüst der Web-Version (PWA-Einstellungen)
  (tabs)/camera/         Kamera-Tracker, Turnier
  (tabs)/arcade/         Hub, Offline, Pass & Play, Rivals, Weekend,
                         Match, Skins, Aufgaben
  onboarding.tsx         Intro beim ersten Start
  profile.tsx            Profil (Modal)
  pro.tsx                Pro-Vorschau (Modal)
components/              UI-Bausteine, Arcade-Grafik (Becher, Ball, Würfe)
lib/                     Store (zustand), Spiel-Logik, Layout, Sound, i18n
                         cupVision.ts = Becher-Erkennung, frameSampler* = Bildquelle
public/                  Wird 1:1 in die Web-Version kopiert (Manifest, Icons, sw.js)
theme/                   Farben, Schriften, Glow-Effekt
tools/                   Hilfsskripte (Logo/Icons und Sounds erzeugen)
```

## Sprache ergänzen oder Texte ändern

Alle sichtbaren Texte stehen in `lib/i18n.ts` in einer Tabelle:

```ts
'match.win': { de: 'SIEG!', en: 'WIN!' },
```

Zum Ändern einfach den Text austauschen. Für eine dritte Sprache
`lib/languages.ts` um das Kürzel erweitern und in jedem Eintrag eine Zeile
ergänzen — TypeScript meldet jede Lücke beim `npx tsc --noEmit`.
