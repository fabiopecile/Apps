export function shuffle<T>(items: T[]): T[] {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function pick<T>(items: T[]): T {
  return items[randomInt(0, items.length - 1)]
}

export function pickMany<T>(items: T[], count: number): T[] {
  return shuffle(items).slice(0, count)
}
