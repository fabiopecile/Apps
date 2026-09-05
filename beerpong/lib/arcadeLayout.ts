export interface CupSpec {
  index: number;
  x: number;
  y: number;
  size: number;
}

const ROWS = [
  { count: 3, y: 18, size: 38 },
  { count: 2, y: 92, size: 50 },
  { count: 1, y: 176, size: 66 },
];

export const TABLE_HEIGHT = 280;

export function generateCupLayout(width: number): CupSpec[] {
  const cups: CupSpec[] = [];
  let index = 0;
  for (const row of ROWS) {
    const gap = 14;
    const rowWidth = row.count * row.size + (row.count - 1) * gap;
    const startX = width / 2 - rowWidth / 2;
    for (let i = 0; i < row.count; i++) {
      cups.push({
        index,
        x: startX + i * (row.size + gap) + row.size / 2,
        y: row.y + row.size / 2,
        size: row.size,
      });
      index += 1;
    }
  }
  return cups;
}

export const CUP_COUNT = ROWS.reduce((sum, r) => sum + r.count, 0);
