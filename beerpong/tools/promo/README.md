# Das Werbevideo

Ein 24-Sekunden-Video im Hochformat (1080×1920), in dem **jeder Screen der echte
Screen ist**. Kein Mockup, keine nachgebaute Oberfläche: im Bild läuft die App in
einem iframe, und jeder Tipp und jeder Wurf wird wirklich ausgeführt. Wenn sich
das Design ändert, ändert sich das Video mit — man muss es nur neu aufnehmen.

Ohne Ton.

## Neu aufnehmen

Zwei Server müssen laufen, in zwei Terminals:

```bash
npx expo start --web --port 8081          # die App
python3 -m http.server 8099               # in diesem Ordner: die Bühne
```

Dann, in einem dritten:

```bash
npm i playwright ffmpeg-static            # einmalig, hier im Ordner
node record.mjs raw                       # nimmt auf, schreibt raw/cuts.json
node cut.mjs raw beerpong-promo.mp4       # schneidet und rechnet raus
```

`record.mjs` meldet am Ende `problems:`. Steht dort etwas anderes als `none`,
ist eine Szene leer geblieben oder der Wurf ist nicht reingegangen — dann ist die
Aufnahme nichts wert und gehört wiederholt, nicht geschnitten.

`CHROMIUM=... ` und `FFMPEG=...` setzen, falls die Binaries woanders liegen.

## Wie es aufgebaut ist

`studio.html` ist die Bühne: der Raum, das Telefon (ein 400×844-Viewport, 1,62×
vergrößert, damit die App sich als Telefon layoutet und nicht als Tablet), die
Texte darüber und die Karten am Anfang und am Ende. Alles wird vom Skript
gesteuert, nichts läuft von selbst — die Zeiten im Video sind die Zeiten im
Skript und kein Rennen zwischen Animationen.

`record.mjs` fährt die App ab: Hub, ein Wurf, die Kamera, die Becher, die Weekend
League. Es schreibt zu jeder Szene ein Zeitfenster nach `raw/cuts.json`, und
`cut.mjs` schneidet danach — die Sekunden, in denen eine Seite lädt, landen gar
nicht erst im Film.

`calibrate.mjs` ist das Hilfsmittel für den Wurf. Man braucht es nur wieder, wenn
sich an der Wurfphysik oder am Maßstab der Bühne etwas ändert.

## Fünf Dinge, die je eine Aufnahme gekostet haben

Der Reihe nach aufgeschrieben, damit sie keine sechste kosten.

1. **Das iframe braucht `allow="camera"`.** Ohne das verweigert die Permissions
   Policy einem fremden iframe die Kamera, und die Tracker-Szene filmt ein
   schwarzes Rechteck.
2. **Szenen warten auf echten Inhalt**, nicht auf eine feste Millisekundenzahl.
   Der erste Schnitt zeigte ein leeres Telefon unter „Alles an einem Ort".
3. **Die Uhr wird verschoben, nicht angehalten.** Verschoben, weil die Weekend
   League an einem Mittwoch „Geschlossen bis Freitag" anzeigt — richtig, aber als
   Werbung schlecht. Nicht angehalten, weil die App an Stellen über die Uhr
   animiert und bei stehendem `Date.now()` mitten im Wurf hängen bleibt.
4. **Die Kamera wird erst sechs Sekunden nach dem Mounten gezeigt.** Das
   synthetische Testvideo schwenkt zwischen Sekunde 3,5 und 5,0 eine Hand über
   den Tisch — im Test wertvoll, im Film ein hautfarbener Ballon.
5. **Die Wurflänge ist gemessen, nicht geschätzt.** Die Reichweite ist
   `Zugweg × 4,6` Tischpunkte, der Ball liegt bei y=745, die Spitze des Racks bei
   220, und die Bühne vergrößert um 1,62 — macht rund 200 Bildschirmpixel. Der
   erste Versuch zog 38 % der Höhe, und der Ball flog über das Rack: „Zu weit".
   Der Ansatzpunkt muss außerdem **über dem Tisch** liegen; weiter unten sitzen
   die Bounce-Leiste und die Tab-Leiste, und ein Zug von dort ist gar kein Wurf.
