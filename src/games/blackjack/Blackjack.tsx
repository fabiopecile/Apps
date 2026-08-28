import { useState } from 'react'
import { PlayerSetup } from '../../components/PlayerSetup'
import { usePlayers } from '../../lib/storage'
import { Screen } from '../../components/Screen'
import { Button, Card as UiCard, Pill } from '../../components/ui'
import { Hand } from './CardViews'
import { buildDeck, handValue, isBlackjack, shuffleDeck, type Card } from './deck'

type Status = 'playing' | 'stand' | 'bust' | 'blackjack'
type Outcome = 'win' | 'lose' | 'push'
type Phase = 'setup' | 'playing' | 'results'

type Tally = { wins: number; losses: number; pushes: number }

export function Blackjack() {
  const [players, setPlayers] = usePlayers()
  const [phase, setPhase] = useState<Phase>('setup')
  const [deck, setDeck] = useState<Card[]>([])
  const [hands, setHands] = useState<Record<string, Card[]>>({})
  const [status, setStatus] = useState<Record<string, Status>>({})
  const [dealerHand, setDealerHand] = useState<Card[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [outcomes, setOutcomes] = useState<Record<string, Outcome>>({})
  const [tally, setTally] = useState<Record<string, Tally>>({})

  const validPlayers = players.map((p) => p.trim()).filter(Boolean).slice(0, 4)

  function draw(d: Card[]): [Card, Card[]] {
    const [card, ...rest] = d
    return [card, rest]
  }

  function dealRound() {
    let d = shuffleDeck(buildDeck())
    const newHands: Record<string, Card[]> = {}
    for (const p of validPlayers) newHands[p] = []
    const newDealer: Card[] = []

    for (let round = 0; round < 2; round++) {
      for (const p of validPlayers) {
        const [card, rest] = draw(d)
        d = rest
        newHands[p].push(card)
      }
      const [card, rest] = draw(d)
      d = rest
      newDealer.push(card)
    }

    const newStatus: Record<string, Status> = {}
    for (const p of validPlayers) {
      newStatus[p] = isBlackjack(newHands[p]) ? 'blackjack' : 'playing'
    }

    setDeck(d)
    setHands(newHands)
    setDealerHand(newDealer)
    setStatus(newStatus)
    setOutcomes({})
    setTally((prev) => {
      const next = { ...prev }
      for (const p of validPlayers) if (!next[p]) next[p] = { wins: 0, losses: 0, pushes: 0 }
      return next
    })

    const firstPlaying = validPlayers.findIndex((p) => newStatus[p] === 'playing')
    if (firstPlaying === -1) {
      resolveRound(newHands, newStatus, newDealer, d)
    } else {
      setCurrentIndex(firstPlaying)
      setPhase('playing')
    }
  }

  function advanceOrResolve(nextHands: Record<string, Card[]>, nextStatus: Record<string, Status>, d: Card[]) {
    const nextIndex = validPlayers.findIndex(
      (p, i) => i > currentIndex && nextStatus[p] === 'playing',
    )
    if (nextIndex === -1) {
      resolveRound(nextHands, nextStatus, dealerHand, d)
    } else {
      setCurrentIndex(nextIndex)
    }
  }

  function hit() {
    const player = validPlayers[currentIndex]
    const [card, rest] = draw(deck)
    const newHand = [...hands[player], card]
    const newHands = { ...hands, [player]: newHand }
    const value = handValue(newHand)
    const newStatus: Record<string, Status> = {
      ...status,
      [player]: value > 21 ? 'bust' : status[player],
    }
    setDeck(rest)
    setHands(newHands)
    setStatus(newStatus)
    if (value > 21) {
      advanceOrResolve(newHands, newStatus, rest)
    }
  }

  function stand() {
    const player = validPlayers[currentIndex]
    const newStatus: Record<string, Status> = { ...status, [player]: 'stand' }
    setStatus(newStatus)
    advanceOrResolve(hands, newStatus, deck)
  }

  function resolveRound(
    finalHands: Record<string, Card[]>,
    finalStatus: Record<string, Status>,
    startingDealerHand: Card[],
    startingDeck: Card[],
  ) {
    let dHand = [...startingDealerHand]
    let d = [...startingDeck]
    const anyoneLeft = validPlayers.some((p) => finalStatus[p] !== 'bust')
    if (anyoneLeft) {
      while (handValue(dHand) < 17) {
        const [card, rest] = draw(d)
        dHand.push(card)
        d = rest
      }
    }
    const dealerBJ = isBlackjack(dHand)
    const dealerTotal = handValue(dHand)

    const newOutcomes: Record<string, Outcome> = {}
    const newTally = { ...tally }
    for (const p of validPlayers) {
      const st = finalStatus[p]
      const playerTotal = handValue(finalHands[p])
      let outcome: Outcome
      if (st === 'bust') outcome = 'lose'
      else if (st === 'blackjack' && dealerBJ) outcome = 'push'
      else if (st === 'blackjack') outcome = 'win'
      else if (dealerBJ) outcome = 'lose'
      else if (dealerTotal > 21) outcome = 'win'
      else if (playerTotal > dealerTotal) outcome = 'win'
      else if (playerTotal < dealerTotal) outcome = 'lose'
      else outcome = 'push'

      newOutcomes[p] = outcome
      const t = newTally[p] ?? { wins: 0, losses: 0, pushes: 0 }
      newTally[p] =
        outcome === 'win'
          ? { ...t, wins: t.wins + 1 }
          : outcome === 'lose'
            ? { ...t, losses: t.losses + 1 }
            : { ...t, pushes: t.pushes + 1 }
    }

    setDealerHand(dHand)
    setDeck(d)
    setOutcomes(newOutcomes)
    setTally(newTally)
    setPhase('results')
  }

  const currentPlayer = validPlayers[currentIndex]
  const outcomeLabel: Record<Outcome, { text: string; color: string }> = {
    win: { text: 'Gewonnen 🎉', color: 'text-emerald-400' },
    lose: { text: 'Verloren', color: 'text-rose-400' },
    push: { text: 'Unentschieden', color: 'text-yellow-300' },
  }

  return (
    <Screen title="🃏 Blackjack" gradient="from-emerald-950 via-slate-950 to-slate-950">
      {phase === 'setup' && (
        <div className="flex flex-1 flex-col gap-4">
          <PlayerSetup players={players} setPlayers={setPlayers} minPlayers={1} />
          <p className="text-sm text-white/50">Maximal 4 Spieler spielen gegen den Dealer.</p>
          <div className="mt-auto pt-2">
            <Button
              onClick={dealRound}
              disabled={validPlayers.length < 1}
              className="w-full !bg-emerald-500 hover:!bg-emerald-400"
            >
              Karten geben
            </Button>
          </div>
        </div>
      )}

      {phase === 'playing' && currentPlayer && (
        <div className="flex flex-1 flex-col gap-4">
          <UiCard className="flex flex-col items-center gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-white/60">
              Dealer
            </h2>
            <Hand cards={dealerHand} hideSecond />
          </UiCard>

          <div className="flex flex-1 flex-col items-center justify-center gap-4">
            <Pill>{currentPlayer} ist dran</Pill>
            <Hand cards={hands[currentPlayer]} />
            <p className="text-3xl font-extrabold">{handValue(hands[currentPlayer])}</p>
            <div className="flex w-full max-w-xs gap-3">
              <Button onClick={hit} className="flex-1 !bg-emerald-500 hover:!bg-emerald-400">
                Karte (Hit)
              </Button>
              <Button onClick={stand} variant="secondary" className="flex-1">
                Halten (Stand)
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            {validPlayers.map((p) => (
              <Pill key={p}>
                {p}
                {status[p] !== 'playing' ? ` · ${status[p]}` : ''}
              </Pill>
            ))}
          </div>
        </div>
      )}

      {phase === 'results' && (
        <div className="flex flex-1 flex-col gap-4">
          <UiCard className="flex flex-col items-center gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-white/60">
              Dealer {isBlackjack(dealerHand) ? '(Blackjack!)' : ''}
            </h2>
            <Hand cards={dealerHand} />
            <p className="text-2xl font-extrabold">{handValue(dealerHand)}</p>
          </UiCard>

          <div className="flex flex-col gap-3 overflow-y-auto">
            {validPlayers.map((p) => (
              <UiCard key={p} className="flex flex-col items-center gap-2">
                <p className="font-bold">{p}</p>
                <Hand cards={hands[p]} />
                <p className="text-xl font-extrabold">{handValue(hands[p])}</p>
                <p className={`font-bold ${outcomeLabel[outcomes[p]].color}`}>
                  {outcomeLabel[outcomes[p]].text}
                </p>
                <p className="text-xs text-white/50">
                  {tally[p]?.wins ?? 0}S · {tally[p]?.losses ?? 0}N · {tally[p]?.pushes ?? 0}U
                </p>
              </UiCard>
            ))}
          </div>

          <div className="mt-auto flex flex-col gap-3 pt-2">
            <Button onClick={dealRound} className="!bg-emerald-500 hover:!bg-emerald-400">
              Nächste Runde
            </Button>
            <Button variant="secondary" onClick={() => setPhase('setup')}>
              Zurück zur Einrichtung
            </Button>
          </div>
        </div>
      )}
    </Screen>
  )
}
