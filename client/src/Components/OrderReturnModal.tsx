import { FormModal } from './FormModal';
import type { ReturnReason } from '../api/purchases';

interface OrderReturnModalProps {
  isOpen: boolean;
  purchaseId: number;
  onClose: () => void;
  onSubmit: (payload: {
    reason: ReturnReason;
    additionalDescription?: string;
  }) => Promise<void>;
  isLoading?: boolean;
}

type ReturnReasonOption = {
  value: ReturnReason;
  title: string;
  description: string;
};

const RETURN_REASON_OPTIONS: ReturnReasonOption[] = [
  {
    value: 'badCondition',
    title: 'Producto en mal estado',
    description: 'El libro presenta defectos, golpes, paginas faltantes o danos visibles.',
  },
  {
    value: 'didNotMeetExpectations',
    title: 'No lleno las expectativas',
    description: 'El contenido o la presentacion del libro no cumple lo esperado.',
  },
  {
    value: 'lateDelivery',
    title: 'Entrega fuera de tiempo',
    description: 'El pedido llego despues del tiempo estipulado por la tienda.',
  },
];

export function OrderReturnModal({
  isOpen,
  purchaseId,
  onClose,
  onSubmit,
  isLoading = false,
}: OrderReturnModalProps) {
  return (
    <FormModal
      isOpen={isOpen}
      title={`Solicitar devolucion - Pedido #${purchaseId}`}
      onClose={onClose}
      submitText="Enviar solicitud"
      isLoading={isLoading}
      size="lg"
      onSubmit={async (formData) => {
        const reason = String(formData.get('reason') ?? '').trim() as ReturnReason;
        const additionalDescription = String(
          formData.get('additionalDescription') ?? '',
        ).trim();

        await onSubmit({
          reason,
          additionalDescription: additionalDescription || undefined,
        });
      }}
    >
      <fieldset className="space-y-3" aria-describedby="return-reason-help">
        <legend className="text-sm font-semibold text-text">Motivo de la devolucion</legend>
        <p id="return-reason-help" className="text-xs text-text-muted">
          Selecciona una opcion para continuar con la solicitud.
        </p>

        {RETURN_REASON_OPTIONS.map((option, index) => (
          <label
            key={option.value}
            className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-bg px-4 py-3 transition hover:border-border-focus"
          >
            <input
              type="radio"
              name="reason"
              value={option.value}
              defaultChecked={index === 0}
              required
              className="mt-1 h-4 w-4 accent-babyblue-600"
            />
            <span>
              <span className="block text-sm font-semibold text-text">{option.title}</span>
              <span className="mt-1 block text-xs leading-5 text-text-muted">
                {option.description}
              </span>
            </span>
          </label>
        ))}
      </fieldset>

      <div className="space-y-2">
        <label htmlFor="additionalDescription" className="text-sm font-semibold text-text">
          Descripcion adicional (opcional)
        </label>
        <textarea
          id="additionalDescription"
          name="additionalDescription"
          rows={4}
          maxLength={1000}
          className="w-full rounded-2xl border border-border bg-bg px-4 py-3 text-sm text-text outline-none transition placeholder:text-placeholder focus:border-border-focus"
          placeholder="Si lo deseas, agrega detalles para ayudar al equipo de soporte."
        />
        <p className="text-xs text-text-muted">Maximo 1000 caracteres.</p>
      </div>
    </FormModal>
  );
}
