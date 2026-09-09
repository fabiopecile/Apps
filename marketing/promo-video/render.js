// Renders promo.html frame by frame.
//
// Real-time capture drops frames whenever the machine hiccups; seeking to an
// exact time and screenshotting cannot. window.__seek(ms) in promo.html sets
// every animation's currentTime, so frame N is always identical.
//
//   node render.js            -> stills at the key beats, into ./frames
//   node render.js --all      -> every frame at FPS (large: ~450 files)
//
// The frames are the deliverable: drop the folder into any editor as an image
// sequence, or run ffmpeg over them yourself.

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const FPS = 15;
const WIDTH = 1080;
const HEIGHT = 1920;
const SCALE = 0.5; // 540x960 keeps the frame folder manageable
const OUT = path.join(__dirname, 'frames');
const KEY_BEATS = [1200, 4600, 7500, 12000, 16800, 21500, 25200, 28500];

(async () => {
  const all = process.argv.includes('--all');
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch({
    // The container ships a pinned Chromium; let an env var point at it.
    executablePath: process.env.CHROMIUM_PATH || undefined,
  });
  const page = await browser.newPage({
    viewport: { width: Math.round(WIDTH * SCALE), height: Math.round(HEIGHT * SCALE) },
    deviceScaleFactor: 1,
  });
  await page.goto('file://' + path.join(__dirname, 'promo.html'));
  // Wait for the real faces, not a guessed number of milliseconds: a frame
  // rendered in the fallback face is silently wrong, not obviously broken.
  await page.evaluate(() => document.fonts.ready);
  const loaded = await page.evaluate(() => document.fonts.check('64px Anton'));
  if (!loaded) console.warn('WARNUNG: Anton wurde nicht geladen - Bilder sind in der Ersatzschrift.');
  await page.waitForTimeout(300);

  const duration = await page.evaluate(() => window.__duration);
  const times = all
    ? Array.from({ length: Math.ceil((duration / 1000) * FPS) }, (_, i) => Math.round((i / FPS) * 1000))
    : KEY_BEATS;

  for (let i = 0; i < times.length; i++) {
    await page.evaluate((ms) => window.__seek(ms), times[i]);
    await page.waitForTimeout(40);
    const name = all
      ? 'f' + String(i).padStart(5, '0') + '.png'
      : 'beat-' + String(times[i]).padStart(5, '0') + 'ms.png';
    await page.screenshot({ path: path.join(OUT, name) });
  }

  console.log(times.length + ' Bilder in ' + OUT);
  await browser.close();
})();
