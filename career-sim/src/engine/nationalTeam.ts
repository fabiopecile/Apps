import type { Player } from '../types';
import { calculateOverall } from './attributes';
import { chance, clamp } from './rng';

export function evaluateNationalCallUp(player: Player): { called: boolean; trustDelta: number } {
  const overall = calculateOverall(player.attributes, player.position);
  const form = player.form;
  const score = overall + form * 2 + player.fanPopularity / 10;

  const threshold = player.nationalTeam.called ? 55 : 68;
  const called = score > threshold && chance(0.5 + (score - threshold) / 100);

  const trustDelta = called ? clamp(2 + form, -3, 8) : player.nationalTeam.called ? -4 : 0;
  return { called, trustDelta };
}

export function nationalMatchStrengthModifier(managerTrust: number): number {
  return managerTrust > 70 ? 1.05 : managerTrust < 30 ? 0.92 : 1;
}
