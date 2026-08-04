export interface Nation {
  code: string;
  name: string;
  strength: number; // 1-100, affects national team difficulty & prestige
}

export const nations: Nation[] = [
  { code: 'ALB', name: 'Albion', strength: 88 },
  { code: 'IBE', name: 'Iberia', strength: 92 },
  { code: 'RHE', name: 'Rhineland', strength: 90 },
  { code: 'LAT', name: 'Latina', strength: 87 },
  { code: 'GAL', name: 'Gallia', strength: 89 },
  { code: 'LUS', name: 'Lusitania', strength: 82 },
  { code: 'BAT', name: 'Batavia', strength: 78 },
  { code: 'NOR', name: 'Nordheim', strength: 68 },
  { code: 'AUS', name: 'Austria Nova', strength: 62 },
  { code: 'BEL', name: 'Belgravia', strength: 76 },
  { code: 'CRO', name: 'Croatalia', strength: 70 },
  { code: 'ARG', name: 'Rioplata', strength: 91 },
  { code: 'BRA', name: 'Verdania', strength: 93 },
  { code: 'URU', name: 'Uruguaya', strength: 74 },
  { code: 'USA', name: 'Columbia North', strength: 60 },
  { code: 'MEX', name: 'Azteca', strength: 58 },
  { code: 'JPN', name: 'Nippon Isles', strength: 64 },
  { code: 'KOR', name: 'Hanguk', strength: 61 },
  { code: 'AUZ', name: 'Austral', strength: 52 },
  { code: 'SEN', name: 'Senegalia', strength: 66 },
  { code: 'MOR', name: 'Maghrebia', strength: 63 },
  { code: 'NIG', name: 'Nigera', strength: 65 },
  { code: 'GHA', name: 'Goldcoast', strength: 57 },
  { code: 'EGY', name: 'Nilesia', strength: 60 },
  { code: 'TUR', name: 'Anatolia', strength: 67 },
  { code: 'POL', name: 'Polandria', strength: 55 },
  { code: 'SWE', name: 'Svealand', strength: 59 },
  { code: 'DEN', name: 'Danemark', strength: 61 },
  { code: 'SCO', name: 'Caledonia', strength: 50 },
  { code: 'WAL', name: 'Cambria', strength: 48 },
];

export function randomNation(): Nation {
  return nations[Math.floor(Math.random() * nations.length)];
}

export const internationalTournaments = [
  { id: 'euro', name: 'Continental Championship', cycle: 4 },
  { id: 'world', name: 'World Trophy', cycle: 4 },
  { id: 'nations', name: 'Nations League', cycle: 2 },
  { id: 'olympics', name: 'Olympic Games (U23)', cycle: 4 },
];
