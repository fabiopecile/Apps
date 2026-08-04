// ---------------------------------------------------------------------------
// Static game data: countries, clubs, flavor text
// ---------------------------------------------------------------------------

function flagEmoji(code) {
  return code
    .toUpperCase()
    .split('')
    .map((c) => String.fromCodePoint(127397 + c.charCodeAt(0)))
    .join('');
}

const COUNTRY_CODES = [
  ['AR', 'Argentina'], ['BR', 'Brazil'], ['DE', 'Germany'], ['ES', 'Spain'],
  ['FR', 'France'], ['IT', 'Italy'], ['GB-ENG', 'England'], ['PT', 'Portugal'],
  ['NL', 'Netherlands'], ['BE', 'Belgium'], ['AT', 'Austria'], ['CH', 'Switzerland'],
  ['UY', 'Uruguay'], ['CL', 'Chile'], ['CO', 'Colombia'], ['MX', 'Mexico'],
  ['US', 'United States'], ['CA', 'Canada'], ['JP', 'Japan'], ['KR', 'South Korea'],
  ['AU', 'Australia'], ['MA', 'Morocco'], ['SN', 'Senegal'], ['NG', 'Nigeria'],
  ['GH', 'Ghana'], ['CI', "Ivory Coast"], ['CM', 'Cameroon'], ['EG', 'Egypt'],
  ['DZ', 'Algeria'], ['TN', 'Tunisia'], ['ZA', 'South Africa'], ['TR', 'Turkey'],
  ['GR', 'Greece'], ['RS', 'Serbia'], ['HR', 'Croatia'], ['PL', 'Poland'],
  ['CZ', 'Czechia'], ['SK', 'Slovakia'], ['HU', 'Hungary'], ['RO', 'Romania'],
  ['BG', 'Bulgaria'], ['UA', 'Ukraine'], ['RU', 'Russia'], ['DK', 'Denmark'],
  ['SE', 'Sweden'], ['NO', 'Norway'], ['FI', 'Finland'], ['IS', 'Iceland'],
  ['IE', 'Ireland'], ['SCT', 'Scotland'], ['WLS', 'Wales'], ['UA', 'Ukraine'],
  ['SI', 'Slovenia'], ['BA', 'Bosnia and Herzegovina'], ['MK', 'North Macedonia'],
  ['AL', 'Albania'], ['ME', 'Montenegro'], ['XK', 'Kosovo'], ['CY', 'Cyprus'],
  ['IL', 'Israel'], ['SA', 'Saudi Arabia'], ['QA', 'Qatar'], ['AE', 'United Arab Emirates'],
  ['IR', 'Iran'], ['IQ', 'Iraq'], ['JO', 'Jordan'], ['CN', 'China'], ['IN', 'India'],
  ['ID', 'Indonesia'], ['TH', 'Thailand'], ['VN', 'Vietnam'], ['NZ', 'New Zealand'],
  ['EC', 'Ecuador'], ['PE', 'Peru'], ['BO', 'Bolivia'], ['PY', 'Paraguay'],
  ['VE', 'Venezuela'], ['CR', 'Costa Rica'], ['PA', 'Panama'], ['HN', 'Honduras'],
  ['JM', 'Jamaica'], ['CU', 'Cuba'], ['DO', 'Dominican Republic'], ['GT', 'Guatemala'],
  ['EE', 'Estonia'], ['LV', 'Latvia'], ['LT', 'Lithuania'], ['LU', 'Luxembourg'],
  ['MT', 'Malta'], ['GE', 'Georgia'], ['AM', 'Armenia'], ['AZ', 'Azerbaijan'],
  ['KZ', 'Kazakhstan'], ['BY', 'Belarus'], ['MD', 'Moldova'], ['LY', 'Libya'],
  ['CD', 'DR Congo'], ['ML', 'Mali'], ['BF', 'Burkina Faso'], ['GN', 'Guinea'],
  ['ZM', 'Zambia'], ['UG', 'Uganda'], ['KE', 'Kenya'], ['TZ', 'Tanzania'],
  ['AO', 'Angola'], ['MZ', 'Mozambique'], ['GA', 'Gabon'], ['CG', 'Congo'],
];

const COUNTRIES = COUNTRY_CODES.map(([code, name]) => ({
  code,
  name,
  flag: flagEmoji(code.length > 2 ? code.slice(0, 2) : code),
}));

// Club tiers. Higher tier number = weaker/smaller club.
const CLUB_TIERS = [
  {
    id: 1,
    label: 'Elite',
    minOvr: 84,
    trophies: { league: 0.16, cup: 0.2, continental: 0.12, continentalName: 'Champions League' },
    clubs: ['Real Madrid', 'Barcelona', 'Manchester City', 'Bayern Munich', 'Paris SG',
      'Liverpool', 'Inter Milan', 'Arsenal', 'Bayer Leverkusen', 'Manchester United'],
  },
  {
    id: 2,
    label: 'Continental',
    minOvr: 78,
    trophies: { league: 0.11, cup: 0.15, continental: 0.13, continentalName: 'Europa League' },
    clubs: ['Atlético Madrid', 'AC Milan', 'Juventus', 'Borussia Dortmund', 'Tottenham',
      'Napoli', 'Sevilla', 'Ajax', 'RB Leipzig', 'Porto', 'Benfica', 'Roma'],
  },
  {
    id: 3,
    label: 'Established',
    minOvr: 72,
    trophies: { league: 0.07, cup: 0.1, continental: 0.05, continentalName: 'Conference League' },
    clubs: ['Udinese', 'Real Sociedad', 'Fiorentina', 'Real Betis', 'Werder Bremen',
      'Levante', 'Crystal Palace', 'Torino', 'Rennes', 'Feyenoord', 'Celta Vigo', 'Getafe'],
  },
  {
    id: 4,
    label: 'Challengers',
    minOvr: 66,
    trophies: { league: 0.04, cup: 0.06 },
    clubs: ['Sunderland', 'West Brom', 'Watford', 'Hull City', 'Cádiz', 'Spezia',
      'Nürnberg', 'Elche', 'Reading', 'Middlesbrough', 'Preston North End'],
  },
  {
    id: 5,
    label: 'Foundations',
    minOvr: 0,
    trophies: { league: 0.03, cup: 0.04 },
    clubs: ['Nacional', 'Barnsley', 'Port Vale', 'Bristol Rovers', 'Cambridge United',
      'Colchester United', 'Leyton Orient', 'Salford City', 'Stockport County', 'Tranmere Rovers'],
  },
];

const POSITIONS = [
  { code: 'ST', label: 'Striker', top: 13, left: 50, goal: 1.0, ast: 0.35 },
  { code: 'LW', label: 'Left Winger', top: 20, left: 18, goal: 0.7, ast: 0.6 },
  { code: 'RW', label: 'Right Winger', top: 20, left: 82, goal: 0.7, ast: 0.6 },
  { code: 'CAM', label: 'Attacking Mid', top: 31, left: 50, goal: 0.55, ast: 0.75 },
  { code: 'LM', label: 'Left Mid', top: 39, left: 16, goal: 0.35, ast: 0.55 },
  { code: 'RM', label: 'Right Mid', top: 39, left: 84, goal: 0.35, ast: 0.55 },
  { code: 'CM', label: 'Central Mid', top: 44, left: 50, goal: 0.3, ast: 0.5 },
  { code: 'CDM', label: 'Defensive Mid', top: 55, left: 50, goal: 0.15, ast: 0.3 },
  { code: 'LB', label: 'Left Back', top: 61, left: 16, goal: 0.08, ast: 0.35 },
  { code: 'RB', label: 'Right Back', top: 61, left: 84, goal: 0.08, ast: 0.35 },
  { code: 'CB', label: 'Centre Back', top: 68, left: 50, goal: 0.1, ast: 0.12 },
  { code: 'GK', label: 'Goalkeeper', top: 82, left: 50, goal: 0.0, ast: 0.0 },
];

const INJURY_TYPES = [
  'Hamstring strain', 'Tibia and fibula fracture', 'ACL tear', 'Ankle sprain',
  'Groin injury', 'Shoulder dislocation', 'Knee ligament damage', 'Metatarsal fracture',
  'Muscle fatigue breakdown', 'Concussion',
];

const TROPHY_ICON = {
  continental: '🏆',
  league: '🏆',
  cup: '🥈',
};
