import { StatusBadge } from './StatusBadge';
import type { PurchaseStatus, PurchaseStatusMeta } from '../interfaces/PurchaseInterface';

interface OrderHeaderProps {
  purchaseId: number;
  purchaseDate: string;
  totalAmount: number;
  status: PurchaseStatus;
}

const STATUS_META: Record<PurchaseStatus, PurchaseStatusMeta> = {
  inPreparation: { label: 'En preparacion', tone: 'warning' },
  shipped: { label: 'Enviado', tone: 'info' },
  delivered: { label: 'Entregado', tone: 'success' },
  cancelled: { label: 'Cancelado', tone: 'danger' },
};

export function OrderHeader({
  purchaseId,
  purchaseDate,
  totalAmount,
  status,
}: OrderHeaderProps) {
  const meta = STATUS_META[status];

  return (
    <section className="rounded-3xl border border-border bg-bg-secondary p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
            Seguimiento de pedido
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-text sm:text-4xl">
            Pedido #{purchaseId}
          </h1>
          <p className="mt-2 text-sm text-text-muted sm:text-base">
            Mantente al dia con cada etapa hasta la entrega final.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <StatusBadge label={meta.label} tone={meta.tone} />
          <div className="rounded-2xl border border-border bg-bg px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-text-muted">Total</p>
            <p className="text-lg font-bold text-text">${totalAmount.toFixed(2)}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-bg px-4 py-3 text-sm text-text-muted">
        Fecha de compra: <span className="font-semibold text-text">{new Date(purchaseDate).toLocaleString('es-AR')}</span>
      </div>
    </section>
  );
}
