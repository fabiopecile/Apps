export type Suit = '♠' | '♥' | '♦' | '♣'
export type Card = { rank: string; suit: Suit }

const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']
const suits: Suit[] = ['♠', '♥', '♦', '♣']

export function buildDeck(): Card[] {
  const deck: Card[] = []
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ rank, suit })
    }
  }
  return deck
}

export function shuffleDeck(deck: Card[]): Card[] {
  const arr = [...deck]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export function cardValue(card: Card): number {
  if (card.rank === 'A') return 11
  if (['J', 'Q', 'K'].includes(card.rank)) return 10
  return parseInt(card.rank, 10)
}

export function handValue(cards: Card[]): number {
  let total = cards.reduce((sum, c) => sum + cardValue(c), 0)
  let aces = cards.filter((c) => c.rank === 'A').length
  while (total > 21 && aces > 0) {
    total -= 10
    aces -= 1
  }
  return total
}

export function isBlackjack(cards: Card[]): boolean {
  return cards.length === 2 && handValue(cards) === 21
}

export function isRed(suit: Suit): boolean {
  return suit === '♥' || suit === '♦'
}
