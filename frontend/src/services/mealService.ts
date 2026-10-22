import api from './api';
import {
  DailySummaryResponse,
  MealPlanRequest,
  MealPlanResponse,
  MealRequest,
  MealResponse,
} from '../types';

export const mealService = {
  async createMealPlan(payload: MealPlanRequest): Promise<MealPlanResponse> {
    const response = await api.post<MealPlanResponse>('/api/meal-plans', payload);
    return response.data;
  },

  async getMealPlan(userId: number, date?: string): Promise<MealPlanResponse> {
    const params = date ? { date } : undefined;
    const response = await api.get<MealPlanResponse>(`/api/meal-plans/${userId}`, { params });
    return response.data;
  },

  async addMeal(planId: string, meal: MealRequest): Promise<MealResponse> {
    const response = await api.post<MealResponse>(
      `/api/meal-plans/${planId}/meals`,
      meal
    );
    return response.data;
  },

  async updateMeal(planId: string, mealId: string, meal: MealRequest): Promise<MealResponse> {
    const response = await api.put<MealResponse>(
      `/api/meal-plans/${planId}/meals/${mealId}`,
      meal
    );
    return response.data;
  },

  async getMeals(planId: string): Promise<MealResponse[]> {
    const response = await api.get<MealResponse[]>(`/api/meal-plans/${planId}/meals`);
    return response.data;
  },

  async deleteMeal(planId: string, mealId: string): Promise<void> {
    await api.delete(`/api/meal-plans/${planId}/meals/${mealId}`);
  },

  async getDailySummary(userId: number, date?: string): Promise<DailySummaryResponse> {
    const params = date ? { date } : undefined;
    const response = await api.get<DailySummaryResponse>(
      `/api/meal-plans/${userId}/daily-summary`,
      { params }
    );
    return response.data;
  },

  async getNutritionHistory(
    userId: number,
    startDate?: string,
    endDate?: string
  ): Promise<DailySummaryResponse[]> {
    const params: Record<string, string> = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    const response = await api.get<DailySummaryResponse[]>(
      `/api/meal-plans/${userId}/history`,
      { params }
    );
    return response.data;
  },
};
