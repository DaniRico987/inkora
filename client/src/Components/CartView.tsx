import React from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../hooks/useCart';
import { CartItem } from './CartItem';
import { CartSummary } from './CartSummary';
import { Spinner } from './Spinner';
import { listMappings } from '../utils/reservationCart';

/**
 * CartView - Página principal del carrito
 * Muestra todos los items, permite editar cantidades y eliminar
 */
export const CartView: React.FC = () => {
  const { cart, loading, error, removeItem, resetError } = useCart();
  const [nowMs, setNowMs] = React.useState<number>(0);

  React.useEffect(() => {
    const updateNow = () => {
      setNowMs(Date.now());
    };

    updateNow();

    const intervalId = window.setInterval(() => {
      updateNow();
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const reservationByCartItemId = React.useMemo(() => {
    const mappings = listMappings();
    const map = new Map<number, { reservationId: number; expirationDate: string }>();

    for (const mapping of mappings) {
      for (const cartItemId of mapping.cartItemIds) {
        map.set(cartItemId, {
          reservationId: mapping.reservationId,
          expirationDate: mapping.expirationDate,
        });
      }
    }

    return map;
  }, [cart?.updatedAt]);

  if (loading) {
    return (
      <div className="px-4 py-14 sm:py-16">
        <div className="mx-auto flex min-h-[55vh] max-w-6xl items-center justify-center rounded-3xl border border-border bg-bg-secondary shadow-sm">
          <Spinner
            size="lg"
            tone="calm"
            label="Preparando tu carrito..."
            fullScreen={false}
          />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-14 sm:py-16">
        <div className="mx-auto flex min-h-[55vh] max-w-2xl items-center justify-center">
          <div className="w-full rounded-3xl border border-red-300/70 bg-bg-secondary p-8 shadow-sm">
            <div className="mb-4 inline-flex rounded-full bg-red-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-red-700">
              Error de sincronización
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-text sm:text-3xl">
              Error al cargar el carrito
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-text-muted sm:text-base">
              No pudimos sincronizar tu carrito en este momento. Tu sesión sigue
              activa; prueba de nuevo o vuelve más tarde.
            </p>
            <div className="mt-6 rounded-2xl border border-red-100 bg-red-50/80 p-4 text-sm text-red-800">
              {error}
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={resetError}
                className="inline-flex items-center justify-center rounded-full bg-red-600 px-5 py-3 font-semibold text-white shadow-lg shadow-red-500/20 transition hover:bg-red-700"
              >
                Reintentar
              </button>
              <Link
                to="/catalog"
                className="inline-flex items-center justify-center rounded-full border border-border bg-bg-secondary px-5 py-3 font-semibold text-text transition hover:border-babyblue-300 hover:text-babyblue-700"
              >
                Volver al catálogo
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="px-4 py-10 sm:py-12">
        <div className="mx-auto max-w-5xl rounded-3xl border border-border bg-bg-secondary p-6 shadow-sm sm:p-8">
          <div className="space-y-5 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-text sm:text-4xl">
              Tu carrito está vacío
            </h1>
            <p className="mx-auto max-w-2xl text-base text-text-muted">
              Cuando agregues libros podrás ajustar cantidad, ver subtotales en
              tiempo real y continuar al checkout desde esta misma página.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                to="/catalog"
                className="inline-flex items-center justify-center rounded-full bg-babyblue-600 px-6 py-3 font-semibold text-white transition hover:bg-babyblue-700"
              >
                Explorar catálogo
              </Link>
              <div className="inline-flex items-center justify-center rounded-full border border-border bg-bg px-6 py-3 text-sm font-semibold text-text">
                Checkout disponible al agregar ítems
              </div>
            </div>

            <div className="grid gap-3 text-left sm:grid-cols-3">
              {[
                {
                  title: 'Cantidad editable',
                  text: 'Ajusta con + y - sin salir del carrito.',
                },
                {
                  title: 'Total dinámico',
                  text: 'Subtotal, impuestos y total se recalculan al instante.',
                },
                {
                  title: 'Compra segura',
                  text: 'Acceso directo a pago cuando lo decidas.',
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-border bg-bg p-4"
                >
                  <h3 className="text-sm font-semibold text-text">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-sm text-text-muted">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-8 sm:py-10 lg:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-3xl border border-border bg-bg-secondary p-5 shadow-sm sm:p-7">
          <div className="space-y-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-text sm:text-4xl">
                  Mi carrito
                </h1>
                <p className="mt-1 text-base text-text-muted">
                  Revisa tus libros, ve subtotales y continúa al pago cuando
                  quieras.
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                <div className="rounded-2xl border border-border bg-bg px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-text-muted">
                    Artículos
                  </p>
                  <p className="mt-1 text-lg font-bold text-text">
                    {cart.itemCount}
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-bg px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-text-muted">
                    Subtotal
                  </p>
                  <p className="mt-1 text-lg font-bold text-text">
                    ${cart.subtotal.toFixed(2)}
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-bg px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-text-muted">
                    Total
                  </p>
                  <p className="mt-1 text-lg font-bold text-text">
                    ${cart.total.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {error && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/90 px-5 py-4 text-amber-900 shadow-sm backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold">Hay un detalle pendiente</h3>
                <p className="mt-1 text-sm text-amber-800">{error}</p>
              </div>
              <button
                onClick={resetError}
                className="rounded-full border border-amber-200 bg-bg-secondary px-3 py-1.5 text-sm font-semibold text-amber-900 transition hover:bg-amber-100"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(340px,0.9fr)]">
          <div className="space-y-4">
            <div className="flex flex-col gap-2 px-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.24em] text-text-muted">
                  Ítems seleccionados
                </h2>
                <p className="mt-1 text-sm text-text-muted">
                  Elimina libros sin perder el contexto. La cantidad se selecciona en la ficha de cada libro.
                </p>
              </div>
              <div className="inline-flex w-fit rounded-full border border-border bg-bg px-4 py-2 text-sm font-semibold text-text">
                Actualización inmediata
              </div>
            </div>

            <div className="space-y-4">
              {cart.items.map((item, index) => {
                const reservation = reservationByCartItemId.get(item.cartItemId);
                const remainingMs = reservation
                  ? new Date(reservation.expirationDate).getTime() - nowMs
                  : null;

                return (
                  <CartItem
                    key={item.cartItemId}
                    item={item}
                    onRemove={removeItem}
                    index={index}
                    reservationCountdown={
                      remainingMs !== null && reservation
                        ? {
                          reservationId: reservation?.reservationId ?? 0,
                          remainingMs,
                        }
                        : undefined
                    }
                  />
                );
              })}
            </div>
          </div>

          <div className="lg:pt-10">
            <CartSummary cart={cart} />
          </div>
        </div>

        <section className="grid gap-4 md:grid-cols-3">
          {[
            {
              title: 'Envío rápido',
              text: 'Recibe tus libros con una experiencia de compra clara y sin fricción.',
            },
            {
              title: 'Edición instantánea',
              text: 'Los controles + / - y el total se actualizan al momento.',
            },
            {
              title: 'Checkout listo',
              text: 'Cuando quieras, sigue al pago con un solo clic.',
            },
          ].map((card) => (
            <div
              key={card.title}
              className="rounded-2xl border border-border bg-bg-secondary p-5 shadow-sm"
            >
              <h3 className="text-base font-bold text-text">
                {card.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-text-muted">
                {card.text}
              </p>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
};
