import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthGate } from '../../auth/AuthGate'
import { useAuth } from '../../auth/AuthContext'
import { Screen } from '../../components/Screen'
import { Button, Card, Pill } from '../../components/ui'
import { divisionForWins, MAX_GAMES_PER_WEEKEND, nextDivision } from '../../league/divisions'
import { fetchWeekendStats, type LeagueGame, type WeekendStats } from '../../league/service'
import { formatCountdown, getWeekendInfo } from '../../league/weekend'

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

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">
          {label.emoji} {label.title}
        </h3>
        <Pill>
          {division.emoji} {division.name}
        </Pill>
      </div>
      <div className="flex items-center justify-between text-sm text-white/60">
        <span>
          {stats.wins}S · {stats.losses}N · {stats.draws}U
        </span>
        <span>
          {stats.played} / {MAX_GAMES_PER_WEEKEND} Spiele
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-violet-500"
          style={{ width: `${Math.min(100, (stats.played / MAX_GAMES_PER_WEEKEND) * 100)}%` }}
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
            className="flex-1 !bg-violet-500 hover:!bg-violet-400"
          >
            {full ? 'Erledigt' : isActive ? 'Live 1v1 ⚡' : 'Nur Fr–So'}
          </Button>
        </div>
      ) : (
        <Button
          onClick={() => navigate(label.to)}
          disabled={!isActive || full}
          className="!bg-violet-500 hover:!bg-violet-400"
        >
          {full ? 'Für dieses Wochenende erledigt' : isActive ? 'Online spielen' : 'Nur Fr–So spielbar'}
        </Button>
      )}
    </Card>
  )
}

function LeagueContent() {
  const { profile, signOut } = useAuth()
  const [stats, setStats] = useState<Record<LeagueGame, WeekendStats> | null>(null)
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!profile) return
    fetchWeekendStats(profile.id).then(setStats)
  }, [profile, now])

  if (!profile || !stats) return <p className="text-center text-white/50">Lädt…</p>

  const { isActive, windowStart, windowEnd } = getWeekendInfo()

  return (
    <div className="flex flex-1 flex-col gap-4">
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
