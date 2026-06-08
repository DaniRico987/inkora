import {
  BOOK_COVER_FALLBACK_PATH,
  BOOK_COVER_MATERIAL_NAME,
} from '../../config/bookModel3d';
import type { ModelViewerElement, ModelViewerMaterial } from '../../types/model-viewer-scene-graph';
import {
  CoverSourceError,
  createTextureFromBase64,
  normalizeCoverSource,
} from './createTextureFromBase64';

export class CoverMaterialError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CoverMaterialError';
  }
}

/**
 * Locates the cover material inside the loaded GLB.
 * Prefers `getMaterialByName('BookCover')`, then scans by configured name.
 */
export function findCoverMaterial(
  modelViewer: ModelViewerElement,
): ModelViewerMaterial {
  const model = modelViewer.model;
  if (!model) {
    throw new CoverMaterialError('El modelo 3D aún no está disponible.');
  }

  const byName = model.getMaterialByName(BOOK_COVER_MATERIAL_NAME);
  if (byName) {
    return byName;
  }

  const fallback = model.materials.find(
    (material) => material.name === BOOK_COVER_MATERIAL_NAME,
  );
  if (fallback) {
    return fallback;
  }

  throw new CoverMaterialError(
    `No se encontró el material "${BOOK_COVER_MATERIAL_NAME}" en BOOK2.glb.`,
  );
}

export type ApplyBookCoverTextureResult = {
  usedFallback: boolean;
  materialName: string;
};

/**
 * Applies the selected book cover as the baseColorTexture of the cover material.
 */
export async function applyBookCoverTexture(
  modelViewer: ModelViewerElement,
  coverBase64: string | null | undefined,
  textureCache?: Map<string, unknown>,
): Promise<ApplyBookCoverTextureResult> {
  const material = findCoverMaterial(modelViewer);
  const textureSlot = material.pbrMetallicRoughness.baseColorTexture;

  if (!textureSlot) {
    throw new CoverMaterialError(
      `El material "${material.name}" no tiene baseColorTexture. ` +
        'El GLB debe exportarse con una textura placeholder en la portada.',
    );
  }

  const hasCover = Boolean(coverBase64?.trim());
  let usedFallback = !hasCover;

  try {
    const texture = await createTextureFromBase64(
      modelViewer,
      coverBase64,
      textureCache,
    );
    textureSlot.setTexture(texture as never);
  } catch (primaryError) {
    usedFallback = true;
    try {
      const fallbackTexture = await createTextureFromBase64(
        modelViewer,
        BOOK_COVER_FALLBACK_PATH,
        textureCache,
      );
      textureSlot.setTexture(fallbackTexture as never);
    } catch {
      if (primaryError instanceof CoverSourceError) {
        throw primaryError;
      }
      throw new CoverSourceError(
        'No se pudo aplicar la portada ni la imagen de respaldo.',
      );
    }
  }

  material.pbrMetallicRoughness.setBaseColorFactor([1, 1, 1, 1]);

  return {
    usedFallback,
    materialName: material.name,
  };
}

/** Validates that a cover string looks usable before attempting GPU upload. */
export function validateCoverSource(cover: string | null | undefined): boolean {
  if (!cover?.trim()) {
    return false;
  }

  try {
    normalizeCoverSource(cover);
    return true;
  } catch {
    return false;
  }
}
