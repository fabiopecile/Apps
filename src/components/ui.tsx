import { motion, type HTMLMotionProps } from 'framer-motion'
import type { HTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-lg shadow-violet-900/40',
  secondary: 'bg-white/10 hover:bg-white/15 text-white border border-white/15',
  ghost: 'bg-transparent hover:bg-white/10 text-white/80',
  danger: 'bg-gradient-to-br from-rose-500 to-red-600 text-white',
}

export function Button({
  variant = 'primary',
  className = '',
  children,
  ...rest
}: HTMLMotionProps<'button'> & { variant?: Variant }) {
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      whileHover={{ scale: 1.02, y: -1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className={`rounded-2xl px-5 py-3.5 text-base font-semibold transition-shadow disabled:opacity-40 disabled:shadow-none ${variantClasses[variant]} ${className}`}
      {...rest}
    >
      {children}
    </motion.button>
  )
}

export function Card({
  children,
  className = '',
  glow = false,
}: {
  children: ReactNode
  className?: string
  glow?: boolean
}) {
  return (
    <div
      className={`rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-black/20 backdrop-blur-sm transition-shadow ${glow ? 'shadow-violet-500/10 ring-1 ring-violet-400/20' : ''} ${className}`}
    >
      {children}
    </div>
  )
}

export function MotionCard({
  children,
  className = '',
  ...rest
}: HTMLMotionProps<'div'>) {
  return (
    <motion.div
      className={`rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-black/20 backdrop-blur-sm ${className}`}
      {...rest}
    >
      {children}
    </motion.div>
  )
}

export function Pill({ children, className = '' }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <motion.span
      layout
      className={`inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-white/80 ${className}`}
    >
      {children}
    </motion.span>
  )
}
