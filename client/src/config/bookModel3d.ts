/**
 * Central configuration for the shared 3D book model.
 *
 * The GLB lives at `client/public/models/book.glb` and is served as `/models/book.glb`.
 * Regenerate with: `npm run generate:book-glb`
 *
 * @see client/public/models/README.md — Blender authoring guide
 */
export const BOOK_MODEL_GLB_PATH = '/models/BOOK2.glb';

/**
 * glTF material that receives the dynamic cover texture at runtime.
 * Must match the material name inside book.glb (see generate-book-glb.mjs).
 */
export const BOOK_COVER_MATERIAL_NAME = 'BookCover';

/** Static materials bundled in book.glb (not textured at runtime). */
export const BOOK_STATIC_MATERIAL_NAMES = [
  'BookBack',
  'BookSpine',
  'BookPages',
] as const;

/** Fallback when a book has no cover or the cover fails to load. */
export const BOOK_COVER_FALLBACK_PATH = '/inkoraICO.svg';

/** Maximum cover image dimension used before applying to the 3D model. */
export const BOOK_COVER_MAX_TEXTURE_SIZE = 1024;
