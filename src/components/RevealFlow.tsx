import { AnimatePresence, motion } from 'framer-motion'
import { useState, type ReactNode } from 'react'
import { Button, Card } from './ui'

export function RevealFlow({
  items,
  onFinish,
}: {
  items: { name: string; content: ReactNode }[]
  onFinish: () => void
}) {
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const current = items[index]
  const isLast = index === items.length - 1

  function next() {
    if (isLast) {
      onFinish()
      return
    }
    setRevealed(false)
    setIndex((i) => i + 1)
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
      <AnimatePresence mode="wait">
        <motion.p
          key={index}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="text-sm text-white/50"
        >
          Spieler {index + 1} / {items.length}
        </motion.p>
      </AnimatePresence>

      <div className="w-full max-w-sm" style={{ perspective: 1200 }}>
        <motion.div
          className="grid [transform-style:preserve-3d]"
          animate={{ rotateY: revealed ? 180 : 0 }}
          transition={{ duration: 0.55, ease: 'easeInOut' }}
        >
          <div className="col-start-1 row-start-1 flex flex-col items-center gap-6 [backface-visibility:hidden]">
            <h2 className="text-2xl font-bold">
              Gib das Gerät an
              <br />
              <span className="text-violet-300">{current.name}</span>
            </h2>
            <Button
              onClick={() => setRevealed(true)}
              disabled={revealed}
              className="w-full max-w-xs"
            >
              Tippen zum Aufdecken 👁
            </Button>
          </div>
          <div className="col-start-1 row-start-1 [backface-visibility:hidden] [transform:rotateY(180deg)]">
            <Card>{current.content}</Card>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {revealed && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.3, duration: 0.3 }}
            className="w-full max-w-xs"
          >
            <Button variant="secondary" onClick={next} className="w-full">
              {isLast ? 'Alle bereit – los geht’s!' : 'Weiter, ich hab’s mir gemerkt'}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
