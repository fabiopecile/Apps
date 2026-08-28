import { motion } from 'framer-motion'
import { useEffect } from 'react'
import type { Outcome } from '../league/service'
import { celebrateWin } from '../lib/celebrate'

const outcomeLabel: Record<Outcome, { text: string; color: string }> = {
  win: { text: 'Gewonnen! 🎉', color: 'text-emerald-400' },
  lose: { text: 'Verloren', color: 'text-rose-400' },
  draw: { text: 'Unentschieden', color: 'text-yellow-300' },
}

export function OutcomeBanner({
  outcome,
  drawText,
  className = '',
}: {
  outcome: Outcome
  drawText?: string
  className?: string
}) {
  useEffect(() => {
    if (outcome === 'win') celebrateWin()
  }, [outcome])

  const label = outcomeLabel[outcome]
  const text = outcome === 'draw' && drawText ? drawText : label.text

  return (
    <motion.p
      initial={{ scale: 0.4, opacity: 0, y: 12 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 350, damping: 15 }}
      className={`text-xl font-bold ${label.color} ${className}`}
    >
      {text}
    </motion.p>
  )
}
