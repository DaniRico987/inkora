import { createApiClient } from "./createApiClient";

const api = createApiClient();

export type SubscribePayload = {
  categoryId: number;
};

export type Subscription = {
  id: number;
  categoryId: number;
  categoryName: string;
  userId: number;
  createdAt: string;
};

export async function getSubscriptions(): Promise<Subscription[]> {
  const { data } = await api.get<Subscription[]>("/subscriptions");
  return data;
}

export async function subscribeToCategory(categoryId: number): Promise<Subscription> {
  const { data } = await api.post<Subscription>("/subscriptions", {
    categoryId,
  });
  return data;
}

export async function unsubscribeFromCategory(categoryId: number): Promise<void> {
  await api.delete(`/subscriptions/${categoryId}`);
}
