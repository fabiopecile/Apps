import { useEffect, useMemo, useRef, useState } from 'react'
import { PlayerSetup } from '../../components/PlayerSetup'
import { usePlayers } from '../../lib/storage'
import { Screen } from '../../components/Screen'
import { Button, Card, Pill } from '../../components/ui'
import { randomInt } from '../../lib/random'

type Phase = 'setup' | 'waiting' | 'go' | 'tooSoon' | 'result' | 'leaderboard'

export function ReactionTest() {
  const [players, setPlayers] = usePlayers()
  const [phase, setPhase] = useState<Phase>('setup')
  const [playerIndex, setPlayerIndex] = useState(0)
  const [bestTimes, setBestTimes] = useState<Record<string, number>>({})
  const [lastMs, setLastMs] = useState(0)
  const startRef = useRef(0)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const validPlayers = players.map((p) => p.trim()).filter(Boolean)

  useEffect(() => {
    return () => clearTimeout(timeoutRef.current)
  }, [])

  function armRound() {
    setPhase('waiting')
    const delay = randomInt(1000, 4000)
    timeoutRef.current = setTimeout(() => {
      startRef.current = performance.now()
      setPhase('go')
    }, delay)
  }

  function begin() {
    setPlayerIndex(0)
    setBestTimes({})
    armRound()
  }

  function handleTap() {
    if (phase === 'waiting') {
      clearTimeout(timeoutRef.current)
      setPhase('tooSoon')
      return
    }
    if (phase === 'go') {
      const ms = Math.round(performance.now() - startRef.current)
      setLastMs(ms)
      setBestTimes((prev) => {
        const current = validPlayers[playerIndex]
        const best = prev[current]
        return { ...prev, [current]: best === undefined ? ms : Math.min(best, ms) }
      })
      setPhase('result')
    }
  }

  function nextPlayer() {
    if (playerIndex === validPlayers.length - 1) {
      setPhase('leaderboard')
    } else {
      setPlayerIndex((i) => i + 1)
      armRound()
    }
  }

  const leaderboard = useMemo(
    () => Object.entries(bestTimes).sort((a, b) => a[1] - b[1]),
    [bestTimes],
  )

  const currentPlayer = validPlayers[playerIndex]

  return (
    <Screen title="⚡ Reaktionstest" gradient="from-amber-950 via-slate-950 to-slate-950">
      {phase === 'setup' && (
        <div className="flex flex-1 flex-col gap-4">
          <PlayerSetup players={players} setPlayers={setPlayers} minPlayers={1} />
          <div className="mt-auto pt-2">
            <Button
              onClick={begin}
              disabled={validPlayers.length < 1}
              className="w-full !bg-amber-500 hover:!bg-amber-400"
            >
              Spiel starten
            </Button>
          </div>
        </div>
      )}

      {(phase === 'waiting' || phase === 'go') && currentPlayer && (
        <div className="flex flex-1 flex-col items-center justify-center gap-6">
          <Pill>{currentPlayer} ist dran</Pill>
          <button
            onClick={handleTap}
            className={`flex h-64 w-64 items-center justify-center rounded-full text-xl font-bold transition-colors ${
              phase === 'waiting' ? 'bg-rose-600' : 'bg-emerald-500'
            }`}
          >
            {phase === 'waiting' ? 'Warten…' : 'JETZT TIPPEN!'}
          </button>
          <p className="text-white/50">Tippe, sobald das Feld grün wird.</p>
        </div>
      )}

      {phase === 'tooSoon' && currentPlayer && (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <span className="text-5xl">😅</span>
          <h2 className="text-2xl font-bold">Zu früh, {currentPlayer}!</h2>
          <Button onClick={armRound} className="w-full max-w-xs !bg-amber-500 hover:!bg-amber-400">
            Nochmal versuchen
          </Button>
        </div>
      )}

      {phase === 'result' && currentPlayer && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <span className="text-5xl">⚡</span>
          <p className="text-6xl font-extrabold text-amber-300">{lastMs}ms</p>
          <p className="text-white/60">Reaktionszeit von {currentPlayer}</p>
          <Button onClick={nextPlayer} className="mt-4 w-full max-w-xs !bg-amber-500 hover:!bg-amber-400">
            {playerIndex === validPlayers.length - 1 ? 'Ergebnisse anzeigen' : 'Nächster Spieler'}
          </Button>
        </div>
      )}

      {phase === 'leaderboard' && (
        <div className="flex flex-1 flex-col gap-4">
          <div className="flex flex-col items-center gap-2 text-center">
            <span className="text-5xl">🏆</span>
            <h2 className="text-2xl font-bold">Bestenliste</h2>
          </div>
          <Card className="flex flex-col gap-2">
            {leaderboard.map(([player, ms], i) => (
              <div key={player} className="flex items-center justify-between">
                <span className="font-medium">
                  {['🥇', '🥈', '🥉'][i] ?? `${i + 1}.`} {player}
                </span>
                <span className="text-white/70">{ms}ms</span>
              </div>
            ))}
          </Card>
          <Button onClick={begin} className="!bg-amber-500 hover:!bg-amber-400">
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
