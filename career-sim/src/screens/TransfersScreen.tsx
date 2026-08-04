import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { Badge, Button, Card, ScreenScaffold, SectionTitle } from '../components/ui';
import { formatMoney } from '../engine/marketValue';
import type { TransferOffer } from '../types';

function OfferCard({
  offer, isRenewal, onAccept, onDecline, onNegotiate,
}: {
  offer: TransferOffer;
  isRenewal: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onNegotiate: (salaryAskPct: number) => void;
}) {
  const [negotiating, setNegotiating] = useState(false);
  const [ask, setAsk] = useState(0.1);

  return (
    <Card className="mb-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold">{offer.clubName}</p>
        {!isRenewal && offer.fee > 0 && <Badge tone="gold">{formatMoney(offer.fee)}</Badge>}
      </div>
      <p className="text-xs text-white/45 mb-3">{offer.reason}</p>
      <div className="grid grid-cols-2 gap-y-2 text-xs mb-3">
        <div><span className="text-white/40">Gehalt/Woche </span><span className="font-medium">{formatMoney(offer.salaryPerWeek)}</span></div>
        <div><span className="text-white/40">Laufzeit </span><span className="font-medium">{offer.years} Jahre</span></div>
        <div><span className="text-white/40">Rückennummer </span><span className="font-medium">#{offer.squadNumber}</span></div>
        <div><span className="text-white/40">Signing Bonus </span><span className="font-medium">{formatMoney(offer.signingBonus)}</span></div>
      </div>
      <div className="flex gap-1.5 flex-wrap mb-3">
        {offer.startingXiGuarantee && <Badge tone="green">Stammplatzgarantie</Badge>}
        {offer.releaseClause && <Badge>Ausstiegsklausel {formatMoney(offer.releaseClause)}</Badge>}
      </div>

      {negotiating ? (
        <div className="border-t border-white/8 pt-3 mt-1">
          <label className="text-xs text-white/45">Gehaltsforderung: {ask >= 0 ? '+' : ''}{Math.round(ask * 100)}%</label>
          <input type="range" min={-0.2} max={0.5} step={0.05} value={ask} onChange={(e) => setAsk(Number(e.target.value))} className="w-full accent-[#d4af37] mb-3" />
          <div className="flex gap-2">
            <Button variant="gold" className="flex-1" onClick={() => { onNegotiate(ask); setNegotiating(false); }}>Angebot senden</Button>
            <Button variant="ghost" onClick={() => setNegotiating(false)}>Abbrechen</Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button variant="gold" className="flex-1" onClick={onAccept}>Annehmen</Button>
          <Button variant="ghost" onClick={() => setNegotiating(true)}>Verhandeln</Button>
          <Button variant="danger" onClick={onDecline}>Ablehnen</Button>
        </div>
      )}
    </Card>
  );
}

export function TransfersScreen() {
  const player = useGameStore((s) => s.player);
  const pendingOffers = useGameStore((s) => s.pendingOffers);
  const acceptOffer = useGameStore((s) => s.acceptOffer);
  const declineOffer = useGameStore((s) => s.declineOffer);
  const negotiate = useGameStore((s) => s.negotiate);
  const acceptRenewal = useGameStore((s) => s.acceptRenewal);
  const requestRenewal = useGameStore((s) => s.requestRenewal);
  const goToScreen = useGameStore((s) => s.goToScreen);

  if (!player) return null;

  const renewalOffer = pendingOffers.find((o) => o.clubId === player.clubId);
  const externalOffers = pendingOffers.filter((o) => o.clubId !== player.clubId);

  return (
    <ScreenScaffold title="Transfers & Verträge" onBack={() => goToScreen('hub')}>
      <SectionTitle>Aktueller Vertrag</SectionTitle>
      <Card className="mb-5">
        <div className="grid grid-cols-2 gap-y-2 text-xs">
          <div><span className="text-white/40">Gehalt/Woche </span><span className="font-medium">{formatMoney(player.contract.salaryPerWeek)}</span></div>
          <div><span className="text-white/40">Verbleibend </span><span className="font-medium">{player.contract.yearsLeft} Jahre</span></div>
          <div><span className="text-white/40">Rückennummer </span><span className="font-medium">#{player.contract.squadNumber}</span></div>
          <div><span className="text-white/40">Ausstiegsklausel </span><span className="font-medium">{player.contract.releaseClause ? formatMoney(player.contract.releaseClause) : '—'}</span></div>
        </div>
        {!renewalOffer && (
          <Button variant="ghost" className="w-full mt-3" onClick={requestRenewal}>Vertragsverlängerung anfragen</Button>
        )}
      </Card>

      {renewalOffer && (
        <>
          <SectionTitle>Vertragsverlängerung</SectionTitle>
          <OfferCard
            offer={renewalOffer}
            isRenewal
            onAccept={acceptRenewal}
            onDecline={() => declineOffer(renewalOffer.id)}
            onNegotiate={(ask) => negotiate(renewalOffer.id, { salaryAskPct: ask, wantsReleaseClauseRemoved: false, wantsStartingXi: false, wantsMoreYears: 0 })}
          />
        </>
      )}

      <SectionTitle>Angebote anderer Vereine</SectionTitle>
      {externalOffers.length === 0 ? (
        <p className="text-sm text-white/45">Aktuell liegen keine Angebote vor.</p>
      ) : (
        externalOffers.map((o) => (
          <OfferCard
            key={o.id}
            offer={o}
            isRenewal={false}
            onAccept={() => acceptOffer(o.id)}
            onDecline={() => declineOffer(o.id)}
            onNegotiate={(ask) => negotiate(o.id, { salaryAskPct: ask, wantsReleaseClauseRemoved: false, wantsStartingXi: true, wantsMoreYears: 0 })}
          />
        ))
      )}
    </ScreenScaffold>
  );
}
