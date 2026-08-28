import { useMemo, useRef, useState } from 'react'
import { PlayerSetup } from '../../components/PlayerSetup'
import { usePlayers } from '../../lib/storage'
import { Screen } from '../../components/Screen'
import { Button, Card, Pill } from '../../components/ui'
import { randomInt } from '../../lib/random'

type Phase = 'setup' | 'ready' | 'running' | 'result' | 'leaderboard'

type Turn = { player: string; target: number }

const ROUND_OPTIONS = [1, 3, 5]

function rating(diff: number) {
  if (diff < 0.15) return { text: 'Perfekt! 🎯', color: 'text-emerald-400' }
  if (diff < 0.4) return { text: 'Sehr gut! 👏', color: 'text-lime-400' }
  if (diff < 0.8) return { text: 'Ganz ok 🙂', color: 'text-yellow-300' }
  if (diff < 1.5) return { text: 'Daneben 😬', color: 'text-orange-400' }
  return { text: 'Weit daneben! 😂', color: 'text-rose-400' }
}

export function TimingGame() {
  const [players, setPlayers] = usePlayers()
  const [phase, setPhase] = useState<Phase>('setup')
  const [roundsPerPlayer, setRoundsPerPlayer] = useState(3)
  const [turns, setTurns] = useState<Turn[]>([])
  const [turnIndex, setTurnIndex] = useState(0)
  const [scores, setScores] = useState<Record<string, number[]>>({})
  const [lastDiff, setLastDiff] = useState(0)
  const [lastElapsed, setLastElapsed] = useState(0)
  const startRef = useRef(0)

  const validPlayers = players.map((p) => p.trim()).filter(Boolean)

  function start() {
    const list: Turn[] = []
    for (let r = 0; r < roundsPerPlayer; r++) {
      for (const p of validPlayers) {
        list.push({ player: p, target: randomInt(5, 15) })
      }
    }
    setTurns(list)
    setTurnIndex(0)
    setScores(Object.fromEntries(validPlayers.map((p) => [p, []])))
    setPhase('ready')
  }

  function beginTiming() {
    startRef.current = performance.now()
    setPhase('running')
  }

  function stopTiming() {
    const elapsed = (performance.now() - startRef.current) / 1000
    const target = turns[turnIndex].target
    const diff = Math.abs(elapsed - target)
    setLastElapsed(elapsed)
    setLastDiff(diff)
    setScores((prev) => ({
      ...prev,
      [turns[turnIndex].player]: [...prev[turns[turnIndex].player], diff],
    }))
    setPhase('result')
  }

  function nextTurn() {
    if (turnIndex === turns.length - 1) {
      setPhase('leaderboard')
    } else {
      setTurnIndex((i) => i + 1)
      setPhase('ready')
    }
  }

  const leaderboard = useMemo(
    () =>
      Object.entries(scores)
        .map(([player, diffs]) => ({
          player,
          total: diffs.reduce((a, b) => a + b, 0),
        }))
        .sort((a, b) => a.total - b.total),
    [scores],
  )

  const currentTurn = turns[turnIndex]
  const currentRating = rating(lastDiff)

  return (
    <Screen title="⏱️ Zeitgefühl" gradient="from-cyan-950 via-slate-950 to-slate-950">
      {phase === 'setup' && (
        <div className="flex flex-1 flex-col gap-4">
          <PlayerSetup players={players} setPlayers={setPlayers} minPlayers={1} />

          <Card className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-white/60">
              Runden pro Spieler
            </h2>
            <div className="flex gap-2">
              {ROUND_OPTIONS.map((n) => (
                <button
                  key={n}
                  onClick={() => setRoundsPerPlayer(n)}
                  className={`h-9 w-9 rounded-full text-sm font-bold transition ${
                    roundsPerPlayer === n ? 'bg-cyan-500 text-white' : 'bg-white/10 text-white/60'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </Card>

          <div className="mt-auto pt-2">
            <Button
              onClick={start}
              disabled={validPlayers.length < 1}
              className="w-full !bg-cyan-500 hover:!bg-cyan-400"
            >
              Spiel starten
            </Button>
          </div>
        </div>
      )}

      {phase === 'ready' && currentTurn && (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <Pill>
            Zug {turnIndex + 1} / {turns.length}
          </Pill>
          <h2 className="text-2xl font-bold">
            {currentTurn.player} ist dran
          </h2>
          <p className="text-white/70">Ziel:</p>
          <p className="text-6xl font-extrabold text-cyan-300">{currentTurn.target}s</p>
          <p className="max-w-xs text-sm text-white/50">
            Merk dir die Zahl. Nach dem Start siehst du keine Uhr mehr – stoppe genau zur
            richtigen Sekunde!
          </p>
          <Button onClick={beginTiming} className="w-full max-w-xs !bg-cyan-500 hover:!bg-cyan-400">
            Los!
          </Button>
        </div>
      )}

      {phase === 'running' && (
        <div className="flex flex-1 flex-col items-center justify-center gap-8 text-center">
          <div className="h-32 w-32 animate-pulse rounded-full bg-cyan-500/30" />
          <p className="text-white/60">Zähl im Kopf mit…</p>
          <Button
            onClick={stopTiming}
            className="h-40 w-40 rounded-full !bg-rose-500 text-2xl hover:!bg-rose-400"
          >
            STOPP
          </Button>
        </div>
      )}

      {phase === 'result' && currentTurn && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p className="text-white/60">Ziel war {currentTurn.target}s</p>
          <p className="text-5xl font-extrabold text-cyan-300">{lastElapsed.toFixed(2)}s</p>
          <p className={`text-xl font-bold ${currentRating.color}`}>{currentRating.text}</p>
          <p className="text-white/50">Abweichung: {lastDiff.toFixed(2)}s</p>
          <Button onClick={nextTurn} className="mt-4 w-full max-w-xs !bg-cyan-500 hover:!bg-cyan-400">
            {turnIndex === turns.length - 1 ? 'Ergebnisse anzeigen' : 'Nächster Spieler'}
          </Button>
        </div>
      )}

      {phase === 'leaderboard' && (
        <div className="flex flex-1 flex-col gap-4">
          <div className="flex flex-col items-center gap-2 text-center">
            <span className="text-5xl">🏆</span>
            <h2 className="text-2xl font-bold">Ergebnisse</h2>
            <p className="text-white/60">Geringste Gesamtabweichung gewinnt</p>
          </div>
          <Card className="flex flex-col gap-2">
            {leaderboard.map((entry, i) => (
              <div key={entry.player} className="flex items-center justify-between">
                <span className="font-medium">
                  {['🥇', '🥈', '🥉'][i] ?? `${i + 1}.`} {entry.player}
                </span>
                <span className="text-white/70">{entry.total.toFixed(2)}s</span>
              </div>
            ))}
          </Card>
          <Button onClick={start} className="!bg-cyan-500 hover:!bg-cyan-400">
            Nochmal spielen
          </Button>
          <Button variant="secondary" onClick={() => setPhase('setup')}>
            Zurück zur Einrichtung
          </Button>
        </div>
      )}
    </Screen>
  )
}
