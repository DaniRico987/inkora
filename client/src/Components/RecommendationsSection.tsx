import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import ItemCard from './ItemCard';
import { Spinner } from './Spinner';
import {
  getRecommendations,
  type RecommendationStrategy,
} from '../api/recommendations';
import { getRoleFromToken, isAuthenticated } from '../auth/session';
import { useRecommendationRefreshListener } from '../hooks/useRecommendationRefreshListener';

function formatPrice(value: number): string {
  return value.toLocaleString('es-CO');
}

function getStrategyLabel(strategy: RecommendationStrategy): string {
  if (strategy === 'history') return 'Basado en tu historial';
  if (strategy === 'bot') return 'Bot de recomendaciones';
  return 'Más populares';
}

function RecommendationSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-bg-secondary shadow-sm">
      <div className="h-44 animate-pulse bg-babyblue-200/20" />
      <div className="space-y-3 p-5">
        <div className="h-5 w-3/4 animate-pulse rounded-full bg-text-muted/15" />
        <div className="h-4 w-1/2 animate-pulse rounded-full bg-text-muted/15" />
        <div className="h-4 w-24 animate-pulse rounded-full bg-text-muted/15" />
      </div>
    </div>
  );
}

export function RecommendationsSection() {
  useRecommendationRefreshListener();

  const role = getRoleFromToken();
  const canShowRecommendations = isAuthenticated() && role === 'client';

  const recommendationsQuery = useQuery({
    queryKey: ['recommendations'],
    queryFn: getRecommendations,
    enabled: canShowRecommendations,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  if (!canShowRecommendations) {
    return (
      <section className="mt-16 lg:mt-20">
        <div className="rounded-3xl border border-border bg-bg-secondary p-6 shadow-sm sm:p-8">
          <p className="text-[0.85rem] font-black uppercase tracking-[0.22em] text-babyblue-600 mb-3">
            Recomendados para ti
          </p>
          <h2 className="text-3xl sm:text-4xl font-black text-text mb-3">
            Inicia sesión para ver sugerencias personalizadas
          </h2>
          <p className="max-w-3xl text-base leading-relaxed text-text-muted mb-6">
            Inkora ajusta estas recomendaciones según tus compras y búsquedas
            recientes. Al entrar a tu cuenta, el home se actualiza con libros
            pensados para ti.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/login"
              className="inline-flex items-center justify-center rounded-lg bg-primary-600 px-6 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-primary-500"
            >
              Iniciar sesión
            </Link>
            <Link
              to="/catalog"
              className="inline-flex items-center justify-center rounded-lg border border-babyblue-400/60 bg-transparent px-6 py-3 text-sm font-bold text-babyblue-700 transition hover:-translate-y-0.5 hover:bg-babyblue-300/10"
            >
              Ir al catálogo
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (recommendationsQuery.isLoading) {
    return (
      <section className="mt-16 lg:mt-20">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-[0.85rem] font-black uppercase tracking-[0.22em] text-babyblue-600 mb-3">
              Recomendados para ti
            </p>
            <h2 className="text-3xl sm:text-4xl font-black text-text">
              Estamos armando tu estantería
            </h2>
          </div>
          <Spinner size="sm" tone="calm" label="Cargando recomendaciones..." />
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <RecommendationSkeleton key={index} />
          ))}
        </div>
      </section>
    );
  }

  if (recommendationsQuery.isError) {
    return (
      <section className="mt-16 lg:mt-20">
        <div className="rounded-3xl border border-danger-300/50 bg-bg-secondary p-6 shadow-sm sm:p-8">
          <p className="text-[0.85rem] font-black uppercase tracking-[0.22em] text-danger-600 mb-3">
            Recomendados para ti
          </p>
          <h2 className="text-3xl sm:text-4xl font-black text-text mb-3">
            No pudimos cargar tus recomendaciones
          </h2>
          <p className="max-w-3xl text-base leading-relaxed text-text-muted mb-6">
            Intenta de nuevo en unos segundos. Mientras tanto, puedes seguir
            navegando por el catálogo general.
          </p>
          <button
            type="button"
            onClick={() => void recommendationsQuery.refetch()}
            className="inline-flex items-center justify-center rounded-lg bg-primary-600 px-6 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-primary-500"
          >
            Reintentar
          </button>
        </div>
      </section>
    );
  }

  const strategy = recommendationsQuery.data?.strategy ?? 'popular';
  const items = recommendationsQuery.data?.items ?? [];
  const strategyLabel = getStrategyLabel(strategy);

  return (
    <section className="mt-16 lg:mt-20">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[0.85rem] font-black uppercase tracking-[0.22em] text-babyblue-600 mb-3">
            Recomendados para ti
          </p>
          <h2 className="text-3xl sm:text-4xl font-black text-text">
            Libros que encajan contigo
          </h2>
          <p className="mt-2 max-w-3xl text-base leading-relaxed text-text-muted">
            {strategyLabel}. La lista se refresca cuando cambian tus búsquedas o
            compras recientes.
          </p>
        </div>
        <Link
          to="/catalog"
          className="inline-flex items-center justify-center rounded-lg border border-babyblue-400/60 bg-transparent px-5 py-3 text-sm font-bold text-babyblue-700 transition hover:-translate-y-0.5 hover:bg-babyblue-300/10"
        >
          Ver catálogo completo
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="rounded-3xl border border-border bg-bg-secondary p-6 shadow-sm sm:p-8">
          <p className="text-lg font-bold text-text">
            Todavía no tenemos suficientes señales para personalizar tus
            recomendaciones.
          </p>
          <p className="mt-2 text-sm text-text-muted">
            Explora algunos libros, realiza búsquedas o completa una compra para
            refinar tus sugerencias.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {items.slice(0, 8).map((item) => (
            <div key={item.book.id} className="space-y-3">
              <ItemCard
                id={item.book.id}
                cuantity={item.book.quantity ?? 0}
                image={item.book.coverUrl ?? null}
                title={item.book.title}
                author={item.book.author}
                tag={strategyLabel}
                price={formatPrice(item.book.price)}
                status={item.book.status ?? undefined}
              />
              <p className="px-1 text-xs leading-5 text-text-muted">
                {item.reasons.slice(0, 2).join(' · ')}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
