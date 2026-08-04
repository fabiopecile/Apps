import { useState } from 'react';
import clsx from 'clsx';
import { useGameStore } from '../store/gameStore';
import { Badge, Button, Card, SectionTitle } from '../components/ui';
import { formatMoney } from '../engine/marketValue';
import { sponsorPool } from '../data/sponsors';
import { properties, cars, watches, pets, investmentOptions } from '../data/lifestyle';
import { weeklyIncome } from '../engine/finances';

type Tab = 'overview' | 'sponsors' | 'lifestyle' | 'invest' | 'personal';

export function FinancesScreen() {
  const player = useGameStore((s) => s.player);
  const signSponsor = useGameStore((s) => s.signSponsor);
  const buyAsset = useGameStore((s) => s.buyAsset);
  const makeInvestment = useGameStore((s) => s.makeInvestment);
  const getPartner = useGameStore((s) => s.getPartner);
  const startFamily = useGameStore((s) => s.startFamily);
  const [tab, setTab] = useState<Tab>('overview');

  if (!player) return null;

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Übersicht' },
    { id: 'sponsors', label: 'Sponsoren' },
    { id: 'lifestyle', label: 'Lifestyle' },
    { id: 'invest', label: 'Investments' },
    { id: 'personal', label: 'Privatleben' },
  ];

  return (
    <div className="h-full overflow-y-auto no-scrollbar px-5 pt-6 pb-8">
      <h1 className="text-xl font-semibold mb-1">Finanzen</h1>
      <p className="text-gold text-2xl font-bold mb-4">{formatMoney(player.bankBalance)}</p>

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

      {tab === 'overview' && (
        <>
          <SectionTitle>Wöchentliches Einkommen</SectionTitle>
          <Card className="mb-4">
            <Row label="Gehalt" value={formatMoney(player.weeklyWage)} />
            <Row label="Sponsoren" value={formatMoney(player.sponsors.reduce((s, sp) => s + sp.weeklyIncome, 0))} />
            <Row label="Investitionen" value={formatMoney(player.investments.reduce((s, i) => s + i.weeklyReturn, 0))} />
            <div className="border-t border-white/10 mt-2 pt-2">
              <Row label="Gesamt / Woche" value={formatMoney(weeklyIncome(player))} bold />
            </div>
          </Card>
          <SectionTitle>Glück</SectionTitle>
          <Card>
            <p className="text-sm text-white/60">
              {player.happiness > 75 ? 'Du fühlst dich rundum wohl im Leben.' :
                player.happiness > 50 ? 'Es läuft ganz gut in deinem Privatleben.' :
                  'Dein Privatleben könnte mehr Balance vertragen.'}
            </p>
          </Card>
        </>
      )}

      {tab === 'sponsors' && (
        <div className="space-y-2">
          {sponsorPool.map((s) => {
            const signed = player.sponsors.some((sp) => sp.id === s.id);
            const eligible = player.fanPopularity + player.marketValue / 2_000_000 >= s.requiredReputation;
            return (
              <Card key={s.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{s.name}</p>
                  <p className="text-xs text-white/40">{formatMoney(s.baseWeeklyIncome)} / Woche</p>
                </div>
                {signed ? (
                  <Badge tone="green">Aktiv</Badge>
                ) : (
                  <Button variant="ghost" disabled={!eligible} onClick={() => signSponsor(s.id)}>
                    {eligible ? 'Unterschreiben' : 'Zu unbekannt'}
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {tab === 'lifestyle' && (
        <>
          <AssetSection title="Immobilien" items={properties} owned={player.assets} balance={player.bankBalance} onBuy={(id) => buyAsset('property', id)} />
          <AssetSection title="Fahrzeuge" items={cars} owned={player.assets} balance={player.bankBalance} onBuy={(id) => buyAsset('car', id)} />
          <AssetSection title="Uhren" items={watches} owned={player.assets} balance={player.bankBalance} onBuy={(id) => buyAsset('watch', id)} />
          <AssetSection title="Haustiere" items={pets} owned={player.assets} balance={player.bankBalance} onBuy={(id) => buyAsset('pet', id)} />
        </>
      )}

      {tab === 'invest' && (
        <div className="space-y-2">
          {investmentOptions.map((inv) => {
            const owned = player.investments.filter((i) => i.name === inv.name);
            const canAfford = player.bankBalance >= inv.minInvest;
            return (
              <Card key={inv.id}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium">{inv.name}</p>
                  <Badge tone={inv.risk === 'high' ? 'red' : inv.risk === 'medium' ? 'gold' : 'green'}>{inv.risk}</Badge>
                </div>
                <p className="text-xs text-white/40 mb-3">
                  Min. {formatMoney(inv.minInvest)} · {inv.weeklyReturnPct}% Rendite / Woche
                </p>
                {owned.length > 0 && (
                  <p className="text-xs text-emerald-400 mb-2">
                    {owned.length}x investiert · {formatMoney(owned.reduce((s, o) => s + o.weeklyReturn, 0))}/Woche
                  </p>
                )}
                <Button variant="ghost" disabled={!canAfford} className="w-full" onClick={() => makeInvestment(inv.id, inv.minInvest)}>
                  {formatMoney(inv.minInvest)} investieren
                </Button>
              </Card>
            );
          })}
        </div>
      )}

      {tab === 'personal' && (
        <div className="space-y-3">
          <Card className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Partnerin / Partner</p>
              <p className="text-xs text-white/40">{player.hasPartner ? 'In einer Beziehung' : 'Single'}</p>
            </div>
            {!player.hasPartner && <Button variant="ghost" onClick={getPartner}>Kennenlernen</Button>}
          </Card>
          <Card className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Familie</p>
              <p className="text-xs text-white/40">{player.hasFamily ? 'Hat eine Familie' : 'Noch keine Familie'}</p>
            </div>
            {player.hasPartner && !player.hasFamily && <Button variant="ghost" onClick={startFamily}>Familie gründen</Button>}
          </Card>
          <Card>
            <p className="text-sm font-medium mb-1">Haustiere</p>
            <p className="text-xs text-white/40">{player.pets} im Haushalt (siehe Lifestyle-Tab zum Kaufen)</p>
          </Card>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between text-sm py-1">
      <span className="text-white/50">{label}</span>
      <span className={bold ? 'font-semibold text-gold' : 'font-medium'}>{value}</span>
    </div>
  );
}

function AssetSection({
  title, items, owned, balance, onBuy,
}: {
  title: string;
  items: { id: string; name: string; price: number; happiness: number }[];
  owned: { name: string }[];
  balance: number;
  onBuy: (id: string) => void;
}) {
  return (
    <>
      <SectionTitle>{title}</SectionTitle>
      <div className="space-y-2 mb-4">
        {items.map((item) => {
          const isOwned = owned.some((o) => o.name === item.name);
          return (
            <Card key={item.id} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium">{item.name}</p>
                <p className="text-xs text-white/40">{formatMoney(item.price)} · +{item.happiness} Zufriedenheit</p>
              </div>
              {isOwned ? (
                <Badge tone="green">Besitzt</Badge>
              ) : (
                <Button variant="ghost" disabled={balance < item.price} onClick={() => onBuy(item.id)}>Kaufen</Button>
              )}
            </Card>
          );
        })}
      </div>
    </>
  );
}
