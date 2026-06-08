/**
 * Scene Graph API types for @google/model-viewer.
 * @see https://modelviewer.dev/examples/scenegraph/
 */

export type ModelViewerRGBA = readonly [number, number, number, number];

export interface ModelViewerTexture {
  readonly name: string;
}

export interface ModelViewerTextureInfo {
  readonly texture: ModelViewerTexture | null;
  setTexture(texture: ModelViewerTexture | null): void;
}

export interface ModelViewerPBRMetallicRoughness {
  readonly baseColorFactor: ModelViewerRGBA;
  readonly metallicFactor: number;
  readonly roughnessFactor: number;
  readonly baseColorTexture: ModelViewerTextureInfo | null;
  readonly metallicRoughnessTexture: ModelViewerTextureInfo | null;
  setBaseColorFactor(rgba: ModelViewerRGBA | string): void;
  setMetallicFactor(value: number): void;
  setRoughnessFactor(value: number): void;
}

export interface ModelViewerMaterial {
  readonly name: string;
  readonly pbrMetallicRoughness: ModelViewerPBRMetallicRoughness;
}

export interface ModelViewerModel {
  readonly materials: ModelViewerMaterial[];
  getMaterialByName(name: string): ModelViewerMaterial | null;
}

export interface ModelViewerElement extends HTMLElement {
  readonly model?: ModelViewerModel;
  readonly loaded: boolean;
  createTexture(uri: string, type?: string): Promise<ModelViewerTexture | null>;
}

export type ModelViewerLoadEvent = Event & {
  target: ModelViewerElement;
};

export type ModelViewerErrorEvent = Event & {
  target: ModelViewerElement;
};
