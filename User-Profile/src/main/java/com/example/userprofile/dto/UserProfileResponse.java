package com.example.userprofile.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class UserProfileResponse {
    private Long id;
    private String name;
    private String email;
    private ProfileDto profile;
    private List<AllergyDto> allergies;
    private DietaryPreferenceDto dietaryPreference;
    private NutritionGoalDto nutritionGoal;
}
