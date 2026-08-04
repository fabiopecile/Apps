import { useGameStore } from '../store/gameStore';
import { Card, ScreenScaffold } from '../components/ui';
import { responseToneLabels } from '../engine/press';
import type { ResponseTone } from '../types';

const tones: ResponseTone[] = ['humble', 'confident', 'provocative', 'funny'];
const toneHints: Record<ResponseTone, string> = {
  humble: 'Sicher, aber respektvoll – gut fürs Trainervertrauen.',
  confident: 'Zeigt Stärke – Fans mögen es, wenn du gewinnst.',
  provocative: 'Sorgt für Schlagzeilen, riskiert aber Ärger mit dem Trainer.',
  funny: 'Lockert die Stimmung – Fans lieben Humor.',
};

export function PressScreen() {
  const news = useGameStore((s) => s.news);
  const respondToPress = useGameStore((s) => s.respondToPress);
  const goToScreen = useGameStore((s) => s.goToScreen);

  const item = news.find((n) => n.requiresResponse && !n.responded);

  if (!item) {
    return (
      <ScreenScaffold title="Presse" onBack={() => goToScreen('hub')}>
        <p className="text-sm text-white/50">Aktuell keine offenen Presseanfragen.</p>
      </ScreenScaffold>
    );
  }

  return (
    <ScreenScaffold title="Pressekonferenz" onBack={() => goToScreen('hub')}>
      <Card className="mb-5">
        <p className="text-xs text-white/40 mb-2 uppercase tracking-wide">
          {item.source === 'social' ? 'Social Media' : 'Presse'}
        </p>
        <p className="text-base font-semibold mb-2">{item.headline}</p>
        <p className="text-sm text-white/60">{item.body}</p>
      </Card>
      <div className="space-y-2.5">
        {tones.map((tone) => (
          <button key={tone} onClick={() => respondToPress(item.id, tone)} className="w-full text-left">
            <Card className="hover:bg-white/8 transition-colors flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{responseToneLabels[tone]}</p>
                <p className="text-xs text-white/40 mt-0.5">{toneHints[tone]}</p>
              </div>
              <span className="text-white/25">›</span>
            </Card>
          </button>
        ))}
      </div>
    </ScreenScaffold>
  );
}

