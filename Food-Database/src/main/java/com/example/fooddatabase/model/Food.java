package com.example.fooddatabase.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * Food is the main MongoDB document stored in the "foods" collection.
 * Nutrition is embedded directly inside this document.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "foods")
public class Food {

    @Id
    private String id;

    private String name;
    private String category;
    private String description;

    // Nutrition is embedded inside the food document (NOT a separate collection)
    private Nutrition nutrition;

    // S3 object key for the food image (e.g., "food-images/food123_abc.jpg")
    private String imageKey;
}
