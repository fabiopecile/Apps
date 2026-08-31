import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { AuthGate } from '../../auth/AuthGate'
import { OutcomeBanner } from '../../components/OutcomeBanner'
import { Screen } from '../../components/Screen'
import { Button, Card as UiCard, Pill } from '../../components/ui'
import { submitBlackjackResult, type Outcome as LeagueOutcome } from '../../league/service'
import { Hand } from './CardViews'
import { buildDeck, handValue, isBlackjack, shuffleDeck, type Card } from './deck'

type Status = 'playing' | 'stand' | 'bust' | 'blackjack'
type Phase = 'dealing' | 'playing' | 'submitting' | 'result' | 'error'

const DEAL_ORDER: ('player' | 'dealer')[] = ['player', 'dealer', 'player', 'dealer']
const DEAL_STEP_MS = 350

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
  const [phase, setPhase] = useState<Phase>('dealing')
  const [{ deck, player, dealer }, setGame] = useState(deal)
  const [dealStep, setDealStep] = useState(0)
  const [error, setError] = useState('')
  const [leagueOutcome, setLeagueOutcome] = useState<LeagueOutcome | null>(null)

  const value = handValue(player)

  useEffect(() => {
    if (phase !== 'dealing') return
    if (dealStep >= DEAL_ORDER.length) {
      setPhase('playing')
      return
    }
    const timer = setTimeout(() => setDealStep((s) => s + 1), DEAL_STEP_MS)
    return () => clearTimeout(timer)
  }, [phase, dealStep])

  const revealedSoFar = DEAL_ORDER.slice(0, dealStep)
  const visiblePlayer =
    phase === 'dealing' ? player.slice(0, revealedSoFar.filter((s) => s === 'player').length) : player
  const visibleDealer =
    phase === 'dealing' ? dealer.slice(0, revealedSoFar.filter((s) => s === 'dealer').length) : dealer

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
    setDealStep(0)
    setPhase('dealing')
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <UiCard className="flex flex-col items-center gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-white/60">Dealer</h2>
        <Hand cards={visibleDealer} hideSecond={phase === 'dealing' || phase === 'playing'} />
        {phase !== 'dealing' && phase !== 'playing' && (
          <p className="text-xl font-extrabold">{handValue(dealer)}</p>
        )}
      </UiCard>

      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        {phase === 'dealing' && (
          <>
            <Pill>⚡ Weekend League</Pill>
            <Hand cards={visiblePlayer} />
            <p className="text-white/50">Karten werden ausgeteilt…</p>
          </>
        )}

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
            <OutcomeBanner outcome={leagueOutcome} drawText="Unentschieden (Push)" />
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
