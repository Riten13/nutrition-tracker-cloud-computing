import api from './api';
import {
  UserProfileResponse,
  ProfileDto,
  AllergyDto,
  DietaryPreferenceDto,
} from '../types';

export const userService = {
  async getUserProfile(userId: number): Promise<UserProfileResponse> {
    const response = await api.get<UserProfileResponse>(`/api/users/${userId}`);
    return response.data;
  },

  async updateProfile(userId: number, profile: ProfileDto): Promise<ProfileDto> {
    const response = await api.put<ProfileDto>(`/api/users/${userId}`, profile);
    return response.data;
  },

  async getAllergies(userId: number): Promise<AllergyDto[]> {
    const response = await api.get<AllergyDto[]>(`/api/users/${userId}/allergies`);
    return response.data;
  },

  async addAllergy(userId: number, allergy: { name: string }): Promise<AllergyDto> {
    const response = await api.post<AllergyDto>(`/api/users/${userId}/allergies`, allergy);
    return response.data;
  },

  async deleteAllergy(userId: number, allergyId: number): Promise<void> {
    await api.delete(`/api/users/${userId}/allergies/${allergyId}`);
  },

  async updatePreferences(
    userId: number,
    preferences: DietaryPreferenceDto
  ): Promise<DietaryPreferenceDto> {
    const response = await api.put<DietaryPreferenceDto>(
      `/api/users/${userId}/preferences`,
      preferences
    );
    return response.data;
  },
};
