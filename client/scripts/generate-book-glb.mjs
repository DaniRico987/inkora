/**
 * Generates public/models/book.glb — the shared reusable book mesh.
 *
 * Material names are consumed by client/src/config/bookModel3d.ts.
 * Re-run after changing geometry or material names:
 *   node scripts/generate-book-glb.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Document, NodeIO } from '@gltf-transform/core';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT = join(__dirname, '../public/models/BOOK2.glb');

/** Book dimensions in meters (glTF Y-up). */
const W = 0.14; // spine → fore edge
const H = 0.21; // bottom → top
const D = 0.028; // back → front cover

/** 1×1 white PNG — placeholder until runtime cover texture is applied. */
const WHITE_PNG = Uint8Array.from(
  atob(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  ),
  (c) => c.charCodeAt(0),
);

function quadPositions(corners) {
  return new Float32Array(corners.flat());
}

function quadNormals(normal) {
  return new Float32Array([...normal, ...normal, ...normal, ...normal]);
}

function quadUvs(flipU = false) {
  if (flipU) {
    return new Float32Array([1, 0, 0, 0, 0, 1, 1, 1]);
  }
  return new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]);
}

const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);

function addFace(doc, buffer, positions, normals, uvs, material) {
  const posAccessor = doc
    .createAccessor()
    .setType('VEC3')
    .setArray(positions)
    .setBuffer(buffer);
  const normAccessor = doc
    .createAccessor()
    .setType('VEC3')
    .setArray(normals)
    .setBuffer(buffer);
  const uvAccessor = doc
    .createAccessor()
    .setType('VEC2')
    .setArray(uvs)
    .setBuffer(buffer);
  const idxAccessor = doc
    .createAccessor()
    .setType('SCALAR')
    .setArray(indices)
    .setBuffer(buffer);

  return doc
    .createPrimitive()
    .setAttribute('POSITION', posAccessor)
    .setAttribute('NORMAL', normAccessor)
    .setAttribute('TEXCOORD_0', uvAccessor)
    .setIndices(idxAccessor)
    .setMaterial(material);
}

const hw = W / 2;
const hh = H / 2;
const hd = D / 2;

const doc = new Document();
const buffer = doc.createBuffer('buffer');

const coverTexture = doc
  .createTexture('CoverPlaceholder')
  .setImage(WHITE_PNG)
  .setMimeType('image/png');

const matCover = doc
  .createMaterial('BookCover')
  .setBaseColorTexture(coverTexture)
  .setMetallicFactor(0)
  .setRoughnessFactor(0.82);

const matBack = doc
  .createMaterial('BookBack')
  .setBaseColorFactor([0.12, 0.12, 0.14, 1])
  .setMetallicFactor(0)
  .setRoughnessFactor(0.9);

const matSpine = doc
  .createMaterial('BookSpine')
  .setBaseColorFactor([0.08, 0.08, 0.1, 1])
  .setMetallicFactor(0)
  .setRoughnessFactor(0.88);

const matPages = doc
  .createMaterial('BookPages')
  .setBaseColorFactor([0.94, 0.92, 0.88, 1])
  .setMetallicFactor(0)
  .setRoughnessFactor(0.95);

const primitives = [
  // Front cover (+Z) — receives dynamic texture
  addFace(
    doc,
    buffer,
    quadPositions([
      [-hw, -hh, hd],
      [hw, -hh, hd],
      [hw, hh, hd],
      [-hw, hh, hd],
    ]),
    quadNormals([0, 0, 1]),
    quadUvs(),
    matCover,
  ),
  // Back cover (-Z)
  addFace(
    doc,
    buffer,
    quadPositions([
      [hw, -hh, -hd],
      [-hw, -hh, -hd],
      [-hw, hh, -hd],
      [hw, hh, -hd],
    ]),
    quadNormals([0, 0, -1]),
    quadUvs(),
    matBack,
  ),
  // Spine (-X)
  addFace(
    doc,
    buffer,
    quadPositions([
      [-hw, -hh, -hd],
      [-hw, -hh, hd],
      [-hw, hh, hd],
      [-hw, hh, -hd],
    ]),
    quadNormals([-1, 0, 0]),
    quadUvs(),
    matSpine,
  ),
  // Pages edge (+X)
  addFace(
    doc,
    buffer,
    quadPositions([
      [hw, -hh, hd],
      [hw, -hh, -hd],
      [hw, hh, -hd],
      [hw, hh, hd],
    ]),
    quadNormals([1, 0, 0]),
    quadUvs(),
    matPages,
  ),
  // Top (+Y)
  addFace(
    doc,
    buffer,
    quadPositions([
      [-hw, hh, hd],
      [hw, hh, hd],
      [hw, hh, -hd],
      [-hw, hh, -hd],
    ]),
    quadNormals([0, 1, 0]),
    quadUvs(),
    matPages,
  ),
  // Bottom (-Y)
  addFace(
    doc,
    buffer,
    quadPositions([
      [-hw, -hh, -hd],
      [hw, -hh, -hd],
      [hw, -hh, hd],
      [-hw, -hh, hd],
    ]),
    quadNormals([0, -1, 0]),
    quadUvs(),
    matPages,
  ),
];

const mesh = doc.createMesh('Book').addPrimitive(...primitives);
const node = doc.createNode('BookNode').setMesh(mesh);
doc.createScene('Scene').addChild(node);

mkdirSync(dirname(OUTPUT), { recursive: true });
const io = new NodeIO();
const binary = await io.writeBinary(doc);
writeFileSync(OUTPUT, Buffer.from(binary));
console.log(`Wrote ${OUTPUT}`);
