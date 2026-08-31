import type { RealtimeChannel, RealtimePresenceState } from '@supabase/supabase-js'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { AuthGate } from '../../auth/AuthGate'
import { OutcomeBanner } from '../../components/OutcomeBanner'
import { Screen } from '../../components/Screen'
import { Button, Card as UiCard, Pill } from '../../components/ui'
import { MAX_GAMES_PER_WEEKEND } from '../../league/divisions'
import { fetchWeekendStats, submitBlackjackResult } from '../../league/service'
import { getWeekendInfo } from '../../league/weekend'
import { supabase } from '../../lib/supabase'
import { Hand } from './CardViews'
import { handValue } from './deck'
import { applyAction, createDeckState, dealInitial, type LiveState, type Seat } from './liveLogic'
import { computePartner, hostIdFor, tableIdFor } from './matchmaking'

const LOBBY_TOPIC = 'blackjack-lobby'
const CONNECT_TIMEOUT_MS = 12000
const DEAL_STEP_MS = 350
const DEAL_REVEAL_STEPS = 4 // my card 1, opponent card 1, my card 2, opponent card 2

type PresenceMeta = { username: string; joinedAt: number }

type Stage =
  | 'checking'
  | 'blocked'
  | 'searching'
  | 'connecting'
  | 'playing'
  | 'result'
  | 'abandoned'
  | 'error'


function LiveContent() {
  const { profile } = useAuth()
  const navigate = useNavigate()

  const [stage, setStage] = useState<Stage>('checking')
  const [message, setMessage] = useState('')
  const [opponentName, setOpponentName] = useState('Gegner')
  const [liveState, setLiveState] = useState<LiveState | null>(null)
  const [round, setRound] = useState(0) // bump to restart matchmaking effects
  const [matchToken, setMatchToken] = useState(0) // bump exactly once per paired match
  const [isHost, setIsHost] = useState(false) // mirrors isHostRef, for rendering only
  const [dealingRevealCount, setDealingRevealCount] = useState(0)
  const [showDealing, setShowDealing] = useState(false)

  const lobbyRef = useRef<RealtimeChannel | null>(null)
  const tableRef = useRef<RealtimeChannel | null>(null)
  const deckRef = useRef(createDeckState())
  const isHostRef = useRef(false)
  const partnerIdRef = useRef<string | null>(null)
  const dealtRef = useRef(false)
  const submittedRef = useRef(false)
  // Purely local reveal animation for the opening deal — the network state
  // is already fully resolved the moment liveState arrives, this just
  // staggers how much of it we show before the Hit/Stand UI appears.
  const initialDealShownRef = useRef(false)
  // Mirrors `liveState` so channel callbacks always read the latest value
  // without needing to resubscribe whenever state changes.
  const liveStateRef = useRef<LiveState | null>(null)
  useEffect(() => {
    liveStateRef.current = liveState
  }, [liveState])

  // The very first liveState of a match is the opening deal — stage a local
  // reveal animation for it instead of showing both full hands instantly.
  useEffect(() => {
    if (liveState && !initialDealShownRef.current) {
      initialDealShownRef.current = true
      setDealingRevealCount(0)
      setShowDealing(true)
    }
  }, [liveState])

  useEffect(() => {
    if (!showDealing) return
    if (dealingRevealCount >= DEAL_REVEAL_STEPS) {
      setShowDealing(false)
      return
    }
    const timer = setTimeout(() => setDealingRevealCount((c) => c + 1), DEAL_STEP_MS)
    return () => clearTimeout(timer)
  }, [showDealing, dealingRevealCount])

  // Reset the reveal animation whenever a brand new match starts. By the time
  // a new match can start, the previous deal animation has always already
  // finished (showDealing/dealingRevealCount are back at their defaults) —
  // only the "have we shown this match's deal yet" flag needs clearing.
  useEffect(() => {
    initialDealShownRef.current = false
  }, [matchToken])

  const profileId = profile?.id
  const username = profile?.username

  function cleanupChannels() {
    lobbyRef.current?.unsubscribe()
    lobbyRef.current = null
    tableRef.current?.unsubscribe()
    tableRef.current = null
  }

  // Pre-flight: league must be active and quota left.
  useEffect(() => {
    if (!profileId) return
    let cancelled = false
    ;(async () => {
      const { isActive } = getWeekendInfo()
      if (!isActive) {
        if (!cancelled) {
          setMessage('Die Weekend League läuft nur von Freitag bis Sonntag.')
          setStage('blocked')
        }
        return
      }
      const stats = await fetchWeekendStats(profileId)
      if (stats.blackjack.played >= MAX_GAMES_PER_WEEKEND) {
        if (!cancelled) {
          setMessage(`Du hast deine ${MAX_GAMES_PER_WEEKEND} Spiele für dieses Wochenende aufgebraucht.`)
          setStage('blocked')
        }
        return
      }
      if (!cancelled) setStage('searching')
    })()
    return () => {
      cancelled = true
    }
  }, [profileId, round])

  // Lobby: wait for presence sync to pair us with a waiting opponent.
  useEffect(() => {
    if (stage !== 'searching' || !supabase || !profileId || !username) return

    let matched = false
    const channel = supabase.channel(LOBBY_TOPIC, { config: { presence: { key: profileId } } })
    lobbyRef.current = channel

    channel.on('presence', { event: 'sync' }, () => {
      if (matched) return
      const state = channel.presenceState<PresenceMeta>()
      const partnerId = computePartner(state, profileId)
      if (!partnerId) return
      matched = true
      const meta = state[partnerId]?.[0]
      setOpponentName(meta?.username ?? 'Gegner')
      partnerIdRef.current = partnerId
      isHostRef.current = hostIdFor(profileId, partnerId) === profileId
      setIsHost(isHostRef.current)
      dealtRef.current = false
      deckRef.current = createDeckState()
      channel.untrack()
      channel.unsubscribe()
      setStage('connecting')
      setMatchToken((t) => t + 1)
    })

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ username, joinedAt: Date.now() })
      }
    })

    return () => {
      channel.unsubscribe()
      if (lobbyRef.current === channel) lobbyRef.current = null
    }
  }, [stage, profileId, username])

  // Table: deal (host) / wait for deal (guest), relay actions, detect disconnects.
  // Keyed on matchToken (not `stage`) so this stays subscribed as the game
  // itself moves through 'playing' / 'result' — only a brand new match should
  // tear it down and reconnect.
  useEffect(() => {
    if (matchToken === 0 || !supabase || !profileId) return
    const partnerId = partnerIdRef.current
    if (!partnerId) return

    const tableId = tableIdFor(profileId, partnerId)
    const channel = supabase.channel(`blackjack-table-${tableId}`, {
      config: { presence: { key: profileId } },
    })
    tableRef.current = channel

    function broadcastState(next: LiveState) {
      setLiveState(next)
      setStage(next.phase === 'result' ? 'result' : 'playing')
      channel.send({ type: 'broadcast', event: 'state', payload: next })
    }

    function hostApply(seat: Seat, action: 'hit' | 'stand') {
      const current = liveStateRef.current
      if (!current) return
      const next = applyAction(current, deckRef.current, seat, action)
      broadcastState(next)
    }

    channel.on('presence', { event: 'sync' }, () => {
      if (dealtRef.current || !isHostRef.current) return
      const state: RealtimePresenceState = channel.presenceState()
      const ids = Object.keys(state)
      if (ids.includes(profileId) && ids.includes(partnerId)) {
        dealtRef.current = true
        const initial = dealInitial(deckRef.current)
        broadcastState(initial)
      }
    })

    channel.on('presence', { event: 'leave' }, ({ key }: { key: string }) => {
      if (key === partnerId) {
        setStage((prev) => (prev === 'result' ? prev : 'abandoned'))
      }
    })

    channel.on<LiveState>('broadcast', { event: 'state' }, ({ payload }) => {
      setLiveState(payload)
      setStage(payload.phase === 'result' ? 'result' : 'playing')
    })

    channel.on<{ type: 'hit' | 'stand' }>('broadcast', { event: 'action' }, ({ payload }) => {
      if (!isHostRef.current) return
      hostApply('guest', payload.type)
    })

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ joinedAt: Date.now() })
      }
    })

    const timeout = setTimeout(() => {
      if (!dealtRef.current && !liveStateRef.current) {
        channel.unsubscribe()
        partnerIdRef.current = null
        setStage('searching')
      }
    }, CONNECT_TIMEOUT_MS)

    return () => {
      clearTimeout(timeout)
      channel.unsubscribe()
      if (tableRef.current === channel) tableRef.current = null
    }
  }, [matchToken, profileId])

  // Submit the result to the Weekend League exactly once per finished hand.
  useEffect(() => {
    if (stage !== 'result' || !liveState || !profileId || submittedRef.current) return
    submittedRef.current = true
    const own = isHostRef.current ? liveState.hostOutcome : liveState.guestOutcome
    if (own) submitBlackjackResult(profileId, own)
  }, [stage, liveState, profileId])

  useEffect(() => cleanupChannels, [])

  function sendAction(action: 'hit' | 'stand') {
    if (isHostRef.current) {
      const current = liveStateRef.current
      if (!current) return
      const next = applyAction(current, deckRef.current, 'host', action)
      setLiveState(next)
      setStage(next.phase === 'result' ? 'result' : 'playing')
      tableRef.current?.send({ type: 'broadcast', event: 'state', payload: next })
    } else {
      tableRef.current?.send({ type: 'broadcast', event: 'action', payload: { type: action } })
    }
  }

  function playAgain() {
    cleanupChannels()
    partnerIdRef.current = null
    dealtRef.current = false
    submittedRef.current = false
    setLiveState(null)
    setStage('checking')
    setRound((r) => r + 1)
  }

  if (stage === 'checking') return <p className="text-center text-white/50">Lädt…</p>

  if (stage === 'blocked' || stage === 'error') {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <p className="text-white/70">{message}</p>
        <Button variant="secondary" onClick={() => navigate('/liga')}>
          Zurück zur Liga
        </Button>
      </div>
    )
  }

  if (stage === 'searching') {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        <Pill>🔎 Suche Gegner…</Pill>
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-white/20 border-t-emerald-400" />
        <p className="max-w-xs text-sm text-white/50">
          Sobald ein anderer Spieler ebenfalls live spielen will, startet der Tisch automatisch.
        </p>
        <Button
          variant="secondary"
          onClick={() => {
            cleanupChannels()
            navigate('/liga')
          }}
        >
          Abbrechen
        </Button>
      </div>
    )
  }

  if (stage === 'connecting') {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <Pill>🤝 Gegner gefunden</Pill>
        <p className="text-xl font-bold">{opponentName}</p>
        <p className="text-white/50">Tisch wird aufgebaut…</p>
      </div>
    )
  }

  if (stage === 'abandoned') {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <span className="text-5xl">🚪</span>
        <h2 className="text-xl font-bold">{opponentName} hat den Tisch verlassen</h2>
        <div className="flex w-full max-w-xs flex-col gap-3">
          <Button onClick={playAgain} className="!bg-emerald-500 hover:!bg-emerald-400">
            Neuen Gegner suchen
          </Button>
          <Button variant="secondary" onClick={() => navigate('/liga')}>
            Zurück zur Liga
          </Button>
        </div>
      </div>
    )
  }

  if (!liveState) return <p className="text-center text-white/50">Lädt…</p>

  const myHand = isHost ? liveState.hostHand : liveState.guestHand
  const oppHand = isHost ? liveState.guestHand : liveState.hostHand
  const myStatus = isHost ? liveState.hostStatus : liveState.guestStatus
  const myOutcome = isHost ? liveState.hostOutcome : liveState.guestOutcome
  const isMyTurn = liveState.phase === 'turn' && liveState.turn === (isHost ? 'host' : 'guest')

  if (showDealing) {
    const revealedMine = dealingRevealCount >= 3 ? 2 : dealingRevealCount >= 1 ? 1 : 0
    const revealedOpp = dealingRevealCount >= 4 ? 2 : dealingRevealCount >= 2 ? 1 : 0
    return (
      <div className="flex flex-1 flex-col gap-3">
        <UiCard className="flex flex-col items-center gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-white/60">Dealer</h2>
          <Hand cards={liveState.dealerHand} hideSecond />
        </UiCard>
        <UiCard className="flex flex-col items-center gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-white/60">{opponentName}</h2>
          <Hand cards={oppHand.slice(0, revealedOpp)} />
        </UiCard>
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <Pill>Du</Pill>
          <Hand cards={myHand.slice(0, revealedMine)} />
          <p className="text-white/50">Karten werden ausgeteilt…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-3">
      <UiCard className="flex flex-col items-center gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-white/60">Dealer</h2>
        <Hand cards={liveState.dealerHand} hideSecond={!liveState.dealerRevealed} />
        {liveState.dealerRevealed && <p className="text-xl font-extrabold">{handValue(liveState.dealerHand)}</p>}
      </UiCard>

      <UiCard className="flex flex-col items-center gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-white/60">{opponentName}</h2>
        <Hand cards={oppHand} />
        <p className="text-lg font-bold">{handValue(oppHand)}</p>
      </UiCard>

      <div className="flex flex-1 flex-col items-center justify-center gap-3">
        <Pill>Du</Pill>
        <Hand cards={myHand} />
        <p className="text-3xl font-extrabold">{handValue(myHand)}</p>

        {stage === 'playing' && isMyTurn && myStatus === 'playing' && (
          <div className="flex w-full max-w-xs gap-3">
            <Button onClick={() => sendAction('hit')} className="flex-1 !bg-emerald-500 hover:!bg-emerald-400">
              Karte (Hit)
            </Button>
            <Button onClick={() => sendAction('stand')} variant="secondary" className="flex-1">
              Halten (Stand)
            </Button>
          </div>
        )}
        {stage === 'playing' && !isMyTurn && (
          <p className="text-white/50">Warte auf {opponentName}…</p>
        )}

        {stage === 'result' && myOutcome && (
          <>
            <OutcomeBanner outcome={myOutcome} drawText="Unentschieden (Push)" />
            <div className="flex w-full max-w-xs flex-col gap-3">
              <Button onClick={playAgain} className="!bg-emerald-500 hover:!bg-emerald-400">
                Nochmal spielen
              </Button>
              <Button variant="secondary" onClick={() => navigate('/liga')}>
                Zurück zur Liga
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export function BlackjackLive() {
  return (
    <Screen title="🃏 Blackjack Live 1v1" gradient="from-emerald-950 via-slate-950 to-slate-950">
      <AuthGate>
        <LiveContent />
      </AuthGate>
    </Screen>
  )
}
