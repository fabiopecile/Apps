import { supabase } from '../lib/supabase'
import { MAX_GAMES_PER_WEEKEND } from './divisions'
import { getWeekendInfo } from './weekend'

export type LeagueGame = 'zeitgefuehl' | 'reaktionstest' | 'blackjack'
export type Outcome = 'win' | 'lose' | 'draw'

export type WeekendStats = { wins: number; losses: number; draws: number; played: number }

const BOT_BASELINE: Record<'zeitgefuehl' | 'reaktionstest', number> = {
  zeitgefuehl: 1.0, // seconds off target
  reaktionstest: 280, // ms
}

function judge(mine: number, opponent: number): Outcome {
  if (mine < opponent) return 'win'
  if (mine > opponent) return 'lose'
  return 'draw'
}

export async function fetchWeekendStats(
  userId: string,
): Promise<Record<LeagueGame, WeekendStats>> {
  const empty = (): WeekendStats => ({ wins: 0, losses: 0, draws: 0, played: 0 })
  const result: Record<LeagueGame, WeekendStats> = {
    zeitgefuehl: empty(),
    reaktionstest: empty(),
    blackjack: empty(),
  }
  if (!supabase) return result

  const { weekendKey } = getWeekendInfo()
  const { data, error } = await supabase
    .from('game_results')
    .select('game, outcome')
    .eq('user_id', userId)
    .eq('weekend_key', weekendKey)

  if (error || !data) return result

  for (const row of data as { game: LeagueGame; outcome: Outcome }[]) {
    const stats = result[row.game]
    stats.played += 1
    if (row.outcome === 'win') stats.wins += 1
    else if (row.outcome === 'lose') stats.losses += 1
    else stats.draws += 1
  }
  return result
}

export async function submitScoreResult(
  game: 'zeitgefuehl' | 'reaktionstest',
  userId: string,
  rawScore: number,
): Promise<
  | { ok: true; outcome: Outcome; opponentScore: number; opponentUsername: string | null; isVsBot: boolean }
  | { ok: false; error: string }
> {
  if (!supabase) return { ok: false, error: 'Kein Backend konfiguriert.' }
  const { weekendKey, isActive } = getWeekendInfo()
  if (!isActive) return { ok: false, error: 'Die Weekend League läuft nur von Freitag bis Sonntag.' }

  const stats = await fetchWeekendStats(userId)
  if (stats[game].played >= MAX_GAMES_PER_WEEKEND) {
    return { ok: false, error: `Du hast deine ${MAX_GAMES_PER_WEEKEND} Spiele für dieses Wochenende aufgebraucht.` }
  }

  const { data: opponentRows } = await supabase.rpc('pick_opponent_score', {
    p_game: game,
    p_weekend_key: weekendKey,
    p_user_id: userId,
  })
  const opponent = opponentRows?.[0] as
    | { opponent_user_id: string; opponent_score: number; opponent_username: string }
    | undefined

  const opponentScore = opponent ? opponent.opponent_score : BOT_BASELINE[game]
  const isVsBot = !opponent
  const outcome = judge(rawScore, opponentScore)

  const { error } = await supabase.from('game_results').insert({
    user_id: userId,
    game,
    weekend_key: weekendKey,
    raw_score: rawScore,
    outcome,
    opponent_user_id: opponent?.opponent_user_id ?? null,
    opponent_score: opponentScore,
    is_vs_bot: isVsBot,
  })
  if (error) return { ok: false, error: error.message }

  return {
    ok: true,
    outcome,
    opponentScore,
    opponentUsername: opponent?.opponent_username ?? null,
    isVsBot,
  }
}

export async function submitBlackjackResult(
  userId: string,
  outcome: Outcome,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!supabase) return { ok: false, error: 'Kein Backend konfiguriert.' }
  const { weekendKey, isActive } = getWeekendInfo()
  if (!isActive) return { ok: false, error: 'Die Weekend League läuft nur von Freitag bis Sonntag.' }

  const stats = await fetchWeekendStats(userId)
  if (stats.blackjack.played >= MAX_GAMES_PER_WEEKEND) {
    return { ok: false, error: `Du hast deine ${MAX_GAMES_PER_WEEKEND} Spiele für dieses Wochenende aufgebraucht.` }
  }

  const { error } = await supabase.from('game_results').insert({
    user_id: userId,
    game: 'blackjack',
    weekend_key: weekendKey,
    raw_score: null,
    outcome,
    is_vs_bot: false,
  })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
