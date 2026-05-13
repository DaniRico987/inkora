import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { geocodeAddress, getAddressSuggestions } from '../services/geocodingService';

type Coordinates = {
    latitude: number;
    longitude: number;
};

export interface StoreMapPickerProps {
    address: string;
    city: string;
    latitude: number | null;
    longitude: number | null;
    onCoordinatesChange: (coordinates: Coordinates | null) => void;
    onSuggestionPick?: (value: string) => void;
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
    onSuggestionPick,
}: StoreMapPickerProps) {
    const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
    const [message, setMessage] = useState('Escribe una dirección para obtener coordenadas.');
    const [suggestions, setSuggestions] = useState<string[]>([]);
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

    const query = useMemo(() => {
        const cleanAddress = address.trim();
        const cleanCity = city.trim();
        return [cleanAddress, cleanCity].filter(Boolean).join(', ');
    }, [address, city]);

    useEffect(() => {
        onCoordinatesChangeRef.current = onCoordinatesChange;
    }, [onCoordinatesChange]);

    useEffect(() => {
        currentCoordinatesRef.current = position
            ? { latitude: position[0], longitude: position[1] }
            : null;
    }, [position]);

    useEffect(() => {
        if (!query) {
            setStatus('idle');
            setMessage('Escribe una dirección para obtener coordenadas.');
            setSuggestions([]);
            onCoordinatesChangeRef.current(null);
            return;
        }

        const controller = new AbortController();
        const timeoutId = window.setTimeout(async () => {
            setStatus('loading');
            setMessage('Buscando la ubicación en Photon…');

            try {
                const result = await geocodeAddress(address, city, { signal: controller.signal });

                if (controller.signal.aborted) {
                    return;
                }

                if (!result) {
                    setStatus('error');
                    const addressSuggestions = await getAddressSuggestions(address, city, { signal: controller.signal });
                    const suggestionLabels = addressSuggestions.map((suggestion) => suggestion.label);
                    setSuggestions(suggestionLabels);
                    setMessage(
                        suggestionLabels.length > 0
                            ? `No encontramos coincidencias. Quizá querías: ${suggestionLabels.slice(0, 3).join(' · ')}`
                            : 'No encontramos coincidencias para esa dirección.',
                    );
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

                setStatus('ready');
                setSuggestions([]);
                setMessage(
                    result.label
                        ? `Coincidencia encontrada: ${result.label}`
                        : 'Ubicación encontrada correctamente.',
                );

                if (hasChanged) {
                    onCoordinatesChangeRef.current(nextCoordinates);
                }
            } catch (error) {
                if (controller.signal.aborted) {
                    return;
                }

                setStatus('error');
                setSuggestions([]);
                setMessage(
                    error instanceof Error
                        ? error.message
                        : 'No se pudo consultar Photon para esta dirección.',
                );
                onCoordinatesChangeRef.current(null);
            }
        }, 550);

        return () => {
            controller.abort();
            window.clearTimeout(timeoutId);
        };
    }, [address, city, query]);

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
                                setStatus('ready');
                                setMessage('Ubicación ajustada manualmente.');
                            }}
                        />
                    )}
                </MapContainer>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-border bg-bg px-4 py-3 text-sm text-text-muted">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                        Estado
                    </p>
                    <p className={['mt-1 font-medium', status === 'error' ? 'text-danger-700' : 'text-text'].join(' ')}>
                        {message}
                    </p>
                </div>
                <div className="rounded-2xl border border-border bg-bg px-4 py-3 text-sm text-text-muted">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                        Coordenadas
                    </p>
                    <p className="mt-1 font-medium text-text">
                        {position ? `${position[0].toFixed(6)}, ${position[1].toFixed(6)}` : 'Sin coordenadas'}
                    </p>
                </div>
            </div>

            {suggestions.length > 0 && (
                <div className="space-y-2 rounded-2xl border border-border bg-bg px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                        Sugerencias
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {suggestions.slice(0, 5).map((suggestion) => (
                            <button
                                key={suggestion}
                                type="button"
                                onClick={() => {
                                    onSuggestionPick?.(suggestion);
                                    setSuggestions([]);
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