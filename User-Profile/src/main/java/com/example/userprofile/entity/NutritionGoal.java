package com.example.userprofile.entity;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NutritionGoal {

    private String fitnessGoal; // e.g. "LOSE_WEIGHT", "MAINTAIN_WEIGHT", "GAIN_WEIGHT"

    private Double calorieTarget;

    private Double proteinTarget;

    private Double carbTarget;

    private Double fatTarget;
}
