import type { Appearance, BeardStyle } from '../types';

const skinColors: Record<Appearance['skinTone'], string> = {
  light: '#f2c9a0',
  medium: '#d8a377',
  tan: '#b97f52',
  dark: '#8a5a37',
  deep: '#5a3a24',
};

function hairPath(style: Appearance['hairStyle']): string {
  switch (style) {
    case 'bald': return '';
    case 'buzz': return 'M20 34 a30 30 0 0 1 60 0 v-6 a30 26 0 0 0 -60 0 z';
    case 'short': return 'M16 36 a34 32 0 0 1 68 0 v-10 a34 28 0 0 0 -68 0 z';
    case 'curly': return 'M14 38 q4 -30 36 -30 q32 0 36 30 q-6 -8 -14 -6 q-4 -12 -22 -12 q-18 0 -22 12 q-8 -2 -14 6 z';
    case 'long': return 'M14 36 a36 30 0 0 1 72 0 v34 q-8 -6 -8 -20 v-14 a28 24 0 0 0 -56 0 v14 q0 14 -8 20 z';
    case 'mohawk': return 'M44 4 q6 0 6 14 v20 q0 4 -6 4 q-6 0 -6 -4 v-20 q0 -14 6 -14 z';
    case 'afro': return 'M50 6 a34 34 0 1 0 0.1 0 z';
    case 'ponytail': return 'M16 36 a34 30 0 0 1 68 0 v-8 a34 26 0 0 0 -68 0 z M78 40 q14 4 10 26 q-8 -6 -12 -14 z';
    default: return '';
  }
}

function beardPath(style: BeardStyle): string {
  switch (style) {
    case 'full': return 'M26 62 q24 30 48 0 q2 18 -24 24 q-26 -6 -24 -24 z';
    case 'stubble': return 'M30 64 q20 16 40 0 q0 6 -20 10 q-20 -4 -20 -10 z';
    case 'goatee': return 'M40 74 q10 10 20 0 q-2 8 -10 10 q-8 -2 -10 -10 z';
    case 'mustache': return 'M38 58 q10 6 24 0 q-2 5 -12 5 q-10 0 -12 -5 z';
    default: return '';
  }
}

export function PlayerAvatar({
  appearance, primaryColor = '#d4af37', size = 120,
}: { appearance: Appearance; primaryColor?: string; size?: number }) {
  const skin = skinColors[appearance.skinTone];
  const hair = hairPath(appearance.hairStyle);
  const beard = beardPath(appearance.beard);

  return (
    <div
      className="rounded-full overflow-hidden shrink-0 relative"
      style={{
        width: size, height: size,
        background: `radial-gradient(circle at 30% 20%, ${primaryColor}55, #14141900 70%), #1c1c24`,
        border: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      <svg viewBox="0 0 100 100" width="100%" height="100%">
        <circle cx="50" cy="112" r="34" fill={primaryColor} opacity="0.9" />
        <circle cx="50" cy="46" r="26" fill={skin} />
        <path d={beard} fill="#2a1c12" opacity="0.85" />
        <path d={hair} fill={appearance.hairColor} />
      </svg>
    </div>
  );
}
