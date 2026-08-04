import type { PersonalityTraits, PersonalityType } from '../types';
import { clamp } from './rng';

export function defaultTraits(): PersonalityTraits {
  return {
    professionalism: 50,
    arrogance: 30,
    loyalty: 50,
    greed: 30,
    temper: 30,
    charisma: 50,
  };
}

export function applyTraitDelta(
  traits: PersonalityTraits,
  delta: Partial<PersonalityTraits>,
): PersonalityTraits {
  const next = { ...traits };
  for (const key of Object.keys(delta) as (keyof PersonalityTraits)[]) {
    next[key] = clamp(next[key] + (delta[key] ?? 0), 0, 100);
  }
  return next;
}

export function derivePersonalityType(
  traits: PersonalityTraits,
  reputation: number,
  loyaltyYearsAtClub: number,
): PersonalityType {
  const { professionalism, arrogance, loyalty, greed, temper, charisma } = traits;

  if (temper > 70 && professionalism < 45) return 'badboy';
  if (reputation > 85 && arrogance > 60 && charisma > 55) return 'superstar';
  if (loyalty > 75 && loyaltyYearsAtClub >= 5) return 'legend';
  if (greed > 70 && loyalty < 40) return 'money_hunter';
  if (charisma > 65 && professionalism > 60 && arrogance < 45) return 'leader';
  if (professionalism > 70 && arrogance < 35 && temper < 35) return 'gentleman';
  if (professionalism > 65 && charisma < 45 && arrogance < 40) return 'quiet_pro';
  return 'balanced';
}

export const personalityLabels: Record<PersonalityType, string> = {
  leader: 'Leader',
  legend: 'Vereinslegende',
  gentleman: 'Gentleman',
  badboy: 'Bad Boy',
  quiet_pro: 'Ruhiger Profi',
  superstar: 'Superstar',
  money_hunter: 'Geldjäger',
  balanced: 'Ausgeglichen',
};

export const personalityDescriptions: Record<PersonalityType, string> = {
  leader: 'Führt die Mannschaft durch Beispiel und Worte. Mitspieler und Trainer vertrauen dir.',
  legend: 'Ein treuer Diener des Vereins – die Fans lieben dich für die Ewigkeit.',
  gentleman: 'Fair, bescheiden und respektiert von Fans und Medien.',
  badboy: 'Impulsiv und unberechenbar – Schlagzeilen sind dir sicher, im guten wie im schlechten.',
  quiet_pro: 'Lässt Leistung sprechen statt große Worte. Solide und verlässlich.',
  superstar: 'Glamourös und selbstbewusst – Sponsoren lieben dein Standing.',
  money_hunter: 'Verhandelt hart und wechselt dorthin, wo das Geld am größten ist.',
  balanced: 'Noch unbeschrieben – deine Entscheidungen formen erst deinen Charakter.',
};

export function personalitySponsorMultiplier(type: PersonalityType): number {
  switch (type) {
    case 'superstar': return 1.5;
    case 'leader': return 1.2;
    case 'gentleman': return 1.15;
    case 'legend': return 1.25;
    case 'money_hunter': return 1.1;
    case 'quiet_pro': return 0.9;
    case 'badboy': return 0.75;
    default: return 1.0;
  }
}

export function personalityFanMultiplier(type: PersonalityType): number {
  switch (type) {
    case 'legend': return 1.4;
    case 'leader': return 1.2;
    case 'superstar': return 1.3;
    case 'gentleman': return 1.1;
    case 'badboy': return 1.05; // notoriety still draws attention
    case 'money_hunter': return 0.8;
    default: return 1.0;
  }
}
