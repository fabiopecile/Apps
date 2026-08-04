export const firstNames = [
  'Lucas', 'Mateo', 'Noah', 'Liam', 'Elias', 'Diego', 'Marco', 'Luca', 'Kai',
  'Finn', 'Leon', 'Tom', 'Jonas', 'Milan', 'Rafael', 'Bruno', 'Andre', 'Theo',
  'Nico', 'Mika', 'Adam', 'Omar', 'Youssef', 'Karim', 'Sami', 'Malik', 'Amir',
  'Kofi', 'Jayden', 'Marcus', 'Tyrone', 'Andres', 'Gabriel', 'Santiago', 'Ivan',
  'Erik', 'Viktor', 'Stefan', 'Pawel', 'Dario', 'Hugo', 'Enzo', 'Ali', 'Hassan',
  'Jamal', 'Kenji', 'Ren', 'Hiro', 'Minjun', 'Jin', 'Connor', 'Callum',
];

export const lastNames = [
  'Silva', 'Fernandes', 'Costa', 'Rossi', 'Bianchi', 'Weber', 'Müller',
  'Schmidt', 'Novak', 'Kowalski', 'Dubois', 'Moreau', 'Bernard', 'Almeida',
  'Santos', 'Pereira', 'Garcia', 'Martinez', 'Lopez', 'Hernandez', 'Ivanov',
  'Petrov', 'Andersson', 'Nilsson', 'Larsen', 'Hansen', 'Okafor', 'Mensah',
  'Diallo', 'Toure', 'Traore', 'Haddad', 'Farouk', 'Amara', 'Tanaka', 'Sato',
  'Kim', 'Park', 'Walker', 'Bennett', 'Foster', 'Reyes', 'Cruz', 'Molina',
  'Keller', 'Brandt', 'Kaiser', 'Vogel', 'Marchetti', 'Ferrari',
];

export const teammateFirstNames = firstNames;
export const teammateLastNames = lastNames;

export function randomFullName(): { first: string; last: string } {
  const first = firstNames[Math.floor(Math.random() * firstNames.length)];
  const last = lastNames[Math.floor(Math.random() * lastNames.length)];
  return { first, last };
}
