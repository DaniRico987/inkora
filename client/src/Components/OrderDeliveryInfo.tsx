import type { DeliveryMode } from '../interfaces/PurchaseInterface';

interface OrderDeliveryInfoProps {
  deliveryMode?: DeliveryMode | null;
  shippingAddress?: string | null;
  estimatedDeliveryTime?: string | null;
}

function deliveryModeLabel(mode?: DeliveryMode | null): string {
  if (mode === 'storePickup') return 'Retiro en tienda';
  if (mode === 'homeDelivery') return 'Envio a domicilio';
  return 'No especificado';
}

export function OrderDeliveryInfo({
  deliveryMode,
  shippingAddress,
  estimatedDeliveryTime,
}: OrderDeliveryInfoProps) {
  const resolvedAddress =
    shippingAddress?.trim() ||
    (deliveryMode === 'storePickup'
      ? 'Retiro en sucursal seleccionada'
      : 'Direccion no informada');

  return (
    <section className="rounded-3xl border border-border bg-bg-secondary p-5 shadow-sm sm:p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <article className="rounded-2xl border border-border bg-bg p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
            Metodo de entrega
          </p>
          <p className="mt-2 text-base font-semibold text-text">
            {deliveryModeLabel(deliveryMode)}
          </p>
        </article>

        <article className="rounded-2xl border border-border bg-bg p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
            Tiempo estimado
          </p>
          <p className="mt-2 text-base font-semibold text-text">
            {estimatedDeliveryTime?.trim() || 'Pendiente de confirmacion'}
          </p>
        </article>
      </div>

      <article className="mt-4 rounded-2xl border border-border bg-bg p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
          Direccion de envio
        </p>
        <p className="mt-2 text-sm leading-6 text-text sm:text-base">
          {resolvedAddress}
        </p>
      </article>
    </section>
  );
}
