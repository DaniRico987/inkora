import { useCallback, useState } from 'react';
import { BookModelViewer } from './BookModelViewer';
import { Spinner } from './Spinner';
import type { BookModelViewerStatus } from '../types/bookModelViewer';
import {
  getBookModelViewerStatusLabel,
  isBookModelViewerLoading,
} from '../types/bookModelViewer';

type Book3DModalProps = {
  isOpen: boolean;
  onClose: () => void;
  coverUrl: string | null;
  viewerKey: string;
  arSupported: boolean | null;
  title: string;
  author: string;
  priceLabel: string;
};

export function Book3DModal({
  isOpen,
  onClose,
  coverUrl,
  viewerKey,
  arSupported,
  title,
  author,
  priceLabel,
}: Book3DModalProps) {
  const [viewerStatus, setViewerStatus] = useState<BookModelViewerStatus>({
    phase: 'loading-model',
  });

  const handleStatusChange = useCallback((status: BookModelViewerStatus) => {
    setViewerStatus(status);
  }, []);

  if (!isOpen) {
    return null;
  }

  const showViewer = arSupported !== null;
  const showViewerSpinner = showViewer && isBookModelViewerLoading(viewerStatus);
  const showViewerError = viewerStatus.phase === 'error';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md transition-opacity duration-300">
      <div className="relative w-full h-full max-w-5xl md:h-[85vh] md:w-[90vw] bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 rounded-none md:rounded-3xl border border-white/10 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5 backdrop-blur-md">
          <div>
            <h3 className="text-lg font-bold text-white leading-tight">
              Visualizador 3D interactivo
            </h3>
            <p className="text-xs text-indigo-200/70">
              {title} - {author}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            aria-label="Cerrar visualizador"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="relative flex-1 flex flex-col bg-slate-950/40">
          <div className="relative flex-grow h-full flex items-center justify-center">
            {arSupported === null ? (
              <Spinner
                size="lg"
                tone="calm"
                label="Preparando visualizador 3D..."
                fullScreen={false}
              />
            ) : (
              <>
                <BookModelViewer
                  coverUrl={coverUrl}
                  alt={`Modelo 3D de ${title}`}
                  enableAr={arSupported}
                  viewerKey={viewerKey}
                  onStatusChange={handleStatusChange}
                />

                {showViewerSpinner && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm pointer-events-none">
                    <Spinner
                      size="lg"
                      tone="calm"
                      label={getBookModelViewerStatusLabel(viewerStatus)}
                      fullScreen={false}
                    />
                  </div>
                )}

                {showViewerError && (
                  <div className="absolute top-6 left-6 right-6 flex justify-center pointer-events-none">
                    <div className="bg-red-500/20 backdrop-blur-md border border-red-500/40 px-4 py-2.5 rounded-xl flex items-center gap-2 max-w-md pointer-events-auto text-red-100 text-xs shadow-md">
                      <svg className="w-4 h-4 text-red-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span>{getBookModelViewerStatusLabel(viewerStatus)}</span>
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="absolute bottom-6 left-6 right-6 pointer-events-none flex flex-col gap-2">
              <div className="bg-slate-900/95 backdrop-blur-md border border-white/10 p-4 rounded-2xl max-w-sm pointer-events-auto shadow-xl">
                <h4 className="text-sm font-semibold text-white">{title}</h4>
                <p className="text-xs text-slate-400 mt-1">Autor: {author}</p>
                <p className="text-xs text-slate-400">Precio: {priceLabel}</p>
              </div>
            </div>

            {arSupported === false && viewerStatus.phase === 'ready' && (
              <div className="absolute top-6 left-6 right-6 pointer-events-none flex justify-center">
                <div className="bg-amber-500/20 backdrop-blur-md border border-amber-500/40 px-4 py-2.5 rounded-xl flex items-center gap-2 max-w-md pointer-events-auto text-amber-200 text-xs shadow-md">
                  <svg className="w-4 h-4 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>Este dispositivo no soporta Realidad Aumentada (AR). Se muestra en vista 3D estándar.</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
