import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from './store/gameStore';
import { AppShell } from './components/AppShell';
import { IntroScreen } from './screens/IntroScreen';
import { CreationScreen } from './screens/CreationScreen';
import { HubScreen } from './screens/HubScreen';
import { MatchScreen } from './screens/MatchScreen';
import { TrainingScreen } from './screens/TrainingScreen';
import { PressScreen } from './screens/PressScreen';
import { TransfersScreen } from './screens/TransfersScreen';
import { SquadScreen } from './screens/SquadScreen';
import { NationalScreen } from './screens/NationalScreen';
import { FinancesScreen } from './screens/FinancesScreen';
import { CareerScreen } from './screens/CareerScreen';
import { BallonDorScreen } from './screens/BallonDorScreen';
import { RetirementScreen } from './screens/RetirementScreen';

function ScreenContent() {
  const screen = useGameStore((s) => s.screen);
  const player = useGameStore((s) => s.player);

  if (!player) {
    return screen === 'creation' ? <CreationScreen /> : <IntroScreen />;
  }
  if (screen === 'match') return <MatchScreen />;
  if (screen === 'training') return <TrainingScreen />;
  if (screen === 'press') return <PressScreen />;
  if (screen === 'transfers') return <TransfersScreen />;
  if (screen === 'ballondor') return <BallonDorScreen />;
  if (screen === 'retirement') return <RetirementScreen />;

  const tabScreen =
    screen === 'squad' ? <SquadScreen /> :
    screen === 'national' ? <NationalScreen /> :
    screen === 'finances' ? <FinancesScreen /> :
    screen === 'career' ? <CareerScreen /> :
    <HubScreen />;

  return <AppShell>{tabScreen}</AppShell>;
}

export default function App() {
  const screen = useGameStore((s) => s.screen);

  return (
    <div className="w-full h-full max-w-md mx-auto relative border-x border-white/5" style={{ height: '100dvh' }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={screen}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="h-full"
        >
          <ScreenContent />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
