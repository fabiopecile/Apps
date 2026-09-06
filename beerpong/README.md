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

- **Kamera-Tracker** — Live-Kamera mit Overlay, Treffer per Tap zählen, Streak,
  House Rules (Re-Racks, Island, Redemption)
- **Arcade** — Wischen zum Werfen, zwei Racks, abwechselnde Züge, Kamera schwenkt
  pro Zug ans jeweilige Tischende
  - Offline gegen die KI (Einfach / Mittel / Schwer)
  - Division Rivals (Division 10 bis 1, Auf- und Abstieg)
  - Weekend League (10 Spiele, Belohnungsstufen Bronze bis Elite)
- **Profil** — Statistiken über beide Modi, Sound- und Haptik-Schalter
- **Skins** — Bälle und Tische aus Coins freischalten

## Bekannte Einschränkungen

- **Kein echtes Online-Multiplayer.** Gegner in Rivals und Weekend League werden
  lokal simuliert (`lib/competition.ts`, `generateOnlineOpponent`). Das ist die
  Stelle, an der später ein Server andockt.
- **Keine automatische Bechererkennung.** Der Kamera-Modus zählt per Tap.
- **Keine echte Wurfphysik.** Treffer werden über eine Wahrscheinlichkeit
  entschieden und dann animiert; Fehlwürfe können am Becherrand abprallen.
- **Sounds sind Platzhalter** — kurze synthetische Töne, kein Sounddesign.
- `expo-av` ist veraltet und sollte vor einem Release auf `expo-audio` umziehen.

## Projektstruktur

```
app/                     Routen (expo-router)
  (tabs)/camera/         Kamera-Tracker
  (tabs)/arcade/         Hub, Offline, Rivals, Weekend, Match, Skins
  profile.tsx            Profil (Modal)
components/              UI-Bausteine, Arcade-Grafik (Becher, Ball, Würfe)
lib/                     Store (zustand), Spiel-Logik, Layout, Sound
theme/                   Farben, Schriften, Glow-Effekt
```
