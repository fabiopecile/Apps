import type { Player, TransferOffer } from '../types';
import { clubs, getClub } from '../data/clubs';
import { calculateOverall } from './attributes';
import { calculateMarketValue } from './marketValue';
import { chance, clamp, randInt } from './rng';

export function generateTransferOffers(player: Player, week: number): TransferOffer[] {
  const overall = calculateOverall(player.attributes, player.position);
  const currentClub = getClub(player.clubId);
  const value = calculateMarketValue(player);

  const candidates = clubs
    .filter((c) => c.id !== player.clubId)
    .filter((c) => Math.abs(c.reputation - overall) < 30)
    .filter(() => chance(0.35));

  const offers: TransferOffer[] = candidates.slice(0, 3).map((club) => {
    const upgrade = club.reputation > currentClub.reputation;
    const fee = Math.round(value * (0.85 + Math.random() * 0.5));
    const salary = clamp(
      Math.round(player.weeklyWage * (upgrade ? 1.2 + Math.random() * 0.5 : 0.9 + Math.random() * 0.3)),
      300,
      500_000,
    );
    return {
      id: crypto.randomUUID(),
      clubId: club.id,
      clubName: club.name,
      fee,
      salaryPerWeek: salary,
      years: randInt(2, 5),
      squadNumber: randInt(2, 33),
      startingXiGuarantee: chance(club.reputation < currentClub.reputation ? 0.7 : 0.35),
      signingBonus: Math.round(fee * 0.03),
      releaseClause: chance(0.4) ? Math.round(fee * randInt(2, 4)) : null,
      deadlineWeek: week + randInt(2, 5),
      reason: upgrade
        ? `${club.name} sieht dich als Verstärkung für den nächsten Schritt.`
        : `${club.name} bietet dir eine tragende Rolle im Kader.`,
    };
  });

  return offers;
}

export interface NegotiationRequest {
  salaryAskPct: number; // -0.2..0.5 relative change requested
  wantsReleaseClauseRemoved: boolean;
  wantsStartingXi: boolean;
  wantsMoreYears: number; // delta years
}

export function negotiateOffer(offer: TransferOffer, request: NegotiationRequest, playerLeverage: number): TransferOffer {
  // playerLeverage 0-100: reputation-driven bargaining power
  const acceptChance = clamp(0.4 + playerLeverage / 150 - Math.abs(request.salaryAskPct), 0.1, 0.9);
  const accepted = chance(acceptChance);

  if (!accepted) {
    return offer;
  }

  return {
    ...offer,
    salaryPerWeek: Math.round(offer.salaryPerWeek * (1 + request.salaryAskPct)),
    startingXiGuarantee: request.wantsStartingXi ? true : offer.startingXiGuarantee,
    releaseClause: request.wantsReleaseClauseRemoved ? null : offer.releaseClause,
    years: offer.years + request.wantsMoreYears,
  };
}

export function generateContractRenewal(player: Player): TransferOffer {
  const club = getClub(player.clubId);
  const value = calculateMarketValue(player);
  return {
    id: crypto.randomUUID(),
    clubId: club.id,
    clubName: club.name,
    fee: 0,
    salaryPerWeek: Math.round(player.weeklyWage * (1.1 + Math.random() * 0.4)),
    years: randInt(2, 4),
    squadNumber: player.contract.squadNumber,
    startingXiGuarantee: player.squadRole === 'star' || player.squadRole === 'starter',
    signingBonus: Math.round(value * 0.02),
    releaseClause: chance(0.5) ? Math.round(value * randInt(2, 3)) : null,
    deadlineWeek: 999,
    reason: `${club.name} möchte deinen Vertrag verlängern.`,
  };
}
