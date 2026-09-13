/**
 * How high the phone has to be, and why it is not a matter of taste.
 *
 * The detector never measures anything geometric: it watches a small round
 * patch of image where each cup's mouth is and notices when that patch stops
 * looking like a cup. Two things follow, and both depend on the angle the phone
 * looks down at the table from.
 *
 * 1. The guide is a **flat** triangle — it can be dragged, scaled and turned,
 *    and that is all. A real rack seen from a low angle is not a triangle on
 *    screen, it is a squashed trapezoid: the far rows crowd together. Below
 *    some height no amount of dragging makes the rings sit on the cups.
 *
 * 2. A cup mouth seen from low down is a thin ellipse, so the patches of
 *    neighbouring rows start to overlap. Once they do, a cup going down changes
 *    its neighbour's patch as well, and the detector can call the wrong cup —
 *    or call two.
 *
 * This measures both against the real thing: a regulation table (244 × 61 cm),
 * regulation cups (95 mm across the mouth, 120 mm tall) and a rack of ten.
 *
 * Run with: node tools/bench_camera_angle.mjs
 */

/** Centimetres, all of it. */
const TABLE_LENGTH = 244;
const CUP_MOUTH = 9.5;
const CUP_HEIGHT = 12;
/** Rows of a triangle nest, so the pitch is the height of an equilateral triangle. */
const ROW_PITCH = CUP_MOUTH * (Math.sqrt(3) / 2);

/**
 * The ten cup mouths of one rack, on the table.
 *
 * x across the table, y along it away from the camera end, z up. The apex
 * points away down the table, as a rack does.
 */
function rack(frontY) {
  const cups = [];
  const rows = [4, 3, 2, 1];
  rows.forEach((count, rowIndex) => {
    for (let i = 0; i < count; i++) {
      cups.push({
        x: (i - (count - 1) / 2) * CUP_MOUTH,
        y: frontY + rowIndex * ROW_PITCH,
        z: CUP_HEIGHT,
      });
    }
  });
  return cups;
}

/** A pinhole camera at `from`, pointed at `at`, 68° across the long side. */
function camera(from, at, fov = (68 * Math.PI) / 180) {
  const forward = norm(sub(at, from));
  const right = norm(cross(forward, { x: 0, y: 0, z: 1 }));
  const up = cross(right, forward);
  const focal = 0.5 / Math.tan(fov / 2);
  return (point) => {
    const v = sub(point, from);
    const depth = dot(v, forward);
    if (depth <= 0.01) return null;
    return { x: (dot(v, right) / depth) * focal, y: (-dot(v, up) / depth) * focal, depth };
  };
}

const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a, b) => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});
const len = (a) => Math.sqrt(dot(a, a));
const norm = (a) => {
  const l = len(a);
  return { x: a.x / l, y: a.y / l, z: a.z / l };
};

/** The flat triangle the app draws, in the same units as a projection. */
function guide() {
  const points = [];
  const rows = [4, 3, 2, 1];
  rows.forEach((count, rowIndex) => {
    for (let i = 0; i < count; i++) {
      points.push({ x: (i - (count - 1) / 2) * CUP_MOUTH, y: rowIndex * ROW_PITCH });
    }
  });
  return points;
}

/**
 * The best the user can do by dragging, pinching and turning: a similarity fit.
 *
 * Closed form rather than a search, so the number is the *best possible*
 * placement and not an argument about how patient somebody is.
 */
function bestFitResidual(target, source) {
  // Both handednesses, because the guide can be turned right over and the
  // projection flips the axis: a fit that cannot mirror reports a large error
  // at every height, which is what the first run of this did.
  return Math.min(similarityResidual(target, source), similarityResidual(target, source.map((p) => ({ x: -p.x, y: p.y }))));
}

/**
 * The same, for a guide that may be keystoned: narrower and tighter at the far
 * end, the way perspective really makes a rack look.
 *
 * The search over k is coarse on purpose — this is asking whether one more
 * control would be enough, not tuning it.
 */
function bestFitWithKeystone(target, source) {
  let best = Infinity;
  for (let step = 0; step <= 60; step++) {
    const k = (step / 60) * 3;
    const shaped = source.map((p) => {
      const u = p.y / (ROW_PITCH * 3) - 0.5;
      const w = 1 / (1 + k * (u + 0.5));
      return { x: p.x * w, y: u * (ROW_PITCH * 3) * w };
    });
    best = Math.min(best, bestFitResidual(target, shaped));
  }
  return best;
}

function similarityResidual(target, source) {
  const mean = (points) => ({
    x: points.reduce((s, p) => s + p.x, 0) / points.length,
    y: points.reduce((s, p) => s + p.y, 0) / points.length,
  });
  const mt = mean(target);
  const ms = mean(source);
  let sxx = 0;
  let sxy = 0;
  let varS = 0;
  for (let i = 0; i < target.length; i++) {
    const t = { x: target[i].x - mt.x, y: target[i].y - mt.y };
    const s = { x: source[i].x - ms.x, y: source[i].y - ms.y };
    sxx += s.x * t.x + s.y * t.y;
    sxy += s.x * t.y - s.y * t.x;
    varS += s.x * s.x + s.y * s.y;
  }
  const scale = Math.hypot(sxx, sxy) / varS;
  const angle = Math.atan2(sxy, sxx);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  let worst = 0;
  for (let i = 0; i < target.length; i++) {
    const s = { x: source[i].x - ms.x, y: source[i].y - ms.y };
    const placed = {
      x: mt.x + scale * (s.x * cos - s.y * sin),
      y: mt.y + scale * (s.x * sin + s.y * cos),
    };
    worst = Math.max(worst, Math.hypot(placed.x - target[i].x, placed.y - target[i].y));
  }
  return worst;
}

/** Elevation of the camera above the plane of the cup mouths, in degrees. */
const elevation = (height, distance) =>
  (Math.atan2(Math.max(0.01, height - CUP_HEIGHT), distance) * 180) / Math.PI;

function measure(from, at, cups) {
  const project = camera(from, at);
  const seen = cups.map(project);
  if (seen.some((p) => p === null)) return null;

  // How big a cup mouth is on screen, across and along the line of sight. The
  // patch is a circle, so the short way round is what has to hold.
  const distance = len(sub(at, from));
  const across = (CUP_MOUTH / distance) * 0.5;
  const angle = elevation(from.z, Math.hypot(at.x - from.x, at.y - from.y));
  const along = across * Math.sin((angle * Math.PI) / 180);

  // Gap between the nearest two rows on screen, measured the way it is seen
  // rather than only vertically: from the long side a rack is separated across
  // the frame, not up it.
  const front = { x: (seen[0].x + seen[3].x) / 2, y: (seen[0].y + seen[3].y) / 2 };
  const second = { x: (seen[4].x + seen[6].x) / 2, y: (seen[4].y + seen[6].y) / 2 };
  const rowGap = Math.hypot(second.x - front.x, second.y - front.y) / across;
  const worst = bestFitResidual(seen, guide()) / across;
  const keystoned = bestFitWithKeystone(seen, guide()) / across;
  return { angle, rowGap, worst, keystoned, squash: along / across };
}

const heights = [15, 25, 40, 60, 80, 100, 130, 170];

console.log('Ein Rack, Handy am Tischende (40 cm dahinter)\n');
console.log('  Höhe   Winkel   Mündung   Reihenabstand   Dreieck   mit Perspektive');
for (const height of heights) {
  const cups = rack(40);
  const at = { x: 0, y: 40 + ROW_PITCH * 1.5, z: CUP_HEIGHT };
  const result = measure({ x: 0, y: 0, z: height }, at, cups);
  if (!result) continue;
  console.log(
    `  ${String(height).padStart(4)}cm  ${result.angle.toFixed(0).padStart(4)}°   ` +
      `${(result.squash * 100).toFixed(0).padStart(5)}%   ` +
      `${result.rowGap.toFixed(2).padStart(11)}×   ` +
      `${result.worst.toFixed(2).padStart(6)}   ${result.keystoned.toFixed(2).padStart(13)}`
  );
}

console.log('\nBeide Racks, Handy an der Längsseite (60 cm neben der Tischmitte)\n');
console.log('  Höhe   Winkel   Mündung   Reihenabstand   Dreieck   mit Perspektive');
for (const height of heights) {
  // Filmed across the table: the near rack sits a metre away, which is what
  // makes this the better place to stand.
  const cups = rack(TABLE_LENGTH / 2 - 25 - ROW_PITCH * 3);
  const at = { x: 0, y: TABLE_LENGTH / 2 - 25, z: CUP_HEIGHT };
  const result = measure({ x: -60, y: TABLE_LENGTH / 2, z: height }, at, cups);
  if (!result) continue;
  console.log(
    `  ${String(height).padStart(4)}cm  ${result.angle.toFixed(0).padStart(4)}°   ` +
      `${(result.squash * 100).toFixed(0).padStart(5)}%   ` +
      `${result.rowGap.toFixed(2).padStart(11)}×   ` +
      `${result.worst.toFixed(2).padStart(6)}   ${result.keystoned.toFixed(2).padStart(13)}`
  );
}

// The patch the app samples, in the same units, straight out of the app's own
// formula: radius = frame.width / ceil(sqrt(2 * cups)) * 0.34, over a frame
// four mouths wide.
const PATCH = (4 / Math.ceil(Math.sqrt(20))) * 0.34;
console.log(
  `\nDer Messfleck der App hat den Radius ${PATCH.toFixed(2)} Mündungen.\n` +
    'Passt das Raster schlechter als das, sitzt mindestens ein Ring neben\n' +
    'seinem Becher — und dann zählt die Erkennung den falschen oder keinen.\n' +
    'Und liegen zwei Reihen enger als zwei Fleckradien beieinander, überlappen\n' +
    `sich ihre Flecken: ab ${(2 * PATCH).toFixed(2)}× wird es eng.`
);
