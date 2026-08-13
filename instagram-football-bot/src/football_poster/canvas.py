"""Wiederverwendbare Zeichen-Hilfsfunktionen fuer moderne Social-Grafiken:
Verlaufshintergruende, weiche Glow-Flecken, Pill-Badges. Von generator.py
fuer alle drei Kartentypen (Match, News, Transfer) genutzt.
"""

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

FONT_DIR = Path("/usr/share/fonts/truetype/dejavu")


def font(name: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONT_DIR / name), size)


def hex_to_rgb(color: str) -> tuple[int, int, int]:
    color = color.lstrip("#")
    return tuple(int(color[i:i + 2], 16) for i in (0, 2, 4))


def diagonal_gradient(size: tuple[int, int], color_a: str, color_b: str) -> Image.Image:
    """Weicher Verlauf von oben-links nach unten-rechts."""
    w, h = size
    a = np.array(hex_to_rgb(color_a), dtype=np.float32)
    b = np.array(hex_to_rgb(color_b), dtype=np.float32)
    y, x = np.mgrid[0:h, 0:w]
    t = ((x + y) / (w + h - 2)).astype(np.float32)[..., None]
    grad = a * (1 - t) + b * t
    return Image.fromarray(grad.astype(np.uint8), mode="RGB")


def add_glow(base: Image.Image, center: tuple[int, int], radius: int,
             color: str, alpha: int = 90, blur: int = 110) -> Image.Image:
    """Legt einen weichen, verwaschenen Farbfleck (RGBA, geblurrt) auf das Bild.
    Gibt das (weiterhin RGBA) Ergebnisbild zurueck.
    """
    if base.mode != "RGBA":
        base = base.convert("RGBA")
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    cx, cy = center
    r, g, bl = hex_to_rgb(color)
    draw.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), fill=(r, g, bl, alpha))
    layer = layer.filter(ImageFilter.GaussianBlur(blur))
    base.alpha_composite(layer)
    return base


def shadow_ellipse(base: Image.Image, box: tuple[int, int, int, int],
                    alpha: int = 110, blur: int = 30,
                    offset: tuple[int, int] = (0, 18)) -> Image.Image:
    """Weicher Schlagschatten hinter einem Kreis/Badge."""
    if base.mode != "RGBA":
        base = base.convert("RGBA")
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    x0, y0, x1, y1 = box
    dx, dy = offset
    draw.ellipse((x0 + dx, y0 + dy, x1 + dx, y1 + dy), fill=(0, 0, 0, alpha))
    layer = layer.filter(ImageFilter.GaussianBlur(blur))
    base.alpha_composite(layer)
    return base


def center_text(draw: ImageDraw.ImageDraw, cx: float, y: float, text: str,
                 fnt: ImageFont.FreeTypeFont, fill) -> None:
    bbox = draw.textbbox((0, 0), text, font=fnt)
    w = bbox[2] - bbox[0]
    draw.text((cx - w / 2, y), text, font=fnt, fill=fill)


def text_size(draw: ImageDraw.ImageDraw, text: str,
              fnt: ImageFont.FreeTypeFont) -> tuple[int, int]:
    bbox = draw.textbbox((0, 0), text, font=fnt)
    return bbox[2] - bbox[0], bbox[3] - bbox[1]


def pill(draw: ImageDraw.ImageDraw, cx: float, y: float, text: str,
         fnt: ImageFont.FreeTypeFont, fg, bg, pad_x: int = 26, pad_y: int = 14) -> int:
    """Zeichnet ein zentriertes, abgerundetes Pill-Label. Gibt die Hoehe zurueck."""
    w, h = text_size(draw, text, fnt)
    box = (cx - w / 2 - pad_x, y, cx + w / 2 + pad_x, y + h + 2 * pad_y)
    draw.rounded_rectangle(box, radius=(h + 2 * pad_y) / 2, fill=bg)
    draw.text((cx - w / 2, y + pad_y - 2), text, font=fnt, fill=fg)
    return h + 2 * pad_y
