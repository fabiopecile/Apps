# Werbespot – Vorlage

Ein 30-Sekunden-Spot im Hochformat (1080×1920), gebaut als Webseite statt als
Videodatei. Der Grund: eine Webseite lässt sich neu abspielen, wenn sich die
App ändert – ein exportiertes Video müsstest du jedes Mal neu schneiden.

## Der schnelle Weg (iPad, iPhone)

1. `promo.html` im Browser öffnen
2. **Bildschirmaufnahme starten** (Kontrollzentrum)
3. Auf **ABSPIELEN** tippen
4. Nach dem Endbild die Aufnahme stoppen
5. In CapCut öffnen, Sprecherstimme aus `script.md` darüberlegen, exportieren

Die Startseite ist bewusst ein eigener Vorhang: so beginnst du die Aufnahme,
bevor sich etwas bewegt, und es ist kein Finger und kein Menü im Bild.

`promo.html?tc=1` blendet oben links eine laufende Sekundenanzeige ein – hilft
beim Schneiden der Stimme, gehört aber nicht in die finale Aufnahme.

## Zweite Fassung: die echten App-Bildschirme

`promo-app.html` erzählt dieselben 30 Sekunden mit denselben Sprechertexten,
zeigt aber die App selbst in einem Telefon statt gezeichneter Symbole.

Die Bildschirmfotos in `screens/` sind **echte Aufnahmen der App**, nicht
nachgebaut: `capture-screens.js` startet den Web-Build, fängt jeden
Supabase-Aufruf ab und beantwortet ihn mit einem gestellten Spieltag. Die
Bildschirme sind also die eigenen Komponenten der App in ihren eigenen
Maßen - nur die Daten sind gestellt.

```
npx expo export --platform web     # im Wurzelverzeichnis
node capture-screens.js            # -> screens/*.png
node build-app-spot.js             # -> promo-app.html
```

Eigene Bildschirmfotos vom Handy funktionieren genauso: gleiche Dateinamen
nach `screens/` legen, `build-app-spot.js` laufen lassen. Für den Feed lohnt
sich das besonders - die beiden Bilder dort sind derzeit gezeichnete
Platzhalter, keine echten Stadionfotos.

## Einzelbilder statt Aufnahme

```
CHROMIUM_PATH=/pfad/zu/chrome node render.js        # 8 Bilder an den Schlüsselstellen
CHROMIUM_PATH=/pfad/zu/chrome node render.js --all  # jedes Bild, 15/s (~450 Dateien)
```

Braucht `npm install playwright`. Die Bilder landen in `frames/`.

`--all` liefert eine Bildsequenz, die jeder Videoeditor als Video importiert.
Das ist der Weg, wenn die Bildschirmaufnahme mal ruckelt: gerendert wird über
`window.__seek(ms)`, also bildgenau – da kann nichts wackeln.

## Wie es aufgebaut ist

Alles läuft auf **einer** Zeitachse. Jede Animation ist eine CSS-Animation, die
beim Laden der Seite startet und ihre eigene Verzögerung (`--t`) mitbringt.
Daraus folgt zweierlei:

- `window.__seek(ms)` kann jede beliebige Stelle exakt anspringen
- Die Sekundenangaben in `script.md` sind dieselben Zahlen wie im HTML – Bild
  und Stimme können gar nicht auseinanderlaufen

Die Schriften (Anton, Barlow) sind als Base64 eingebettet. Eine verlinkte
Webschrift ist einen Netzwerkaussetzer davon entfernt, den ganzen Film still
in eine Ersatzschrift zu kippen – und ein Bild in der falschen Schrift sieht
immer noch „okay" aus. Das ist die gefährliche Sorte von falsch.

## Etwas ändern

| Was | Wo |
|-----|-----|
| Text einer Szene | Im `<section class="scene">`, direkt im HTML |
| Wann eine Szene läuft | `--t` (Start) und `--dur` (Dauer) am `<section>` |
| Farben | Die Variablen ganz oben – dieselben wie in `constants/theme.ts` |
| Gesamtlänge | `DURATION` im Skript **und** die Dauer von `sweep`/`.endcard` |

Nach jeder Änderung `node render.js` laufen lassen und die Bilder ansehen. Die
Szenen liegen übereinander und sind nur über die Zeitachse getrennt – ein
falscher `--t`-Wert lässt zwei Szenen gleichzeitig laufen, und das sieht man
erst im Bild.
