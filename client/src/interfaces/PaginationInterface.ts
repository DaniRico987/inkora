export type PaginationItem = number | 'ellipsis';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  siblingCount?: number;
  boundaryCount?: number;
  showGoToInput?: boolean;
  goToLabel?: string;
  className?: string;
  disabled?: boolean;
}
