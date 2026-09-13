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

export type CupPattern = StripePattern | CrossPattern;

export interface CupDesign {
  id: string;
  /** What it is called in the shop. Country names are not translated. */
  name: string;
  /** Shown in lists where a 3D cup would be silly. */
  flag: string;
  /** One colour that stands for it, for borders and the ball's glow. */
  accent: string;
  pattern: CupPattern;
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

export function cupDesign(id: string): CupDesign {
  return CUP_DESIGNS.find((design) => design.id === id) ?? CUP_DESIGNS[0];
}

/** Everything except the plain cup, which is what the shop sells. */
export const PAID_CUP_DESIGNS = CUP_DESIGNS.filter((design) => design.id !== DEFAULT_CUP_SKIN);

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
