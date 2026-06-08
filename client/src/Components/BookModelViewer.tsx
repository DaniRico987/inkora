import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import '@google/model-viewer';
import { BOOK_MODEL_GLB_PATH } from '../config/bookModel3d';
import type { BookModelViewerStatus } from '../types/bookModelViewer';
import type {
  ModelViewerElement,
  ModelViewerTexture,
} from '../types/model-viewer-scene-graph';
import {
  applyBookCoverTexture,
  CoverMaterialError,
} from '../utils/book3d/applyBookCoverTexture';
import { CoverSourceError } from '../utils/book3d/createTextureFromBase64';

export type BookModelViewerProps = {
  coverUrl: string | null;
  alt: string;
  enableAr: boolean;
  /** Stable identity for remounting when switching books inside the same session. */
  viewerKey: string;
  onStatusChange?: (status: BookModelViewerStatus) => void;
};

const INITIAL_STATUS: BookModelViewerStatus = { phase: 'loading-model' };

export function BookModelViewer({
  coverUrl,
  alt,
  enableAr,
  viewerKey,
  onStatusChange,
}: BookModelViewerProps) {
  const viewerRef = useRef<ModelViewerElement>(null);
  const textureCacheRef = useRef(new Map<string, ModelViewerTexture>());
  const appliedCoverRef = useRef<string | null>(null);
  const [status, setStatus] = useState<BookModelViewerStatus>(INITIAL_STATUS);

  const reportStatus = useCallback(
    (next: BookModelViewerStatus) => {
      setStatus(next);
      onStatusChange?.(next);
    },
    [onStatusChange],
  );

  useEffect(() => {
    appliedCoverRef.current = null;
    textureCacheRef.current.clear();
    reportStatus({ phase: 'loading-model' });
  }, [viewerKey, reportStatus]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) {
      return;
    }

    let cancelled = false;

    const applyCover = async () => {
      if (cancelled) {
        return;
      }

      const coverFingerprint = coverUrl ?? '';
      if (appliedCoverRef.current === coverFingerprint) {
        reportStatus({ phase: 'ready' });
        return;
      }

      reportStatus({ phase: 'loading-texture' });

      try {
        await applyBookCoverTexture(
          viewer,
          coverUrl,
          textureCacheRef.current as Map<string, unknown>,
        );
        if (cancelled) {
          return;
        }
        appliedCoverRef.current = coverFingerprint;
        reportStatus({ phase: 'ready' });
      } catch (error) {
        if (cancelled) {
          return;
        }

        if (error instanceof CoverMaterialError) {
          reportStatus({
            phase: 'error',
            code: 'material',
            message: error.message,
          });
          return;
        }

        if (error instanceof CoverSourceError) {
          reportStatus({
            phase: 'error',
            code: 'cover-invalid',
            message: 'La portada no pudo aplicarse al modelo 3D.',
          });
          return;
        }

        reportStatus({
          phase: 'error',
          code: 'texture',
          message: 'Ocurrió un error al generar la textura de la portada.',
        });
      }
    };

    const handleLoad = () => {
      void applyCover();
    };

    const handleError = () => {
      if (cancelled) {
        return;
      }
      reportStatus({
        phase: 'error',
        code: 'model-load',
        message: 'No se pudo cargar el modelo 3D del libro.',
      });
    };

    viewer.addEventListener('load', handleLoad);
    viewer.addEventListener('error', handleError);

    if (viewer.loaded) {
      void applyCover();
    } else {
      reportStatus({ phase: 'loading-model' });
    }

    return () => {
      cancelled = true;
      viewer.removeEventListener('load', handleLoad);
      viewer.removeEventListener('error', handleError);
      textureCacheRef.current.clear();
    };
  }, [coverUrl, reportStatus, viewerKey]);

  return (
    <model-viewer
      key={viewerKey}
      ref={viewerRef as never}
      src={BOOK_MODEL_GLB_PATH}
      alt={alt}
      camera-controls
      auto-rotate
      loading="eager"
      reveal="auto"
      {...(enableAr
        ? { ar: true, 'ar-modes': 'webxr scene-viewer quick-look' }
        : {})}
      shadow-intensity="1"
      touch-action="pan-y"
      aria-busy={status.phase !== 'ready'}
      style={
        {
          width: '100%',
          height: '100%',
          '--poster-color': 'transparent',
        } as CSSProperties
      }
    />
  );
}
