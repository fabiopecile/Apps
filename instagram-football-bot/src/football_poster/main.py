"""CLI-Einstiegspunkt des Prototyps.

Liest Beispieldaten, generiert fuer jedes Match- und News-Item eine
1080x1080-PNG-Grafik plus eine passende Caption-Textdatei im output/-Ordner.

Aufruf:
    python -m football_poster.main
"""

from pathlib import Path

from .captions import caption_for_match, caption_for_news, caption_for_transfer
from .generator import render_match_card, render_news_card, render_transfer_card
from .sample_data import get_matches, get_news, get_transfers

OUTPUT_DIR = Path(__file__).resolve().parents[2] / "output"


def run() -> None:
    OUTPUT_DIR.mkdir(exist_ok=True)

    for i, match in enumerate(get_matches(), start=1):
        img_path = OUTPUT_DIR / f"match_{i}_{match.home.short_name}_{match.away.short_name}.png"
        render_match_card(match, img_path)
        caption_path = img_path.with_suffix(".txt")
        caption_path.write_text(caption_for_match(match), encoding="utf-8")
        print(f"[Match]  {img_path.name}  +  {caption_path.name}")

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
