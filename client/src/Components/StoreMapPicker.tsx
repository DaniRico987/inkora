import { useEffect, useMemo, useReducer, useRef } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { geocodeAddress, getAddressSuggestions } from '../services/geocodingService';

type Coordinates = {
  latitude: number;
  longitude: number;
};

type PickerStatus = 'idle' | 'loading' | 'ready' | 'error';

type PickerState = {
  status: PickerStatus;
  message: string;
  suggestions: string[];
};

type PickerAction =
  | { type: 'reset'; message: string }
  | { type: 'loading'; message: string }
  | { type: 'ready'; message: string; suggestions?: string[] }
  | { type: 'error'; message: string; suggestions?: string[] };

const initialPickerState: PickerState = {
  status: 'idle',
  message: 'Selecciona primero la ciudad para restringir la búsqueda.',
  suggestions: [],
};

function pickerReducer(state: PickerState, action: PickerAction): PickerState {
  switch (action.type) {
    case 'reset':
      return { status: 'idle', message: action.message, suggestions: [] };
    case 'loading':
      return { ...state, status: 'loading', message: action.message, suggestions: [] };
    case 'ready':
      return { status: 'ready', message: action.message, suggestions: action.suggestions ?? [] };
    case 'error':
      return { status: 'error', message: action.message, suggestions: action.suggestions ?? [] };
    default:
      return state;
  }
}

export interface StoreMapPickerProps {
  address: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  onCoordinatesChange: (coordinates: Coordinates | null) => void;
}

const DEFAULT_CENTER: [number, number] = [4.8133, -75.6961];

const storeIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function MapViewportController({ position }: { position: [number, number] | null }) {
  const map = useMap();

  useEffect(() => {
    const animationFrame = window.requestAnimationFrame(() => {
      map.invalidateSize();

      if (position) {
        map.setView(position, 16, { animate: true });
      }
    });

    return () => {
      window.cancelAnimationFrame(animationFrame);
    };
  }, [map, position]);

  return null;
}

function DraggableMarker({
  position,
  onDragEnd,
}: {
  position: [number, number];
  onDragEnd: (coordinates: Coordinates) => void;
}) {
  const markerRef = useRef<L.Marker | null>(null);

  return (
    <Marker
      ref={markerRef}
      position={position}
      draggable
      icon={storeIcon}
      eventHandlers={{
        dragend: () => {
          const marker = markerRef.current;
          if (!marker) {
            return;
          }

          const nextPosition = marker.getLatLng();
          onDragEnd({
            latitude: nextPosition.lat,
            longitude: nextPosition.lng,
          });
        },
      }}
    />
  );
}

export function StoreMapPicker({
  address,
  city,
  latitude,
  longitude,
  onCoordinatesChange,
}: StoreMapPickerProps) {
  const [state, dispatch] = useReducer(pickerReducer, initialPickerState);
  const onCoordinatesChangeRef = useRef(onCoordinatesChange);
  const currentCoordinatesRef = useRef<Coordinates | null>(
    latitude != null && longitude != null ? { latitude, longitude } : null,
  );

  const position = useMemo(() => {
    if (latitude != null && longitude != null) {
      return [latitude, longitude] as [number, number];
    }

    return null;
  }, [latitude, longitude]);

  const cleanAddress = address.trim();
  const cleanCity = city.trim();
  const query = useMemo(() => [cleanAddress, cleanCity].filter(Boolean).join(', '), [cleanAddress, cleanCity]);

  useEffect(() => {
    onCoordinatesChangeRef.current = onCoordinatesChange;
  }, [onCoordinatesChange]);

  useEffect(() => {
    currentCoordinatesRef.current = position
      ? { latitude: position[0], longitude: position[1] }
      : null;
  }, [position]);

  useEffect(() => {
    if (!cleanCity) {
      dispatch({ type: 'reset', message: 'Selecciona primero la ciudad para restringir la búsqueda.' });
      onCoordinatesChangeRef.current(null);
      return;
    }

    if (!cleanAddress) {
      dispatch({ type: 'reset', message: 'Ahora ingresa la dirección dentro de la ciudad seleccionada.' });
      onCoordinatesChangeRef.current(null);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      dispatch({ type: 'loading', message: 'Buscando la ubicación en Nominatim…' });

      try {
        const result = await geocodeAddress(address, city, { signal: controller.signal });

        if (controller.signal.aborted) {
          return;
        }

        if (!result) {
          const addressSuggestions = await getAddressSuggestions(address, city, { signal: controller.signal });
          const suggestionLabels = addressSuggestions.map((suggestion) => suggestion.label);
          dispatch({
            type: 'error',
            message:
              suggestionLabels.length > 0
                ? `No encontramos coincidencias. Quizá querías: ${suggestionLabels.slice(0, 3).join(' · ')}`
                : 'No encontramos coincidencias para esa dirección.',
            suggestions: suggestionLabels,
          });
          onCoordinatesChangeRef.current(null);
          return;
        }

        const nextCoordinates = {
          latitude: result.latitude,
          longitude: result.longitude,
        };
        const currentCoordinates = currentCoordinatesRef.current;
        const hasChanged =
          !currentCoordinates ||
          currentCoordinates.latitude !== nextCoordinates.latitude ||
          currentCoordinates.longitude !== nextCoordinates.longitude;

        dispatch({
          type: 'ready',
          message: result.label
            ? `Coincidencia encontrada: ${result.label}`
            : 'Ubicación encontrada correctamente.',
          suggestions: [],
        });

        if (hasChanged) {
          onCoordinatesChangeRef.current(nextCoordinates);
        }
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        dispatch({
          type: 'error',
          message:
            error instanceof Error
              ? error.message
              : 'No se pudo consultar Nominatim para esta dirección.',
          suggestions: [],
        });
        onCoordinatesChangeRef.current(null);
      }
    }, 550);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [address, cleanAddress, cleanCity, city]);

  return (
    <section className="space-y-3 rounded-3xl border border-border bg-bg-secondary p-4 shadow-sm">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-text">Vista previa geográfica</p>
          <p className="text-xs text-text-muted">
            Arrastra el marcador para ajustar latitud y longitud sin modificar la dirección.
          </p>
        </div>

        <a
          href={query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : 'https://www.google.com/maps'}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center rounded-full border border-border bg-bg px-3 py-2 text-xs font-semibold text-text transition hover:border-babyblue-300 hover:text-babyblue-700"
        >
          Abrir en Google Maps
        </a>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-bg">
        <MapContainer
          center={position ?? DEFAULT_CENTER}
          zoom={position ? 16 : 6}
          scrollWheelZoom={false}
          className="store-map-picker"
          style={{ minHeight: '320px', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
          <MapViewportController position={position} />
          {position && (
            <DraggableMarker
              position={position}
              onDragEnd={(coordinates) => {
                onCoordinatesChangeRef.current(coordinates);
                dispatch({ type: 'ready', message: 'Ubicación ajustada manualmente.', suggestions: [] });
              }}
            />
          )}
        </MapContainer>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-bg px-4 py-3 text-sm text-text-muted">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">Estado</p>
          <p className={['mt-1 font-medium', state.status === 'error' ? 'text-danger-700' : 'text-text'].join(' ')}>
            {state.message}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-bg px-4 py-3 text-sm text-text-muted">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">Coordenadas</p>
          <p className="mt-1 font-medium text-text">
            {position ? `${position[0].toFixed(6)}, ${position[1].toFixed(6)}` : 'Sin coordenadas'}
          </p>
        </div>
      </div>

      {state.suggestions.length > 0 && (
        <div className="space-y-2 rounded-2xl border border-border bg-bg px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">Sugerencias</p>
          <div className="flex flex-wrap gap-2">
            {state.suggestions.slice(0, 5).map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={async () => {
                  dispatch({ type: 'loading', message: 'Ajustando coordenadas con la sugerencia seleccionada…' });

                  try {
                    const result = await geocodeAddress(suggestion, city);

                    if (!result) {
                      dispatch({ type: 'error', message: 'No pudimos ajustar las coordenadas con esa sugerencia.', suggestions: [] });
                      return;
                    }

                    const nextCoordinates = {
                      latitude: result.latitude,
                      longitude: result.longitude,
                    };

                    onCoordinatesChangeRef.current(nextCoordinates);
                    currentCoordinatesRef.current = nextCoordinates;
                    dispatch({
                      type: 'ready',
                      message: result.label ? `Coincidencia encontrada: ${result.label}` : 'Ubicación ajustada correctamente.',
                      suggestions: [],
                    });
                  } catch (error) {
                    dispatch({
                      type: 'error',
                      message: error instanceof Error ? error.message : 'No se pudo consultar la sugerencia seleccionada.',
                      suggestions: [],
                    });
                  }
                }}
                className="rounded-full border border-border bg-bg-secondary px-3 py-1.5 text-xs font-medium text-text transition hover:border-babyblue-300 hover:text-babyblue-700"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
