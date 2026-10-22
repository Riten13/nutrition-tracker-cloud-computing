package com.example.userprofile.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "User's personalized daily nutrition and fitness goals")
public class NutritionGoalDto {

    @Schema(description = "Fitness goal type: LOSE_WEIGHT, MAINTAIN_WEIGHT, GAIN_WEIGHT", example = "MAINTAIN_WEIGHT")
    private String fitnessGoal;

    @Schema(description = "Daily calorie target in kcal", example = "2000.0")
    private Double calorieTarget;

    @Schema(description = "Daily protein target in grams", example = "140.0")
    private Double proteinTarget;

    @Schema(description = "Daily carbohydrates target in grams", example = "230.0")
    private Double carbTarget;

    @Schema(description = "Daily fat target in grams", example = "60.0")
    private Double fatTarget;
}
