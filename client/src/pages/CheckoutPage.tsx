import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { InputText, InputTextarea, InputSelect } from '../Components/Inputs';
import { Spinner } from '../Components/Spinner';
import { useSnackbar } from '../Components/SnackbarProvider';
import { createPurchase } from '../api/purchases';
import { useCart } from '../hooks/useCart';
import type { CartItem } from '../interfaces/CartInterface';
import type { Purchase } from '../interfaces/PurchaseInterface';

type CheckoutStep = 1 | 2 | 3 | 4;
type PaymentChoice = 'registered' | 'new';

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

type FieldErrors = Partial<Record<keyof AddressFormState | keyof PaymentFormState, string>>;

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
      return 'Dirección';
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

  const paymentSummary = useMemo(() => {
    if (paymentChoice === 'registered') {
      return 'Se cobrará sobre la tarjeta registrada en tu cuenta.';
    }

    const cardNumber = paymentForm.cardNumber.replace(/\D/g, '');
    return cardNumber.length >= 4
      ? `Tarjeta terminada en ${cardNumber.slice(-4)}`
      : 'Nueva tarjeta cargada manualmente.';
  }, [paymentChoice, paymentForm.cardNumber]);

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
    if (!validateAddressStep()) {
      snackbar.error('Corrige la dirección de envío para continuar');
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

  const submitPurchase = async () => {
    if (!validateAddressStep() || !validatePaymentStep()) {
      snackbar.error('Revisa los campos antes de confirmar la compra');
      return;
    }

    setIsSubmitting(true);
    try {
      const createdPurchase = await createPurchase({
        deliveryMode: 'homeDelivery',
        shippingAddress,
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
                  Revisa tu carrito, completa la dirección, elige cómo pagar y confirma la compra.
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
                    Continuar a dirección
                  </button>
                </div>
              </section>
            )}

            {currentStep === 2 && (
              <section className="rounded-4xl border border-border bg-bg-secondary p-6 shadow-sm sm:p-8">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">Paso 2</p>
                <h2 className="mt-2 text-2xl font-bold text-text">Dirección de envío</h2>
                <p className="mt-2 text-sm leading-6 text-text-muted">
                  Completa la dirección para calcular el envío y confirmar la compra.
                </p>

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
                  <p className="mt-2 text-sm leading-6 text-emerald-800">
                    {purchase.shippingAddress || shippingAddress}
                  </p>
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
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">Dirección</p>
                  <p className="mt-2 text-sm leading-6 text-text">{shippingAddress || 'Aún no completada'}</p>
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
