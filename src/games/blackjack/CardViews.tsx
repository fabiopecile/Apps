import { isRed, type Card } from './deck'

export function CardFace({ card, hidden }: { card: Card; hidden?: boolean }) {
  if (hidden) {
    return (
      <div className="flex h-16 w-11 items-center justify-center rounded-lg border border-white/20 bg-gradient-to-br from-violet-700 to-violet-900 text-lg">
        🂠
      </div>
    )
  }
  return (
    <div
      className={`flex h-16 w-11 flex-col items-center justify-center rounded-lg border border-white/20 bg-white font-bold ${
        isRed(card.suit) ? 'text-rose-600' : 'text-slate-900'
      }`}
    >
      <span className="text-sm leading-none">{card.rank}</span>
      <span className="text-lg leading-none">{card.suit}</span>
    </div>
  )
}

export function Hand({ cards, hideSecond = false }: { cards: Card[]; hideSecond?: boolean }) {
  return (
    <div className="flex gap-1.5">
      {cards.map((c, i) => (
        <CardFace key={i} card={c} hidden={hideSecond && i === 1} />
      ))}
    </div>
  )
}
