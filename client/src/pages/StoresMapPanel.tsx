import { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { StoreLocation } from '../types/store';

type StoresMapPanelProps = {
  stores: StoreLocation[];
  selectedStoreId: number | null;
  onSelectStore: (storeId: number | null) => void;
};

const defaultPereira: [number, number] = [4.8133, -75.6961];

const storeIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function MapViewportController({
  stores,
  selectedStoreId,
}: {
  stores: StoreLocation[];
  selectedStoreId: number | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (stores.length >= 2) {
      const bounds = L.latLngBounds(stores.map((store) => store.position));
      map.fitBounds(bounds, { padding: [56, 56] });
      return;
    }

    if (stores.length === 1) {
      map.setView(stores[0].position, 15);
    }
  }, [map, stores]);

  useEffect(() => {
    if (selectedStoreId == null) {
      return;
    }
    const selected = stores.find((store) => store.id === selectedStoreId);
    if (!selected) {
      return;
    }
    map.setView(selected.position, 15, { animate: true });
  }, [map, selectedStoreId, stores]);

  return null;
}

function StoresMapPanel({ stores, selectedStoreId, onSelectStore }: StoresMapPanelProps) {
  const mapRef = useRef<L.Map | null>(null);
  const validStores = useMemo(() => stores, [stores]);

  const center = useMemo(() => {
    if (validStores.length === 0) {
      return defaultPereira;
    }
    const lat = validStores.reduce((acc, s) => acc + s.position[0], 0) / validStores.length;
    const lng = validStores.reduce((acc, s) => acc + s.position[1], 0) / validStores.length;
    return [lat, lng] as [number, number];
  }, [validStores]);

  if (validStores.length === 0) {
    return (
      <div className="flex min-h-105 items-center justify-center rounded-xl border border-border bg-bg-secondary px-4 text-center text-sm text-text-muted">
        No hay tiendas con ubicación para mostrar en el mapa.
      </div>
    );
  }

  return (
    <MapContainer
      center={center}
      zoom={12}
      className="stores-map relative z-0"
      style={{ width: '100%', height: '100%', minHeight: '420px', borderRadius: '0.75rem' }}
      ref={mapRef}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
      />
      <MapViewportController stores={validStores} selectedStoreId={selectedStoreId} />
      {validStores.map((store) => (
        <Marker key={store.id} position={store.position} icon={storeIcon} eventHandlers={{ click: () => onSelectStore(store.id) }}>
          <Popup>
            <div className="max-w-55 px-1 py-0.5 text-gray-900">
              <p className="font-semibold leading-tight">{store.name}</p>
              <p className="mt-1 text-xs leading-snug text-gray-700">{store.description}</p>
              <p className="mt-1 text-xs text-gray-600">Estado: {store.status}</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

export default StoresMapPanel;
