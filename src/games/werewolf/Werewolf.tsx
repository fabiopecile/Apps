import { useEffect, useMemo, useState } from 'react'
import { PlayerSetup } from '../../components/PlayerSetup'
import { usePlayers } from '../../lib/storage'
import { RevealFlow } from '../../components/RevealFlow'
import { Screen } from '../../components/Screen'
import { Button, Card, Pill } from '../../components/ui'
import { shuffle } from '../../lib/random'
import { roleInfo, steps, type Role } from './roles'

type Phase = 'setup' | 'reveal' | 'narrator' | 'ended'

const DISCUSSION_DEFAULT = 180

export function Werewolf() {
  const [players, setPlayers] = usePlayers()
  const [phase, setPhase] = useState<Phase>('setup')
  const [werewolfCount, setWerewolfCount] = useState(1)
  const [useSeherin, setUseSeherin] = useState(true)
  const [useHexe, setUseHexe] = useState(false)
  const [useJaeger, setUseJaeger] = useState(false)
  const [assignment, setAssignment] = useState<Record<string, Role>>({})
  const [stepIndex, setStepIndex] = useState(0)
  const [round, setRound] = useState(1)
  const [timeLeft, setTimeLeft] = useState(DISCUSSION_DEFAULT)
  const [timerRunning, setTimerRunning] = useState(false)

  const validPlayers = players.map((p) => p.trim()).filter(Boolean)
  const maxWerewolves = Math.max(1, Math.floor(validPlayers.length / 3))
  const specialCount = [useSeherin, useHexe, useJaeger].filter(Boolean).length
  const canFitSpecials = werewolfCount + specialCount <= validPlayers.length - 1

  const activeSteps = useMemo(
    () =>
      steps.filter(
        (s) => !s.role || (s.role === 'Seherin' && useSeherin) || (s.role === 'Hexe' && useHexe),
      ),
    [useSeherin, useHexe],
  )

  useEffect(() => {
    if (!timerRunning) return
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          setTimerRunning(false)
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [timerRunning])

  function startGame() {
    const roles: Role[] = []
    for (let i = 0; i < werewolfCount; i++) roles.push('Werwolf')
    if (useSeherin) roles.push('Seherin')
    if (useHexe) roles.push('Hexe')
    if (useJaeger) roles.push('Jäger')
    while (roles.length < validPlayers.length) roles.push('Dorfbewohner')

    const shuffledRoles = shuffle(roles).slice(0, validPlayers.length)
    const map: Record<string, Role> = {}
    shuffle(validPlayers).forEach((name, i) => {
      map[name] = shuffledRoles[i]
    })
    setAssignment(map)
    setPhase('reveal')
  }

  function beginNarrator() {
    setStepIndex(0)
    setRound(1)
    setTimeLeft(DISCUSSION_DEFAULT)
    setTimerRunning(false)
    setPhase('narrator')
  }

  function nextStep() {
    setTimerRunning(false)
    if (stepIndex === activeSteps.length - 1) {
      setStepIndex(0)
      setRound((r) => r + 1)
      setTimeLeft(DISCUSSION_DEFAULT)
    } else {
      setStepIndex((i) => i + 1)
    }
  }

  const step = activeSteps[stepIndex]
  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60

  return (
    <Screen title="🐺 Werwolf">
      {phase === 'setup' && (
        <div className="flex flex-1 flex-col gap-4">
          <PlayerSetup players={players} setPlayers={setPlayers} minPlayers={5} />

          <Card className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-white/60">
              Anzahl Werwölfe
            </h2>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setWerewolfCount((c) => Math.max(1, c - 1))}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 active:scale-95"
              >
                −
              </button>
              <span className="w-6 text-center text-lg font-bold">
                {Math.min(werewolfCount, maxWerewolves)}
              </span>
              <button
                onClick={() => setWerewolfCount((c) => Math.min(maxWerewolves, c + 1))}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 active:scale-95"
              >
                +
              </button>
            </div>
          </Card>

          <Card className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-white/60">
              Sonderrollen
            </h2>
            {[
              { key: 'Seherin', value: useSeherin, set: setUseSeherin, emoji: '🔮' },
              { key: 'Hexe', value: useHexe, set: setUseHexe, emoji: '🧪' },
              { key: 'Jäger', value: useJaeger, set: setUseJaeger, emoji: '🏹' },
            ].map((r) => (
              <label key={r.key} className="flex items-center justify-between">
                <span>
                  {r.emoji} {r.key}
                </span>
                <input
                  type="checkbox"
                  checked={r.value}
                  onChange={(e) => r.set(e.target.checked)}
                  className="h-5 w-5 accent-violet-500"
                />
              </label>
            ))}
            {!canFitSpecials && (
              <p className="text-sm text-amber-300/90">
                Zu wenige Spieler für diese Rollenkombination.
              </p>
            )}
          </Card>

          <div className="mt-auto pt-2">
            <Button
              onClick={startGame}
              disabled={validPlayers.length < 5 || !canFitSpecials}
              className="w-full"
            >
              Rollen verteilen
            </Button>
          </div>
        </div>
      )}

      {phase === 'reveal' && (
        <RevealFlow
          items={Object.entries(assignment).map(([name, role]) => ({
            name,
            content: (
              <div className="flex flex-col items-center gap-2 py-4">
                <span className="text-4xl">{roleInfo[role].emoji}</span>
                <p className="text-xl font-extrabold text-violet-300">{role}</p>
                <p className="text-sm text-white/60">{roleInfo[role].description}</p>
              </div>
            ),
          }))}
          onFinish={beginNarrator}
        />
      )}

      {phase === 'narrator' && (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <Pill>Runde {round}</Pill>
          <h2 className="text-2xl font-bold">{step.title}</h2>
          <p className="max-w-xs text-white/70">{step.text}</p>

          {step.timer && (
            <div className="flex flex-col items-center gap-3">
              <span className="font-mono text-5xl font-extrabold tabular-nums">
                {minutes}:{seconds.toString().padStart(2, '0')}
              </span>
              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setTimerRunning(!timerRunning)}>
                  {timerRunning ? 'Pause' : 'Start'}
                </Button>
                <Button variant="secondary" onClick={() => setTimeLeft(DISCUSSION_DEFAULT)}>
                  Reset
                </Button>
              </div>
            </div>
          )}

          <div className="flex w-full max-w-xs flex-col gap-3 pt-4">
            <Button onClick={nextStep}>Weiter</Button>
            <Button variant="ghost" onClick={() => setPhase('ended')}>
              Spiel beenden & Rollen aufdecken
            </Button>
          </div>
        </div>
      )}

      {phase === 'ended' && (
        <div className="flex flex-1 flex-col gap-4">
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <span className="text-5xl">🌅</span>
            <h2 className="text-2xl font-bold">Spiel beendet</h2>
            <p className="text-white/60">Hier sind alle Rollen zur Auflösung:</p>
          </div>
          <Card className="flex flex-col gap-2">
            {Object.entries(assignment).map(([name, role]) => (
              <div key={name} className="flex items-center justify-between">
                <span className="font-medium">{name}</span>
                <Pill>
                  {roleInfo[role].emoji} {role}
                </Pill>
              </div>
            ))}
          </Card>
          <Button
            onClick={() => {
              setPhase('setup')
              setAssignment({})
            }}
          >
            Neues Spiel
          </Button>
        </div>
      )}
    </Screen>
  )
}
