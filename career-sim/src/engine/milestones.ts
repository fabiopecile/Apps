import type { Milestone, Player } from '../types';

export function checkMilestones(
  player: Player,
  season: number,
  week: number,
  context: { isDebut?: boolean; isFirstGoal?: boolean; isFirstCap?: boolean },
): Milestone[] {
  const found: Milestone[] = [];
  const push = (label: string, description: string, icon: string) => {
    found.push({ id: crypto.randomUUID(), season, week, label, description, icon });
  };

  if (context.isDebut) push('Profidebüt', `${player.name} gibt sein Profidebüt.`, '⚽');
  if (context.isFirstGoal) push('Erstes Tor', `${player.name} erzielt sein erstes Profitor.`, '🥅');
  if (context.isFirstCap) push('Länderspieldebüt', `${player.name} debütiert für die Nationalmannschaft.`, '🏳️');

  const apps = player.careerTotals.appearances;
  if ([100, 250, 500].includes(apps)) {
    push(`${apps} Spiele`, `${player.name} bestreitet sein ${apps}. Profispiel.`, '📅');
  }
  const goals = player.careerTotals.goals;
  if ([50, 100, 200, 300].includes(goals)) {
    push(`${goals} Tore`, `${player.name} erzielt sein ${goals}. Karrieretor.`, '🎯');
  }
  if (player.squadRole === 'star' && !player.milestones.some((m) => m.label === 'Kapitän')) {
    // handled separately when captaincy granted
  }

  return found;
}

export function captainMilestone(player: Player, season: number, week: number): Milestone {
  return {
    id: crypto.randomUUID(), season, week,
    label: 'Kapitän', description: `${player.name} wird zum Mannschaftskapitän ernannt.`, icon: '🎖️',
  };
}

export function legendMilestone(player: Player, season: number, week: number): Milestone {
  return {
    id: crypto.randomUUID(), season, week,
    label: 'Vereinslegende', description: `${player.name} erreicht Legendenstatus.`, icon: '🏆',
  };
}
