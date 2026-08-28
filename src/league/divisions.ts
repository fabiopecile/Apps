export type Division = {
  id: string
  name: string
  minWins: number
  emoji: string
  reward: string
}

export const MAX_GAMES_PER_WEEKEND = 20

export const divisions: Division[] = [
  { id: 'bronze', name: 'Bronze-Liga', minWins: 0, emoji: '🥉', reward: 'Bronze-Abzeichen fürs Profil' },
  {
    id: 'silver',
    name: 'Silber-Liga',
    minWins: 3,
    emoji: '🥈',
    reward: 'Silberner Rahmen + Titel „Herausforderer"',
  },
  {
    id: 'gold',
    name: 'Gold-Liga',
    minWins: 7,
    emoji: '🥇',
    reward: 'Goldener Rahmen + Titel „Champion"',
  },
  {
    id: 'platinum',
    name: 'Platin-Liga',
    minWins: 11,
    emoji: '💎',
    reward: 'Platin-Rahmen + Titel „Elite-Spieler"',
  },
  {
    id: 'diamond',
    name: 'Diamant-Liga',
    minWins: 15,
    emoji: '🏆',
    reward: 'Diamant-Rahmen + animiertes Abzeichen',
  },
  {
    id: 'elite',
    name: 'Elite-Liga',
    minWins: 18,
    emoji: '👑',
    reward: 'Krone + Platz in der Ruhmeshalle',
  },
]

export function divisionForWins(wins: number): Division {
  let current = divisions[0]
  for (const d of divisions) if (wins >= d.minWins) current = d
  return current
}

export function nextDivision(wins: number): Division | null {
  const idx = divisions.indexOf(divisionForWins(wins))
  return divisions[idx + 1] ?? null
}
