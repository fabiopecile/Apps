import { useState } from 'react'
import { Button, Card } from './ui'

export function PlayerSetup({
  players,
  setPlayers,
  minPlayers = 3,
}: {
  players: string[]
  setPlayers: (p: string[]) => void
  minPlayers?: number
}) {
  const [draft, setDraft] = useState('')

  function addPlayer() {
    const name = draft.trim()
    if (!name) return
    setPlayers([...players, name])
    setDraft('')
  }

  function removePlayer(index: number) {
    setPlayers(players.filter((_, i) => i !== index))
  }

  function updatePlayer(index: number, value: string) {
    setPlayers(players.map((p, i) => (i === index ? value : p)))
  }

  const validCount = players.filter((p) => p.trim()).length

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-white/60">
        Spieler ({validCount})
      </h2>
      <div className="flex flex-col gap-2">
        {players.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={p}
              onChange={(e) => updatePlayer(i, e.target.value)}
              placeholder={`Spieler ${i + 1}`}
              className="flex-1 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-white placeholder:text-white/40 outline-none focus:border-violet-400"
            />
            <button
              onClick={() => removePlayer(i)}
              aria-label="Entfernen"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white/70 active:scale-95"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addPlayer()}
          placeholder="Name hinzufügen…"
          className="flex-1 rounded-xl border border-dashed border-white/20 bg-transparent px-4 py-2.5 text-white placeholder:text-white/40 outline-none focus:border-violet-400"
        />
        <Button variant="secondary" onClick={addPlayer} className="shrink-0 px-4 py-2.5">
          +
        </Button>
      </div>
      {validCount < minPlayers && (
        <p className="text-sm text-amber-300/90">
          Mindestens {minPlayers} Spieler nötig.
        </p>
      )}
    </Card>
  )
}
