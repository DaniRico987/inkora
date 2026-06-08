import { createApiClient } from './createApiClient';

const apiClient = createApiClient();

export type GeoDetectResponse = {
  isInColombia: boolean;
  message: string;
};

/**
 * Envía las coordenadas del usuario al backend para verificar si se encuentra en Colombia.
 */
export async function detectGeo(
  latitude: number,
  longitude: number,
): Promise<GeoDetectResponse> {
  const response = await apiClient.post<GeoDetectResponse>('/geo/detect', {
    latitude,
    longitude,
  });
  return response.data;
}
