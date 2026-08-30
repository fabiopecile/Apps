import { motion, type Variants } from 'framer-motion'
import { Link } from 'react-router-dom'
import { getWeekendInfo } from '../league/weekend'

const MotionLink = motion.create(Link)

const league = {
  to: '/liga',
  emoji: '🏆',
  title: 'Weekend League',
  desc: 'Online gegen andere: 20 Spiele pro Minigame, Liga-Aufstieg & Belohnungen.',
}

const games = [
  {
    to: '/impostor',
    emoji: '🕵️',
    title: 'Impostor',
    desc: 'Findet, wer das Wort nicht kennt.',
    accent: 'from-fuchsia-500 to-purple-700',
  },
  {
    to: '/werwolf',
    emoji: '🐺',
    title: 'Werwolf',
    desc: 'Rollenspiel mit Erzähler-Modus.',
    accent: 'from-rose-500 to-slate-700',
  },
  {
    to: '/zeitgefuehl',
    emoji: '⏱️',
    title: 'Zeitgefühl',
    desc: 'Stoppe zur richtigen Sekunde.',
    accent: 'from-cyan-400 to-blue-700',
  },
  {
    to: '/blackjack',
    emoji: '🃏',
    title: 'Blackjack',
    desc: 'Gegen den Dealer, bis 4 Spieler.',
    accent: 'from-emerald-400 to-teal-700',
  },
  {
    to: '/wahrheit-oder-pflicht',
    emoji: '🎯',
    title: 'Wahrheit o. Pflicht',
    desc: 'Freche Fragen & Aufgaben.',
    accent: 'from-orange-400 to-red-600',
  },
  {
    to: '/reaktionstest',
    emoji: '⚡',
    title: 'Reaktionstest',
    desc: 'Wer hat die schnellsten Reflexe?',
    accent: 'from-yellow-400 to-amber-600',
  },
]

const pregameGames = [
  {
    to: '/ich-hab-noch-nie',
    emoji: '🙈',
    title: 'Ich hab noch nie',
    desc: 'Der Klassiker zum Vorglühen.',
    accent: 'from-pink-400 to-rose-700',
  },
  {
    to: '/wer-wuerde-eher',
    emoji: '👉',
    title: 'Wer würde eher',
    desc: 'Alle zeigen gleichzeitig.',
    accent: 'from-fuchsia-400 to-purple-700',
  },
  {
    to: '/kingscup',
    emoji: '👑',
    title: 'Kings Cup',
    desc: 'Karte ziehen, Regel befolgen.',
    accent: 'from-amber-400 to-orange-700',
  },
]

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.2 } },
}

const item: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 320, damping: 26 } },
}

type GameTile = { to: string; emoji: string; title: string; desc: string; accent: string }

function GameGrid({ games }: { games: GameTile[] }) {
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 gap-3">
      {games.map((g) => (
        <MotionLink
          key={g.to}
          to={g.to}
          variants={item}
          whileTap={{ scale: 0.96 }}
          whileHover={{ scale: 1.03, y: -3 }}
          className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-lg shadow-black/20 backdrop-blur-sm"
        >
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${g.accent} text-xl shadow-md`}
          >
            {g.emoji}
          </div>
          <div>
            <h2 className="font-bold leading-tight">{g.title}</h2>
            <p className="mt-0.5 text-xs leading-snug text-white/50">{g.desc}</p>
          </div>
        </MotionLink>
      ))}
    </motion.div>
  )
}

export function Home() {
  const { isActive } = getWeekendInfo()

  return (
    <div className="relative min-h-svh w-full overflow-hidden bg-gradient-to-b from-violet-950 via-slate-950 to-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="blob-a absolute -left-24 -top-16 h-80 w-80 rounded-full bg-violet-500/25 blur-3xl" />
        <div className="blob-b absolute -right-24 top-1/2 h-72 w-72 rounded-full bg-fuchsia-500/15 blur-3xl" />
        <div className="blob-a absolute -bottom-24 left-1/3 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-md px-5 pt-[max(2.5rem,env(safe-area-inset-top))] pb-10">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-3"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-2xl shadow-lg shadow-violet-900/40">
            🎉
          </div>
          <div>
            <h1 className="bg-gradient-to-r from-white to-white/70 bg-clip-text text-2xl font-extrabold tracking-tight text-transparent">
              Party Minigames
            </h1>
            <p className="text-sm text-white/50">Ein Gerät, viele Spiele.</p>
          </div>
        </motion.div>

        <MotionLink
          to={league.to}
          initial={{ opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 260, damping: 24 }}
          whileTap={{ scale: 0.97 }}
          whileHover={{ scale: 1.015, y: -2 }}
          className="relative mt-6 flex items-center gap-4 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-600 to-blue-800 p-5 shadow-xl shadow-indigo-950/50"
        >
          <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10 blur-2xl" />
          <span className="text-4xl leading-none drop-shadow">{league.emoji}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold">{league.title}</h2>
              {isActive && (
                <span className="flex items-center gap-1 rounded-full bg-emerald-400/20 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-emerald-300">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  </span>
                  Live
                </span>
              )}
            </div>
            <p className="text-sm text-white/70">{league.desc}</p>
          </div>
          <span className="text-xl text-white/50">›</span>
        </MotionLink>

        <motion.h3
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-3 mt-7 text-xs font-semibold uppercase tracking-widest text-white/40"
        >
          Partyspiele
        </motion.h3>
        <GameGrid games={games} />

        <motion.h3
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-3 mt-7 text-xs font-semibold uppercase tracking-widest text-white/40"
        >
          🍻 Zum Vorglühen
        </motion.h3>
        <GameGrid games={pregameGames} />
      </div>
    </div>
  )
}
