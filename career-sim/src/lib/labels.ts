import type { CompetitionType, InjuryType } from '../types';

export function injuryEmoji(type: InjuryType): string {
  switch (type) {
    case 'muscle_strain': return '🦵';
    case 'acl_tear': return '🦴';
    case 'meniscus': return '🦵';
    case 'ankle_sprain': return '🦶';
    case 'shoulder_dislocation': return '💪';
    case 'concussion': return '🤕';
    default: return '🏥';
  }
}

export const competitionLabels: Record<CompetitionType, string> = {
  league: 'Liga',
  domestic_cup: 'Pokal',
  continental_cup: 'Königsklasse',
  national_friendly: 'Länderspiel',
  national_qualifier: 'Qualifikation',
  national_tournament: 'Turnier',
};
