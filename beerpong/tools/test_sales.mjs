/**
 * The switch that decides whether this app sells anything.
 *
 * Two properties matter here and nothing else really does.
 *
 * **It is off unless somebody turned it on.** A build made with no extra
 * configuration must be a free app with no shop in it. That is the whole reason
 * the switch exists: taking money without an Impressum is the failure that
 * costs money rather than a bug report, and a default of "off" makes the safe
 * order of events the one that requires no decision.
 *
 * **On alone is not enough.** Turning selling on with the provider details
 * still blank has to do nothing. A flag can be true while the address line is
 * empty; the gate is therefore on the data, not on the flag.
 *
 * Everything downstream — the camera's weekly limit, which manual gets
 * assembled, whether checkout can even be started — follows from those two, so
 * they are checked in every combination rather than just the one this machine
 * happens to be configured for. That is what the `build()` helper below is for:
 * it transpiles the real files with a real operator block substituted in, so
 * what is being tested is the shipped code and not a copy of its logic.
 *
 * Run with: node tools/test_sales.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ts from 'typescript';

const FILLED = `export const OPERATOR: Operator = {
  name: 'Erika Mustermann',
  street: 'Musterweg 1',
  city: '12345 Musterstadt',
  country: 'DE',
  email: 'hallo@example.com',
  phone: '',
  vatId: '',
  smallBusiness: true,
};`;

/**
 * Builds the real `lib/` modules into a throwaway directory, with the two
 * things this test needs to vary patched in as source.
 *
 * `sales` reads `process.env.EXPO_PUBLIC_SALES` at module scope, which is
 * exactly how Metro will inline it — so the variable is set before the import
 * rather than after, and each combination gets its own directory so Node's
 * module cache cannot hand back the previous one.
 */
let built = 0;
async function build({ wanted, filled }) {
  const dir = mkdtempSync(join(tmpdir(), `sales-${built++}-`));
  mkdirSync(dir, { recursive: true });

  const load = (name) => {
    let source = readFileSync(new URL(`../lib/${name}.ts`, import.meta.url), 'utf8');
    if (name === 'legal' && filled) {
      const blank = source.match(/export const OPERATOR: Operator = \{[\s\S]*?\n\};/);
      assert.ok(blank, 'could not find the OPERATOR block in lib/legal.ts');
      source = source.replace(blank[0], FILLED);
    }
    const js = ts
      .transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
      })
      .outputText.replace(/from ['"]\.\/(\w+)['"]/g, "from './$1.mjs'");
    writeFileSync(join(dir, `${name}.mjs`), js);
  };

  for (const name of [
    'arcadeLayout', 'catalogue', 'competition', 'cupGeometry', 'cupShop', 'cupSkins',
    'entitlement', 'ghosts', 'highlightsShared', 'knockout', 'languages', 'legal',
    'licence', 'luckyShot', 'opponentAi', 'opponents', 'partyProtocol', 'progression',
    'reelShared', 'sales', 'turnRules',
  ]) {
    try {
      load(name);
    } catch {
      // Only what `sales`, `legal` and `guide` reach has to resolve.
    }
  }
  // The guide pulls in i18n, which pulls in the store, which pulls in React.
  // Only the chapters are wanted here, so it is built separately and skipped
  // when that import graph refuses to load outside a bundler.
  try {
    load('guide');
  } catch {
    /* not every environment can. */
  }

  const before = process.env.EXPO_PUBLIC_SALES;
  if (wanted === undefined) delete process.env.EXPO_PUBLIC_SALES;
  else process.env.EXPO_PUBLIC_SALES = wanted;

  const sales = await import(join(dir, 'sales.mjs'));
  const legal = await import(join(dir, 'legal.mjs'));
  let guide = null;
  try {
    guide = await import(join(dir, 'guide.mjs'));
  } catch {
    /* see above. */
  }

  if (before === undefined) delete process.env.EXPO_PUBLIC_SALES;
  else process.env.EXPO_PUBLIC_SALES = before;

  return { sales, legal, guide };
}

let passed = 0;
const check = async (name, fn) => {
  await fn();
  console.log('  ok ', name);
  passed += 1;
};

console.log('the sales switch');

await check('a build with nothing configured sells nothing', async () => {
  const { sales } = await build({ wanted: undefined, filled: false });
  assert.equal(sales.SALES_REQUESTED, false);
  assert.equal(sales.SALES_ENABLED, false);
  assert.equal(sales.SALES_OFF_REASON, 'switched-off');
});

await check('the switch alone does not open the shop', async () => {
  // The one that matters most. Somebody who sets the variable and forgets the
  // Impressum must get a free app, not a shop.
  const { sales } = await build({ wanted: 'on', filled: false });
  assert.equal(sales.SALES_REQUESTED, true, 'the variable was not read');
  assert.equal(sales.SALES_ENABLED, false, 'selling opened with no provider details');
  assert.equal(sales.SALES_OFF_REASON, 'no-legal');
  assert.deepEqual(sales.SALES_MISSING_FIELDS, ['name', 'street', 'city', 'email']);
});

await check('the details alone do not open it either', async () => {
  const { sales } = await build({ wanted: undefined, filled: true });
  assert.equal(sales.SALES_ENABLED, false);
  assert.equal(sales.SALES_OFF_REASON, 'switched-off');
  // …but the documents are ready, which is the point of filling them in early.
  assert.equal(sales.LEGAL_AVAILABLE, true);
});

await check('both together open it', async () => {
  const { sales } = await build({ wanted: 'on', filled: true });
  assert.equal(sales.SALES_ENABLED, true);
  assert.equal(sales.SALES_OFF_REASON, null);
  assert.deepEqual(sales.SALES_MISSING_FIELDS, []);
});

await check('the spellings people actually type all work', async () => {
  for (const wanted of ['on', 'ON', ' on ', '1', 'true', 'TRUE']) {
    const { sales } = await build({ wanted, filled: true });
    assert.equal(sales.SALES_ENABLED, true, `"${wanted}" did not switch selling on`);
  }
});

await check('anything else leaves it off', async () => {
  // Including the near-misses. "off" must not read as truthy just because it
  // is a non-empty string, which is the classic way this goes wrong.
  for (const wanted of ['off', 'no', 'false', '0', '', 'yes', 'ein']) {
    const { sales } = await build({ wanted, filled: true });
    assert.equal(sales.SALES_ENABLED, false, `"${wanted}" switched selling on`);
  }
});

console.log('\nwhat the switch actually changes');

await check('the camera has no weekly limit while nothing is for sale', async () => {
  // A limit whose only way past it is a purchase nobody can make is not a free
  // tier, it is a dead end — and it would be the first thing a player hit.
  const { sales } = await build({ wanted: undefined, filled: false });
  assert.equal(sales.trackerUnlimited(false), true, 'a free build still caps the camera');
  assert.equal(sales.trackerUnlimited(true), true);
});

await check('and has one again once there is something to buy', async () => {
  const { sales } = await build({ wanted: 'on', filled: true });
  assert.equal(sales.trackerUnlimited(false), false, 'the limit never came back');
  assert.equal(sales.trackerUnlimited(true), true, 'a paid-up player is still capped');
});

await check('the manual matches the build it ships in', async () => {
  const free = await build({ wanted: undefined, filled: false });
  const paid = await build({ wanted: 'on', filled: true });
  if (!free.guide || !paid.guide) {
    console.log('     (skipped: the guide could not be built outside a bundler)');
    return;
  }
  const words = (mod) =>
    mod.GUIDE.flatMap((chapter) => [
      chapter.de,
      chapter.summary.de,
      ...chapter.items.flatMap((item) => [item.de, item.body.de]),
    ])
      .join(' ')
      .toLowerCase();

  const freeText = words(free.guide);
  const paidText = words(paid.guide);

  // The free manual must not describe a shop…
  for (const word of ['stripe', '4,99', '1,99', 'widerruf', 'echtes geld']) {
    assert.ok(!freeText.includes(word), `the free manual mentions "${word}"`);
  }
  // …and the paid one must, or the prices are nowhere a buyer can read them.
  for (const word of ['stripe', '4,99', '1,99']) {
    assert.ok(paidText.includes(word), `the paid manual never mentions "${word}"`);
  }
  // Both have to say the camera limit correctly for their own build.
  assert.ok(freeText.includes('ohne wochenlimit') || freeText.includes('ohne limit'));
  assert.ok(paidText.includes('pro woche'));
});

await check('switching it on only ever gives people more', async () => {
  // The upgrade path has to be one-way. Anything a free build hands out that a
  // paid build takes back would be a thing somebody loses on an update — so
  // the free build must not unlock the paid designs, only remove the cap.
  const free = await build({ wanted: undefined, filled: false });
  const paid = await build({ wanted: 'on', filled: true });
  assert.equal(free.sales.trackerUnlimited(false), true);
  assert.equal(paid.sales.trackerUnlimited(false), false);
  // Nothing in `sales` hands out a design, and that is the assertion: if a
  // future version adds a "free designs" shortcut, this list changes and
  // somebody has to think about what happens on the day the shop opens.
  assert.deepEqual(
    Object.keys(free.sales).sort(),
    [
      'LEGAL_AVAILABLE',
      'SALES_ENABLED',
      'SALES_MISSING_FIELDS',
      'SALES_OFF_REASON',
      'SALES_REQUESTED',
      'trackerUnlimited',
    ],
    'lib/sales.ts grew an export — check it cannot be withdrawn later'
  );
});

console.log('\nthe documents');

await check('nothing is shown while the details are blank', async () => {
  // A Rechtliches page reading "—" for the name is worse than no page: it looks
  // like an Impressum and satisfies nothing.
  const { legal } = await build({ wanted: undefined, filled: false });
  assert.equal(legal.legalComplete(), false);
  assert.deepEqual(legal.visibleDocuments(false), []);
  assert.deepEqual(legal.visibleDocuments(true), []);
});

await check('a free build shows the privacy notice and only that', async () => {
  const { legal } = await build({ wanted: undefined, filled: true });
  const shown = legal.visibleDocuments(false).map((doc) => doc.id);
  assert.deepEqual(shown, ['privacy']);
});

await check('a selling build shows all four', async () => {
  const { legal } = await build({ wanted: 'on', filled: true });
  const shown = legal.visibleDocuments(true).map((doc) => doc.id);
  assert.deepEqual(shown, ['impressum', 'privacy', 'withdrawal', 'terms']);
});

console.log(`\n${passed} checks passed`);
