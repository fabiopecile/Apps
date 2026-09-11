/**
 * The save code: what it is made of, and what somebody can type.
 *
 * This code is the whole secret — whoever has it has the save — so the two
 * things worth pinning down are that it is actually random and that it never
 * collides with the *other* code the app hands out.
 *
 * Run with: node tools/test_save_code.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ts from 'typescript';

const dir = mkdtempSync(join(tmpdir(), 'save-'));
function load(name) {
  const source = readFileSync(new URL(`../lib/${name}.ts`, import.meta.url), 'utf8');
  let js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  js = js.replace(/from '\.\/(\w+)'/g, "from './$1.mjs'");
  writeFileSync(join(dir, `${name}.mjs`), js);
}
load('codes');
load('saveCode');
const {
  SAVE_CODE_LENGTH,
  SAVE_CODE_PREFIX,
  CODE_ALPHABET,
  isSaveCode,
  looksLikeUnlockCode,
  makeSaveCode,
  normaliseSaveCode,
  prettySaveCode,
} = await import(join(dir, 'saveCode.mjs'));

let passed = 0;
function check(name, fn) {
  fn();
  console.log('  ok ', name);
  passed += 1;
}

console.log('save code');

check('twelve characters, and the readable alphabet', () => {
  assert.equal(SAVE_CODE_LENGTH, 12);
  for (const character of 'ILO01') {
    assert.ok(!CODE_ALPHABET.includes(character), `${character} should not be in a code`);
  }
  const code = makeSaveCode();
  assert.equal(normaliseSaveCode(code).length, 12);
  assert.ok(code.startsWith(`${SAVE_CODE_PREFIX}-`), code);
});

check('it is actually random', () => {
  // Twelve characters of a 31-character alphabet is about 59 bits. A thousand
  // draws must not repeat, and must not all start the same way.
  const seen = new Set();
  const firsts = new Set();
  for (let i = 0; i < 1000; i++) {
    const code = normaliseSaveCode(makeSaveCode());
    assert.equal(seen.has(code), false, `repeat after ${seen.size}: ${code}`);
    seen.add(code);
    firsts.add(code[0]);
  }
  assert.ok(firsts.size > 15, `only ${firsts.size} different first characters`);
});

check('however it was typed, it reads the same', () => {
  const code = makeSaveCode();
  const bare = normaliseSaveCode(code);
  for (const typed of [code, code.toLowerCase(), bare, ` ${code} `, code.replace(/-/g, ' ')]) {
    assert.equal(normaliseSaveCode(typed), bare, `${JSON.stringify(typed)} should normalise`);
  }
});

check('a short or junk code is not a code', () => {
  for (const junk of ['', 'SV-ABCD', 'ABCDEFGHJKM', 'SV-IIII-OOOO-LLLL']) {
    assert.equal(isSaveCode(junk), false, `${JSON.stringify(junk)} should be rejected`);
  }
});

check('an unlock code pasted in here is recognised as one', () => {
  // Two kinds of code is one too many to keep straight, and "that is not a
  // code" is useless to somebody holding a perfectly good code of the other
  // kind.
  assert.ok(looksLikeUnlockCode('BP-ABCD-EFGH-JKMN'));
  assert.ok(looksLikeUnlockCode('  bp-abcd-efgh-jkmn'));
  assert.equal(looksLikeUnlockCode(makeSaveCode()), false);
  assert.equal(looksLikeUnlockCode('BPXY'), false, 'only with the separator');
});

check('pretty printing is idempotent', () => {
  const code = makeSaveCode();
  assert.equal(prettySaveCode(prettySaveCode(code)), prettySaveCode(code));
  assert.match(prettySaveCode(code), /^SV-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
});

console.log(`\n${passed} checks passed`);
