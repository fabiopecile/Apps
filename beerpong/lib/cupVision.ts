/**
 * Semi-automatic cup detection — stage one of the camera feature.
 *
 * The insight this rests on: the ball is nearly impossible to follow (it
 * crosses the frame in about six heavily blurred frames), but the cups stand
 * still. And the score is only ever "how many cups are left". So this never
 * looks for the ball. It watches the small patch of image where each cup sits
 * and notices when one stops looking like a cup.
 *
 * Nothing here touches the DOM, React or a camera, so the whole decision path
 * is testable, and the same engine can be fed by a native frame processor
 * later without changing a line.
 */

/** What one cup's patch of image looked like in a single frame. */
export interface CupSample {
  /** Mean colour of the patch, 0-255 each. */
  r: number;
  g: number;
  b: number;
  /**
   * Mean absolute difference between neighbouring pixels. A standing cup has
   * a bright rim against a dark interior and scores high; bare table is flat.
   * This is what saves the detector when a cup is close to the table colour.
   */
  contrast: number;
}

export interface DetectorConfig {
  /** Distance above which a patch counts as "changed". */
  threshold: number;
  /** Consecutive changed frames before a cup is reported gone. */
  confirmFrames: number;
  /**
   * If this share of the watched cups changes at once it was not a throw —
   * the light changed or someone knocked the phone.
   */
  disturbedRatio: number;
  /** Frames a rejected cup is ignored for, so it does not nag. */
  cooldownFrames: number;
}

export const DEFAULT_CONFIG: DetectorConfig = {
  threshold: 26,
  confirmFrames: 4,
  disturbedRatio: 0.6,
  cooldownFrames: 25,
};

export interface DetectorState {
  /** How each cup looked when the rack was last known to be complete. */
  baseline: CupSample[] | null;
  /** Cups still being watched. A scored cup drops out. */
  watching: boolean[];
  /** Consecutive changed frames per cup. */
  streak: number[];
  /** Frames left to ignore per cup, after the user rejected a proposal. */
  cooldown: number[];
  /**
   * Which rack each cup belongs to. Two racks are watched at once when the
   * camera sees the whole table, and they have to be judged separately — a
   * hand over one rack is most of that rack but only half of everything, so a
   * single pooled check would wave it through as ten individual hits.
   */
  rack: number[];
}

export type DetectorEvent =
  | { type: 'cupGone'; index: number; rack: number; distance: number }
  /** Too much changed at once — the calibration can no longer be trusted. */
  | { type: 'disturbed'; rack: number; changed: number };

/**
 * `racks` gives the cup count of each rack being watched, in the order their
 * sample regions are concatenated: [10] for one rack, [10, 10] for both ends
 * of the table.
 */
export function createDetector(racks: number[]): DetectorState {
  const rack = racks.flatMap((count, index) => Array<number>(count).fill(index));
  const total = rack.length;
  return {
    baseline: null,
    watching: Array(total).fill(true),
    streak: Array(total).fill(0),
    cooldown: Array(total).fill(0),
    rack,
  };
}

/** Records the current frame as "this is what a full rack looks like". */
export function calibrate(state: DetectorState, samples: CupSample[]): DetectorState {
  return {
    ...state,
    baseline: samples.map((sample) => ({ ...sample })),
    streak: state.streak.map(() => 0),
    cooldown: state.cooldown.map(() => 0),
  };
}

/**
 * How far one patch has drifted from its baseline.
 *
 * Colour and contrast are combined rather than used alone: colour alone fails
 * when cup and table are a similar shade, contrast alone fails when a shadow
 * falls across the rack.
 */
export function sampleDistance(a: CupSample, b: CupSample): number {
  const colour = Math.sqrt(
    (a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2
  ) / Math.sqrt(3);
  const texture = Math.abs(a.contrast - b.contrast);
  return colour * 0.7 + texture * 1.6;
}

export interface StepResult {
  state: DetectorState;
  events: DetectorEvent[];
  /** Per-cup distances, for the debug overlay. */
  distances: number[];
}

/** Feeds one frame in and reports what it means. */
export function step(
  state: DetectorState,
  samples: CupSample[],
  config: DetectorConfig = DEFAULT_CONFIG
): StepResult {
  const distances = samples.map((sample, i) =>
    state.baseline ? sampleDistance(sample, state.baseline[i]) : 0
  );

  if (!state.baseline) return { state, events: [], distances };

  const rackCount = state.rack.length > 0 ? Math.max(...state.rack) + 1 : 0;
  const streak = [...state.streak];
  const cooldown = [...state.cooldown];
  const events: DetectorEvent[] = [];

  for (let rack = 0; rack < rackCount; rack++) {
    const members = state.rack
      .map((value, i) => (value === rack ? i : -1))
      .filter((i) => i >= 0);
    const watched = members.filter((i) => state.watching[i]);
    const changedNow = watched.filter((i) => distances[i] > config.threshold).length;

    // A throw takes out one cup. A whole rack moving at once is the room, not
    // the game — report it and start no streaks, or a passing shadow would
    // clear the table.
    if (
      watched.length > 0 &&
      changedNow >= Math.ceil(watched.length * config.disturbedRatio)
    ) {
      events.push({ type: 'disturbed', rack, changed: changedNow });
      for (const i of members) streak[i] = 0;
      continue;
    }

    for (const i of members) {
      if (cooldown[i] > 0) {
        cooldown[i] -= 1;
        streak[i] = 0;
        continue;
      }
      if (!state.watching[i]) continue;

      if (distances[i] > config.threshold) {
        streak[i] += 1;
        if (streak[i] === config.confirmFrames) {
          events.push({ type: 'cupGone', index: i, rack, distance: distances[i] });
        }
      } else {
        streak[i] = 0;
      }
    }
  }

  return { state: { ...state, streak, cooldown }, events, distances };
}

/** The user confirmed a hit: stop watching that cup. */
export function acceptCup(state: DetectorState, index: number): DetectorState {
  const watching = [...state.watching];
  const streak = [...state.streak];
  watching[index] = false;
  streak[index] = 0;
  return { ...state, watching, streak };
}

/** The user rejected it — a hand, most likely. Ignore that cup for a while. */
export function rejectCup(
  state: DetectorState,
  index: number,
  config: DetectorConfig = DEFAULT_CONFIG
): DetectorState {
  const streak = [...state.streak];
  const cooldown = [...state.cooldown];
  streak[index] = 0;
  cooldown[index] = config.cooldownFrames;
  return { ...state, streak, cooldown };
}

/**
 * Cup centres for a rack, as fractions of the rack's bounding box.
 *
 * Rows run from the back (widest) to the front point, which is how a rack
 * faces a phone standing at the other end of the table.
 */
export function rackLayout(cupCount: number): { x: number; y: number }[] {
  const rows = rowsFor(cupCount);
  const widest = Math.max(...rows);
  const points: { x: number; y: number }[] = [];

  rows.forEach((count, rowIndex) => {
    const rowY = rows.length === 1 ? 0.5 : rowIndex / (rows.length - 1);
    for (let i = 0; i < count; i++) {
      // Each row is centred, spaced on the same pitch as the widest row.
      const offset = (widest - count) / 2;
      const x = widest === 1 ? 0.5 : (offset + i) / (widest - 1);
      points.push({ x, y: rowY });
    }
  });

  return points;
}

/** 10 → 4-3-2-1, 6 → 3-2-1. An odd count keeps the triangle and adds a back row. */
export function rowsFor(cupCount: number): number[] {
  let width = 1;
  while (triangular(width + 1) <= cupCount) width += 1;

  const rows: number[] = [];
  for (let count = width; count >= 1; count--) rows.push(count);

  const remainder = cupCount - triangular(width);
  if (remainder > 0) rows.unshift(remainder);
  return rows;
}

function triangular(n: number): number {
  return (n * (n + 1)) / 2;
}
