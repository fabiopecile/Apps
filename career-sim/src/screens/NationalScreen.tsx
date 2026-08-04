import { useGameStore } from '../store/gameStore';
import { Badge, Card, SectionTitle, StatBar } from '../components/ui';

export function NationalScreen() {
  const player = useGameStore((s) => s.player);
  if (!player) return null;
  const nt = player.nationalTeam;

  return (
    <div className="h-full overflow-y-auto no-scrollbar px-5 pt-6 pb-8">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-semibold">{player.nationality}</h1>
        {nt.called && <Badge tone="gold">Aktuell nominiert</Badge>}
      </div>
      <p className="text-xs text-white/45 mb-5">Nationalmannschaft</p>

      <Card className="mb-5">
        <div className="grid grid-cols-3 text-center gap-2 mb-4">
          <div>
            <p className="text-xl font-bold">{nt.caps}</p>
            <p className="text-[11px] text-white/40">Länderspiele</p>
          </div>
          <div>
            <p className="text-xl font-bold">{nt.goals}</p>
            <p className="text-[11px] text-white/40">Tore</p>
          </div>
          <div>
            <p className="text-xl font-bold">{nt.assists}</p>
            <p className="text-[11px] text-white/40">Vorlagen</p>
          </div>
        </div>
        <StatBar label="Vertrauen des Nationaltrainers" value={nt.managerTrust} max={100} accent="#60a5fa" />
      </Card>

      <SectionTitle>Status</SectionTitle>
      <Card>
        <p className="text-sm text-white/60">
          {nt.caps === 0
            ? 'Du wurdest noch nie für die Nationalmannschaft nominiert. Starke Leistungen in der Liga erhöhen deine Chancen.'
            : nt.managerTrust > 70
              ? 'Du bist ein fester Bestandteil im Kader des Nationaltrainers.'
              : nt.managerTrust > 40
                ? 'Du gehörst zum erweiterten Kreis der Nationalmannschaft.'
                : 'Der Nationaltrainer beobachtet dich, hat aber noch Zweifel.'}
        </p>
        {nt.isCaptain && <Badge tone="gold" >Mannschaftskapitän</Badge>}
      </Card>
    </div>
  );
}
