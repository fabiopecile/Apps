# Design-Entwürfe

Drei Richtungen, wie die App aussehen könnte — als Bildschirm-Entwürfe, nicht
als Code. Nichts hiervon läuft in der App; es ist das Material, über das
entschieden wird, bevor jemand `theme/` anfasst.

Jede `.dc.html` ist ein Bildschirm. `canvas.json` legt fest, wo sie
nebeneinander liegen und was in den Notizzetteln steht.

| Datei | Was |
|---|---|
| `Jetzt.dc.html` | Screenshot des heutigen Arcade-Hubs, mit dem, was daran nicht funktioniert |
| `Main.dc.html`, `ATracker.dc.html` | **A · Aufgeräumt** — heutige DNA, aber mit Rangordnung |
| `BHub.dc.html`, `BTracker.dc.html` | **B · Roter Becher** — warm, Plakat, der Becher als Marke |
| `CHub.dc.html`, `CTracker.dc.html` | **C · Sportübertragung** — strenges Raster, Anzeigetafel, kein Leuchten |

Warum `Main` die Richtung A ist und nicht `AHub`: die Leinwand öffnet auf der
Datei mit diesem Namen, und A ist die risikoärmste der drei — sie sollte zuerst
im Blick sein. Wird eine andere Richtung gewählt, zieht die nach `Main`.

## Wieder zusammenbauen

Die zusammengesetzte Leinwand (`beerpong-design-richtungen.html`, rund 2,5 MB)
liegt bewusst **nicht** im Repository — sie ist aus den Dateien hier in einem
Befehl neu gebaut. Das geht nur in einer Sitzung, in der die `design`-Fähigkeit
zur Verfügung steht; dort ist der Befehl `seed-canvas.mjs` mit allen
`.dc.html`-Dateien, `jetzt.jpg` und `canvas.json`.

## Wenn eine Richtung gewählt ist

Dann wandert sie von hier in die App: `theme/colors.ts` und
`theme/typography.ts` bekommen die neuen Werte, die Schriften kommen als Paket
dazu (die Entwürfe ziehen sie von Google Fonts, was in der App nicht geht), und
die Bildschirme werden nachgezogen. Diese Dateien bleiben liegen — als
Nachweis, wogegen entschieden wurde, und weil die zwei nicht gewählten
Richtungen beim nächsten Mal wieder auf dem Tisch liegen.
