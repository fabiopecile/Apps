import type { Player, RetirementSummary } from '../types';

export function buildRetirementSummary(player: Player): RetirementSummary {
  const awards: string[] = [];
  const totals = player.careerTotals;

  if (totals.clubsPlayed.length === 1) awards.push('One Club Player');
  if (totals.goals >= 300) awards.push('Jahrhundertspieler');
  if (totals.ballonDors >= 1) awards.push('Weltstar');
  if (totals.ballonDors >= 3) awards.push('Mr. Champions League');
  if (player.fanPopularity >= 85) awards.push('Fanliebling');
  if (player.milestones.some((m) => m.label === 'Vereinslegende')) awards.push('Vereinslegende');
  if (player.age <= 23 && player.marketValue > 60_000_000) awards.push('Golden Boy');
  if (totals.trophies >= 10) awards.push('Serial Winner');
  if (totals.appearances >= 500) awards.push('Eiserner Profi');
  if (awards.length === 0) awards.push('Ehrenwerter Profi');

  return { player, awards };
}

export const awardDescriptions: Record<string, string> = {
  'One Club Player': 'Der gesamten Karriere einem einzigen Verein treu geblieben.',
  'Jahrhundertspieler': 'Über 300 Karrieretore erzielt.',
  'Weltstar': 'Mindestens einen Ballon d\'Or gewonnen.',
  'Mr. Champions League': 'Mehrfacher Ballon d\'Or-Gewinner und Königsklassen-Ikone.',
  'Fanliebling': 'Von den Fans bis zuletzt geliebt.',
  'Vereinslegende': 'Status als Legende bei einem Verein erreicht.',
  'Golden Boy': 'Als junger Spieler bereits Weltklasse-Marktwert erreicht.',
  'Serial Winner': 'Zehn oder mehr Titel gewonnen.',
  'Eiserner Profi': 'Über 500 Profispiele bestritten.',
  'Ehrenwerter Profi': 'Eine solide, respektable Karriere abgeschlossen.',
};
