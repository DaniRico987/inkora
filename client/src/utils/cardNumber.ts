export function normalizeCardNumber(value: string): string {
  return value.replace(/\D/g, '').slice(0, 19);
}

export function formatCardNumberInput(value: string): string {
  const digits = normalizeCardNumber(value);
  return digits.match(/.{1,4}/g)?.join(' ') ?? '';
}

export function maskCardNumber(value: string): string {
  const digits = normalizeCardNumber(value);

  if (digits.length < 4) {
    return '';
  }

  return `**** **** **** ${digits.slice(-4)}`;
}
