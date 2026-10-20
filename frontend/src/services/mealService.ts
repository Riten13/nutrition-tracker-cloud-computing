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

  async getMealPlan(userId: number): Promise<MealPlanResponse> {
    const response = await api.get<MealPlanResponse>(`/api/meal-plans/${userId}`);
    return response.data;
  },

  async addMeal(planId: string, meal: MealRequest): Promise<MealResponse> {
    const response = await api.post<MealResponse>(
      `/api/meal-plans/${planId}/meals`,
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

  async getDailySummary(userId: number): Promise<DailySummaryResponse> {
    const response = await api.get<DailySummaryResponse>(
      `/api/meal-plans/${userId}/daily-summary`
    );
    return response.data;
  },
};
