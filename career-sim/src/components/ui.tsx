import type { PropsWithChildren, ReactNode } from 'react';
import clsx from 'clsx';
import { motion } from 'framer-motion';

export function Card({ children, className }: PropsWithChildren<{ className?: string }>) {
  return <div className={clsx('card p-4', className)}>{children}</div>;
}

export function SectionTitle({ children, action }: PropsWithChildren<{ action?: ReactNode }>) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-sm font-semibold tracking-wide text-white/50 uppercase">{children}</h2>
      {action}
    </div>
  );
}

type ButtonVariant = 'primary' | 'gold' | 'ghost' | 'danger' | 'subtle';

export function Button({
  children, onClick, variant = 'primary', className, disabled, type = 'button',
}: PropsWithChildren<{
  onClick?: () => void;
  variant?: ButtonVariant;
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit';
}>) {
  const styles: Record<ButtonVariant, string> = {
    primary: 'bg-white text-black hover:bg-white/90',
    gold: 'bg-gold-gradient text-black shadow-[0_0_20px_rgba(212,175,55,0.35)] hover:brightness-110',
    ghost: 'bg-white/5 text-white hover:bg-white/10 border border-white/10',
    danger: 'bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/30',
    subtle: 'bg-transparent text-white/60 hover:text-white',
  };
  return (
    <motion.button
      whileTap={{ scale: disabled ? 1 : 0.96 }}
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={clsx(
        'px-4 py-2.5 rounded-xl font-medium text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
        styles[variant],
        className,
      )}
    >
      {children}
    </motion.button>
  );
}

export function StatBar({ label, value, max = 99, accent = '#d4af37' }: { label: string; value: number; max?: number; accent?: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-white/60">{label}</span>
        <span className="text-white/80 font-semibold tabular-nums">{Math.round(value)}</span>
      </div>
      <div className="stat-bar-track h-1.5">
        <motion.div
          className="h-full rounded-full"
          style={{ background: accent }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

export function Badge({ children, tone = 'default' }: PropsWithChildren<{ tone?: 'default' | 'gold' | 'green' | 'red' | 'blue' }>) {
  const tones: Record<string, string> = {
    default: 'bg-white/10 text-white/70',
    gold: 'bg-gold-gradient text-black font-semibold',
    green: 'bg-emerald-500/20 text-emerald-300',
    red: 'bg-red-500/20 text-red-300',
    blue: 'bg-sky-500/20 text-sky-300',
  };
  return <span className={clsx('px-2 py-0.5 rounded-full text-[11px] font-medium', tones[tone])}>{children}</span>;
}

export function ScreenScaffold({
  title, subtitle, children, footer, onBack,
}: PropsWithChildren<{ title: string; subtitle?: string; footer?: ReactNode; onBack?: () => void }>) {
  return (
    <div className="flex flex-col h-full">
      <header className="px-5 pt-6 pb-4 flex items-center gap-3 shrink-0">
        {onBack && (
          <button onClick={onBack} className="text-white/50 hover:text-white text-lg leading-none">
            ←
          </button>
        )}
        <div>
          <h1 className="text-xl font-semibold">{title}</h1>
          {subtitle && <p className="text-sm text-white/45 mt-0.5">{subtitle}</p>}
        </div>
      </header>
      <div className="flex-1 overflow-y-auto no-scrollbar px-5 pb-4">{children}</div>
      {footer && <div className="p-4 border-t border-white/8 glass shrink-0">{footer}</div>}
    </div>
  );
}

export function OverallBadge({ overall, size = 56 }: { overall: number; size?: number }) {
  return (
    <div
      className="rounded-2xl bg-gold-gradient text-black font-bold flex items-center justify-center shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {overall}
    </div>
  );
}
