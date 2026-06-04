import { lazy, Suspense, useEffect, useState } from 'react';
import { getNearestStores, getPublicStores } from '../api/stores';
import { mapPublicStoresToLocations } from '../data/stores';
import type { StoreLocation } from '../types/store';
import type { NearestStore } from '../api/stores';

const StoresMapPanel = lazy(() => import('./StoresMapPanel'));

export function StoresPage() {
  const [stores, setStores] = useState<StoreLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
  const [nearestStore, setNearestStore] = useState<NearestStore | null>(null);
  const [nearestLoading, setNearestLoading] = useState(false);
  const [nearestError, setNearestError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await getPublicStores();
        if (!mounted) {
          return;
        }
        const normalizedStores = mapPublicStoresToLocations(
          Array.isArray(data) ? data : [],
        );
        setStores(normalizedStores);
      } catch (e) {
        if (!mounted) {
          return;
        }
        const message =
          e instanceof Error ? e.message : 'Error al cargar las tiendas';
        setError(message);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const handleFindNearestStore = () => {
    if (!navigator.geolocation) {
      setNearestError('Tu navegador no soporta geolocalización.');
      return;
    }

    setNearestLoading(true);
    setNearestError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const results = await getNearestStores(
            position.coords.latitude,
            position.coords.longitude,
          );
          const nearest = results[0] ?? null;

          if (!nearest) {
            setNearestStore(null);
            setNearestError('No encontramos tiendas activas con coordenadas válidas.');
            return;
          }

          setNearestStore(nearest);
          setSelectedStoreId(nearest.storeId);
        } catch (requestError) {
          setNearestError(
            requestError instanceof Error
              ? requestError.message
              : 'No se pudo calcular la tienda más cercana.',
          );
        } finally {
          setNearestLoading(false);
        }
      },
      () => {
        setNearestLoading(false);
        setNearestError('Necesitamos permiso de ubicación para calcular la tienda más cercana.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  };

  if (loading) {
    return (
      <div className="w-full max-w-7xl px-4 py-8 text-center text-text-muted">
        Cargando tiendas…
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-7xl px-4 py-8 text-center text-danger-500">
        {error}
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl px-4 py-6">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-text">
        Tiendas INKORA
      </h1>
      <p className="mb-6 text-sm text-text-muted">
        Pereira — ubicaciones y contacto
      </p>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleFindNearestStore}
          disabled={nearestLoading}
          className="inline-flex items-center justify-center rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {nearestLoading ? 'Calculando…' : 'Tienda más cercana'}
        </button>
        {nearestStore && (
          <p className="text-sm text-text-muted">
            Más cercana: <span className="font-semibold text-text">{nearestStore.name}</span>{' '}
            · {nearestStore.address} · {nearestStore.distanceKm.toFixed(2)} km
          </p>
        )}
      </div>

      {nearestError && (
        <p className="mb-4 rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
          {nearestError}
        </p>
      )}

      <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch">
        <aside className="order-2 w-full shrink-0 lg:order-1 lg:w-[min(100%,320px)]">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-text-muted">
            Sedes
          </h2>
          <ul className="flex flex-col gap-3">
            {stores.map((store) => {
              const isSelected = selectedStoreId === store.id;
              return (
                <li key={store.id}>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedStoreId((prev) =>
                        prev === store.id ? null : store.id,
                      )
                    }
                    className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${
                      isSelected
                        ? 'border-primary-400 bg-primary-50/80'
                        : 'border-border bg-bg-secondary hover:border-primary-300 hover:bg-primary-50/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-text">{store.name}</p>
                        <p className="mt-1 text-sm text-text-muted">{store.address}</p>
                        <p className="mt-2 text-xs text-label">{store.status}</p>
                      </div>
                      {nearestStore?.storeId === store.id && (
                        <span className="rounded-full bg-primary-100 px-2 py-1 text-[11px] font-semibold text-primary-700">
                          Más cercana
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
          {stores.length === 0 && (
            <p className="text-sm text-text-muted">
              No hay tiendas registradas.
            </p>
          )}
        </aside>

        <div className="order-1 min-h-105 min-w-0 flex-1 lg:order-2">
          <Suspense
            fallback={
              <div className="flex min-h-105 items-center justify-center rounded-xl border border-border bg-bg-secondary text-text-muted">
                Preparando mapa…
              </div>
            }
          >
            <StoresMapPanel
              stores={stores}
              selectedStoreId={selectedStoreId}
              onSelectStore={setSelectedStoreId}
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
