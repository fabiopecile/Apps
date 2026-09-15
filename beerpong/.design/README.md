# Design-Entwürfe

> **Entschieden: Richtung A („Aufgeräumt").** Sie ist in der App umgesetzt —
> siehe unten „Was daraus geworden ist". Die Dateien hier bleiben liegen, weil
> sie festhalten, wogegen entschieden wurde, und weil B und C beim nächsten Mal
> wieder auf dem Tisch liegen.

Drei Richtungen, wie die App aussehen könnte — als Bildschirm-Entwürfe, nicht
als Code. Nichts hiervon läuft in der App; es ist das Material, über das
entschieden wurde, bevor jemand `theme/` angefasst hat.

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

## Was daraus geworden ist

Richtung A steckt jetzt in der App. Die Schriften blieben, wie sie waren — A
behält bewusst die DNA von vorher. Geändert hat sich das System darunter:

| Datei | Was sie jetzt tut |
|---|---|
| `theme/glow.ts` | Das Leuchten ist rationiert: **höchstens ein `hero` pro Bildschirm**. Die alten Stufen wurden leiser gestellt statt umbenannt, damit die drei Dutzend vorhandenen Aufrufe sofort ruhig sind. |
| `theme/colors.ts` | Farbe hat eine Bedeutung: `you`, `rival`, `reward`, `locked`. Kein Bildschirm sucht sich mehr eine Farbe nach Stimmung aus. |
| `components/ui/GlowButton.tsx` | Knöpfe leuchten nicht mehr. Eine volle Neonfläche auf fast Schwarz ist laut genug. |
| `components/ui/GridBackground.tsx` | Das Drahtgitter ist weg, stattdessen eine Lampe über dem Tisch. |
| `components/ui/HeroCard.tsx` | Das eine laute Element — die Antwort auf „was mache ich jetzt". |
| `components/ui/ModeRow.tsx` | Alles andere: gleiche Höhe, gleiche Haarlinie, Akzent nur auf dem Symbol. |
| `components/ui/CupRack.tsx` | Drei Becher. Das Einzige auf dem Hub, das „Beerpong" sagt. |
| `tools/test_design.mjs` | Hält die Regeln fest, damit sie nicht in einem Jahr Karte für Karte zurückkriechen. |
