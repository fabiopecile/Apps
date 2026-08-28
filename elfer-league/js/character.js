// Builds a chibi-style, glossy 3D-look SVG soccer player from the equipped cosmetics.
import { SKIN_TONES, findItem } from './state.js';

let uidCounter = 0;

function shade(hex, percent) {
  const n = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  let r = (n >> 16) + amt, g = ((n >> 8) & 0xff) + amt, b = (n & 0xff) + amt;
  r = Math.max(0, Math.min(255, r)); g = Math.max(0, Math.min(255, g)); b = Math.max(0, Math.min(255, b));
  return '#' + (0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1);
}

// Head is centered at (100,64) with radius 42 — kept fixed so hair styles below line up.
const HAIR_PATHS = {
  hair_short: (id) => `
    <path fill="url(#${id})" d="M58 66c-4-34 16-62 42-62s46 28 42 62c0 6-6 9-9 4-5-26-18-42-33-42s-28 16-33 42c-3 5-9 2-9-4z"/>
    <path fill="url(#${id})" d="M60 40c8-14 22-22 40-22s32 8 40 22c-10-8-24-13-40-13s-30 5-40 13z"/>`,
  hair_buzz: (id) => `
    <path fill="url(#${id})" d="M62 58c-2-28 14-50 38-50s40 22 38 50c0 5-5 7-7 3-4-22-16-36-31-36s-27 14-31 36c-2 4-7 2-7-3z"/>`,
  hair_curly: (id) => `
    <circle fill="url(#${id})" cx="70" cy="38" r="14"/><circle fill="url(#${id})" cx="88" cy="24" r="15"/>
    <circle fill="url(#${id})" cx="112" cy="24" r="15"/><circle fill="url(#${id})" cx="130" cy="38" r="14"/>
    <circle fill="url(#${id})" cx="100" cy="18" r="15"/><circle fill="url(#${id})" cx="79" cy="52" r="10"/>
    <circle fill="url(#${id})" cx="121" cy="52" r="10"/>`,
  hair_mohawk: (id) => `
    <path fill="url(#${id})" d="M88 8c6 18 6 30 3 44h18c-3-14-3-26 3-44-6 8-18 8-24 0z"/>
    <path fill="url(#${id})" d="M60 54c2-18 12-30 22-34-8 14-10 24-7 36-5 3-11 1-15-2z"/>
    <path fill="url(#${id})" d="M140 54c-2-18-12-30-22-34 8 14 10 24 7 36 5 3 11 1 15-2z"/>`,
  hair_long: (id) => `
    <path fill="url(#${id})" d="M56 68c-4-34 18-58 44-58s48 24 44 58c0 14-5 34-11 44-2-6-4-14-3-22 3-13 1-28-7-36 2 13-1 26-6 34-3-11-2-24-8-32-1 13-6 24-14 30-8-6-13-17-14-30-6 8-7 21-8 32-5-8-4-21-6-34-8 8-10 23-7 36 1 8-1 16-3 22-6-10-11-30-11-44z"/>`,
  hair_flame: (id) => `
    <path fill="url(#${id})" d="M100 4c8 12-2 17 3 27 8-7 8-17 5-25 10 10 18 25 12 40-3 7-10 12-7 20 8-3 15-10 18-20 5 15 0 30-10 37-13 10-32 10-45 0-10-7-15-22-10-37 3 10 10 17 18 20 3-8-4-13-7-20-5-15 2-30 12-40-3 8-3 17 5 25 5-10-5-15 3-27z"/>`,
};

function pickHairId(hairId) {
  return HAIR_PATHS[hairId] ? hairId : 'hair_short';
}

export function renderCharacter(svgEl, profile, opts = {}) {
  const uid = 'c' + (uidCounter++);
  const skin = SKIN_TONES[profile.skinTone] || SKIN_TONES[0];
  const jersey = findItem('jersey', profile.equipped.jersey);
  const shorts = findItem('shorts', profile.equipped.shorts);
  const boots = findItem('boots', profile.equipped.boots);
  const gloves = findItem('gloves', profile.equipped.gloves);
  const hairId = pickHairId(profile.equipped.hair);
  const isGoalkeeper = !!opts.goalkeeper;

  const jerseyTop = isGoalkeeper ? '#fff1a8' : shade(jersey.c1, 30);
  const jerseyBot = isGoalkeeper ? '#e8b800' : (jersey.c2 || shade(jersey.c1, -22));
  const skinHi = shade(skin, 22);
  const skinLo = shade(skin, -12);
  const shortsTop = shade(shorts.c1, 28), shortsBot = shade(shorts.c1, -14);
  const bootsTop = shade(boots.c1, 30), bootsBot = shade(boots.c1, -18);
  const glovesTop = shade(gloves.c1, 30), glovesBot = shade(gloves.c1, -18);
  const hairTop = '#4a3629', hairBot = '#1c130c';
  const hairFillId = hairId === 'hair_flame' ? uid + 'hairflame' : uid + 'hair';

  svgEl.innerHTML = `
    <defs>
      <radialGradient id="${uid}skin" cx="38%" cy="30%" r="75%">
        <stop offset="0" stop-color="${skinHi}"/><stop offset="1" stop-color="${skinLo}"/>
      </radialGradient>
      <linearGradient id="${uid}jersey" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${jerseyTop}"/><stop offset="1" stop-color="${jerseyBot}"/>
      </linearGradient>
      <linearGradient id="${uid}shorts" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${shortsTop}"/><stop offset="1" stop-color="${shortsBot}"/>
      </linearGradient>
      <linearGradient id="${uid}boots" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${bootsTop}"/><stop offset="1" stop-color="${bootsBot}"/>
      </linearGradient>
      <linearGradient id="${uid}gloves" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${glovesTop}"/><stop offset="1" stop-color="${glovesBot}"/>
      </linearGradient>
      <linearGradient id="${hairFillId}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${hairId === 'hair_flame' ? '#ffd166' : hairTop}"/>
        <stop offset="1" stop-color="${hairId === 'hair_flame' ? '#ff3b3b' : hairBot}"/>
      </linearGradient>
    </defs>

    <g class="part-shadow"><ellipse cx="100" cy="250" rx="38" ry="9" fill="#000" opacity="0.28"/></g>

    <g class="part-legL" style="transform-origin:82px 172px">
      <rect x="72" y="172" width="22" height="36" rx="10" fill="url(#${uid}skin)" stroke="rgba(0,0,0,0.15)" stroke-width="1.5"/>
      <rect x="72" y="198" width="22" height="14" rx="6" fill="#f2f5fc" stroke="rgba(0,0,0,0.12)" stroke-width="1.5"/>
      <rect x="72" y="203" width="22" height="4" fill="${jersey.c1}"/>
      <path d="M67 210q0-4 4-4h28q6 0 6 6v6q0 8-8 8H73q-6 0-6-6z" fill="url(#${uid}boots)" stroke="rgba(0,0,0,0.25)" stroke-width="1.5"/>
      <rect x="66" y="220" width="34" height="7" rx="3.5" fill="${bootsBot}"/>
    </g>
    <g class="part-legR" style="transform-origin:118px 172px">
      <rect x="106" y="172" width="22" height="36" rx="10" fill="url(#${uid}skin)" stroke="rgba(0,0,0,0.15)" stroke-width="1.5"/>
      <rect x="106" y="198" width="22" height="14" rx="6" fill="#f2f5fc" stroke="rgba(0,0,0,0.12)" stroke-width="1.5"/>
      <rect x="106" y="203" width="22" height="4" fill="${jersey.c1}"/>
      <path d="M101 210q0-4 4-4h28q6 0 6 6v6q0 8-8 8h-24q-6 0-6-6z" fill="url(#${uid}boots)" stroke="rgba(0,0,0,0.25)" stroke-width="1.5"/>
      <rect x="100" y="220" width="34" height="7" rx="3.5" fill="${bootsBot}"/>
    </g>

    <g class="part-shorts">
      <rect x="66" y="158" width="68" height="30" rx="15" fill="url(#${uid}shorts)" stroke="rgba(0,0,0,0.15)" stroke-width="1.5"/>
      <rect x="66" y="158" width="68" height="10" rx="5" fill="#fff" opacity="0.18"/>
    </g>

    <g class="part-armL" style="transform-origin:72px 122px">
      <rect x="54" y="108" width="24" height="42" rx="12" fill="url(#${uid}jersey)" stroke="rgba(0,0,0,0.15)" stroke-width="1.5"/>
      <circle cx="67" cy="152" r="12" fill="url(#${uid}skin)" stroke="rgba(0,0,0,0.15)" stroke-width="1.5"/>
      <circle class="glove" cx="67" cy="152" r="9" fill="url(#${uid}gloves)" opacity="${isGoalkeeper ? 1 : 0.85}"/>
    </g>
    <g class="part-armR" style="transform-origin:128px 122px">
      <rect x="122" y="108" width="24" height="42" rx="12" fill="url(#${uid}jersey)" stroke="rgba(0,0,0,0.15)" stroke-width="1.5"/>
      <circle cx="133" cy="152" r="12" fill="url(#${uid}skin)" stroke="rgba(0,0,0,0.15)" stroke-width="1.5"/>
      <circle class="glove" cx="133" cy="152" r="9" fill="url(#${uid}gloves)" opacity="${isGoalkeeper ? 1 : 0.85}"/>
    </g>

    <g class="part-torso">
      <path d="M100 100c20 0 34 8 36 26l2 30c1 10-8 16-18 16H80c-10 0-19-6-18-16l2-30c2-18 16-26 36-26z" fill="url(#${uid}jersey)" stroke="rgba(0,0,0,0.15)" stroke-width="1.5"/>
      <path d="M84 101c-9 4-14 12-15 22h62c-1-10-6-18-15-22-4 4-10 7-16 7s-12-3-16-7z" fill="#fff" opacity="0.15"/>
      <circle cx="100" cy="128" r="9" fill="#fff" opacity="0.5"/>
      <circle cx="100" cy="128" r="9" fill="none" stroke="${shade(jerseyBot, -10)}" stroke-width="2"/>
      ${isGoalkeeper ? '<text x="100" y="133" text-anchor="middle" font-size="13" font-weight="800" fill="#7a5c00">TW</text>' : ''}
    </g>

    <g class="part-head" style="transform-origin:100px 62px">
      <ellipse cx="100" cy="108" rx="20" ry="8" fill="${skinLo}" opacity="0.5"/>
      <circle cx="100" cy="62" r="42" fill="url(#${uid}skin)" stroke="rgba(0,0,0,0.15)" stroke-width="1.5"/>
      <ellipse cx="86" cy="46" rx="16" ry="11" fill="#fff" opacity="0.22"/>
      <ellipse cx="80" cy="82" rx="9" ry="6" fill="#ff8b8b" opacity="0.35"/>
      <ellipse cx="120" cy="82" rx="9" ry="6" fill="#ff8b8b" opacity="0.35"/>
      <g class="hair">${(HAIR_PATHS[hairId])(hairFillId)}</g>
      <g>
        <circle cx="83" cy="64" r="6.5" fill="#20242c"/><circle cx="117" cy="64" r="6.5" fill="#20242c"/>
        <circle cx="85.5" cy="61.5" r="2" fill="#fff"/><circle cx="119.5" cy="61.5" r="2" fill="#fff"/>
      </g>
      <path d="M87 86q13 10 26 0" stroke="${shade(skin, -30)}" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    </g>
  `;
}

export function setPose(svgEl, pose) {
  svgEl.classList.remove('pose-idle', 'pose-run', 'pose-kick', 'pose-dive-l', 'pose-dive-r', 'pose-dive-c', 'pose-cheer', 'pose-slide', 'pose-sad', 'pose-spin', 'pose-fireworks');
  svgEl.classList.add('pose-' + pose);
}
