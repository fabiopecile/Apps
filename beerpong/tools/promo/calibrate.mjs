/**
 * Finds the drag length that actually scores.
 *
 * Take 3 filmed a throw that sailed over the rack — "Zu weit — kürzer ziehen" —
 * which is honest but a poor advert. The range is `drag × 4.6` table points, but
 * the drag the app sees is not the drag Playwright performs: the studio scales
 * the phone by 1.62, and the ball is also carried part of the way while the
 * finger holds it. Rather than model either, this throws for real at a range of
 * lengths and reads the scoreboard back.
 */
import { chromium } from 'playwright';

const APP = 'http://localhost:8081';
const STUDIO = 'http://localhost:8099/studio.html';
/** Whatever Chromium this machine has. The sandbox keeps one at this path. */
const CHROMIUM = process.env.CHROMIUM ?? '/opt/pw-browsers/chromium';
/**
 * Candidate drags, in page pixels.
 *
 * The arithmetic says 202: the ball rests at table y=745, the rack's apex is at
 * 220, range is `drag × 4.6` and the carry cancels out of the landing, so
 * 125 table points lands mid-rack — times the studio's 1.62 scale. These
 * bracket it, because the throw also has a wobble and a bit of aim assist.
 *
 * Anchored on `#phone`, not on the canvas: the canvas locator returned two
 * different heights across runs (881 and 245), which made the first attempt at
 * this table meaningless.
 */
const DRAGS = [170, 185, 200, 215, 230];

const browser = await chromium.launch({ executablePath: CHROMIUM, args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 1080, height: 1920 } });
await context.addInitScript(() => {
  try {
    if (location.port !== '8081') return;
    localStorage.setItem(
      'beerpong-storage',
      JSON.stringify({ state: { onboardingDone: true, coins: 2480, aiDifficulty: 'medium' }, version: 0 })
    );
  } catch {}
});

const page = await context.newPage();
await page.goto(STUDIO, { waitUntil: 'load' });
const app = () => page.frameLocator('#app');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const phone = await page.locator('#phone').boundingBox();

for (const drag of DRAGS) {
  // Three throws each: the shot carries a wobble, so one result is a sample and
  // not a measurement.
  const seen = [];
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.evaluate(([url]) => window.promo.go(url), [`${APP}/arcade/match?mode=offline&difficulty=medium`]);
    await page.evaluate(() => window.promo.showPhone(true));
    await app().locator('canvas').first().waitFor({ timeout: 15000 });
    await wait(2500);

    // Straight up the middle of the phone: sideways travel is aim, and the rack
    // sits on the centre line. Only the length of the drag sets the range — the
    // point it starts from cancels out of the landing.
    const x = phone.x + phone.width / 2;
    // 0.65, not 0.8: the gesture only covers the table view, and below it sit
    // the Bounce/Re-Rack row and the tab bar. A drag begun there is not a throw
    // at all, which is what made the first run report five identical results.
    const from = phone.y + phone.height * 0.65;
    const before = (await app().locator('body').first().innerText()).match(/(\d+)\/10/)?.[1];
    await page.mouse.move(x, from);
    await page.mouse.down();
    for (let i = 1; i <= 15; i++) {
      await page.mouse.move(x, from - (drag * i) / 15);
      await page.waitForTimeout(16);
    }
    await page.mouse.up();
    await wait(3200);

    const text = await app().locator('body').first().innerText();
    const after = text.match(/(\d+)\/10/)?.[1];
    const hint = ['Zu weit', 'Zu kurz', 'Daneben', 'Knapp', 'Rand'].find((h) => text.includes(h));
    // A dropped cup is the only proof of a hit. "No miss message" is not one:
    // it also describes a drag the game never saw as a throw.
    seen.push(after !== before ? `HIT ${before}→${after}` : (hint ?? 'no throw'));
  }
  console.log(`${drag}px page  →  ${seen.join('  ')}`);
}

await browser.close();
