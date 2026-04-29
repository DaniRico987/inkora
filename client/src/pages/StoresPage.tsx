import { lazy, Suspense, useEffect, useState } from 'react';
import { getPublicStores } from '../api/stores';
import { mapPublicStoresToLocations } from '../data/stores';
import type { StoreLocation } from '../types/store';

const StoresMapPanel = lazy(() => import('./StoresMapPanel'));

export function StoresPage() {
  const [stores, setStores] = useState<StoreLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);

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
        const normalizedStores = mapPublicStoresToLocations(Array.isArray(data) ? data : []);
        setStores(normalizedStores);
      } catch (e) {
        if (!mounted) {
          return;
        }
        const message = e instanceof Error ? e.message : 'Error al cargar las tiendas';
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

  if (loading) {
    return (
      <div className="w-full max-w-7xl px-4 py-8 text-center text-babyblue-50/90">
        Cargando tiendas…
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-7xl px-4 py-8 text-center text-red-300">
        {error}
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl px-4 py-6">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-babyblue-50">
        Tiendas INKORA
      </h1>
      <p className="mb-6 text-sm text-babyblue-50/75">Pereira — ubicaciones y contacto</p>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch">
        <aside className="order-2 w-full shrink-0 lg:order-1 lg:w-[min(100%,320px)]">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-metallicgold-100/90">
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
                      setSelectedStoreId((prev) => (prev === store.id ? null : store.id))
                    }
                    className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${
                      isSelected
                        ? 'border-metallicgold-100/60 bg-white/12'
                        : 'border-white/15 bg-white/5 hover:border-white/25 hover:bg-white/8'
                    }`}
                  >
                    <p className="font-medium text-babyblue-50">{store.name}</p>
                    <p className="mt-1 text-sm text-babyblue-50/80">{store.address}</p>
                    <p className="mt-2 text-xs text-metallicgold-100/90">{store.status}</p>
                  </button>
                </li>
              );
            })}
          </ul>
          {stores.length === 0 && (
            <p className="text-sm text-babyblue-50/70">No hay tiendas registradas.</p>
          )}
        </aside>

        <div className="order-1 min-h-[420px] min-w-0 flex-1 lg:order-2">
          <Suspense
            fallback={
              <div className="flex min-h-[420px] items-center justify-center rounded-xl border border-white/15 bg-white/5 text-babyblue-50/80">
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
