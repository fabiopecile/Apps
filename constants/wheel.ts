// Must mirror the CASE statement in the `spin_wheel()` Postgres function
// (supabase/migrations/0005_wheel_joker_types_duel_types_friends.sql) exactly —
// same order, same length — so the wheel visually lands on whatever the
// server actually awarded.
export const WHEEL_PRIZES: { emoji: string; label: string }[] = [
  { emoji: '💎', label: '100 XP' },
  { emoji: '🎁', label: 'Joker' },
  { emoji: '⭐', label: '50 XP' },
  { emoji: '🪙', label: '25 Coins' },
  { emoji: '🔥', label: '200 XP' },
  { emoji: '🚀', label: 'Booster' },
  { emoji: '👑', label: 'Titel' },
  { emoji: '💰', label: '500 XP' },
  { emoji: '⚡', label: '75 XP' },
  { emoji: '🎯', label: '150 XP' },
  { emoji: '🏆', label: '300 XP' },
  { emoji: '🎲', label: 'Extra Joker' },
];

export const WHEEL_SEGMENT_ANGLE = 360 / WHEEL_PRIZES.length;
