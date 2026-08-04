export interface SponsorSeed {
  id: string;
  name: string;
  tier: 'boot' | 'apparel' | 'lifestyle' | 'endorsement';
  requiredReputation: number;
  baseWeeklyIncome: number;
}

export const sponsorPool: SponsorSeed[] = [
  { id: 'volt', name: 'Volt Sport', tier: 'boot', requiredReputation: 0, baseWeeklyIncome: 400 },
  { id: 'triform', name: 'Triform', tier: 'boot', requiredReputation: 20, baseWeeklyIncome: 1200 },
  { id: 'apex', name: 'Apex Athletics', tier: 'boot', requiredReputation: 45, baseWeeklyIncome: 4500 },
  { id: 'zenova', name: 'Zenova', tier: 'boot', requiredReputation: 70, baseWeeklyIncome: 15000 },
  { id: 'urbanwear', name: 'UrbanWear', tier: 'apparel', requiredReputation: 15, baseWeeklyIncome: 900 },
  { id: 'stridex', name: 'StrideX', tier: 'apparel', requiredReputation: 40, baseWeeklyIncome: 3800 },
  { id: 'lumen', name: 'Lumen Watches', tier: 'lifestyle', requiredReputation: 35, baseWeeklyIncome: 2500 },
  { id: 'aurea', name: 'Aurea Jewellery', tier: 'lifestyle', requiredReputation: 55, baseWeeklyIncome: 6000 },
  { id: 'nitro', name: 'Nitro Energy', tier: 'lifestyle', requiredReputation: 30, baseWeeklyIncome: 2000 },
  { id: 'pulse', name: 'Pulse Mobile', tier: 'endorsement', requiredReputation: 50, baseWeeklyIncome: 5000 },
  { id: 'skyline', name: 'Skyline Airlines', tier: 'endorsement', requiredReputation: 65, baseWeeklyIncome: 9000 },
  { id: 'orbit', name: 'Orbit Gaming', tier: 'endorsement', requiredReputation: 25, baseWeeklyIncome: 1500 },
];
