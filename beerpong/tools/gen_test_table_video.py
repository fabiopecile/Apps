"""Renders a fake beer pong table as a Y4M video for Chrome's fake camera.

Chromium can be pointed at a .y4m file with --use-file-for-fake-video-capture,
which makes it look exactly like a real webcam to the page. That is the only
way to test the detector end to end without a physical table.

Timeline (25 fps):
  0.0-3.0s   full rack, still
  3.0-4.2s   a hand sweeps across the whole rack   -> must NOT score
  4.2-6.0s   full rack again
  6.0-end    cup #4 is gone                        -> must score exactly once
"""
import math
import struct
import sys

from PIL import Image, ImageDraw

W, H = 640, 480
FPS = 25
DURATION = 11.0

TABLE = (34, 40, 36)
FELT_EDGE = (24, 28, 25)
CUP_BODY = (46, 190, 74)
CUP_RIM = (150, 255, 160)
CUP_INNER = (18, 60, 26)
HAND = (206, 168, 142)

# Rack of 10 in the same 4-3-2-1 order the app lays out (back row first).
# Sized so the rack lands under the app's default guide when the 4:3 feed is
# cover-cropped into a 390x844 portrait viewport — the test can then press
# "looks right" without having to simulate a two-finger pinch.
ROWS = [4, 3, 2, 1]
RACK_CX, RACK_TOP = W / 2, 168
PITCH_X, PITCH_Y = 46, 54
CUP_R = 20

# Which cup vanishes, counted in the app's own order.
MISSING_INDEX = 4
MISSING_AT = 6.0
HAND_FROM, HAND_TO = 3.0, 4.2


def cup_centres():
    points = []
    widest = max(ROWS)
    for row_index, count in enumerate(ROWS):
        y = RACK_TOP + row_index * PITCH_Y
        offset = (widest - count) / 2
        for i in range(count):
            x = RACK_CX + (offset + i - (widest - 1) / 2) * PITCH_X
            points.append((x, y))
    return points


CUPS = cup_centres()


def draw_frame(t):
    image = Image.new("RGB", (W, H), TABLE)
    draw = ImageDraw.Draw(image)

    # A little table shading so the background is not perfectly flat.
    for i in range(6):
        draw.rectangle([0, H - 90 + i * 15, W, H - 75 + i * 15], fill=FELT_EDGE)
    draw.line([(0, 118), (W, 118)], fill=FELT_EDGE, width=3)

    for index, (x, y) in enumerate(CUPS):
        if index == MISSING_INDEX and t >= MISSING_AT:
            # Bare table where the cup stood, with the faint ring it left.
            draw.ellipse(
                [x - CUP_R * 0.8, y - CUP_R * 0.5, x + CUP_R * 0.8, y + CUP_R * 0.5],
                outline=(44, 50, 45),
                width=2,
            )
            continue
        # Cup seen from slightly above: body, rim, dark interior.
        draw.ellipse([x - CUP_R, y - CUP_R * 0.72, x + CUP_R, y + CUP_R * 1.25], fill=CUP_BODY)
        draw.ellipse(
            [x - CUP_R, y - CUP_R * 0.72, x + CUP_R, y + CUP_R * 0.30],
            fill=CUP_INNER,
            outline=CUP_RIM,
            width=5,
        )

    if HAND_FROM <= t < HAND_TO:
        # A forearm sweeping left to right across the rack.
        progress = (t - HAND_FROM) / (HAND_TO - HAND_FROM)
        cx = -140 + progress * (W + 280)
        draw.ellipse([cx - 120, 130, cx + 120, 330], fill=HAND)

    return image


def write_y4m(path):
    """I420 — the layout Chromium's fake capture actually accepts."""
    total = int(DURATION * FPS)
    with open(path, "wb") as out:
        out.write(f"YUV4MPEG2 W{W} H{H} F{FPS}:1 Ip A1:1 C420mpeg2\n".encode())
        for i in range(total):
            frame = draw_frame(i / FPS)
            ycbcr = frame.convert("YCbCr")
            y_plane, cb_plane, cr_plane = ycbcr.split()
            out.write(b"FRAME\n")
            out.write(y_plane.tobytes())
            # Chroma at half resolution in both axes.
            out.write(cb_plane.resize((W // 2, H // 2), Image.BOX).tobytes())
            out.write(cr_plane.resize((W // 2, H // 2), Image.BOX).tobytes())
    print(f"{path}: {total} frames, {DURATION}s")


def clamp(v):
    return max(0, min(255, int(v)))


if __name__ == "__main__":
    write_y4m(sys.argv[1] if len(sys.argv) > 1 else "table.y4m")
    # A still for eyeballing the render.
    draw_frame(0).save("table-preview.png")
    draw_frame(7.0).save("table-preview-missing.png")
    draw_frame(3.6).save("table-preview-hand.png")
