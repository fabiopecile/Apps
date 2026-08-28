// Canvas drawing helpers — original flat/pixel art style.

export function drawPitch(ctx, w, h) {
  ctx.fillStyle = '#2e8b3d';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  const stripes = 8;
  for (let i = 0; i < stripes; i++) {
    if (i % 2 === 0) ctx.fillRect((w / stripes) * i, 0, w / stripes, h);
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 3;
  ctx.strokeRect(10, 10, w - 20, h - 20);
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, Math.min(w, h) * 0.12, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(w / 2, 10); ctx.lineTo(w / 2, h - 10);
  ctx.stroke();
  // goals
  ctx.strokeRect(w / 2 - 60, 10, 120, 40);
  ctx.strokeRect(w / 2 - 60, h - 50, 120, 40);
}

export function drawKitAvatar(ctx, cx, cy, scale, kit, { skin = '#e0ac69', action = 'idle' } = {}) {
  const [primary, secondary] = kit;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  // legs
  ctx.fillStyle = '#222';
  ctx.fillRect(-14, 30, 10, 26);
  ctx.fillRect(4, 30, 10, 26);
  // shorts
  ctx.fillStyle = secondary;
  ctx.fillRect(-18, 18, 36, 18);
  // torso
  ctx.fillStyle = primary;
  ctx.beginPath();
  ctx.moveTo(-20, -20);
  ctx.lineTo(20, -20);
  ctx.lineTo(18, 22);
  ctx.lineTo(-18, 22);
  ctx.closePath();
  ctx.fill();
  // sleeves
  ctx.fillStyle = secondary;
  ctx.fillRect(-28, -18, 10, 16);
  ctx.fillRect(18, -18, 10, 16);
  // arms
  ctx.fillStyle = skin;
  const armSwing = action === 'kick' ? -8 : 0;
  ctx.fillRect(-30, -14 + armSwing, 8, 20);
  ctx.fillRect(22, -14 - armSwing, 8, 20);
  // head
  ctx.beginPath();
  ctx.arc(0, -32, 13, 0, Math.PI * 2);
  ctx.fill();
  // hair
  ctx.fillStyle = '#3a2a1a';
  ctx.beginPath();
  ctx.arc(0, -37, 13, Math.PI, 0);
  ctx.fill();
  ctx.restore();
}

export function drawBall(ctx, x, y, r) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - r * 0.5, y - r * 0.2);
  ctx.lineTo(x, y - r * 0.6);
  ctx.lineTo(x + r * 0.5, y - r * 0.2);
  ctx.closePath();
  ctx.fillStyle = '#222';
  ctx.fill();
  ctx.restore();
}

// Timing bar minigame: a marker sweeps 0..1..0 across a bar; target zone is [t0,t1].
export function drawTimingBar(ctx, w, h, markerPos, target) {
  ctx.clearRect(0, 0, w, h);
  const barY = h / 2 - 14;
  const barH = 28;
  ctx.fillStyle = '#1c1c1c';
  ctx.fillRect(0, barY, w, barH);
  ctx.fillStyle = '#ffd23f';
  ctx.fillRect(target.t0 * w, barY, (target.t1 - target.t0) * w, barH);
  ctx.fillStyle = '#e63946';
  const mx = markerPos * w;
  ctx.fillRect(mx - 3, barY - 8, 6, barH + 16);
}
