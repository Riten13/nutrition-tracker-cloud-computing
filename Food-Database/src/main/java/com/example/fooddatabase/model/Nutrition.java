package com.example.fooddatabase.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Nutrition is an embedded object stored inside a Food document.
 * It is NOT stored as a separate MongoDB collection.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Nutrition {

    private double servingSize;
    private String servingUnit;
    private Double servingWeightGrams;

    private double calories;
    private double protein;
    private double carbs;
    private double fat;
    private double fiber;
}
