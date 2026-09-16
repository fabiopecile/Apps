/**
 * Records the promo by driving the real app.
 *
 * Nothing here is a mock-up: the phone in the frame is an iframe pointed at the
 * running app, and every tap and swipe is a real tap and swipe. The captions
 * and the cards live in `studio.html` around it, never on top of the screen —
 * the screen is the thing being sold and covering it to describe it would be an
 * odd choice.
 *
 * Two details that cost a take each, written down so they do not cost another:
 *
 *   - The iframe needs `allow="camera"`. Without it a cross-origin frame is
 *     refused the camera by permissions policy and the tracker scene films a
 *     black rectangle.
 *   - Scenes wait for something real to appear rather than for a fixed number
 *     of milliseconds. The first cut showed an empty phone under the words
 *     "Alles an einem Ort" because the hub had not finished mounting.
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = process.argv[2] ?? 'raw';
const APP = 'http://localhost:8081';
const STUDIO = 'http://localhost:8099/studio.html';
/** Whatever Chromium this machine has. The sandbox keeps one at this path. */
const CHROMIUM = process.env.CHROMIUM ?? '/opt/pw-browsers/chromium';
mkdirSync(OUT, { recursive: true });

/**
 * The clock is shifted, not frozen.
 *
 * Shifted so the Weekend League is open — filmed on a Wednesday it shows
 * "Geschlossen bis Freitag", which is correct behaviour and a poor advert.
 * Not frozen because the app animates off the clock in places, and a stopped
 * `Date.now()` stalls them mid-throw.
 */
const SATURDAY = new Date(2026, 8, 19, 20, 30).getTime();

/** A save that makes the app look lived-in rather than brand new. */
const SAVE = {
  onboardingDone: true,
  coins: 2480,
  aiDifficulty: 'medium',
  ownedCupSkins: ['cup-classic', 'cup-perfect', 'cup-carbon', 'cup-camo', 'cup-sunset'],
  equippedCupSkin: 'cup-classic',
  rivals: { division: 8, bestDivision: 8, divisionWins: 2, divisionLosses: 0, wins: 14, losses: 5 },
  arcade: {
    totalCupsHit: 214, totalThrows: 341, careerXP: 1680, wins: 22, losses: 9,
    defeatedOpponentIds: [], equippedBall: 'ball-neon', equippedTable: 'table-classic',
  },
  weekend: { active: false, played: 0, wins: 0, bestWins: 8, runsCompleted: 3, weekendKey: '', perfectRuns: 0 },
  camera: { score: 0, streak: 0, bestStreak: 7, totalCupsHit: 96, gamesPlayed: 11 },
};

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({
  executablePath: CHROMIUM,
  args: [
    '--no-sandbox',
    // Hands the page a camera that is really the repo's synthetic table, so
    // the tracker scene is the detector actually running rather than a still.
    '--use-fake-ui-for-media-stream',
    '--use-fake-device-for-media-stream',
    `--use-file-for-fake-video-capture=${process.cwd()}/table.y4m`,
  ],
});

const context = await browser.newContext({
  viewport: { width: 1080, height: 1920 },
  deviceScaleFactor: 1,
  permissions: ['camera'],
  recordVideo: { dir: OUT, size: { width: 1080, height: 1920 } },
});

await context.addInitScript(
  ([save, saturday]) => {
    try {
      if (location.port !== '8081') return;
      localStorage.setItem('beerpong-storage', JSON.stringify({ state: save, version: 0 }));
      const Real = Date;
      const shift = saturday - Real.now();
      class Shifted extends Real {
        constructor(...a) {
          super(...(a.length ? a : [Real.now() + shift]));
        }
        static now() {
          return Real.now() + shift;
        }
      }
      // eslint-disable-next-line no-global-assign
      Date = Shifted;
    } catch {}
  },
  [SAVE, SATURDAY]
);

const page = await context.newPage();
/**
 * Wall-clock offsets into the recording, so the dead time spent loading each
 * screen can be cut out afterwards rather than left in. Playwright starts the
 * video with the context, so t0 is taken as close to that as possible.
 */
const t0 = Date.now();
const cuts = [];
const at = () => (Date.now() - t0) / 1000;
let opened = 0;
const cutIn = () => { opened = at(); };
const cutOut = (name) => cuts.push({ name, start: opened, end: at() });

const problems = [];
page.on('pageerror', (e) => problems.push(String(e)));

const promo = (fn, ...args) => page.evaluate(([f, a]) => window.promo[f](...a), [fn, args]);
const app = () => page.frameLocator('#app');

/**
 * Loads a route and waits for a piece of its real content before the phone is
 * faded in. `anchor` is text the screen cannot render without having mounted.
 */
async function scene(path, anchor, kicker, line) {
  await promo('caption', '', '');
  await promo('showPhone', false);
  await promo('go', `${APP}${path}`);
  try {
    await app().getByText(anchor, { exact: false }).first().waitFor({ timeout: 15000 });
  } catch {
    problems.push(`"${anchor}" never appeared on ${path} — that scene may be empty`);
  }
  // A beat after the anchor, so reveal animations have finished moving.
  await wait(900);
  await promo('showPhone', true);
  await promo('caption', kicker, line);
  cutIn();
}

await page.goto(STUDIO, { waitUntil: 'load' });
await page.waitForTimeout(1500); // fonts

// ---------------------------------------------------------------- 1. title
await promo('card', 'title', true);
cutIn();
await wait(2400);
cutOut('title');
await promo('card', 'title', false);
await wait(400);

// ------------------------------------------------------------------ 2. hub
await scene('/arcade', 'Offline vs. KI', 'Arcade', 'Alles an einem Ort.');
await wait(3000);
cutOut('hub');

// --------------------------------------------------------------- 3. a throw
await promo('caption', '', '');
await promo('showPhone', false);
await promo('go', `${APP}/arcade/match?mode=offline&difficulty=medium`);
await app().locator('canvas').first().waitFor({ timeout: 15000 }).catch(() => {
  problems.push('the match canvas never appeared — no throw was filmed');
});
// The table settles into place before it is worth looking at.
await wait(2200);
await promo('showPhone', true);
await promo('caption', 'Der Wurf', 'Zieh zurück. Lass los.');
cutIn();
await wait(800);

/**
 * The swipe, aimed at the real table.
 *
 * Every number here was measured by `calibrate.mjs` rather than picked:
 *
 *   - **200 page pixels.** The range is `drag × 4.6` table points and the ball
 *     rests at y=745 with the rack's apex at 220, so about 125 table points
 *     lands mid-rack; the studio scales the phone by 1.62. The first take
 *     dragged 38% of the canvas and the ball sailed over the rack — "Zu weit".
 *   - **Anchored on `#phone`, at 0.65 of its height.** The canvas locator
 *     returned two different heights across runs, and below ~0.7 of the phone
 *     sit the action row and the tab bar, where a drag is not a throw at all.
 *   - **Straight up the middle.** Sideways travel is aim, and the rack is on
 *     the centre line.
 *
 * Fifteen steps is what reads as a drag rather than a teleport.
 */
const phone = await page.locator('#phone').boundingBox();
const scoreOf = async () =>
  (await app().locator('body').first().innerText()).match(/(\d+)\/10/)?.[1];
const before = await scoreOf();
if (phone) {
  const x = phone.x + phone.width / 2;
  const from = phone.y + phone.height * 0.65;
  await page.mouse.move(x, from);
  await page.mouse.down();
  for (let i = 1; i <= 15; i++) {
    await page.mouse.move(x, from - (200 * i) / 15);
    await page.waitForTimeout(16);
  }
  await page.mouse.up();
} else {
  problems.push('no phone bounding box — the throw was not filmed');
}
await wait(3400);
const after = await scoreOf();
if (before === after) problems.push(`the throw did not score (${before} → ${after})`);
cutOut('throw');

// ------------------------------------------------------------- 4. the camera
// Revealed six seconds in on purpose. The synthetic feed sweeps a hand across
// the table between 3.5s and 5.0s to test that a covered rack does NOT score —
// useful for the detector, and on film it is a skin-coloured balloon.
await promo('caption', '', '');
await promo('showPhone', false);
await promo('go', `${APP}/camera`);
await app().getByText('Team 1', { exact: false }).first().waitFor({ timeout: 15000 }).catch(() => {
  problems.push('the tracker never mounted');
});
await wait(6000);
await promo('showPhone', true);
await promo('caption', 'Kamera', 'Am echten Tisch zählt sie mit.');
cutIn();
await wait(3800);
cutOut('camera');

// ------------------------------------------------------------ 5. cup designs
await promo('caption', '', '');
await promo('showPhone', false);
await promo('go', `${APP}/arcade/skins`);
await app().getByText('Classic', { exact: false }).first().waitFor({ timeout: 15000 }).catch(() => {
  problems.push('the skins screen never mounted');
});
await app().getByText('Becher', { exact: true }).first().click({ timeout: 8000 }).catch(() => {
  problems.push('could not switch to the cup shelf');
});
await wait(1300);
await promo('showPhone', true);
await promo('caption', 'Becher', 'Erspielt, nicht gekauft.');
cutIn();
await wait(3000);
cutOut('cups');

// ---------------------------------------------------------- 6. weekend league
await scene('/arcade/weekend', 'Lauf', 'Weekend League', 'Freitag bis Sonntag.');
await wait(3000);
cutOut('weekend');

// ------------------------------------------------------------------- 7. end
await promo('caption', '', '');
await promo('showPhone', false);
await wait(600);
await promo('card', 'end', true);
cutIn();
await wait(3000);
cutOut('end');

writeFileSync(`${OUT}/cuts.json`, JSON.stringify(cuts, null, 2));
console.log(cuts.map((c) => `${c.name} ${c.start.toFixed(1)}–${c.end.toFixed(1)}`).join('  |  '));
console.log('problems:', problems.length ? problems : 'none');
await context.close();
await browser.close();
console.log('raw video in', OUT);
