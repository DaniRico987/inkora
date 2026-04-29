export type StoreStatusLabel = 'Activa' | 'Inactiva';

export interface StoreLocation {
  id: number;
  name: string;
  address: string;
  city: string;
  position: [number, number];
  description: string;
  status: StoreStatusLabel;
}
