import type { Attributes, TrainingResult, TrainingType } from '../types';

export const trainingLabels: Record<TrainingType, string> = {
  sprint: 'Sprinttraining',
  passing: 'Passspiel',
  crossing: 'Flankentraining',
  freekick: 'Freistöße',
  penalty: 'Elfmeter',
  dribbling: 'Dribbling-Parcours',
  reaction: 'Reaktionstraining',
  shooting: 'Schusstraining',
};

export const trainingDescriptions: Record<TrainingType, string> = {
  sprint: 'Miss dein Timing über eine Serie von Sprints.',
  passing: 'Triff die bewegten Passfenster im richtigen Moment.',
  crossing: 'Timing für die perfekte Flanke in den Strafraum.',
  freekick: 'Ziele auf die Ecken des Tors bei ruhendem Ball.',
  penalty: 'Behalte in entscheidenden Momenten die Nerven.',
  dribbling: 'Steuere durch den Hütchenparcours ohne Tempoverlust.',
  reaction: 'Reagiere blitzschnell auf visuelle Reize.',
  shooting: 'Schließe Chancen aus verschiedenen Distanzen ab.',
};

const trainingAttributeMap: Record<TrainingType, (keyof Attributes)[]> = {
  sprint: ['pace', 'acceleration'],
  passing: ['shortPassing', 'vision'],
  crossing: ['crossing', 'technique'],
  freekick: ['freeKick', 'technique'],
  penalty: ['penalties'],
  dribbling: ['dribbling', 'ballControl'],
  reaction: ['positioning', 'stamina'],
  shooting: ['shooting', 'ballControl'],
};

export function gradeForScore(score: number): TrainingResult['grade'] {
  if (score >= 95) return 'perfect';
  if (score >= 80) return 'great';
  if (score >= 60) return 'good';
  if (score >= 35) return 'okay';
  return 'poor';
}

const gradeMultiplier: Record<TrainingResult['grade'], number> = {
  perfect: 1.0,
  great: 0.7,
  good: 0.45,
  okay: 0.2,
  poor: 0.02,
};

export function computeTrainingResult(type: TrainingType, score: number): TrainingResult {
  const grade = gradeForScore(score);
  const attrs = trainingAttributeMap[type];
  const gainPerAttr = gradeMultiplier[grade] * 1.4;
  const attributeGains: Partial<Attributes> = {};
  for (const key of attrs) {
    attributeGains[key] = Math.round(gainPerAttr * 10) / 10;
  }
  return { type, score, grade, attributeGains };
}

export const gradeLabels: Record<TrainingResult['grade'], string> = {
  perfect: 'Perfekt',
  great: 'Stark',
  good: 'Gut',
  okay: 'Okay',
  poor: 'Schwach',
};
