package com.example.fooddatabase.service;

import com.example.fooddatabase.dto.FoodRequest;
import com.example.fooddatabase.dto.FoodResponse;
import com.example.fooddatabase.dto.NutritionDto;
import com.example.fooddatabase.exception.FoodNotFoundException;
import com.example.fooddatabase.model.Food;
import com.example.fooddatabase.model.Nutrition;
import com.example.fooddatabase.repository.FoodRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

/**
 * FoodService contains all the business logic for managing foods.
 *
 * It sits between the Controller (HTTP layer) and the Repository (database layer).
 * It also handles mapping between model objects (Food) and DTOs (FoodRequest / FoodResponse).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FoodService {

    // Spring injects FoodRepository automatically via @RequiredArgsConstructor
    private final FoodRepository foodRepository;

    // ─────────────────────────────────────────────────────────────
    // 1. Get / Search Foods
    // ─────────────────────────────────────────────────────────────

    /**
     * Returns all foods, or filters by name or category if provided.
     * Called by GET /api/foods
     */
    public List<FoodResponse> getFoods(String name, String category) {

        List<Food> foods;

        if (name != null && !name.isBlank()) {
            // Search by name (partial, case-insensitive)
            log.debug("Searching foods by name: {}", name);
            foods = foodRepository.findByNameContainingIgnoreCase(name);

        } else if (category != null && !category.isBlank()) {
            // Filter by category (case-insensitive)
            log.debug("Filtering foods by category: {}", category);
            foods = foodRepository.findByCategoryIgnoreCase(category);

        } else {
            // No filter — return all foods
            log.debug("Fetching all foods");
            foods = foodRepository.findAll();
        }

        // Convert each Food model → FoodResponse DTO
        return foods.stream()
                .map(this::toFoodResponse)
                .collect(Collectors.toList());
    }

    // ─────────────────────────────────────────────────────────────
    // 2. Get Food by ID
    // ─────────────────────────────────────────────────────────────

    /**
     * Returns a single food by its ID, including nutrition.
     * Called by GET /api/foods/{foodId}
     */
    public FoodResponse getFoodById(String foodId) {
        log.debug("Fetching food with id: {}", foodId);

        Food food = foodRepository.findById(foodId)
                .orElseThrow(() -> new FoodNotFoundException(foodId));

        return toFoodResponse(food);
    }

    // ─────────────────────────────────────────────────────────────
    // 3. Add Food
    // ─────────────────────────────────────────────────────────────

    /**
     * Creates a new food document in MongoDB.
     * Called by POST /api/foods
     */
    public FoodResponse addFood(FoodRequest request) {
        log.debug("Adding new food: {}", request.getName());

        // Convert request DTO → Food model
        Food food = toFood(request);

        // Save to MongoDB (Spring Data generates the _id automatically)
        Food savedFood = foodRepository.save(food);

        return toFoodResponse(savedFood);
    }

    // ─────────────────────────────────────────────────────────────
    // 4. Update Food
    // ─────────────────────────────────────────────────────────────

    /**
     * Updates an existing food document by its ID.
     * Called by PUT /api/foods/{foodId}
     */
    public FoodResponse updateFood(String foodId, FoodRequest request) {
        log.debug("Updating food with id: {}", foodId);

        // First check if the food exists — throw 404 if not
        Food existingFood = foodRepository.findById(foodId)
                .orElseThrow(() -> new FoodNotFoundException(foodId));

        // Update all fields
        existingFood.setName(request.getName());
        existingFood.setCategory(request.getCategory());
        existingFood.setDescription(request.getDescription());

        // Update embedded nutrition
        if (request.getNutrition() != null) {
            existingFood.setNutrition(toNutrition(request.getNutrition()));
        }

        // Save updated document back to MongoDB
        Food updatedFood = foodRepository.save(existingFood);

        return toFoodResponse(updatedFood);
    }

    // ─────────────────────────────────────────────────────────────
    // 5. Delete Food
    // ─────────────────────────────────────────────────────────────

    /**
     * Deletes a food document by its ID.
     * Called by DELETE /api/foods/{foodId}
     */
    public void deleteFood(String foodId) {
        log.debug("Deleting food with id: {}", foodId);

        // Check food exists before deleting — throw 404 if not found
        if (!foodRepository.existsById(foodId)) {
            throw new FoodNotFoundException(foodId);
        }

        foodRepository.deleteById(foodId);
    }

    // ─────────────────────────────────────────────────────────────
    // 6. Get Nutrition
    // ─────────────────────────────────────────────────────────────

    /**
     * Returns only the nutrition information for a food.
     * Called by GET /api/foods/{foodId}/nutrition
     */
    public NutritionDto getNutrition(String foodId) {
        log.debug("Fetching nutrition for food id: {}", foodId);

        Food food = foodRepository.findById(foodId)
                .orElseThrow(() -> new FoodNotFoundException(foodId));

        return toNutritionDto(food.getNutrition());
    }

    // ─────────────────────────────────────────────────────────────
    // Private helper methods — mapping between model ↔ DTO
    // ─────────────────────────────────────────────────────────────

    /**
     * Converts a FoodRequest DTO → Food model (for saving to MongoDB).
     */
    private Food toFood(FoodRequest request) {
        return Food.builder()
                .name(request.getName())
                .category(request.getCategory())
                .description(request.getDescription())
                .nutrition(request.getNutrition() != null
                        ? toNutrition(request.getNutrition())
                        : null)
                .build();
    }

    /**
     * Converts a Food model → FoodResponse DTO (for returning to the client).
     */
    private FoodResponse toFoodResponse(Food food) {
        return FoodResponse.builder()
                .id(food.getId())
                .name(food.getName())
                .category(food.getCategory())
                .description(food.getDescription())
                .nutrition(food.getNutrition() != null
                        ? toNutritionDto(food.getNutrition())
                        : null)
                .build();
    }

    /**
     * Converts a NutritionDto → Nutrition model (for storing in Food document).
     */
    private Nutrition toNutrition(NutritionDto dto) {
        return Nutrition.builder()
                .servingSize(dto.getServingSize())
                .servingUnit(dto.getServingUnit())
                .servingWeightGrams(dto.getServingWeightGrams())
                .calories(dto.getCalories())
                .protein(dto.getProtein())
                .carbs(dto.getCarbs())
                .fat(dto.getFat())
                .fiber(dto.getFiber())
                .build();
    }

    /**
     * Converts a Nutrition model → NutritionDto (for returning to the client).
     */
    private NutritionDto toNutritionDto(Nutrition nutrition) {
        return NutritionDto.builder()
                .servingSize(nutrition.getServingSize())
                .servingUnit(nutrition.getServingUnit())
                .servingWeightGrams(nutrition.getServingWeightGrams())
                .calories(nutrition.getCalories())
                .protein(nutrition.getProtein())
                .carbs(nutrition.getCarbs())
                .fat(nutrition.getFat())
                .fiber(nutrition.getFiber())
                .build();
    }
}
