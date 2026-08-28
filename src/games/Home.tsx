import { Link } from 'react-router-dom'

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

export function Home() {
  return (
    <div className="min-h-svh w-full bg-gradient-to-b from-violet-950 via-slate-950 to-slate-950 text-white">
      <div className="mx-auto max-w-md px-5 pt-[max(2.5rem,env(safe-area-inset-top))] pb-10">
        <h1 className="text-3xl font-extrabold tracking-tight">🎉 Party Minigames</h1>
        <p className="mt-1 text-white/60">Ein Gerät, viele Spiele – wählt euer nächstes.</p>

        <div className="mt-6 flex flex-col gap-3">
          {games.map((g) => (
            <Link
              key={g.to}
              to={g.to}
              className={`flex items-center gap-4 rounded-3xl border border-white/10 bg-gradient-to-br ${g.gradient} p-4 backdrop-blur-sm transition active:scale-[0.98]`}
            >
              <span className="text-4xl leading-none">{g.emoji}</span>
              <div className="flex-1">
                <h2 className="text-lg font-bold">{g.title}</h2>
                <p className="text-sm text-white/70">{g.desc}</p>
              </div>
              <span className="text-white/40">›</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
