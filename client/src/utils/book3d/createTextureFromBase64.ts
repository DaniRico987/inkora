import {
  BOOK_COVER_FALLBACK_PATH,
  BOOK_COVER_MAX_TEXTURE_SIZE,
} from '../../config/bookModel3d';

export class CoverSourceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CoverSourceError';
  }
}

/**
 * Normalizes a cover value from PostgreSQL into a URL/data-URL usable by model-viewer.
 * Supports data-URLs, http(s) URLs, app-relative paths, and raw base64 payloads.
 */
export function normalizeCoverSource(cover: string | null | undefined): string {
  if (!cover?.trim()) {
    return BOOK_COVER_FALLBACK_PATH;
  }

  const trimmed = cover.trim();

  if (
    trimmed.startsWith('data:') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }

  return `data:image/jpeg;base64,${trimmed}`;
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new CoverSourceError('No se pudo decodificar la portada.'));
    image.src = source;
  });
}

/**
 * Downscales large covers to keep GPU memory predictable across thousands of books.
 */
export async function optimizeCoverSource(source: string): Promise<string> {
  if (
    source === BOOK_COVER_FALLBACK_PATH ||
    source.endsWith('.svg') ||
    (!source.startsWith('data:') &&
      !source.startsWith('blob:') &&
      !source.startsWith('http'))
  ) {
    return source;
  }

  try {
    const image = await loadImage(source);
    const maxDim = Math.max(image.naturalWidth, image.naturalHeight);

    if (maxDim <= BOOK_COVER_MAX_TEXTURE_SIZE) {
      return source;
    }

    const scale = BOOK_COVER_MAX_TEXTURE_SIZE / maxDim;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(image.naturalWidth * scale);
    canvas.height = Math.round(image.naturalHeight * scale);

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return source;
    }

    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.92);
  } catch {
    return source;
  }
}

/**
 * Creates a model-viewer texture from a Base64/data-URL/http cover source.
 */
export async function createTextureFromBase64(
  modelViewer: { createTexture(uri: string): Promise<unknown> },
  coverBase64: string | null | undefined,
  textureCache?: Map<string, unknown>,
): Promise<unknown> {
  const normalized = normalizeCoverSource(coverBase64);
  const optimized = await optimizeCoverSource(normalized);
  const cacheKey = optimized.length > 256 ? `${optimized.length}:${optimized.slice(-64)}` : optimized;

  const cached = textureCache?.get(cacheKey);
  if (cached) {
    return cached;
  }

  const texture = await modelViewer.createTexture(optimized);
  if (!texture) {
    throw new CoverSourceError('model-viewer no pudo crear la textura de portada.');
  }

  textureCache?.set(cacheKey, texture);
  return texture;
}
