import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { InputText, InputTextarea, InputSelect } from '../Components/Inputs';
import { Spinner } from '../Components/Spinner';
import { useSnackbar } from '../Components/SnackbarProvider';
import { createPurchase } from '../api/purchases';
import { getAvailableStores, type AvailableStore } from '../api/stores';
import { useCart } from '../hooks/useCart';
import type { CartItem } from '../interfaces/CartInterface';
import type { Purchase } from '../interfaces/PurchaseInterface';

type CheckoutStep = 1 | 2 | 3 | 4;
type PaymentChoice = 'registered' | 'new';
type DeliveryChoice = 'homeDelivery' | 'storePickup';

type AddressFormState = {
  fullName: string;
  street: string;
  city: string;
  province: string;
  postalCode: string;
  notes: string;
};

type PaymentFormState = {
  cardholder: string;
  cardNumber: string;
  expiry: string;
  cvv: string;
};

type FieldErrors = Partial<Record<keyof AddressFormState | keyof PaymentFormState | 'pickupStoreId', string>>;

type PickupStoreOption = {
  storeId: number;
  name: string;
  address: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  capacity?: number | null;
  status?: 'active' | 'inactive';
  availableByBook: Record<number, number>;
  isFullyAvailable: boolean;
  coveredBooks: number;
  totalBooks: number;
  missingBooks: string[];
  totalAvailableQuantity: number;
};

function groupCartItemsByBook(items: CartItem[]): Map<number, { title: string; quantity: number }> {
  const grouped = new Map<number, { title: string; quantity: number }>();

  for (const item of items) {
    const current = grouped.get(item.bookId);
    if (current) {
      current.quantity += item.quantity;
      continue;
    }

    grouped.set(item.bookId, { title: item.title, quantity: item.quantity });
  }

  return grouped;
}

function buildPickupStoreOptions(
  requirements: Map<number, { title: string; quantity: number }>,
  storeResponses: Array<{ bookId: number; stores: AvailableStore[] }>,
): PickupStoreOption[] {
  const storeMap = new Map<
    number,
    {
      store: Omit<PickupStoreOption, 'availableByBook' | 'isFullyAvailable' | 'coveredBooks' | 'totalBooks' | 'missingBooks' | 'totalAvailableQuantity'>;
      availableByBook: Record<number, number>;
    }
  >();

  for (const { bookId, stores } of storeResponses) {
    for (const store of stores) {
      const current = storeMap.get(store.storeId);
      if (!current) {
        storeMap.set(store.storeId, {
          store: {
            storeId: store.storeId,
            name: store.name,
            address: store.address,
            city: store.city,
            latitude: typeof store.latitude === 'number' ? store.latitude : null,
            longitude: typeof store.longitude === 'number' ? store.longitude : null,
            capacity: store.capacity ?? null,
            status: store.status,
          },
          availableByBook: {},
        });
      }

      const next = storeMap.get(store.storeId)!;
      next.availableByBook[bookId] = store.availableQuantity;
    }
  }

  const result = [...storeMap.values()].map(({ store, availableByBook }) => {
    const missingBooks: string[] = [];
    let coveredBooks = 0;
    let totalAvailableQuantity = 0;

    for (const [bookId, requirement] of requirements.entries()) {
      const availableQuantity = availableByBook[bookId] ?? 0;
      totalAvailableQuantity += availableQuantity;

      if (availableQuantity >= requirement.quantity) {
        coveredBooks += 1;
        continue;
      }

      const shortage = requirement.quantity - availableQuantity;
      missingBooks.push(`${requirement.title} (${shortage} faltante${shortage > 1 ? 's' : ''})`);
    }

    return {
      ...store,
      availableByBook,
      isFullyAvailable: coveredBooks === requirements.size,
      coveredBooks,
      totalBooks: requirements.size,
      missingBooks,
      totalAvailableQuantity,
    } satisfies PickupStoreOption;
  });

  return result.sort((left, right) => {
    if (left.isFullyAvailable !== right.isFullyAvailable) {
      return left.isFullyAvailable ? -1 : 1;
    }

    if (left.coveredBooks !== right.coveredBooks) {
      return right.coveredBooks - left.coveredBooks;
    }

    if (left.totalAvailableQuantity !== right.totalAvailableQuantity) {
      return right.totalAvailableQuantity - left.totalAvailableQuantity;
    }

    return left.name.localeCompare(right.name, 'es');
  });
}

const initialAddressState: AddressFormState = {
  fullName: '',
  street: '',
  city: '',
  province: '',
  postalCode: '',
  notes: '',
};

const initialPaymentState: PaymentFormState = {
  cardholder: '',
  cardNumber: '',
  expiry: '',
  cvv: '',
};

const PAYMENT_METHODS: Array<{
  value: PaymentChoice;
  title: string;
  description: string;
}> = [
    {
      value: 'registered',
      title: 'Tarjeta registrada',
      description: 'Usa el medio guardado para confirmar el pedido sin volver a cargar datos.',
    },
    {
      value: 'new',
      title: 'Nueva tarjeta',
      description: 'Ingresa los datos de una tarjeta nueva para este checkout.',
    },
  ];

const PROVINCES = [
  'Buenos Aires',
  'CABA',
  'Córdoba',
  'Santa Fe',
  'Mendoza',
  'Tucumán',
  'Otra',
];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(value);
}

function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

function composeShippingAddress(address: AddressFormState): string {
  const segments = [
    address.fullName.trim(),
    address.street.trim(),
    address.city.trim(),
    address.province.trim(),
    address.postalCode.trim(),
  ].filter(Boolean);

  const baseAddress = segments.join(' · ');
  const notes = address.notes.trim();

  return notes ? `${baseAddress} · ${notes}` : baseAddress;
}

function getStepLabel(step: CheckoutStep): string {
  switch (step) {
    case 1:
      return 'Resumen';
    case 2:
      return 'Entrega';
    case 3:
      return 'Pago';
    case 4:
    default:
      return 'Confirmación';
  }
}

function getStepState(step: CheckoutStep, current: CheckoutStep): 'completed' | 'current' | 'pending' {
  if (step < current) return 'completed';
  if (step === current) return 'current';
  return 'pending';
}

function CheckoutStepper({ currentStep }: { currentStep: CheckoutStep }) {
  const steps: CheckoutStep[] = [1, 2, 3, 4];

  return (
    <ol className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {steps.map((step) => {
        const state = getStepState(step, currentStep);
        const isCompleted = state === 'completed';
        const isCurrent = state === 'current';

        return (
          <li
            key={step}
            className={[
              'rounded-2xl border px-4 py-3 transition',
              isCurrent ? 'border-babyblue-400 bg-babyblue-50/70 shadow-sm' : 'border-border bg-bg-secondary',
            ].join(' ')}
          >
            <div className="flex items-center gap-3">
              <span
                className={[
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-bold',
                  isCompleted
                    ? 'border-emerald-500 bg-emerald-500 text-white'
                    : isCurrent
                      ? 'border-babyblue-600 bg-babyblue-600 text-white'
                      : 'border-border bg-bg text-text-muted',
                ].join(' ')}
              >
                {step}
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                  Paso {step}
                </p>
                <p className={['text-sm font-bold', isCurrent ? 'text-babyblue-700' : 'text-text'].join(' ')}>
                  {getStepLabel(step)}
                </p>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function CartLine({ item }: { item: CartItem }) {
  return (
    <div className="flex flex-col gap-3 rounded-3xl border border-border bg-bg p-4 shadow-sm sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <p className="truncate text-base font-semibold text-text">{item.title}</p>
        <p className="mt-1 text-sm text-text-muted">
          {item.author} · {item.quantity} x {formatCurrency(item.unitPrice)}
        </p>
      </div>
      <div className="text-left sm:text-right">
        <p className="text-sm text-text-muted">Subtotal</p>
        <p className="text-lg font-bold text-text">{formatCurrency(item.subtotal)}</p>
      </div>
    </div>
  );
}

export function CheckoutPage() {
  const snackbar = useSnackbar();
  const { cart, loading: cartLoading, error: cartError, loadCart } = useCart();
  const [currentStep, setCurrentStep] = useState<CheckoutStep>(1);
  const [addressForm, setAddressForm] = useState<AddressFormState>(initialAddressState);
  const [deliveryMode, setDeliveryMode] = useState<DeliveryChoice>('homeDelivery');
  const [pickupStoreId, setPickupStoreId] = useState<number | null>(null);
  const [pickupStores, setPickupStores] = useState<PickupStoreOption[]>([]);
  const [pickupStoresLoading, setPickupStoresLoading] = useState(false);
  const [pickupStoresError, setPickupStoresError] = useState<string | null>(null);
  const [paymentChoice, setPaymentChoice] = useState<PaymentChoice>('registered');
  const [paymentForm, setPaymentForm] = useState<PaymentFormState>(initialPaymentState);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [purchase, setPurchase] = useState<Purchase | null>(null);

  const cartItems = cart?.items ?? [];
  const subtotal = cart?.subtotal ?? 0;
  const total = cart?.total ?? 0;
  const tax = cart?.tax ?? 0;
  const hasItems = cartItems.length > 0;
  const shippingAddress = useMemo(() => composeShippingAddress(addressForm), [addressForm]);
  const paymentMethodLabel = paymentChoice === 'registered' ? 'Tarjeta registrada' : 'Nueva tarjeta';
  const requiredByBook = useMemo(() => groupCartItemsByBook(cartItems), [cartItems]);
  const selectedPickupStore = useMemo(
    () => pickupStores.find((store) => store.storeId === pickupStoreId) ?? null,
    [pickupStores, pickupStoreId],
  );
  const fullyAvailablePickupStores = useMemo(
    () => pickupStores.filter((store) => store.isFullyAvailable),
    [pickupStores],
  );

  useEffect(() => {
    if (deliveryMode !== 'storePickup' || requiredByBook.size === 0) {
      setPickupStores([]);
      setPickupStoresError(null);
      setPickupStoresLoading(false);
      return;
    }

    let cancelled = false;

    const loadPickupStores = async () => {
      setPickupStoresLoading(true);
      setPickupStoresError(null);

      try {
        const responses = await Promise.all(
          [...requiredByBook.keys()].map(async (bookId) => ({
            bookId,
            stores: await getAvailableStores(bookId),
          })),
        );

        if (cancelled) return;

        const options = buildPickupStoreOptions(requiredByBook, responses);
        setPickupStores(options);

        setPickupStoreId((current) => {
          if (current && options.some((store) => store.storeId === current && store.isFullyAvailable)) {
            return current;
          }

          return options.find((store) => store.isFullyAvailable)?.storeId ?? null;
        });
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : 'No se pudieron cargar las tiendas disponibles';
          setPickupStoresError(message);
          setPickupStores([]);
          setPickupStoreId(null);
        }
      } finally {
        if (!cancelled) {
          setPickupStoresLoading(false);
        }
      }
    };

    void loadPickupStores();

    return () => {
      cancelled = true;
    };
  }, [deliveryMode, requiredByBook]);

  const paymentSummary = useMemo(() => {
    if (paymentChoice === 'registered') {
      return 'Se cobrará sobre la tarjeta registrada en tu cuenta.';
    }

    const cardNumber = paymentForm.cardNumber.replace(/\D/g, '');
    return cardNumber.length >= 4
      ? `Tarjeta terminada en ${cardNumber.slice(-4)}`
      : 'Nueva tarjeta cargada manualmente.';
  }, [paymentChoice, paymentForm.cardNumber]);

  const deliverySummary = useMemo(() => {
    if (deliveryMode === 'homeDelivery') {
      return shippingAddress || 'Aún no completada';
    }

    if (selectedPickupStore) {
      return `${selectedPickupStore.name} · ${selectedPickupStore.address} · ${selectedPickupStore.city}`;
    }

    return 'Selecciona una tienda disponible';
  }, [deliveryMode, selectedPickupStore, shippingAddress]);

  const updateAddressField = (field: keyof AddressFormState, value: string) => {
    setAddressForm((prev) => ({ ...prev, [field]: value }));
  };

  const updatePaymentField = (field: keyof PaymentFormState, value: string) => {
    if (field === 'cardNumber') {
      setPaymentForm((prev) => ({ ...prev, cardNumber: formatCardNumber(value) }));
      return;
    }

    if (field === 'cvv') {
      const sanitized = value.replace(/\D/g, '').slice(0, 4);
      setPaymentForm((prev) => ({ ...prev, cvv: sanitized }));
      return;
    }

    if (field === 'expiry') {
      const digits = value.replace(/\D/g, '').slice(0, 4);
      const formatted = digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
      setPaymentForm((prev) => ({ ...prev, expiry: formatted }));
      return;
    }

    setPaymentForm((prev) => ({ ...prev, [field]: value }));
  };

  const validateAddressStep = (): boolean => {
    const nextErrors: FieldErrors = {};

    if (addressForm.fullName.trim().length < 3) {
      nextErrors.fullName = 'Ingresa nombre y apellido del destinatario';
    }

    if (addressForm.street.trim().length < 8) {
      nextErrors.street = 'La dirección debe incluir calle y altura';
    }

    if (addressForm.city.trim().length < 2) {
      nextErrors.city = 'Ingresa una ciudad válida';
    }

    if (!addressForm.province.trim()) {
      nextErrors.province = 'Selecciona una provincia';
    }

    if (!/^\d{4,5}$/.test(addressForm.postalCode.trim())) {
      nextErrors.postalCode = 'El código postal debe tener 4 o 5 dígitos';
    }

    setFieldErrors((prev) => ({ ...prev, ...nextErrors }));
    return Object.keys(nextErrors).length === 0;
  };

  const validatePickupStep = (): boolean => {
    const nextErrors: FieldErrors = {};

    if (!pickupStoreId) {
      nextErrors.pickupStoreId = 'Selecciona una tienda con stock suficiente para continuar';
    } else if (!selectedPickupStore?.isFullyAvailable) {
      nextErrors.pickupStoreId = 'La tienda seleccionada no cubre todo el carrito';
    }

    setFieldErrors((prev) => ({ ...prev, ...nextErrors }));
    return Object.keys(nextErrors).length === 0;
  };

  const validatePaymentStep = (): boolean => {
    const nextErrors: FieldErrors = {};

    if (paymentChoice === 'new') {
      if (paymentForm.cardholder.trim().length < 3) {
        nextErrors.cardholder = 'Ingresa el nombre como figura en la tarjeta';
      }

      if (!/^\d{13,19}$/.test(paymentForm.cardNumber.replace(/\s/g, ''))) {
        nextErrors.cardNumber = 'El número de tarjeta no es válido';
      }

      if (!/^\d{2}\/\d{2}$/.test(paymentForm.expiry.trim())) {
        nextErrors.expiry = 'Usa formato MM/AA';
      }

      if (!/^\d{3,4}$/.test(paymentForm.cvv.trim())) {
        nextErrors.cvv = 'El CVV debe tener 3 o 4 dígitos';
      }
    }

    setFieldErrors((prev) => ({ ...prev, ...nextErrors }));
    return Object.keys(nextErrors).length === 0;
  };

  const goToAddressStep = () => {
    if (!hasItems) return;
    setCurrentStep(2);
  };

  const goToPaymentStep = () => {
    if (deliveryMode === 'homeDelivery') {
      if (!validateAddressStep()) {
        snackbar.error('Corrige la dirección de envío para continuar');
        return;
      }
    } else if (!validatePickupStep()) {
      snackbar.error('Selecciona una tienda con stock suficiente para continuar');
      return;
    }

    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.fullName;
      delete next.street;
      delete next.city;
      delete next.province;
      delete next.postalCode;
      return next;
    });
    setCurrentStep(3);
  };

  const handlePaymentChoiceChange = (choice: PaymentChoice) => {
    setPaymentChoice(choice);
    if (choice === 'registered') {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.cardholder;
        delete next.cardNumber;
        delete next.expiry;
        delete next.cvv;
        return next;
      });
    }
  };

  const handleDeliveryModeChange = (mode: DeliveryChoice) => {
    setDeliveryMode(mode);
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.pickupStoreId;
      delete next.fullName;
      delete next.street;
      delete next.city;
      delete next.province;
      delete next.postalCode;
      return next;
    });

    if (mode === 'homeDelivery') {
      setPickupStoreId(null);
    }
  };

  const submitPurchase = async () => {
    const deliveryValid = deliveryMode === 'homeDelivery' ? validateAddressStep() : validatePickupStep();

    if (!deliveryValid || !validatePaymentStep()) {
      snackbar.error('Revisa los campos antes de confirmar la compra');
      return;
    }

    setIsSubmitting(true);
    try {
      const createdPurchase = await createPurchase({
        deliveryMode,
        pickupStoreId: deliveryMode === 'storePickup' ? pickupStoreId ?? undefined : undefined,
        shippingAddress: deliveryMode === 'homeDelivery' ? shippingAddress : undefined,
        paymentMethod: paymentMethodLabel,
      });

      setPurchase(createdPurchase);
      setCurrentStep(4);
      await loadCart();
      snackbar.success(`Compra confirmada. Pedido #${createdPurchase.purchaseId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo confirmar la compra';
      snackbar.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (cartLoading) {
    return (
      <div className="w-full px-4 py-12 sm:py-16">
        <div className="mx-auto flex min-h-[60vh] max-w-5xl items-center justify-center rounded-4xl border border-border bg-bg-secondary shadow-sm">
          <Spinner size="lg" tone="calm" label="Preparando tu checkout..." fullScreen={false} />
        </div>
      </div>
    );
  }

  if (cartError) {
    return (
      <div className="w-full px-4 py-10 sm:py-12">
        <div className="mx-auto max-w-3xl rounded-4xl border border-danger-300/60 bg-bg-secondary p-7 shadow-sm sm:p-8">
          <div className="inline-flex rounded-full bg-danger-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-danger-700">
            Checkout no disponible
          </div>
          <h1 className="mt-4 text-3xl font-bold text-text">No pudimos cargar tu carrito</h1>
          <p className="mt-3 text-sm leading-6 text-text-muted sm:text-base">{cartError}</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => void loadCart()}
              className="inline-flex items-center justify-center rounded-full bg-babyblue-600 px-5 py-3 font-semibold text-white transition hover:bg-babyblue-700"
            >
              Reintentar
            </button>
            <Link
              to="/cart"
              className="inline-flex items-center justify-center rounded-full border border-border bg-bg px-5 py-3 font-semibold text-text transition hover:border-babyblue-300 hover:text-babyblue-700"
            >
              Volver al carrito
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!hasItems && currentStep < 4) {
    return (
      <div className="w-full px-4 py-10 sm:py-12">
        <div className="mx-auto max-w-3xl rounded-4xl border border-border bg-bg-secondary p-8 shadow-sm sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-babyblue-700">Checkout</p>
          <h1 className="mt-3 text-3xl font-bold text-text">Tu carrito está vacío</h1>
          <p className="mt-3 text-sm leading-6 text-text-muted">
            Agrega libros al carrito antes de iniciar el flujo de pago.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/cart"
              className="inline-flex items-center justify-center rounded-full bg-babyblue-600 px-5 py-3 font-semibold text-white transition hover:bg-babyblue-700"
            >
              Ir al carrito
            </Link>
            <Link
              to="/catalog"
              className="inline-flex items-center justify-center rounded-full border border-border bg-bg px-5 py-3 font-semibold text-text transition hover:border-babyblue-300 hover:text-babyblue-700"
            >
              Seguir comprando
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 py-8 sm:py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-4xl border border-border bg-linear-to-br from-bg-secondary via-bg-secondary to-babyblue-50/40 shadow-sm">
          <div className="grid gap-0 lg:grid-cols-[1.25fr_0.75fr]">
            <div className="space-y-6 p-6 sm:p-8">
              <div className="inline-flex rounded-full border border-border bg-bg px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
                Checkout en 4 pasos
              </div>
              <div className="space-y-3">
                <h1 className="text-3xl font-black tracking-tight text-text sm:text-4xl">
                  Finaliza tu compra sin perder el contexto.
                </h1>
                <p className="max-w-2xl text-sm leading-6 text-text-muted sm:text-base">
                  Revisa tu carrito, elige envío a domicilio o recogida en tienda, completa los datos y confirma la compra.
                </p>
              </div>

              <CheckoutStepper currentStep={currentStep} />
            </div>

            <div className="border-t border-border bg-bg-secondary p-6 sm:p-8 lg:border-l lg:border-t-0">
              <div className="rounded-[1.75rem] border border-border bg-bg p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">Resumen rápido</p>
                <div className="mt-4 space-y-3 text-sm text-text-muted">
                  <div className="flex items-center justify-between gap-4">
                    <span>Subtotal</span>
                    <strong className="text-text">{formatCurrency(subtotal)}</strong>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span>Impuestos</span>
                    <strong className="text-text">{formatCurrency(tax)}</strong>
                  </div>
                  <div className="h-px bg-border" />
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-base font-semibold text-text-muted">Total</span>
                    <strong className="text-2xl font-black text-metallicgold-700">{formatCurrency(total)}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.95fr)]">
          <div className="space-y-6">
            {currentStep === 1 && (
              <section className="rounded-4xl border border-border bg-bg-secondary p-6 shadow-sm sm:p-8">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">Paso 1</p>
                    <h2 className="mt-2 text-2xl font-bold text-text">Resumen del carrito</h2>
                    <p className="mt-2 text-sm leading-6 text-text-muted">
                      Verifica que el contenido y los importes sean correctos antes de avanzar.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border bg-bg px-4 py-3 text-left sm:text-right">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-text-muted">Items</p>
                    <p className="text-2xl font-black text-text">{cart?.itemCount ?? 0}</p>
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  {cartItems.map((item) => (
                    <CartLine key={item.cartItemId} item={item} />
                  ))}
                </div>

                <div className="mt-6 grid gap-4 rounded-3xl border border-border bg-bg p-5 sm:grid-cols-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">Subtotal</p>
                    <p className="mt-2 text-xl font-bold text-text">{formatCurrency(subtotal)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">Impuestos</p>
                    <p className="mt-2 text-xl font-bold text-text">{formatCurrency(tax)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">Total</p>
                    <p className="mt-2 text-2xl font-black text-metallicgold-700">{formatCurrency(total)}</p>
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Link
                    to="/cart"
                    className="inline-flex items-center justify-center rounded-full border border-border bg-bg px-5 py-3 font-semibold text-text transition hover:border-babyblue-300 hover:text-babyblue-700"
                  >
                    Volver al carrito
                  </Link>
                  <button
                    type="button"
                    onClick={goToAddressStep}
                    className="inline-flex items-center justify-center rounded-full bg-babyblue-600 px-5 py-3 font-semibold text-white transition hover:bg-babyblue-700"
                  >
                    Continuar a entrega
                  </button>
                </div>
              </section>
            )}

            {currentStep === 2 && (
              <section className="rounded-4xl border border-border bg-bg-secondary p-6 shadow-sm sm:p-8">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">Paso 2</p>
                <h2 className="mt-2 text-2xl font-bold text-text">Entrega</h2>
                <p className="mt-2 text-sm leading-6 text-text-muted">
                  Elige envío a domicilio o recogida en tienda antes de pasar al pago.
                </p>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {([
                    {
                      value: 'homeDelivery',
                      title: 'Envío a domicilio',
                      description: 'Recibe el pedido en la dirección que cargues en el checkout.',
                    },
                    {
                      value: 'storePickup',
                      title: 'Recoger en tienda',
                      description: 'Retira tu compra en una sucursal con stock disponible.',
                    },
                  ] as const).map((option) => {
                    const isActive = deliveryMode === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleDeliveryModeChange(option.value)}
                        className={[
                          'rounded-3xl border p-4 text-left transition',
                          isActive
                            ? 'border-babyblue-400 bg-babyblue-50/80 shadow-sm'
                            : 'border-border bg-bg hover:border-babyblue-300',
                        ].join(' ')}
                      >
                        <div className="flex items-start gap-4">
                          <span
                            className={[
                              'mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
                              isActive ? 'border-babyblue-600 bg-babyblue-600' : 'border-border bg-bg',
                            ].join(' ')}
                            aria-hidden="true"
                          >
                            {isActive && <span className="h-2.5 w-2.5 rounded-full bg-white" />}
                          </span>
                          <div>
                            <p className="text-base font-bold text-text">{option.title}</p>
                            <p className="mt-1 text-sm leading-6 text-text-muted">{option.description}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {deliveryMode === 'homeDelivery' ? (
                  <>
                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <InputText
                          label="Nombre y apellido del destinatario"
                          value={addressForm.fullName}
                          onChange={(event) => updateAddressField('fullName', event.target.value)}
                          autoComplete="name"
                          maxLength={80}
                          required
                        />
                        {fieldErrors.fullName && <p className="-mt-3 mb-3 text-sm text-red-600">{fieldErrors.fullName}</p>}
                      </div>

                      <div className="sm:col-span-2">
                        <InputText
                          label="Calle y altura"
                          value={addressForm.street}
                          onChange={(event) => updateAddressField('street', event.target.value)}
                          autoComplete="street-address"
                          maxLength={120}
                          required
                        />
                        {fieldErrors.street && <p className="-mt-3 mb-3 text-sm text-red-600">{fieldErrors.street}</p>}
                      </div>

                      <div>
                        <InputText
                          label="Ciudad"
                          value={addressForm.city}
                          onChange={(event) => updateAddressField('city', event.target.value)}
                          autoComplete="address-level2"
                          maxLength={60}
                          required
                        />
                        {fieldErrors.city && <p className="-mt-3 mb-3 text-sm text-red-600">{fieldErrors.city}</p>}
                      </div>

                      <div>
                        <InputSelect
                          label="Provincia"
                          value={addressForm.province}
                          onChange={(event) => updateAddressField('province', event.target.value)}
                          options={['', ...PROVINCES].map((province) => ({
                            label: province || 'Seleccionar provincia',
                            value: province,
                          }))}
                          required
                        />
                        {fieldErrors.province && <p className="-mt-3 mb-3 text-sm text-red-600">{fieldErrors.province}</p>}
                      </div>

                      <div>
                        <InputText
                          label="Código postal"
                          value={addressForm.postalCode}
                          onChange={(event) => updateAddressField('postalCode', event.target.value)}
                          autoComplete="postal-code"
                          maxLength={5}
                          inputMode="numeric"
                          required
                        />
                        {fieldErrors.postalCode && <p className="-mt-3 mb-3 text-sm text-red-600">{fieldErrors.postalCode}</p>}
                      </div>

                      <div className="sm:col-span-2">
                        <InputTextarea
                          label="Indicaciones opcionales"
                          value={addressForm.notes}
                          onChange={(event) => updateAddressField('notes', event.target.value)}
                          maxLength={255}
                          placeholder="Portería, piso, horario de entrega..."
                        />
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl border border-border bg-bg p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">Vista previa</p>
                      <p className="mt-2 text-sm leading-6 text-text">{shippingAddress || 'Completa los campos para ver la dirección formateada.'}</p>
                    </div>
                  </>
                ) : (
                  <div className="mt-6 space-y-4">
                    <div className="rounded-3xl border border-babyblue-200 bg-babyblue-50/70 p-4 text-sm text-babyblue-900">
                      <p className="font-semibold">Selecciona una tienda con stock suficiente</p>
                      <p className="mt-1 leading-6">
                        Solo podrás confirmar la compra en una sucursal que cubra todo el carrito. Si no hay una opción válida,
                        te sugerimos cambiar a envío a domicilio.
                      </p>
                    </div>

                    {pickupStoresLoading ? (
                      <div className="rounded-3xl border border-border bg-bg p-6">
                        <Spinner size="md" tone="calm" label="Buscando tiendas disponibles..." fullScreen={false} />
                      </div>
                    ) : pickupStoresError ? (
                      <div className="rounded-3xl border border-danger-200 bg-danger-50 p-4 text-sm text-danger-800">
                        {pickupStoresError}
                      </div>
                    ) : pickupStores.length === 0 ? (
                      <div className="rounded-3xl border border-border bg-bg p-5 text-sm text-text-muted">
                        No encontramos tiendas con stock para recoger este carrito. Puedes continuar con envío a domicilio.
                      </div>
                    ) : (
                      <>
                        {pickupStores.some((store) => !store.isFullyAvailable) && (
                          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                            Algunas tiendas tienen stock parcial. Las marcadas en rojo no cubren todo el carrito y no se pueden seleccionar.
                          </div>
                        )}

                        <div className="grid gap-3 lg:grid-cols-2">
                          {pickupStores.map((store) => {
                            const isSelected = selectedPickupStore?.storeId === store.storeId;
                            const isSelectable = store.isFullyAvailable;

                            return (
                              <button
                                key={store.storeId}
                                type="button"
                                onClick={() => {
                                  if (isSelectable) {
                                    setPickupStoreId(store.storeId);
                                  }
                                }}
                                className={[
                                  'rounded-3xl border p-4 text-left transition',
                                  isSelectable
                                    ? isSelected
                                      ? 'border-emerald-400 bg-emerald-50/70 shadow-sm'
                                      : 'border-border bg-bg hover:border-babyblue-300'
                                    : 'border-red-300 bg-red-50/70 opacity-90',
                                ].join(' ')}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="text-base font-bold text-text">{store.name}</p>
                                    <p className="mt-1 text-sm text-text-muted">{store.address}</p>
                                    <p className="text-sm text-text-muted">{store.city}</p>
                                  </div>
                                  <span
                                    className={[
                                      'rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em]',
                                      isSelectable ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700',
                                    ].join(' ')}
                                  >
                                    {isSelectable ? 'Disponible' : 'Sin stock suficiente'}
                                  </span>
                                </div>

                                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                                  <span className="rounded-full bg-bg px-3 py-1 text-text-muted">
                                    {store.coveredBooks}/{store.totalBooks} libros cubiertos
                                  </span>
                                  <span className="rounded-full bg-bg px-3 py-1 text-text-muted">
                                    {store.totalAvailableQuantity} unidades disponibles
                                  </span>
                                </div>

                                {!isSelectable && store.missingBooks.length > 0 && (
                                  <div className="mt-4 rounded-2xl border border-red-200 bg-white/80 p-3 text-sm text-red-700">
                                    Falta stock para: {store.missingBooks.join(', ')}
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {!fullyAvailablePickupStores.length && (
                          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                            No hay ninguna tienda que cubra todo el carrito. Te sugerimos cambiar a envío a domicilio para continuar.
                          </div>
                        )}

                        {fieldErrors.pickupStoreId && <p className="text-sm text-red-600">{fieldErrors.pickupStoreId}</p>}
                      </>
                    )}
                  </div>
                )}

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="inline-flex items-center justify-center rounded-full border border-border bg-bg px-5 py-3 font-semibold text-text transition hover:border-babyblue-300 hover:text-babyblue-700"
                  >
                    Volver
                  </button>
                  <button
                    type="button"
                    onClick={goToPaymentStep}
                    className="inline-flex items-center justify-center rounded-full bg-babyblue-600 px-5 py-3 font-semibold text-white transition hover:bg-babyblue-700"
                  >
                    Continuar al pago
                  </button>
                </div>
              </section>
            )}

            {currentStep === 3 && (
              <section className="rounded-4xl border border-border bg-bg-secondary p-6 shadow-sm sm:p-8">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">Paso 3</p>
                <h2 className="mt-2 text-2xl font-bold text-text">Método de pago</h2>
                <p className="mt-2 text-sm leading-6 text-text-muted">
                  Elige si usarás una tarjeta registrada o si vas a cargar una nueva tarjeta para este pedido.
                </p>

                <div className="mt-6 space-y-3">
                  {PAYMENT_METHODS.map((method) => {
                    const isActive = paymentChoice === method.value;

                    return (
                      <button
                        key={method.value}
                        type="button"
                        onClick={() => handlePaymentChoiceChange(method.value)}
                        className={[
                          'w-full rounded-3xl border p-4 text-left transition',
                          isActive
                            ? 'border-babyblue-400 bg-babyblue-50/80 shadow-sm'
                            : 'border-border bg-bg hover:border-babyblue-300',
                        ].join(' ')}
                      >
                        <div className="flex items-start gap-4">
                          <span
                            className={[
                              'mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
                              isActive
                                ? 'border-babyblue-600 bg-babyblue-600'
                                : 'border-border bg-bg',
                            ].join(' ')}
                            aria-hidden="true"
                          >
                            {isActive && <span className="h-2.5 w-2.5 rounded-full bg-white" />}
                          </span>
                          <div>
                            <p className="text-base font-bold text-text">{method.title}</p>
                            <p className="mt-1 text-sm leading-6 text-text-muted">{method.description}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {paymentChoice === 'new' && (
                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <InputText
                        label="Titular de la tarjeta"
                        value={paymentForm.cardholder}
                        onChange={(event) => updatePaymentField('cardholder', event.target.value)}
                        autoComplete="cc-name"
                        maxLength={80}
                        required
                      />
                      {fieldErrors.cardholder && <p className="-mt-3 mb-3 text-sm text-red-600">{fieldErrors.cardholder}</p>}
                    </div>

                    <div className="sm:col-span-2">
                      <InputText
                        label="Número de tarjeta"
                        value={paymentForm.cardNumber}
                        onChange={(event) => updatePaymentField('cardNumber', event.target.value)}
                        autoComplete="cc-number"
                        maxLength={19}
                        inputMode="numeric"
                        required
                      />
                      {fieldErrors.cardNumber && <p className="-mt-3 mb-3 text-sm text-red-600">{fieldErrors.cardNumber}</p>}
                    </div>

                    <div>
                      <InputText
                        label="Vencimiento"
                        value={paymentForm.expiry}
                        onChange={(event) => updatePaymentField('expiry', event.target.value)}
                        placeholder="MM/AA"
                        autoComplete="cc-exp"
                        maxLength={5}
                        required
                      />
                      {fieldErrors.expiry && <p className="-mt-3 mb-3 text-sm text-red-600">{fieldErrors.expiry}</p>}
                    </div>

                    <div>
                      <InputText
                        label="CVV"
                        value={paymentForm.cvv}
                        onChange={(event) => updatePaymentField('cvv', event.target.value)}
                        autoComplete="cc-csc"
                        maxLength={4}
                        inputMode="numeric"
                        required
                      />
                      {fieldErrors.cvv && <p className="-mt-3 mb-3 text-sm text-red-600">{fieldErrors.cvv}</p>}
                    </div>
                  </div>
                )}

                <div className="mt-6 rounded-3xl border border-border bg-bg p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">Método seleccionado</p>
                  <p className="mt-2 text-sm font-semibold text-text">{paymentMethodLabel}</p>
                  <p className="mt-1 text-sm leading-6 text-text-muted">{paymentSummary}</p>
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="inline-flex items-center justify-center rounded-full border border-border bg-bg px-5 py-3 font-semibold text-text transition hover:border-babyblue-300 hover:text-babyblue-700"
                  >
                    Volver
                  </button>
                  <button
                    type="button"
                    onClick={submitPurchase}
                    disabled={isSubmitting}
                    className="inline-flex items-center justify-center rounded-full bg-metallicgold-600 px-5 py-3 font-semibold text-white transition hover:bg-metallicgold-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? 'Procesando compra...' : 'Confirmar compra'}
                  </button>
                </div>
              </section>
            )}

            {currentStep === 4 && purchase && (
              <section className="overflow-hidden rounded-4xl border border-emerald-300/70 bg-emerald-50 p-6 shadow-sm sm:p-8">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Paso 4</p>
                <h2 className="mt-3 text-3xl font-black text-emerald-900">Compra confirmada</h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-800 sm:text-base">
                  Tu pedido se procesó correctamente y recibirás la factura por correo.
                </p>

                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-3xl border border-emerald-200 bg-white/70 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Número de pedido</p>
                    <p className="mt-2 text-2xl font-black text-emerald-900">#{purchase.purchaseId}</p>
                  </div>
                  <div className="rounded-3xl border border-emerald-200 bg-white/70 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Total abonado</p>
                    <p className="mt-2 text-2xl font-black text-emerald-900">{formatCurrency(purchase.totalAmount)}</p>
                  </div>
                  <div className="rounded-3xl border border-emerald-200 bg-white/70 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Estado</p>
                    <p className="mt-2 text-2xl font-black text-emerald-900">En preparación</p>
                  </div>
                </div>

                <div className="mt-6 rounded-3xl border border-emerald-200 bg-white/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Resumen del pago</p>
                  <p className="mt-2 text-sm leading-6 text-emerald-800">
                    {paymentMethodLabel} · {paymentSummary}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-emerald-800">{purchase.shippingAddress || deliverySummary}</p>
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Link
                    to={`/orders/${purchase.purchaseId}`}
                    className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-5 py-3 font-semibold text-white transition hover:bg-emerald-700"
                  >
                    Ver pedido
                  </Link>
                  <Link
                    to="/catalog"
                    className="inline-flex items-center justify-center rounded-full border border-border bg-bg px-5 py-3 font-semibold text-text transition hover:border-babyblue-300 hover:text-babyblue-700"
                  >
                    Seguir comprando
                  </Link>
                </div>
              </section>
            )}
          </div>

          <div className="space-y-6">
            <section className="rounded-4xl border border-border bg-bg-secondary p-6 shadow-sm sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">Vista previa</p>
              <div className="mt-4 space-y-4">
                <div className="rounded-3xl border border-border bg-bg p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                    {deliveryMode === 'homeDelivery' ? 'Dirección' : 'Tienda seleccionada'}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-text">
                    {deliveryMode === 'homeDelivery' ? shippingAddress || 'Aún no completada' : deliverySummary}
                  </p>
                </div>
                <div className="rounded-3xl border border-border bg-bg p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">Pago</p>
                  <p className="mt-2 text-sm font-semibold text-text">{paymentMethodLabel}</p>
                  <p className="mt-1 text-sm leading-6 text-text-muted">{paymentSummary}</p>
                </div>
                <div className="rounded-3xl border border-border bg-bg p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">Total a cobrar</p>
                  <p className="mt-2 text-3xl font-black text-metallicgold-700">{formatCurrency(total)}</p>
                </div>
              </div>
            </section>

            <section className="rounded-4xl border border-border bg-bg-secondary p-6 shadow-sm sm:p-8">
              <h3 className="text-lg font-bold text-text">Ayuda rápida</h3>
              <ul className="mt-3 space-y-3 text-sm leading-6 text-text-muted">
                <li>• Si el stock cambia antes de confirmar, verás un error al procesar.</li>
                <li>• La compra queda en estado <span className="font-semibold text-text">inPreparation</span>.</li>
                <li>• La factura se envía por correo apenas se confirma el pedido.</li>
              </ul>
            </section>
          </div>
        </div>

        {isSubmitting && (
          <div className="fixed inset-0 z-9998 flex items-center justify-center bg-black/45 px-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-4xl border border-border bg-bg-secondary/95 px-6 py-8 shadow-2xl">
              <Spinner size="lg" tone="calm" label="Procesando tu compra..." fullScreen={false} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
