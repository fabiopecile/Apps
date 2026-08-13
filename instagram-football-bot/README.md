# Fußball-Liga Instagram-Poster (Prototyp)

Generiert automatisch moderne, Instagram-taugliche Grafiken (1080×1080,
Farbverläufe + Glow-Akzente) für Spielergebnisse, News und Transfers eines
Fußball-Liga-Kanals, inklusive passender Caption-Texte. **Der eigentliche
Upload zu Instagram ist in diesem Prototyp noch nicht enthalten** – dazu
mehr unten unter "Nächste Schritte".

## Was der Prototyp tut

- Liest Match-, News- und Transfer-Daten (aktuell **Beispieldaten** in `sample_data.py`)
- Zeichnet daraus mit Pillow drei Grafik-Typen, jede mit eigenem Farbthema (`theme.py`):
  - **Ergebnis-Karte**: Teams, Endstand, Spieltag, Datum/Ort
  - **News-Karte**: Kategorie, Headline, Kurztext
  - **Transfer-Karte**: Spieler, Position, abgebender/aufnehmender Verein, Ablöse
- Erzeugt zu jeder Grafik eine passende Instagram-Caption (`.txt`) mit Hashtags
- Schreibt alles nach `output/`

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
  models.py        Datenmodelle (Team, Match, NewsItem, Transfer)
  sample_data.py    Beispieldaten – hier später durch echte API ersetzen
  theme.py          Farbpaletten je Karten-Typ
  canvas.py         Zeichen-Hilfsfunktionen (Verlauf, Glow, Pills)
  generator.py      Zeichnet die PNG-Grafiken
  captions.py       Erzeugt die Instagram-Bildtexte
  main.py           CLI, das alles verbindet
```

## Nächste Schritte (noch nicht umgesetzt)

1. **Echte Datenquelle statt Mock-Daten**
   Eine Sport-API anbinden (z. B. football-data.org, API-Football) und
   `get_matches()` / `get_news()` in `sample_data.py` durch echte Abfragen
   ersetzen. Rest der App bleibt unverändert, da nur diese Funktionen
   ausgetauscht werden müssen.
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
