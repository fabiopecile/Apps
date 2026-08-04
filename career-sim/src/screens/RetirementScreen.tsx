import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { Badge, Button, Card } from '../components/ui';
import { formatMoney } from '../engine/marketValue';
import { awardDescriptions } from '../engine/retirement';
import { PlayerAvatar } from '../components/PlayerAvatar';

export function RetirementScreen() {
  const summary = useGameStore((s) => s.lastRetirementSummary);
  const newGame = useGameStore((s) => s.newGame);

  if (!summary) return null;
  const { player, awards } = summary;

  return (
    <div className="h-full overflow-y-auto no-scrollbar px-6 pt-10 pb-10 text-center">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-xs tracking-[0.3em] text-white/40 mb-2 uppercase">Karriereende</p>
        <div className="flex justify-center mb-4">
          <PlayerAvatar appearance={player.appearance} size={100} />
        </div>
        <h1 className="text-2xl font-bold mb-1">{player.name}</h1>
        <p className="text-sm text-white/45 mb-8">{player.age} Jahre · {player.careerTotals.clubsPlayed.join(', ')}</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <Card className="grid grid-cols-3 gap-3 text-center mb-6">
          <Stat label="Spiele" value={player.careerTotals.appearances} />
          <Stat label="Tore" value={player.careerTotals.goals} />
          <Stat label="Vorlagen" value={player.careerTotals.assists} />
          <Stat label="Titel" value={player.careerTotals.trophies} />
          <Stat label="Ballon d'Or" value={player.careerTotals.ballonDors} />
          <Stat label="Länderspiele" value={player.nationalTeam.caps} />
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <Card className="mb-6 text-left">
          <p className="text-xs text-white/40 uppercase tracking-wide mb-2">Vermögen</p>
          <p className="text-2xl font-bold text-gold">{formatMoney(player.bankBalance)}</p>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
        <p className="text-xs text-white/40 uppercase tracking-wide mb-3">Auszeichnungen</p>
        <div className="space-y-2 mb-8">
          {awards.map((a) => (
            <Card key={a} className="flex items-center gap-3 text-left">
              <Badge tone="gold">🏅</Badge>
              <div>
                <p className="text-sm font-semibold">{a}</p>
                <p className="text-xs text-white/45">{awardDescriptions[a]}</p>
              </div>
            </Card>
          ))}
        </div>
      </motion.div>

      <Button variant="gold" className="px-10 py-3" onClick={newGame}>Neue Karriere starten</Button>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xl font-bold">{value}</p>
      <p className="text-[11px] text-white/40 mt-0.5">{label}</p>
    </div>
  );
}
