import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../Button';
import { Spinner } from '../Spinner';
import {
    getClientHistory,
    type ClientHistoryResponse,
    type HistoryPurchaseStatus,
    type HistoryReservationStatus,
} from '../../api/history';

type HistoryTab = 'purchases' | 'reservations';

function formatDate(iso: string): string {
    if (!iso) return 'Sin fecha';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return 'Sin fecha';
    return date.toLocaleString('es-CO', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0,
    }).format(amount || 0);
}

function purchaseStatusMeta(status: HistoryPurchaseStatus): { label: string; className: string } {
    if (status === 'delivered') return { label: 'Entregada', className: 'bg-emerald-50 text-emerald-700 border-emerald-300/60' };
    if (status === 'shipped') return { label: 'En camino', className: 'bg-skyblue-50 text-skyblue-700 border-skyblue-300/60' };
    if (status === 'cancelled') return { label: 'Cancelada', className: 'bg-danger-50 text-danger-700 border-danger-300/60' };
    return { label: 'En preparación', className: 'bg-amber-50 text-amber-700 border-amber-300/60' };
}

function reservationStatusMeta(status: HistoryReservationStatus): { label: string; className: string } {
    if (status === 'active') return { label: 'Activa', className: 'bg-skyblue-50 text-skyblue-700 border-skyblue-300/60' };
    if (status === 'converted') return { label: 'Convertida', className: 'bg-emerald-50 text-emerald-700 border-emerald-300/60' };
    if (status === 'cancelled') return { label: 'Cancelada', className: 'bg-danger-50 text-danger-700 border-danger-300/60' };
    return { label: 'Vencida', className: 'bg-amber-50 text-amber-700 border-amber-300/60' };
}

function getRemainingTimeLabel(expirationDate?: string | null): string | null {
    if (!expirationDate) return null;
    const remainingMs = new Date(expirationDate).getTime() - Date.now();
    if (remainingMs <= 0) return 'Vencida';

    const totalMinutes = Math.floor(remainingMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours <= 0) return `${minutes} min restantes`;
    return `${hours} h ${minutes} min restantes`;
}

type MyHistoryViewProps = {
    embedded?: boolean;
};

export function MyHistoryView({ embedded = false }: MyHistoryViewProps) {
    const [activeTab, setActiveTab] = useState<HistoryTab>('purchases');
    const [history, setHistory] = useState<ClientHistoryResponse>({ purchases: [], reservations: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadHistory = async () => {
        try {
            setLoading(true);
            setError(null);
            const result = await getClientHistory();
            setHistory(result);
        } catch (loadError) {
            const message = loadError instanceof Error ? loadError.message : 'No se pudo cargar tu historial';
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadHistory();
    }, []);

    const purchaseCards = useMemo(() => {
        return [...history.purchases].sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());
    }, [history.purchases]);

    const reservationCards = useMemo(() => {
        return [...history.reservations].sort((a, b) => new Date(b.reservationDate).getTime() - new Date(a.reservationDate).getTime());
    }, [history.reservations]);

    if (loading) {
        return (
            <div className={embedded ? 'flex items-center justify-center py-10' : 'w-full px-4 py-12 sm:py-16'}>
                <div className="mx-auto flex min-h-[24vh] w-full max-w-6xl items-center justify-center rounded-3xl border border-border bg-bg-secondary shadow-sm">
                    <Spinner size="lg" tone="calm" label="Cargando historial..." fullScreen={false} />
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
                        <Button variant="secondary" size="auto" onClick={() => { void loadHistory(); }}>
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

    const isPurchasesTab = activeTab === 'purchases';
    const hasEmptyState = isPurchasesTab ? purchaseCards.length === 0 : reservationCards.length === 0;

    return (
        <div className={embedded ? 'space-y-4' : 'w-full px-4 py-8 sm:py-10'}>
            <div className={embedded ? 'space-y-6' : 'mx-auto max-w-7xl space-y-6'}>
                <header className="rounded-3xl border border-border bg-bg-secondary p-5 shadow-sm sm:p-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">Mi historial</p>
                    <h1 className="mt-2 text-3xl font-bold text-text">Compras y reservas</h1>
                    <p className="mt-2 text-sm leading-6 text-text-muted sm:text-base">
                        Consulta el estado, fecha, productos y valor de cada transacción.
                    </p>
                </header>

                <section className="rounded-3xl border border-border bg-bg-secondary p-4 shadow-sm sm:p-5">
                    <div className="flex flex-wrap gap-3">
                        <Button
                            variant={isPurchasesTab ? 'primary' : 'secondary'}
                            size="auto"
                            className="rounded-full px-5 py-2 text-sm"
                            onClick={() => setActiveTab('purchases')}
                        >
                            Compras
                        </Button>
                        <Button
                            variant={!isPurchasesTab ? 'primary' : 'secondary'}
                            size="auto"
                            className="rounded-full px-5 py-2 text-sm"
                            onClick={() => setActiveTab('reservations')}
                        >
                            Reservas
                        </Button>
                    </div>
                </section>

                {hasEmptyState ? (
                    <section className="rounded-3xl border border-border bg-bg-secondary p-6 text-text-muted shadow-sm">
                        {isPurchasesTab
                            ? 'Aun no tienes compras en tu historial.'
                            : 'Aun no tienes reservas en tu historial.'}
                    </section>
                ) : isPurchasesTab ? (
                    <section className="grid gap-4 lg:grid-cols-2">
                        {purchaseCards.map((purchase) => {
                            const status = purchaseStatusMeta(purchase.status);
                            return (
                                <article
                                    key={purchase.purchaseId}
                                    className="rounded-3xl border border-border bg-bg-secondary p-4 shadow-sm sm:p-5"
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-text-muted">
                                            Compra #{purchase.purchaseId}
                                        </p>
                                        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${status.className}`}>
                                            {status.label}
                                        </span>
                                    </div>

                                    <p className="mt-2 text-sm text-text-muted">Fecha: {formatDate(purchase.purchaseDate)}</p>

                                    <div className="mt-4 space-y-2">
                                        {purchase.items.map((item) => (
                                            <div key={item.purchaseItemId} className="flex items-center gap-3 rounded-xl border border-border bg-bg p-2.5">
                                                <div className="h-14 w-10 shrink-0 overflow-hidden rounded-md bg-babyblue-300/45">
                                                    {item.coverUrl ? (
                                                        <img src={item.coverUrl} alt={item.title} className="h-full w-full object-cover" />
                                                    ) : (
                                                        <div className="flex h-full w-full items-center justify-center">
                                                            <img src="/inkoraICO.svg" alt="inkora" className="w-6" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="line-clamp-1 text-sm font-semibold text-text">{item.title}</p>
                                                    <p className="text-xs text-text-muted">Cantidad: {item.quantity}</p>
                                                </div>
                                                <p className="text-sm font-semibold text-text">{formatCurrency(item.subtotal)}</p>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                                        <span className="text-sm text-text-muted">Total</span>
                                        <span className="text-lg font-bold text-text">{formatCurrency(purchase.totalAmount)}</span>
                                    </div>
                                </article>
                            );
                        })}
                    </section>
                ) : (
                    <section className="grid gap-4 lg:grid-cols-2">
                        {reservationCards.map((reservation) => {
                            const status = reservationStatusMeta(reservation.status);
                            const remaining = reservation.status === 'active' ? getRemainingTimeLabel(reservation.expirationDate) : null;
                            return (
                                <article
                                    key={reservation.reservationId}
                                    className="rounded-3xl border border-border bg-bg-secondary p-4 shadow-sm sm:p-5"
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-text-muted">
                                            Reserva #{reservation.reservationId}
                                        </p>
                                        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${status.className}`}>
                                            {status.label}
                                        </span>
                                    </div>

                                    <p className="mt-2 text-sm text-text-muted">Fecha: {formatDate(reservation.reservationDate)}</p>
                                    {remaining && (
                                        <p className="mt-1 text-sm font-semibold text-amber-700">
                                            Tiempo restante: {remaining}
                                        </p>
                                    )}

                                    <div className="mt-4 space-y-2">
                                        {reservation.items.map((item) => (
                                            <div key={item.reservationItemId} className="flex items-center gap-3 rounded-xl border border-border bg-bg p-2.5">
                                                <div className="h-14 w-10 shrink-0 overflow-hidden rounded-md bg-babyblue-300/45">
                                                    {item.coverUrl ? (
                                                        <img src={item.coverUrl} alt={item.title} className="h-full w-full object-cover" />
                                                    ) : (
                                                        <div className="flex h-full w-full items-center justify-center">
                                                            <img src="/inkoraICO.svg" alt="inkora" className="w-6" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="line-clamp-1 text-sm font-semibold text-text">{item.title}</p>
                                                    <p className="text-xs text-text-muted">Cantidad: {item.quantity}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </article>
                            );
                        })}
                    </section>
                )}
            </div>
        </div>
    );
}
