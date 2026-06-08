export type BookModelViewerPhase =
  | 'loading-model'
  | 'loading-texture'
  | 'ready'
  | 'error';

export type BookModelViewerErrorCode =
  | 'model-load'
  | 'texture'
  | 'material'
  | 'cover-invalid';

export type BookModelViewerStatus =
  | { phase: 'loading-model' }
  | { phase: 'loading-texture' }
  | { phase: 'ready' }
  | {
      phase: 'error';
      code: BookModelViewerErrorCode;
      message: string;
    };

export function isBookModelViewerLoading(
  status: BookModelViewerStatus,
): boolean {
  return (
    status.phase === 'loading-model' || status.phase === 'loading-texture'
  );
}

export function getBookModelViewerStatusLabel(
  status: BookModelViewerStatus,
): string {
  switch (status.phase) {
    case 'loading-model':
      return 'Cargando modelo 3D...';
    case 'loading-texture':
      return 'Aplicando portada...';
    case 'ready':
      return '';
    case 'error':
      return status.message;
  }
}
