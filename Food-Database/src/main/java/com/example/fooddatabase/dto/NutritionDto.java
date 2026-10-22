package com.example.fooddatabase.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO used when returning nutrition information to the client.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Nutrition information for a food item")
public class NutritionDto {

    @Schema(description = "Serving size quantity", example = "100")
    private double servingSize;

    @Schema(description = "Unit of the serving size", example = "g")
    private String servingUnit;

    @Schema(description = "Weight in grams for this serving (e.g. 1 piece roti = 35g, 1 cup rice = 150g)", example = "100.0")
    private Double servingWeightGrams;

    @Schema(description = "Calories per serving", example = "165")
    private double calories;

    @Schema(description = "Protein in grams per serving", example = "31")
    private double protein;

    @Schema(description = "Carbohydrates in grams per serving", example = "0")
    private double carbs;

    @Schema(description = "Fat in grams per serving", example = "3.6")
    private double fat;

    @Schema(description = "Dietary fiber in grams per serving", example = "0")
    private double fiber;
}
