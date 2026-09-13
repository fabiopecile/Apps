/**
 * The cup designs: the flags themselves, and the codes that pay for them.
 *
 * Two things matter here and neither needs a GPU. A flag has to come out the
 * right way up and in the right order — an upside-down German cup is a Belgian
 * one and somebody would notice — and a code sold for a €1.99 design must not
 * open the €4.99 camera unlock, or anything else.
 *
 * Run with: node tools/test_cup_skins.mjs
 */
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ts from 'typescript';

const dir = mkdtempSync(join(tmpdir(), 'cups-'));
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
const skins = await import(load('cupSkins'));
load('cupSkins');
const catalogue = await import(load('catalogue'));
const licence = await import(load('licence'));

let passed = 0;
const check = (name, fn) => {
  fn();
  console.log('  ok ', name);
  passed += 1;
};

console.log('cup designs');

/** The colour at a point of the texture, as #rrggbb. */
const pixel = (design, u, v, size = 64) => {
  const data = skins.cupTexture(design, size);
  const column = Math.min(size - 1, Math.floor(u * size));
  const row = Math.min(size - 1, Math.floor(v * size));
  const at = (row * size + column) * 4;
  const hex = (n) => n.toString(16).padStart(2, '0');
  return `#${hex(data[at])}${hex(data[at + 1])}${hex(data[at + 2])}`.toUpperCase();
};

check('every design has a texture of the right size', () => {
  for (const design of skins.CUP_DESIGNS) {
    const data = skins.cupTexture(design, 32);
    assert.equal(data.length, 32 * 32 * 4, design.id);
    assert.ok([...data].every((byte) => byte >= 0 && byte <= 255));
    // Nothing see-through: a cup you can look through is not a cup.
    for (let i = 3; i < data.length; i += 4) assert.equal(data[i], 255);
  }
});

check('Germany is black at the rim and gold at the base', () => {
  // Black on top, gold at the bottom — the flag of Germany. This assertion was
  // written the other way round first and passed, because the code had the same
  // mistake in it: the cup came out flying Belgium. The screenshot caught it,
  // not the test, which is worth remembering about tests written alongside the
  // thing they check.
  const de = skins.cupDesign('cup-de');
  assert.equal(pixel(de, 0.5, 0.95), '#000000', 'black is the top band');
  assert.equal(pixel(de, 0.5, 0.5), '#DD0000');
  assert.equal(pixel(de, 0.5, 0.05), '#FFCE00', 'gold is the bottom one');
});

check('the Netherlands is red over white over blue, not the reverse', () => {
  // Turned upside down this is a flag nobody flies, and turned upside down it
  // is also indistinguishable from nothing in particular — which is why the
  // German one is the canary and this is the confirmation.
  const nl = skins.cupDesign('cup-nl');
  assert.equal(pixel(nl, 0.5, 0.95), '#AE1C28');
  assert.equal(pixel(nl, 0.5, 0.5), '#FFFFFF');
  assert.equal(pixel(nl, 0.5, 0.05), '#21468B');
});

check('Poland is white over red', () => {
  const pl = skins.cupDesign('cup-pl');
  assert.equal(pixel(pl, 0.5, 0.9), '#FFFFFF');
  assert.equal(pixel(pl, 0.5, 0.1), '#DC143C');
});

check('Austria is red, white, red across', () => {
  const at = skins.cupDesign('cup-at');
  assert.equal(pixel(at, 0.5, 0.05), '#ED2939');
  assert.equal(pixel(at, 0.5, 0.5), '#FFFFFF');
  assert.equal(pixel(at, 0.5, 0.95), '#ED2939');
});

check('Italy runs around the cup, not up it', () => {
  const it = skins.cupDesign('cup-it');
  // Same height, three different colours as you go round.
  assert.equal(pixel(it, 0.1, 0.5), '#008C45');
  assert.equal(pixel(it, 0.5, 0.5), '#F4F5F0');
  assert.equal(pixel(it, 0.9, 0.5), '#CD212A');
  // And the same colour all the way up at a given angle.
  assert.equal(pixel(it, 0.1, 0.1), pixel(it, 0.1, 0.9));
});

check("Spain's yellow band is the wide one", () => {
  const es = skins.cupDesign('cup-es');
  // Weights 1:2:1 put the yellow across the middle half.
  assert.equal(pixel(es, 0.5, 0.1), '#AA151B');
  assert.equal(pixel(es, 0.5, 0.3), '#F1BF00');
  assert.equal(pixel(es, 0.5, 0.7), '#F1BF00');
  assert.equal(pixel(es, 0.5, 0.9), '#AA151B');
});

check('England has a red cross on white', () => {
  const en = skins.cupDesign('cup-en');
  assert.equal(pixel(en, 0.5, 0.5), '#CF142B', 'the middle is where the bars meet');
  assert.equal(pixel(en, 0.5, 0.1), '#CF142B', 'the upright runs the height');
  assert.equal(pixel(en, 0.1, 0.5), '#CF142B', 'the crossbar runs around');
  assert.equal(pixel(en, 0.15, 0.15), '#FFFFFF', 'the corners are the background');
});

check('the plain cup is one colour everywhere', () => {
  const classic = skins.cupDesign(skins.DEFAULT_CUP_SKIN);
  for (const [u, v] of [[0.1, 0.1], [0.5, 0.5], [0.9, 0.9]]) {
    assert.equal(pixel(classic, u, v), '#D7263D');
  }
});

check('an unknown design falls back rather than crashing', () => {
  assert.equal(skins.cupDesign('cup-atlantis').id, skins.CUP_DESIGNS[0].id);
});

console.log('what it costs');

check('every paid design is in the catalogue at 1,99 €', () => {
  for (const design of skins.PAID_CUP_DESIGNS) {
    const item = catalogue.catalogueItem(catalogue.itemForDesign(design.id));
    assert.ok(item, design.id);
    assert.equal(item.cents, 199, design.id);
    assert.deepEqual(catalogue.designsUnlockedBy(item.id), [design.id]);
  }
});

check('the plain cup is not for sale', () => {
  assert.equal(catalogue.catalogueItem(catalogue.itemForDesign(skins.DEFAULT_CUP_SKIN)), null);
});

check('the bundle opens all of them and costs less than four singles', () => {
  const bundle = catalogue.catalogueItem(catalogue.CUP_BUNDLE_ITEM);
  assert.equal(bundle.cents, 699);
  assert.equal(
    catalogue.designsUnlockedBy(catalogue.CUP_BUNDLE_ITEM).length,
    skins.PAID_CUP_DESIGNS.length
  );
  assert.ok(bundle.cents < 4 * catalogue.CUP_PRICE_CENTS);
});

check('nothing is for sale that cannot be unlocked', () => {
  for (const item of catalogue.CATALOGUE) {
    if (item.kind === 'pro') continue;
    assert.ok(catalogue.designsUnlockedBy(item.id).length > 0, item.id);
  }
});

console.log('codes');

// The same derivation the Worker does, so this checks the shared rule rather
// than a copy of it.
const SECRET = 'test-secret';
const mint = (session, item) => {
  const body = licence.encodeLicenceChars(
    createHmac('sha256', SECRET).update(licence.licenceBodyMessage(session, item)).digest(),
    licence.LICENCE_BODY
  );
  const check = licence.encodeLicenceChars(
    createHmac('sha256', SECRET).update(licence.licenceCheckMessage(body, item)).digest(),
    licence.LICENCE_CHECK
  );
  return licence.formatLicence(body, check);
};
const verify = (code, item) => {
  const parts = licence.splitLicence(code);
  if (!parts) return false;
  const expected = licence.encodeLicenceChars(
    createHmac('sha256', SECRET).update(licence.licenceCheckMessage(parts.body, item)).digest(),
    licence.LICENCE_CHECK
  );
  return expected === parts.check;
};

check('a code opens the thing it was sold for', () => {
  const code = mint('cs_test_1', 'item-cup-at');
  assert.ok(verify(code, 'item-cup-at'));
});

check('and nothing else — not another design, not the camera', () => {
  // The whole reason the item is in the signature. Without it, €1.99 would buy
  // €4.99 worth, and one design would buy all thirteen.
  const austria = mint('cs_test_1', 'item-cup-at');
  assert.equal(verify(austria, 'item-cup-de'), false, 'a design must not open another');
  assert.equal(verify(austria, 'pro'), false, 'a design must not open the camera');
  assert.equal(verify(austria, catalogue.CUP_BUNDLE_ITEM), false, 'nor the whole set');

  const pro = mint('cs_test_2', 'pro');
  assert.equal(verify(pro, 'item-cup-at'), false, 'and the camera must not open a design');
});

check('the camera code is derived exactly as it was before this existed', () => {
  // Codes already sold have to keep working, so the pro message must still be
  // the bare one with no item in it.
  const body = 'ABCDEFGH';
  assert.equal(licence.licenceCheckMessage(body, 'pro'), `check:${body}`);
  assert.equal(licence.licenceBodyMessage('cs_test_9', 'pro'), 'id:cs_test_9');
});

check('two purchases of the same design get different codes', () => {
  assert.notEqual(mint('cs_test_1', 'item-cup-it'), mint('cs_test_2', 'item-cup-it'));
});

console.log(`\n${passed} checks passed`);
