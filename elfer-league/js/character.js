// Builds a stylized layered SVG soccer player from the equipped cosmetics.
import { SKIN_TONES, findItem } from './state.js';

let uidCounter = 0;

const HAIR_PATHS = {
  hair_short:  (id) => `<path id="${id}" d="M72 46c4-22 20-34 28-34s24 12 28 34c2 6-2 10-6 8-6-14-16-20-22-20s-16 6-22 20c-4 2-8-2-6-8z"/>`,
  hair_buzz:   (id) => `<path id="${id}" d="M70 44c2-20 16-32 30-32s28 12 30 32c0 5-4 8-8 6-4-16-14-24-22-24s-18 8-22 24c-4 2-8-1-8-6z"/>`,
  hair_curly:  (id) => `<circle id="${id}" cx="78" cy="34" r="10"/><circle cx="92" cy="24" r="11"/><circle cx="108" cy="24" r="11"/><circle cx="122" cy="34" r="10"/><circle cx="100" cy="20" r="10"/>`,
  hair_mohawk: (id) => `<path id="${id}" d="M92 10c4 14 4 22 2 34h12c-2-12-2-20 2-34-4 6-12 6-16 0z"/><path d="M74 40c2-14 10-22 16-24-6 10-8 18-6 28-4 2-8 0-10-4z"/><path d="M126 40c-2-14-10-22-16-24 6 10 8 18 6 28 4 2 8 0 10-4z"/>`,
  hair_long:   (id) => `<path id="${id}" d="M68 50c-2-24 14-40 32-40s34 16 32 40c0 10-4 26-8 34-2-4-4-10-4-16 2-10 0-22-6-28 2 10 0 20-4 26-2-8-2-18-6-24 0 10-4 18-10 22-6-4-10-12-10-22-4 6-6 16-4 24-4-6-4-16-6-24-6 6-8 18-6 28 0 6-2 12-4 16-4-8-8-24-8-36z"/>`,
  hair_flame:  (id) => `<path id="${id}" fill="url(#${id}g)" d="M100 6c6 10-2 14 2 22 6-6 6-14 4-20 8 8 14 20 10 32-2 6-8 10-6 16 6-2 12-8 14-16 4 12 0 24-8 30-10 8-26 8-36 0-8-6-12-18-8-30 2 8 8 14 14 16 2-6-4-10-6-16-4-12 2-24 10-32-2 6-2 14 4 20 4-8-4-12 2-22z"/><defs><linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd166"/><stop offset="1" stop-color="#ff3b3b"/></linearGradient></defs>`,
};

const CEL_LABEL = {
  cel_classic: 'Jubellauf', cel_slide: 'Knie-Slide', cel_point: 'Zum Himmel',
  cel_spin: 'Spin', cel_fireworks: 'Feuerwerk',
};

export function celebrationLabel(id) { return CEL_LABEL[id] || 'Jubel'; }

export function renderCharacter(svgEl, profile, opts = {}) {
  const uid = 'c' + (uidCounter++);
  const skin = SKIN_TONES[profile.skinTone] || SKIN_TONES[0];
  const jersey = findItem('jersey', profile.equipped.jersey);
  const shorts = findItem('shorts', profile.equipped.shorts);
  const boots = findItem('boots', profile.equipped.boots);
  const gloves = findItem('gloves', profile.equipped.gloves);
  const hairId = profile.equipped.hair;
  const isGoalkeeper = !!opts.goalkeeper;
  const jerseyFill = isGoalkeeper ? '#e8b800' : `url(#${uid}jersey)`;
  const hairDraw = (HAIR_PATHS[hairId] || HAIR_PATHS.hair_short)(uid + 'hair');

  svgEl.innerHTML = `
    <defs>
      <linearGradient id="${uid}jersey" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${jersey.c1}"/>
        <stop offset="1" stop-color="${jersey.c2 || jersey.c1}"/>
      </linearGradient>
    </defs>
    <g class="part-shadow"><ellipse cx="100" cy="248" rx="34" ry="8" fill="#000" opacity="0.25"/></g>

    <g class="part-legL" style="transform-origin:88px 178px">
      <rect x="80" y="178" width="16" height="42" rx="7" fill="${skin}"/>
      <rect x="76" y="214" width="24" height="16" rx="6" fill="${boots.c1}"/>
    </g>
    <g class="part-legR" style="transform-origin:112px 178px">
      <rect x="104" y="178" width="16" height="42" rx="7" fill="${skin}"/>
      <rect x="100" y="214" width="24" height="16" rx="6" fill="${boots.c1}"/>
    </g>

    <g class="part-shorts">
      <rect x="74" y="150" width="52" height="32" rx="12" fill="${shorts.c1}"/>
    </g>

    <g class="part-armL" style="transform-origin:78px 100px">
      <rect x="62" y="86" width="18" height="46" rx="9" fill="${jerseyFill}"/>
      <circle cx="71" cy="136" r="9" fill="${skin}"/>
      <circle class="glove" cx="71" cy="136" r="7" fill="${gloves.c1}" opacity="${isGoalkeeper ? 1 : 0.9}"/>
    </g>
    <g class="part-armR" style="transform-origin:122px 100px">
      <rect x="120" y="86" width="18" height="46" rx="9" fill="${jerseyFill}"/>
      <circle cx="129" cy="136" r="9" fill="${skin}"/>
      <circle class="glove" cx="129" cy="136" r="7" fill="${gloves.c1}" opacity="${isGoalkeeper ? 1 : 0.9}"/>
    </g>

    <g class="part-torso">
      <rect x="70" y="80" width="60" height="76" rx="18" fill="${jerseyFill}"/>
      <rect x="70" y="80" width="60" height="18" rx="9" fill="#ffffff" opacity="0.12"/>
      ${isGoalkeeper ? '<text x="100" y="120" text-anchor="middle" font-size="22" font-weight="800" fill="#111">TW</text>' : ''}
    </g>

    <g class="part-head" style="transform-origin:100px 55px">
      <circle cx="100" cy="55" r="28" fill="${skin}"/>
      <g fill="#1c1c1c">${hairDraw}</g>
      <circle cx="90" cy="56" r="3" fill="#1c1c1c"/>
      <circle cx="110" cy="56" r="3" fill="#1c1c1c"/>
      <path d="M92 68q8 6 16 0" stroke="#7a4b32" stroke-width="2" fill="none" stroke-linecap="round"/>
    </g>
  `;
}

export function setPose(svgEl, pose) {
  svgEl.classList.remove('pose-idle', 'pose-run', 'pose-kick', 'pose-dive-l', 'pose-dive-r', 'pose-dive-c', 'pose-cheer', 'pose-slide', 'pose-sad', 'pose-spin', 'pose-fireworks');
  svgEl.classList.add('pose-' + pose);
}
