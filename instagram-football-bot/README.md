# Fußball-Liga Instagram-Poster (Prototyp)

Generiert automatisch moderne, Instagram-taugliche Grafiken (1080×1080,
Farbverläufe + Glow-Akzente) für Spielergebnisse, News und Transfers eines
Fußball-Liga-Kanals, inklusive passender Caption-Texte. **Der eigentliche
Upload zu Instagram ist in diesem Prototyp noch nicht enthalten** – dazu
mehr unten unter "Nächste Schritte".

## Was der Prototyp tut

- Liest Match-, News- und Transfer-Daten (aktuell **Beispieldaten** in `sample_data.py`)
- Zeichnet daraus mit Pillow fünf Grafik-Typen, jede mit eigenem Farbthema (`theme.py`):
  - **Ergebnis-Karte**: Teams, Endstand, Spieltag, Datum/Ort
  - **Status-Karte**: für **abgesagte** oder **abgebrochene** Spiele (eigenes Warn-Design,
    inkl. Grund und ggf. Stand bei Abbruch)
  - **Tabellen-Karte**: Zwischenstand nach jedem abgeschlossenen Spieltag
  - **News-Karte**: Kategorie, Headline, Kurztext
  - **Transfer-Karte**: Spieler, Position, abgebender/aufnehmender Verein, Ablöse
- Erzeugt zu jeder Grafik eine passende Instagram-Caption (`.txt`) mit Hashtags
- Schreibt alles nach `output/`

### Rundenlogik (Spieltag → Tabelle)

`main.py` gruppiert alle Spiele nach Spieltag. Ein Spieltag gilt als
**abgeschlossen**, sobald keines seiner Spiele mehr offen (`SCHEDULED`) ist –
`standings.matchday_is_decided()` prüft das. Abgesagte (`CANCELLED`) und
abgebrochene (`ABANDONED`) Spiele zählen dabei bewusst **als entschieden**:
für sie wird trotzdem gepostet (Status-Karte statt Ergebnis-Karte), und
danach folgt wie gewohnt die Tabellen-Grafik für den ganzen Spieltag.

In die Tabelle (`standings.compute_standings()`) fließen nur tatsächlich
gewertete (`FINISHED`) Spiele ein – ein abgebrochenes oder abgesagtes Spiel
taucht so lange nicht in der Tabelle auf, bis ein echtes Ergebnis
nachgetragen wird (z. B. nach Entscheidung durch den Staffelleiter oder nach
dem Nachholtermin).

## Ausführen

```bash
pip install -r requirements.txt
PYTHONPATH=src python3 -m football_poster.main
```

Ergebnisse landen in `output/` (z. B. `match_1_FAL_ADL.png` +
`match_1_FAL_ADL.txt`).

## Projektstruktur

```
src/football_poster/
  models.py        Datenmodelle (Team, Match, MatchStatus, TeamStanding, NewsItem, Transfer)
  standings.py      Tabellenberechnung + Spieltag-abgeschlossen-Erkennung
  sample_data.py    Beispieldaten – hier später durch echte API ersetzen
  theme.py          Farbpaletten je Karten-Typ
  canvas.py         Zeichen-Hilfsfunktionen (Verlauf, Glow, Pills)
  generator.py      Zeichnet die PNG-Grafiken
  captions.py       Erzeugt die Instagram-Bildtexte
  main.py           CLI, das alles verbindet (inkl. Rundenlogik)
```

## Nächste Schritte (noch nicht umgesetzt)

1. **Echte Datenquelle statt Mock-Daten**
   Eine Sport-API anbinden (z. B. football-data.org, API-Football) und
   `get_matches()` / `get_news()` in `sample_data.py` durch echte Abfragen
   ersetzen. Rest der App bleibt unverändert, da nur diese Funktionen
   ausgetauscht werden müssen. Wichtig: den Spielstatus der API (z. B.
   "postponed", "abandoned", "awarded") sauber auf `MatchStatus` mappen,
   damit Absagen/Abbrüche weiter zuverlässig erkannt werden.
   ⚠️ Nutzungsrechte prüfen: offizielle Liga-/Verbandsdaten, Logos und
   Vereinswappen sind oft markenrechtlich geschützt.

2. **Echte Team-Logos statt Farbkreis-Platzhalter**
   In `generator.py` `_team_badge()` durch echtes Logo-Bild ersetzen
   (`Image.open(...).paste(...)`), sofern Nutzungsrecht vorhanden ist.

3. **Automatischer Upload zu Instagram**
   Über die **Instagram Graph API** (Meta for Developers):
   - Instagram-Konto muss ein *Business*- oder *Creator*-Konto sein und mit
     einer Facebook-Seite verknüpft sein
   - Meta-App + Zugriffstoken einrichten
   - Bild muss öffentlich erreichbar sein (z. B. Upload zu S3/Cloud-Storage),
     dann per Graph API (`/media` + `/media_publish`) veröffentlichen

4. **Zeitsteuerung**
   Das Skript per Cron-Job (z. B. täglich nach Abpfiff) automatisch laufen
   lassen, das neue Ergebnisse/News abruft und postet.
