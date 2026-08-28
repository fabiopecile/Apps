import type { RealtimePresenceState } from '@supabase/supabase-js'

type PresenceMeta = { username: string; joinedAt: number }

/**
 * Deterministic pairing: every client sees the same presence snapshot and
 * must independently compute the same pairs. Sort everyone waiting by join
 * time (tie-broken by id) and pair up consecutive entries.
 */
export function computePartner(
  presenceState: RealtimePresenceState<PresenceMeta>,
  selfId: string,
): string | null {
  const entries = Object.entries(presenceState)
    .filter(([, metas]) => metas.length > 0)
    .map(([id, metas]) => ({ id, joinedAt: metas[0].joinedAt }))
    .sort((a, b) => a.joinedAt - b.joinedAt || a.id.localeCompare(b.id))

  const idx = entries.findIndex((e) => e.id === selfId)
  if (idx === -1) return null

  const partnerIdx = idx % 2 === 0 ? idx + 1 : idx - 1
  return entries[partnerIdx]?.id ?? null
}

export function tableIdFor(idA: string, idB: string): string {
  return [idA, idB].sort().join('_')
}

export function hostIdFor(idA: string, idB: string): string {
  return [idA, idB].sort()[0]
}
