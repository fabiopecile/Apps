export interface PropertySeed {
  id: string;
  name: string;
  tier: 'apartment' | 'house' | 'mansion' | 'estate';
  price: number;
  happiness: number;
}

export const properties: PropertySeed[] = [
  { id: 'flat', name: 'City Apartment', tier: 'apartment', price: 180_000, happiness: 6 },
  { id: 'townhouse', name: 'Townhouse', tier: 'house', price: 650_000, happiness: 10 },
  { id: 'suburbhouse', name: 'Suburban Villa', tier: 'house', price: 1_400_000, happiness: 14 },
  { id: 'mansion', name: 'Hillside Mansion', tier: 'mansion', price: 6_500_000, happiness: 20 },
  { id: 'estate', name: 'Countryside Estate', tier: 'estate', price: 18_000_000, happiness: 26 },
];

export interface CarSeed {
  id: string;
  name: string;
  tier: 'city' | 'sport' | 'super' | 'hyper';
  price: number;
  happiness: number;
}

export const cars: CarSeed[] = [
  { id: 'city_car', name: 'Compact City Car', tier: 'city', price: 25_000, happiness: 3 },
  { id: 'sport_coupe', name: 'Sport Coupe', tier: 'sport', price: 120_000, happiness: 7 },
  { id: 'super_car', name: 'Supercar', tier: 'super', price: 450_000, happiness: 12 },
  { id: 'hyper_car', name: 'Hypercar', tier: 'hyper', price: 1_800_000, happiness: 18 },
];

export interface WatchSeed {
  id: string;
  name: string;
  price: number;
  happiness: number;
}

export const watches: WatchSeed[] = [
  { id: 'steel_watch', name: 'Steel Chronograph', price: 8_000, happiness: 2 },
  { id: 'gold_watch', name: 'Gold Automatic', price: 45_000, happiness: 5 },
  { id: 'diamond_watch', name: 'Diamond Edition', price: 220_000, happiness: 9 },
];

export interface PetSeed {
  id: string;
  name: string;
  price: number;
  happiness: number;
}

export const pets: PetSeed[] = [
  { id: 'dog', name: 'Dog', price: 2_000, happiness: 8 },
  { id: 'cat', name: 'Cat', price: 1_500, happiness: 6 },
  { id: 'exotic', name: 'Exotic Bird', price: 5_000, happiness: 5 },
];

export interface InvestmentSeed {
  id: string;
  name: string;
  type: 'real_estate' | 'stocks' | 'company' | 'startup' | 'restaurant' | 'academy';
  minInvest: number;
  weeklyReturnPct: number; // percent of invested per week
  risk: 'low' | 'medium' | 'high';
}

export const investmentOptions: InvestmentSeed[] = [
  { id: 'reit', name: 'Rental Apartments', type: 'real_estate', minInvest: 50_000, weeklyReturnPct: 0.12, risk: 'low' },
  { id: 'stocks', name: 'Stock Portfolio', type: 'stocks', minInvest: 20_000, weeklyReturnPct: 0.15, risk: 'medium' },
  { id: 'restaurant', name: 'Restaurant Chain', type: 'restaurant', minInvest: 150_000, weeklyReturnPct: 0.18, risk: 'medium' },
  { id: 'academy', name: 'Football Academy', type: 'academy', minInvest: 400_000, weeklyReturnPct: 0.16, risk: 'low' },
  { id: 'startup', name: 'Tech Startup', type: 'startup', minInvest: 100_000, weeklyReturnPct: 0.35, risk: 'high' },
  { id: 'company', name: 'Own Apparel Brand', type: 'company', minInvest: 800_000, weeklyReturnPct: 0.22, risk: 'medium' },
];
