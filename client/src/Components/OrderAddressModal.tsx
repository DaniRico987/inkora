import { useMemo } from 'react';
import { FormModal } from './FormModal';
import type { Purchase } from '../interfaces/PurchaseInterface';

interface OrderAddressModalProps {
  isOpen: boolean;
  purchase: Purchase;
  currentAddress: string;
  onClose: () => void;
  onSubmit: (shippingAddress: string) => Promise<void>;
  isLoading?: boolean;
}

export function OrderAddressModal({
  isOpen,
  purchase,
  currentAddress,
  onClose,
  onSubmit,
  isLoading = false,
}: OrderAddressModalProps) {
  const defaultAddress = useMemo(() => currentAddress.trim(), [currentAddress]);

  return (
    <FormModal
      isOpen={isOpen}
      title={`Cambiar dirección del pedido #${purchase.purchaseId}`}
      onClose={onClose}
      submitText="Guardar dirección"
      isLoading={isLoading}
      size="md"
      onSubmit={async (formData) => {
        const nextAddress = String(formData.get('shippingAddress') ?? '').trim();
        await onSubmit(nextAddress);
      }}
    >
      <div className="space-y-4">
        <div className="rounded-2xl border border-border bg-bg px-4 py-3 text-sm text-text-muted">
          <p className="font-semibold text-text">Dirección actual</p>
          <p className="mt-1 leading-6">{defaultAddress || 'Sin dirección informada'}</p>
        </div>

        <div className="space-y-2">
          <label htmlFor="shippingAddress" className="text-sm font-semibold text-text">
            Nueva dirección
          </label>
          <textarea
            id="shippingAddress"
            name="shippingAddress"
            defaultValue={defaultAddress}
            rows={4}
            maxLength={255}
            required
            className="w-full rounded-2xl border border-border bg-bg px-4 py-3 text-sm text-text outline-none transition placeholder:text-placeholder focus:border-border-focus"
            placeholder="Av. Corrientes 1234, Buenos Aires, Argentina"
          />
          <p className="text-xs text-text-muted">
            Máximo 255 caracteres. Revisa que la dirección sea exacta antes de guardar.
          </p>
        </div>
      </div>
    </FormModal>
  );
}
