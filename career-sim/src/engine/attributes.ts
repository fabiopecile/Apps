import type { Attributes, AttributeKey, Position } from '../types';

export const attributeLabels: Record<AttributeKey, string> = {
  pace: 'Tempo',
  acceleration: 'Beschleunigung',
  stamina: 'Ausdauer',
  strength: 'Kraft',
  technique: 'Technik',
  ballControl: 'Ballkontrolle',
  dribbling: 'Dribbling',
  shortPassing: 'Kurzpass',
  longPassing: 'Langpass',
  crossing: 'Flanken',
  shooting: 'Schuss',
  penalties: 'Elfmeter',
  freeKick: 'Freistoß',
  heading: 'Kopfball',
  tackling: 'Tackling',
  positioning: 'Stellungsspiel',
  aggression: 'Aggressivität',
  vision: 'Übersicht',
  leadership: 'Führungsqualität',
};

export const attributeOrder: AttributeKey[] = Object.keys(attributeLabels) as AttributeKey[];

// Weights per position; must sum to 1 for a clean 0-99 overall.
const positionWeights: Record<Position, Partial<Record<AttributeKey, number>>> = {
  GK: {
    positioning: 0.28, tackling: 0.05, strength: 0.1, vision: 0.12,
    shortPassing: 0.1, longPassing: 0.1, leadership: 0.1, aggression: 0.05,
    stamina: 0.1,
  },
  CB: {
    tackling: 0.24, positioning: 0.2, strength: 0.16, heading: 0.14,
    aggression: 0.08, shortPassing: 0.08, pace: 0.05, leadership: 0.05,
  },
  LB: {
    pace: 0.16, acceleration: 0.12, tackling: 0.16, crossing: 0.14,
    stamina: 0.14, positioning: 0.12, dribbling: 0.08, shortPassing: 0.08,
  },
  RB: {
    pace: 0.16, acceleration: 0.12, tackling: 0.16, crossing: 0.14,
    stamina: 0.14, positioning: 0.12, dribbling: 0.08, shortPassing: 0.08,
  },
  DM: {
    tackling: 0.18, positioning: 0.16, shortPassing: 0.16, vision: 0.12,
    strength: 0.1, stamina: 0.12, longPassing: 0.1, aggression: 0.06,
  },
  CM: {
    shortPassing: 0.18, vision: 0.16, stamina: 0.14, dribbling: 0.12,
    longPassing: 0.12, technique: 0.1, tackling: 0.1, shooting: 0.08,
  },
  AM: {
    technique: 0.16, dribbling: 0.16, vision: 0.16, shortPassing: 0.14,
    shooting: 0.14, ballControl: 0.12, pace: 0.06, freeKick: 0.06,
  },
  LW: {
    pace: 0.18, dribbling: 0.18, technique: 0.14, crossing: 0.12,
    shooting: 0.12, acceleration: 0.12, ballControl: 0.08, stamina: 0.06,
  },
  RW: {
    pace: 0.18, dribbling: 0.18, technique: 0.14, crossing: 0.12,
    shooting: 0.12, acceleration: 0.12, ballControl: 0.08, stamina: 0.06,
  },
  ST: {
    shooting: 0.24, positioning: 0.16, heading: 0.12, ballControl: 0.12,
    pace: 0.12, acceleration: 0.08, strength: 0.08, dribbling: 0.08,
  },
};

export function calculateOverall(attributes: Attributes, position: Position): number {
  const weights = positionWeights[position];
  let sum = 0;
  let weightTotal = 0;
  for (const key of attributeOrder) {
    const w = weights[key] ?? 0.01;
    sum += attributes[key] * w;
    weightTotal += w;
  }
  return Math.round(sum / weightTotal);
}

export function keyAttributesForPosition(position: Position): AttributeKey[] {
  const weights = positionWeights[position];
  return Object.entries(weights)
    .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
    .slice(0, 6)
    .map(([k]) => k as AttributeKey);
}

export function emptyAttributes(base: number): Attributes {
  return {
    pace: base, acceleration: base, stamina: base, strength: base,
    technique: base, ballControl: base, dribbling: base, shortPassing: base,
    longPassing: base, crossing: base, shooting: base, penalties: base,
    freeKick: base, heading: base, tackling: base, positioning: base,
    aggression: base, vision: base, leadership: base,
  };
}
