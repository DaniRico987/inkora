import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
});

export type Category = {
  categoryId: number;
  name: string;
  description?: string | null;
};

export async function getCategories() {
  const { data } = await api.get<Category[]>('/categories');
  return data;
}
