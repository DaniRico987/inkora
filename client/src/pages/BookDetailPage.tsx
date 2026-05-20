import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ConfirmationModal } from '../Components/ConfirmationModal';
import { Spinner } from '../Components/Spinner';
import { useSnackbar } from '../Components/SnackbarProvider';
import { createReservation } from '../api/reservations';
import { addToCart } from '../api/cart';
import { addMapping as addReservationCartMapping } from '../utils/reservationCart';
import { getAccessToken, getRoleFromToken } from '../auth/session';
import { useBookDetail } from '../hooks/useBooks';

function formatPrice(value: number): string {
  return value.toLocaleString('es-CO');
}

function formatExpiration(dateIso: string): string {
  const date = new Date(dateIso);
  return date.toLocaleString('es-CO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const MAX_BOOK_QUANTITY = 3;

export function BookDetailPage() {
  const params = useParams<{ id: string }>();
  const bookId = Number(params.id);
  const {
    data: book,
    loading,
    error,
  } = useBookDetail(Number.isFinite(bookId) ? bookId : null);
  const snackbar = useSnackbar();

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSubmittingReservation, setIsSubmittingReservation] = useState(false);
  const [reservationExpiration, setReservationExpiration] = useState<
    string | null
  >(null);
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [quantityError, setQuantityError] = useState<string | null>(null);
  const [imageFailed, setImageFailed] = useState(false);

  const token = getAccessToken();
  const role = getRoleFromToken(token);
  const isClientAuthenticated = role === 'client';

  const totalAvailable = useMemo(() => {
    if (!book) return 0;
    return book.inventoriesByStore.reduce(
      (acc, item) => acc + item.availableQuantity,
      0,
    );
  }, [book]);

  const addToCartDisabled =
    !book ||
    !book.isAvailable ||
    totalAvailable <= 0 ||
    isSubmittingReservation ||
    selectedQuantity < 1 ||
    selectedQuantity > totalAvailable ||
    Boolean(quantityError);

  const remainingAvailable = Math.max(0, totalAvailable - selectedQuantity);

  useEffect(() => {
    setImageFailed(false);
  }, [book?.coverUrl]);

  const closeConfirmModal = () => {
    if (isSubmittingReservation) return;
    setIsConfirmOpen(false);
  };

  const handleQuantityChange = (rawValue: number) => {
    if (!Number.isFinite(rawValue)) return;

    let quantity = Math.max(1, Math.floor(rawValue));
    const maxAllowed = Math.min(MAX_BOOK_QUANTITY, Math.max(totalAvailable, 1));

    if (quantity > maxAllowed) {
      quantity = maxAllowed;
    }

    if (quantity > MAX_BOOK_QUANTITY) {
      setQuantityError(`Máximo ${MAX_BOOK_QUANTITY} unidades por libro.`);
    } else if (quantity > totalAvailable) {
      setQuantityError(
        'No hay suficientes unidades disponibles para esa cantidad.',
      );
    } else {
      setQuantityError(null);
    }

    setSelectedQuantity(quantity);
  };

  useEffect(() => {
    if (!book) {
      setSelectedQuantity(1);
      setQuantityError(null);
      return;
    }

    if (selectedQuantity > totalAvailable) {
      setSelectedQuantity(Math.max(1, totalAvailable));
    }
  }, [book, selectedQuantity, totalAvailable]);

  const handleConfirmReservation = async () => {
    if (!book) return;

    setIsSubmittingReservation(true);
    try {
      const response = await createReservation({
        items: [{ bookId: book.id, quantity: selectedQuantity }],
      });
      setReservationExpiration(response.expirationDate);
      setIsConfirmOpen(false);

      // Intentar agregar los items reservados al carrito del cliente
      try {
        const cartItemIds: number[] = [];
        for (const item of response.items) {
          try {
            const added = await addToCart(item.bookId, item.quantity);
            cartItemIds.push(added.cartItemId);
          } catch (cartErr) {
            console.error(
              'No se pudo agregar item reservado al carrito:',
              cartErr,
            );
          }
        }

        if (cartItemIds.length > 0) {
          addReservationCartMapping({
            reservationId: response.reservationId,
            cartItemIds,
            expirationDate: response.expirationDate,
          });
          window.dispatchEvent(new Event('cart:refresh'));
          window.dispatchEvent(new Event('reservations:refresh'));
        }
      } catch (mapErr) {
        console.error('Error mapeando reserva a carrito:', mapErr);
      }

      snackbar.success(
        'Libro agregado al carrito y reserva creada correctamente',
      );
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : 'No se pudo completar la reserva';
      snackbar.error(message);
    } finally {
      setIsSubmittingReservation(false);
    }
  };

  if (!Number.isFinite(bookId) || bookId <= 0) {
    return (
      <div className="w-full px-4 py-10 sm:py-12">
        <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-bg-secondary p-6">
          <p className="text-text">El identificador del libro no es valido.</p>
          <Link
            to="/catalog"
            className="mt-4 inline-flex text-babyblue-700 hover:underline"
          >
            Volver al catalogo
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full px-4 py-12 sm:py-16">
        <div className="mx-auto flex min-h-[55vh] max-w-6xl items-center justify-center rounded-3xl border border-border bg-bg-secondary shadow-sm">
          <Spinner
            size="lg"
            tone="calm"
            label="Cargando detalle del libro..."
            fullScreen={false}
          />
        </div>
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="w-full px-4 py-10 sm:py-12">
        <div className="mx-auto max-w-3xl rounded-2xl border border-danger-300/60 bg-bg-secondary p-6">
          <p className="text-danger-700">
            {error || 'No se pudo cargar este libro'}
          </p>
          <Link
            to="/catalog"
            className="mt-4 inline-flex text-babyblue-700 hover:underline"
          >
            Volver al catalogo
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 py-8 sm:py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <Link
          to="/catalog"
          className="inline-flex text-sm font-medium text-babyblue-700 hover:underline"
        >
          ← Volver al catalogo
        </Link>

        {reservationExpiration && (
          <div className="rounded-2xl border border-emerald-300/60 bg-emerald-50 p-4 text-emerald-900">
            Reserva confirmada. Expira el{' '}
            {formatExpiration(reservationExpiration)}.
          </div>
        )}

        <section className="grid gap-6 rounded-3xl border border-border bg-bg-secondary p-5 shadow-sm sm:p-6 lg:grid-cols-[320px_1fr]">
          <div className="overflow-hidden rounded-2xl bg-babyblue-300/50">
            {book.coverUrl && !imageFailed ? (
              <img
                src={book.coverUrl}
                alt={book.title}
                className="h-full w-full object-cover"
                onError={() => setImageFailed(true)}
              />
            ) : (
              <div className="flex h-full min-h-90 items-center justify-center">
                <img src="/inkoraICO.svg" alt="inkora" className="w-24" />
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                Ficha del libro
              </p>
              <h1 className="mt-2 text-3xl font-bold text-text">
                {book.title}
              </h1>
              <p className="mt-1 text-sm text-text-muted">{book.author}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-bg p-3">
                <p className="text-xs text-text-muted">Precio</p>
                <p className="text-xl font-semibold text-babyblue-700">
                  ${formatPrice(book.price)}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-bg p-3">
                <p className="text-xs text-text-muted">Disponibilidad total</p>
                <p className="text-xl font-semibold text-text">
                  {totalAvailable} ejemplares
                </p>
                <p className="mt-2 text-sm text-text-muted">
                  Quedarán {remainingAvailable} unidades tras agregar{' '}
                  {selectedQuantity}.
                </p>
              </div>
            </div>

            {book.description && (
              <p className="text-sm leading-6 text-text-muted">
                {book.description}
              </p>
            )}

            {isClientAuthenticated && (
              <div className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-3 rounded-2xl border border-border bg-bg p-3">
                    <button
                      type="button"
                      onClick={() => handleQuantityChange(selectedQuantity - 1)}
                      disabled={
                        selectedQuantity <= 1 || isSubmittingReservation
                      }
                      className="h-10 w-10 rounded-xl bg-bg text-lg font-semibold text-text transition hover:bg-border disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="Disminuir cantidad"
                    >
                      −
                    </button>
                    <div className="min-w-20 text-center">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                        Cantidad
                      </p>
                      <input
                        type="number"
                        min={1}
                        max={Math.max(
                          1,
                          Math.min(MAX_BOOK_QUANTITY, totalAvailable),
                        )}
                        value={selectedQuantity}
                        onChange={(e) =>
                          handleQuantityChange(Number(e.target.value))
                        }
                        disabled={isSubmittingReservation}
                        className="mt-1 w-full border-0 bg-transparent text-center text-lg font-black text-text outline-none ring-0 [appearance:textfield] focus:ring-0"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleQuantityChange(selectedQuantity + 1)}
                      disabled={
                        selectedQuantity >=
                          Math.min(MAX_BOOK_QUANTITY, totalAvailable) ||
                        isSubmittingReservation
                      }
                      className="h-10 w-10 rounded-xl bg-babyblue-600 text-lg font-semibold text-white transition hover:bg-babyblue-700 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label="Aumentar cantidad"
                    >
                      +
                    </button>
                  </div>

                  <div className="rounded-2xl border border-border bg-bg p-3 text-sm text-text-muted">
                    <p>Máximo {MAX_BOOK_QUANTITY} unidades por libro.</p>
                    <p>
                      {Math.min(MAX_BOOK_QUANTITY, totalAvailable)} disponibles
                      para agregar.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className="inline-flex w-full items-center justify-center rounded-full bg-babyblue-600 px-5 py-3 font-semibold text-white transition hover:bg-babyblue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={() => setIsConfirmOpen(true)}
                  disabled={addToCartDisabled}
                >
                  {isSubmittingReservation
                    ? 'Agregando al carrito...'
                    : `Agregar ${selectedQuantity} al carrito`}
                </button>

                {quantityError && (
                  <p className="text-sm text-danger-700">{quantityError}</p>
                )}

                {(!book.isAvailable || totalAvailable <= 0) && (
                  <p className="text-sm text-danger-700">
                    Este libro no se encuentra disponible para reserva en este
                    momento.
                  </p>
                )}
              </div>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-bg-secondary p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-semibold text-text">
            Disponibilidad por tienda
          </h2>
          {book.inventoriesByStore.length === 0 ? (
            <p className="mt-3 text-sm text-text-muted">
              No hay inventario configurado para este libro.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-text-muted">
                    <th className="px-2 py-2 font-medium">Tienda</th>
                    <th className="px-2 py-2 font-medium">Ciudad</th>
                    <th className="px-2 py-2 font-medium">Disponibles</th>
                  </tr>
                </thead>
                <tbody>
                  {book.inventoriesByStore.map((inventory) => (
                    <tr
                      key={inventory.storeId}
                      className="border-b border-border/70"
                    >
                      <td className="px-2 py-2 text-text">
                        {inventory.storeName}
                      </td>
                      <td className="px-2 py-2 text-text-muted">
                        {inventory.city}
                      </td>
                      <td className="px-2 py-2 font-semibold text-text">
                        {inventory.availableQuantity}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <ConfirmationModal
        isOpen={isConfirmOpen}
        title="Confirmar agregado al carrito"
        message="Este libro se agregará al carrito y se reservará por un maximo de 24 horas. Tras ese tiempo, si no compras, se liberará automaticamente."
        confirmText="Agregar y reservar"
        cancelText="Cancelar"
        onCancel={closeConfirmModal}
        onConfirm={() => {
          void handleConfirmReservation();
        }}
        isConfirmLoading={isSubmittingReservation}
      />
    </div>
  );
}

export default BookDetailPage;
