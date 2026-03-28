export type RoastLevel = 'light' | 'medium-light' | 'medium' | 'medium-dark' | 'dark';

export interface BeanEntry {
  id: string;
  name: string;
  origin: string | null;
  roastLevel: RoastLevel | null;
  roastedAt: string | null;       // ISO date "YYYY-MM-DD"
  flavorNotes: string[];
  bagWeightGrams: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BeanEntryPayload {
  name: string;
  origin: string | null;
  roastLevel: RoastLevel | null;
  roastedAt: string | null;
  flavorNotes: string[];
  bagWeightGrams: number | null;
  notes: string | null;
}
