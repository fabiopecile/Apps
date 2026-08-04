import type { Injury, InjuryType } from '../types';
import { pick, randInt } from './rng';

interface InjuryTemplate {
  type: InjuryType;
  label: string;
  weeksRange: [number, number];
  severity: Injury['severity'];
}

const injuryTemplates: InjuryTemplate[] = [
  { type: 'muscle_strain', label: 'Muskelfaserriss', weeksRange: [2, 5], severity: 'minor' },
  { type: 'ankle_sprain', label: 'Verstauchter Knöchel', weeksRange: [1, 4], severity: 'minor' },
  { type: 'shoulder_dislocation', label: 'Schulterverletzung', weeksRange: [4, 8], severity: 'moderate' },
  { type: 'meniscus', label: 'Meniskusriss', weeksRange: [6, 12], severity: 'moderate' },
  { type: 'concussion', label: 'Gehirnerschütterung', weeksRange: [1, 3], severity: 'minor' },
  { type: 'acl_tear', label: 'Kreuzbandriss', weeksRange: [24, 36], severity: 'severe' },
];

export function rollRandomInjury(severityBias: 'low' | 'normal' | 'high' = 'normal'): Injury {
  let pool = injuryTemplates;
  if (severityBias === 'low') {
    pool = injuryTemplates.filter((t) => t.severity !== 'severe');
  }
  if (severityBias === 'high') {
    pool = injuryTemplates.filter((t) => t.severity !== 'minor');
  }
  const template = pick(pool);
  const weeks = randInt(template.weeksRange[0], template.weeksRange[1]);
  return {
    type: template.type,
    label: template.label,
    weeksOut: weeks,
    weeksRemaining: weeks,
    severity: template.severity,
  };
}
