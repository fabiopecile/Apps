/**
 * The unlock code: what counts as one, and what a person can type.
 *
 * The signing lives on the server and is checked end to end by
 * `tools/test_shop.mjs`. This is the half that runs in the app — the half that
 * has to cope with a code being read out across a table and typed in wrong.
 *
 * Run with: node tools/test_licence.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ts from 'typescript';

const dir = mkdtempSync(join(tmpdir(), 'lic-'));
const source = readFileSync(new URL('../lib/licence.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const file = join(dir, 'licence.mjs');
writeFileSync(file, js);
const {
  DEFAULT_PRICE_CENTS,
  LICENCE_ALPHABET,
  LICENCE_BODY,
  LICENCE_CHECK,
  encodeLicenceChars,
  formatLicence,
  formatPrice,
  looksLikeLicence,
  normaliseLicence,
  prettyLicence,
  splitLicence,
} = await import(file);

let passed = 0;
function check(name, fn) {
  fn();
  console.log('  ok ', name);
  passed += 1;
}

console.log('licence');

check('a code avoids the characters people mishear', () => {
  for (const character of 'ILO01') {
    assert.ok(!LICENCE_ALPHABET.includes(character), `${character} should not be in a code`);
  }
});

check('the shape is BP and twelve characters', () => {
  const code = formatLicence('ABCDEFGH', 'JKMN');
  assert.equal(code, 'BP-ABCD-EFGH-JKMN');
  assert.ok(looksLikeLicence(code));
  assert.equal(LICENCE_BODY + LICENCE_CHECK, 12);
});

check('however it was typed, it reads the same', () => {
  const wanted = 'ABCDEFGHJKMN';
  for (const typed of [
    'BP-ABCD-EFGH-JKMN',
    'bp-abcd-efgh-jkmn',
    'BPABCDEFGHJKMN',
    '  BP ABCD EFGH JKMN  ',
    'BP-ABCD-EFGH-JKMN\n',
  ]) {
    assert.equal(normaliseLicence(typed), wanted, `${JSON.stringify(typed)} should normalise`);
  }
});

check('a short or junk code is not a code', () => {
  for (const junk of ['', 'BP-ABCD', 'ABCDEFGHJKM', '????????????', 'BP-IIII-OOOO-LLLL']) {
    assert.equal(looksLikeLicence(junk), false, `${JSON.stringify(junk)} should be rejected`);
    assert.equal(splitLicence(junk), null);
  }
});

check('extra characters after twelve are ignored, not rejected', () => {
  // Somebody copying a code out of a message tends to bring a full stop along.
  assert.equal(normaliseLicence('BP-ABCD-EFGH-JKMN.'), 'ABCDEFGHJKMN');
  assert.ok(looksLikeLicence('BP-ABCD-EFGH-JKMN, danke!'));
});

check('splitting gives back body and check', () => {
  const parts = splitLicence('BP-ABCD-EFGH-JKMN');
  assert.deepEqual(parts, { body: 'ABCDEFGH', check: 'JKMN' });
});

check('pretty printing is idempotent', () => {
  const once = prettyLicence('bpabcdefghjkmn');
  assert.equal(once, 'BP-ABCD-EFGH-JKMN');
  assert.equal(prettyLicence(once), once);
});

check('encoding stays inside the alphabet, whatever the bytes', () => {
  const bytes = new Uint8Array([0, 1, 127, 128, 200, 255, 31, 32]);
  const out = encodeLicenceChars(bytes, 12);
  assert.equal(out.length, 12);
  for (const character of out) assert.ok(LICENCE_ALPHABET.includes(character));
});

check('a short byte array still fills the code', () => {
  // Not a case that happens with SHA-256, but the wrap must not divide by zero.
  assert.equal(encodeLicenceChars(new Uint8Array([7]), 8).length, 8);
});

check('the price is written the way the language writes money', () => {
  assert.equal(DEFAULT_PRICE_CENTS, 499);
  const german = formatPrice(499, 'eur', 'de-DE');
  assert.ok(german.includes('4,99'), `German price was ${german}`);
  assert.ok(german.includes('€'));
  const english = formatPrice(499, 'eur', 'en-GB');
  assert.ok(english.includes('4.99'), `English price was ${english}`);
});

check('an unknown currency does not take the screen down', () => {
  const out = formatPrice(499, 'zzz', 'de-DE');
  assert.ok(out.includes('4.99') || out.includes('4,99'), `got ${out}`);
});

console.log(`\n${passed} checks passed`);
