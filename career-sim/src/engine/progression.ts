import type { Attributes, Player } from '../types';
import { calculateOverall } from './attributes';
import { clamp, randFloat } from './rng';

// Called at season end: growth toward potential while young, decline once past peak.
export function applySeasonalDevelopment(player: Player): Attributes {
  const overall = calculateOverall(player.attributes, player.position);
  const next = { ...player.attributes };
  const keys = Object.keys(next) as (keyof Attributes)[];

  let trend: number;
  if (player.age <= 22) trend = randFloat(1.5, 3.5);
  else if (player.age <= 27) trend = randFloat(0.3, 1.8);
  else if (player.age <= 30) trend = randFloat(-0.5, 0.8);
  else if (player.age <= 33) trend = randFloat(-2.5, -0.5);
  else trend = randFloat(-4.5, -1.5);

  const roomToGrow = player.potential - overall;
  const growthFactor = trend > 0 ? clamp(roomToGrow / 20, 0.1, 1.2) : 1;

  for (const key of keys) {
    const delta = trend * growthFactor * randFloat(0.6, 1.3);
    next[key] = clamp(Math.round((next[key] + delta) * 10) / 10, 15, 99);
  }

  return next;
}

export function weeklyRecovery(player: Player): { fitness: number; fatigue: number } {
  const fitnessRecoveryRate = player.injury ? 4 : 14;
  const fatigueRecoveryRate = player.injury ? 8 : 18;
  return {
    fitness: clamp(player.fitness + fitnessRecoveryRate, 0, 100),
    fatigue: clamp(player.fatigue - fatigueRecoveryRate, 0, 100),
  };
}
