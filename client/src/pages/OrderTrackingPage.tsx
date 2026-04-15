import { Link, useParams } from 'react-router-dom';
import { OrderDeliveryInfo } from '../Components/OrderDeliveryInfo';
import { OrderHeader } from '../Components/OrderHeader';
import { OrderItemsSummary } from '../Components/OrderItemsSummary';
import { OrderStatusStepper } from '../Components/OrderStatusStepper';
import { Spinner } from '../Components/Spinner';
import { usePurchaseTracking } from '../hooks/usePurchaseTracking';

export function OrderTrackingPage() {
  const params = useParams<{ id: string }>();
  const purchaseId = Number(params.id);
  const { purchase, loading, error, refresh, clearError } =
    usePurchaseTracking(purchaseId);

  if (loading) {
    return (
      <div className="w-full px-4 py-12 sm:py-16">
        <div className="mx-auto flex min-h-[55vh] max-w-6xl items-center justify-center rounded-3xl border border-border bg-bg-secondary shadow-sm">
          <Spinner
            size="lg"
            tone="calm"
            label="Cargando seguimiento del pedido..."
            fullScreen={false}
          />
        </div>
      </div>
    );
  }

  if (error || !purchase) {
    return (
      <div className="w-full px-4 py-10 sm:py-12">
        <div className="mx-auto max-w-2xl rounded-3xl border border-danger-300/60 bg-bg-secondary p-7 shadow-sm sm:p-8">
          <div className="inline-flex rounded-full bg-danger-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-danger-700">
            Seguimiento no disponible
          </div>
          <h1 className="mt-4 text-3xl font-bold text-text">No pudimos abrir tu pedido</h1>
          <p className="mt-3 text-sm leading-6 text-text-muted sm:text-base">
            {error || 'No encontramos informacion para este pedido.'}
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => {
                clearError();
                void refresh();
              }}
              className="inline-flex items-center justify-center rounded-full bg-babyblue-600 px-5 py-3 font-semibold text-white transition hover:bg-babyblue-700"
            >
              Reintentar
            </button>
            <Link
              to="/catalog"
              className="inline-flex items-center justify-center rounded-full border border-border bg-bg px-5 py-3 font-semibold text-text transition hover:border-babyblue-300 hover:text-babyblue-700"
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
      <div className="mx-auto max-w-7xl space-y-6">
        <OrderHeader
          purchaseId={purchase.purchaseId}
          purchaseDate={purchase.purchaseDate}
          totalAmount={purchase.totalAmount}
          status={purchase.status}
        />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(330px,0.95fr)]">
          <div className="space-y-6">
            <OrderStatusStepper status={purchase.status} />
            <OrderDeliveryInfo
              deliveryMode={purchase.deliveryMode}
              shippingAddress={purchase.shippingAddress}
              estimatedDeliveryTime={purchase.estimatedDeliveryTime}
            />
          </div>

          <div className="space-y-6">
            <OrderItemsSummary
              items={purchase.items}
              totalAmount={purchase.totalAmount}
            />
            <section className="rounded-3xl border border-border bg-bg-secondary p-5 shadow-sm sm:p-6">
              <h3 className="text-base font-bold text-text">Necesitas ayuda con tu pedido?</h3>
              <p className="mt-2 text-sm leading-6 text-text-muted">
                Si detectas alguna inconsistencia, contacta soporte y te ayudaremos con prioridad.
              </p>
              <div className="mt-4 flex flex-col gap-3">
                <Link
                  to="/catalog"
                  className="inline-flex items-center justify-center rounded-full border border-border bg-bg px-4 py-2.5 text-sm font-semibold text-text transition hover:border-babyblue-300 hover:text-babyblue-700"
                >
                  Seguir comprando
                </Link>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
