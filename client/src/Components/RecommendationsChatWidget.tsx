import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { InputNumber, InputSelect, InputText } from './Inputs';
import { Spinner } from './Spinner';
import { getCategories, type Category } from '../api/categories';
import {
  getBotRecommendations,
  type RecommendationItem,
} from '../api/recommendations';
import { getRoleFromToken, isAuthenticated } from '../auth/session';
import { useSnackbar } from './SnackbarProvider';

function formatPrice(value: number): string {
  return value.toLocaleString('es-CO');
}

function getCategoryOptions(categories: Category[]) {
  return [
    { label: 'Elige un género', value: '' },
    ...categories.map((category) => ({
      label: category.name,
      value: String(category.categoryId),
    })),
  ];
}

function ResultCard({ item }: { item: RecommendationItem }) {
  return (
    <Link
      to={`/books/${item.book.id}`}
      className="block rounded-2xl border border-border bg-bg-secondary p-3.5 transition hover:-translate-y-0.5 hover:border-babyblue-300"
    >
      <div className="flex gap-3">
        <div className="h-20 w-14 shrink-0 overflow-hidden rounded-xl bg-babyblue-300/30">
          {item.book.coverUrl ? (
            <img
              src={item.book.coverUrl}
              alt={item.book.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <img src="/inkoraICO.svg" alt="inkora" className="w-6" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-bold text-text">
            {item.book.title}
          </p>
          <p className="mt-1 text-xs text-text-muted">{item.book.author}</p>
          <p className="mt-1 text-sm font-semibold text-babyblue-700">
            ${formatPrice(item.book.price)}
          </p>
        </div>
      </div>
    </Link>
  );
}

export function RecommendationsChatWidget() {
  const role = getRoleFromToken();
  const { error: showError } = useSnackbar();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [author, setAuthor] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [resultItems, setResultItems] = useState<RecommendationItem[]>([]);
  const [assistantMessage, setAssistantMessage] = useState(
    'Cuéntame qué te interesa y te propongo algo.',
  );

  const enabled = isAuthenticated() && role === 'client';

  const categoriesQuery = useQuery({
    queryKey: ['recommendations', 'categories'],
    queryFn: getCategories,
    enabled: enabled && isOpen,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  const categoryOptions = useMemo(
    () => getCategoryOptions(categoriesQuery.data ?? []),
    [categoriesQuery.data],
  );

  const botMutation = useMutation({
    mutationFn: getBotRecommendations,
    onSuccess: (data) => {
      setResultItems(data.items);
      setAssistantMessage(
        data.items.length > 0
          ? 'Estas son las sugerencias que mejor encajan con lo que pediste.'
          : 'No encontré coincidencias fuertes, pero puedo afinar más si cambias las preferencias.',
      );
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : 'No se pudo consultar el bot';
      showError(message);
      setAssistantMessage(message);
    },
  });

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!enabled) {
    return null;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const numericCategoryId = selectedCategoryId
      ? Number(selectedCategoryId)
      : undefined;
    const numericMaxPrice = maxPrice ? Number(maxPrice) : undefined;

    await botMutation.mutateAsync({
      preferredCategoryIds: numericCategoryId ? [numericCategoryId] : undefined,
      preferredAuthors: author.trim() ? [author.trim()] : undefined,
      maxPrice: numericMaxPrice,
      limit: 6,
      excludeOwned: true,
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="fixed bottom-4 left-4 z-60 flex items-center gap-3 rounded-full border border-white/15 bg-primary-600 px-3 py-3 text-white shadow-2xl shadow-primary-500/30 transition hover:-translate-y-0.5 hover:bg-primary-500 sm:bottom-5 sm:left-5 sm:px-4"
        aria-label="Abrir bot de recomendaciones"
        title="Bot de recomendaciones"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15">
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M12 2a7 7 0 0 0-7 7v3H4a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h1v1a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-1h1a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-1V9a7 7 0 0 0-7-7Z" />
            <path d="M9 11h.01M15 11h.01M9 15c1 .667 2 .999 3 .999s2-.332 3-1" />
          </svg>
        </span>
        <span className="hidden text-sm font-semibold sm:block">Bot</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-70 flex items-end justify-start bg-black/35 p-0 sm:items-end sm:justify-start sm:p-4">
          <div className="relative z-10 flex h-[88vh] w-full flex-col overflow-hidden rounded-none border-0 bg-bg-secondary shadow-2xl shadow-black/30 sm:h-auto sm:max-h-[80vh] sm:max-w-[92vw] sm:rounded-3xl sm:border sm:border-border lg:max-w-136">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-text-muted">
                  Recomendaciones
                </p>
                <h3 className="text-lg font-black text-text">
                  Bot interactivo
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-text transition hover:border-primary-500 hover:text-primary-500"
              >
                Cerrar
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              <div className="mb-4 rounded-2xl border border-babyblue-300/30 bg-babyblue-200/10 p-4 text-sm leading-6 text-text-muted">
                {assistantMessage}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <InputSelect
                  label="Género"
                  value={selectedCategoryId}
                  onChange={(event) =>
                    setSelectedCategoryId(event.target.value)
                  }
                  options={categoryOptions}
                  disabled={
                    categoriesQuery.isLoading || categoriesQuery.isFetching
                  }
                />
                <InputText
                  label="Autor"
                  value={author}
                  onChange={(event) => setAuthor(event.target.value)}
                  placeholder="Gabriel García Márquez"
                />
                <InputNumber
                  label="Precio máximo"
                  value={maxPrice}
                  onChange={(event) => setMaxPrice(event.target.value)}
                  placeholder="50000"
                />

                <button
                  type="submit"
                  disabled={botMutation.isPending}
                  className="inline-flex w-full items-center justify-center rounded-xl bg-primary-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {botMutation.isPending
                    ? 'Buscando...'
                    : 'Recomiéndame libros'}
                </button>
              </form>

              {(categoriesQuery.isLoading || botMutation.isPending) && (
                <div className="mt-5 rounded-2xl border border-border bg-bg p-4">
                  <Spinner
                    size="sm"
                    tone="calm"
                    label="Procesando preferencias..."
                  />
                </div>
              )}

              {resultItems.length > 0 && (
                <div className="mt-5 space-y-3">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-text-muted">
                    Sugerencias
                  </p>
                  <div className="grid gap-3">
                    {resultItems.map((item) => (
                      <ResultCard key={item.book.id} item={item} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
