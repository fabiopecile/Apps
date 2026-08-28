import { Route, Routes } from 'react-router-dom'
import { Blackjack } from './games/blackjack/Blackjack'
import { Home } from './games/Home'
import { Impostor } from './games/impostor/Impostor'
import { ReactionTest } from './games/reaction/ReactionTest'
import { TimingGame } from './games/timing/TimingGame'
import { TruthOrDare } from './games/truthOrDare/TruthOrDare'
import { Werewolf } from './games/werewolf/Werewolf'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/impostor" element={<Impostor />} />
      <Route path="/werwolf" element={<Werewolf />} />
      <Route path="/zeitgefuehl" element={<TimingGame />} />
      <Route path="/blackjack" element={<Blackjack />} />
      <Route path="/wahrheit-oder-pflicht" element={<TruthOrDare />} />
      <Route path="/reaktionstest" element={<ReactionTest />} />
    </Routes>
  )
}

export default App
