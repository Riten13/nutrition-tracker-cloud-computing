import api from './api';
import { FoodRequest, FoodResponse, NutritionDto } from '../types';

export const foodService = {
  async getFoods(name?: string, category?: string): Promise<FoodResponse[]> {
    const params: Record<string, string> = {};
    if (name && name.trim()) params.name = name.trim();
    if (category && category.trim()) params.category = category.trim();

    const response = await api.get<FoodResponse[]>('/api/foods', { params });
    return response.data;
  },

  async getFoodById(foodId: string): Promise<FoodResponse> {
    const response = await api.get<FoodResponse>(`/api/foods/${foodId}`);
    return response.data;
  },

  async addFood(food: FoodRequest): Promise<FoodResponse> {
    const response = await api.post<FoodResponse>('/api/foods', food);
    return response.data;
  },

  async updateFood(foodId: string, food: FoodRequest): Promise<FoodResponse> {
    const response = await api.put<FoodResponse>(`/api/foods/${foodId}`, food);
    return response.data;
  },

  async deleteFood(foodId: string): Promise<void> {
    await api.delete(`/api/foods/${foodId}`);
  },

  async getNutrition(foodId: string): Promise<NutritionDto> {
    const response = await api.get<NutritionDto>(`/api/foods/${foodId}/nutrition`);
    return response.data;
  },
};
