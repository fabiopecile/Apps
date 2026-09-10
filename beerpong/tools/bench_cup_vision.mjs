/**
 * How the cup detector holds up in a room rather than in a test.
 *
 * The unit tests check that the rules are the rules. This asks a different
 * question: over thousands of frames of the things a living room actually does
 * — the light drifting, a shadow crossing half the rack, someone knocking the
 * phone, sensor grain — how often does it call a cup that is still standing,
 * and does it still notice the ones that go?
 *
 * Two numbers per scenario, and both matter:
 *   false   — cups reported gone that were not. Every one is the player being
 *             asked "did that go in?" when nothing happened, and a few of those
 *             and they stop trusting it.
 *   found   — real hits it noticed. A miss here is a cup the score never gets.
 *
 * Run with: node tools/bench_cup_vision.mjs
 */
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ts from 'typescript';

const dir = mkdtempSync(join(tmpdir(), 'bench-'));
const source = readFileSync(new URL('../lib/cupVision.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const file = join(dir, 'cupVision.mjs');
writeFileSync(file, js);
const vision = await import(file);

const CUPS = 10;

/** Repeatable randomness, so a run either always passes or always fails. */
function seeded(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/** What a standing cup looks like: a bright rim over a dark middle. */
const STANDING = { r: 178, g: 62, b: 58, contrast: 41 };
/** What is left when it goes: bare table, flat. */
const GONE = { r: 44, g: 78, b: 52, contrast: 9 };

/**
 * One frame of a rack.
 *
 * `light` multiplies every channel — that is what a dimmer, a cloud or a phone
 * auto-exposure does. `shade` does the same to a slice of the rack only, which
 * is what a person leaning over one end does.
 */
function frame(alive, { light = 1, shade = null, grain = 0, random = Math.random } = {}) {
  return alive.map((standing, i) => {
    const base = standing ? STANDING : GONE;
    let k = light;
    if (shade && i >= shade.from && i < shade.to) k *= shade.light;
    const noise = () => (random() - 0.5) * 2 * grain;
    return {
      r: Math.max(0, Math.min(255, base.r * k + noise())),
      g: Math.max(0, Math.min(255, base.g * k + noise())),
      b: Math.max(0, Math.min(255, base.b * k + noise())),
      // Contrast scales with light too: a dark room flattens everything.
      contrast: Math.max(0, base.contrast * k + noise() * 0.4),
    };
  });
}

/**
 * Runs a scenario and counts what the detector got right.
 *
 * `script` returns, for a frame number, the alive flags and the conditions.
 * Any cup that the script has actually removed counts as a real hit.
 */
function run(name, frames, script, { racks = [CUPS] } = {}) {
  let state = vision.createDetector(racks);
  const random = seeded(4242);
  state = vision.calibrate(state, script(0, random).samples);

  let wrong = 0;
  let found = 0;
  let real = 0;
  let disturbedFrames = 0;
  const seen = new Set();

  for (let f = 1; f < frames; f++) {
    const { samples, alive } = script(f, random);
    real = alive.filter((standing) => !standing).length;
    const result = vision.step(state, samples);
    state = result.state;
    for (const event of result.events) {
      if (event.type === 'disturbed') {
        disturbedFrames += 1;
        continue;
      }
      if (alive[event.index]) {
        wrong += 1;
      } else if (!seen.has(event.index)) {
        seen.add(event.index);
        found += 1;
        // The player would confirm it, so the detector stops watching.
        state = vision.acceptCup(state, event.index);
      }
    }
  }
  const pct = real > 0 ? `${found}/${real}` : '—';
  console.log(
    `  ${name.padEnd(34)} falsch ${String(wrong).padStart(3)}   gefunden ${pct.padStart(5)}   gestört ${String(disturbedFrames).padStart(4)} Bilder`
  );
  return { wrong, found, real };
}

// The screen samples every 180ms, so 900 frames is about two and a half
// minutes of play — a whole game.
console.log('Kamera-Erkennung im Wohnzimmer (900 Bilder bei 180ms ≈ 2,7 Minuten)\n');

const allUp = () => Array(CUPS).fill(true);

run('ruhiger Tisch, nichts passiert', 900, (f, random) => {
  const alive = allUp();
  return { alive, samples: frame(alive, { grain: 3, random }) };
});

run('Licht wird langsam dunkler', 900, (f, random) => {
  const alive = allUp();
  // From full to two thirds over a couple of minutes: a sunset, or someone at
  // the dimmer. Every patch drifts together, none of them because of a throw.
  const light = 1 - 0.33 * Math.min(1, f / 900);
  if (f > 400) alive[3] = false;
  return { alive, samples: frame(alive, { light, grain: 3, random }) };
});

run('Schatten über drei Becher', 900, (f, random) => {
  const alive = allUp();
  // Someone leans over one end for about a minute, from frame 200 to 500. Three of ten is under
  // the "whole rack moved" guard, so nothing stops it being read as three hits.
  const shade = f > 200 && f < 500 ? { from: 0, to: 3, light: 0.62 } : null;
  if (f > 600) alive[7] = false;
  return { alive, samples: frame(alive, { shade, grain: 3, random }) };
});

run('Handy angestoßen (Bild springt)', 900, (f, random) => {
  const alive = allUp();
  // A knock at frame 300 moves every patch off its cup for good: the whole
  // rack changes at once and stays changed.
  const light = f > 300 ? 0.78 : 1;
  if (f > 500) alive[5] = false;
  return { alive, samples: frame(alive, { light, grain: 3, random }) };
});

run('starkes Bildrauschen', 900, (f, random) => {
  const alive = allUp();
  if (f > 400) alive[2] = false;
  return { alive, samples: frame(alive, { grain: 14, random }) };
});

run('ein ganzes Spiel, zehn Becher', 2400, (f, random) => {
  const alive = allUp();
  // A cup every two seconds or so, with the light drifting the whole time.
  const sunk = Math.min(CUPS, Math.floor((f - 200) / 200) + 1);
  for (let i = 0; i < Math.max(0, sunk); i++) alive[i] = false;
  const light = 1 - 0.18 * Math.min(1, f / 2400);
  return { alive, samples: frame(alive, { light, grain: 4, random }) };
});
