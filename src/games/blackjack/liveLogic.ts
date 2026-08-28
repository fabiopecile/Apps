import type { Outcome } from '../../league/service'
import { buildDeck, handValue, isBlackjack, shuffleDeck, type Card } from './deck'

export type Seat = 'host' | 'guest'
export type HandStatus = 'playing' | 'stand' | 'bust' | 'blackjack'
export type LivePhase = 'turn' | 'dealer' | 'result'

export type LiveState = {
  phase: LivePhase
  turn: Seat
  hostHand: Card[]
  guestHand: Card[]
  dealerHand: Card[]
  hostStatus: HandStatus
  guestStatus: HandStatus
  dealerRevealed: boolean
  hostOutcome?: Outcome
  guestOutcome?: Outcome
}

/** Mutable authoritative deck kept only on the host's client. */
export function createDeckState() {
  return { cards: shuffleDeck(buildDeck()) }
}

function draw(deckState: { cards: Card[] }): Card {
  const [card, ...rest] = deckState.cards
  deckState.cards = rest
  return card
}

export function dealInitial(deckState: { cards: Card[] }): LiveState {
  const hostHand = [draw(deckState), draw(deckState)]
  const guestHand = [draw(deckState), draw(deckState)]
  const dealerHand = [draw(deckState), draw(deckState)]

  const hostStatus: HandStatus = isBlackjack(hostHand) ? 'blackjack' : 'playing'
  const guestStatus: HandStatus = isBlackjack(guestHand) ? 'blackjack' : 'playing'

  const state: LiveState = {
    phase: 'turn',
    turn: hostStatus === 'playing' ? 'host' : 'guest',
    hostHand,
    guestHand,
    dealerHand,
    hostStatus,
    guestStatus,
    dealerRevealed: false,
  }

  // Both hands were instantly terminal (e.g. both got a natural blackjack) —
  // nobody will ever get a turn to trigger dealer resolution, so do it now.
  if (hostStatus !== 'playing' && guestStatus !== 'playing') {
    return resolveDealer(state, deckState)
  }
  return state
}

export function applyAction(
  state: LiveState,
  deckState: { cards: Card[] },
  seat: Seat,
  action: 'hit' | 'stand',
): LiveState {
  if (state.phase !== 'turn' || state.turn !== seat) return state
  const handKey = seat === 'host' ? 'hostHand' : 'guestHand'
  const statusKey = seat === 'host' ? 'hostStatus' : 'guestStatus'
  if (state[statusKey] !== 'playing') return state

  let next = { ...state }
  if (action === 'hit') {
    const newHand = [...state[handKey], draw(deckState)]
    const value = handValue(newHand)
    next = { ...next, [handKey]: newHand, [statusKey]: value > 21 ? 'bust' : 'playing' }
  } else {
    next = { ...next, [statusKey]: 'stand' }
  }

  if (next[statusKey] === 'playing') {
    // Same seat may act again (another hit).
    return { ...next, phase: 'turn', turn: seat }
  }

  const otherSeat: Seat = seat === 'host' ? 'guest' : 'host'
  const otherStatusKey = otherSeat === 'host' ? 'hostStatus' : 'guestStatus'
  if (next[otherStatusKey] === 'playing') {
    return { ...next, phase: 'turn', turn: otherSeat }
  }
  return resolveDealer(next, deckState)
}

function judgeAgainstDealer(playerStatus: HandStatus, playerHand: Card[], dealerHand: Card[]): Outcome {
  const dealerBJ = isBlackjack(dealerHand)
  const dealerTotal = handValue(dealerHand)
  const playerTotal = handValue(playerHand)

  if (playerStatus === 'bust') return 'lose'
  if (playerStatus === 'blackjack' && dealerBJ) return 'draw'
  if (playerStatus === 'blackjack') return 'win'
  if (dealerBJ) return 'lose'
  if (dealerTotal > 21) return 'win'
  if (playerTotal > dealerTotal) return 'win'
  if (playerTotal < dealerTotal) return 'lose'
  return 'draw'
}

export function resolveDealer(state: LiveState, deckState: { cards: Card[] }): LiveState {
  let dealerHand = [...state.dealerHand]
  // Only a made (stood) hand needs a total to compare against — a bust already
  // lost and a natural blackjack is judged against the dealer's own blackjack
  // status alone, so the dealer only needs to draw further if someone stood.
  const needsDealerDraw = state.hostStatus === 'stand' || state.guestStatus === 'stand'
  if (needsDealerDraw) {
    while (handValue(dealerHand) < 17) {
      dealerHand = [...dealerHand, draw(deckState)]
    }
  }

  const hostOutcome = judgeAgainstDealer(state.hostStatus, state.hostHand, dealerHand)
  const guestOutcome = judgeAgainstDealer(state.guestStatus, state.guestHand, dealerHand)

  return {
    ...state,
    dealerHand,
    dealerRevealed: true,
    phase: 'result',
    hostOutcome,
    guestOutcome,
  }
}
