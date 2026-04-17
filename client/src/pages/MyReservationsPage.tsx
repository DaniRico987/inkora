import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ConfirmationModal } from '../Components/ConfirmationModal';
import { Spinner } from '../Components/Spinner';
import { useSnackbar } from '../Components/SnackbarProvider';
import {
  cancelReservation,
  getReservations,
  type ReservationResponse,
} from '../api/reservations';
import { getBookDetail } from '../api/books';

type CountdownTone = 'normal' | 'warning' | 'danger' | 'expired';

type ActiveReservationCard = {
  reservationId: number;
  title: string;
  bookId: number;
  quantity: number;
  expirationDate: string;
  remainingMs: number;
  tone: CountdownTone;
  coverUrl: string | null;
};

type HistoricReservationCard = {
  reservationId: number;
  title: string;
  bookId: number;
  quantity: number;
  status: ReservationResponse['status'];
  expirationDate: string;
  coverUrl: string | null;
};

function formatAbsoluteDate(dateIso: string): string {
  const date = new Date(dateIso);
  return date.toLocaleString('es-CO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatCountdown(totalMs: number): string {
  const safeMs = Math.max(0, totalMs);
  const totalSeconds = Math.floor(safeMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function getCountdownTone(remainingMs: number): CountdownTone {
  if (remainingMs <= 0) return 'expired';
  if (remainingMs <= 30 * 60 * 1000) return 'danger';
  if (remainingMs <= 2 * 60 * 60 * 1000) return 'warning';
  return 'normal';
}

function statusChip(status: ReservationResponse['status']): { label: string; className: string } {
  if (status === 'cancelled') {
    return {
      label: 'Cancelada',
      className: 'border-danger-300/60 bg-danger-50 text-danger-700',
    };
  }

  if (status === 'expired') {
    return {
      label: 'Vencida',
      className: 'border-amber-300/60 bg-amber-50 text-amber-700',
    };
  }

  if (status === 'converted') {
    return {
      label: 'Convertida en compra',
      className: 'border-emerald-300/60 bg-emerald-50 text-emerald-700',
    };
  }

  return {
    label: 'Activa',
    className: 'border-skyblue-300/60 bg-skyblue-50 text-skyblue-700',
  };
}

export function MyReservationsPage() {
  const snackbar = useSnackbar();

  const [reservations, setReservations] = useState<ReservationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState<number>(Date.now());
  const [pendingCancelId, setPendingCancelId] = useState<number | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [recentlyCancelledIds, setRecentlyCancelledIds] = useState<number[]>([]);
  const [bookCoverById, setBookCoverById] = useState<Record<number, string | null>>({});

  const loadReservations = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getReservations();
      setReservations(result);

      const uniqueBookIds = [
        ...new Set(result.flatMap((reservation) => reservation.items.map((item) => item.bookId))),
      ];

      const covers = await Promise.all(
        uniqueBookIds.map(async (bookId) => {
          try {
            const detail = await getBookDetail(bookId);
            return [bookId, detail.coverUrl ?? null] as const;
          } catch {
            return [bookId, null] as const;
          }
        }),
      );

      setBookCoverById(Object.fromEntries(covers));
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : 'No se pudo cargar el historial de reservas';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadReservations();
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const activeCards = useMemo<ActiveReservationCard[]>(() => {
    return reservations
      .filter((reservation) => reservation.status === 'active')
      .flatMap((reservation) => {
        const expirationMs = new Date(reservation.expirationDate).getTime();
        const remainingMs = expirationMs - nowMs;

        return reservation.items.map((item) => ({
          reservationId: reservation.reservationId,
          title: item.title,
          bookId: item.bookId,
          quantity: item.quantity,
          expirationDate: reservation.expirationDate,
          remainingMs,
          tone: getCountdownTone(remainingMs),
          coverUrl: bookCoverById[item.bookId] ?? null,
        }));
      })
      .sort((a, b) => a.remainingMs - b.remainingMs);
  }, [bookCoverById, nowMs, reservations]);

  const historyCards = useMemo<HistoricReservationCard[]>(() => {
    return reservations
      .filter((reservation) => reservation.status === 'expired' || reservation.status === 'cancelled')
      .flatMap((reservation) => {
        return reservation.items.map((item) => ({
          reservationId: reservation.reservationId,
          title: item.title,
          bookId: item.bookId,
          quantity: item.quantity,
          status: reservation.status,
          expirationDate: reservation.expirationDate,
          coverUrl: bookCoverById[item.bookId] ?? null,
        }));
      })
      .sort((a, b) => b.reservationId - a.reservationId);
  }, [bookCoverById, reservations]);

  const closeCancelModal = () => {
    if (isCancelling) return;
    setPendingCancelId(null);
  };

  const confirmCancelReservation = async () => {
    if (!pendingCancelId) return;

    setIsCancelling(true);
    try {
      const updatedReservation = await cancelReservation(pendingCancelId);

      setReservations((prev) =>
        prev.map((reservation) =>
          reservation.reservationId === pendingCancelId ? updatedReservation : reservation,
        ),
      );

      setRecentlyCancelledIds((prev) => {
        const next = [pendingCancelId, ...prev];
        return next.slice(0, 4);
      });

      setPendingCancelId(null);
      snackbar.success('Reserva cancelada exitosamente');
    } catch (cancelError) {
      const message =
        cancelError instanceof Error
          ? cancelError.message
          : 'No se pudo cancelar la reserva';
      snackbar.error(message);
    } finally {
      setIsCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full px-4 py-12 sm:py-16">
        <div className="mx-auto flex min-h-[55vh] max-w-6xl items-center justify-center rounded-3xl border border-border bg-bg-secondary shadow-sm">
          <Spinner
            size="lg"
            tone="calm"
            label="Cargando tus reservas..."
            fullScreen={false}
          />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full px-4 py-10 sm:py-12">
        <div className="mx-auto max-w-3xl rounded-2xl border border-danger-300/60 bg-bg-secondary p-6 shadow-sm">
          <p className="text-danger-700">{error}</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                void loadReservations();
              }}
              className="inline-flex items-center justify-center rounded-full bg-babyblue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-babyblue-700"
            >
              Reintentar
            </button>
            <Link
              to="/catalog"
              className="inline-flex items-center justify-center rounded-full border border-border bg-bg px-5 py-2.5 text-sm font-semibold text-text transition hover:border-babyblue-300 hover:text-babyblue-700"
            >
              Volver al catalogo
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 py-8 sm:py-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="rounded-3xl border border-border bg-bg-secondary p-5 shadow-sm sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
            Mis reservas
          </p>
          <h1 className="mt-2 text-3xl font-bold text-text">Tus libros reservados</h1>
          <p className="mt-2 text-sm leading-6 text-text-muted sm:text-base">
            Cada reserva tiene una vigencia maxima de 24 horas. Si no completas la compra, el libro vuelve al inventario automaticamente.
          </p>
        </header>

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-bold text-text">Reservas activas</h2>
            <span className="rounded-full border border-skyblue-300/60 bg-skyblue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-skyblue-700">
              {activeCards.length} item{activeCards.length === 1 ? '' : 's'} activo{activeCards.length === 1 ? '' : 's'}
            </span>
          </div>

          {activeCards.length === 0 ? (
            <div className="rounded-3xl border border-border bg-bg-secondary p-5 text-sm text-text-muted shadow-sm sm:p-6">
              No tienes reservas activas en este momento.
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {activeCards.map((card) => {
                const isRecentlyCancelled = recentlyCancelledIds.includes(card.reservationId);
                const countdownClass =
                  card.tone === 'danger'
                    ? 'text-danger-700'
                    : card.tone === 'warning'
                      ? 'text-amber-700'
                      : card.tone === 'expired'
                        ? 'text-danger-700'
                        : 'text-emerald-700';

                return (
                  <article
                    key={`${card.reservationId}-${card.bookId}`}
                    className={`rounded-3xl border bg-bg-secondary p-4 shadow-sm transition sm:p-5 ${isRecentlyCancelled ? 'border-emerald-300/70 ring-2 ring-emerald-100' : 'border-border'}`}
                  >
                    <div className="flex gap-4">
                      <div className="h-28 w-20 shrink-0 overflow-hidden rounded-xl bg-babyblue-300/45">
                        {card.coverUrl ? (
                          <img
                            src={card.coverUrl}
                            alt={card.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <img src="/inkoraICO.svg" alt="inkora" className="w-10" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                          Reserva #{card.reservationId}
                        </p>
                        <h3 className="mt-1 line-clamp-2 text-lg font-semibold text-text">
                          {card.title}
                        </h3>
                        <p className="mt-1 text-sm text-text-muted">Cantidad: {card.quantity}</p>

                        <div className="mt-3 rounded-2xl border border-border bg-bg p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                            Tiempo restante
                          </p>
                          <p className={`mt-1 text-2xl font-bold tabular-nums ${countdownClass}`}>
                            {formatCountdown(card.remainingMs)}
                          </p>
                          <p className="mt-1 text-xs text-text-muted">
                            Expira el {formatAbsoluteDate(card.expirationDate)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex justify-end">
                      <button
                        type="button"
                        className="inline-flex items-center justify-center rounded-full border border-danger-300/70 bg-danger-50 px-4 py-2 text-sm font-semibold text-danger-700 transition hover:bg-danger-100"
                        onClick={() => setPendingCancelId(card.reservationId)}
                      >
                        Cancelar
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-bold text-text">Reservas vencidas y canceladas</h2>
            <span className="rounded-full border border-border bg-bg-secondary px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
              {historyCards.length} item{historyCards.length === 1 ? '' : 's'}
            </span>
          </div>

          {historyCards.length === 0 ? (
            <div className="rounded-3xl border border-border bg-bg-secondary p-5 text-sm text-text-muted shadow-sm sm:p-6">
              Aun no tienes reservas vencidas o canceladas.
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {historyCards.map((card) => {
                const chip = statusChip(card.status);

                return (
                  <article
                    key={`${card.reservationId}-${card.bookId}`}
                    className="rounded-3xl border border-border bg-bg-secondary p-4 shadow-sm sm:p-5"
                  >
                    <div className="flex gap-4">
                      <div className="h-24 w-18 shrink-0 overflow-hidden rounded-xl bg-babyblue-300/45">
                        {card.coverUrl ? (
                          <img
                            src={card.coverUrl}
                            alt={card.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <img src="/inkoraICO.svg" alt="inkora" className="w-9" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                            Reserva #{card.reservationId}
                          </p>
                          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${chip.className}`}>
                            {chip.label}
                          </span>
                        </div>

                        <h3 className="mt-2 line-clamp-2 text-base font-semibold text-text">{card.title}</h3>
                        <p className="mt-1 text-sm text-text-muted">Cantidad: {card.quantity}</p>
                        <p className="mt-2 text-xs text-text-muted">
                          Expiraba el {formatAbsoluteDate(card.expirationDate)}
                        </p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <ConfirmationModal
        isOpen={pendingCancelId !== null}
        title="Cancelar reserva"
        message="Esta accion liberara el libro para otros usuarios. Deseas cancelar esta reserva?"
        confirmText="Si, cancelar"
        cancelText="Volver"
        onCancel={closeCancelModal}
        onConfirm={() => {
          void confirmCancelReservation();
        }}
        isConfirmLoading={isCancelling}
      />
    </div>
  );
}

export default MyReservationsPage;
