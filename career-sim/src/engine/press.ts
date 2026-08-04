import type { MatchResult, NewsItem, Player, ResponseTone } from '../types';
import { chance, pick } from './rng';

export function generateMatchNews(player: Player, match: MatchResult, season: number, week: number): NewsItem[] {
  const items: NewsItem[] = [];
  const { playerStats: stats } = match;
  const won = match.goalsFor > match.goalsAgainst;

  if (stats.motm || stats.goals >= 2) {
    items.push({
      id: crypto.randomUUID(),
      week, season,
      headline: pick([
        `${player.name} rettet sein Team gegen ${match.opponent}.`,
        `Star-Auftritt: ${player.name} überragt gegen ${match.opponent}.`,
        `Fans feiern ${player.name} nach starker Leistung.`,
      ]),
      body: `Nach der Partie gegen ${match.opponent} steht ${player.name} im Rampenlicht der Medien. Wie reagierst du auf die Lobeshymnen?`,
      tone: 'positive',
      requiresResponse: true,
      responded: false,
      source: 'press',
    });
  } else if (stats.red || (!won && stats.rating < 5.5)) {
    items.push({
      id: crypto.randomUUID(),
      week, season,
      headline: pick([
        `Trainer kritisiert Leistung von ${player.name}.`,
        `Enttäuschung: ${player.name} bleibt gegen ${match.opponent} blass.`,
        `Medien hinterfragen Form von ${player.name}.`,
      ]),
      body: `Die Presse übt nach dem Spiel gegen ${match.opponent} Kritik. Wie gehst du damit um?`,
      tone: 'negative',
      requiresResponse: true,
      responded: false,
      source: 'press',
    });
  } else if (chance(0.25)) {
    items.push({
      id: crypto.randomUUID(),
      week, season,
      headline: `${match.opponent === player.nationality ? '' : ''}Fans diskutieren über ${player.name} nach dem Spiel.`,
      body: `Auf Social Media wird über deine Rolle im Team gegen ${match.opponent} diskutiert.`,
      tone: 'neutral',
      requiresResponse: true,
      responded: false,
      source: 'social',
    });
  }

  return items;
}

export interface PressResponseEffect {
  fanPopularityDelta: number;
  mediaImageDelta: number;
  coachTrustDelta: number;
  moraleDelta: number;
  traitDelta: Partial<Player['traits']>;
}

export function evaluatePressResponse(tone: ResponseTone, newsTone: NewsItem['tone']): PressResponseEffect {
  const base: PressResponseEffect = {
    fanPopularityDelta: 0, mediaImageDelta: 0, coachTrustDelta: 0, moraleDelta: 0, traitDelta: {},
  };

  switch (tone) {
    case 'humble':
      base.fanPopularityDelta = 2;
      base.mediaImageDelta = 3;
      base.coachTrustDelta = 3;
      base.traitDelta = { arrogance: -2, professionalism: 2 };
      break;
    case 'confident':
      base.fanPopularityDelta = newsTone === 'positive' ? 4 : -1;
      base.mediaImageDelta = 1;
      base.coachTrustDelta = 1;
      base.traitDelta = { arrogance: 3, charisma: 2 };
      break;
    case 'provocative':
      base.fanPopularityDelta = newsTone === 'negative' ? -4 : 3;
      base.mediaImageDelta = -4;
      base.coachTrustDelta = -3;
      base.moraleDelta = 2;
      base.traitDelta = { arrogance: 5, temper: 4 };
      break;
    case 'funny':
      base.fanPopularityDelta = 5;
      base.mediaImageDelta = 4;
      base.coachTrustDelta = 0;
      base.traitDelta = { charisma: 4 };
      break;
  }

  if (newsTone === 'negative' && tone === 'humble') {
    base.coachTrustDelta += 2;
  }

  return base;
}

export const responseToneLabels: Record<ResponseTone, string> = {
  humble: 'Bescheiden',
  confident: 'Selbstbewusst',
  provocative: 'Provokant',
  funny: 'Lustig',
};
