/**
 * Card validation utilities
 * Handles validation and detection of payment cards
 */

export type CardProvider = 'visa' | 'mastercard' | 'amex' | 'unknown';

export interface CardValidationResult {
    isValid: boolean;
    errors: {
        cardNumber?: string;
        expiryDate?: string;
        cvv?: string;
        cardholder?: string;
    };
    cardProvider?: CardProvider;
}

/**
 * Detects card provider based on card number using Luhn algorithm
 * Uses BIN (Bank Identification Number) patterns
 */
export function detectCardProvider(cardNumber: string): CardProvider {
    const digits = cardNumber.replace(/\D/g, '');

    if (!digits) return 'unknown';

    // Visa: starts with 4, length 13, 16, or 19
    if (/^4[0-9]{12}(?:[0-9]{3})?(?:[0-9]{3})?$/.test(digits)) {
        return 'visa';
    }

    // Mastercard: starts with 51-55 or 2221-2720, length 16
    if (/^(?:5[1-5][0-9]{2}|222[1-9]|22[3-9][0-9]|2[3-6][0-9]{2}|27[01][0-9]|2720)[0-9]{12}$/.test(digits)) {
        return 'mastercard';
    }

    // American Express: starts with 34 or 37, length 15
    if (/^3[47][0-9]{13}$/.test(digits)) {
        return 'amex';
    }

    return 'unknown';
}

/**
 * Validates card number using Luhn algorithm
 */
export function validateCardNumberWithLuhn(cardNumber: string): boolean {
    const digits = cardNumber.replace(/\D/g, '');

    if (digits.length < 13 || digits.length > 19) {
        return false;
    }

    let sum = 0;
    let isEven = false;

    for (let i = digits.length - 1; i >= 0; i--) {
        let digit = parseInt(digits[i], 10);

        if (isEven) {
            digit *= 2;
            if (digit > 9) {
                digit -= 9;
            }
        }

        sum += digit;
        isEven = !isEven;
    }

    return sum % 10 === 0;
}

/**
 * Validates card number format and length
 */
export function validateCardNumber(cardNumber: string): string | null {
    const digits = cardNumber.replace(/\D/g, '');

    if (!digits) {
        return 'El número de tarjeta es requerido';
    }

    if (digits.length < 13 || digits.length > 19) {
        return 'El número de tarjeta debe tener entre 13 y 19 dígitos';
    }

    if (!validateCardNumberWithLuhn(digits)) {
        return 'El número de tarjeta no es válido';
    }

    return null;
}

/**
 * Validates expiry date (MM/YY format)
 */
export function validateExpiryDate(expiryDate: string): string | null {
    if (!expiryDate) {
        return 'La fecha de vencimiento es requerida';
    }

    // Accept both MM/YY and MMYY formats
    const cleanDate = expiryDate.replace(/\D/g, '');

    if (cleanDate.length !== 4) {
        return 'La fecha debe estar en formato MM/YY';
    }

    const month = parseInt(cleanDate.substring(0, 2), 10);
    const year = parseInt(cleanDate.substring(2, 4), 10);

    if (month < 1 || month > 12) {
        return 'El mes debe estar entre 01 y 12';
    }

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear() % 100;
    const currentMonth = currentDate.getMonth() + 1;

    // Check if card is expired
    if (year < currentYear || (year === currentYear && month < currentMonth)) {
        return 'La tarjeta ha vencido';
    }

    return null;
}

/**
 * Validates CVV format
 */
export function validateCVV(cvv: string, cardProvider?: CardProvider): string | null {
    if (!cvv) {
        return 'El CVV es requerido';
    }

    const digits = cvv.replace(/\D/g, '');

    // American Express uses 4-digit CVV
    const isAmex = cardProvider === 'amex';
    const expectedLength = isAmex ? 4 : 3;
    const minLength = isAmex ? 4 : 3;
    const maxLength = isAmex ? 4 : 4;

    if (digits.length < minLength || digits.length > maxLength) {
        return isAmex
            ? 'El CVV debe tener 4 dígitos'
            : 'El CVV debe tener 3 o 4 dígitos';
    }

    return null;
}

/**
 * Validates cardholder name
 * Only allows A-Z (uppercase and lowercase), spaces allowed only if not empty
 */
export function validateCardholder(name: string): string | null {
    if (!name) {
        return 'El nombre del titular es requerido';
    }

    const trimmed = name.trim();

    if (!trimmed) {
        return 'El nombre del titular no puede contener solo espacios';
    }

    // Only allow A-Z (both cases) and spaces
    if (!/^[a-zA-Z\s]+$/.test(trimmed)) {
        return 'El nombre solo puede contener letras (A-Z) y espacios';
    }

    // Check for multiple consecutive spaces or leading/trailing spaces in the actual value
    if (/\s{2,}/.test(trimmed)) {
        return 'No se permiten múltiples espacios consecutivos';
    }

    return null;
}

/**
 * Complete card validation
 */
export function validateCard(
    cardNumber: string,
    expiryDate: string,
    cvv: string,
    cardholder: string,
): CardValidationResult {
    const cardProvider = detectCardProvider(cardNumber);
    const errors: CardValidationResult['errors'] = {};

    const cardNumberError = validateCardNumber(cardNumber);
    if (cardNumberError) errors.cardNumber = cardNumberError;

    const expiryError = validateExpiryDate(expiryDate);
    if (expiryError) errors.expiryDate = expiryError;

    const cvvError = validateCVV(cvv, cardProvider);
    if (cvvError) errors.cvv = cvvError;

    const cardholderError = validateCardholder(cardholder);
    if (cardholderError) errors.cardholder = cardholderError;

    return {
        isValid: Object.keys(errors).length === 0,
        errors,
        cardProvider,
    };
}

/**
 * Formats card number input to groups of 4
 */
export function formatCardNumber(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 19);
    return digits.match(/.{1,4}/g)?.join(' ') ?? '';
}

/**
 * Formats expiry date to MM/YY format
 */
export function formatExpiryDate(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 4);

    if (digits.length <= 2) {
        return digits;
    }

    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

/**
 * Normalizes card number by removing spaces
 */
export function normalizeCardNumber(value: string): string {
    return value.replace(/\D/g, '');
}

/**
 * Masks card number for display (shows only last 4 digits)
 */
export function maskCardNumber(value: string): string {
    const digits = normalizeCardNumber(value);

    if (digits.length < 4) {
        return '';
    }

    return `**** **** **** ${digits.slice(-4)}`;
}

/**
 * Gets display name for card provider
 */
export function getCardProviderDisplayName(provider: CardProvider): string {
    const names: Record<CardProvider, string> = {
        visa: 'Visa',
        mastercard: 'Mastercard',
        amex: 'American Express',
        unknown: 'Tarjeta desconocida',
    };

    return names[provider];
}
