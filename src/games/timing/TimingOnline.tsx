import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { AuthGate } from '../../auth/AuthGate'
import { OutcomeBanner } from '../../components/OutcomeBanner'
import { Screen } from '../../components/Screen'
import { Button, Card, Pill } from '../../components/ui'
import { randomInt } from '../../lib/random'
import { submitScoreResult, type Outcome } from '../../league/service'

type Phase = 'ready' | 'running' | 'submitting' | 'result' | 'error'

function OnlineTimingContent() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [phase, setPhase] = useState<Phase>('ready')
  const [target, setTarget] = useState(() => randomInt(5, 15))
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{
    outcome: Outcome
    opponentScore: number
    opponentUsername: string | null
    isVsBot: boolean
  } | null>(null)
  const startRef = useRef(0)

  function begin() {
    startRef.current = performance.now()
    setPhase('running')
  }

  async function stop() {
    const elapsedSec = (performance.now() - startRef.current) / 1000
    const diff = Math.abs(elapsedSec - target)
    setElapsed(elapsedSec)
    setPhase('submitting')
    const res = await submitScoreResult('zeitgefuehl', profile!.id, diff)
    if (!res.ok) {
      setError(res.error)
      setPhase('error')
      return
    }
    setResult(res)
    setPhase('result')
  }

  function playAgain() {
    setTarget(randomInt(5, 15))
    setResult(null)
    setPhase('ready')
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
      {phase === 'ready' && (
        <>
          <Pill>⏱️ Weekend League</Pill>
          <p className="text-white/70">Ziel:</p>
          <p className="text-6xl font-extrabold text-cyan-300">{target}s</p>
          <p className="max-w-xs text-sm text-white/50">
            Dein Ergebnis wird gegen einen anderen Spieler dieses Wochenendes gewertet.
          </p>
          <Button onClick={begin} className="w-full max-w-xs !bg-cyan-500 hover:!bg-cyan-400">
            Los!
          </Button>
        </>
      )}

      {phase === 'running' && (
        <>
          <div className="h-32 w-32 animate-pulse rounded-full bg-cyan-500/30" />
          <p className="text-white/60">Zähl im Kopf mit…</p>
          <Button onClick={stop} className="h-40 w-40 rounded-full !bg-rose-500 text-2xl hover:!bg-rose-400">
            STOPP
          </Button>
        </>
      )}

      {phase === 'submitting' && <p className="text-white/50">Ergebnis wird übermittelt…</p>}

      {phase === 'error' && (
        <>
          <p className="text-rose-400">{error}</p>
          <Button variant="secondary" onClick={() => navigate('/liga')}>
            Zurück zur Liga
          </Button>
        </>
      )}

      {phase === 'result' && result && (
        <>
          <OutcomeBanner outcome={result.outcome} />
          <Card className="flex w-full max-w-sm flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-white/60">Du</span>
              <span className="font-bold">{Math.abs(elapsed - target).toFixed(2)}s daneben</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/60">
                {result.isVsBot ? 'Bot' : result.opponentUsername ?? 'Gegner'}
              </span>
              <span className="font-bold">{result.opponentScore.toFixed(2)}s daneben</span>
            </div>
          </Card>
          <div className="flex w-full max-w-xs flex-col gap-3">
            <Button onClick={playAgain} className="!bg-cyan-500 hover:!bg-cyan-400">
              Nochmal
            </Button>
            <Button variant="secondary" onClick={() => navigate('/liga')}>
              Zurück zur Liga
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

export function TimingOnline() {
  return (
    <Screen title="⏱️ Zeitgefühl Online" gradient="from-cyan-950 via-slate-950 to-slate-950">
      <AuthGate>
        <OnlineTimingContent />
      </AuthGate>
    </Screen>
  )
}
