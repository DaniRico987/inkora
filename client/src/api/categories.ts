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
  const { data } = await api.get<Array<{ id?: number; categoryId?: number; name: string; description?: string | null }>>('/categories');

  return data
    .map((category) => ({
      categoryId: Number(category.categoryId ?? category.id),
      name: category.name,
      description: category.description ?? null,
    }))
    .filter((category) => Number.isFinite(category.categoryId));
}
