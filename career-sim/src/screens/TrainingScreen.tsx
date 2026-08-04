import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { Button, Card, ScreenScaffold } from '../components/ui';
import { trainingDescriptions, trainingLabels, gradeLabels, gradeForScore } from '../engine/training';
import type { TrainingType } from '../types';

const REPS = 5;

function MiniGame({ onDone }: { onDone: (score: number) => void }) {
  const [pos, setPos] = useState(0);
  const [rep, setRep] = useState(0);
  const [scores, setScores] = useState<number[]>([]);
  const [flash, setFlash] = useState<number | null>(null);
  const rafRef = useRef<number>(0);
  const startRef = useRef(performance.now());
  const speed = useRef(1.1 + Math.random() * 0.5);

  useEffect(() => {
    function tick(now: number) {
      const t = (now - startRef.current) / 1000;
      const value = (Math.sin(t * speed.current * Math.PI) + 1) / 2;
      setPos(value * 100);
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  function hit() {
    if (rep >= REPS) return;
    const distanceFromCenter = Math.abs(pos - 50);
    const score = Math.max(0, Math.round(100 - distanceFromCenter * 2.4));
    setFlash(score);
    setTimeout(() => setFlash(null), 400);
    const nextScores = [...scores, score];
    setScores(nextScores);
    const nextRep = rep + 1;
    setRep(nextRep);
    if (nextRep >= REPS) {
      const avg = Math.round(nextScores.reduce((a, b) => a + b, 0) / nextScores.length);
      setTimeout(() => onDone(avg), 500);
    }
  }

  return (
    <div className="flex flex-col items-center">
      <p className="text-sm text-white/50 mb-6">Versuch {Math.min(rep + 1, REPS)} / {REPS}</p>
      <div className="relative w-full h-10 rounded-full bg-white/5 border border-white/10 overflow-hidden mb-6">
        <div className="absolute inset-y-0 left-[42%] right-[42%] bg-gold/25 border-x border-gold/40" />
        <motion.div
          className="absolute top-0 bottom-0 w-1.5 bg-gold rounded-full"
          style={{ left: `calc(${pos}% - 3px)` }}
        />
      </div>
      {flash !== null && (
        <motion.p
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-2xl font-bold text-gold mb-4"
        >
          {gradeLabels[gradeForScore(flash)]}
        </motion.p>
      )}
      <Button variant="gold" className="px-10 py-3 text-base" onClick={hit} disabled={rep >= REPS}>
        Jetzt!
      </Button>
      <div className="flex gap-1.5 mt-6">
        {Array.from({ length: REPS }).map((_, i) => (
          <span key={i} className={`w-2 h-2 rounded-full ${i < scores.length ? 'bg-gold' : 'bg-white/15'}`} />
        ))}
      </div>
    </div>
  );
}

export function TrainingScreen() {
  const pendingTrainingType = useGameStore((s) => s.pendingTrainingType);
  const startTraining = useGameStore((s) => s.startTraining);
  const completeTraining = useGameStore((s) => s.completeTraining);
  const cancelTraining = useGameStore((s) => s.cancelTraining);

  const types: TrainingType[] = ['sprint', 'passing', 'crossing', 'freekick', 'penalty', 'dribbling', 'reaction', 'shooting'];

  if (!pendingTrainingType) {
    return (
      <ScreenScaffold title="Training" subtitle="Wähle eine Trainingseinheit" onBack={cancelTraining}>
        <div className="grid grid-cols-2 gap-3">
          {types.map((t) => (
            <button key={t} onClick={() => startTraining(t)} className="text-left">
              <Card className="hover:bg-white/8 transition-colors h-full">
                <p className="text-sm font-semibold mb-1">{trainingLabels[t]}</p>
                <p className="text-xs text-white/45">{trainingDescriptions[t]}</p>
              </Card>
            </button>
          ))}
        </div>
      </ScreenScaffold>
    );
  }

  return (
    <ScreenScaffold title={trainingLabels[pendingTrainingType]} subtitle={trainingDescriptions[pendingTrainingType]} onBack={cancelTraining}>
      <div className="pt-8">
        <MiniGame onDone={completeTraining} />
      </div>
    </ScreenScaffold>
  );
}
