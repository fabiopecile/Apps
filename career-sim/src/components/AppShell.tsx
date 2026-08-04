import type { PropsWithChildren } from 'react';
import clsx from 'clsx';
import { useGameStore } from '../store/gameStore';
import type { ScreenId } from '../types';

const tabs: { id: ScreenId; label: string; icon: string }[] = [
  { id: 'hub', label: 'Karriere', icon: '🏠' },
  { id: 'squad', label: 'Team', icon: '👥' },
  { id: 'national', label: 'Nation', icon: '🏳️' },
  { id: 'finances', label: 'Finanzen', icon: '💰' },
  { id: 'career', label: 'Statistik', icon: '📊' },
];

export function AppShell({ children }: PropsWithChildren) {
  const screen = useGameStore((s) => s.screen);
  const goToScreen = useGameStore((s) => s.goToScreen);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 min-h-0">{children}</div>
      <nav className="glass border-t border-white/8 shrink-0 flex justify-around px-1 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {tabs.map((t) => {
          const active = screen === t.id;
          return (
            <button
              key={t.id}
              aria-label={t.label}
              onClick={() => goToScreen(t.id)}
              className={clsx(
                'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors',
                active ? 'text-gold' : 'text-white/40 hover:text-white/70',
              )}
            >
              <span className="text-lg leading-none">{t.icon}</span>
              <span>{t.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
