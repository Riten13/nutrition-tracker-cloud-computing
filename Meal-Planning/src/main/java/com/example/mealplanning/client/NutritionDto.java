package com.example.mealplanning.client;

import com.fasterxml.jackson.annotation.JsonAlias;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Represents the nutrition data returned by the Food Database Service.
 * Per 100g values as returned by GET /api/foods/{foodId}.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class NutritionDto {

    private Double calories;

    private Double protein;

    @JsonAlias({"carbs", "carbohydrates"})
    private Double carbohydrates;

    private Double fat;
}
