import { useCallback, useEffect, useMemo, useRef, type CSSProperties } from 'react';
import { GoogleMap, InfoWindow, Marker, useJsApiLoader } from '@react-google-maps/api';
import type { PublicStore } from '../api/stores';

const mapContainerStyle: CSSProperties = {
  width: '100%',
  height: '100%',
  minHeight: '420px',
  borderRadius: '0.75rem',
};

type StoresMapPanelProps = {
  stores: PublicStore[];
  selectedStoreId: number | null;
  onSelectStore: (storeId: number | null) => void;
};

const defaultPereira = { lat: 4.8133, lng: -75.6961 };

function StoresMapPanel({ stores, selectedStoreId, onSelectStore }: StoresMapPanelProps) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'inkora-google-maps',
    googleMapsApiKey: apiKey ?? '',
  });

  const validStores = useMemo(
    () =>
      stores.filter(
        (s) =>
          s.latitude != null &&
          s.longitude != null &&
          Number.isFinite(Number(s.latitude)) &&
          Number.isFinite(Number(s.longitude)),
      ),
    [stores],
  );

  const center = useMemo(() => {
    if (validStores.length === 0) {
      return defaultPereira;
    }
    const lat =
      validStores.reduce((acc, s) => acc + Number(s.latitude), 0) / validStores.length;
    const lng =
      validStores.reduce((acc, s) => acc + Number(s.longitude), 0) / validStores.length;
    return { lat, lng };
  }, [validStores]);

  const onMapLoad = useCallback(
    (map: google.maps.Map) => {
      mapRef.current = map;
      if (validStores.length >= 2) {
        const bounds = new google.maps.LatLngBounds();
        validStores.forEach((s) => {
          bounds.extend({
            lat: Number(s.latitude),
            lng: Number(s.longitude),
          });
        });
        map.fitBounds(bounds, 56);
      } else if (validStores.length === 1) {
        const s = validStores[0];
        map.panTo({ lat: Number(s.latitude), lng: Number(s.longitude) });
        map.setZoom(15);
      }
    },
    [validStores],
  );

  useEffect(() => {
    const map = mapRef.current;
    if (!map || selectedStoreId == null) {
      return;
    }
    const s = validStores.find((x) => x.storeId === selectedStoreId);
    if (!s) {
      return;
    }
    map.panTo({ lat: Number(s.latitude), lng: Number(s.longitude) });
    map.setZoom(15);
  }, [selectedStoreId, validStores]);

  if (!apiKey) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-xl border border-white/20 bg-white/5 px-4 text-center text-sm text-babyblue-50/90">
        Falta la variable de entorno VITE_GOOGLE_MAPS_API_KEY. Creá client/.env.local con tu clave
        de Google Maps (Maps JavaScript API).
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-xl border border-red-400/40 bg-red-950/20 px-4 text-center text-sm text-red-200">
        No se pudo cargar Google Maps. Revisá la clave y la facturación del proyecto en Google
        Cloud.
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-xl border border-white/15 bg-white/5 text-babyblue-50/80">
        Cargando mapa…
      </div>
    );
  }

  if (validStores.length === 0) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 text-center text-sm text-babyblue-50/80">
        No hay tiendas con ubicación para mostrar en el mapa.
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={center}
      zoom={12}
      onLoad={onMapLoad}
      options={{
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: true,
      }}
    >
      {validStores.map((store) => (
        <Marker
          key={store.storeId}
          position={{
            lat: Number(store.latitude),
            lng: Number(store.longitude),
          }}
          onClick={() => onSelectStore(store.storeId)}
        >
          {selectedStoreId === store.storeId && (
            <InfoWindow onCloseClick={() => onSelectStore(null)}>
              <div className="max-w-[220px] px-1 py-0.5 text-gray-900">
                <p className="font-semibold leading-tight">{store.name}</p>
                <p className="mt-1 text-xs leading-snug text-gray-700">{store.address}</p>
                <p className="mt-0.5 text-xs text-gray-600">{store.city}</p>
              </div>
            </InfoWindow>
          )}
        </Marker>
      ))}
    </GoogleMap>
  );
}

export default StoresMapPanel;
