import type { BallonDorResult, Player, SeasonStatLine } from '../types';
import { randomFullName } from '../data/names';
import { clamp, randInt } from './rng';

export function evaluateBallonDor(player: Player, season: number): BallonDorResult {
  const seasonLine: SeasonStatLine | undefined = player.careerLog.find((l) => l.season === season);
  const goals = seasonLine?.goals ?? 0;
  const assists = seasonLine?.assists ?? 0;
  const trophies = seasonLine?.trophies.length ?? 0;

  const score =
    goals * 3 + assists * 2 + trophies * 15 + player.fanPopularity / 2 +
    (player.nationalTeam.called ? player.nationalTeam.caps / 2 : 0) +
    player.mediaImage / 10;

  const rivals = Array.from({ length: 29 }, () => {
    const { first, last } = randomFullName();
    return { name: `${first} ${last}`, score: randInt(20, 140) };
  });

  const all = [...rivals, { name: player.name, score }].sort((a, b) => b.score - a.score);
  const rank = all.findIndex((e) => e.name === player.name) + 1;
  const top3 = all.slice(0, 3).map((e) => e.name);

  return {
    season,
    rank: rank <= 30 ? rank : null,
    winnerName: all[0].name,
    top3,
    playerVotesShare: clamp(score / all[0].score, 0, 1) * 100,
  };
}
