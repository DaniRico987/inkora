import type { PurchaseItem } from '../interfaces/PurchaseInterface';

interface OrderItemsSummaryProps {
  items: PurchaseItem[];
  totalAmount: number;
}

export function OrderItemsSummary({ items, totalAmount }: OrderItemsSummaryProps) {
  return (
    <section className="rounded-3xl border border-border bg-bg-secondary p-5 shadow-sm sm:p-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
            Items del pedido
          </p>
          <h3 className="mt-2 text-xl font-bold text-text">Detalle de compra</h3>
        </div>
        <span className="rounded-full border border-border bg-bg px-3 py-1.5 text-sm font-semibold text-text">
          {items.length} item{items.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <article
            key={item.purchaseItemId}
            className="rounded-2xl border border-border bg-bg p-4"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h4 className="truncate text-base font-semibold text-text">
                  {item.title}
                </h4>
                <p className="mt-1 text-sm text-text-muted">{item.author}</p>
              </div>

              <div className="grid grid-cols-3 gap-2 text-right sm:min-w-65">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-text-muted">
                    Cant.
                  </p>
                  <p className="mt-1 font-semibold text-text">{item.quantity}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-text-muted">
                    Unitario
                  </p>
                  <p className="mt-1 font-semibold text-text">${item.unitPrice.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-text-muted">
                    Subtotal
                  </p>
                  <p className="mt-1 font-bold text-text">${item.subtotal.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-bg px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-text-muted">Total pagado</span>
          <span className="text-xl font-black text-metallicgold-700">${totalAmount.toFixed(2)}</span>
        </div>
      </div>
    </section>
  );
}
