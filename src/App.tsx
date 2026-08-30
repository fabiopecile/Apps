import { Route, Routes } from 'react-router-dom'
import { Blackjack } from './games/blackjack/Blackjack'
import { BlackjackLive } from './games/blackjack/BlackjackLive'
import { BlackjackOnline } from './games/blackjack/BlackjackOnline'
import { Home } from './games/Home'
import { Impostor } from './games/impostor/Impostor'
import { KingsCup } from './games/kingscup/KingsCup'
import { League } from './games/league/League'
import { MostLikely } from './games/mostlikely/MostLikely'
import { NeverHaveI } from './games/neverhavei/NeverHaveI'
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
      <Route path="/blackjack/live" element={<BlackjackLive />} />
      <Route path="/wahrheit-oder-pflicht" element={<TruthOrDare />} />
      <Route path="/reaktionstest" element={<ReactionTest />} />
      <Route path="/reaktionstest/online" element={<ReactionOnline />} />
      <Route path="/ich-hab-noch-nie" element={<NeverHaveI />} />
      <Route path="/wer-wuerde-eher" element={<MostLikely />} />
      <Route path="/kingscup" element={<KingsCup />} />
      <Route path="/liga" element={<League />} />
    </Routes>
  )
}

export default App
