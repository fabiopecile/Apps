import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

export function Screen({
  title,
  gradient = 'from-violet-950 via-slate-950 to-slate-950',
  children,
  onBack,
}: {
  title?: string
  gradient?: string
  children: ReactNode
  onBack?: () => void
}) {
  const navigate = useNavigate()

  return (
    <div
      className={`relative min-h-svh w-full overflow-hidden bg-gradient-to-b ${gradient} text-white flex flex-col`}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="blob-a absolute -left-24 -top-24 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="blob-b absolute -right-20 top-1/3 h-64 w-64 rounded-full bg-fuchsia-500/10 blur-3xl" />
      </div>

      <header className="relative z-10 flex items-center gap-3 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => (onBack ? onBack() : navigate('/'))}
          aria-label="Zurück"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-xl"
        >
          ←
        </motion.button>
        {title && <h1 className="text-lg font-bold">{title}</h1>}
      </header>
      <motion.main
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="relative z-10 flex flex-1 flex-col px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
      >
        {children}
      </motion.main>
    </div>
  )
}
