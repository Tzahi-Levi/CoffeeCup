export interface BrewLog {
  id: string;
  coffeeId: string;
  rating: number;           // 1–5
  doseGrams: number;
  grindLevel: number;
  brewTimeSeconds: number;
  yieldGrams: number | null;
  notes: string | null;
  createdAt: string;        // ISO 8601
}

export interface BrewLogPayload {
  rating: number;
  doseGrams: number;
  grindLevel: number;
  brewTimeSeconds: number;
  yieldGrams: number | null;
  notes: string | null;
}
