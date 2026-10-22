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
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class MealPlanService {

    private final MealPlanRepository mealPlanRepository;
    private final MealRepository mealRepository;
    private final FoodServiceClient foodServiceClient;

    // ─────────────────────────────────────────────────────────────
    // 1. Create Meal Plan (Idempotent for same user + date)
    // ─────────────────────────────────────────────────────────────

    public MealPlanResponse createMealPlan(MealPlanRequest request) {
        LocalDate date = request.getPlanDate() != null ? request.getPlanDate() : LocalDate.now();

        // Check if a plan already exists for this user and date
        Optional<MealPlan> existingPlan = mealPlanRepository.findByUserIdAndPlanDate(request.getUserId(), date);
        if (existingPlan.isPresent()) {
            MealPlan plan = existingPlan.get();
            List<Meal> meals = mealRepository.findByMealPlanId(plan.getId());
            List<MealResponse> mealResponses = meals.stream().map(this::toMealResponse).toList();
            return toMealPlanResponse(plan, mealResponses);
        }

        MealPlan mealPlan = MealPlan.builder()
                .userId(request.getUserId())
                .planDate(date)
                .createdAt(LocalDateTime.now())
                .build();

        MealPlan saved = mealPlanRepository.save(mealPlan);
        return toMealPlanResponse(saved, List.of());
    }

    // ─────────────────────────────────────────────────────────────
    // 2. Get User's Meal Plan by Date
    // ─────────────────────────────────────────────────────────────

    public MealPlanResponse getMealPlanByUserIdAndDate(Long userId, LocalDate date) {
        MealPlan mealPlan;
        if (date != null) {
            mealPlan = mealPlanRepository.findByUserIdAndPlanDate(userId, date)
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Meal plan not found for userId: " + userId + " on date: " + date));
        } else {
            mealPlan = mealPlanRepository.findFirstByUserIdOrderByPlanDateDesc(userId)
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Meal plan not found for userId: " + userId));
        }

        List<Meal> meals = mealRepository.findByMealPlanId(mealPlan.getId());
        List<MealResponse> mealResponses = meals.stream()
                .map(this::toMealResponse)
                .toList();

        return toMealPlanResponse(mealPlan, mealResponses);
    }

    public MealPlanResponse getMealPlanByUserId(Long userId) {
        return getMealPlanByUserIdAndDate(userId, null);
    }

    // ─────────────────────────────────────────────────────────────
    // 3. Add Meal
    // ─────────────────────────────────────────────────────────────

    public MealResponse addMeal(String planId, MealRequest request, Long authenticatedUserId) {
        MealPlan mealPlan = mealPlanRepository.findById(planId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Meal plan not found with id: " + planId));

        if (authenticatedUserId != null && !mealPlan.getUserId().equals(authenticatedUserId)) {
            throw new AccessDeniedException("Access denied: You do not own this meal plan");
        }

        // Call Food Database Service to verify food exists
        foodServiceClient.getFoodById(request.getFoodId());

        Meal meal = Meal.builder()
                .mealPlanId(planId)
                .foodId(request.getFoodId())
                .mealType(request.getMealType())
                .quantity(request.getQuantity())
                .unit(request.getUnit() != null && !request.getUnit().isBlank() ? request.getUnit().trim() : "g")
                .build();

        Meal saved = mealRepository.save(meal);
        return toMealResponse(saved);
    }

    // ─────────────────────────────────────────────────────────────
    // 4. Update Meal (Edit food, quantity, mealType, unit)
    // ─────────────────────────────────────────────────────────────

    public MealResponse updateMeal(String planId, String mealId, MealRequest request, Long authenticatedUserId) {
        MealPlan mealPlan = mealPlanRepository.findById(planId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Meal plan not found with id: " + planId));

        if (authenticatedUserId != null && !mealPlan.getUserId().equals(authenticatedUserId)) {
            throw new AccessDeniedException("Access denied: You do not own this meal plan");
        }

        Meal meal = mealRepository.findById(mealId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Meal not found with id: " + mealId));

        if (!meal.getMealPlanId().equals(planId)) {
            throw new IllegalArgumentException("Meal does not belong to the specified meal plan");
        }

        // Verify food exists if updated
        if (request.getFoodId() != null && !request.getFoodId().isBlank()) {
            foodServiceClient.getFoodById(request.getFoodId());
            meal.setFoodId(request.getFoodId());
        }

        if (request.getMealType() != null) {
            meal.setMealType(request.getMealType());
        }

        if (request.getQuantity() != null) {
            meal.setQuantity(request.getQuantity());
        }

        if (request.getUnit() != null && !request.getUnit().isBlank()) {
            meal.setUnit(request.getUnit().trim());
        }

        Meal updatedMeal = mealRepository.save(meal);
        return toMealResponse(updatedMeal);
    }

    // ─────────────────────────────────────────────────────────────
    // 5. Get Meals for a Meal Plan
    // ─────────────────────────────────────────────────────────────

    public List<MealResponse> getMeals(String planId, Long authenticatedUserId) {
        MealPlan mealPlan = mealPlanRepository.findById(planId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Meal plan not found with id: " + planId));

        if (authenticatedUserId != null && !mealPlan.getUserId().equals(authenticatedUserId)) {
            throw new AccessDeniedException("Access denied: You do not own this meal plan");
        }

        return mealRepository.findByMealPlanId(planId)
                .stream()
                .map(this::toMealResponse)
                .toList();
    }

    // ─────────────────────────────────────────────────────────────
    // 6. Delete Meal
    // ─────────────────────────────────────────────────────────────

    public void deleteMeal(String planId, String mealId, Long authenticatedUserId) {
        MealPlan mealPlan = mealPlanRepository.findById(planId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Meal plan not found with id: " + planId));

        if (authenticatedUserId != null && !mealPlan.getUserId().equals(authenticatedUserId)) {
            throw new AccessDeniedException("Access denied: You do not own this meal plan");
        }

        Meal meal = mealRepository.findById(mealId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Meal not found with id: " + mealId));

        mealRepository.delete(meal);
    }

    // ─────────────────────────────────────────────────────────────
    // 7. Daily Summary for a specific Date
    // ─────────────────────────────────────────────────────────────

    public DailySummaryResponse getDailySummary(Long userId, LocalDate date) {
        LocalDate targetDate = date != null ? date : LocalDate.now();

        Optional<MealPlan> optionalPlan = mealPlanRepository.findByUserIdAndPlanDate(userId, targetDate);
        if (optionalPlan.isEmpty()) {
            return DailySummaryResponse.builder()
                    .date(targetDate)
                    .totalCalories(0.0)
                    .totalProtein(0.0)
                    .totalCarbs(0.0)
                    .totalFat(0.0)
                    .build();
        }

        MealPlan mealPlan = optionalPlan.get();
        List<Meal> meals = mealRepository.findByMealPlanId(mealPlan.getId());

        double totalCalories = 0;
        double totalProtein = 0;
        double totalCarbs = 0;
        double totalFat = 0;

        for (Meal meal : meals) {
            try {
                FoodDto food = foodServiceClient.getFoodById(meal.getFoodId());
                if (food != null && food.getNutrition() != null) {
                    double grams = calculateMealGrams(meal, food);
                    double factor = grams / 100.0;
                    totalCalories += (food.getNutrition().getCalories() != null ? food.getNutrition().getCalories() : 0.0) * factor;
                    totalProtein  += (food.getNutrition().getProtein() != null ? food.getNutrition().getProtein() : 0.0) * factor;
                    totalCarbs    += (food.getNutrition().getCarbohydrates() != null ? food.getNutrition().getCarbohydrates() : 0.0) * factor;
                    totalFat      += (food.getNutrition().getFat() != null ? food.getNutrition().getFat() : 0.0) * factor;
                }
            } catch (Exception e) {
                log.warn("Could not retrieve food {} for daily summary calculation: {}", meal.getFoodId(), e.getMessage());
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

    public DailySummaryResponse getDailySummary(Long userId) {
        return getDailySummary(userId, null);
    }

    // ─────────────────────────────────────────────────────────────
    // 8. Nutrition History for a Date Range (Includes 0-value days)
    //    Uses food caching to avoid duplicate Feign requests.
    // ─────────────────────────────────────────────────────────────

    public List<DailySummaryResponse> getNutritionHistory(Long userId, LocalDate startDate, LocalDate endDate) {
        LocalDate end = endDate != null ? endDate : LocalDate.now();
        LocalDate start = startDate != null ? startDate : end.minusDays(6);

        if (start.isAfter(end)) {
            throw new IllegalArgumentException("startDate cannot be after endDate");
        }

        // 1. Fetch meal plans within the date range
        List<MealPlan> mealPlans = mealPlanRepository.findAllByUserIdAndPlanDateBetweenOrderByPlanDateAsc(userId, start, end);
        Map<LocalDate, MealPlan> plansByDate = mealPlans.stream()
                .collect(Collectors.toMap(MealPlan::getPlanDate, p -> p, (p1, p2) -> p1));

        // 2. Collect all meal plan IDs to fetch meals
        List<String> planIds = mealPlans.stream().map(MealPlan::getId).toList();
        Map<String, List<Meal>> mealsByPlanId = new HashMap<>();
        for (String pid : planIds) {
            mealsByPlanId.put(pid, mealRepository.findByMealPlanId(pid));
        }

        // 3. Collect distinct foodIds and cache them via Feign (at most 1 call per distinct food)
        Set<String> distinctFoodIds = mealsByPlanId.values().stream()
                .flatMap(List::stream)
                .map(Meal::getFoodId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Map<String, FoodDto> foodCache = new HashMap<>();
        for (String foodId : distinctFoodIds) {
            try {
                FoodDto food = foodServiceClient.getFoodById(foodId);
                if (food != null) {
                    foodCache.put(foodId, food);
                }
            } catch (Exception e) {
                log.warn("Could not retrieve food {} during history aggregation: {}", foodId, e.getMessage());
            }
        }

        // 4. Build a continuous daily timeline (including days with 0 meals)
        List<DailySummaryResponse> history = new ArrayList<>();
        LocalDate cursor = start;
        while (!cursor.isAfter(end)) {
            MealPlan plan = plansByDate.get(cursor);
            if (plan == null) {
                history.add(DailySummaryResponse.builder()
                        .date(cursor)
                        .totalCalories(0.0)
                        .totalProtein(0.0)
                        .totalCarbs(0.0)
                        .totalFat(0.0)
                        .build());
            } else {
                List<Meal> meals = mealsByPlanId.getOrDefault(plan.getId(), Collections.emptyList());
                double dayCalories = 0;
                double dayProtein = 0;
                double dayCarbs = 0;
                double dayFat = 0;

                for (Meal meal : meals) {
                    FoodDto food = foodCache.get(meal.getFoodId());
                    if (food != null && food.getNutrition() != null) {
                        double grams = calculateMealGrams(meal, food);
                        double factor = grams / 100.0;
                        dayCalories += (food.getNutrition().getCalories() != null ? food.getNutrition().getCalories() : 0.0) * factor;
                        dayProtein  += (food.getNutrition().getProtein() != null ? food.getNutrition().getProtein() : 0.0) * factor;
                        dayCarbs    += (food.getNutrition().getCarbohydrates() != null ? food.getNutrition().getCarbohydrates() : 0.0) * factor;
                        dayFat      += (food.getNutrition().getFat() != null ? food.getNutrition().getFat() : 0.0) * factor;
                    }
                }

                history.add(DailySummaryResponse.builder()
                        .date(cursor)
                        .totalCalories(round(dayCalories))
                        .totalProtein(round(dayProtein))
                        .totalCarbs(round(dayCarbs))
                        .totalFat(round(dayFat))
                        .build());
            }
            cursor = cursor.plusDays(1);
        }

        return history;
    }

    // ─────────────────────────────────────────────────────────────
    // Helper: Convert portion quantity to grams based on food serving
    // ─────────────────────────────────────────────────────────────

    public double calculateMealGrams(Meal meal, FoodDto food) {
        if (meal.getQuantity() == null || meal.getQuantity() <= 0) {
            return 0.0;
        }

        String unit = meal.getUnit();
        // If unit is explicitly grams, or null/empty (for full backward compatibility), quantity is already in grams
        if (unit == null || unit.trim().isEmpty() || unit.equalsIgnoreCase("g") || unit.equalsIgnoreCase("grams") || unit.equalsIgnoreCase("gram")) {
            return meal.getQuantity();
        }

        // If serving weight in grams exists on the food item (e.g., 1 piece roti = 35g, 1 cup rice = 150g)
        if (food != null && food.getNutrition() != null) {
            Double servingWeight = food.getNutrition().getServingWeightGrams();
            Double servingSize = food.getNutrition().getServingSize();
            if (servingWeight != null && servingWeight > 0) {
                double baseServing = (servingSize != null && servingSize > 0) ? servingSize : 1.0;
                return meal.getQuantity() * (servingWeight / baseServing);
            }
        }

        // Fallback: If no conversion metadata exists, treat quantity directly as grams
        return meal.getQuantity();
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
                .unit(meal.getUnit())
                .build();
    }

    private double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
