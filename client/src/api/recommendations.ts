import axios from 'axios';
import { createApiClient } from './createApiClient';
import type { BookListItem } from './books';

export type RecommendationStrategy = 'history' | 'popular' | 'bot';

export type RecommendationItem = {
  book: BookListItem;
  score: number;
  reasons: string[];
};

export type RecommendationsResponse = {
  strategy: RecommendationStrategy;
  generatedAt: string;
  items: RecommendationItem[];
};

export type RecommendationBotPayload = {
  preferredCategoryIds?: number[];
  preferredAuthors?: string[];
  keywords?: string;
  language?: string;
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
  excludeOwned?: boolean;
};

const apiClient = createApiClient();

function normalizeApiError(error: unknown, fallback: string): Error {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data as
      | { message?: string | string[]; code?: string }
      | undefined;
    const message = payload?.message;
    const err = new Error(
      Array.isArray(message)
        ? message.join(', ')
        : typeof message === 'string' && message.trim().length > 0
          ? message
          : fallback,
    );

    try {
      (err as any).status = error.response?.status;
      (err as any).data = error.response?.data;
      if (payload?.code) {
        (err as any).code = payload.code;
      }
    } catch {
      // ignore
    }

    return err;
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error(fallback);
}

export async function getRecommendations(): Promise<RecommendationsResponse> {
  try {
    const response =
      await apiClient.get<RecommendationsResponse>('/recommendations');
    return response.data;
  } catch (error) {
    throw normalizeApiError(error, 'No se pudieron cargar las recomendaciones');
  }
}

export async function getBotRecommendations(
  payload: RecommendationBotPayload,
): Promise<RecommendationsResponse> {
  try {
    const response = await apiClient.post<RecommendationsResponse>(
      '/recommendations/bot',
      payload,
    );
    return response.data;
  } catch (error) {
    throw normalizeApiError(error, 'No se pudieron generar recomendaciones');
  }
}
