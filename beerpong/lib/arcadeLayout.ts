export interface CupSpec {
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

// Classic 4-3-2-1 beer pong rack (10 cups), back row (farthest/smallest)
// to front row (closest/biggest) for a cheap sense of depth.
const ROWS = [
  { count: 4, y: 6, width: 32 },
  { count: 3, y: 56, width: 40 },
  { count: 2, y: 114, width: 48 },
  { count: 1, y: 180, width: 58 },
];

const CUP_ASPECT = 1.25; // height = width * CUP_ASPECT, like a real Solo cup

export const TABLE_HEIGHT = 360;

export function generateCupLayout(width: number): CupSpec[] {
  const cups: CupSpec[] = [];
  let index = 0;
  for (const row of ROWS) {
    const gap = 12;
    const rowWidth = row.count * row.width + (row.count - 1) * gap;
    const startX = width / 2 - rowWidth / 2;
    const height = row.width * CUP_ASPECT;
    for (let i = 0; i < row.count; i++) {
      cups.push({
        index,
        x: startX + i * (row.width + gap) + row.width / 2,
        y: row.y + height / 2,
        width: row.width,
        height,
      });
      index += 1;
    }
  }
  return cups;
}

export const CUP_COUNT = ROWS.reduce((sum, r) => sum + r.count, 0);
