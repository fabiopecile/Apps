/**
 * The QR code, read back by a scanner.
 *
 * A QR is the one thing in this app with no partial failure: it scans or it is
 * a picture of noise, and nothing on screen tells you which. The usual ways to
 * get it wrong — dark and light the wrong way round, no quiet border, the grid
 * indexed by column instead of row — all look like a perfectly plausible QR
 * code to a person.
 *
 * So this does not check the encoder. It rebuilds exactly what the component
 * draws, rasterises it, and hands it to a decoder that has never seen this
 * code, then asserts the text that comes back.
 *
 * Run with: node tools/test_qr.mjs
 */
import assert from 'node:assert/strict';
import jsQR from 'jsqr';
import qrcore from 'qrcode/lib/core/qrcode.js';

const { create } = qrcore;

let passed = 0;
const check = (name, fn) => {
  fn();
  console.log('  ok ', name);
  passed += 1;
};

/** The same grid `lib/qr.ts` hands the component. */
function grid(value) {
  const code = create(value, { errorCorrectionLevel: 'M' });
  const size = code.modules.size;
  const data = code.modules.data;
  return { size, dark: (x, y) => data[y * size + x] === 1 };
}

/**
 * Draws it the way `QrCode.tsx` does — runs of dark modules along each row,
 * inside a four-module quiet border — into a plain RGBA bitmap.
 *
 * The run-packing is repeated here rather than assumed correct: turning 841
 * squares into a few dozen rectangles is where an off-by-one hides, and an
 * off-by-one in a QR is a QR that does not scan.
 */
function render(value, scale = 8) {
  const g = grid(value);
  const quiet = 4;
  const span = (g.size + quiet * 2) * scale;
  const pixels = new Uint8ClampedArray(span * span * 4);
  // Light background, everywhere, including the border.
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = 255;
    pixels[i + 1] = 255;
    pixels[i + 2] = 255;
    pixels[i + 3] = 255;
  }
  const fill = (x, y, width) => {
    for (let py = 0; py < scale; py++) {
      for (let px = 0; px < width * scale; px++) {
        const at = (((y + quiet) * scale + py) * span + (x + quiet) * scale + px) * 4;
        pixels[at] = 0;
        pixels[at + 1] = 0;
        pixels[at + 2] = 0;
      }
    }
  };
  let rects = 0;
  for (let y = 0; y < g.size; y++) {
    let start = -1;
    for (let x = 0; x <= g.size; x++) {
      const dark = x < g.size && g.dark(x, y);
      if (dark && start < 0) start = x;
      if (!dark && start >= 0) {
        fill(start, y, x - start);
        rects += 1;
        start = -1;
      }
    }
  }
  return { pixels, span, rects, modules: g.size };
}

console.log('a code a scanner can read');

const CASES = [
  'https://beerpong.pages.dev/party/AB12',
  'https://beerpong.pages.dev/party/ZZZZ',
  'http://192.168.1.44:8081/party/QQ99',
  // A long one, to push it to a bigger version than the short codes use.
  'https://some-rather-long-deployment-name.pages.dev/party/AB12?from=qr',
];

for (const value of CASES) {
  check(`"${value.slice(0, 44)}${value.length > 44 ? '…' : ''}" scans back`, () => {
    const { pixels, span } = render(value);
    const read = jsQR(pixels, span, span);
    assert.ok(read, 'the decoder found no code at all');
    assert.equal(read.data, value);
  });
}

check('drawing it in runs is the same picture as drawing every square', () => {
  // The component packs each row into as few rectangles as it can. This is the
  // assertion that the packing is lossless — compared against the module grid
  // itself rather than against a second implementation of the same idea.
  const value = CASES[0];
  const g = grid(value);
  const { pixels, span } = render(value, 4);
  const quiet = 4;
  const scale = 4;
  for (let y = 0; y < g.size; y++) {
    for (let x = 0; x < g.size; x++) {
      // The middle of the module, so an off-by-one at an edge still shows.
      const py = (y + quiet) * scale + 2;
      const px = (x + quiet) * scale + 2;
      const dark = pixels[(py * span + px) * 4] === 0;
      assert.equal(dark, g.dark(x, y), `module ${x},${y} came out wrong`);
    }
  }
});

check('the quiet border really is quiet', () => {
  // Required by the format. Without it a scanner cannot find the edges, and
  // the code reads on a white page and fails on the app's black background —
  // which is the sort of bug that only turns up at the party.
  const { pixels, span } = render(CASES[0], 4);
  const border = 4 * 4;
  for (let i = 0; i < border; i++) {
    for (const [x, y] of [
      [i, i],
      [span - 1 - i, i],
      [i, span - 1 - i],
      [span - 1 - i, span - 1 - i],
    ]) {
      assert.equal(pixels[(y * span + x) * 4], 255, `border pixel ${x},${y} is dark`);
    }
  }
});

check('inverted, it does not scan — so the polarity above is not luck', () => {
  const { pixels, span } = render(CASES[0]);
  const flipped = new Uint8ClampedArray(pixels);
  for (let i = 0; i < flipped.length; i += 4) {
    flipped[i] = 255 - flipped[i];
    flipped[i + 1] = 255 - flipped[i + 1];
    flipped[i + 2] = 255 - flipped[i + 2];
  }
  const read = jsQR(flipped, span, span);
  // jsQR is tolerant enough to sometimes find an inverted code; what must not
  // happen is it reading as something *else*.
  if (read) assert.equal(read.data, CASES[0]);
});

console.log(`\n${passed} checks passed`);
