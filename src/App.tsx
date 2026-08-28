import { Route, Routes } from 'react-router-dom'
import { Blackjack } from './games/blackjack/Blackjack'
import { BlackjackOnline } from './games/blackjack/BlackjackOnline'
import { Home } from './games/Home'
import { Impostor } from './games/impostor/Impostor'
import { League } from './games/league/League'
import { ReactionOnline } from './games/reaction/ReactionOnline'
import { ReactionTest } from './games/reaction/ReactionTest'
import { TimingGame } from './games/timing/TimingGame'
import { TimingOnline } from './games/timing/TimingOnline'
import { TruthOrDare } from './games/truthOrDare/TruthOrDare'
import { Werewolf } from './games/werewolf/Werewolf'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/impostor" element={<Impostor />} />
      <Route path="/werwolf" element={<Werewolf />} />
      <Route path="/zeitgefuehl" element={<TimingGame />} />
      <Route path="/zeitgefuehl/online" element={<TimingOnline />} />
      <Route path="/blackjack" element={<Blackjack />} />
      <Route path="/blackjack/online" element={<BlackjackOnline />} />
      <Route path="/wahrheit-oder-pflicht" element={<TruthOrDare />} />
      <Route path="/reaktionstest" element={<ReactionTest />} />
      <Route path="/reaktionstest/online" element={<ReactionOnline />} />
      <Route path="/liga" element={<League />} />
    </Routes>
  )
}

export default App
