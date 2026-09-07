/**
 * Kept in its own module so the store can type its `language` field without
 * importing the (much larger) translation table, which itself imports the store.
 */
export type Language = 'de' | 'en';

export const LANGUAGES: { id: Language; label: string; flag: string }[] = [
  { id: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { id: 'en', label: 'English', flag: '🇬🇧' },
];
