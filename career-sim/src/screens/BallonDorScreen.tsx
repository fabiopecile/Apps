import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { Badge, Button, Card } from '../components/ui';

export function BallonDorScreen() {
  const player = useGameStore((s) => s.player);
  const ballonDor = useGameStore((s) => s.lastBallonDor);
  const goToScreen = useGameStore((s) => s.goToScreen);

  if (!player || !ballonDor) return null;
  const won = ballonDor.rank === 1;

  return (
    <div className="h-full flex flex-col items-center justify-center px-6 text-center relative overflow-hidden">
      <div
        className="absolute inset-0 -z-10"
        style={{ background: 'radial-gradient(circle at 50% 20%, rgba(212,175,55,0.2), transparent 60%)' }}
      />
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs tracking-[0.3em] text-white/40 mb-2 uppercase">
        Gala der Besten
      </motion.p>
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-3xl font-bold mb-8"
      >
        Ballon d'Or {ballonDor.season}
      </motion.h1>

      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3, type: 'spring' }}
      >
        {won ? (
          <div className="mb-6">
            <div className="text-7xl mb-3">🏆</div>
            <p className="text-2xl font-bold text-gold">{player.name}</p>
            <p className="text-sm text-white/50 mt-1">gewinnt den Ballon d'Or!</p>
          </div>
        ) : (
          <Card className="mb-6 py-6 px-8">
            <p className="text-sm text-white/50 mb-2">Gewinner</p>
            <p className="text-xl font-bold text-gold mb-4">{ballonDor.winnerName}</p>
            {ballonDor.rank && (
              <Badge tone="gold">{player.name} · Platz {ballonDor.rank}</Badge>
            )}
          </Card>
        )}
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="mb-8">
        <p className="text-xs text-white/40 mb-2 uppercase tracking-wide">Top 3</p>
        <div className="space-y-1.5">
          {ballonDor.top3.map((name, i) => (
            <p key={name} className={i === 0 ? 'text-gold font-semibold' : 'text-white/60 text-sm'}>
              {i + 1}. {name}
            </p>
          ))}
        </div>
      </motion.div>

      <Button variant="gold" className="px-10 py-3" onClick={() => goToScreen('hub')}>
        Weiter zur neuen Saison
      </Button>
    </div>
  );
}
