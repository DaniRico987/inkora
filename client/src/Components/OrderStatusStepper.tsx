import type { PurchaseStatus } from '../interfaces/PurchaseInterface';

type StepStatus = 'completed' | 'current' | 'pending';

type StepItem = {
  key: 'inPreparation' | 'shipped' | 'delivered';
  label: string;
};

interface OrderStatusStepperProps {
  status: PurchaseStatus;
}

const ORDER_STEPS: StepItem[] = [
  { key: 'inPreparation', label: 'En preparacion' },
  { key: 'shipped', label: 'Enviado' },
  { key: 'delivered', label: 'Entregado' },
];

const statusIndexMap: Record<'inPreparation' | 'shipped' | 'delivered', number> = {
  inPreparation: 0,
  shipped: 1,
  delivered: 2,
};

function resolveStepStatus(stepIndex: number, currentIndex: number): StepStatus {
  if (stepIndex < currentIndex) return 'completed';
  if (stepIndex === currentIndex) return 'current';
  return 'pending';
}

function getCircleClasses(stepStatus: StepStatus): string {
  if (stepStatus === 'completed') {
    return 'bg-emerald-600 text-white border-emerald-600';
  }
  if (stepStatus === 'current') {
    return 'bg-babyblue-600 text-white border-babyblue-600 shadow-lg shadow-babyblue-500/25';
  }
  return 'bg-bg text-text-muted border-border';
}

function getLabelClasses(stepStatus: StepStatus): string {
  if (stepStatus === 'completed') return 'text-emerald-700';
  if (stepStatus === 'current') return 'text-babyblue-700';
  return 'text-text-muted';
}

function isConnectorCompleted(
  leftIndex: number,
  currentIndex: number,
): boolean {
  return leftIndex < currentIndex;
}

export function OrderStatusStepper({ status }: OrderStatusStepperProps) {
  if (status === 'cancelled') {
    return (
      <section className="rounded-3xl border border-danger-300/60 bg-danger-50/80 p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-danger-700">
          Estado del pedido
        </p>
        <h3 className="mt-2 text-xl font-bold text-danger-800">Pedido cancelado</h3>
        <p className="mt-2 text-sm text-danger-700 sm:text-base">
          Este pedido fue cancelado y no continuara en el flujo de despacho.
        </p>
      </section>
    );
  }

  const currentIndex = statusIndexMap[status];

  return (
    <section className="rounded-3xl border border-border bg-bg-secondary p-5 shadow-sm sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
        Seguimiento del pedido
      </p>

      <ol className="mt-5 hidden grid-cols-3 gap-0 md:grid">
        {ORDER_STEPS.map((step, index) => {
          const stepStatus = resolveStepStatus(index, currentIndex);
          const connectorDone = isConnectorCompleted(index, currentIndex);

          return (
            <li key={step.key} className="relative flex flex-col items-center text-center">
              {index < ORDER_STEPS.length - 1 && (
                <span
                  className={[
                    'absolute left-1/2 top-5 h-0.5 w-full translate-x-0',
                    connectorDone ? 'bg-emerald-500' : 'bg-border',
                  ].join(' ')}
                  aria-hidden="true"
                />
              )}

              <span
                className={[
                  'relative z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-bold transition',
                  getCircleClasses(stepStatus),
                ].join(' ')}
              >
                {index + 1}
              </span>
              <span
                className={[
                  'mt-3 text-sm font-semibold',
                  getLabelClasses(stepStatus),
                ].join(' ')}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>

      <ol className="mt-5 space-y-4 md:hidden">
        {ORDER_STEPS.map((step, index) => {
          const stepStatus = resolveStepStatus(index, currentIndex);
          const connectorDone = isConnectorCompleted(index, currentIndex);

          return (
            <li key={step.key} className="relative flex items-start gap-3">
              <div className="flex flex-col items-center">
                <span
                  className={[
                    'inline-flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold',
                    getCircleClasses(stepStatus),
                  ].join(' ')}
                >
                  {index + 1}
                </span>
                {index < ORDER_STEPS.length - 1 && (
                  <span
                    className={[
                      'mt-1 h-8 w-0.5',
                      connectorDone ? 'bg-emerald-500' : 'bg-border',
                    ].join(' ')}
                    aria-hidden="true"
                  />
                )}
              </div>
              <div className="pt-1">
                <p className={['text-sm font-semibold', getLabelClasses(stepStatus)].join(' ')}>
                  {step.label}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
