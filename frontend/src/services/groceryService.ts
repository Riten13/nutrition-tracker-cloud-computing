import api from './api';
import {
  EstimatedCostResponse,
  GroceryItemRequest,
  GroceryItemResponse,
  GroceryItemUpdateRequest,
  GroceryListRequest,
  GroceryListResponse,
} from '../types';

export const groceryService = {
  async createGroceryList(payload: GroceryListRequest): Promise<GroceryListResponse> {
    const response = await api.post<GroceryListResponse>('/api/grocery-lists', payload);
    return response.data;
  },

  async getActiveGroceryList(userId: number): Promise<GroceryListResponse> {
    const response = await api.get<GroceryListResponse>(`/api/grocery-lists/${userId}`);
    return response.data;
  },

  async addGroceryItem(
    listId: string,
    item: GroceryItemRequest
  ): Promise<GroceryItemResponse> {
    const response = await api.post<GroceryItemResponse>(
      `/api/grocery-lists/${listId}/items`,
      item
    );
    return response.data;
  },

  async updateGroceryItem(
    listId: string,
    itemId: string,
    item: GroceryItemUpdateRequest
  ): Promise<GroceryItemResponse> {
    const response = await api.put<GroceryItemResponse>(
      `/api/grocery-lists/${listId}/items/${itemId}`,
      item
    );
    return response.data;
  },

  async deleteGroceryItem(listId: string, itemId: string): Promise<void> {
    await api.delete(`/api/grocery-lists/${listId}/items/${itemId}`);
  },

  async getEstimatedCost(listId: string): Promise<EstimatedCostResponse> {
    const response = await api.get<EstimatedCostResponse>(
      `/api/grocery-lists/${listId}/estimated-cost`
    );
    return response.data;
  },
};
