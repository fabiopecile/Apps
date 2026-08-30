import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { pick } from '../lib/random'
import { Screen } from './Screen'
import { Button, Card, Pill } from './ui'

type Phase = 'setup' | 'playing'

export function PromptDeck({
  title,
  gradient,
  emoji,
  intro,
  categories,
}: {
  title: string
  gradient: string
  emoji: string
  intro: string
  categories: Record<string, string[]>
}) {
  const allCategoryNames = Object.keys(categories)
  const [phase, setPhase] = useState<Phase>('setup')
  const [selected, setSelected] = useState<string[]>(allCategoryNames)
  const [used, setUsed] = useState<Set<string>>(new Set())
  const [current, setCurrent] = useState('')
  const [count, setCount] = useState(0)

  function toggle(cat: string) {
    setSelected((prev) =>
      prev.includes(cat)
        ? prev.length > 1
          ? prev.filter((c) => c !== cat)
          : prev
        : [...prev, cat],
    )
  }

  function draw(usedSet: Set<string>) {
    const pool = selected.flatMap((c) => categories[c])
    let options = pool.filter((p) => !usedSet.has(p))
    let nextUsed = usedSet
    if (options.length === 0) {
      options = pool
      nextUsed = new Set()
    }
    const next = pick(options)
    setUsed(new Set(nextUsed).add(next))
    setCurrent(next)
  }

  function start() {
    setCount(1)
    draw(new Set())
    setPhase('playing')
  }

  function next() {
    setCount((c) => c + 1)
    draw(used)
  }

  return (
    <Screen title={`${emoji} ${title}`} gradient={gradient}>
      {phase === 'setup' && (
        <div className="flex flex-1 flex-col gap-4">
          <Card className="flex flex-col gap-2">
            <p className="text-white/70">{intro}</p>
          </Card>

          <Card className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-white/60">
              Kategorien
            </h2>
            <div className="flex flex-wrap gap-2">
              {allCategoryNames.map((cat) => (
                <button
                  key={cat}
                  onClick={() => toggle(cat)}
                  className={`rounded-full px-3.5 py-2 text-sm font-medium transition ${
                    selected.includes(cat) ? 'bg-violet-500 text-white' : 'bg-white/10 text-white/60'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </Card>

          <div className="mt-auto pt-2">
            <Button onClick={start} className="w-full">
              Los geht's
            </Button>
          </div>
        </div>
      )}

      {phase === 'playing' && (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <Pill>Aussage {count}</Pill>
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0, y: 14, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="w-full max-w-sm"
            >
              <Card>
                <p className="text-xl font-semibold">{current}</p>
              </Card>
            </motion.div>
          </AnimatePresence>
          <Button onClick={next} className="w-full max-w-xs">
            Nächste Aussage
          </Button>
          <Button variant="ghost" onClick={() => setPhase('setup')}>
            Kategorien ändern
          </Button>
        </div>
      )}
    </Screen>
  )
}
