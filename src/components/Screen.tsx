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
      className={`min-h-svh w-full bg-gradient-to-b ${gradient} text-white flex flex-col`}
    >
      <header className="flex items-center gap-3 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3">
        <button
          onClick={() => (onBack ? onBack() : navigate('/'))}
          aria-label="Zurück"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-xl active:scale-95"
        >
          ←
        </button>
        {title && <h1 className="text-lg font-bold">{title}</h1>}
      </header>
      <main className="flex flex-1 flex-col px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {children}
      </main>
    </div>
  )
}
