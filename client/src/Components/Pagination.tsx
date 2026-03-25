import { useEffect, useMemo, useState } from 'react';
import type { PaginationItem, PaginationProps } from '../interfaces/PaginationInterface';

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function range(start: number, end: number): number[] {
  if (start > end) return [];
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

function buildPaginationItems(
  currentPage: number,
  totalPages: number,
  siblingCount: number,
  boundaryCount: number,
): PaginationItem[] {
  if (totalPages <= 0) return [];

  const firstPages = range(1, Math.min(boundaryCount, totalPages));
  const lastPages = range(
    Math.max(totalPages - boundaryCount + 1, 1),
    totalPages,
  );

  const leftSibling = Math.max(currentPage - siblingCount, boundaryCount + 2);
  const rightSibling = Math.min(
    currentPage + siblingCount,
    totalPages - boundaryCount - 1,
  );

  const showLeftEllipsis = leftSibling > boundaryCount + 2;
  const showRightEllipsis = rightSibling < totalPages - boundaryCount - 1;

  const middlePages = range(leftSibling, rightSibling);

  const items: PaginationItem[] = [...firstPages];

  if (showLeftEllipsis) {
    items.push('ellipsis');
  } else {
    items.push(...range(boundaryCount + 1, leftSibling - 1));
  }

  items.push(...middlePages);

  if (showRightEllipsis) {
    items.push('ellipsis');
  } else {
    items.push(...range(rightSibling + 1, totalPages - boundaryCount));
  }

  items.push(...lastPages);

  const deduped: PaginationItem[] = [];
  for (const item of items) {
    if (item === 'ellipsis') {
      if (deduped[deduped.length - 1] !== 'ellipsis') deduped.push(item);
      continue;
    }
    if (!deduped.includes(item)) deduped.push(item);
  }

  return deduped;
}

function ArrowLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  siblingCount = 1,
  boundaryCount = 1,
  showGoToInput = true,
  goToLabel = 'Go to page',
  className = '',
  disabled = false,
}: PaginationProps) {
  const compactBreakpoint = 420;
  const [isCompact, setIsCompact] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < compactBreakpoint;
  });

  const safeCurrentPage = clamp(currentPage, 1, Math.max(totalPages, 1));

  const items = useMemo(
    () =>
      buildPaginationItems(
        safeCurrentPage,
        totalPages,
        siblingCount,
        boundaryCount,
      ),
    [safeCurrentPage, totalPages, siblingCount, boundaryCount],
  );

  const [goToValue, setGoToValue] = useState(String(safeCurrentPage));

  useEffect(() => {
    setGoToValue(String(safeCurrentPage));
  }, [safeCurrentPage]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onResize = () => {
      setIsCompact(window.innerWidth < compactBreakpoint);
    };

    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const previousDisabled = disabled || safeCurrentPage <= 1;
  const nextDisabled = disabled || safeCurrentPage >= totalPages;

  const goToPage = (rawValue: string) => {
    const parsed = Number.parseInt(rawValue, 10);
    if (!Number.isFinite(parsed)) return;
    const nextPage = clamp(parsed, 1, totalPages);
    onPageChange(nextPage);
  };

  const handleGoToChange = (value: string) => {
    const digitsOnly = value.replace(/\D+/g, '');
    setGoToValue(digitsOnly);
  };

  if (totalPages <= 1) return null;

  if (isCompact) {
    return (
      <div className={`w-full flex flex-col gap-2.5 ${className}`}>
        <div className="flex items-center justify-between rounded-xl border border-border bg-bg-secondary/70 px-2 py-1.5">
          <button
            type="button"
            aria-label="Pagina anterior"
            onClick={() => onPageChange(safeCurrentPage - 1)}
            disabled={previousDisabled}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowLeftIcon />
          </button>

          <div className="inline-flex items-center gap-2">
            <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-primary-900 px-2 text-sm font-semibold text-white shadow-sm">
              {safeCurrentPage}
            </span>
            <span className="text-xs text-text-muted">de {totalPages}</span>
          </div>

          <button
            type="button"
            aria-label="Pagina siguiente"
            onClick={() => onPageChange(safeCurrentPage + 1)}
            disabled={nextDisabled}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowRightIcon />
          </button>
        </div>

        {showGoToInput && (
          <div className="inline-flex h-11 items-center rounded-md border border-border bg-bg-secondary px-2 w-fit">
            <div className="pr-2 text-left">
              <div className="text-[0.68rem] uppercase tracking-[0.04em] text-text-muted">
                {goToLabel}
              </div>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={String(totalPages).length}
                value={goToValue}
                onChange={(e) => handleGoToChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') goToPage(goToValue);
                }}
                className="w-12 border-none bg-transparent text-sm font-semibold text-text outline-none"
              />
            </div>
            <button
              type="button"
              aria-label="Ir a pagina"
              onClick={() => goToPage(goToValue)}
              disabled={disabled}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-primary-900 transition hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowRightIcon />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`w-full flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 ${className}`}>
      <div className="w-full">
        <div className="flex items-center gap-1 text-primary-900 pr-1">
        <button
          type="button"
          aria-label="Pagina anterior"
          onClick={() => onPageChange(safeCurrentPage - 1)}
          disabled={previousDisabled}
          className="inline-flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full transition hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ArrowLeftIcon />
        </button>

        {items.map((item, index) => {
          if (item === 'ellipsis') {
            return (
              <span key={`ellipsis-${index}`} className="inline-flex h-8 sm:h-9 min-w-7 sm:min-w-8 items-center justify-center px-1 text-sm text-text-muted">
                ...
              </span>
            );
          }

          const isActive = item === safeCurrentPage;
          return (
            <button
              key={item}
              type="button"
              onClick={() => onPageChange(item)}
              disabled={disabled}
              aria-current={isActive ? 'page' : undefined}
              className={[
                'inline-flex h-8 sm:h-9 min-w-8 sm:min-w-9 items-center justify-center rounded-full px-2 text-sm font-semibold transition',
                isActive
                  ? 'bg-primary-900 text-white shadow-sm'
                  : 'text-primary-900 hover:bg-primary-50',
                disabled ? 'cursor-not-allowed opacity-60' : '',
              ].join(' ')}
            >
              {item}
            </button>
          );
        })}

        <button
          type="button"
          aria-label="Pagina siguiente"
          onClick={() => onPageChange(safeCurrentPage + 1)}
          disabled={nextDisabled}
          className="inline-flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full transition hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ArrowRightIcon />
        </button>
        </div>
      </div>

      {showGoToInput && (
        <div className="inline-flex h-11 items-center rounded-md border border-border bg-bg-secondary px-2 w-fit sm:ml-1">
          <div className="pr-2 text-left">
            <div className="text-[0.68rem] uppercase tracking-[0.04em] text-text-muted">
              {goToLabel}
            </div>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={String(totalPages).length}
              value={goToValue}
              onChange={(e) => handleGoToChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') goToPage(goToValue);
              }}
              className="w-12 sm:w-14 border-none bg-transparent text-sm font-semibold text-text outline-none"
            />
          </div>
          <button
            type="button"
            aria-label="Ir a pagina"
            onClick={() => goToPage(goToValue)}
            disabled={disabled}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-primary-900 transition hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowRightIcon />
          </button>
        </div>
      )}
    </div>
  );
}
