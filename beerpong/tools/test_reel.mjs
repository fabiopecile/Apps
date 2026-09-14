/**
 * The reel, made and then played.
 *
 * There is no unit test that can answer what this feature is: do several video
 * files become one video file that plays. Everything about it lives in the
 * browser — `MediaRecorder`, a canvas, a decoder — and the failure mode is a
 * file that exists, has a size, and is zero seconds long or all black.
 *
 * So this records clips off Chromium's fake camera with the same recorder the
 * app uses, puts them in the store the app reads from, presses the button a
 * person would press, and then hands the result to a fresh player: how long is
 * it, what size is the picture, and is there anything in the middle frame.
 *
 * The clips are recorded here rather than captured through the app because the
 * app only captures them while the cup detection is watching a calibrated rack.
 * What is under test is the cutting.
 *
 * Run with: npx expo start --web  (in another terminal), then
 *   node tools/test_reel.mjs
 */
import assert from 'node:assert/strict';

const APP = process.env.APP_URL ?? 'http://localhost:8081';

/**
 * Skipped rather than failed when the pieces are not there, the same way the
 * Worker-backed tests are. This one needs a browser to drive and the app
 * running — neither belongs in `npm test`'s default path, and Playwright is
 * deliberately not a dependency of this project: it downloads a browser.
 */
let chromium;
try {
  // PLAYWRIGHT can point at an installation somewhere else — ESM resolves from
  // this file's folder, not the working directory, so a copy installed beside
  // the project is not found without it.
  ({ chromium } = await import(process.env.PLAYWRIGHT ?? 'playwright'));
} catch {
  console.log('Playwright ist nicht installiert — übersprungen.');
  console.log('Installieren mit:  npm i -D playwright  (und danach npx playwright install chromium)');
  process.exit(0);
}
try {
  await fetch(APP);
} catch {
  console.log(`Keine Web-App unter ${APP} — übersprungen.`);
  console.log('Starten mit:  npx expo start --web');
  process.exit(0);
}

let passed = 0;
const check = (name, fn) => {
  fn();
  console.log('  ok ', name);
  passed += 1;
};

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium',
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
});
const context = await browser.newContext({
  viewport: { width: 402, height: 874 },
  permissions: ['camera'],
});
const page = await context.newPage();
page.on('pageerror', (error) => console.log('ERR', String(error)));

await page.goto(APP, { waitUntil: 'networkidle', timeout: 120000 });
await page.evaluate(() => {
  const raw = localStorage.getItem('beerpong-storage');
  const save = raw ? JSON.parse(raw) : { state: {}, version: 0 };
  save.state = { ...save.state, onboardingDone: true, highlightsEnabled: true };
  localStorage.setItem('beerpong-storage', JSON.stringify(save));
});

console.log('the reel');

const CLIPS = 3;
const recorded = await page.evaluate(async (count) => {
  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  const types = [
    'video/mp4;codecs=avc1',
    'video/mp4',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ];
  const mimeType = types.find((type) => MediaRecorder.isTypeSupported(type));
  const recordOne = (ms) =>
    new Promise((resolve) => {
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const parts = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) parts.push(event.data);
      };
      recorder.onstop = () => resolve(new Blob(parts, { type: mimeType || 'video/webm' }));
      recorder.start(1000);
      setTimeout(() => recorder.stop(), ms);
    });

  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open('beerpong-highlights', 1);
    request.onupgradeneeded = () => {
      const opened = request.result;
      if (!opened.objectStoreNames.contains('clips')) {
        opened.createObjectStore('clips', { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  const sizes = [];
  for (let i = 0; i < count; i++) {
    const blob = await recordOne(5000);
    sizes.push(blob.size);
    await new Promise((resolve) => {
      const put = db
        .transaction('clips', 'readwrite')
        .objectStore('clips')
        .put({ id: `reeltest-${i}`, at: Date.now() - (count - i) * 60000, seconds: 5, blob });
      put.onsuccess = resolve;
    });
  }
  db.close();
  stream.getTracks().forEach((track) => track.stop());
  return { mimeType, sizes };
}, CLIPS);

check('clips were recorded to start from', () => {
  assert.equal(recorded.sizes.length, CLIPS);
  for (const size of recorded.sizes) assert.ok(size > 1000, `a clip came out at ${size} bytes`);
});

await page.goto(`${APP}/camera/highlights`, { waitUntil: 'networkidle', timeout: 120000 });
await page.waitForTimeout(3000);

const started = Date.now();
await page.getByText('Video schneiden').click({ timeout: 15000 });
await page.waitForFunction(
  // Case-insensitively: `innerText` reflects the button's CSS text-transform,
  // so what is written as "Neu schneiden" reads back as "NEU SCHNEIDEN".
  () => /neu schneiden|hat nicht geklappt/i.test(document.body.innerText),
  undefined,
  { timeout: 180000 }
);
const took = Math.round((Date.now() - started) / 1000);

check('it finished, rather than giving up', async () => {
  assert.ok(
    !/hat nicht geklappt/i.test(await page.evaluate(() => document.body.innerText)),
    'the screen says it failed'
  );
});

const reel = await page.evaluate(async () => {
  const source = [...document.querySelectorAll('video')]
    .map((video) => video.currentSrc || video.src)
    .filter((src) => src.startsWith('blob:'))
    .at(-1);
  if (!source) return { error: 'no player showing a reel' };
  const blob = await (await fetch(source)).blob();
  const probe = document.createElement('video');
  probe.src = URL.createObjectURL(blob);
  probe.muted = true;
  await new Promise((resolve, reject) => {
    probe.onloadedmetadata = resolve;
    probe.onerror = () => reject(new Error('the player refused it'));
    setTimeout(resolve, 6000);
  });
  if (!Number.isFinite(probe.duration)) {
    await new Promise((resolve) => {
      probe.onseeked = resolve;
      probe.currentTime = 1e101;
      setTimeout(resolve, 2500);
    });
  }
  const middle = Math.max(0, (Number.isFinite(probe.duration) ? probe.duration : 4) / 2);
  await new Promise((resolve) => {
    probe.onseeked = resolve;
    probe.currentTime = middle;
    setTimeout(resolve, 2500);
  });
  const canvas = document.createElement('canvas');
  canvas.width = 120;
  canvas.height = 200;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(probe, 0, 0, canvas.width, canvas.height);
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let darkest = 255;
  let brightest = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    const luminance = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
    darkest = Math.min(darkest, luminance);
    brightest = Math.max(brightest, luminance);
  }
  return {
    type: blob.type,
    bytes: blob.size,
    duration: Number.isFinite(probe.duration) ? probe.duration : null,
    width: probe.videoWidth,
    height: probe.videoHeight,
    contrast: brightest - darkest,
  };
});

console.log(`       built in ${took}s: ${JSON.stringify(reel)}`);

check('the result is one file a player will open', () => {
  assert.ok(!reel.error, reel.error);
  assert.ok(reel.bytes > 50_000, `only ${reel.bytes} bytes`);
  assert.ok(/video\/(mp4|webm)/.test(reel.type), `odd type ${reel.type}`);
});

check('it is as long as the clips that went into it', () => {
  // Title card plus a few seconds a clip. Generous either way — the recorder
  // runs in real time and a loaded machine drifts — but a reel that comes out
  // near zero, which is what a failed join looks like, is nowhere near this.
  assert.ok(reel.duration !== null, 'the player could not work out a duration');
  assert.ok(reel.duration > CLIPS * 2, `only ${reel.duration}s for ${CLIPS} clips`);
  assert.ok(reel.duration < CLIPS * 8 + 10, `${reel.duration}s is far longer than it should be`);
});

check('it is portrait, the shape the clips came in', () => {
  assert.ok(reel.height > reel.width, `${reel.width}×${reel.height}`);
});

check('there is a picture in the middle of it, not a black screen', () => {
  // The failure this catches: everything works, the file is the right length,
  // and every frame is the canvas's background because the clips never drew.
  assert.ok(reel.contrast > 20, `the middle frame is flat (contrast ${reel.contrast})`);
});

await browser.close();
console.log(`\n${passed} checks passed`);
