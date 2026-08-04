import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { Button } from '../components/ui';

export function IntroScreen() {
  const goToScreen = useGameStore((s) => s.goToScreen);

  return (
    <div className="h-full flex flex-col items-center justify-center px-8 text-center relative overflow-hidden">
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(circle at 50% 0%, rgba(212,175,55,0.14), transparent 55%), radial-gradient(circle at 20% 100%, rgba(255,255,255,0.06), transparent 45%)',
        }}
      />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="text-6xl mb-4">⚽</div>
        <h1 className="text-4xl font-bold tracking-tight mb-2">
          PRO<span className="text-gold">CAREER</span>
        </h1>
        <p className="text-white/50 max-w-xs mx-auto mb-10">
          Von der Jugend zur Legende. Jede Entscheidung formt deine einzigartige Fußballkarriere.
        </p>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.15 }}
        className="w-full max-w-xs flex flex-col gap-3"
      >
        <Button variant="gold" className="w-full py-3.5 text-base" onClick={() => goToScreen('creation')}>
          Neue Karriere starten
        </Button>
      </motion.div>
    </div>
  );
}
