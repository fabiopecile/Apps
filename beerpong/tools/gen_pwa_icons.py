"""Derives the web/PWA icon set from the app icon.

Home-screen icons are cropped by the OS in ways the source icon is not drawn
for, so two shapes are produced: a plain one that keeps the full artwork, and
a maskable one that pads it into the safe zone Android's shape masks respect.
"""
import os

from PIL import Image

SRC = "assets/images/icon.png"
OUT = "public/icons"
BACKGROUND = (10, 10, 10, 255)  # colors.background


def flatten(image):
    """Home-screen icons must be opaque — transparency shows as white on iOS."""
    base = Image.new("RGBA", image.size, BACKGROUND)
    base.alpha_composite(image)
    return base


def plain(source, size):
    return flatten(source.resize((size, size), Image.LANCZOS))


def maskable(source, size):
    """Android may crop to a circle: keep the art inside the middle ~80%."""
    inner = int(size * 0.78)
    canvas = Image.new("RGBA", (size, size), BACKGROUND)
    art = source.resize((inner, inner), Image.LANCZOS)
    offset = (size - inner) // 2
    canvas.alpha_composite(art, (offset, offset))
    return canvas


def main():
    os.makedirs(OUT, exist_ok=True)
    source = Image.open(SRC).convert("RGBA")

    targets = [
        ("icon-192.png", plain(source, 192)),
        ("icon-512.png", plain(source, 512)),
        ("icon-maskable-192.png", maskable(source, 192)),
        ("icon-maskable-512.png", maskable(source, 512)),
        # iOS ignores the manifest icons and uses this one.
        ("apple-touch-icon.png", plain(source, 180)),
    ]
    for name, image in targets:
        path = os.path.join(OUT, name)
        image.convert("RGB").save(path, "PNG", optimize=True)
        print(f"{path}: {image.size[0]}px")


if __name__ == "__main__":
    main()
