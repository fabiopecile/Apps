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
  /**
   * How long a rack may stay wholly changed before its baseline is taken
   * again.
   *
   * Without this a knocked phone ends the feature for the rest of the game:
   * every patch is off its cup, every frame reads as disturbed, and nothing
   * ever recovers. Measured on the bench, a knock cost 599 frames of deafness
   * and the hit that followed was never found.
   *
   * Frames, not seconds, and the screen samples every 180ms — so twenty of
   * them is about three and a half seconds. Long enough that reaching across
   * the rack does not trigger it, short enough that a knocked phone costs a
   * throw rather than the game.
   */
  rebaselineFrames: number;
  /**
   * Fewest cups still being watched for the light correction below to be
   * trusted. A median over two samples is not a median.
   */
  minCupsForGain: number;
  /**
   * How many cups may be changing at the same moment before it stops being
   * throws and starts being the room.
   *
   * A throw takes one cup. Two is possible — a bounce shot, or a ball knocking
   * its neighbour — but three patches going at once, seconds apart from any
   * throw, is a shadow moving across the rack. The whole-rack guard above only
   * catches the case where most of the rack goes; this catches the slice that
   * is too small for it. Measured on the bench: a person leaning over one end
   * of the table cost three false calls, and none with this.
   */
  maxSimultaneous: number;
}

export const DEFAULT_CONFIG: DetectorConfig = {
  threshold: 26,
  confirmFrames: 4,
  disturbedRatio: 0.6,
  cooldownFrames: 25,
  rebaselineFrames: 20,
  minCupsForGain: 4,
  maxSimultaneous: 2,
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
  /** Consecutive frames each rack has been wholly changed for. */
  disturbedFor: number[];
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
  | { type: 'disturbed'; rack: number; changed: number }
  /**
   * The rack stayed wholly changed long enough that the old baseline is not
   * coming back — the phone was moved, or the lights were switched. Taken
   * again from the current frame, and the screen should say so, because any
   * cup that went down while it was confused is not coming back on its own.
   */
  | { type: 'rebaselined'; rack: number };

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
    disturbedFor: Array(racks.length).fill(0),
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
    disturbedFor: state.disturbedFor.map(() => 0),
  };
}

/** How bright a patch is overall — what a dimmer or a cloud scales. */
function luminance(sample: CupSample): number {
  return 0.299 * sample.r + 0.587 * sample.g + 0.114 * sample.b;
}

/**
 * How much the light has changed since calibration, judged by the cups
 * themselves.
 *
 * The detector's whole job is to notice one patch changing, so anything that
 * changes *all* of them is noise it has to see past. Taking the median ratio
 * across the cups still being watched gives that for free: a dimmer, a cloud,
 * the phone's own auto-exposure all move every patch by nearly the same factor,
 * and dividing it out leaves only what is genuinely different about one cup.
 *
 * The median rather than the mean because up to half the rack may be sitting on
 * bare table by then, and those patches are not a light reading.
 */
function lightGain(
  samples: CupSample[],
  baseline: CupSample[],
  members: number[],
  watching: boolean[],
  config: DetectorConfig
): number {
  const ratios: number[] = [];
  for (const i of members) {
    if (!watching[i]) continue;
    const before = luminance(baseline[i]);
    if (before < 8) continue; // too dark to give a ratio worth having
    ratios.push(luminance(samples[i]) / before);
  }
  if (ratios.length < config.minCupsForGain) return 1;
  ratios.sort((a, b) => a - b);
  const mid = Math.floor(ratios.length / 2);
  const median =
    ratios.length % 2 === 0 ? (ratios[mid - 1] + ratios[mid]) / 2 : ratios[mid];
  // Refuse to believe wild corrections: those are a moved camera, not light.
  return Math.max(0.45, Math.min(2.2, median));
}

/** The same patch as it would have looked under the calibration's light. */
function underCalibrationLight(sample: CupSample, gain: number): CupSample {
  return {
    r: sample.r / gain,
    g: sample.g / gain,
    b: sample.b / gain,
    contrast: sample.contrast / gain,
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
  /** The light correction applied to each rack, for the debug overlay. */
  gain: number[];
}

/** Feeds one frame in and reports what it means. */
export function step(
  state: DetectorState,
  samples: CupSample[],
  config: DetectorConfig = DEFAULT_CONFIG
): StepResult {
  const distances = Array<number>(samples.length).fill(0);
  if (!state.baseline) return { state, events: [], distances, gain: [] };

  const rackCount = state.rack.length > 0 ? Math.max(...state.rack) + 1 : 0;
  const streak = [...state.streak];
  const cooldown = [...state.cooldown];
  const disturbedFor = [...state.disturbedFor];
  let baseline = state.baseline;
  const gain: number[] = [];
  const events: DetectorEvent[] = [];

  for (let rack = 0; rack < rackCount; rack++) {
    const members = state.rack
      .map((value, i) => (value === rack ? i : -1))
      .filter((i) => i >= 0);

    // Judge every cup under the light the calibration was taken in, so that a
    // room getting darker is not ten cups getting scored.
    const k = lightGain(samples, baseline, members, state.watching, config);
    gain[rack] = k;
    for (const i of members) {
      distances[i] = sampleDistance(underCalibrationLight(samples[i], k), baseline[i]);
    }

    const watched = members.filter((i) => state.watching[i]);
    const changedNow = watched.filter((i) => distances[i] > config.threshold).length;

    // A throw takes out one cup. A whole rack moving at once is the room, not
    // the game — report it and start no streaks, or a passing shadow would
    // clear the table.
    if (
      watched.length > 0 &&
      changedNow >= Math.ceil(watched.length * config.disturbedRatio)
    ) {
      disturbedFor[rack] += 1;
      for (const i of members) streak[i] = 0;

      // Still wholly changed after all this time? Then the old baseline is not
      // coming back — the phone was knocked, or someone hit the lights. Take
      // the picture again rather than staying deaf for the rest of the game.
      if (disturbedFor[rack] >= config.rebaselineFrames) {
        const next = baseline.map((sample, i) =>
          members.includes(i) ? { ...samples[i] } : sample
        );
        baseline = next;
        disturbedFor[rack] = 0;
        events.push({ type: 'rebaselined', rack });
      } else {
        events.push({ type: 'disturbed', rack, changed: changedNow });
      }
      continue;
    }
    disturbedFor[rack] = 0;

    // Too many at once for throws, too few for the whole-rack guard: a shadow
    // crossing part of the rack. Hold them all rather than call any of them.
    if (changedNow > config.maxSimultaneous) {
      for (const i of watched) streak[i] = 0;
      events.push({ type: 'disturbed', rack, changed: changedNow });
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

  return {
    state: { ...state, streak, cooldown, disturbedFor, baseline },
    events,
    distances,
    gain,
  };
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
