import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  BallonDorResult, GameEventLogEntry, GameState, MatchResult, Player,
  ResponseTone, ScreenId, SeasonStatLine, TrainingResult, TrainingType,
} from '../types';
import { getClub, leagueOfClub } from '../data/clubs';
import { randomNation } from '../data/nations';
import { createPlayer, generateTeammates } from '../engine/playerFactory';
import type { CreationInput } from '../engine/playerFactory';
import { applyMatchToPlayer } from '../engine/applyMatch';
import { evaluateBallonDor } from '../engine/ballondor';
import { rollRandomInjury } from '../engine/injuries';
import { simulateMatch } from '../engine/match';
import { evaluateNationalCallUp } from '../engine/nationalTeam';
import { evaluatePressResponse } from '../engine/press';
import type { PressResponseEffect } from '../engine/press';
import { derivePersonalityType, applyTraitDelta } from '../engine/personality';
import { applySeasonalDevelopment, weeklyRecovery } from '../engine/progression';
import { rollRandomEvent } from '../engine/randomEvents';
import {
  generateSeasonFixtures, isInternationalWeek, isTransferWindow,
  OFFSEASON_WEEKS, PRESEASON_WEEKS, rollSeasonTrophies, SEASON_END_WEEKS,
  SEASON_LENGTH_WEEKS, weekPhaseLabel,
} from '../engine/season';
import { driftTeammateRelationships, updateSquadRole } from '../engine/squad';
import { computeTrainingResult } from '../engine/training';
import { generateContractRenewal, generateTransferOffers, negotiateOffer } from '../engine/transfers';
import type { NegotiationRequest } from '../engine/transfers';
import { calculateOverall } from '../engine/attributes';
import { calculateMarketValue } from '../engine/marketValue';
import { buildRetirementSummary } from '../engine/retirement';
import { legendMilestone, captainMilestone } from '../engine/milestones';
import { clamp, chance } from '../engine/rng';
import { weeklyExpenses, weeklyIncome } from '../engine/finances';
import { properties, cars, watches, pets, investmentOptions } from '../data/lifestyle';
import { sponsorPool } from '../data/sponsors';

interface TransientState {
  trainingsUsedThisWeek: number;
  seasonsAtClub: number;
  lastMatch: MatchResult | null;
  lastMatchIsNational: boolean;
  lastBallonDor: BallonDorResult | null;
  activeNewsId: string | null;
  pendingRetirementPrompt: boolean;
}

export interface StoreState extends GameState, TransientState {
  startCareer: (input: CreationInput) => void;
  goToScreen: (screen: ScreenId) => void;
  advanceWeek: () => void;
  acknowledgeMatch: () => void;
  respondToPress: (newsId: string, tone: ResponseTone) => void;
  startTraining: (type: TrainingType) => void;
  completeTraining: (score: number) => void;
  cancelTraining: () => void;
  acceptOffer: (offerId: string) => void;
  declineOffer: (offerId: string) => void;
  negotiate: (offerId: string, request: NegotiationRequest) => void;
  acceptRenewal: () => void;
  requestRenewal: () => void;
  signSponsor: (sponsorId: string) => void;
  buyAsset: (kind: 'property' | 'car' | 'watch' | 'pet', id: string) => void;
  makeInvestment: (id: string, amount: number) => void;
  getPartner: () => void;
  startFamily: () => void;
  retireNow: () => void;
  dismissRetirementPrompt: () => void;
  newGame: () => void;
}

function freshState(): GameState & TransientState {
  return {
    createdAt: Date.now(),
    player: null,
    season: 1,
    week: 1,
    phase: 'preseason',
    fixtures: [],
    seasonMatches: [],
    allMatches: [],
    news: [],
    eventLog: [],
    pendingOffers: [],
    pendingTrainingType: null,
    recordsBook: [],
    screen: 'intro',
    lastRetirementSummary: null,
    rngSeed: Math.floor(Math.random() * 1_000_000),
    trainingsUsedThisWeek: 0,
    seasonsAtClub: 0,
    lastMatch: null,
    lastMatchIsNational: false,
    lastBallonDor: null,
    activeNewsId: null,
    pendingRetirementPrompt: false,
  };
}

function refreshPlayerDerived(player: Player): Player {
  const next = { ...player };
  next.marketValue = calculateMarketValue(next);
  next.squadRole = updateSquadRole(next);
  next.personalityType = derivePersonalityType(
    next.traits,
    calculateOverall(next.attributes, next.position),
    0,
  );
  next.happiness = clamp(
    40 +
      next.assets.reduce((s, a) => s + a.happinessBonus, 0) +
      (next.hasPartner ? 8 : 0) +
      (next.hasFamily ? 10 : 0) +
      next.pets * 3 +
      (next.morale - 50) / 4,
    0,
    100,
  );
  return next;
}

export const useGameStore = create<StoreState>()(
  persist(
    (set, get) => ({
      ...freshState(),

      newGame: () => set(freshState()),

      startCareer: (input) => {
        const player = refreshPlayerDerived(createPlayer(input));
        const fixtures = generateSeasonFixtures(player);
        set({
          ...freshState(),
          player,
          fixtures,
          screen: 'hub',
        });
      },

      goToScreen: (screen) => set({ screen }),

      advanceWeek: () => {
        const state = get();
        if (!state.player || state.player.retired) return;
        let player = { ...state.player };
        const { season } = state;
        const week = state.week;

        // Injury weekly tick
        if (player.injury) {
          const weeksRemaining = player.injury.weeksRemaining - 1;
          player.injury = weeksRemaining <= 0 ? null : { ...player.injury, weeksRemaining };
        }

        // Recovery + finances
        const rec = weeklyRecovery(player);
        player.fitness = rec.fitness;
        player.fatigue = rec.fatigue;
        player.bankBalance += weeklyIncome(player) - weeklyExpenses(player);
        player.careerTotals = { ...player.careerTotals, moneyEarned: player.careerTotals.moneyEarned + weeklyIncome(player) };
        player.teammates = driftTeammateRelationships(player.teammates);

        const international = isInternationalWeek(week);
        const fixture = state.fixtures.find((f) => f.week === week && !f.played);

        if (international) {
          const { called, trustDelta } = evaluateNationalCallUp(player);
          player.nationalTeam = {
            ...player.nationalTeam,
            called,
            managerTrust: clamp(player.nationalTeam.managerTrust + trustDelta, 0, 100),
          };

          if (called) {
            const opponentNation = randomNation();
            const match = simulateMatch({
              player,
              competition: 'national_friendly',
              competitionName: 'Länderspiel',
              home: chance(0.5),
              season,
              opponentStrength: clamp(opponentNation.strength + Math.random() * 10 - 5, 20, 99),
              opponentNameOverride: opponentNation.name,
            });
            const outcome = applyMatchToPlayer(player, match, season, week, true);
            player = outcome.player;
            if (match.injuryOccurred) {
              player.injury = rollRandomInjury('low');
            }
            set({
              player: refreshPlayerDerived(player),
              lastMatch: match,
              lastMatchIsNational: true,
              allMatches: [...state.allMatches, match],
              screen: 'match',
            });
            return;
          }
          set({ player: refreshPlayerDerived(player) });
          finalizeWeek(set, get);
          return;
        }

        if (fixture) {
          const club = getClub(player.clubId);
          let strengthBonus = 0;
          if (fixture.competition === 'continental_cup') strengthBonus = 10;
          if (fixture.competition === 'domestic_cup') strengthBonus = -3;
          const opponentStrength = clamp(club.reputation + (Math.random() * 50 - 25) + strengthBonus, 22, 99);

          const match = simulateMatch({
            player,
            competition: fixture.competition,
            competitionName: fixture.competitionName,
            home: fixture.home,
            season,
            opponentStrength,
            opponentNameOverride: fixture.opponent,
            opponentBadgeColorOverride: fixture.opponentBadgeColor,
          });

          const outcome = applyMatchToPlayer(player, match, season, week, false);
          player = outcome.player;
          if (match.injuryOccurred) {
            player.injury = rollRandomInjury('normal');
          }

          if (
            player.squadRole !== 'star' &&
            updateSquadRole(player) === 'star' &&
            !player.milestones.some((m) => m.label === 'Kapitän') &&
            player.coachTrust > 85 &&
            chance(0.15)
          ) {
            player.milestones = [...player.milestones, captainMilestone(player, season, week)];
          }
          player.squadRole = updateSquadRole(player);

          const updatedFixtures = state.fixtures.map((f) =>
            f.week === week ? { ...f, played: true } : f,
          );

          set({
            player: refreshPlayerDerived(player),
            fixtures: updatedFixtures,
            seasonMatches: [...state.seasonMatches, match],
            allMatches: [...state.allMatches, match],
            news: [...state.news, ...outcome.news],
            lastMatch: match,
            lastMatchIsNational: false,
            screen: 'match',
          });
          return;
        }

        set({ player: refreshPlayerDerived(player) });
        finalizeWeek(set, get);
      },

      acknowledgeMatch: () => {
        const state = get();
        const unresolved = state.news.find((n) => n.requiresResponse && !n.responded);
        set({ lastMatch: null, screen: unresolved ? 'press' : 'hub' });
        finalizeWeek(set, get);
      },

      respondToPress: (newsId, tone) => {
        const state = get();
        if (!state.player) return;
        const item = state.news.find((n) => n.id === newsId);
        if (!item) return;
        const effect: PressResponseEffect = evaluatePressResponse(tone, item.tone);
        let player = { ...state.player };
        player.fanPopularity = clamp(player.fanPopularity + effect.fanPopularityDelta, 0, 100);
        player.mediaImage = clamp(player.mediaImage + effect.mediaImageDelta, -100, 100);
        player.coachTrust = clamp(player.coachTrust + effect.coachTrustDelta, 0, 100);
        player.morale = clamp(player.morale + effect.moraleDelta, 0, 100);
        player.traits = applyTraitDelta(player.traits, effect.traitDelta);
        player = refreshPlayerDerived(player);

        const news = state.news.map((n) => (n.id === newsId ? { ...n, responded: true } : n));
        const stillPending = news.find((n) => n.requiresResponse && !n.responded);
        set({ player, news, screen: stillPending ? 'press' : 'hub' });
      },

      startTraining: (type) => set({ pendingTrainingType: type, screen: 'training' }),
      cancelTraining: () => set({ pendingTrainingType: null, screen: 'hub' }),

      completeTraining: (score) => {
        const state = get();
        if (!state.player || !state.pendingTrainingType) return;
        const result: TrainingResult = computeTrainingResult(state.pendingTrainingType, score);
        let player = { ...state.player };
        const attrs = { ...player.attributes };
        for (const key of Object.keys(result.attributeGains) as (keyof typeof attrs)[]) {
          const gain = result.attributeGains[key] ?? 0;
          attrs[key] = clamp(Math.round((attrs[key] + gain) * 10) / 10, 15, 99);
        }
        player.attributes = attrs;
        player.fatigue = clamp(player.fatigue + 8, 0, 100);
        player.morale = clamp(player.morale + (result.grade === 'perfect' || result.grade === 'great' ? 2 : 0), 0, 100);
        player = refreshPlayerDerived(player);

        set({
          player,
          trainingsUsedThisWeek: state.trainingsUsedThisWeek + 1,
          pendingTrainingType: null,
          screen: 'hub',
        });
      },

      acceptOffer: (offerId) => {
        const state = get();
        if (!state.player) return;
        const offer = state.pendingOffers.find((o) => o.id === offerId);
        if (!offer) return;
        let player = { ...state.player };
        const newClub = getClub(offer.clubId);
        player.clubId = offer.clubId;
        player.contract = {
          clubId: offer.clubId,
          salaryPerWeek: offer.salaryPerWeek,
          yearsLeft: offer.years,
          squadNumber: offer.squadNumber,
          releaseClause: offer.releaseClause,
          bonusPerGoal: 0,
          startingXiGuarantee: offer.startingXiGuarantee,
          signingBonus: offer.signingBonus,
        };
        player.weeklyWage = offer.salaryPerWeek;
        player.bankBalance += offer.signingBonus;
        player.coachTrust = 55;
        player.squadRole = 'starter';
        player.teammates = generateTeammates(offer.clubId, player.position);
        player.careerTotals = {
          ...player.careerTotals,
          clubsPlayed: player.careerTotals.clubsPlayed.includes(newClub.name)
            ? player.careerTotals.clubsPlayed
            : [...player.careerTotals.clubsPlayed, newClub.name],
        };
        player = refreshPlayerDerived(player);

        const fixtures = generateSeasonFixtures(player).filter((f) => f.week > state.week);
        const remainingOldFixtures = state.fixtures.filter((f) => f.week <= state.week);

        set({
          player,
          fixtures: [...remainingOldFixtures, ...fixtures],
          pendingOffers: [],
          seasonsAtClub: 0,
          screen: 'hub',
        });
      },

      declineOffer: (offerId) => {
        const state = get();
        set({ pendingOffers: state.pendingOffers.filter((o) => o.id !== offerId) });
      },

      negotiate: (offerId, request) => {
        const state = get();
        if (!state.player) return;
        const offer = state.pendingOffers.find((o) => o.id === offerId);
        if (!offer) return;
        const leverage = clamp(
          calculateOverall(state.player.attributes, state.player.position) + state.player.fanPopularity / 3,
          0,
          100,
        );
        const updated = negotiateOffer(offer, request, leverage);
        set({
          pendingOffers: state.pendingOffers.map((o) => (o.id === offerId ? updated : o)),
        });
      },

      requestRenewal: () => {
        const state = get();
        if (!state.player) return;
        const renewal = generateContractRenewal(state.player);
        set({ pendingOffers: [...state.pendingOffers.filter((o) => o.clubId !== renewal.clubId), renewal] });
      },

      acceptRenewal: () => {
        const state = get();
        if (!state.player) return;
        const renewal = state.pendingOffers.find((o) => o.clubId === state.player!.clubId);
        if (!renewal) return;
        let player = { ...state.player };
        player.contract = {
          ...player.contract,
          salaryPerWeek: renewal.salaryPerWeek,
          yearsLeft: renewal.years,
          startingXiGuarantee: renewal.startingXiGuarantee,
          releaseClause: renewal.releaseClause,
          signingBonus: renewal.signingBonus,
        };
        player.weeklyWage = renewal.salaryPerWeek;
        player.bankBalance += renewal.signingBonus;
        player.traits = applyTraitDelta(player.traits, { loyalty: 6 });
        player = refreshPlayerDerived(player);
        set({ player, pendingOffers: state.pendingOffers.filter((o) => o.id !== renewal.id) });
      },

      signSponsor: (sponsorId) => {
        const state = get();
        if (!state.player) return;
        const seed = sponsorPool.find((s) => s.id === sponsorId);
        if (!seed) return;
        if (state.player.sponsors.some((s) => s.id === sponsorId)) return;
        let player = { ...state.player };
        player.sponsors = [
          ...player.sponsors,
          {
            id: seed.id,
            name: seed.name,
            tier: seed.tier,
            weeklyIncome: seed.baseWeeklyIncome,
            requiredReputation: seed.requiredReputation,
            signedOnSeason: state.season,
          },
        ];
        player = refreshPlayerDerived(player);
        set({ player });
      },

      buyAsset: (kind, id) => {
        const state = get();
        if (!state.player) return;
        const pool = kind === 'property' ? properties : kind === 'car' ? cars : kind === 'watch' ? watches : pets;
        const seed = pool.find((p) => p.id === id) as
          | (typeof properties)[number]
          | (typeof cars)[number]
          | (typeof watches)[number]
          | (typeof pets)[number]
          | undefined;
        if (!seed || state.player.bankBalance < seed.price) return;
        let player = { ...state.player };
        player.bankBalance -= seed.price;
        player.assets = [
          ...player.assets,
          {
            id: `${kind}-${id}-${Date.now()}`,
            name: seed.name,
            type: kind,
            tier: 'tier' in seed ? seed.tier : 'standard',
            value: seed.price,
            happinessBonus: seed.happiness,
          },
        ];
        if (kind === 'pet') player.pets += 1;
        player = refreshPlayerDerived(player);
        set({ player });
      },

      makeInvestment: (id, amount) => {
        const state = get();
        if (!state.player) return;
        const seed = investmentOptions.find((i) => i.id === id);
        if (!seed || amount < seed.minInvest || state.player.bankBalance < amount) return;
        let player = { ...state.player };
        player.bankBalance -= amount;
        player.investments = [
          ...player.investments,
          {
            id: `${id}-${Date.now()}`,
            name: seed.name,
            type: seed.type,
            invested: amount,
            weeklyReturn: Math.round(amount * seed.weeklyReturnPct / 100),
            risk: seed.risk,
            foundedSeason: state.season,
          },
        ];
        player = refreshPlayerDerived(player);
        set({ player });
      },

      getPartner: () => {
        const state = get();
        if (!state.player || state.player.hasPartner) return;
        let player = { ...state.player, hasPartner: true };
        player = refreshPlayerDerived(player);
        set({ player });
      },

      startFamily: () => {
        const state = get();
        if (!state.player || !state.player.hasPartner || state.player.hasFamily) return;
        let player = { ...state.player, hasFamily: true };
        player.traits = applyTraitDelta(player.traits, { professionalism: 4 });
        player = refreshPlayerDerived(player);
        set({ player });
      },

      retireNow: () => {
        const state = get();
        if (!state.player) return;
        const summary = buildRetirementSummary(state.player);
        set({
          player: { ...state.player, retired: true },
          lastRetirementSummary: summary,
          screen: 'retirement',
          pendingRetirementPrompt: false,
        });
      },

      dismissRetirementPrompt: () => set({ pendingRetirementPrompt: false }),
    }),
    {
      name: 'career-sim-save',
      version: 1,
    },
  ),
);

function finalizeWeek(set: (partial: Partial<StoreState>) => void, get: () => StoreState) {
  const state = get();
  if (!state.player) return;
  let player = { ...state.player };
  const season = state.season;
  let week = state.week;

  const event = rollRandomEvent(player, season, week);
  const eventLog: GameEventLogEntry[] = event ? [...state.eventLog, event] : state.eventLog;

  let pendingOffers = state.pendingOffers;
  if (isTransferWindow(week) && chance(0.3) && pendingOffers.length < 3) {
    pendingOffers = [...pendingOffers, ...generateTransferOffers(player, week)];
  }

  week += 1;

  if (week > SEASON_LENGTH_WEEKS) {
    const club = getClub(player.clubId);
    const league = leagueOfClub(player.clubId);
    const trophies = rollSeasonTrophies(state.seasonMatches, club, league);

    const seasonLine: SeasonStatLine = {
      season,
      clubName: club.name,
      appearances: state.seasonMatches.filter((m) => m.competition !== 'national_friendly').length,
      goals: state.seasonMatches.reduce((s, m) => s + m.playerStats.goals, 0),
      assists: state.seasonMatches.reduce((s, m) => s + m.playerStats.assists, 0),
      yellow: state.seasonMatches.filter((m) => m.playerStats.yellow).length,
      red: state.seasonMatches.filter((m) => m.playerStats.red).length,
      avgRating: state.seasonMatches.length
        ? Math.round(
            (state.seasonMatches.reduce((s, m) => s + m.playerStats.rating, 0) / state.seasonMatches.length) * 10,
          ) / 10
        : 0,
      trophies,
    };

    player.careerLog = [...player.careerLog, seasonLine];
    player.careerTotals = { ...player.careerTotals, trophies: player.careerTotals.trophies + trophies.length };

    const ballonDor = evaluateBallonDor(player, season);
    if (ballonDor.rank === 1) {
      player.careerTotals = { ...player.careerTotals, ballonDors: player.careerTotals.ballonDors + 1 };
    }
    player.ballonDorHistory = [...player.ballonDorHistory, ballonDor];

    player.attributes = applySeasonalDevelopment(player);
    player.age += 1;

    const seasonsAtClub = state.seasonsAtClub + 1;
    if (
      seasonsAtClub >= 6 &&
      player.coachTrust > 70 &&
      player.fanPopularity > 65 &&
      !player.milestones.some((m) => m.label === 'Vereinslegende')
    ) {
      player.milestones = [...player.milestones, legendMilestone(player, season, week)];
    }

    player = refreshPlayerDerived(player);

    const nextSeason = season + 1;
    const fixtures = generateSeasonFixtures(player);
    const forceRetire = player.age >= 41;
    const promptRetire = player.age >= 34 && chance(0.4 + (player.age - 34) * 0.08);

    if (forceRetire) {
      const summary = buildRetirementSummary({ ...player, retired: true });
      set({
        player: { ...player, retired: true },
        season: nextSeason,
        week: 1,
        phase: 'preseason',
        fixtures: [],
        seasonMatches: [],
        eventLog,
        pendingOffers: [],
        lastBallonDor: ballonDor,
        lastRetirementSummary: summary,
        screen: 'retirement',
        seasonsAtClub,
      });
      return;
    }

    set({
      player,
      season: nextSeason,
      week: 1,
      phase: 'preseason',
      fixtures,
      seasonMatches: [],
      eventLog,
      pendingOffers: [],
      lastBallonDor: ballonDor,
      screen: 'ballondor',
      seasonsAtClub,
      pendingRetirementPrompt: promptRetire,
      trainingsUsedThisWeek: 0,
    });
    return;
  }

  let phase: GameState['phase'] = 'inseason';
  if (PRESEASON_WEEKS.includes(week)) phase = 'preseason';
  else if (SEASON_END_WEEKS.includes(week)) phase = 'season_end';
  else if (OFFSEASON_WEEKS.includes(week)) phase = 'offseason';
  else if (isTransferWindow(week)) phase = 'transfer_window';

  set({
    player,
    week,
    phase,
    eventLog,
    pendingOffers,
    trainingsUsedThisWeek: 0,
  });
}

export { weekPhaseLabel };
