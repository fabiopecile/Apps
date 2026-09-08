"""Renders a fake beer pong table as a Y4M video for Chrome's fake camera.

Chromium can be pointed at a .y4m file with --use-file-for-fake-video-capture,
which makes it look exactly like a real webcam to the page. That is the only
way to test the detector end to end without a physical table.

Two scenes:

  one   Phone at the end of the table: a single rack pointing up.
        0.0-3.0s  full rack
        3.0-4.2s  a hand sweeps across it   -> must NOT score
        6.0-end   one cup gone              -> must score once

  both  Phone at one end, tilted down the table: near rack low and pointing
        away, far rack above it pointing back. Sized to land under the app's
        default two-rack guides in a 390x844 portrait viewport.
        0.0-3.5s  both racks full
        3.5-5.0s  a hand covers the near rack only  -> must NOT score
        6.5-end   near rack loses a cup             -> point for the far team
        9.0-end   far rack loses a cup              -> point for the near team
"""
import sys

from PIL import Image, ImageDraw

W, H = 640, 480
FPS = 25

TABLE = (34, 40, 36)
FELT_EDGE = (24, 28, 25)
CUP_BODY = (46, 190, 74)
CUP_RIM = (150, 255, 160)
CUP_INNER = (18, 60, 26)
HAND = (206, 168, 142)

ROWS = [4, 3, 2, 1]


def triangle(cx, cy, pitch_x, pitch_y, rotation):
    """Cup centres in the app's own order, back row first, then rotated.

    rotation is in quarter turns clockwise: 0 points the rack up the screen,
    1 points it right, 3 points it left.
    """
    widest = max(ROWS)
    points = []
    for row_index, count in enumerate(ROWS):
        dy = (row_index - (len(ROWS) - 1) / 2) * pitch_y
        offset = (widest - count) / 2
        for i in range(count):
            dx = (offset + i - (widest - 1) / 2) * pitch_x
            for _ in range(rotation % 4):
                dx, dy = -dy, dx
            points.append((cx + dx, cy + dy))
    return points


def draw_table(draw):
    for i in range(6):
        draw.rectangle([0, H - 90 + i * 15, W, H - 75 + i * 15], fill=FELT_EDGE)
    draw.line([(0, 118), (W, 118)], fill=FELT_EDGE, width=3)


def draw_cup(draw, x, y, r):
    draw.ellipse([x - r, y - r * 0.72, x + r, y + r * 1.25], fill=CUP_BODY)
    draw.ellipse(
        [x - r, y - r * 0.72, x + r, y + r * 0.30],
        fill=CUP_INNER,
        outline=CUP_RIM,
        width=max(2, int(r * 0.25)),
    )


def draw_gap(draw, x, y, r):
    draw.ellipse([x - r * 0.8, y - r * 0.5, x + r * 0.8, y + r * 0.5], outline=(44, 50, 45), width=2)


# --------------------------------------------------------------- scene: one

# Sized so the rack lands under the app's default guide when the 4:3 feed is
# cover-cropped into a 390x844 portrait viewport.
ONE = dict(cups=triangle(W / 2, 168 + 1.5 * 54, 46, 54, 0), r=20)
ONE_MISSING, ONE_MISSING_AT = 4, 6.0
ONE_HAND = (3.0, 4.2)
ONE_DURATION = 11.0


def draw_one(t):
    image = Image.new("RGB", (W, H), TABLE)
    draw = ImageDraw.Draw(image)
    draw_table(draw)

    for index, (x, y) in enumerate(ONE["cups"]):
        if index == ONE_MISSING and t >= ONE_MISSING_AT:
            draw_gap(draw, x, y, ONE["r"])
        else:
            draw_cup(draw, x, y, ONE["r"])

    if ONE_HAND[0] <= t < ONE_HAND[1]:
        progress = (t - ONE_HAND[0]) / (ONE_HAND[1] - ONE_HAND[0])
        cx = -140 + progress * (W + 280)
        draw.ellipse([cx - 120, 130, cx + 120, 330], fill=HAND)

    return image


# -------------------------------------------------------------- scene: both

# The 4:3 feed is cover-cropped to a tall sliver — only video x 209..431 is
# ever on screen in portrait — so both racks have to live inside that column.
NEAR = dict(cups=triangle(320, 345.6, 32.7, 48, 2), r=14)
FAR = dict(cups=triangle(320, 134.4, 32.7, 48, 0), r=14)
BOTH_DURATION = 13.0
NEAR_MISSING, NEAR_MISSING_AT = 5, 6.5
FAR_MISSING, FAR_MISSING_AT = 2, 9.0
BOTH_HAND = (3.5, 5.0)


def draw_both(t):
    image = Image.new("RGB", (W, H), TABLE)
    draw = ImageDraw.Draw(image)
    draw_table(draw)

    for rack, missing, at in (
        (NEAR, NEAR_MISSING, NEAR_MISSING_AT),
        (FAR, FAR_MISSING, FAR_MISSING_AT),
    ):
        for index, (x, y) in enumerate(rack["cups"]):
            if index == missing and t >= at:
                draw_gap(draw, x, y, rack["r"])
            else:
                draw_cup(draw, x, y, rack["r"])

    if BOTH_HAND[0] <= t < BOTH_HAND[1]:
        # Covers the near rack only — the case a pooled disturbance check
        # would wave through as five separate hits.
        draw.ellipse([230, 250, 420, 440], fill=HAND)

    return image


SCENES = {
    "one": (draw_one, ONE_DURATION),
    "both": (draw_both, BOTH_DURATION),
}


def write_y4m(path, render, duration):
    """I420 — the layout Chromium's fake capture actually accepts."""
    total = int(duration * FPS)
    with open(path, "wb") as out:
        out.write(f"YUV4MPEG2 W{W} H{H} F{FPS}:1 Ip A1:1 C420mpeg2\n".encode())
        for i in range(total):
            frame = render(i / FPS)
            y_plane, cb_plane, cr_plane = frame.convert("YCbCr").split()
            out.write(b"FRAME\n")
            out.write(y_plane.tobytes())
            # Chroma at half resolution in both axes.
            out.write(cb_plane.resize((W // 2, H // 2), Image.BOX).tobytes())
            out.write(cr_plane.resize((W // 2, H // 2), Image.BOX).tobytes())
    print(f"{path}: {total} frames, {duration}s")


if __name__ == "__main__":
    scene = sys.argv[2] if len(sys.argv) > 2 else "one"
    path = sys.argv[1] if len(sys.argv) > 1 else f"table-{scene}.y4m"
    render, duration = SCENES[scene]
    write_y4m(path, render, duration)
    render(0).save(f"preview-{scene}-start.png")
    render(duration - 0.5).save(f"preview-{scene}-end.png")
