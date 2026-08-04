import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { Badge, Button, Card } from '../components/ui';
import { getClub } from '../data/clubs';
import { competitionLabels } from '../lib/labels';

const eventIcons: Record<string, string> = {
  goal: '⚽', assist: '🅰️', yellow: '🟨', red: '🟥', injury: '🚑',
  own_goal: '🙈', penalty_scored: '🎯', penalty_missed: '❌',
  substitution: '🔁', motm: '⭐',
};

export function MatchScreen() {
  const player = useGameStore((s) => s.player);
  const match = useGameStore((s) => s.lastMatch);
  const isNational = useGameStore((s) => s.lastMatchIsNational);
  const acknowledgeMatch = useGameStore((s) => s.acknowledgeMatch);

  if (!player || !match) return null;
  const club = getClub(player.clubId);
  const won = match.goalsFor > match.goalsAgainst;
  const lost = match.goalsFor < match.goalsAgainst;
  const stats = match.playerStats;

  const homeName = match.home ? (isNational ? player.nationality : club.shortName) : match.opponent;
  const awayName = match.home ? match.opponent : (isNational ? player.nationality : club.shortName);
  const homeGoals = match.home ? match.goalsFor : match.goalsAgainst;
  const awayGoals = match.home ? match.goalsAgainst : match.goalsFor;

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto no-scrollbar px-5 pt-8 pb-4">
        <p className="text-center text-xs text-white/40 mb-1">{competitionLabels[match.competition]}</p>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center justify-center gap-6 mb-2"
        >
          <div className="text-center flex-1">
            <p className="text-sm font-medium truncate">{homeName}</p>
          </div>
          <div className="text-3xl font-bold tabular-nums px-3">
            {homeGoals} <span className="text-white/30">:</span> {awayGoals}
          </div>
          <div className="text-center flex-1">
            <p className="text-sm font-medium truncate">{awayName}</p>
          </div>
        </motion.div>
        <p
          className={
            won ? 'text-center text-emerald-400 text-xs font-medium mb-6'
              : lost ? 'text-center text-red-400 text-xs font-medium mb-6'
              : 'text-center text-white/50 text-xs font-medium mb-6'
          }
        >
          {won ? 'Sieg' : lost ? 'Niederlage' : 'Unentschieden'}
        </p>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="mb-4 text-center py-5">
            <p className="text-sm text-white/50 mb-3">{match.headline}</p>
            <div className="flex justify-center gap-2 flex-wrap">
              {stats.motm && <Badge tone="gold">⭐ Spieler des Spiels</Badge>}
              {stats.goals > 0 && <Badge tone="green">{stats.goals} Tor{stats.goals > 1 ? 'e' : ''}</Badge>}
              {stats.assists > 0 && <Badge tone="blue">{stats.assists} Vorlage{stats.assists > 1 ? 'n' : ''}</Badge>}
              {stats.yellow && <Badge>🟨 Gelb</Badge>}
              {stats.red && <Badge tone="red">🟥 Rot</Badge>}
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card className="mb-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <Stat label="Note" value={stats.rating.toFixed(1)} highlight />
              <Stat label="Ballbesitz" value={`${Math.round(stats.possession)}%`} />
              <Stat label="Passquote" value={`${Math.round(stats.passAccuracy)}%`} />
              <Stat label="Zweikampfquote" value={`${Math.round(stats.duelsWonPct)}%`} />
              <Stat label="Chancen" value={String(stats.chancesCreated)} />
              <Stat label="Distanz" value={`${stats.distanceKm}km`} />
            </div>
          </Card>
        </motion.div>

        {match.events.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <Card>
              <div className="space-y-2.5">
                {match.events.map((e, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <span className="text-white/30 tabular-nums w-8">{e.minute}'</span>
                    <span>{eventIcons[e.type] ?? '•'}</span>
                    <span className="text-white/70">{e.description}</span>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}
      </div>
      <div className="p-4 border-t border-white/8 glass shrink-0">
        <Button variant="gold" className="w-full py-3" onClick={acknowledgeMatch}>Weiter</Button>
      </div>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className={highlight ? 'text-xl font-bold text-gold' : 'text-lg font-semibold'}>{value}</p>
      <p className="text-[11px] text-white/40 mt-0.5">{label}</p>
    </div>
  );
}
