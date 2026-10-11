package com.example.mealplanning.service;

import com.example.mealplanning.client.FoodDto;
import com.example.mealplanning.client.FoodServiceClient;
import com.example.mealplanning.dto.*;
import com.example.mealplanning.entity.Meal;
import com.example.mealplanning.entity.MealPlan;
import com.example.mealplanning.exception.ResourceNotFoundException;
import com.example.mealplanning.repository.MealPlanRepository;
import com.example.mealplanning.repository.MealRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MealPlanService {

    private final MealPlanRepository mealPlanRepository;
    private final MealRepository mealRepository;
    private final FoodServiceClient foodServiceClient;

    // ─────────────────────────────────────────────────────────────
    // 1. Create Meal Plan
    // ─────────────────────────────────────────────────────────────

    public MealPlanResponse createMealPlan(MealPlanRequest request) {
        MealPlan mealPlan = MealPlan.builder()
                .userId(request.getUserId())
                .planDate(request.getPlanDate())
                .createdAt(LocalDateTime.now())
                .build();

        MealPlan saved = mealPlanRepository.save(mealPlan);
        return toMealPlanResponse(saved, List.of());
    }

    // ─────────────────────────────────────────────────────────────
    // 2. Get User's Meal Plan (with meals)
    // ─────────────────────────────────────────────────────────────

    public MealPlanResponse getMealPlanByUserId(Long userId) {
        MealPlan mealPlan = mealPlanRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Meal plan not found for userId: " + userId));

        List<Meal> meals = mealRepository.findByMealPlanId(mealPlan.getId());
        List<MealResponse> mealResponses = meals.stream()
                .map(this::toMealResponse)
                .toList();

        return toMealPlanResponse(mealPlan, mealResponses);
    }

    // ─────────────────────────────────────────────────────────────
    // 3. Add Meal
    //    - Receives foodId, calls Food Database Service to validate
    //      the food exists, then stores only: foodId, mealType,
    //      quantity, mealPlanId. No nutrition data is persisted.
    // ─────────────────────────────────────────────────────────────

    public MealResponse addMeal(String planId, MealRequest request) {
        // Verify the meal plan exists
        mealPlanRepository.findById(planId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Meal plan not found with id: " + planId));

        // Call Food Database Service to verify food exists
        // (throws FeignException if food not found)
        foodServiceClient.getFoodById(request.getFoodId());

        Meal meal = Meal.builder()
                .mealPlanId(planId)
                .foodId(request.getFoodId())
                .mealType(request.getMealType())
                .quantity(request.getQuantity())
                .build();

        Meal saved = mealRepository.save(meal);
        return toMealResponse(saved);
    }

    // ─────────────────────────────────────────────────────────────
    // 4. Get Meals for a Meal Plan
    // ─────────────────────────────────────────────────────────────

    public List<MealResponse> getMeals(String planId) {
        mealPlanRepository.findById(planId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Meal plan not found with id: " + planId));

        return mealRepository.findByMealPlanId(planId)
                .stream()
                .map(this::toMealResponse)
                .toList();
    }

    // ─────────────────────────────────────────────────────────────
    // 5. Delete Meal
    // ─────────────────────────────────────────────────────────────

    public void deleteMeal(String planId, String mealId) {
        mealPlanRepository.findById(planId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Meal plan not found with id: " + planId));

        Meal meal = mealRepository.findById(mealId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Meal not found with id: " + mealId));

        mealRepository.delete(meal);
    }

    // ─────────────────────────────────────────────────────────────
    // 6. Daily Summary
    //    - Fetches all meals for the user's current plan.
    //    - For each meal, calls Food Database Service to get the
    //      nutrition per 100g, then scales by the meal's quantity.
    //    - Totals are computed and returned; nothing is persisted.
    // ─────────────────────────────────────────────────────────────

    public DailySummaryResponse getDailySummary(Long userId) {
        MealPlan mealPlan = mealPlanRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Meal plan not found for userId: " + userId));

        List<Meal> meals = mealRepository.findByMealPlanId(mealPlan.getId());

        double totalCalories = 0;
        double totalProtein = 0;
        double totalCarbs = 0;
        double totalFat = 0;

        for (Meal meal : meals) {
            // Fetch nutrition from Food Database Service
            FoodDto food = foodServiceClient.getFoodById(meal.getFoodId());

            if (food.getNutrition() != null) {
                // Nutrition values in the Food Database Service are per 100g.
                // Scale them to the actual quantity stored in the meal.
                double factor = meal.getQuantity() / 100.0;

                totalCalories    += (food.getNutrition().getCalories() != null ? food.getNutrition().getCalories() : 0.0)       * factor;
                totalProtein     += (food.getNutrition().getProtein() != null ? food.getNutrition().getProtein() : 0.0)         * factor;
                totalCarbs       += (food.getNutrition().getCarbohydrates() != null ? food.getNutrition().getCarbohydrates() : 0.0)   * factor;
                totalFat         += (food.getNutrition().getFat() != null ? food.getNutrition().getFat() : 0.0)             * factor;
            }
        }

        return DailySummaryResponse.builder()
                .date(mealPlan.getPlanDate())
                .totalCalories(round(totalCalories))
                .totalProtein(round(totalProtein))
                .totalCarbs(round(totalCarbs))
                .totalFat(round(totalFat))
                .build();
    }

    // ─────────────────────────────────────────────────────────────
    // Private helpers
    // ─────────────────────────────────────────────────────────────

    private MealPlanResponse toMealPlanResponse(MealPlan mealPlan, List<MealResponse> meals) {
        return MealPlanResponse.builder()
                .id(mealPlan.getId())
                .userId(mealPlan.getUserId())
                .planDate(mealPlan.getPlanDate())
                .createdAt(mealPlan.getCreatedAt())
                .meals(meals)
                .build();
    }

    private MealResponse toMealResponse(Meal meal) {
        return MealResponse.builder()
                .id(meal.getId())
                .mealPlanId(meal.getMealPlanId())
                .foodId(meal.getFoodId())
                .mealType(meal.getMealType())
                .quantity(meal.getQuantity())
                .build();
    }

    /** Round to 2 decimal places for cleaner output. */
    private double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
