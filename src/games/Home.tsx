import { motion, type Variants } from 'framer-motion'
import { Link } from 'react-router-dom'

const MotionLink = motion.create(Link)

const games = [
  {
    to: '/liga',
    emoji: '🏆',
    title: 'Weekend League',
    desc: 'Online gegen andere: Fr–So, 20 Spiele pro Minigame, Liga-Aufstieg & Belohnungen.',
    gradient: 'from-indigo-600/40 to-blue-900/40',
  },
  {
    to: '/impostor',
    emoji: '🕵️',
    title: 'Impostor',
    desc: 'Alle außer einem kennen das Wort. Findet den Impostor!',
    gradient: 'from-fuchsia-600/40 to-purple-800/40',
  },
  {
    to: '/werwolf',
    emoji: '🐺',
    title: 'Werwolf',
    desc: 'Rollenspiel-Klassiker mit Erzähler-Modus für Nacht & Tag.',
    gradient: 'from-slate-700/50 to-rose-900/40',
  },
  {
    to: '/zeitgefuehl',
    emoji: '⏱️',
    title: 'Zeitgefühl',
    desc: 'Stoppe genau zur richtigen Sekunde – ohne hinzusehen.',
    gradient: 'from-cyan-600/40 to-blue-800/40',
  },
  {
    to: '/blackjack',
    emoji: '🃏',
    title: 'Blackjack',
    desc: 'Kartenspiel gegen den Dealer, reihum für bis zu 4 Spieler.',
    gradient: 'from-emerald-600/40 to-teal-900/40',
  },
  {
    to: '/wahrheit-oder-pflicht',
    emoji: '🎯',
    title: 'Wahrheit oder Pflicht',
    desc: 'Freche, witzige und gewagte Fragen & Aufgaben.',
    gradient: 'from-orange-600/40 to-red-800/40',
  },
  {
    to: '/reaktionstest',
    emoji: '⚡',
    title: 'Reaktionstest',
    desc: 'Wer hat die schnellsten Reflexe am Tisch?',
    gradient: 'from-yellow-500/40 to-amber-800/40',
  },
]

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
}

const item: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 26 } },
}

export function Home() {
  return (
    <div className="relative min-h-svh w-full overflow-hidden bg-gradient-to-b from-violet-950 via-slate-950 to-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="blob-a absolute -left-24 -top-16 h-80 w-80 rounded-full bg-violet-500/25 blur-3xl" />
        <div className="blob-b absolute -right-24 top-1/2 h-72 w-72 rounded-full bg-fuchsia-500/15 blur-3xl" />
        <div className="blob-a absolute -bottom-24 left-1/3 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-md px-5 pt-[max(2.5rem,env(safe-area-inset-top))] pb-10">
        <motion.h1
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-3xl font-extrabold tracking-tight"
        >
          🎉 Party Minigames
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mt-1 text-white/60"
        >
          Ein Gerät, viele Spiele – wählt euer nächstes.
        </motion.p>

        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="mt-6 flex flex-col gap-3"
        >
          {games.map((g) => (
            <MotionLink
              key={g.to}
              to={g.to}
              variants={item}
              whileTap={{ scale: 0.97 }}
              whileHover={{ scale: 1.015, y: -2 }}
              className={`flex items-center gap-4 rounded-3xl border border-white/10 bg-gradient-to-br ${g.gradient} p-4 shadow-lg shadow-black/20 backdrop-blur-sm`}
            >
              <span className="text-4xl leading-none">{g.emoji}</span>
              <div className="flex-1">
                <h2 className="text-lg font-bold">{g.title}</h2>
                <p className="text-sm text-white/70">{g.desc}</p>
              </div>
              <span className="text-white/40">›</span>
            </MotionLink>
          ))}
        </motion.div>
      </div>
    </div>
  )
}
