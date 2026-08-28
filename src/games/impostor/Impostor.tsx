import { useState } from 'react'
import { PlayerSetup } from '../../components/PlayerSetup'
import { usePlayers } from '../../lib/storage'
import { RevealFlow } from '../../components/RevealFlow'
import { Screen } from '../../components/Screen'
import { Button, Card, Pill } from '../../components/ui'
import { pick, pickMany, shuffle } from '../../lib/random'
import { allCategoryNames, categories } from './words'

type Phase = 'setup' | 'reveal' | 'playing' | 'ended'

type Round = {
  order: string[]
  impostors: Set<string>
  word: string
  category: string
}

export function Impostor() {
  const [players, setPlayers] = usePlayers()
  const [phase, setPhase] = useState<Phase>('setup')
  const [selectedCategories, setSelectedCategories] = useState<string[]>(allCategoryNames)
  const [impostorCount, setImpostorCount] = useState(1)
  const [round, setRound] = useState<Round | null>(null)

  const validPlayers = players.map((p) => p.trim()).filter(Boolean)
  const maxImpostors = Math.max(1, Math.min(2, validPlayers.length - 2))

  function toggleCategory(cat: string) {
    setSelectedCategories((prev) =>
      prev.includes(cat)
        ? prev.length > 1
          ? prev.filter((c) => c !== cat)
          : prev
        : [...prev, cat],
    )
  }

  function startRound() {
    const pool = selectedCategories.length ? selectedCategories : allCategoryNames
    const category = pick(pool)
    const word = pick(categories[category])
    const order = shuffle(validPlayers)
    const impostors = new Set(pickMany(order, impostorCount))
    setRound({ order, impostors, word, category })
    setPhase('reveal')
  }

  function restart() {
    setPhase('setup')
    setRound(null)
  }

  return (
    <Screen title="🕵️ Impostor">
      {phase === 'setup' && (
        <div className="flex flex-1 flex-col gap-4">
          <PlayerSetup players={players} setPlayers={setPlayers} minPlayers={3} />

          <Card className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-white/60">
              Kategorien
            </h2>
            <div className="flex flex-wrap gap-2">
              {allCategoryNames.map((cat) => (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className={`rounded-full px-3.5 py-2 text-sm font-medium transition ${
                    selectedCategories.includes(cat)
                      ? 'bg-violet-500 text-white'
                      : 'bg-white/10 text-white/60'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </Card>

          <Card className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-white/60">
                Anzahl Impostor
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setImpostorCount((c) => Math.max(1, c - 1))}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 active:scale-95"
              >
                −
              </button>
              <span className="w-6 text-center text-lg font-bold">
                {Math.min(impostorCount, maxImpostors)}
              </span>
              <button
                onClick={() => setImpostorCount((c) => Math.min(maxImpostors, c + 1))}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 active:scale-95"
              >
                +
              </button>
            </div>
          </Card>

          <div className="mt-auto pt-2">
            <Button
              onClick={startRound}
              disabled={validPlayers.length < 3}
              className="w-full"
            >
              Runde starten
            </Button>
          </div>
        </div>
      )}

      {phase === 'reveal' && round && (
        <RevealFlow
          items={round.order.map((name) => ({
            name,
            content: round.impostors.has(name) ? (
              <div className="flex flex-col items-center gap-2 py-4">
                <span className="text-4xl">🕵️</span>
                <p className="text-xl font-extrabold text-rose-400">Du bist der Impostor!</p>
                <p className="text-white/60">
                  Kategorie: <span className="font-semibold text-white">{round.category}</span>
                </p>
                <p className="text-sm text-white/50">
                  Du kennst das Wort nicht. Hör gut zu und tu so, als wüsstest du Bescheid!
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-4">
                <span className="text-4xl">🤫</span>
                <p className="text-white/60">Das geheime Wort ist:</p>
                <p className="text-2xl font-extrabold text-violet-300">{round.word}</p>
                <p className="text-sm text-white/50">Kategorie: {round.category}</p>
              </div>
            ),
          }))}
          onFinish={() => setPhase('playing')}
        />
      )}

      {phase === 'playing' && round && (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <Pill>🗣️ Diskussionsrunde</Pill>
          <h2 className="text-2xl font-bold">
            Diskutiert und findet
            <br />
            den Impostor!
          </h2>
          <p className="max-w-xs text-white/60">
            Jeder beschreibt reihum das Wort (ohne es zu nennen). Wer verdächtig ist, fliegt raus.
            Stimmt am Ende ab!
          </p>
          <Button onClick={() => setPhase('ended')} className="w-full max-w-xs">
            Auflösung anzeigen
          </Button>
        </div>
      )}

      {phase === 'ended' && round && (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <span className="text-5xl">🎭</span>
          <h2 className="text-2xl font-bold">
            {round.impostors.size > 1 ? 'Die Impostor waren:' : 'Der Impostor war:'}
          </h2>
          <p className="text-3xl font-extrabold text-rose-400">
            {[...round.impostors].join(' & ')}
          </p>
          <p className="text-white/60">
            Das Wort war <span className="font-semibold text-white">{round.word}</span> (
            {round.category})
          </p>
          <div className="flex w-full max-w-xs flex-col gap-3">
            <Button onClick={startRound}>Neue Runde, gleiche Spieler</Button>
            <Button variant="secondary" onClick={restart}>
              Zurück zur Einrichtung
            </Button>
          </div>
        </div>
      )}
    </Screen>
  )
}
