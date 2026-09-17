/**
 * Cuts the raw recording down to the promo.
 *
 * `record.mjs` writes a timestamp pair for every scene while it films, so the
 * dead seconds — a route loading, a canvas warming up, the studio fading the
 * phone out — are known exactly rather than hunted for afterwards by eye.
 *
 * Scenes are joined with a short crossfade rather than a hard cut. Each segment
 * begins the instant the phone starts fading in, so a hard cut would land on a
 * half-transparent frame; the crossfade covers that.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const RAW = process.argv[2] ?? 'raw';
const OUT = process.argv[3] ?? 'beerpong-promo.mp4';
/**
 * ffmpeg is not a dependency of the app, so it is looked up rather than
 * imported: `npm i ffmpeg-static` next to this script, or point `FFMPEG` at any
 * ffmpeg you already have.
 */
const FF = process.env.FFMPEG ?? './node_modules/ffmpeg-static/ffmpeg';
const XF = 0.35; // crossfade, seconds

const source = `${RAW}/${readdirSync(RAW).find((f) => f.endsWith('.webm'))}`;
const cuts = JSON.parse(readFileSync(`${RAW}/cuts.json`, 'utf8'));

const parts = [];
const lengths = [];
cuts.forEach((c, i) => {
  const length = c.end - c.start;
  lengths.push(length);
  parts.push(
    `[0:v]trim=start=${c.start.toFixed(3)}:end=${c.end.toFixed(3)},` +
      `setpts=PTS-STARTPTS,fps=30,format=yuv420p[s${i}]`
  );
});

// xfade wants the offset into the *accumulated* stream, and every transition
// eats XF seconds of total length — so the running total has to be tracked.
let chain = '[s0]';
let total = lengths[0];
for (let i = 1; i < cuts.length; i++) {
  const offset = total - XF;
  parts.push(`${chain}[s${i}]xfade=transition=fade:duration=${XF}:offset=${offset.toFixed(3)}[x${i}]`);
  chain = `[x${i}]`;
  total += lengths[i] - XF;
}

parts.push(
  `${chain}fade=t=in:st=0:d=0.6,fade=t=out:st=${(total - 0.7).toFixed(3)}:d=0.7[v]`
);

execFileSync(
  FF,
  [
    '-y',
    '-i', source,
    '-filter_complex', parts.join(';'),
    '-map', '[v]',
    '-c:v', 'libx264',
    '-profile:v', 'high',
    '-pix_fmt', 'yuv420p',
    '-crf', '19',
    '-preset', 'slow',
    // Keeps it playable in the places a phone actually opens a video.
    '-movflags', '+faststart',
    '-an',
    OUT,
  ],
  { stdio: 'inherit' }
);

console.log(`\n${OUT} — ${total.toFixed(1)}s from ${cuts.length} scenes`);
