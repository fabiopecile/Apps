import { useMemo } from 'react';
import { useGameStore } from '../store/gameStore';
import { Badge, Button, Card, OverallBadge, SectionTitle, StatBar } from '../components/ui';
import { PlayerAvatar } from '../components/PlayerAvatar';
import { getClub } from '../data/clubs';
import { calculateOverall } from '../engine/attributes';
import { formatMoney } from '../engine/marketValue';
import { weekPhaseLabel } from '../engine/season';
import { personalityLabels } from '../engine/personality';
import { injuryEmoji } from '../lib/labels';

export function HubScreen() {
  const player = useGameStore((s) => s.player);
  const week = useGameStore((s) => s.week);
  const season = useGameStore((s) => s.season);
  const fixtures = useGameStore((s) => s.fixtures);
  const news = useGameStore((s) => s.news);
  const eventLog = useGameStore((s) => s.eventLog);
  const trainingsUsedThisWeek = useGameStore((s) => s.trainingsUsedThisWeek);
  const pendingOffers = useGameStore((s) => s.pendingOffers);
  const pendingRetirementPrompt = useGameStore((s) => s.pendingRetirementPrompt);
  const advanceWeek = useGameStore((s) => s.advanceWeek);
  const goToScreen = useGameStore((s) => s.goToScreen);
  const dismissRetirementPrompt = useGameStore((s) => s.dismissRetirementPrompt);
  const retireNow = useGameStore((s) => s.retireNow);

  const club = player ? getClub(player.clubId) : null;
  const overall = player ? calculateOverall(player.attributes, player.position) : 0;
  const nextFixture = useMemo(() => fixtures.find((f) => f.week === week && !f.played), [fixtures, week]);
  const unresolvedNews = news.some((n) => n.requiresResponse && !n.responded);
  const recentEvents = [...eventLog].slice(-4).reverse();

  if (!player || !club) return null;

  return (
    <div className="h-full overflow-y-auto no-scrollbar px-5 pt-6 pb-6">
      <div className="flex items-center justify-between mb-1">
        <div>
          <p className="text-xs text-white/40">Saison {season} · Woche {week}/40</p>
          <p className="text-sm text-gold font-medium">{weekPhaseLabel(week)}</p>
        </div>
        <Badge>{personalityLabels[player.personalityType]}</Badge>
      </div>

      <Card className="mt-4 flex items-center gap-4">
        <PlayerAvatar appearance={player.appearance} primaryColor={club.primaryColor} size={72} />
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold truncate">{player.name}</h2>
          <p className="text-xs text-white/45">{club.name} · {player.position} · {player.age} Jahre</p>
          <p className="text-xs text-gold mt-1 font-medium">{formatMoney(player.marketValue)}</p>
        </div>
        <OverallBadge overall={overall} />
      </Card>

      {player.injury && (
        <Card className="mt-3 border-red-500/30 bg-red-500/5 flex items-center gap-3">
          <span className="text-2xl">{injuryEmoji(player.injury.type)}</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-red-300">{player.injury.label}</p>
            <p className="text-xs text-white/50">Noch {player.injury.weeksRemaining} Wochen Pause</p>
          </div>
        </Card>
      )}

      <Card className="mt-3 grid grid-cols-2 gap-y-3 gap-x-6">
        <StatBar label="Fitness" value={player.fitness} max={100} accent="#4ade80" />
        <StatBar label="Moral" value={player.morale} max={100} accent="#60a5fa" />
        <StatBar label="Form" value={(player.form + 5) * 10} max={100} accent="#d4af37" />
        <StatBar label="Ermüdung" value={player.fatigue} max={100} accent="#f87171" />
      </Card>

      <SectionTitle>
        {nextFixture ? 'Nächstes Spiel' : 'Diese Woche'}
      </SectionTitle>
      <Card className="mb-4">
        {nextFixture ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-white/40">{nextFixture.competitionName}</p>
              <p className="text-sm font-medium">
                {nextFixture.home ? `${club.shortName} vs ${nextFixture.opponent}` : `${nextFixture.opponent} vs ${club.shortName}`}
              </p>
            </div>
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: nextFixture.opponentBadgeColor }} />
          </div>
        ) : (
          <p className="text-sm text-white/55">Trainingswoche – keine Pflichtspiele angesetzt.</p>
        )}
      </Card>

      {recentEvents.length > 0 && (
        <>
          <SectionTitle>Vereinsnachrichten</SectionTitle>
          <div className="space-y-2 mb-4">
            {recentEvents.map((e) => (
              <Card key={e.id} className="py-2.5">
                <p className="text-sm font-medium">{e.headline}</p>
                <p className="text-xs text-white/45 mt-0.5">{e.body}</p>
              </Card>
            ))}
          </div>
        </>
      )}

      <div className="grid grid-cols-2 gap-3 mb-4">
        <Button variant="ghost" disabled={trainingsUsedThisWeek >= 2 || !!player.injury} onClick={() => goToScreen('training')}>
          🏋️ Training ({trainingsUsedThisWeek}/2)
        </Button>
        <Button variant="ghost" onClick={() => goToScreen('finances')}>
          💼 Sponsoren
        </Button>
        <Button
          variant={unresolvedNews ? 'gold' : 'ghost'}
          disabled={!unresolvedNews}
          onClick={() => goToScreen('press')}
        >
          📰 Presse {unresolvedNews && '●'}
        </Button>
        <Button
          variant={pendingOffers.length > 0 ? 'gold' : 'ghost'}
          onClick={() => goToScreen('transfers')}
        >
          🔄 Transfers {pendingOffers.length > 0 && `(${pendingOffers.length})`}
        </Button>
      </div>

      <Button variant="gold" className="w-full py-3.5 text-base mb-2" onClick={advanceWeek}>
        Woche simulieren →
      </Button>

      {pendingRetirementPrompt && (
        <Card className="mt-3 border-gold/40">
          <p className="text-sm font-medium mb-1">Karriereende in Sicht?</p>
          <p className="text-xs text-white/50 mb-3">
            Mit {player.age} Jahren fragen sich Fans und Medien, ob {player.name} bald zurücktritt.
          </p>
          <div className="flex gap-2">
            <Button variant="danger" className="flex-1" onClick={retireNow}>Karriere beenden</Button>
            <Button variant="ghost" className="flex-1" onClick={dismissRetirementPrompt}>Weitermachen</Button>
          </div>
        </Card>
      )}

      {!pendingRetirementPrompt && player.age >= 32 && (
        <button onClick={retireNow} className="w-full text-center text-xs text-white/30 hover:text-white/60 mt-2 py-1">
          Karriere jetzt beenden
        </button>
      )}
    </div>
  );
}
