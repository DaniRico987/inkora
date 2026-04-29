import type { PublicStore } from '../api/stores';
import type { StoreLocation } from '../types/store';

export function mapPublicStoresToLocations(stores: PublicStore[]): StoreLocation[] {
  return stores
    .filter(
      (store) =>
        store.latitude != null &&
        store.longitude != null &&
        Number.isFinite(Number(store.latitude)) &&
        Number.isFinite(Number(store.longitude)),
    )
    .map((store) => ({
      id: store.storeId,
      name: store.name,
      address: store.address,
      city: store.city,
      position: [Number(store.latitude), Number(store.longitude)],
      description: `${store.address}, ${store.city}`,
      status: 'Activa',
    }));
}
