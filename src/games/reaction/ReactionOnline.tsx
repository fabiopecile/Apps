import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { AuthGate } from '../../auth/AuthGate'
import { OutcomeBanner } from '../../components/OutcomeBanner'
import { Screen } from '../../components/Screen'
import { Button, Card, Pill } from '../../components/ui'
import { randomInt } from '../../lib/random'
import { submitScoreResult, type Outcome } from '../../league/service'

type Phase = 'waiting' | 'go' | 'tooSoon' | 'submitting' | 'result' | 'error'

function OnlineReactionContent() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [phase, setPhase] = useState<Phase>('waiting')
  const [ms, setMs] = useState(0)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{
    outcome: Outcome
    opponentScore: number
    opponentUsername: string | null
    isVsBot: boolean
  } | null>(null)
  const startRef = useRef(0)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    arm()
    return () => clearTimeout(timeoutRef.current)
  }, [])

  function arm() {
    setPhase('waiting')
    const delay = randomInt(1000, 4000)
    timeoutRef.current = setTimeout(() => {
      startRef.current = performance.now()
      setPhase('go')
    }, delay)
  }

  async function handleTap() {
    if (phase === 'waiting') {
      clearTimeout(timeoutRef.current)
      setPhase('tooSoon')
      return
    }
    if (phase === 'go') {
      const reactionMs = Math.round(performance.now() - startRef.current)
      setMs(reactionMs)
      setPhase('submitting')
      const res = await submitScoreResult('reaktionstest', profile!.id, reactionMs)
      if (!res.ok) {
        setError(res.error)
        setPhase('error')
        return
      }
      setResult(res)
      setPhase('result')
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
      {(phase === 'waiting' || phase === 'go') && (
        <>
          <Pill>⚡ Weekend League</Pill>
          <button
            onClick={handleTap}
            className={`flex h-64 w-64 items-center justify-center rounded-full text-xl font-bold transition-colors ${
              phase === 'waiting' ? 'bg-rose-600' : 'bg-emerald-500'
            }`}
          >
            {phase === 'waiting' ? 'Warten…' : 'JETZT TIPPEN!'}
          </button>
          <p className="text-white/50">Tippe, sobald das Feld grün wird.</p>
        </>
      )}

      {phase === 'tooSoon' && (
        <>
          <span className="text-5xl">😅</span>
          <h2 className="text-2xl font-bold">Zu früh!</h2>
          <Button onClick={arm} className="w-full max-w-xs !bg-amber-500 hover:!bg-amber-400">
            Nochmal versuchen
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
              <span className="font-bold">{ms}ms</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/60">
                {result.isVsBot ? 'Bot' : result.opponentUsername ?? 'Gegner'}
              </span>
              <span className="font-bold">{Math.round(result.opponentScore)}ms</span>
            </div>
          </Card>
          <div className="flex w-full max-w-xs flex-col gap-3">
            <Button onClick={arm} className="!bg-amber-500 hover:!bg-amber-400">
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

export function ReactionOnline() {
  return (
    <Screen title="⚡ Reaktionstest Online" gradient="from-amber-950 via-slate-950 to-slate-950">
      <AuthGate>
        <OnlineReactionContent />
      </AuthGate>
    </Screen>
  )
}
