package com.example.mealplanning.dto;

import com.example.mealplanning.entity.MealType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MealResponse {

    private String id;

    private String mealPlanId;

    private String foodId;

    private MealType mealType;

    private Double quantity;

    private String unit;
}
