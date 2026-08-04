import type { Club, League } from '../types';

// All club/league names are original fictional creations for gameplay purposes.

interface ClubSeed {
  name: string;
  short: string;
  primary: string;
  secondary: string;
  stadium: string;
  capacity: number;
  reputation: number;
  budget: number;
  coach: string;
}

const leagueSeeds: { id: string; name: string; country: string; clubs: ClubSeed[] }[] = [
  {
    id: 'eng',
    name: 'Premier Elite League',
    country: 'Albion',
    clubs: [
      { name: 'North Ashford United', short: 'ASH', primary: '#c8102e', secondary: '#ffffff', stadium: 'Ashford Park', capacity: 61000, reputation: 96, budget: 420_000_000, coach: 'Graham Wolfe' },
      { name: 'Meridian City', short: 'MER', primary: '#6cabdd', secondary: '#1c2c5b', stadium: 'Meridian Arena', capacity: 55000, reputation: 94, budget: 480_000_000, coach: 'Pep Alvarez' },
      { name: 'Riverford Athletic', short: 'RIV', primary: '#d71920', secondary: '#000000', stadium: 'Riverford Stadium', capacity: 53000, reputation: 90, budget: 260_000_000, coach: 'Jurgen Bastian' },
      { name: 'Kingsmill United', short: 'KMU', primary: '#132257', secondary: '#ffffff', stadium: 'Kingsmill Bowl', capacity: 42000, reputation: 78, budget: 140_000_000, coach: 'Marco Elden' },
      { name: 'Sterling Town', short: 'STT', primary: '#003090', secondary: '#dba111', stadium: 'Sterling Fields', capacity: 39000, reputation: 74, budget: 110_000_000, coach: 'Owen Blackwood' },
      { name: 'Oakhaven FC', short: 'OAK', primary: '#241f20', secondary: '#fbee23', stadium: 'Oakhaven Ground', capacity: 32000, reputation: 66, budget: 70_000_000, coach: 'Terry Ives' },
      { name: 'Castlebridge FC', short: 'CBR', primary: '#7a263a', secondary: '#1b458f', stadium: 'Castlebridge Park', capacity: 26000, reputation: 58, budget: 40_000_000, coach: 'Dean Whitlock' },
      { name: 'Vale Park Rangers', short: 'VPR', primary: '#0057b8', secondary: '#ffd700', stadium: 'Vale Park', capacity: 21000, reputation: 48, budget: 22_000_000, coach: 'Sam Petrie' },
      { name: 'Northgate Wanderers', short: 'NGW', primary: '#e03a3e', secondary: '#000000', stadium: 'Northgate Ground', capacity: 18000, reputation: 40, budget: 14_000_000, coach: 'Callum Rees' },
      { name: 'Brightside Rovers', short: 'BSR', primary: '#005daa', secondary: '#ffffff', stadium: 'Brightside Common', capacity: 15000, reputation: 34, budget: 9_000_000, coach: 'Nathan Hobbs' },
    ],
  },
  {
    id: 'esp',
    name: 'Liga Dorada',
    country: 'Iberia',
    clubs: [
      { name: 'Real Costera', short: 'RCO', primary: '#ffffff', secondary: '#febe10', stadium: 'Estadio Costera', capacity: 81000, reputation: 97, budget: 500_000_000, coach: 'Xavier Montell' },
      { name: 'Atlético Vientos', short: 'ATV', primary: '#cb3524', secondary: '#182c4b', stadium: 'Estadio Vientos', capacity: 68000, reputation: 93, budget: 340_000_000, coach: 'Diego Marañón' },
      { name: 'Union Bética', short: 'UBE', primary: '#00954c', secondary: '#ffffff', stadium: 'Estadio Bético', capacity: 60000, reputation: 88, budget: 220_000_000, coach: 'Rafael Cuenca' },
      { name: 'Sevilla del Rey', short: 'SDR', primary: '#d81920', secondary: '#ffffff', stadium: 'Campo del Rey', capacity: 43000, reputation: 80, budget: 130_000_000, coach: 'Ivan Rosell' },
      { name: 'Deportivo Aurora', short: 'AUR', primary: '#0b4ea2', secondary: '#ffffff', stadium: 'Estadio Aurora', capacity: 34000, reputation: 68, budget: 60_000_000, coach: 'Miguel Sanz' },
      { name: 'Granada Sol', short: 'GRS', primary: '#c60c30', secondary: '#ffffff', stadium: 'Ciudad del Sol', capacity: 27000, reputation: 56, budget: 32_000_000, coach: 'Pablo Ferrero' },
      { name: 'Villa Marina CF', short: 'VMA', primary: '#00a89d', secondary: '#1c1c1c', stadium: 'Estadio Marina', capacity: 20000, reputation: 44, budget: 16_000_000, coach: 'Toni Balaguer' },
      { name: 'Club Meridiano', short: 'CME', primary: '#f6a800', secondary: '#000000', stadium: 'Campo Meridiano', capacity: 16000, reputation: 36, budget: 10_000_000, coach: 'Jose Andrade' },
    ],
  },
  {
    id: 'ger',
    name: 'Bundesliga Elite',
    country: 'Rhineland',
    clubs: [
      { name: 'Rheinbach SV', short: 'RHB', primary: '#e2001a', secondary: '#000000', stadium: 'Rheinbach Arena', capacity: 75000, reputation: 92, budget: 350_000_000, coach: 'Julian Hoss' },
      { name: 'Bergstadt 04', short: 'BER', primary: '#fde100', secondary: '#000000', stadium: 'Bergstadt Signal Iduna', capacity: 81000, reputation: 90, budget: 260_000_000, coach: 'Niko Feld' },
      { name: 'Nordwald FC', short: 'NWF', primary: '#004f9f', secondary: '#ffffff', stadium: 'Nordwald Arena', capacity: 60000, reputation: 82, budget: 150_000_000, coach: 'Erik Vollmer' },
      { name: 'Waldstadt Athletik', short: 'WAL', primary: '#e30613', secondary: '#ffffff', stadium: 'Waldstadion', capacity: 51000, reputation: 74, budget: 90_000_000, coach: 'Timo Reske' },
      { name: 'Lindenau SC', short: 'LIN', primary: '#004e9e', secondary: '#ffffff', stadium: 'Lindenau Park', capacity: 33000, reputation: 60, budget: 45_000_000, coach: 'Bastian Kuhl' },
      { name: 'Kranichfeld United', short: 'KFU', primary: '#c8102e', secondary: '#1c1c1c', stadium: 'Kranich Arena', capacity: 22000, reputation: 46, budget: 18_000_000, coach: 'Felix Amrein' },
      { name: 'Talburg SV', short: 'TAL', primary: '#00843d', secondary: '#ffffff', stadium: 'Talburg Stadion', capacity: 16000, reputation: 38, budget: 11_000_000, coach: 'Hannes Boldt' },
    ],
  },
  {
    id: 'ita',
    name: 'Serie Regale',
    country: 'Latina',
    clubs: [
      { name: 'Tirrenia FC', short: 'TIR', primary: '#000000', secondary: '#0068b3', stadium: 'Stadio Tirrenia', capacity: 76000, reputation: 91, budget: 300_000_000, coach: 'Enzo Marchetti' },
      { name: 'Vesuviana Calcio', short: 'VES', primary: '#1c6dd0', secondary: '#ffffff', stadium: 'San Vesuvio', capacity: 55000, reputation: 85, budget: 180_000_000, coach: 'Marco Sartori' },
      { name: 'Lombarda United', short: 'LOM', primary: '#7b0c26', secondary: '#022a5e', stadium: 'Stadio Lombarda', capacity: 65000, reputation: 88, budget: 240_000_000, coach: 'Cesare Grimaldi' },
      { name: 'Adriatica SC', short: 'ADR', primary: '#005baa', secondary: '#ffffff', stadium: 'Stadio Adriatico', capacity: 30000, reputation: 66, budget: 55_000_000, coach: 'Paolo Ricci' },
      { name: 'Etna Calcio', short: 'ETN', primary: '#dd0a26', secondary: '#000000', stadium: 'Stadio Etna', capacity: 24000, reputation: 52, budget: 28_000_000, coach: 'Salvo Greco' },
      { name: 'Sabina Calcio', short: 'SAB', primary: '#872434', secondary: '#f0c419', stadium: 'Stadio Sabina', capacity: 18000, reputation: 42, budget: 15_000_000, coach: 'Renzo Bianchi' },
    ],
  },
  {
    id: 'fra',
    name: 'Ligue Prestige',
    country: 'Gallia',
    clubs: [
      { name: 'Paris Capitale', short: 'PAC', primary: '#004170', secondary: '#da291c', stadium: 'Parc Capitale', capacity: 48000, reputation: 89, budget: 320_000_000, coach: 'Laurent Fabre' },
      { name: "Côte d'Azur FC", short: 'CDA', primary: '#e30613', secondary: '#ffffff', stadium: 'Stade Azur', capacity: 40000, reputation: 76, budget: 95_000_000, coach: 'Antoine Vidal' },
      { name: 'Rhône Valley SC', short: 'RVS', primary: '#004c97', secondary: '#ffffff', stadium: 'Stade du Rhône', capacity: 58000, reputation: 82, budget: 140_000_000, coach: 'Julien Mercier' },
      { name: 'Nord Éclair', short: 'NEC', primary: '#e2001a', secondary: '#000000', stadium: 'Stade du Nord', capacity: 27000, reputation: 58, budget: 34_000_000, coach: 'Guillaume Petit' },
      { name: 'Alsace United', short: 'ALS', primary: '#0072ce', secondary: '#ffffff', stadium: 'Stade Alsace', capacity: 22000, reputation: 50, budget: 24_000_000, coach: 'Marc Dubois' },
      { name: 'Loire Athletic', short: 'LOA', primary: '#f9a01b', secondary: '#1c1c1c', stadium: 'Stade de la Loire', capacity: 17000, reputation: 40, budget: 13_000_000, coach: 'Remy Fontaine' },
    ],
  },
];

export const clubs: Club[] = leagueSeeds.flatMap((league) =>
  league.clubs.map((c, i) => ({
    id: `${league.id}-${i}`,
    name: c.name,
    shortName: c.short,
    country: league.country,
    leagueId: league.id,
    tier: 1,
    reputation: c.reputation,
    primaryColor: c.primary,
    secondaryColor: c.secondary,
    stadium: c.stadium,
    capacity: c.capacity,
    budget: c.budget,
    coachName: c.coach,
  })),
);

export const leagues: League[] = leagueSeeds.map((l) => ({
  id: l.id,
  name: l.name,
  country: l.country,
  tier: 1,
  clubIds: l.clubs.map((_, i) => `${l.id}-${i}`),
  continentalSlot: 'champions',
}));

export function getClub(id: string): Club {
  const club = clubs.find((c) => c.id === id);
  if (!club) throw new Error(`Unknown club ${id}`);
  return club;
}

export function getLeague(id: string): League {
  const league = leagues.find((l) => l.id === id);
  if (!league) throw new Error(`Unknown league ${id}`);
  return league;
}

export function leagueOfClub(clubId: string): League {
  const club = getClub(clubId);
  return getLeague(club.leagueId);
}

export function startingClubs(): Club[] {
  // Lower reputation clubs where a young pro career can begin.
  return clubs.filter((c) => c.reputation <= 60);
}

export const continentalCupName = 'Champions Cup';
export const domesticCupNames: Record<string, string> = {
  eng: 'FA Trophy',
  esp: 'Copa Dorada',
  ger: 'Rhein Pokal',
  ita: 'Coppa Regale',
  fra: 'Coupe Prestige',
};
