import axios from "axios";
import { getAccessToken } from "../auth/session";

const api = axios.create({
  baseURL: "/api/v1",
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    if (!config.headers) {
      config.headers = {} as any;
    }
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  return config;
});

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
