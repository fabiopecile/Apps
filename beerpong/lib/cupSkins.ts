/**
 * What the cups look like.
 *
 * Countries, because that is what people actually want to play under: a table
 * of Austrian cups against a table of Italian ones says something a purple
 * gradient does not. Each one is a flag wrapped round the cup, drawn here as
 * data rather than as an image file — a dozen PNGs would be a dozen downloads
 * and a dozen things to keep in step with the 3D material, and a flag is three
 * stripes or a cross.
 *
 * Nothing here imports React, three.js or a texture loader: `cupTexture` hands
 * back plain bytes, so the whole set can be checked in a test without a GPU.
 */

/** Stripes across the cup (horizontal) or around it (vertical). */
export interface StripePattern {
  kind: 'stripes';
  direction: 'horizontal' | 'vertical';
  colours: string[];
  /** Relative widths. Spain's yellow is twice its reds; most flags are equal. */
  weights?: number[];
}

/** A cross, as England, Switzerland and the Nordic flags wear it. */
export interface CrossPattern {
  kind: 'cross';
  background: string;
  bar: string;
  /** How thick the bar is, as a share of the whole. */
  thickness: number;
  /** Nordic crosses sit left of centre; England's and Switzerland's are central. */
  offset?: number;
}

/**
 * Bands running corner to corner, the way a barber's pole or a hazard stripe
 * does.
 *
 * Around and up are counted separately, and that is the whole trick. The first
 * version used one number for both, on the reasoning that a diagonal is a
 * diagonal — and it came out as horizontal stripes on the cups, because a cup's
 * circumference is about two and a half times its height: the same count of
 * bands is packed far tighter going up than going round, so the up direction
 * won and the slant vanished. `around` has to be several times `rise` for the
 * bands to lean.
 *
 * `around` also has to be a multiple of the number of colours. The texture
 * wraps right round the cup, so u = 0 and u = 1 are the same line of pixels; if
 * it does not divide evenly the pattern meets itself mid-colour and leaves a
 * seam down the side of every cup in the rack.
 */
export interface DiagonalPattern {
  kind: 'diagonal';
  colours: string[];
  /** Bands passed going once round the cup. */
  around: number;
  /** Bands climbed going from the base to the rim. */
  rise: number;
}

/** A chequerboard, for carbon weaves and neon grids. */
export interface CheckerPattern {
  kind: 'checker';
  colours: [string, string];
  /** Squares around the cup. Must be even, or the alternation leaves a seam. */
  squares: number;
}

/**
 * Blotches on a background, offset row by row and varied by a hash of the cell
 * so they do not line up — camouflage rather than polka dots.
 *
 * Same lesson as the diagonal: rows and columns are counted separately because
 * the cup is much further round than it is tall. Equal counts give cells two
 * and a half times wider than they are high, the blotches come out as flat
 * ellipses, and neighbours merge sideways into bands.
 */
export interface BlotchPattern {
  kind: 'blotches';
  background: string;
  colours: string[];
  /** Up the cup. */
  rows: number;
  /** Around it. Roughly 2.5 times `rows` keeps the blotches round. */
  columns: number;
}

/** One colour bleeding into the next from the base up to the rim. */
export interface FadePattern {
  kind: 'fade';
  colours: string[];
}

export type CupPattern =
  | StripePattern
  | CrossPattern
  | DiagonalPattern
  | CheckerPattern
  | BlotchPattern
  | FadePattern;

export interface CupDesign {
  id: string;
  /** What it is called in the shop. Country names are not translated. */
  name: string;
  /** Shown in lists where a 3D cup would be silly. */
  flag: string;
  /** One colour that stands for it, for borders and the ball's glow. */
  accent: string;
  pattern: CupPattern;
  /**
   * What it costs in coins, for the ones that are earned rather than bought.
   *
   * A design has this or it has a price in the catalogue, never both — see
   * `COIN_CUP_DESIGNS` below, and the test that holds the two apart.
   */
  coins?: number;
}

/** The plain cup everybody starts with. */
export const DEFAULT_CUP_SKIN = 'cup-classic';

const stripes = (
  direction: 'horizontal' | 'vertical',
  colours: string[],
  weights?: number[]
): StripePattern => ({ kind: 'stripes', direction, colours, weights });

const cross = (background: string, bar: string, thickness = 0.2, offset = 0.5): CrossPattern => ({
  kind: 'cross',
  background,
  bar,
  thickness,
  offset,
});

/**
 * The set. Six were asked for by name; the rest are the countries whose flags
 * work as three stripes or a cross, which is most of the ones a party in Europe
 * will ask for.
 *
 * Colours are the official ones where a country publishes them (Germany's
 * black-red-gold, Austria's red) rather than the browser's idea of "red".
 */
export const CUP_DESIGNS: CupDesign[] = [
  {
    id: DEFAULT_CUP_SKIN,
    name: 'Classic Red',
    flag: '🥤',
    accent: '#D7263D',
    pattern: stripes('horizontal', ['#D7263D']),
  },
  {
    id: 'cup-at',
    name: 'Österreich',
    flag: '🇦🇹',
    accent: '#ED2939',
    pattern: stripes('horizontal', ['#ED2939', '#FFFFFF', '#ED2939']),
  },
  {
    id: 'cup-de',
    name: 'Deutschland',
    flag: '🇩🇪',
    accent: '#FFCE00',
    pattern: stripes('horizontal', ['#000000', '#DD0000', '#FFCE00']),
  },
  {
    id: 'cup-en',
    name: 'England',
    flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    accent: '#CF142B',
    pattern: cross('#FFFFFF', '#CF142B', 0.18),
  },
  {
    id: 'cup-it',
    name: 'Italia',
    flag: '🇮🇹',
    accent: '#008C45',
    pattern: stripes('vertical', ['#008C45', '#F4F5F0', '#CD212A']),
  },
  {
    id: 'cup-es',
    name: 'España',
    flag: '🇪🇸',
    accent: '#F1BF00',
    pattern: stripes('horizontal', ['#AA151B', '#F1BF00', '#AA151B'], [1, 2, 1]),
  },
  {
    id: 'cup-fr',
    name: 'France',
    flag: '🇫🇷',
    accent: '#0055A4',
    pattern: stripes('vertical', ['#0055A4', '#FFFFFF', '#EF4135']),
  },
  {
    id: 'cup-ch',
    name: 'Schweiz',
    flag: '🇨🇭',
    accent: '#DA291C',
    pattern: cross('#DA291C', '#FFFFFF', 0.2),
  },
  {
    id: 'cup-nl',
    name: 'Nederland',
    flag: '🇳🇱',
    accent: '#AE1C28',
    pattern: stripes('horizontal', ['#AE1C28', '#FFFFFF', '#21468B']),
  },
  {
    id: 'cup-be',
    name: 'België',
    flag: '🇧🇪',
    accent: '#FAE042',
    pattern: stripes('vertical', ['#000000', '#FAE042', '#ED2939']),
  },
  {
    id: 'cup-pl',
    name: 'Polska',
    flag: '🇵🇱',
    accent: '#DC143C',
    pattern: stripes('horizontal', ['#FFFFFF', '#DC143C']),
  },
  {
    id: 'cup-ie',
    name: 'Éire',
    flag: '🇮🇪',
    accent: '#FF883E',
    pattern: stripes('vertical', ['#169B62', '#FFFFFF', '#FF883E']),
  },
  {
    id: 'cup-se',
    name: 'Sverige',
    flag: '🇸🇪',
    accent: '#FECC02',
    pattern: cross('#006AA7', '#FECC02', 0.18, 0.38),
  },
  {
    id: 'cup-pt',
    name: 'Portugal',
    flag: '🇵🇹',
    accent: '#FF0000',
    pattern: stripes('vertical', ['#046A38', '#FF0000'], [2, 3]),
  },
];

/**
 * The designs you play for rather than pay for.
 *
 * Deliberately not countries. A flag is the thing somebody wants badly enough
 * to pay for, and putting a free Germany next to a Germany that costs 1,99 €
 * would make the paid one look like a swindle. These are patterns: they say
 * how long you have played, not where you are from.
 *
 * Twelve of them, three offered a week, so the whole set comes round in a
 * month and a design missed once is not missed forever.
 */
export const COIN_CUP_DESIGNS: CupDesign[] = [
  {
    id: 'cup-carbon',
    name: 'Carbon',
    flag: '🏁',
    accent: '#8A94A6',
    coins: 900,
    pattern: { kind: 'checker', colours: ['#1C2128', '#2E3742'], squares: 16 },
  },
  {
    id: 'cup-grid',
    name: 'Neon Grid',
    flag: '🟩',
    accent: '#39FF14',
    coins: 900,
    pattern: { kind: 'checker', colours: ['#0B1410', '#1E4D22'], squares: 12 },
  },
  {
    id: 'cup-camo',
    name: 'Camo',
    flag: '🪖',
    accent: '#6B7A3A',
    coins: 900,
    pattern: {
      kind: 'blotches',
      background: '#4A5730',
      colours: ['#2F3A1E', '#7C8A4E', '#3D3227'],
      rows: 4,
      columns: 10,
    },
  },
  {
    id: 'cup-candy',
    name: 'Candy',
    flag: '🍬',
    accent: '#FF5DA2',
    coins: 900,
    pattern: { kind: 'diagonal', colours: ['#FF5DA2', '#FFFFFF'], around: 12, rise: 3 },
  },
  {
    id: 'cup-hazard',
    name: 'Hazard',
    flag: '⚠️',
    accent: '#FFC400',
    coins: 900,
    pattern: { kind: 'diagonal', colours: ['#FFC400', '#1A1A1A'], around: 14, rise: 3 },
  },
  {
    id: 'cup-blackout',
    name: 'Blackout',
    flag: '🖤',
    accent: '#3A3F45',
    coins: 900,
    pattern: stripes('horizontal', ['#14161A']),
  },
  {
    id: 'cup-sunset',
    name: 'Sunset',
    flag: '🌇',
    accent: '#FF7A3D',
    coins: 1800,
    pattern: { kind: 'fade', colours: ['#2B1055', '#B33A6B', '#FF7A3D', '#FFC371'] },
  },
  {
    id: 'cup-ocean',
    name: 'Ocean',
    flag: '🌊',
    accent: '#3FD8FF',
    coins: 1800,
    pattern: { kind: 'fade', colours: ['#04203F', '#0A5C8A', '#3FD8FF'] },
  },
  {
    id: 'cup-toxic',
    name: 'Toxic',
    flag: '☣️',
    accent: '#B6FF1A',
    coins: 1800,
    pattern: {
      kind: 'blotches',
      background: '#101408',
      colours: ['#B6FF1A', '#5E8F00', '#1F2E05'],
      rows: 4,
      columns: 10,
    },
  },
  {
    id: 'cup-pearl',
    name: 'Pearl',
    flag: '🤍',
    accent: '#E8EEF2',
    coins: 1800,
    pattern: { kind: 'fade', colours: ['#8C9AA6', '#DCE6ED', '#FFFFFF'] },
  },
  {
    id: 'cup-inferno',
    name: 'Inferno',
    flag: '🔥',
    accent: '#FF5A1F',
    coins: 3200,
    pattern: { kind: 'fade', colours: ['#120202', '#7A1408', '#FF5A1F', '#FFD166'] },
  },
  {
    id: 'cup-champion',
    name: 'Champion',
    flag: '🏆',
    accent: '#FFD23D',
    coins: 3200,
    pattern: { kind: 'fade', colours: ['#4A3208', '#B8860B', '#FFD23D', '#FFF3B0'] },
  },
];

/**
 * Every design there is, however it was come by.
 *
 * The renderer and `equipCupSkin` look designs up here; the *shops* never do.
 * `PAID_CUP_DESIGNS` below stays derived from the countries alone, which is
 * what keeps a coin design out of the catalogue and off Stripe.
 */
const ALL_CUP_DESIGNS = [...CUP_DESIGNS, ...COIN_CUP_DESIGNS];

export function cupDesign(id: string): CupDesign {
  return ALL_CUP_DESIGNS.find((design) => design.id === id) ?? CUP_DESIGNS[0];
}

/** Everything except the plain cup, which is what the money shop sells. */
export const PAID_CUP_DESIGNS = CUP_DESIGNS.filter((design) => design.id !== DEFAULT_CUP_SKIN);

/**
 * A small stirring function, so camouflage looks unplanned without being
 * random: the same cell has to come out the same colour every time the texture
 * is built, or a cup would change pattern whenever the rack was redrawn.
 */
function hash(n: number): number {
  let x = (n ^ 0x27d4eb2d) >>> 0;
  x = Math.imul(x ^ (x >>> 15), 0x2c1b3c6d) >>> 0;
  x = Math.imul(x ^ (x >>> 12), 0x297a2d39) >>> 0;
  return (x ^ (x >>> 15)) >>> 0;
}

function mix(
  a: [number, number, number],
  b: [number, number, number],
  t: number
): [number, number, number] {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

function rgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

/**
 * The flag as pixels, ready to be wrapped round a cup.
 *
 * `u` runs around the cup and `v` from its base to its rim, which is how the
 * renderer lays the texture out — so "horizontal" stripes vary with v and
 * "vertical" ones with u, exactly as they would on cloth.
 *
 * Colours are listed the way a flag is described, top band first, and v runs
 * *up* the cup — so a horizontal flag is read from the rim downwards. Getting
 * that backwards flies Germany upside down, which is a different country's
 * flag, and the first screenshot of the shop did exactly that.
 */
export function cupTexture(design: CupDesign, size = 64): Uint8Array {
  const data = new Uint8Array(size * size * 4);
  const pattern = design.pattern;

  const colourAt = (u: number, v: number): [number, number, number] => {
    if (pattern.kind === 'diagonal') {
      // `around` divides the number of colours, so the band that ends at u = 1
      // is the one that starts again at u = 0 and the seam does not show.
      const band = Math.floor(u * pattern.around + v * pattern.rise);
      const index = ((band % pattern.colours.length) + pattern.colours.length) % pattern.colours.length;
      return rgb(pattern.colours[index]);
    }
    if (pattern.kind === 'checker') {
      const cell = Math.floor(u * pattern.squares) + Math.floor(v * pattern.squares);
      return rgb(pattern.colours[cell % 2]);
    }
    if (pattern.kind === 'blotches') {
      const row = Math.floor(v * pattern.rows);
      // Every other row is shifted half a cell, so the blotches interlock
      // instead of lining up in columns like a polka dot.
      const shifted = u * pattern.columns + (row % 2 ? 0.5 : 0);
      const column = Math.floor(shifted);
      // The column is taken modulo the count before it is hashed, so the cell
      // that arrives at the seam is the same cell that leaves it.
      const wrapped = ((column % pattern.columns) + pattern.columns) % pattern.columns;
      const cell = hash(row * 97 + wrapped * 31);
      const radius = 0.3 + (cell % 17) / 60;
      const dx = shifted - column - 0.5;
      const dy = v * pattern.rows - row - 0.5;
      if (Math.hypot(dx, dy) > radius) return rgb(pattern.background);
      return rgb(pattern.colours[cell % pattern.colours.length]);
    }
    if (pattern.kind === 'fade') {
      // Listed base first and v runs up the cup, so these read bottom to top —
      // the opposite way round to the flags below, and the way a sunset is
      // described.
      const span = pattern.colours.length - 1;
      const at = Math.min(v, 0.9999) * span;
      const low = Math.floor(at);
      return mix(rgb(pattern.colours[low]), rgb(pattern.colours[low + 1]), at - low);
    }
    if (pattern.kind === 'cross') {
      const half = pattern.thickness / 2;
      const centre = pattern.offset ?? 0.5;
      // The upright bar runs around the cup at one place; the crossbar runs
      // all the way round at one height. On a cup the upright is what you see
      // from the front, so it sits where the seam would be.
      const onUpright = Math.abs(u - centre) <= half;
      const onBar = Math.abs(v - 0.5) <= half;
      return rgb(onUpright || onBar ? pattern.bar : pattern.background);
    }
    const weights = pattern.weights ?? pattern.colours.map(() => 1);
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    const along = pattern.direction === 'vertical' ? u : 1 - v;
    let edge = 0;
    for (let i = 0; i < pattern.colours.length; i++) {
      edge += weights[i] / total;
      // The last band takes anything left over, so rounding cannot leave a
      // hairline of background at the top.
      if (along < edge || i === pattern.colours.length - 1) return rgb(pattern.colours[i]);
    }
    return rgb(pattern.colours[0]);
  };

  for (let row = 0; row < size; row++) {
    const v = (row + 0.5) / size;
    for (let column = 0; column < size; column++) {
      const u = (column + 0.5) / size;
      const [r, g, b] = colourAt(u, v);
      const at = (row * size + column) * 4;
      data[at] = r;
      data[at + 1] = g;
      data[at + 2] = b;
      data[at + 3] = 255;
    }
  }
  return data;
}
