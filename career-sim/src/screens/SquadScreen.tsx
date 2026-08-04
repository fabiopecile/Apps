import { useGameStore } from '../store/gameStore';
import { Badge, Card, SectionTitle, StatBar } from '../components/ui';
import { getClub } from '../data/clubs';
import { relationshipLabels } from '../engine/squad';

const roleLabels: Record<string, string> = {
  star: 'Star', starter: 'Stammspieler', rotation: 'Rotation', backup: 'Ersatzspieler', youth: 'Jugend',
};

export function SquadScreen() {
  const player = useGameStore((s) => s.player);
  if (!player) return null;
  const club = getClub(player.clubId);

  return (
    <div className="h-full overflow-y-auto no-scrollbar px-5 pt-6 pb-8">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-semibold">{club.name}</h1>
        <Badge tone="gold">{roleLabels[player.squadRole]}</Badge>
      </div>
      <p className="text-xs text-white/45 mb-5">{club.stadium} · Trainer {club.coachName}</p>

      <SectionTitle>Trainervertrauen</SectionTitle>
      <Card className="mb-5">
        <StatBar label="Vertrauen" value={player.coachTrust} max={100} accent="#60a5fa" />
        <p className="text-xs text-white/40 mt-3">
          {player.coachTrust > 75
            ? `${club.coachName} vertraut dir voll und ganz.`
            : player.coachTrust > 50
              ? `${club.coachName} ist grundsätzlich zufrieden mit dir.`
              : player.coachTrust > 30
                ? `${club.coachName} hat noch Zweifel an dir.`
                : `${club.coachName} erwägt, dich aus dem Kader zu streichen.`}
        </p>
      </Card>

      <SectionTitle>Teamkollegen</SectionTitle>
      <div className="space-y-2">
        {player.teammates.map((t) => (
          <Card key={t.id} className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium">{t.name}</p>
              <p className="text-xs text-white/40">{t.position} · {t.age} Jahre · OVR {t.overall}</p>
            </div>
            <Badge tone={t.relationship > 40 ? 'green' : t.relationship < -20 ? 'red' : 'default'}>
              {relationshipLabels[t.relationshipType]}
            </Badge>
          </Card>
        ))}
      </div>
    </div>
  );
}
