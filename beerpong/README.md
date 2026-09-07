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

## Wenn etwas nicht läuft

| Problem | Lösung |
|---|---|
| QR-Code wird gescannt, aber nichts passiert | `npx expo start --tunnel` |
| „Project is incompatible with this version of Expo Go" | Expo Go im Store aktualisieren |
| Rote Fehlerseite über Paketversionen | `npx expo install --check` und die Vorschläge bestätigen |
| Metro hängt oder zeigt alte Stände | `npx expo start -c` (löscht den Cache) |
| `npm install` bricht ab | Node-Version prüfen, `node_modules` und `package-lock.json` löschen, neu installieren |

## Was drin ist

- **Kamera-Tracker** — Live-Kamera mit Overlay, zwei Teams mit eigenen Namen,
  Treffer per Tap zählen, Undo für Verzähler, Re-Racks, House Rules
  (Re-Racks, Island, Redemption)
- **Turnier** — K.-o.-Baum für 3 bis 8 Teams; jede Partie lässt sich direkt im
  Tracker spielen, Sieger rücken automatisch weiter
- **Arcade** — Wischen zum Werfen, zwei Racks, abwechselnde Züge, Kamera schwenkt
  pro Zug ans jeweilige Tischende
  - Offline gegen die KI (Einfach / Mittel / Schwer)
  - Pass & Play — zwei Spieler an einem Handy, mit Übergabe-Bildschirm
  - Division Rivals (Division 10 bis 1, Auf- und Abstieg)
  - Weekend League (10 Spiele, Belohnungsstufen Bronze bis Elite)
  - Bounce-Wurf (schwerer, nimmt zwei Cups) und Re-Rack im Spiel
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
- **Keine automatische Bechererkennung und kein Online-Spiel im Kamera-Modus.**
  Der Kamera-Modus zählt per Tap und läuft nur an einem Tisch. Beides steht als
  Pro-Funktion auf `app/pro.tsx` beschrieben (erreichbar über das Globus-Symbol
  im Tracker und über das Profil) — kaufbar ist dort nichts, die Vormerkung
  bleibt lokal auf dem Gerät.
- **Keine echte Wurfphysik.** Treffer werden über eine Wahrscheinlichkeit
  entschieden und dann animiert; Fehlwürfe können am Becherrand abprallen.
- **Sounds sind synthetisch erzeugt** — `tools/gen_sounds.py` baut sie aus
  Rauschen, Sinus- und Dreieckstönen; kein aufgenommenes Sounddesign.
  Neu erzeugen mit `python3 tools/gen_sounds.py`.
- `expo-av` ist veraltet und sollte vor einem Release auf `expo-audio` umziehen.
- **Kein Fortschritt in der Cloud.** Alles liegt in AsyncStorage auf dem Gerät;
  App löschen heißt Fortschritt weg.

## Projektstruktur

```
app/                     Routen (expo-router)
  (tabs)/camera/         Kamera-Tracker, Turnier
  (tabs)/arcade/         Hub, Offline, Pass & Play, Rivals, Weekend,
                         Match, Skins, Aufgaben
  onboarding.tsx         Intro beim ersten Start
  profile.tsx            Profil (Modal)
  pro.tsx                Pro-Vorschau (Modal)
components/              UI-Bausteine, Arcade-Grafik (Becher, Ball, Würfe)
lib/                     Store (zustand), Spiel-Logik, Layout, Sound, i18n
theme/                   Farben, Schriften, Glow-Effekt
```

## Sprache ergänzen oder Texte ändern

Alle sichtbaren Texte stehen in `lib/i18n.ts` in einer Tabelle:

```ts
'match.win': { de: 'SIEG!', en: 'WIN!' },
```

Zum Ändern einfach den Text austauschen. Für eine dritte Sprache
`lib/languages.ts` um das Kürzel erweitern und in jedem Eintrag eine Zeile
ergänzen — TypeScript meldet jede Lücke beim `npx tsc --noEmit`.
