import type { Player, Teammate } from '../types';
import { calculateOverall } from './attributes';
import { clamp, randInt } from './rng';

export function updateSquadRole(player: Player): Player['squadRole'] {
  const overall = calculateOverall(player.attributes, player.position);
  const peers = player.teammates.filter((t) => t.position === player.position);
  const avgPeerOverall = peers.length
    ? peers.reduce((s, t) => s + t.overall, 0) / peers.length
    : overall;

  if (player.coachTrust > 75 && overall >= avgPeerOverall + 4) return 'star';
  if (player.coachTrust > 55 && overall >= avgPeerOverall - 4) return 'starter';
  if (player.coachTrust > 32) return 'rotation';
  return 'backup';
}

export function driftTeammateRelationships(teammates: Teammate[]): Teammate[] {
  if (teammates.length === 0 || Math.random() > 0.4) return teammates;
  const idx = randInt(0, teammates.length - 1);
  return teammates.map((t, i) => {
    if (i !== idx) return t;
    const delta = t.relationshipType === 'rival' || t.relationshipType === 'conflict'
      ? randInt(-6, 3)
      : randInt(-3, 6);
    const relationship = clamp(t.relationship + delta, -100, 100);
    let relationshipType = t.relationshipType;
    if (relationship > 65) relationshipType = 'best_friend';
    else if (relationship > 20) relationshipType = 'friend';
    else if (relationship < -50) relationshipType = 'conflict';
    else if (relationship < -15) relationshipType = 'rival';
    else if (t.relationshipType !== 'mentor') relationshipType = 'neutral';
    return { ...t, relationship, relationshipType };
  });
}

export const relationshipLabels: Record<Teammate['relationshipType'], string> = {
  best_friend: 'Beste Freunde',
  friend: 'Freund',
  neutral: 'Neutral',
  rival: 'Konkurrenz',
  mentor: 'Mentor',
  conflict: 'Streit',
};
