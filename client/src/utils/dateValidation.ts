export type DateValidationMode =
  | 'auto'
  | 'birthDate'
  | 'publicationDate'
  | 'futureDate'
  | 'cardExpiration'
  | 'none';

type DateValidationContext = {
  label?: string;
  name?: string;
  id?: string;
  dateValidationMode?: DateValidationMode;
};

type DateValidationBounds = {
  minDate?: Date;
  maxDate?: Date;
};

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function startOfDay(date: Date): Date {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
}

function shiftYears(date: Date, amount: number): Date {
  const nextDate = new Date(date);
  nextDate.setFullYear(nextDate.getFullYear() + amount);
  return startOfDay(nextDate);
}

function shiftDays(date: Date, amount: number): Date {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + amount);
  return startOfDay(nextDate);
}

function endOfMonth(date: Date): Date {
  const nextDate = new Date(date);
  nextDate.setMonth(nextDate.getMonth() + 1, 0);
  nextDate.setHours(23, 59, 59, 999);
  return nextDate;
}

export function resolveDateValidationMode({
  label,
  name,
  id,
  dateValidationMode = 'auto',
}: DateValidationContext): Exclude<DateValidationMode, 'auto'> | 'none' {
  if (dateValidationMode !== 'auto') {
    return dateValidationMode;
  }

  const normalizedContext = normalizeText(
    [label, name, id].filter(Boolean).join(' '),
  );

  if (
    normalizedContext.includes('nacimiento') ||
    normalizedContext.includes('birth') ||
    normalizedContext.includes('dob')
  ) {
    return 'birthDate';
  }

  if (
    normalizedContext.includes('publicacion') ||
    normalizedContext.includes('publication') ||
    normalizedContext.includes('published') ||
    normalizedContext.includes('release')
  ) {
    return 'publicationDate';
  }

  if (
    normalizedContext.includes('expir') ||
    normalizedContext.includes('vence') ||
    normalizedContext.includes('caduc') ||
    normalizedContext.includes('expiry') ||
    normalizedContext.includes('issue') ||
    normalizedContext.includes('expedition') ||
    normalizedContext.includes('tarjet')
  ) {
    if (
      normalizedContext.includes('card') ||
      normalizedContext.includes('tarjet')
    ) {
      return 'cardExpiration';
    }

    return 'futureDate';
  }

  return 'none';
}

export function getDateValidationBounds(
  mode: Exclude<DateValidationMode, 'auto'> | 'none',
): DateValidationBounds {
  const today = startOfDay(new Date());

  if (mode === 'birthDate') {
    return {
      minDate: shiftYears(today, -100),
      maxDate: today,
    };
  }

  if (mode === 'publicationDate') {
    return {
      minDate: shiftYears(today, -300),
      maxDate: today,
    };
  }

  if (mode === 'futureDate') {
    return {
      minDate: shiftDays(today, 1),
    };
  }

  if (mode === 'cardExpiration') {
    const maxDate = endOfMonth(
      new Date(today.getFullYear() + 5, today.getMonth(), 1),
    );
    return {
      minDate: startOfDay(new Date(today.getFullYear(), today.getMonth(), 1)),
      maxDate: startOfDay(maxDate),
    };
  }

  return {};
}

function isValidIsoDate(rawDate: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(rawDate);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function getBoundsError(
  mode: Exclude<DateValidationMode, 'auto'> | 'none',
  reason: 'min' | 'max',
): string {
  if (mode === 'birthDate') {
    return reason === 'max'
      ? 'La fecha de nacimiento no puede ser futura.'
      : 'La fecha de nacimiento no puede superar los 100 años.';
  }

  if (mode === 'publicationDate') {
    return reason === 'max'
      ? 'La fecha de publicación no puede ser futura.'
      : 'La fecha de publicación no puede superar los 300 años.';
  }

  if (mode === 'futureDate') {
    return 'La fecha debe ser futura.';
  }

  if (mode === 'cardExpiration') {
    return reason === 'max'
      ? 'La fecha de vencimiento no puede superar 5 años hacia el futuro.'
      : 'La fecha de vencimiento debe ser desde el mes actual en adelante.';
  }

  return 'La fecha no es válida.';
}

export function validateDateValue(
  rawDate: string,
  mode: DateValidationMode,
): string {
  if (!rawDate) return '';
  if (!isValidIsoDate(rawDate)) return 'Ingresa una fecha válida.';

  const effectiveMode = mode === 'auto' ? 'none' : mode;
  const bounds = getDateValidationBounds(effectiveMode);
  const selectedDate = startOfDay(new Date(`${rawDate}T00:00:00`));

  if (bounds.minDate && selectedDate < bounds.minDate) {
    return getBoundsError(effectiveMode, 'min');
  }

  if (bounds.maxDate && selectedDate > bounds.maxDate) {
    return getBoundsError(effectiveMode, 'max');
  }

  return '';
}
