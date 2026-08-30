import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { Screen } from '../../components/Screen'
import { Button, Card, Pill } from '../../components/ui'
import { CardFace } from '../blackjack/CardViews'
import { buildDeck, shuffleDeck, type Card as CardT } from '../blackjack/deck'
import { ruleByRank } from './rules'

type Phase = 'intro' | 'playing' | 'finished'

export function KingsCup() {
  const [phase, setPhase] = useState<Phase>('intro')
  const [deck, setDeck] = useState<CardT[]>([])
  const [current, setCurrent] = useState<CardT | null>(null)
  const [kingsDrawn, setKingsDrawn] = useState(0)
  const [drawnCount, setDrawnCount] = useState(0)

  function start() {
    const fresh = shuffleDeck(buildDeck())
    const [first, ...rest] = fresh
    setDeck(rest)
    setCurrent(first)
    setDrawnCount(1)
    setKingsDrawn(first.rank === 'K' ? 1 : 0)
    setPhase('playing')
  }

  function drawNext() {
    if (deck.length === 0) {
      setPhase('finished')
      return
    }
    const [next, ...rest] = deck
    setDeck(rest)
    setCurrent(next)
    setDrawnCount((c) => c + 1)
    if (next.rank === 'K') setKingsDrawn((k) => k + 1)
  }

  const rule = current ? ruleByRank[current.rank] : null
  const isFourthKing = current?.rank === 'K' && kingsDrawn === 4

  return (
    <Screen title="👑 Kings Cup" gradient="from-amber-950 via-slate-950 to-slate-950">
      {phase === 'intro' && (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <span className="text-5xl">👑</span>
          <h2 className="text-2xl font-bold">Kings Cup</h2>
          <p className="max-w-xs text-white/60">
            Stellt ein Glas in die Mitte des Tischs (den „Kings Cup“). Reihum zieht jeder eine
            Karte – die App zeigt euch die Regel dazu. Wer den vierten König zieht, trinkt den
            ganzen Kings Cup!
          </p>
          <Button onClick={start} className="w-full max-w-xs !bg-amber-500 hover:!bg-amber-400">
            Spiel starten
          </Button>
        </div>
      )}

      {phase === 'playing' && current && rule && (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <Pill>
            Karte {drawnCount} / 52 · 👑 {kingsDrawn}/4
          </Pill>
          <AnimatePresence mode="wait">
            <motion.div
              key={drawnCount}
              initial={{ opacity: 0, rotateY: -90 }}
              animate={{ opacity: 1, rotateY: 0 }}
              transition={{ duration: 0.35 }}
              className="flex flex-col items-center gap-4"
            >
              <div className="scale-150">
                <CardFace card={current} />
              </div>
              <Card className={`mt-4 w-full max-w-sm ${isFourthKing ? 'ring-2 ring-amber-400' : ''}`}>
                <p className="text-lg font-bold text-amber-300">{rule.title}</p>
                <p className="mt-1 text-white/80">{rule.text}</p>
                {isFourthKing && (
                  <p className="mt-2 text-2xl font-extrabold text-amber-400">
                    🍻 Vierter König – Kings Cup austrinken!
                  </p>
                )}
              </Card>
            </motion.div>
          </AnimatePresence>
          <Button onClick={drawNext} className="w-full max-w-xs !bg-amber-500 hover:!bg-amber-400">
            {deck.length === 0 ? 'Letzte Karte gezogen – Ergebnis' : 'Nächste Karte'}
          </Button>
        </div>
      )}

      {phase === 'finished' && (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <span className="text-5xl">🎉</span>
          <h2 className="text-2xl font-bold">Deck leer – Spiel beendet!</h2>
          <p className="text-white/60">Alle 52 Karten wurden gezogen.</p>
          <Button onClick={start} className="w-full max-w-xs !bg-amber-500 hover:!bg-amber-400">
            Neues Spiel
          </Button>
        </div>
      )}
    </Screen>
  )
}
