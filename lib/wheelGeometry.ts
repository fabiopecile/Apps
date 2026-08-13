function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) };
}

export function wedgePath(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
}

export function wedgeLabelPosition(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const mid = (startAngle + endAngle) / 2;
  return polarToCartesian(cx, cy, r, mid);
}

/** Rotation (deg, clockwise) needed so the wedge at `index` ends up under a pointer fixed at the top. */
export function rotationToLandOn(index: number, segmentAngle: number): number {
  const centerAngle = index * segmentAngle + segmentAngle / 2;
  return (360 - centerAngle) % 360;
}
