package com.example.fooddatabase.service;

import com.example.fooddatabase.dto.FoodRequest;
import com.example.fooddatabase.dto.FoodResponse;
import com.example.fooddatabase.dto.NutritionDto;
import com.example.fooddatabase.exception.FoodNotFoundException;
import com.example.fooddatabase.model.Food;
import com.example.fooddatabase.model.Nutrition;
import com.example.fooddatabase.repository.FoodRepository;
import com.example.fooddatabase.exception.InvalidImageException;
import com.example.fooddatabase.util.ImageValidator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * FoodService contains all the business logic for managing foods and S3 images.
 *
 * It sits between the Controller (HTTP layer) and the Repository (database layer).
 * It also handles mapping between model objects (Food) and DTOs (FoodRequest / FoodResponse).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FoodService {

    private final FoodRepository foodRepository;
    private final S3StorageService s3StorageService;
    private final ImageValidator imageValidator;

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

        Food food = foodRepository.findById(foodId)
                .orElseThrow(() -> new FoodNotFoundException(foodId));

        // If food has an associated S3 image, clean it up
        if (food.getImageKey() != null && !food.getImageKey().isBlank()) {
            try {
                s3StorageService.deleteImage(food.getImageKey());
            } catch (Exception e) {
                log.warn("Failed to delete S3 image '{}' for food '{}': {}", food.getImageKey(), foodId, e.getMessage());
            }
        }

        foodRepository.deleteById(foodId);
    }

    // ─────────────────────────────────────────────────────────────
    // 6. Upload or Replace Food Image
    // ─────────────────────────────────────────────────────────────

    /**
     * Uploads or replaces an image for an existing food item.
     * Validates image content (JPG, PNG, WebP, max 5 MB).
     * Stores unique key in MongoDB and deletes old image only after successful DB save.
     * Cleans up newly uploaded image if database update fails.
     */
    public FoodResponse uploadFoodImage(String foodId, MultipartFile file) {
        log.info("Uploading food image for foodId: {}", foodId);

        Food food = foodRepository.findById(foodId)
                .orElseThrow(() -> new FoodNotFoundException(foodId));

        // 1. Content validation (magic bytes, size <= 5MB)
        ImageValidator.SupportedFormat format = imageValidator.validate(file);

        // 2. Remember old image key to delete only after successful replacement
        String oldImageKey = food.getImageKey();

        // 3. Generate unique S3 key under food-images/
        String newImageKey = "food-images/" + foodId + "_" + UUID.randomUUID() + "." + format.getExtension();

        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            throw new InvalidImageException("Failed to read image data: " + e.getMessage());
        }

        // 4. Upload new image to AWS S3
        s3StorageService.uploadImage(newImageKey, bytes, format.getMimeType());

        // 5. Update MongoDB document with new imageKey
        try {
            food.setImageKey(newImageKey);
            food = foodRepository.save(food);
            log.info("Successfully updated foodId '{}' with new S3 imageKey '{}'", foodId, newImageKey);
        } catch (Exception dbEx) {
            log.error("Database update failed after S3 upload. Cleaning up orphaned S3 object: {}", newImageKey, dbEx);
            try {
                s3StorageService.deleteImage(newImageKey);
            } catch (Exception cleanupEx) {
                log.error("Failed to clean up S3 object '{}': {}", newImageKey, cleanupEx.getMessage());
            }
            throw dbEx;
        }

        // 6. Database save succeeded! Now clean up old superseded image
        if (oldImageKey != null && !oldImageKey.isBlank()) {
            try {
                s3StorageService.deleteImage(oldImageKey);
                log.info("Deleted superseded old S3 image '{}' for foodId '{}'", oldImageKey, foodId);
            } catch (Exception ex) {
                log.warn("Failed to delete superseded old S3 image '{}': {}", oldImageKey, ex.getMessage());
            }
        }

        return toFoodResponse(food);
    }

    // ─────────────────────────────────────────────────────────────
    // 7. Delete Food Image
    // ─────────────────────────────────────────────────────────────

    /**
     * Deletes the image for a food item and clears the imageKey in MongoDB.
     */
    public FoodResponse deleteFoodImage(String foodId) {
        log.info("Deleting image for foodId: {}", foodId);

        Food food = foodRepository.findById(foodId)
                .orElseThrow(() -> new FoodNotFoundException(foodId));

        String imageKey = food.getImageKey();
        if (imageKey != null && !imageKey.isBlank()) {
            try {
                s3StorageService.deleteImage(imageKey);
            } catch (Exception e) {
                log.warn("S3 delete warning for key '{}': {}", imageKey, e.getMessage());
            }
            food.setImageKey(null);
            food = foodRepository.save(food);
        }

        return toFoodResponse(food);
    }

    // ─────────────────────────────────────────────────────────────
    // 8. Get Nutrition
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
     * Automatically generates a temporary presigned GET URL if an imageKey is present.
     */
    private FoodResponse toFoodResponse(Food food) {
        String presignedUrl = null;
        if (food.getImageKey() != null && !food.getImageKey().isBlank()) {
            presignedUrl = s3StorageService.generatePresignedUrl(food.getImageKey());
        }

        return FoodResponse.builder()
                .id(food.getId())
                .name(food.getName())
                .category(food.getCategory())
                .description(food.getDescription())
                .imageKey(food.getImageKey())
                .imageUrl(presignedUrl)
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
