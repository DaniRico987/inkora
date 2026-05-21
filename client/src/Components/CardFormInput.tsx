import { useMemo, useEffect, useState } from 'react';
import { InputText, InputSelect } from './Inputs';
import {
    detectCardProvider,
    formatCardNumber,
    formatExpiryDate,
    getCardProviderDisplayName,
} from '../utils/cardValidation';

export interface CardFormData {
    cardNumber: string;
    cardholder: string;
    expiryDate: string;
    cvv: string;
    cardType?: 'credit' | 'debit';
}

interface CardFormInputProps {
    /** Current form data */
    data: CardFormData;

    /** Callback when any field changes */
    onChange: (data: CardFormData) => void;

    /** Show card type selector (for saved cards) */
    showCardType?: boolean;

    /** Label for cardholder field */
    cardholderLabel?: string;

    /** Validation errors to display */
    errors?: Record<string, string | undefined>;

    /** Disable the entire form */
    disabled?: boolean;

    /** Hide labels on focus */
    hideLabelOnFocus?: boolean;

    /** Show detected card provider */
    showCardProvider?: boolean;
}

export function CardFormInput({
    data,
    onChange,
    showCardType = false,
    cardholderLabel = 'Titular de la tarjeta',
    errors = {},
    disabled = false,
    hideLabelOnFocus = true,
    showCardProvider = true,
}: CardFormInputProps) {
    const detectedProvider = useMemo(() => detectCardProvider(data.cardNumber), [data.cardNumber]);
    const [remoteProvider, setRemoteProvider] = useState<{ bin: string; name: string } | null>(null);
    const digits = data.cardNumber.replace(/\D/g, '');
    const bin = digits.slice(0, 6);
    const remoteProviderName = remoteProvider?.bin === bin ? remoteProvider.name : null;

    // Try BIN lookup when local detection is unknown and we have at least 6 digits
    useEffect(() => {
        if (!bin || bin.length < 6) return;

        if (detectedProvider !== 'unknown') return;

        let cancelled = false;
        void (async () => {
            try {
                const res = await fetch(`https://lookup.binlist.net/${bin}`, { headers: { Accept: 'application/json' } });
                if (!res.ok) return;
                const body = await res.json();
                if (cancelled) return;
                const name = body.scheme || body.brand || body.network || body.type || null;
                if (name) setRemoteProvider({ bin, name: String(name) });
            } catch {
                // ignore network errors
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [bin, detectedProvider]);

    const handleCardNumberChange = (value: string) => {
        const formatted = formatCardNumber(value);
        onChange({ ...data, cardNumber: formatted });
    };

    const handleCardholderChange = (value: string) => {
        // Only allow A-Z and spaces
        const filtered = value.replace(/[^a-zA-Z\s]/g, '');
        onChange({ ...data, cardholder: filtered });
    };

    const handleExpiryChange = (value: string) => {
        const formatted = formatExpiryDate(value);
        onChange({ ...data, expiryDate: formatted });
    };

    const handleCvvChange = (value: string) => {
        // Only allow numbers
        const filtered = value.replace(/\D/g, '');
        onChange({ ...data, cvv: filtered });
    };

    const handleCardTypeChange = (value: string) => {
        onChange({
            ...data,
            cardType: (value as 'credit' | 'debit') || 'credit',
        });
    };

    return (
        <div className="space-y-4">
            {/* Card Number */}
            <div>
                <div className="flex items-end justify-between gap-2">
                    <label className="block text-sm font-medium text-text">
                        Número de tarjeta
                        {showCardProvider && (
                            <>
                                {detectedProvider !== 'unknown' ? (
                                    <span className="ml-2 inline-block rounded-full bg-babyblue-50 px-2 py-1 text-xs font-semibold text-babyblue-700">
                                        {getCardProviderDisplayName(detectedProvider)}
                                    </span>
                                ) : remoteProviderName ? (
                                    <span className="ml-2 inline-block rounded-full bg-babyblue-50 px-2 py-1 text-xs font-semibold text-babyblue-700">
                                        {remoteProviderName}
                                    </span>
                                ) : null}
                            </>
                        )}
                    </label>
                </div>
                <InputText
                    label="Número de tarjeta"
                    value={data.cardNumber}
                    onChange={(e) => handleCardNumberChange(e.target.value)}
                    placeholder="1234 5678 9012 3456"
                    inputMode="numeric"
                    autoComplete="cc-number"
                    maxLength={19}
                    disabled={disabled}
                    hideLabelOnFocus={hideLabelOnFocus}
                    className={errors.cardNumber ? 'border-red-500 focus:border-red-500' : ''}
                />
                {errors.cardNumber && (
                    <p className="mt-1 text-sm text-red-600">{errors.cardNumber}</p>
                )}
            </div>

            {/* Cardholder Name */}
            <div>
                <InputText
                    label={cardholderLabel}
                    value={data.cardholder}
                    onChange={(e) => handleCardholderChange(e.target.value)}
                    placeholder="Nombre Apellido"
                    autoComplete="cc-name"
                    disabled={disabled}
                    hideLabelOnFocus={hideLabelOnFocus}
                    className={errors.cardholder ? 'border-red-500 focus:border-red-500' : ''}
                />
                {errors.cardholder && (
                    <p className="mt-1 text-sm text-red-600">{errors.cardholder}</p>
                )}
            </div>

            {/* Expiry and CVV Row */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <InputText
                        label="Vencimiento"
                        value={data.expiryDate}
                        onChange={(e) => handleExpiryChange(e.target.value)}
                        placeholder="MM/YY"
                        inputMode="numeric"
                        autoComplete="cc-exp"
                        maxLength={5}
                        disabled={disabled}
                        hideLabelOnFocus={hideLabelOnFocus}
                        className={errors.expiryDate ? 'border-red-500 focus:border-red-500' : ''}
                    />
                    {errors.expiryDate && (
                        <p className="mt-1 text-sm text-red-600">{errors.expiryDate}</p>
                    )}
                </div>

                <div>
                    <InputText
                        label="CVV"
                        value={data.cvv}
                        onChange={(e) => handleCvvChange(e.target.value)}
                        placeholder={detectedProvider === 'amex' ? '1234' : '123'}
                        inputMode="numeric"
                        autoComplete="cc-csc"
                        maxLength={detectedProvider === 'amex' ? 4 : 4}
                        disabled={disabled}
                        hideLabelOnFocus={hideLabelOnFocus}
                        className={errors.cvv ? 'border-red-500 focus:border-red-500' : ''}
                    />
                    {errors.cvv && (
                        <p className="mt-1 text-sm text-red-600">{errors.cvv}</p>
                    )}
                </div>
            </div>

            {/* Card Type Selector (optional) */}
            {showCardType && (
                <InputSelect
                    label="Tipo de tarjeta"
                    value={data.cardType || 'credit'}
                    options={[
                        { label: 'Crédito', value: 'credit' },
                        { label: 'Débito', value: 'debit' },
                    ]}
                    onChange={(e) => handleCardTypeChange(e.target.value)}
                    disabled={disabled}
                />
            )}
        </div>
    );
}
