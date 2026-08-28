import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-violet-500 hover:bg-violet-400 active:bg-violet-600 text-white shadow-lg shadow-violet-900/40',
  secondary:
    'bg-white/10 hover:bg-white/20 active:bg-white/25 text-white border border-white/15',
  ghost: 'bg-transparent hover:bg-white/10 active:bg-white/15 text-white/80',
  danger: 'bg-rose-500 hover:bg-rose-400 active:bg-rose-600 text-white',
}

export function Button({
  variant = 'primary',
  className = '',
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`rounded-2xl px-5 py-3.5 text-base font-semibold transition active:scale-[0.97] disabled:opacity-40 disabled:active:scale-100 ${variantClasses[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}

export function Card({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm ${className}`}
    >
      {children}
    </div>
  )
}

export function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-white/80">
      {children}
    </span>
  )
}
