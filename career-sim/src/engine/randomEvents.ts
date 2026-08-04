import type { GameEventLogEntry, Player, RandomEventType } from '../types';
import { getClub } from '../data/clubs';
import { chance } from './rng';

interface EventTemplate {
  type: RandomEventType;
  weight: number;
  headline: (player: Player) => string;
  body: (player: Player) => string;
  apply?: (player: Player) => Partial<Player>;
}

const templates: EventTemplate[] = [
  {
    type: 'new_coach',
    weight: 6,
    headline: () => 'Neuer Trainer beim Verein',
    body: (p) => `${getClub(p.clubId).name} verpflichtet einen neuen Cheftrainer. Dein Status im Team könnte sich ändern.`,
  },
  {
    type: 'coach_fired',
    weight: 4,
    headline: () => 'Trainerentlassung',
    body: (p) => `Der Trainer von ${getClub(p.clubId).name} wurde entlassen. Unsicherheit im Verein.`,
  },
  {
    type: 'investor_takeover',
    weight: 3,
    headline: () => 'Investor übernimmt den Verein',
    body: (p) => `Ein neuer Großinvestor übernimmt ${getClub(p.clubId).name} – große Ambitionen werden angekündigt.`,
  },
  {
    type: 'stadium_expansion',
    weight: 3,
    headline: () => 'Stadionausbau angekündigt',
    body: (p) => `${getClub(p.clubId).name} kündigt einen Ausbau des Stadions an.`,
  },
  {
    type: 'teammate_injured',
    weight: 6,
    headline: () => 'Teamkollege verletzt sich',
    body: () => 'Ein wichtiger Mitspieler fällt für mehrere Wochen aus.',
  },
  {
    type: 'captain_sold',
    weight: 3,
    headline: () => 'Kapitän verlässt den Verein',
    body: (p) => `Der Kapitän von ${getClub(p.clubId).name} wird überraschend verkauft.`,
  },
  {
    type: 'media_scandal',
    weight: 3,
    headline: () => 'Medien-Skandal erschüttert den Verein',
    body: (p) => `Ein Skandal rund um ${getClub(p.clubId).name} sorgt für Schlagzeilen.`,
  },
  {
    type: 'sponsor_change',
    weight: 3,
    headline: () => 'Sponsorenwechsel beim Verein',
    body: (p) => `${getClub(p.clubId).name} unterschreibt einen neuen Hauptsponsor.`,
  },
  {
    type: 'fan_protest',
    weight: 3,
    headline: () => 'Fanproteste gegen die Vereinsführung',
    body: (p) => `Fans von ${getClub(p.clubId).name} protestieren gegen sportliche Misserfolge.`,
  },
  {
    type: 'club_crisis',
    weight: 2,
    headline: () => 'Vereinskrise spitzt sich zu',
    body: (p) => `${getClub(p.clubId).name} steckt in einer sportlichen und wirtschaftlichen Krise.`,
  },
  {
    type: 'insolvency',
    weight: 1,
    headline: () => 'Insolvenzgefahr beim Verein',
    body: (p) => `${getClub(p.clubId).name} kämpft mit finanziellen Problemen und drohender Insolvenz.`,
  },
  {
    type: 'surprise_offer',
    weight: 4,
    headline: () => 'Unerwartetes Transferangebot',
    body: () => 'Ein Verein aus dem Ausland meldet überraschend Interesse an dir.',
  },
];

export function rollRandomEvent(player: Player, season: number, week: number): GameEventLogEntry | null {
  if (!chance(0.12)) return null;
  const total = templates.reduce((s, t) => s + t.weight, 0);
  let r = Math.random() * total;
  let chosen = templates[0];
  for (const t of templates) {
    r -= t.weight;
    if (r <= 0) {
      chosen = t;
      break;
    }
  }
  return {
    id: crypto.randomUUID(),
    season,
    week,
    type: chosen.type,
    headline: chosen.headline(player),
    body: chosen.body(player),
  };
}
