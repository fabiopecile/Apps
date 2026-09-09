"""Draws the Beerpong logo and writes every icon the app needs.

The mark is a six-cup rack seen from above with a ball arcing in — enough to
read as beer pong at a glance, and simple enough to survive a 32px favicon.
Everything is drawn at 4x and downsampled, which is cheaper than fighting
PIL's aliasing.
"""
import math
import os

from PIL import Image, ImageChops, ImageDraw, ImageFilter

OUT_APP = "assets/images"
OUT_WEB = "public/icons"

BACKGROUND = (10, 10, 10)  # colors.background
NEON = (57, 255, 20)  # colors.neon
NEON_ALT = (0, 255, 102)  # colors.neonAlt
BALL = (245, 247, 245)

SS = 4  # supersampling factor


def lerp(a, b, t):
    return tuple(round(x + (y - x) * t) for x, y in zip(a, b))


def rack_positions(cx, cy, pitch):
    """Three rows of 3-2-1, pointing up, on an equilateral grid."""
    row_step = pitch * math.sqrt(3) / 2
    return [
        (cx, cy - row_step),
        (cx - pitch / 2, cy),
        (cx + pitch / 2, cy),
        (cx - pitch, cy + row_step),
        (cx, cy + row_step),
        (cx + pitch, cy + row_step),
    ]


def bezier(p0, p1, p2, t):
    u = 1 - t
    return (
        u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
        u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1],
    )


def draw_mark(size, fill=0.78, with_ball=True, background=BACKGROUND, glow=True):
    """Renders the logo.

    `fill` is the share of the canvas the artwork occupies. It is applied to
    the real bounding box of everything drawn, which is then centred — so the
    ball never drifts into the corner an iOS mask rounds off, whatever the
    proportions are.
    """
    px = size * SS
    canvas = Image.new("RGB", (px, px), background)

    # Lay the mark out in arbitrary units first; it gets fitted afterwards.
    radius = 100.0
    pitch = radius * 2.32
    cups = rack_positions(0, 0, pitch)
    ball_r = radius * 0.50
    ball_pos = (pitch * 1.24, -pitch * 1.72)
    # The ball drops into the front cup; the control point bows the path into
    # a throw rather than a straight line.
    target = (cups[0][0] + radius * 0.18, cups[0][1] - radius * 1.05)
    control = (ball_pos[0] - pitch * 0.62, ball_pos[1] + pitch * 0.18)

    points = [(x, y, radius) for x, y in cups]
    if with_ball:
        points.append((*ball_pos, ball_r))
    left = min(x - r for x, _, r in points)
    right = max(x + r for x, _, r in points)
    top = min(y - r for _, y, r in points)
    bottom = max(y + r for _, y, r in points)

    unit = (px * fill) / max(right - left, bottom - top)
    offset_x = px / 2 - (left + right) / 2 * unit
    offset_y = px / 2 - (top + bottom) / 2 * unit

    def place(point):
        return (point[0] * unit + offset_x, point[1] * unit + offset_y)

    cups = [place(cup) for cup in cups]
    ball_pos = place(ball_pos)
    target = place(target)
    control = place(control)
    radius *= unit
    ball_r *= unit
    pitch *= unit
    stroke = max(1, round(radius * 0.21))

    def paint(layer, crisp):
        """crisp=False is the pass that gets blurred into the glow."""
        draw = ImageDraw.Draw(layer, "RGBA")

        if with_ball:
            # A tapering dotted trail reads as motion at any size, where a
            # thin curve just disappears.
            steps = 7
            for i in range(steps):
                t = 0.16 + (i / (steps - 1)) * 0.80
                x, y = bezier(ball_pos, control, target, t)
                dot = ball_r * (0.52 - 0.30 * (1 - t))
                alpha = 255 if not crisp else round(70 + 150 * t)
                draw.ellipse(
                    [x - dot, y - dot, x + dot, y + dot],
                    fill=(*NEON, alpha),
                )

        for index, (x, y) in enumerate(cups):
            # A gentle gradient down the rack keeps it from looking flat.
            tint = lerp(NEON, NEON_ALT, index / (len(cups) - 1))
            box = [x - radius, y - radius, x + radius, y + radius]
            if crisp:
                # Liquid inside the cup: a dim disc under the rim.
                draw.ellipse(box, fill=(*tint, 34))
                inner = radius * 0.52
                draw.ellipse(
                    [x - inner, y - inner, x + inner, y + inner],
                    fill=(*tint, 30),
                )
            draw.ellipse(box, outline=(*tint, 255), width=stroke)

        if with_ball:
            bx, by = ball_pos
            draw.ellipse(
                [bx - ball_r, by - ball_r, bx + ball_r, by + ball_r],
                fill=(*BALL, 255),
            )

    if glow:
        glow_layer = Image.new("RGBA", (px, px), (0, 0, 0, 0))
        paint(glow_layer, crisp=False)
        bloom = Image.new("RGB", (px, px), (0, 0, 0))
        bloom.paste(glow_layer, (0, 0), glow_layer)
        bloom = bloom.filter(ImageFilter.GaussianBlur(radius * 0.62))

        # Screen-blending the blur is what gives the neon its bloom.
        canvas = ImageChops.screen(canvas, bloom)
        canvas = ImageChops.screen(canvas, bloom.filter(ImageFilter.GaussianBlur(radius * 1.5)))

    crisp_layer = Image.new("RGBA", (px, px), (0, 0, 0, 0))
    paint(crisp_layer, crisp=True)
    canvas.paste(crisp_layer, (0, 0), crisp_layer)

    return canvas.resize((size, size), Image.LANCZOS)


def monochrome(size):
    """Android's themed icon: shape only, the system supplies the colour.

    Rendered without the bloom — thresholding a glow turns the whole square
    solid, which is exactly what it must not be.
    """
    art = draw_mark(size, fill=0.52, background=(0, 0, 0), glow=False)
    mask = art.convert("L").point(lambda v: 255 if v > 90 else 0)
    white = Image.new("RGBA", (size, size), (255, 255, 255, 255))
    white.putalpha(mask)
    return white


def main():
    os.makedirs(OUT_APP, exist_ok=True)
    os.makedirs(OUT_WEB, exist_ok=True)

    written = []

    def save(path, image):
        image.convert("RGB").save(path, "PNG", optimize=True)
        written.append(path)

    # App stores and the splash screen get the full-bleed mark.
    save(f"{OUT_APP}/icon.png", draw_mark(1024))
    save(f"{OUT_APP}/splash-icon.png", draw_mark(800, fill=0.86))
    save(f"{OUT_APP}/favicon.png", draw_mark(196, fill=0.84, with_ball=False))

    # Android crops the adaptive foreground to a shape, so it needs headroom.
    foreground = draw_mark(1024, fill=0.52, background=(0, 0, 0))
    foreground = foreground.convert("RGBA")
    foreground.putalpha(foreground.convert("L").point(lambda v: min(255, v * 6)))
    foreground.save(f"{OUT_APP}/android-icon-foreground.png", "PNG", optimize=True)
    written.append(f"{OUT_APP}/android-icon-foreground.png")

    Image.new("RGB", (1024, 1024), BACKGROUND).save(
        f"{OUT_APP}/android-icon-background.png", "PNG", optimize=True
    )
    written.append(f"{OUT_APP}/android-icon-background.png")

    mono = monochrome(1024)
    mono.save(f"{OUT_APP}/android-icon-monochrome.png", "PNG", optimize=True)
    written.append(f"{OUT_APP}/android-icon-monochrome.png")

    # Home-screen icons for the web app.
    save(f"{OUT_WEB}/icon-192.png", draw_mark(192))
    save(f"{OUT_WEB}/icon-512.png", draw_mark(512))
    save(f"{OUT_WEB}/icon-maskable-192.png", draw_mark(192, fill=0.52))
    save(f"{OUT_WEB}/icon-maskable-512.png", draw_mark(512, fill=0.52))
    save(f"{OUT_WEB}/apple-touch-icon.png", draw_mark(180))

    for path in written:
        print(path)


if __name__ == "__main__":
    main()
