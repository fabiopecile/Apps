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
      <p className="text-sm text-white/50">
        Spieler {index + 1} / {items.length}
      </p>
      {!revealed ? (
        <>
          <h2 className="text-2xl font-bold">
            Gib das Gerät an
            <br />
            <span className="text-violet-300">{current.name}</span>
          </h2>
          <Button onClick={() => setRevealed(true)} className="w-full max-w-xs">
            Tippen zum Aufdecken 👁
          </Button>
        </>
      ) : (
        <>
          <Card className="w-full max-w-sm">{current.content}</Card>
          <Button variant="secondary" onClick={next} className="w-full max-w-xs">
            {isLast ? 'Alle bereit – los geht’s!' : 'Weiter, ich hab’s mir gemerkt'}
          </Button>
        </>
      )}
    </div>
  )
}
