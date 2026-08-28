import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { AuthGate } from '../../auth/AuthGate'
import { Screen } from '../../components/Screen'
import { Button, Card as UiCard, Pill } from '../../components/ui'
import { submitBlackjackResult, type Outcome as LeagueOutcome } from '../../league/service'
import { Hand } from './CardViews'
import { buildDeck, handValue, isBlackjack, shuffleDeck, type Card } from './deck'

type Status = 'playing' | 'stand' | 'bust' | 'blackjack'
type Phase = 'playing' | 'submitting' | 'result' | 'error'

const outcomeLabel: Record<LeagueOutcome, { text: string; color: string }> = {
  win: { text: 'Gewonnen! 🎉', color: 'text-emerald-400' },
  lose: { text: 'Verloren', color: 'text-rose-400' },
  draw: { text: 'Unentschieden (Push)', color: 'text-yellow-300' },
}

function deal() {
  let d = shuffleDeck(buildDeck())
  const draw = () => {
    const [card, ...rest] = d
    d = rest
    return card
  }
  const player = [draw(), draw()]
  const dealer = [draw(), draw()]
  return { deck: d, player, dealer }
}

function OnlineBlackjackContent() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [phase, setPhase] = useState<Phase>('playing')
  const [{ deck, player, dealer }, setGame] = useState(deal)
  const [error, setError] = useState('')
  const [leagueOutcome, setLeagueOutcome] = useState<LeagueOutcome | null>(null)

  const value = handValue(player)

  function hit() {
    const [card, ...rest] = deck
    const newPlayer = [...player, card]
    setGame({ deck: rest, player: newPlayer, dealer })
    if (handValue(newPlayer) > 21) {
      resolve(newPlayer, dealer, 'bust', rest)
    }
  }

  function stand() {
    resolve(player, dealer, 'stand', deck)
  }

  async function resolve(finalPlayer: Card[], startDealer: Card[], finalStatus: Status, startDeck: Card[]) {
    let dHand = [...startDealer]
    let d = [...startDeck]
    if (finalStatus !== 'bust') {
      while (handValue(dHand) < 17) {
        const [card, ...rest] = d
        dHand.push(card)
        d = rest
      }
    }
    setGame({ deck: d, player: finalPlayer, dealer: dHand })

    const dealerBJ = isBlackjack(dHand)
    const playerBJ = finalStatus !== 'bust' && isBlackjack(finalPlayer)
    const dealerTotal = handValue(dHand)
    const playerTotal = handValue(finalPlayer)

    let outcome: LeagueOutcome
    if (finalStatus === 'bust') outcome = 'lose'
    else if (playerBJ && dealerBJ) outcome = 'draw'
    else if (playerBJ) outcome = 'win'
    else if (dealerBJ) outcome = 'lose'
    else if (dealerTotal > 21) outcome = 'win'
    else if (playerTotal > dealerTotal) outcome = 'win'
    else if (playerTotal < dealerTotal) outcome = 'lose'
    else outcome = 'draw'

    setPhase('submitting')
    const res = await submitBlackjackResult(profile!.id, outcome)
    if (!res.ok) {
      setError(res.error)
      setPhase('error')
      return
    }
    setLeagueOutcome(outcome)
    setPhase('result')
  }

  function playAgain() {
    setGame(deal())
    setLeagueOutcome(null)
    setPhase('playing')
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <UiCard className="flex flex-col items-center gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-white/60">Dealer</h2>
        <Hand cards={dealer} hideSecond={phase === 'playing'} />
        {phase !== 'playing' && <p className="text-xl font-extrabold">{handValue(dealer)}</p>}
      </UiCard>

      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        {phase === 'playing' && (
          <>
            <Pill>⚡ Weekend League</Pill>
            <Hand cards={player} />
            <p className="text-3xl font-extrabold">{value}</p>
            <div className="flex w-full max-w-xs gap-3">
              <Button onClick={hit} className="flex-1 !bg-emerald-500 hover:!bg-emerald-400">
                Karte (Hit)
              </Button>
              <Button onClick={stand} variant="secondary" className="flex-1">
                Halten (Stand)
              </Button>
            </div>
          </>
        )}

        {phase === 'submitting' && (
          <>
            <Hand cards={player} />
            <p className="text-white/50">Ergebnis wird übermittelt…</p>
          </>
        )}

        {phase === 'error' && (
          <>
            <p className="text-rose-400">{error}</p>
            <Button variant="secondary" onClick={() => navigate('/liga')}>
              Zurück zur Liga
            </Button>
          </>
        )}

        {phase === 'result' && leagueOutcome && (
          <>
            <Hand cards={player} />
            <p className="text-2xl font-extrabold">{handValue(player)}</p>
            <p className={`text-xl font-bold ${outcomeLabel[leagueOutcome].color}`}>
              {outcomeLabel[leagueOutcome].text}
            </p>
            <div className="flex w-full max-w-xs flex-col gap-3">
              <Button onClick={playAgain} className="!bg-emerald-500 hover:!bg-emerald-400">
                Nächste Hand
              </Button>
              <Button variant="secondary" onClick={() => navigate('/liga')}>
                Zurück zur Liga
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export function BlackjackOnline() {
  return (
    <Screen title="🃏 Blackjack Online" gradient="from-emerald-950 via-slate-950 to-slate-950">
      <AuthGate>
        <OnlineBlackjackContent />
      </AuthGate>
    </Screen>
  )
}
