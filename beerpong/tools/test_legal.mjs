/**
 * The legal texts, checked for the ways they go wrong quietly.
 *
 * These documents are unusual in this codebase: nothing breaks if they are
 * wrong. The app runs, the shop takes money, and the first sign of trouble is a
 * letter. So the checks here are about the failures that leave no trace.
 *
 * - **A hole in the middle.** Half-filled provider details produce an Impressum
 *   with a name and no address, which reads as complete and is not.
 * - **A placeholder that shipped.** "[dein Name]" in a live Datenschutz.
 * - **A language that quietly falls back.** German written, English forgotten,
 *   and an English-speaking buyer agreeing to a text they cannot read.
 * - **The waiver losing its wording.** This is the one with money attached: the
 *   right of withdrawal only ends early if the buyer was asked two specific
 *   things. Reword that paragraph into something friendlier and the fourteen
 *   days quietly start running again on every sale.
 * - **A price that drifted.** The AGB naming €4,99 while the catalogue charges
 *   something else is a contract that disagrees with the till.
 *
 * Nothing here says the texts are *correct* — no test can, and a lawyer is the
 * right instrument for that. These check that whatever they say, they say it
 * completely, in both languages, and about this app.
 *
 * Run with: node tools/test_legal.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ts from 'typescript';

const dir = mkdtempSync(join(tmpdir(), 'legal-'));
const load = (name) => {
  const source = readFileSync(new URL(`../lib/${name}.ts`, import.meta.url), 'utf8');
  const js = ts
    .transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    })
    .outputText.replace(/from ['"]\.\/(\w+)['"]/g, "from './$1.mjs'");
  const file = join(dir, `${name}.mjs`);
  writeFileSync(file, js);
  return file;
};
for (const name of ['cupSkins', 'catalogue', 'licence', 'entitlement', 'languages']) {
  try {
    load(name);
  } catch {
    // Only what legal.ts imports has to resolve.
  }
}
const legal = await import(load('legal'));
const catalogue = await import(load('catalogue'));
const licence = await import(load('licence'));

/** A filled-in operator, the way a finished one looks. */
const FILLED = {
  name: 'Erika Mustermann',
  street: 'Musterweg 1',
  city: '12345 Musterstadt',
  country: 'DE',
  email: 'hallo@example.com',
  phone: '+49 151 0000000',
  vatId: '',
  smallBusiness: true,
};

let passed = 0;
const check = (name, fn) => {
  fn();
  console.log('  ok ', name);
  passed += 1;
};

/** Every piece of prose in every document, per language. */
const allText = (operator, language) =>
  legal
    .legalDocuments(operator)
    .flatMap((doc) => [
      doc[language],
      doc.summary[language],
      ...doc.sections.flatMap((section) => [section[language], section.body[language]]),
    ])
    .join('\n');

console.log('the provider details');

check('the file ships with the block blank, so nobody sells by accident', () => {
  // The default in the repository has to be "not set up". If somebody fills
  // this in and commits it, that is a deliberate act and this check tells them
  // they made it — it is not a mistake, but it is not a thing to do silently.
  const source = readFileSync(new URL('../lib/legal.ts', import.meta.url), 'utf8');
  const block = source.match(/export const OPERATOR: Operator = \{[\s\S]*?\n\};/);
  assert.ok(block, 'could not find the OPERATOR block');
  assert.ok(
    /name: '',/.test(block[0]),
    'lib/legal.ts has a name filled in — if that is deliberate, this check is the place to say so'
  );
});

check('a half-filled block does not count as filled', () => {
  // The dangerous one: an Impressum with a name and no address looks finished.
  for (const missing of ['name', 'street', 'city', 'email']) {
    const partial = { ...FILLED, [missing]: '' };
    assert.equal(
      legal.legalComplete(partial),
      false,
      `a block with no ${missing} passed as complete`
    );
    assert.deepEqual(legal.missingOperatorFields(partial), [missing]);
  }
});

check('whitespace is not a value', () => {
  assert.equal(legal.legalComplete({ ...FILLED, street: '   ' }), false);
});

check('the optional fields really are optional', () => {
  assert.equal(legal.legalComplete({ ...FILLED, phone: '', vatId: '' }), true);
});

check('the address block leaves no blank lines behind', () => {
  const block = legal.addressBlock({ ...FILLED, phone: '', vatId: '' });
  assert.ok(!block.includes('\n\n'), 'an omitted field left a gap in the address');
  assert.ok(block.includes(FILLED.name) && block.includes(FILLED.street));
  assert.ok(!block.includes('USt-IdNr'), 'a small business was given a VAT line');
  assert.ok(legal.addressBlock(FILLED).includes('Telefon'), 'a phone number was dropped');
});

console.log('\nthe documents');

check('every document says something in both languages', () => {
  for (const doc of legal.legalDocuments(FILLED)) {
    for (const language of ['de', 'en']) {
      assert.ok(doc[language]?.trim(), `${doc.id} has no title in ${language}`);
      assert.ok(doc.summary[language]?.trim(), `${doc.id} has no summary in ${language}`);
      for (const section of doc.sections) {
        assert.ok(section[language]?.trim(), `a section of ${doc.id} has no title in ${language}`);
        assert.ok(
          section.body[language]?.trim().length > 40,
          `a section of ${doc.id} is empty or near-empty in ${language}`
        );
      }
    }
  }
});

check('the two languages are not the same text twice', () => {
  // Copying the German into the English slot passes every other check here and
  // is worse than leaving it out, because it looks translated.
  let same = 0;
  let total = 0;
  for (const doc of legal.legalDocuments(FILLED)) {
    for (const section of doc.sections) {
      total += 1;
      if (section.body.de === section.body.en) same += 1;
    }
  }
  // The address block is legitimately identical in both — it is an address.
  assert.ok(same <= 2, `${same} of ${total} sections are the same string in both languages`);
});

check('nothing shipped with a placeholder in it', () => {
  for (const language of ['de', 'en']) {
    const text = allText(FILLED, language);
    // Not "XXX": the licence code is shaped BP-XXXX-XXXX-XXXX and the terms
    // quote it, which is the text doing its job rather than a leftover.
    for (const marker of ['TODO', 'FIXME', 'Lorem', '[dein', '[your', '{name}', '{email}']) {
      assert.ok(!text.includes(marker), `a ${language} text still contains "${marker}"`);
    }
  }
});

check('a blank block leaves an em dash, never the word undefined', () => {
  // Nobody should ever see this — `visibleDocuments` hides everything while the
  // block is blank — but if a future screen renders them anyway, it must not
  // render "undefined" at somebody.
  const text = allText({ ...FILLED, name: '', street: '', city: '', email: '' }, 'de');
  assert.ok(!text.includes('undefined'), 'a blank field rendered as "undefined"');
  assert.ok(!text.includes('null'));
});

console.log('\nthe parts with money attached');

check('the withdrawal notice keeps the two things it has to say', () => {
  // The waiver is the whole reason this document exists in an app that hands
  // over digital goods instantly. Soften either half of it and every sale gets
  // its fourteen days back.
  const doc = legal.legalDocuments(FILLED).find((d) => d.id === 'withdrawal');
  assert.ok(doc, 'there is no withdrawal notice');
  const de = doc.sections.map((s) => s.body.de).join('\n');
  const en = doc.sections.map((s) => s.body.en).join('\n');

  assert.ok(/vierzehn Tagen/.test(de), 'the German notice never states the period');
  assert.ok(/fourteen days/.test(en), 'the English notice never states the period');
  // Begin performance immediately…
  assert.ok(/sofort mit der Ausführung beginne/.test(de));
  assert.ok(/begin performance immediately|performance begins immediately/i.test(en));
  // …and acknowledge that this ends the right.
  assert.ok(/Widerrufsrecht verlier/.test(de), 'the German notice never says the right is lost');
  assert.ok(/right of withdrawal/i.test(en));
  // The model form is required and is the bit most often left out.
  assert.ok(/Hiermit widerrufe ich/.test(de), 'the model withdrawal form is missing');
});

check('the consent screen asks for exactly what the notice describes', () => {
  // Two separate places say what the buyer agrees to: this document and the
  // checkbox. If they drift, the tick stops covering the thing it claims to.
  const i18n = readFileSync(new URL('../lib/i18n.ts', import.meta.url), 'utf8');
  const waiver = i18n.match(/'consent\.waiver': \{\s*de: '([^']+)'/);
  assert.ok(waiver, 'the consent.waiver string is gone');
  assert.ok(
    /sofort mit der Ausführung begonnen wird/.test(waiver[1]),
    'the tick no longer requests immediate performance'
  );
  assert.ok(
    /Widerrufsrecht verliere/.test(waiver[1]),
    'the tick no longer acknowledges losing the right'
  );
});

check('the prices in the terms are the ones the catalogue charges', () => {
  // A contract that disagrees with the till. The numbers are interpolated
  // rather than typed, so this is really checking nobody replaced them with
  // literals during an edit.
  const terms = legal.legalDocuments(FILLED).find((d) => d.id === 'terms');
  const de = terms.sections.map((s) => s.body.de).join('\n');
  const euro = (cents) => `${(cents / 100).toFixed(2).replace('.', ',')} €`;
  for (const cents of [
    licence.DEFAULT_PRICE_CENTS,
    catalogue.CUP_PRICE_CENTS,
    catalogue.CUP_BUNDLE_CENTS,
  ]) {
    assert.ok(de.includes(euro(cents)), `the terms never name ${euro(cents)}`);
  }
});

check('the Impressum cites the law of the country it is set to', () => {
  // § 5 TMG is the tell that a text was copied from a pre-2024 template: it was
  // replaced by the DDG. Austria has its own statute again.
  const de = (country) =>
    legal
      .legalDocuments({ ...FILLED, country })
      .find((d) => d.id === 'impressum')
      .sections.map((section) => section.de)
      .join('\n');
  assert.ok(de('DE').includes('DDG'), 'the German Impressum does not cite the DDG');
  assert.ok(!de('DE').includes('TMG'), 'the German Impressum still cites the repealed TMG');
  assert.ok(de('AT').includes('ECG'), 'the Austrian Impressum does not cite the ECG');
});

check('no dead link to the ODR platform', () => {
  // It was shut down in July 2025. A dead link in an Impressum is worse than no
  // link — it is the thing a warning letter points at.
  for (const language of ['de', 'en']) {
    const text = allText(FILLED, language).toLowerCase();
    assert.ok(!text.includes('ec.europa.eu/consumers/odr'), 'the ODR link is back');
    assert.ok(!text.includes('os-plattform'), 'the ODR platform is still described');
  }
  // …but the declaration that has to be there, still is.
  assert.ok(/Verbraucherschlichtungsstelle/.test(allText(FILLED, 'de')));
});

check('the small-business note follows the country', () => {
  const vatLine = (country, smallBusiness) =>
    legal
      .legalDocuments({ ...FILLED, country, smallBusiness })
      .find((d) => d.id === 'impressum')
      .sections.find((s) => s.de === 'Umsatzsteuer').body.de;
  assert.ok(vatLine('DE', true).includes('§ 19 UStG'));
  assert.ok(vatLine('AT', true).includes('§ 6 Abs 1 Z 27 UStG'));
  assert.ok(vatLine('DE', false).includes('Umsatzsteuer'));
  assert.ok(!vatLine('DE', false).includes('§ 19'), 'a VAT-registered seller got the small print');
});

console.log('\nthe privacy notice, against what the app actually does');

check('it says the camera never leaves the device', () => {
  // The single most important claim in the document, and the one a user is
  // most entitled to rely on. If the app ever did upload a frame, this is the
  // sentence that would have become a lie.
  const doc = legal.legalDocuments(FILLED).find((d) => d.id === 'privacy');
  const de = doc.sections.map((s) => s.body.de).join('\n');
  assert.ok(/kein Bild und kein Video/.test(de));
});

check('and that claim is still true of the code', () => {
  // Checked rather than trusted: the frame sampler is where an upload would
  // have to happen, so it must contain no outbound call.
  for (const file of ['../lib/frameSampler.web.ts', '../lib/cupVision.ts']) {
    const source = readFileSync(new URL(file, import.meta.url), 'utf8');
    assert.ok(!/\bfetch\(/.test(source), `${file} makes a network call`);
    assert.ok(!/XMLHttpRequest|WebSocket/.test(source), `${file} opens a connection`);
  }
});

check('it names every third party the app really talks to', () => {
  const de = allText(FILLED, 'de');
  for (const party of ['Stripe', 'Cloudflare']) {
    assert.ok(de.includes(party), `the privacy notice never mentions ${party}`);
  }
});

check('it does not claim things the app has none of', () => {
  // Generated privacy policies are full of paragraphs about cookies, newsletters
  // and analytics. Each one is a promise to explain something that does not
  // exist, and a reader who spots one stops believing the rest.
  const de = allText(FILLED, 'de').toLowerCase();
  for (const absent of ['google analytics', 'newsletter', 'facebook', 'matomo']) {
    assert.ok(!de.includes(absent), `the privacy notice describes "${absent}", which is not here`);
  }
  // And the app genuinely has none of them.
  const pkg = readFileSync(new URL('../package.json', import.meta.url), 'utf8');
  for (const dep of ['analytics', 'sentry', 'firebase', 'amplitude']) {
    assert.ok(!pkg.toLowerCase().includes(dep), `package.json pulls in ${dep}`);
  }
});

console.log(`\n${passed} checks passed`);
