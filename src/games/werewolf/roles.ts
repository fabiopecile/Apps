export type Role = 'Werwolf' | 'Dorfbewohner' | 'Seherin' | 'Hexe' | 'Jäger'

export const roleInfo: Record<Role, { emoji: string; description: string }> = {
  Werwolf: {
    emoji: '🐺',
    description:
      'Du gehörst zu den Werwölfen. Nachts wählt ihr gemeinsam (heimlich) ein Opfer aus dem Dorf. Tagsüber tust du unauffällig!',
  },
  Dorfbewohner: {
    emoji: '👤',
    description:
      'Du bist ein einfacher Dorfbewohner. Du hast keine besonderen Fähigkeiten – nutze Logik und Beobachtung, um die Werwölfe zu enttarnen!',
  },
  Seherin: {
    emoji: '🔮',
    description:
      'Jede Nacht darfst du heimlich auf eine Person zeigen. Der Erzähler verrät dir per Nicken oder Kopfschütteln, ob sie ein Werwolf ist.',
  },
  Hexe: {
    emoji: '🧪',
    description:
      'Du besitzt zwei Tränke: einen Heiltrank, um das nächtliche Opfer zu retten, und einen Gifttrank, um jemanden zu töten. Beide kannst du je einmal im Spiel einsetzen.',
  },
  Jäger: {
    emoji: '🏹',
    description:
      'Falls du stirbst (egal wie), darfst du sofort eine weitere Person mit in den Tod reißen.',
  },
}

export const steps = [
  { title: 'Nacht bricht an', text: 'Alle schließen die Augen und legen die Köpfe auf den Tisch.' },
  {
    title: '🐺 Werwölfe',
    text: 'Werwölfe, wacht auf und einigt euch leise mit Handzeichen auf ein Opfer.',
  },
  { title: '🐺 Werwölfe', text: 'Werwölfe, schließt wieder die Augen.' },
  {
    title: '🔮 Seherin',
    text: 'Seherin, wache auf und zeige auf eine Person. Der Erzähler nickt (Werwolf) oder schüttelt den Kopf (kein Werwolf).',
    role: 'Seherin' as Role,
  },
  { title: '🔮 Seherin', text: 'Seherin, schließe wieder die Augen.', role: 'Seherin' as Role },
  {
    title: '🧪 Hexe',
    text: 'Hexe, wache auf. Du siehst das Opfer der Nacht. Möchtest du heilen und/oder dein Gift bei jemand anderem einsetzen?',
    role: 'Hexe' as Role,
  },
  { title: '🧪 Hexe', text: 'Hexe, schließe wieder die Augen.', role: 'Hexe' as Role },
  {
    title: '☀️ Der Morgen graut',
    text: 'Alle wachen auf. Der Erzähler verkündet, wer in dieser Nacht gestorben ist (falls jemand).',
  },
  {
    title: '🗣️ Diskussion',
    text: 'Das Dorf diskutiert, wer verdächtig ist. Nutzt den Timer für eine feste Redezeit.',
    timer: true,
  },
  {
    title: '🗳️ Abstimmung',
    text: 'Jeder zeigt gleichzeitig auf die Person, die verbannt werden soll. Die Person mit den meisten Stimmen scheidet aus.',
  },
]
