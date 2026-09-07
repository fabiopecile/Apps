"""Synthesises the app's sound effects.

Everything here is generated from scratch — no sample libraries — so the whole
set stays consistent and small. The design brief: dry, plasticky, arcade-ish.
"""
import math
import os
import random
import struct
import wave

SR = 44100
OUT = "/home/user/Apps/beerpong/assets/sounds"


# ---------------------------------------------------------------- primitives

def silence(duration):
    return [0.0] * int(SR * duration)


def exp_env(n, i, attack_s, decay_pow):
    a = max(1, int(SR * attack_s))
    if i < a:
        return i / a
    rest = max(1, n - a)
    return max(0.0, 1.0 - (i - a) / rest) ** decay_pow


def sine(freq, duration, amp=0.5, attack=0.002, decay=2.0, freq_end=None, detune=0.0):
    n = int(SR * duration)
    out = [0.0] * n
    phase = 0.0
    for i in range(n):
        f = freq if freq_end is None else freq + (freq_end - freq) * (i / n)
        f *= 1.0 + detune * math.sin(2 * math.pi * 5.0 * i / SR)
        phase += 2 * math.pi * f / SR
        out[i] = math.sin(phase) * amp * exp_env(n, i, attack, decay)
    return out


def triangle(freq, duration, amp=0.5, attack=0.002, decay=2.0):
    n = int(SR * duration)
    out = [0.0] * n
    phase = 0.0
    for i in range(n):
        phase += freq / SR
        p = phase % 1.0
        tri = 4 * abs(p - 0.5) - 1
        out[i] = tri * amp * exp_env(n, i, attack, decay)
    return out


def modal(freqs, duration, amp=0.5, decay_pows=None, damp=1.0):
    """A struck object: a handful of decaying sine partials."""
    decay_pows = decay_pows or [2.5] * len(freqs)
    tracks = []
    for idx, f in enumerate(freqs):
        gain = amp / (1 + idx * damp)
        tracks.append(sine(f, duration, amp=gain, attack=0.0004, decay=decay_pows[idx]))
    return add(*tracks)


def noise(duration, amp=0.4, attack=0.001, decay=2.5, lp=0.0, hp=0.0, seed=None):
    """Filtered white noise. lp/hp are one-pole coefficients in 0..1."""
    if seed is not None:
        random.seed(seed)
    n = int(SR * duration)
    out = [0.0] * n
    lp_state = 0.0
    hp_state = 0.0
    for i in range(n):
        r = random.uniform(-1, 1)
        if lp > 0:
            lp_state += (r - lp_state) * lp
            r = lp_state
        if hp > 0:
            hp_state += (r - hp_state) * hp
            r = r - hp_state
        out[i] = r * amp * exp_env(n, i, attack, decay)
    return out


def sweep_noise(duration, amp=0.4, lp_start=0.02, lp_end=0.4, attack=0.05, decay=1.6, seed=None):
    """Noise whose brightness moves over time — the basis of the throw whoosh."""
    if seed is not None:
        random.seed(seed)
    n = int(SR * duration)
    out = [0.0] * n
    state = 0.0
    for i in range(n):
        k = lp_start + (lp_end - lp_start) * (i / n)
        state += (random.uniform(-1, 1) - state) * k
        out[i] = state * amp * exp_env(n, i, attack, decay)
    return out


def add(*tracks):
    length = max(len(t) for t in tracks)
    out = [0.0] * length
    for t in tracks:
        for i, v in enumerate(t):
            out[i] += v
    return out


def at(delay_s, track):
    return silence(delay_s) + track


def concat(*tracks):
    out = []
    for t in tracks:
        out.extend(t)
    return out


def normalise(samples, peak=0.9):
    top = max(abs(v) for v in samples) or 1.0
    return [v / top * peak for v in samples]


def declick(samples, ms=6):
    """Fade the tail so the file never ends on a hard edge."""
    n = min(len(samples), int(SR * ms / 1000))
    for i in range(n):
        samples[len(samples) - n + i] *= 1.0 - i / n
    return samples


def write(name, samples, peak=0.9):
    samples = declick(normalise(samples, peak))
    path = os.path.join(OUT, name)
    with wave.open(path, "w") as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(SR)
        f.writeframes(
            b"".join(
                struct.pack("<h", max(-32767, min(32767, int(s * 32767)))) for s in samples
            )
        )
    print(f"{name}: {len(samples) / SR:.2f}s")


os.makedirs(OUT, exist_ok=True)

# ------------------------------------------------------------------- sounds

# Cup hit — the ball lands in a plastic cup: a dry rim tick, the hollow body
# ringing, and a short liquid gulp underneath.
tick = noise(0.02, amp=0.8, attack=0.0002, decay=8.0, lp=0.5, hp=0.02, seed=11)
body = modal([392, 615, 940, 1480], 0.30, amp=0.7, decay_pows=[2.2, 3.0, 4.0, 5.5])
gulp = sine(210, 0.22, amp=0.45, attack=0.006, decay=2.4, freq_end=120)
splash = noise(0.12, amp=0.25, attack=0.004, decay=3.2, lp=0.25, hp=0.05, seed=12)
write("cup_hit.wav", add(tick, body, at(0.012, gulp), at(0.01, splash)))

# Rim out — the ball rattles the rim and leaves: two dry clacks, no body.
clack1 = add(
    noise(0.018, amp=0.8, attack=0.0002, decay=9.0, lp=0.6, hp=0.08, seed=21),
    modal([880, 1330], 0.09, amp=0.5, decay_pows=[4.0, 6.0]),
)
clack2 = add(
    noise(0.014, amp=0.55, attack=0.0002, decay=10.0, lp=0.62, hp=0.1, seed=22),
    modal([1040, 1560], 0.07, amp=0.35, decay_pows=[4.5, 7.0]),
)
write("rim_out.wav", add(clack1, at(0.075, clack2), at(0.13, clack2)), peak=0.8)

# Miss — the ball hits the table and rolls away. Soft, low, unrewarding.
thud = add(
    noise(0.04, amp=0.5, attack=0.001, decay=5.0, lp=0.12, seed=31),
    sine(150, 0.14, amp=0.5, attack=0.002, decay=3.0, freq_end=95),
)
write("miss.wav", add(thud, at(0.09, noise(0.10, amp=0.14, attack=0.01, decay=2.5, lp=0.1, seed=32))), peak=0.62)

# Throw whoosh — air moving past the ball, brighter as it accelerates.
write(
    "whoosh.wav",
    add(
        sweep_noise(0.30, amp=0.5, lp_start=0.03, lp_end=0.30, attack=0.09, decay=2.0, seed=41),
        sine(320, 0.28, amp=0.10, attack=0.08, decay=2.2, freq_end=780),
    ),
    peak=0.55,
)

# UI tap — a soft, short click. Heard constantly, so it stays quiet.
write(
    "tap.wav",
    add(
        sine(1180, 0.030, amp=0.5, attack=0.0006, decay=6.0, freq_end=900),
        noise(0.010, amp=0.18, attack=0.0002, decay=9.0, lp=0.5, hp=0.2, seed=51),
    ),
    peak=0.42,
)

# Streak — a three-note rise that keeps climbing, so hitting in a row feels
# like it is building towards something.
write(
    "streak.wav",
    add(
        sine(1046.5, 0.10, amp=0.45, attack=0.002, decay=3.0),
        at(0.070, sine(1318.5, 0.11, amp=0.45, attack=0.002, decay=3.0)),
        at(0.145, sine(1568.0, 0.16, amp=0.5, attack=0.002, decay=2.6)),
        at(0.145, sine(3136.0, 0.16, amp=0.16, attack=0.002, decay=3.6)),
    ),
    peak=0.72,
)

# Reward chime — claiming coins. Bright, two notes, a little shimmer.
write(
    "coin.wav",
    add(
        triangle(1567.98, 0.09, amp=0.34, attack=0.001, decay=3.4),
        at(0.055, triangle(2093.0, 0.20, amp=0.34, attack=0.001, decay=2.6)),
        at(0.055, sine(3136.0, 0.22, amp=0.12, attack=0.004, decay=3.4)),
    ),
    peak=0.7,
)

# Victory — a short fanfare: rising triad, then a wide major chord with a tail.
fanfare = add(
    triangle(523.25, 0.13, amp=0.30, attack=0.004, decay=3.0),
    at(0.100, triangle(659.25, 0.13, amp=0.30, attack=0.004, decay=3.0)),
    at(0.200, triangle(783.99, 0.15, amp=0.30, attack=0.004, decay=3.0)),
)
chord = add(
    sine(523.25, 0.85, amp=0.26, attack=0.006, decay=1.5),
    sine(659.25, 0.85, amp=0.22, attack=0.006, decay=1.5),
    sine(783.99, 0.85, amp=0.20, attack=0.006, decay=1.5),
    sine(1046.50, 0.85, amp=0.24, attack=0.006, decay=1.4),
    sine(1567.98, 0.60, amp=0.09, attack=0.010, decay=2.2),
)
write("victory.wav", add(fanfare, at(0.31, chord)), peak=0.88)

# Defeat — the same shape inverted: two notes falling into a minor third.
write(
    "defeat.wav",
    add(
        triangle(392.00, 0.20, amp=0.30, attack=0.006, decay=2.4),
        at(0.170, triangle(311.13, 0.26, amp=0.30, attack=0.006, decay=2.2)),
        at(0.170, sine(155.56, 0.55, amp=0.28, attack=0.010, decay=1.8)),
    ),
    peak=0.62,
)

print("done")
