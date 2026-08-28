# Party Minigames

Eine Sammlung von Handy-Partyspielen zum gemeinsamen Spielen mit Freunden – ein Gerät wird herumgereicht.

## Spiele

- **Impostor** – Alle außer einer Person bekommen ein geheimes Wort. Wer errät, wer den Impostor spielt?
- **Werwolf** – Klassisches Rollenspiel mit Werwölfen, Dorfbewohnern, Seherin, Hexe & Jäger.
- **Zeitgefühl** – Schätze, wann eine bestimmte Anzahl Sekunden vergangen ist – ganz ohne sichtbare Uhr.
- **Blackjack** – Kartenspiel gegen den Dealer, bis 4 Spieler abwechselnd.
- **Wahrheit oder Pflicht** – Zufällige Fragen und Aufgaben in mehreren Kategorien.
- **Reaktionstest** – Wer hat die schnellsten Reflexe?

## Weekend League (Online-Modus)

Zeitgefühl, Reaktionstest und Blackjack haben zusätzlich einen Online-Modus mit echten Accounts:
von Freitag bis Sonntag hat jeder Account 20 Spiele pro Minigame, um möglichst viele Siege zu
holen. Zeitgefühl/Reaktionstest werden asynchron gegen das Ergebnis eines anderen Spielers
desselben Wochenendes gewertet (oder gegen einen Bot, falls gerade niemand sonst gespielt hat);
bei Blackjack ist wie gewohnt der Dealer der Gegner, aber die Siege zählen für die Liga-Rangliste.
Je mehr Siege, desto höher die Liga (Bronze → Silber → Gold → Platin → Diamant → Elite) mit
jeweils eigener kosmetischer Belohnung.

Der Online-Modus braucht ein kostenloses [Supabase](https://supabase.com)-Projekt als Backend:

1. Projekt auf supabase.com anlegen.
2. `supabase/schema.sql` im SQL-Editor des Projekts ausführen (Tabellen, Policies, Matchmaking-Funktion).
3. `.env.example` nach `.env` kopieren und `VITE_SUPABASE_URL` sowie `VITE_SUPABASE_ANON_KEY`
   aus den Projekteinstellungen (Project Settings → API) eintragen.

Ohne diese Konfiguration bleiben alle lokalen Pass-and-Play-Spiele normal nutzbar; die App zeigt
im Online-Bereich nur einen Hinweis zur Einrichtung an.

## Entwicklung

```bash
npm install
npm run dev
```

```bash
npm run build
```
