import { useState } from 'react'
import { PlayerSetup } from '../../components/PlayerSetup'
import { usePlayers } from '../../lib/storage'
import { Screen } from '../../components/Screen'
import { Button, Card, Pill } from '../../components/ui'
import { pick } from '../../lib/random'
import { allCategories, dares, truths, type Category } from './prompts'

type Phase = 'setup' | 'choosing' | 'prompt'
type Kind = 'Wahrheit' | 'Pflicht'

export function TruthOrDare() {
  const [players, setPlayers] = usePlayers()
  const [phase, setPhase] = useState<Phase>('setup')
  const [selectedCategories, setSelectedCategories] = useState<Category[]>(allCategories)
  const [playerIndex, setPlayerIndex] = useState(0)
  const [kind, setKind] = useState<Kind>('Wahrheit')
  const [prompt, setPrompt] = useState('')
  const [used, setUsed] = useState<Set<string>>(new Set())

  const validPlayers = players.map((p) => p.trim()).filter(Boolean)

  function toggleCategory(cat: Category) {
    setSelectedCategories((prev) =>
      prev.includes(cat)
        ? prev.length > 1
          ? prev.filter((c) => c !== cat)
          : prev
        : [...prev, cat],
    )
  }

  function begin() {
    setPlayerIndex(0)
    setUsed(new Set())
    setPhase('choosing')
  }

  function choose(selectedKind: Kind) {
    const pool = selectedCategories.flatMap((c) =>
      (selectedKind === 'Wahrheit' ? truths : dares)[c],
    )
    let options = pool.filter((p) => !used.has(p))
    if (options.length === 0) {
      setUsed(new Set())
      options = pool
    }
    const next = pick(options)
    setUsed((prev) => new Set(prev).add(next))
    setKind(selectedKind)
    setPrompt(next)
    setPhase('prompt')
  }

  function nextPlayer() {
    setPlayerIndex((i) => (validPlayers.length ? (i + 1) % validPlayers.length : 0))
    setPhase('choosing')
  }

  const currentPlayer = validPlayers[playerIndex]

  return (
    <Screen title="🎯 Wahrheit oder Pflicht" gradient="from-orange-950 via-slate-950 to-slate-950">
      {phase === 'setup' && (
        <div className="flex flex-1 flex-col gap-4">
          <PlayerSetup players={players} setPlayers={setPlayers} minPlayers={1} />

          <Card className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-white/60">
              Kategorien
            </h2>
            <div className="flex flex-wrap gap-2">
              {allCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className={`rounded-full px-3.5 py-2 text-sm font-medium transition ${
                    selectedCategories.includes(cat)
                      ? 'bg-orange-500 text-white'
                      : 'bg-white/10 text-white/60'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </Card>

          <div className="mt-auto pt-2">
            <Button onClick={begin} className="w-full !bg-orange-500 hover:!bg-orange-400">
              Spiel starten
            </Button>
          </div>
        </div>
      )}

      {phase === 'choosing' && (
        <div className="flex flex-1 flex-col items-center justify-center gap-8 text-center">
          {currentPlayer && (
            <>
              <Pill>Am Zug</Pill>
              <h2 className="text-3xl font-extrabold">{currentPlayer}</h2>
            </>
          )}
          <div className="flex w-full max-w-xs flex-col gap-4">
            <Button
              onClick={() => choose('Wahrheit')}
              className="!bg-blue-500 py-5 text-lg hover:!bg-blue-400"
            >
              💬 Wahrheit
            </Button>
            <Button
              onClick={() => choose('Pflicht')}
              className="!bg-orange-500 py-5 text-lg hover:!bg-orange-400"
            >
              🔥 Pflicht
            </Button>
          </div>
        </div>
      )}

      {phase === 'prompt' && (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <Pill>{kind === 'Wahrheit' ? '💬 Wahrheit' : '🔥 Pflicht'}</Pill>
          <Card className="w-full max-w-sm">
            <p className="text-xl font-semibold">{prompt}</p>
          </Card>
          <Button onClick={nextPlayer} className="w-full max-w-xs !bg-orange-500 hover:!bg-orange-400">
            {validPlayers.length ? 'Nächste Person' : 'Nächste Frage'}
          </Button>
        </div>
      )}
    </Screen>
  )
}
