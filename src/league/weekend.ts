function startOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function addDays(d: Date, n: number) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

function formatLocalDate(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export type WeekendInfo = {
  weekendKey: string
  isActive: boolean
  windowStart: Date
  windowEnd: Date
}

/** Weekend League runs Friday 00:00 through Sunday 23:59:59 (local time). */
export function getWeekendInfo(now = new Date()): WeekendInfo {
  const day = now.getDay() // 0 = Sun ... 6 = Sat
  const today0 = startOfDay(now)
  let fridayStart: Date

  if (day === 5 || day === 6 || day === 0) {
    const daysSinceFriday = day === 5 ? 0 : day === 6 ? 1 : 2
    fridayStart = addDays(today0, -daysSinceFriday)
  } else {
    const daysUntilFriday = (5 - day + 7) % 7
    fridayStart = addDays(today0, daysUntilFriday)
  }

  const windowEnd = addDays(fridayStart, 3) // Monday 00:00, exclusive
  const isActive = now >= fridayStart && now < windowEnd

  return { weekendKey: formatLocalDate(fridayStart), isActive, windowStart: fridayStart, windowEnd }
}

export function formatCountdown(target: Date, now = new Date()) {
  const ms = Math.max(0, target.getTime() - now.getTime())
  const totalMinutes = Math.floor(ms / 60000)
  const days = Math.floor(totalMinutes / (60 * 24))
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60)
  const minutes = totalMinutes % 60
  if (days > 0) return `${days}t ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}min`
  return `${minutes}min`
}
