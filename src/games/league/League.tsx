import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthGate } from '../../auth/AuthGate'
import { useAuth } from '../../auth/AuthContext'
import { Screen } from '../../components/Screen'
import { Button, Card, Pill } from '../../components/ui'
import {
  divisionForWins,
  divisions,
  MAX_GAMES_PER_WEEKEND,
  nextDivision,
  type Division,
} from '../../league/divisions'
import { fetchWeekendStats, type LeagueGame, type WeekendStats } from '../../league/service'
import { formatCountdown, getWeekendInfo } from '../../league/weekend'
import { celebrateBig } from '../../lib/celebrate'
import { usePersistentState } from '../../lib/storage'

const gameLabels: Record<LeagueGame, { title: string; emoji: string; to: string }> = {
  zeitgefuehl: { title: 'Zeitgefühl', emoji: '⏱️', to: '/zeitgefuehl/online' },
  reaktionstest: { title: 'Reaktionstest', emoji: '⚡', to: '/reaktionstest/online' },
  blackjack: { title: 'Blackjack', emoji: '🃏', to: '/blackjack/online' },
}

function GameLeagueCard({ game, stats }: { game: LeagueGame; stats: WeekendStats }) {
  const navigate = useNavigate()
  const { isActive } = getWeekendInfo()
  const division = divisionForWins(stats.wins)
  const next = nextDivision(stats.wins)
  const label = gameLabels[game]
  const full = stats.played >= MAX_GAMES_PER_WEEKEND
  const progress = Math.min(100, (stats.played / MAX_GAMES_PER_WEEKEND) * 100)

  return (
    <Card className="flex flex-col gap-3" glow>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">
          {label.emoji} {label.title}
        </h3>
        <AnimatePresence mode="popLayout">
          <Pill key={division.id} className="bg-gradient-to-r from-white/15 to-white/5">
            <motion.span
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              {division.emoji} {division.name}
            </motion.span>
          </Pill>
        </AnimatePresence>
      </div>
      <div className="flex items-center justify-between text-sm text-white/60">
        <motion.span
          key={`${stats.wins}-${stats.losses}-${stats.draws}`}
          initial={{ scale: 1.15, color: '#5eead4' }}
          animate={{ scale: 1, color: 'rgba(255,255,255,0.6)' }}
          transition={{ duration: 0.4 }}
        >
          {stats.wins}S · {stats.losses}N · {stats.draws}U
        </motion.span>
        <span>
          {stats.played} / {MAX_GAMES_PER_WEEKEND} Spiele
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-400"
          initial={false}
          animate={{ width: `${progress}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        />
      </div>
      {next && (
        <p className="text-xs text-white/50">
          Noch {next.minWins - stats.wins} Sieg(e) bis {next.emoji} {next.name}
        </p>
      )}
      <p className="text-xs text-white/50">Belohnung: {division.reward}</p>
      {game === 'blackjack' ? (
        <div className="flex gap-3">
          <Button
            onClick={() => navigate(label.to)}
            disabled={!isActive || full}
            variant="secondary"
            className="flex-1"
          >
            {full ? 'Erledigt' : isActive ? 'Vs. Dealer' : 'Nur Fr–So'}
          </Button>
          <Button
            onClick={() => navigate('/blackjack/live')}
            disabled={!isActive || full}
            className="flex-1"
          >
            {full ? 'Erledigt' : isActive ? 'Live 1v1 ⚡' : 'Nur Fr–So'}
          </Button>
        </div>
      ) : (
        <Button onClick={() => navigate(label.to)} disabled={!isActive || full}>
          {full ? 'Für dieses Wochenende erledigt' : isActive ? 'Online spielen' : 'Nur Fr–So spielbar'}
        </Button>
      )}
    </Card>
  )
}

function LevelUpOverlay({
  game,
  division,
  onClose,
}: {
  game: LeagueGame
  division: Division
  onClose: () => void
}) {
  useEffect(() => {
    const id = setTimeout(onClose, 4000)
    return () => clearTimeout(id)
  }, [onClose])

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.6, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18 }}
        className="flex max-w-xs flex-col items-center gap-3 rounded-3xl border border-white/15 bg-gradient-to-b from-violet-900/90 to-slate-900/90 p-8 text-center shadow-2xl shadow-violet-900/50"
      >
        <motion.span
          className="text-6xl"
          initial={{ rotate: -15, scale: 0.5 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 12, delay: 0.15 }}
        >
          {division.emoji}
        </motion.span>
        <p className="text-sm font-semibold uppercase tracking-wide text-violet-300">Aufstieg!</p>
        <h2 className="text-2xl font-extrabold">{division.name}</h2>
        <p className="text-sm text-white/60">{gameLabels[game].emoji} {gameLabels[game].title}</p>
        <p className="text-sm text-white/70">{division.reward}</p>
        <Button onClick={onClose} className="mt-2 w-full">
          Weiter geht's!
        </Button>
      </motion.div>
    </motion.div>
  )
}

function LeagueContent() {
  const { profile, signOut } = useAuth()
  const [stats, setStats] = useState<Record<LeagueGame, WeekendStats> | null>(null)
  const [now, setNow] = useState(new Date())
  const [seenDivisions, setSeenDivisions] = usePersistentState<Record<string, string>>(
    'party:league-seen-divisions',
    {},
  )
  const [celebration, setCelebration] = useState<{ game: LeagueGame; division: Division } | null>(
    null,
  )

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!profile) return
    fetchWeekendStats(profile.id).then(setStats)
  }, [profile, now])

  useEffect(() => {
    if (!stats) return
    const { weekendKey } = getWeekendInfo()
    const updates: Record<string, string> = {}
    let promoted: { game: LeagueGame; division: Division } | null = null

    for (const game of ['zeitgefuehl', 'reaktionstest', 'blackjack'] as const) {
      const division = divisionForWins(stats[game].wins)
      const seenKey = `${weekendKey}:${game}`
      const prevId = seenDivisions[seenKey]
      if (prevId !== division.id) {
        if (prevId) {
          const prevRank = divisions.findIndex((d) => d.id === prevId)
          const newRank = divisions.findIndex((d) => d.id === division.id)
          if (newRank > prevRank && !promoted) promoted = { game, division }
        }
        updates[seenKey] = division.id
      }
    }

    if (Object.keys(updates).length > 0) {
      setSeenDivisions((prev) => ({ ...prev, ...updates }))
    }
    if (promoted) {
      setCelebration(promoted)
      celebrateBig()
    }
    // Only react to fresh stats — seenDivisions/setSeenDivisions are stable/self-updating.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats])

  if (!profile || !stats) return <p className="text-center text-white/50">Lädt…</p>

  const { isActive, windowStart, windowEnd } = getWeekendInfo()

  return (
    <div className="flex flex-1 flex-col gap-4">
      <AnimatePresence>
        {celebration && (
          <LevelUpOverlay
            game={celebration.game}
            division={celebration.division}
            onClose={() => setCelebration(null)}
          />
        )}
      </AnimatePresence>

      <Card className="flex items-center justify-between">
        <div>
          <p className="text-sm text-white/50">Angemeldet als</p>
          <p className="font-bold">{profile.username}</p>
        </div>
        <Button variant="ghost" onClick={signOut}>
          Abmelden
        </Button>
      </Card>

      <Card className="flex flex-col items-center gap-1 text-center">
        {isActive ? (
          <>
            <Pill>🟢 Weekend League läuft</Pill>
            <p className="text-sm text-white/60">
              Endet in {formatCountdown(windowEnd, now)}
            </p>
          </>
        ) : (
          <>
            <Pill>⏳ Weekend League pausiert</Pill>
            <p className="text-sm text-white/60">Startet in {formatCountdown(windowStart, now)}</p>
          </>
        )}
      </Card>

      {(['zeitgefuehl', 'reaktionstest', 'blackjack'] as const).map((game) => (
        <GameLeagueCard key={game} game={game} stats={stats[game]} />
      ))}
    </div>
  )
}

export function League() {
  return (
    <Screen title="🏆 Weekend League" gradient="from-indigo-950 via-slate-950 to-slate-950">
      <AuthGate>
        <LeagueContent />
      </AuthGate>
    </Screen>
  )
}
