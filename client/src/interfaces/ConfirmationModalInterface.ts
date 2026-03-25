export interface ConfirmationModalProps {
  isOpen: boolean;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
  title?: string;
  closeOnBackdropClick?: boolean;
  isConfirmLoading?: boolean;
}
