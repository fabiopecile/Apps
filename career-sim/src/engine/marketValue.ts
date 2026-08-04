import type { Player } from '../types';
import { calculateOverall } from './attributes';
import { clamp } from './rng';

export function calculateMarketValue(player: Player): number {
  const overall = calculateOverall(player.attributes, player.position);
  const ageFactor = ageMultiplier(player.age);
  const potentialFactor = 1 + Math.max(0, player.potential - overall) / 100;
  const formFactor = 1 + player.form / 25;
  const fitnessFactor = player.injury ? 0.85 : 1;
  const reputationFactor = 1 + player.fanPopularity / 250;
  const trophyFactor = 1 + player.careerTotals.trophies * 0.02;
  const nationalFactor = player.nationalTeam.called ? 1 + player.nationalTeam.caps / 300 : 1;
  const mediaFactor = clamp(1 + player.mediaImage / 400, 0.7, 1.3);

  const base = Math.pow(Math.max(overall - 40, 1), 3.1) * 55;

  const value =
    base *
    ageFactor *
    potentialFactor *
    formFactor *
    fitnessFactor *
    reputationFactor *
    trophyFactor *
    nationalFactor *
    mediaFactor;

  return Math.round(clamp(value, 15_000, 320_000_000) / 1000) * 1000;
}

function ageMultiplier(age: number): number {
  if (age <= 20) return 1.35;
  if (age <= 24) return 1.5;
  if (age <= 27) return 1.3;
  if (age <= 30) return 0.95;
  if (age <= 33) return 0.6;
  if (age <= 36) return 0.32;
  return 0.15;
}

export function formatMoney(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return `€${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `€${(value / 1_000).toFixed(0)}K`;
  }
  return `€${Math.round(value)}`;
}
