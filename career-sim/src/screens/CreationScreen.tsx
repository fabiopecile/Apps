import { useState } from 'react';
import clsx from 'clsx';
import type { Appearance, BeardStyle, Foot, HairStyle, Position, SkinTone } from '../types';
import { useGameStore } from '../store/gameStore';
import { Button, Card, ScreenScaffold, SectionTitle } from '../components/ui';
import { PlayerAvatar } from '../components/PlayerAvatar';
import { nations } from '../data/nations';
import { startingClubs } from '../data/clubs';

const positions: { value: Position; label: string }[] = [
  { value: 'GK', label: 'Torwart' },
  { value: 'CB', label: 'Innenverteidiger' },
  { value: 'LB', label: 'Linksverteidiger' },
  { value: 'RB', label: 'Rechtsverteidiger' },
  { value: 'DM', label: 'Def. Mittelfeld' },
  { value: 'CM', label: 'Zentr. Mittelfeld' },
  { value: 'AM', label: 'Off. Mittelfeld' },
  { value: 'LW', label: 'Linksaußen' },
  { value: 'RW', label: 'Rechtsaußen' },
  { value: 'ST', label: 'Stürmer' },
];

const skinTones: SkinTone[] = ['light', 'medium', 'tan', 'dark', 'deep'];
const skinSwatches: Record<SkinTone, string> = {
  light: '#f2c9a0', medium: '#d8a377', tan: '#b97f52', dark: '#8a5a37', deep: '#5a3a24',
};
const hairStyles: { value: HairStyle; label: string }[] = [
  { value: 'short', label: 'Kurz' }, { value: 'buzz', label: 'Buzzcut' },
  { value: 'curly', label: 'Lockig' }, { value: 'long', label: 'Lang' },
  { value: 'mohawk', label: 'Irokese' }, { value: 'bald', label: 'Glatze' },
  { value: 'afro', label: 'Afro' }, { value: 'ponytail', label: 'Zopf' },
];
const hairColors = ['#1c1410', '#3b2416', '#6b4a2c', '#a3742f', '#d4c08a', '#1c1c1c', '#8a8a8a'];
const beardStyles: { value: BeardStyle; label: string }[] = [
  { value: 'none', label: 'Ohne' }, { value: 'stubble', label: 'Bartschatten' },
  { value: 'full', label: 'Vollbart' }, { value: 'goatee', label: 'Kinnbart' },
  { value: 'mustache', label: 'Schnurrbart' },
];

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'px-3 py-2 rounded-lg text-sm font-medium border transition-colors',
        active ? 'bg-gold-gradient text-black border-transparent' : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10',
      )}
    >
      {children}
    </button>
  );
}

export function CreationScreen() {
  const startCareer = useGameStore((s) => s.startCareer);
  const goToScreen = useGameStore((s) => s.goToScreen);

  const [name, setName] = useState('');
  const [age, setAge] = useState(17);
  const [nationality, setNationality] = useState(nations[0].name);
  const [position, setPosition] = useState<Position>('ST');
  const [foot, setFoot] = useState<Foot>('right');
  const [heightCm, setHeightCm] = useState(180);
  const [weightKg, setWeightKg] = useState(75);
  const [appearance, setAppearance] = useState<Appearance>({
    skinTone: 'medium', hairStyle: 'short', hairColor: hairColors[0], beard: 'none',
  });
  const [startClubId, setStartClubId] = useState(startingClubs()[0]?.id ?? '');

  const clubs = startingClubs();
  const canSubmit = name.trim().length >= 2 && startClubId;

  return (
    <ScreenScaffold
      title="Spieler erstellen"
      subtitle="Gestalte deinen zukünftigen Profi"
      onBack={() => goToScreen('intro')}
      footer={
        <Button
          variant="gold"
          className="w-full py-3"
          disabled={!canSubmit}
          onClick={() =>
            startCareer({ name: name.trim(), age, nationality, position, foot, heightCm, weightKg, appearance, startClubId })
          }
        >
          Karriere starten
        </Button>
      }
    >
      <div className="flex justify-center py-4">
        <PlayerAvatar appearance={appearance} size={110} />
      </div>

      <Card className="mb-4">
        <SectionTitle>Name & Herkunft</SectionTitle>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Spielername"
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm mb-3 outline-none focus:border-gold/50"
        />
        <div className="flex gap-3 mb-3">
          <div className="flex-1">
            <label className="text-xs text-white/45">Alter: {age}</label>
            <input type="range" min={16} max={18} value={age} onChange={(e) => setAge(Number(e.target.value))} className="w-full accent-[#d4af37]" />
          </div>
        </div>
        <label className="text-xs text-white/45">Nationalität</label>
        <select
          value={nationality}
          onChange={(e) => setNationality(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm mt-1 outline-none"
        >
          {nations.map((n) => (
            <option key={n.code} value={n.name} className="bg-panel">{n.name}</option>
          ))}
        </select>
      </Card>

      <Card className="mb-4">
        <SectionTitle>Position & Fuß</SectionTitle>
        <div className="flex flex-wrap gap-2 mb-3">
          {positions.map((p) => (
            <Pill key={p.value} active={position === p.value} onClick={() => setPosition(p.value)}>{p.label}</Pill>
          ))}
        </div>
        <div className="flex gap-2">
          <Pill active={foot === 'right'} onClick={() => setFoot('right')}>Rechtsfuß</Pill>
          <Pill active={foot === 'left'} onClick={() => setFoot('left')}>Linksfuß</Pill>
        </div>
      </Card>

      <Card className="mb-4">
        <SectionTitle>Körperbau</SectionTitle>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-white/45">Größe: {heightCm} cm</label>
            <input type="range" min={165} max={200} value={heightCm} onChange={(e) => setHeightCm(Number(e.target.value))} className="w-full accent-[#d4af37]" />
          </div>
          <div>
            <label className="text-xs text-white/45">Gewicht: {weightKg} kg</label>
            <input type="range" min={60} max={95} value={weightKg} onChange={(e) => setWeightKg(Number(e.target.value))} className="w-full accent-[#d4af37]" />
          </div>
        </div>
      </Card>

      <Card className="mb-4">
        <SectionTitle>Aussehen</SectionTitle>
        <label className="text-xs text-white/45">Hautfarbe</label>
        <div className="flex gap-2 mt-1 mb-3">
          {skinTones.map((s) => (
            <button
              key={s}
              onClick={() => setAppearance((a) => ({ ...a, skinTone: s }))}
              className={clsx('w-8 h-8 rounded-full border-2', appearance.skinTone === s ? 'border-gold' : 'border-transparent')}
              style={{ background: skinSwatches[s] }}
            />
          ))}
        </div>
        <label className="text-xs text-white/45">Frisur</label>
        <div className="flex flex-wrap gap-2 mt-1 mb-3">
          {hairStyles.map((h) => (
            <Pill key={h.value} active={appearance.hairStyle === h.value} onClick={() => setAppearance((a) => ({ ...a, hairStyle: h.value }))}>
              {h.label}
            </Pill>
          ))}
        </div>
        <label className="text-xs text-white/45">Haarfarbe</label>
        <div className="flex gap-2 mt-1 mb-3">
          {hairColors.map((c) => (
            <button
              key={c}
              onClick={() => setAppearance((a) => ({ ...a, hairColor: c }))}
              className={clsx('w-8 h-8 rounded-full border-2', appearance.hairColor === c ? 'border-gold' : 'border-transparent')}
              style={{ background: c }}
            />
          ))}
        </div>
        <label className="text-xs text-white/45">Bart</label>
        <div className="flex flex-wrap gap-2 mt-1">
          {beardStyles.map((b) => (
            <Pill key={b.value} active={appearance.beard === b.value} onClick={() => setAppearance((a) => ({ ...a, beard: b.value }))}>
              {b.label}
            </Pill>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle>Startverein</SectionTitle>
        <div className="grid grid-cols-1 gap-2">
          {clubs.map((c) => (
            <button
              key={c.id}
              onClick={() => setStartClubId(c.id)}
              className={clsx(
                'flex items-center justify-between px-3 py-2.5 rounded-lg border text-left transition-colors',
                startClubId === c.id ? 'border-gold bg-white/5' : 'border-white/10 hover:bg-white/5',
              )}
            >
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full" style={{ background: c.primaryColor }} />
                <div>
                  <div className="text-sm font-medium">{c.name}</div>
                  <div className="text-xs text-white/45">{c.country} · Reputation {c.reputation}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </Card>
    </ScreenScaffold>
  );
}
