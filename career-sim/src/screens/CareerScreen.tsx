import { useState } from 'react';
import clsx from 'clsx';
import { useGameStore } from '../store/gameStore';
import { Badge, Card, SectionTitle, StatBar } from '../components/ui';
import { formatMoney } from '../engine/marketValue';
import { attributeLabels, attributeOrder, calculateOverall, keyAttributesForPosition } from '../engine/attributes';

type Tab = 'attributes' | 'stats' | 'milestones' | 'ballondor';

export function CareerScreen() {
  const player = useGameStore((s) => s.player);
  const [tab, setTab] = useState<Tab>('attributes');
  if (!player) return null;

  const overall = calculateOverall(player.attributes, player.position);
  const keyAttrs = new Set(keyAttributesForPosition(player.position));

  const tabs: { id: Tab; label: string }[] = [
    { id: 'attributes', label: 'Attribute' },
    { id: 'stats', label: 'Statistik' },
    { id: 'milestones', label: 'Meilensteine' },
    { id: 'ballondor', label: "Ballon d'Or" },
  ];

  return (
    <div className="h-full overflow-y-auto no-scrollbar px-5 pt-6 pb-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Karriere</h1>
        <Badge tone="gold">OVR {overall}</Badge>
      </div>

      <div className="flex gap-1.5 mb-5 overflow-x-auto no-scrollbar">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap',
              tab === t.id ? 'bg-gold-gradient text-black' : 'bg-white/5 text-white/60',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'attributes' && (
        <Card className="space-y-3">
          {attributeOrder.map((key) => (
            <StatBar
              key={key}
              label={attributeLabels[key] + (keyAttrs.has(key) ? ' ★' : '')}
              value={player.attributes[key]}
              max={99}
            />
          ))}
        </Card>
      )}

      {tab === 'stats' && (
        <>
          <SectionTitle>Karrierestatistik</SectionTitle>
          <Card className="grid grid-cols-3 gap-3 text-center mb-5">
            <Stat label="Spiele" value={player.careerTotals.appearances} />
            <Stat label="Tore" value={player.careerTotals.goals} />
            <Stat label="Vorlagen" value={player.careerTotals.assists} />
            <Stat label="Titel" value={player.careerTotals.trophies} />
            <Stat label="Gelbe Karten" value={player.careerTotals.yellow} />
            <Stat label="Rote Karten" value={player.careerTotals.red} />
          </Card>
          <SectionTitle>Marktwert & Vermögen</SectionTitle>
          <Card className="mb-5">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-white/50">Marktwert</span>
              <span className="font-semibold text-gold">{formatMoney(player.marketValue)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/50">Verdientes Geld</span>
              <span className="font-semibold">{formatMoney(player.careerTotals.moneyEarned)}</span>
            </div>
          </Card>
          <SectionTitle>Saisonverlauf</SectionTitle>
          <div className="space-y-2">
            {player.careerLog.length === 0 && <p className="text-sm text-white/45">Noch keine abgeschlossene Saison.</p>}
            {[...player.careerLog].reverse().map((line) => (
              <Card key={line.season} className="py-3">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-sm font-medium">Saison {line.season} · {line.clubName}</p>
                  <span className="text-xs text-white/40">Ø {line.avgRating}</span>
                </div>
                <p className="text-xs text-white/50">
                  {line.appearances} Spiele · {line.goals} Tore · {line.assists} Vorlagen
                </p>
                {line.trophies.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap mt-2">
                    {line.trophies.map((t) => <Badge key={t} tone="gold">🏆 {t}</Badge>)}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </>
      )}

      {tab === 'milestones' && (
        <div className="space-y-2">
          {player.milestones.length === 0 && <p className="text-sm text-white/45">Noch keine Meilensteine erreicht.</p>}
          {[...player.milestones].reverse().map((m) => (
            <Card key={m.id} className="flex items-center gap-3 py-3">
              <span className="text-2xl">{m.icon}</span>
              <div>
                <p className="text-sm font-medium">{m.label}</p>
                <p className="text-xs text-white/45">{m.description}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === 'ballondor' && (
        <div className="space-y-2">
          {player.ballonDorHistory.length === 0 && <p className="text-sm text-white/45">Noch keine Gala erlebt.</p>}
          {[...player.ballonDorHistory].reverse().map((b) => (
            <Card key={b.season} className="py-3">
              <div className="flex justify-between items-center mb-1">
                <p className="text-sm font-medium">Saison {b.season}</p>
                {b.rank && <Badge tone={b.rank === 1 ? 'gold' : 'default'}>Platz {b.rank}</Badge>}
              </div>
              <p className="text-xs text-white/45">Gewinner: {b.winnerName}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-lg font-bold">{value}</p>
      <p className="text-[11px] text-white/40">{label}</p>
    </div>
  );
}
