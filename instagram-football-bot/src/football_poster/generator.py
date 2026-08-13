"""Generiert Instagram-taugliche Quadrat-Grafiken (1080x1080) aus Match- und
News-Daten mit Pillow. Kein Netzwerkzugriff, keine externen Assets noetig -
Teamfarben und Kuerzel werden als Platzhalter fuer echte Logos gezeichnet.
"""

import textwrap
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from .models import Match, NewsItem

SIZE = 1080
FONT_DIR = Path("/usr/share/fonts/truetype/dejavu")

BG_DARK = "#101418"
BG_PANEL = "#181F26"
TEXT_MAIN = "#F5F6F7"
TEXT_MUTED = "#8B96A3"
ACCENT = "#3DDC97"


def _font(name: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONT_DIR / name), size)


def _center_text(draw: ImageDraw.ImageDraw, cx: int, y: int, text: str,
                  font: ImageFont.FreeTypeFont, fill: str) -> None:
    bbox = draw.textbbox((0, 0), text, font=font)
    w = bbox[2] - bbox[0]
    draw.text((cx - w / 2, y), text, font=font, fill=fill)


def _team_badge(draw: ImageDraw.ImageDraw, center: tuple[int, int],
                 radius: int, short_name: str, color: str) -> None:
    cx, cy = center
    draw.ellipse(
        (cx - radius, cy - radius, cx + radius, cy + radius),
        fill=color,
        outline=TEXT_MAIN,
        width=4,
    )
    font = _font("DejaVuSans-Bold.ttf", int(radius * 0.7))
    bbox = draw.textbbox((0, 0), short_name, font=font)
    w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text((cx - w / 2, cy - h / 2 - bbox[1]), short_name, font=font, fill=TEXT_MAIN)


def render_match_card(match: Match, out_path: Path) -> Path:
    img = Image.new("RGB", (SIZE, SIZE), BG_DARK)
    draw = ImageDraw.Draw(img)

    draw.rectangle((0, 0, SIZE, 140), fill=BG_PANEL)
    league_font = _font("DejaVuSans-Bold.ttf", 44)
    sub_font = _font("DejaVuSans.ttf", 30)
    _center_text(draw, SIZE // 2, 30, match.league, league_font, ACCENT)
    _center_text(draw, SIZE // 2, 90, f"Spieltag {match.matchday}", sub_font, TEXT_MUTED)

    score_font = _font("DejaVuSans-Bold.ttf", 130)
    score_text = f"{match.home_score} : {match.away_score}"
    _center_text(draw, SIZE // 2, 200, score_text, score_font, TEXT_MAIN)

    badge_y = 590
    radius = 130
    _team_badge(draw, (300, badge_y), radius, match.home.short_name, match.home.color)
    _team_badge(draw, (SIZE - 300, badge_y), radius, match.away.short_name, match.away.color)

    name_font = _font("DejaVuSans-Bold.ttf", 36)
    _center_text(draw, 300, badge_y + radius + 30, match.home.name, name_font, TEXT_MAIN)
    _center_text(draw, SIZE - 300, badge_y + radius + 30, match.away.name, name_font, TEXT_MAIN)

    footer_font = _font("DejaVuSans.ttf", 28)
    footer = match.kickoff.strftime("%d.%m.%Y")
    if match.venue:
        footer += f"  |  {match.venue}"
    _center_text(draw, SIZE // 2, SIZE - 90, footer, footer_font, TEXT_MUTED)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    img.save(out_path, "PNG")
    return out_path


def render_news_card(item: NewsItem, out_path: Path) -> Path:
    img = Image.new("RGB", (SIZE, SIZE), BG_DARK)
    draw = ImageDraw.Draw(img)

    draw.rectangle((0, 0, SIZE, 260), fill=ACCENT)
    tag_font = _font("DejaVuSans-Bold.ttf", 32)
    league_font = _font("DejaVuSans-Bold.ttf", 46)
    draw.text((60, 40), item.category.upper(), font=tag_font, fill=BG_DARK)
    draw.text((60, 100), item.league, font=league_font, fill=BG_DARK)

    headline_font = _font("DejaVuSans-Bold.ttf", 64)
    wrapped_headline = textwrap.wrap(item.headline, width=18)
    y = 340
    for line in wrapped_headline:
        draw.text((60, y), line, font=headline_font, fill=TEXT_MAIN)
        y += 76

    body_font = _font("DejaVuSans.ttf", 34)
    wrapped_body = textwrap.wrap(item.body, width=42)
    y += 30
    for line in wrapped_body:
        draw.text((60, y), line, font=body_font, fill=TEXT_MUTED)
        y += 46

    footer_font = _font("DejaVuSans.ttf", 26)
    draw.text(
        (60, SIZE - 70),
        item.published.strftime("%d.%m.%Y"),
        font=footer_font,
        fill=TEXT_MUTED,
    )

    out_path.parent.mkdir(parents=True, exist_ok=True)
    img.save(out_path, "PNG")
    return out_path
