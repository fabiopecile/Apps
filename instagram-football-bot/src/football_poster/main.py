"""CLI-Einstiegspunkt des Prototyps.

Liest Beispieldaten und generiert Grafik + Caption fuer:
- jedes Match eines abgeschlossenen Spieltags (Ergebnis- oder, bei Absage/
  Abbruch, Status-Karte)
- danach einmal die Tabelle nach diesem Spieltag
- alle News und Transfers

Ein Spieltag gilt als abgeschlossen, sobald keines seiner Spiele mehr den
Status SCHEDULED hat - abgesagte und abgebrochene Spiele zaehlen dabei
bereits als entschieden, damit die Runde trotzdem gepostet wird.

Aufruf:
    python -m football_poster.main
"""

from collections import defaultdict
from pathlib import Path

from .captions import (
    caption_for_match,
    caption_for_news,
    caption_for_status,
    caption_for_table,
    caption_for_transfer,
)
from .generator import (
    render_match_card,
    render_news_card,
    render_status_card,
    render_table_card,
    render_transfer_card,
)
from .models import MatchStatus
from .sample_data import get_matches, get_news, get_transfers
from .standings import compute_standings, matchday_is_decided

OUTPUT_DIR = Path(__file__).resolve().parents[2] / "output"


def _run_matchdays() -> None:
    matches = get_matches()
    by_matchday = defaultdict(list)
    for match in matches:
        by_matchday[match.matchday].append(match)

    for day in sorted(by_matchday):
        day_matches = by_matchday[day]
        if not matchday_is_decided(day_matches):
            print(f"[Spieltag {day}] noch nicht abgeschlossen - wird uebersprungen")
            continue

        for match in day_matches:
            slug = f"{day}_{match.home.short_name}_{match.away.short_name}"
            if match.status == MatchStatus.FINISHED:
                img_path = OUTPUT_DIR / f"match_{slug}.png"
                render_match_card(match, img_path)
                caption_path = img_path.with_suffix(".txt")
                caption_path.write_text(caption_for_match(match), encoding="utf-8")
                print(f"[Match]  {img_path.name}  +  {caption_path.name}")
            else:
                img_path = OUTPUT_DIR / f"status_{slug}.png"
                render_status_card(match, img_path)
                caption_path = img_path.with_suffix(".txt")
                caption_path.write_text(caption_for_status(match), encoding="utf-8")
                print(f"[Status] {img_path.name}  +  {caption_path.name}")

        matches_so_far = [m for m in matches if m.matchday <= day]
        standings = compute_standings(matches_so_far)
        league = day_matches[0].league
        img_path = OUTPUT_DIR / f"table_after_matchday_{day}.png"
        render_table_card(standings, league, day, img_path)
        caption_path = img_path.with_suffix(".txt")
        caption_path.write_text(caption_for_table(standings, league, day), encoding="utf-8")
        print(f"[Tabelle] {img_path.name}  +  {caption_path.name}")


def run() -> None:
    OUTPUT_DIR.mkdir(exist_ok=True)

    _run_matchdays()

    for i, item in enumerate(get_news(), start=1):
        slug = item.headline.lower().replace(" ", "_")[:30]
        img_path = OUTPUT_DIR / f"news_{i}_{slug}.png"
        render_news_card(item, img_path)
        caption_path = img_path.with_suffix(".txt")
        caption_path.write_text(caption_for_news(item), encoding="utf-8")
        print(f"[News]   {img_path.name}  +  {caption_path.name}")

    for i, transfer in enumerate(get_transfers(), start=1):
        img_path = OUTPUT_DIR / f"transfer_{i}_{transfer.from_club.short_name}_{transfer.to_club.short_name}.png"
        render_transfer_card(transfer, img_path)
        caption_path = img_path.with_suffix(".txt")
        caption_path.write_text(caption_for_transfer(transfer), encoding="utf-8")
        print(f"[Transfer] {img_path.name}  +  {caption_path.name}")

    print(f"\nFertig. Ergebnisse liegen in: {OUTPUT_DIR}")


if __name__ == "__main__":
    run()
