import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ConfirmationModal } from '../ConfirmationModal';
import { Button } from '../Button';
import { Spinner } from '../Spinner';
import { useSnackbar } from '../SnackbarProvider';
import { cancelReservation, getReservations, type ReservationResponse } from '../../api/reservations';
import { getMapping, addMapping, removeMapping } from '../../utils/reservationCart';
import { useCart } from '../../hooks/useCart';
import { addToCart } from '../../api/cart';
import { useNavigate } from 'react-router-dom';
import { getBookDetail } from '../../api/books';

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

type MyReservationsViewProps = {
    embedded?: boolean;
    onGoToCart?: () => void;
    historyOnly?: boolean;
};

export function MyReservationsView({ embedded = false, onGoToCart, historyOnly = false }: MyReservationsViewProps) {
    const snackbar = useSnackbar();
    const [reservations, setReservations] = useState<ReservationResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [nowMs, setNowMs] = useState<number>(Date.now());
    const [pendingCancelId, setPendingCancelId] = useState<number | null>(null);
    const [isCancelling, setIsCancelling] = useState(false);
    const [recentlyCancelledIds, setRecentlyCancelledIds] = useState<number[]>([]);
    const [bookCoverById, setBookCoverById] = useState<Record<number, string | null>>({});
    const { loadCart, removeItem } = useCart(); // eslint-disable-line @typescript-eslint/no-unused-vars -- addItem is not used but comes from hook
    const navigate = useNavigate();

    function AddReservationToCartButton({
        reservationId,
        bookId,
        quantity,
        expirationDate,
        onAdded,
        onError,
    }: {
        reservationId: number;
        bookId: number;
        quantity: number;
        expirationDate: string;
        onAdded?: () => void;
        onError?: (msg: string) => void;
    }) {
        const [loading, setLoading] = useState(false);

        const handleAdd = async () => {
            try {
                setLoading(true);
                const added = await addToCart(bookId, quantity);
                // refresh cart state
                await loadCart();
                addMapping({ reservationId, cartItemIds: [added.cartItemId], expirationDate });
                onAdded?.();
            } catch (err) {
                const message = err instanceof Error ? err.message : 'No se pudo agregar al carrito';
                onError?.(message);
            } finally {
                setLoading(false);
            }
        };

        return (
            <button
                type="button"
                disabled={loading}
                onClick={handleAdd}
                className="inline-flex items-center justify-center rounded-full border border-babyblue-300/70 bg-babyblue-50 px-4 py-2 text-sm font-semibold text-babyblue-700 transition hover:bg-babyblue-100"
            >
                {loading ? 'Agregando...' : 'Agregar al carrito'}
            </button>
        );
    }

    const loadReservations = async () => {
        try {
            setLoading(true);
            setError(null);
            const result = await getReservations();
            setReservations(result);

            const uniqueBookIds = [...new Set(result.flatMap((reservation) => reservation.items.map((item) => item.bookId)))];

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
            const message = loadError instanceof Error ? loadError.message : 'No se pudo cargar el historial de reservas';
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadReservations();
    }, []);

    useEffect(() => {
        const handleRefresh = () => {
            void loadReservations();
        };

        window.addEventListener('reservations:refresh', handleRefresh);
        return () => {
            window.removeEventListener('reservations:refresh', handleRefresh);
        };
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
        const reservationId = pendingCancelId;

        setIsCancelling(true);
        try {
            const updatedReservation = await cancelReservation(reservationId);

            setReservations((prev) =>
                prev.map((reservation) =>
                    reservation.reservationId === reservationId ? updatedReservation : reservation,
                ),
            );

            setRecentlyCancelledIds((prev) => {
                const next = [reservationId, ...prev];
                return next.slice(0, 4);
            });

            // limpiar mapeo carrito -> reserva si existe
            try {
                const mapping = getMapping(reservationId);
                if (mapping && mapping.cartItemIds.length > 0) {
                    for (const cartItemId of mapping.cartItemIds) {
                        try {
                            await removeItem(cartItemId);
                        } catch (remErr) {
                            console.error('Error removing cart item linked to cancelled reservation:', remErr);
                        }
                    }
                    removeMapping(reservationId);
                    await loadCart();
                }
            } catch (cleanupErr) {
                console.error('Error cleaning up cart mapping after cancel:', cleanupErr);
            }

            setPendingCancelId(null);
            snackbar.success('Reserva cancelada exitosamente');
        } catch (cancelError) {
            const message = cancelError instanceof Error ? cancelError.message : 'No se pudo cancelar la reserva';
            snackbar.error(message);
        } finally {
            setIsCancelling(false);
        }
    };

    const loadingClass = embedded ? 'min-h-[24vh]' : 'min-h-[55vh]';

    if (loading) {
        return (
            <div className={embedded ? 'flex items-center justify-center py-10' : 'w-full px-4 py-12 sm:py-16'}>
                <div className={`mx-auto flex ${loadingClass} w-full max-w-6xl items-center justify-center rounded-3xl border border-border bg-bg-secondary shadow-sm`}>
                    <Spinner size="lg" tone="calm" label="Cargando tus reservas..." fullScreen={false} />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={embedded ? 'space-y-4 py-2' : 'w-full px-4 py-10 sm:py-12'}>
                <div className="mx-auto max-w-3xl rounded-2xl border border-danger-300/60 bg-bg-secondary p-6 shadow-sm">
                    <p className="text-danger-700">{error}</p>
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                        <Button variant="secondary" size="auto" onClick={() => { void loadReservations(); }}>
                            Reintentar
                        </Button>
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
        <div className={embedded ? 'space-y-4' : 'w-full px-4 py-8 sm:py-10'}>
            <div className={embedded ? 'space-y-6' : 'mx-auto max-w-7xl space-y-8'}>
                <header className="rounded-3xl border border-border bg-bg-secondary p-5 shadow-sm sm:p-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                        {historyOnly ? 'Historial de reservas' : 'Mis reservas'}
                    </p>
                    <h1 className="mt-2 text-3xl font-bold text-text">
                        {historyOnly ? 'Historial de tus reservas' : 'Tus libros reservados'}
                    </h1>
                    <p className="mt-2 text-sm leading-6 text-text-muted sm:text-base">
                        Cada reserva tiene una vigencia maxima de 24 horas. Si no completas la compra, el libro vuelve al inventario automaticamente.
                    </p>
                </header>

                {!historyOnly && (
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

                                        <div className="mt-4 flex justify-end gap-3">
                                            {getMapping(card.reservationId) ? (
                                                <button
                                                    type="button"
                                                    className="inline-flex items-center justify-center rounded-full border border-babyblue-300/70 bg-babyblue-50 px-4 py-2 text-sm font-semibold text-babyblue-700 transition hover:bg-babyblue-100"
                                                    onClick={() => {
                                                        if (typeof onGoToCart === 'function') {
                                                            onGoToCart();
                                                        } else {
                                                            navigate('/cart');
                                                        }
                                                    }}
                                                >
                                                    Ir al carrito
                                                </button>
                                            ) : (
                                                <AddReservationToCartButton
                                                    reservationId={card.reservationId}
                                                    bookId={card.bookId}
                                                    quantity={card.quantity}
                                                    expirationDate={card.expirationDate}
                                                    onAdded={() => snackbar.success('Reserva agregada al carrito')}
                                                    onError={(msg) => snackbar.error(msg)}
                                                />
                                            )}

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
                )}

                <section className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <h2 className="text-xl font-bold text-text">Historial de reservas</h2>
                        <span className="rounded-full border border-border bg-bg px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
                            {historyCards.length} registro{historyCards.length === 1 ? '' : 's'}
                        </span>
                    </div>

                    {historyCards.length === 0 ? (
                        <div className="rounded-3xl border border-border bg-bg-secondary p-5 text-sm text-text-muted shadow-sm sm:p-6">
                            Todav&iacute;a no tienes reservas vencidas o canceladas.
                        </div>
                    ) : (
                        <div className="grid gap-4 lg:grid-cols-2">
                            {historyCards.map((card) => {
                                const status = statusChip(card.status);

                                return (
                                    <article key={`${card.reservationId}-${card.bookId}`} className="rounded-3xl border border-border bg-bg-secondary p-4 shadow-sm sm:p-5">
                                        <div className="flex items-center justify-between gap-3">
                                            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-text-muted">
                                                Reserva #{card.reservationId}
                                            </p>
                                            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${status.className}`}>
                                                {status.label}
                                            </span>
                                        </div>

                                        <div className="mt-4 flex items-center gap-3 rounded-xl border border-border bg-bg p-2.5">
                                            <div className="h-14 w-10 shrink-0 overflow-hidden rounded-md bg-babyblue-300/45">
                                                {card.coverUrl ? (
                                                    <img src={card.coverUrl} alt={card.title} className="h-full w-full object-cover" />
                                                ) : (
                                                    <div className="flex h-full w-full items-center justify-center">
                                                        <img src="/inkoraICO.svg" alt="inkora" className="w-6" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="line-clamp-1 text-sm font-semibold text-text">{card.title}</p>
                                                <p className="text-xs text-text-muted">Cantidad: {card.quantity}</p>
                                            </div>
                                        </div>

                                        <p className="mt-3 text-sm text-text-muted">Expiración: {formatAbsoluteDate(card.expirationDate)}</p>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </section>
            </div>

            <ConfirmationModal
                isOpen={!historyOnly && pendingCancelId !== null}
                title="Cancelar reserva"
                message="La reserva se eliminará de tus reservas activas. Esta acción no se puede deshacer."
                confirmText="Cancelar reserva"
                cancelText="Mantener"
                onCancel={closeCancelModal}
                onConfirm={confirmCancelReservation}
                isConfirmLoading={isCancelling}
            />
        </div>
    );
}
