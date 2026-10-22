package com.example.mealplanning.service;

import com.example.mealplanning.client.FoodDto;
import com.example.mealplanning.client.NutritionDto;
import com.example.mealplanning.client.FoodServiceClient;
import com.example.mealplanning.dto.*;
import com.example.mealplanning.entity.Meal;
import com.example.mealplanning.entity.MealPlan;
import com.example.mealplanning.entity.MealType;
import com.example.mealplanning.repository.MealPlanRepository;
import com.example.mealplanning.repository.MealRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MealPlanServiceTest {

    @Mock
    private MealPlanRepository mealPlanRepository;

    @Mock
    private MealRepository mealRepository;

    @Mock
    private FoodServiceClient foodServiceClient;

    @InjectMocks
    private MealPlanService mealPlanService;

    private Long userId = 101L;
    private LocalDate today = LocalDate.of(2026, 10, 22);

    @Test
    @DisplayName("createMealPlan creates a new plan when no plan exists for user and date")
    void createMealPlan_whenNotExists_createsNew() {
        MealPlanRequest request = new MealPlanRequest();
        request.setUserId(userId);
        request.setPlanDate(today);

        when(mealPlanRepository.findByUserIdAndPlanDate(userId, today)).thenReturn(Optional.empty());

        MealPlan savedPlan = MealPlan.builder()
                .id("plan-1")
                .userId(userId)
                .planDate(today)
                .createdAt(LocalDateTime.now())
                .build();
        when(mealPlanRepository.save(any(MealPlan.class))).thenReturn(savedPlan);

        MealPlanResponse response = mealPlanService.createMealPlan(request);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo("plan-1");
        assertThat(response.getPlanDate()).isEqualTo(today);
        verify(mealPlanRepository, times(1)).save(any(MealPlan.class));
    }

    @Test
    @DisplayName("createMealPlan returns existing plan idempotently without duplicate record")
    void createMealPlan_whenExists_returnsExisting() {
        MealPlanRequest request = new MealPlanRequest();
        request.setUserId(userId);
        request.setPlanDate(today);

        MealPlan existingPlan = MealPlan.builder()
                .id("plan-existing")
                .userId(userId)
                .planDate(today)
                .createdAt(LocalDateTime.now())
                .build();

        when(mealPlanRepository.findByUserIdAndPlanDate(userId, today)).thenReturn(Optional.of(existingPlan));
        when(mealRepository.findByMealPlanId("plan-existing")).thenReturn(List.of());

        MealPlanResponse response = mealPlanService.createMealPlan(request);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo("plan-existing");
        verify(mealPlanRepository, never()).save(any(MealPlan.class));
    }

    @Test
    @DisplayName("getDailySummary calculates nutrition for requested date only with grams fallback")
    void getDailySummary_calculatesForTargetDate() {
        MealPlan plan = MealPlan.builder()
                .id("plan-summary")
                .userId(userId)
                .planDate(today)
                .build();

        Meal meal1 = Meal.builder()
                .id("meal-1")
                .mealPlanId("plan-summary")
                .foodId("food-1")
                .mealType(MealType.BREAKFAST)
                .quantity(200.0) // 200g
                .build();

        FoodDto foodDto = new FoodDto();
        foodDto.setId("food-1");
        foodDto.setName("Oatmeal");
        NutritionDto nutrition = new NutritionDto();
        nutrition.setCalories(389.0);
        nutrition.setProtein(16.9);
        nutrition.setCarbohydrates(66.3);
        nutrition.setFat(6.9);
        foodDto.setNutrition(nutrition);

        when(mealPlanRepository.findByUserIdAndPlanDate(userId, today)).thenReturn(Optional.of(plan));
        when(mealRepository.findByMealPlanId("plan-summary")).thenReturn(List.of(meal1));
        when(foodServiceClient.getFoodById("food-1")).thenReturn(foodDto);

        DailySummaryResponse summary = mealPlanService.getDailySummary(userId, today);

        assertThat(summary).isNotNull();
        assertThat(summary.getDate()).isEqualTo(today);
        // 200g = 2x per-100g values
        assertThat(summary.getTotalCalories()).isEqualTo(778.0);
        assertThat(summary.getTotalProtein()).isEqualTo(33.8);
        assertThat(summary.getTotalCarbs()).isEqualTo(132.6);
        assertThat(summary.getTotalFat()).isEqualTo(13.8);
    }

    @Test
    @DisplayName("Portion calculation converts serving units using servingWeightGrams correctly")
    void getDailySummary_withPortionUnits_convertsWeightAccurately() {
        MealPlan plan = MealPlan.builder()
                .id("plan-portion")
                .userId(userId)
                .planDate(today)
                .build();

        // 2 pieces of Roti (each piece = 35g -> total 70g)
        Meal meal = Meal.builder()
                .id("meal-roti")
                .mealPlanId("plan-portion")
                .foodId("food-roti")
                .mealType(MealType.LUNCH)
                .quantity(2.0)
                .unit("piece")
                .build();

        FoodDto roti = new FoodDto();
        roti.setId("food-roti");
        roti.setName("Roti / Chapati");
        NutritionDto nutrition = new NutritionDto();
        nutrition.setCalories(297.0);
        nutrition.setProtein(9.0);
        nutrition.setCarbohydrates(60.0);
        nutrition.setFat(3.0);
        nutrition.setServingUnit("piece");
        nutrition.setServingWeightGrams(35.0);
        roti.setNutrition(nutrition);

        when(mealPlanRepository.findByUserIdAndPlanDate(userId, today)).thenReturn(Optional.of(plan));
        when(mealRepository.findByMealPlanId("plan-portion")).thenReturn(List.of(meal));
        when(foodServiceClient.getFoodById("food-roti")).thenReturn(roti);

        DailySummaryResponse summary = mealPlanService.getDailySummary(userId, today);

        assertThat(summary).isNotNull();
        // 70g / 100g = 0.7 factor
        // 297 * 0.7 = 207.9
        assertThat(summary.getTotalCalories()).isEqualTo(207.9);
        // 9.0 * 0.7 = 6.3
        assertThat(summary.getTotalProtein()).isEqualTo(6.3);
        // 60.0 * 0.7 = 42.0
        assertThat(summary.getTotalCarbs()).isEqualTo(42.0);
        // 3.0 * 0.7 = 2.1
        assertThat(summary.getTotalFat()).isEqualTo(2.1);
    }

    @Test
    @DisplayName("updateMeal updates food, mealType, quantity, and unit successfully for owner")
    void updateMeal_whenOwner_updatesFieldsSuccessfully() {
        MealPlan plan = MealPlan.builder()
                .id("plan-update")
                .userId(userId)
                .planDate(today)
                .build();

        Meal existingMeal = Meal.builder()
                .id("meal-1")
                .mealPlanId("plan-update")
                .foodId("food-old")
                .mealType(MealType.BREAKFAST)
                .quantity(100.0)
                .unit("g")
                .build();

        MealRequest updateReq = new MealRequest();
        updateReq.setFoodId("food-new");
        updateReq.setMealType(MealType.DINNER);
        updateReq.setQuantity(2.0);
        updateReq.setUnit("bowl");

        FoodDto newFood = new FoodDto();
        newFood.setId("food-new");
        newFood.setName("Dal Tadka");

        when(mealPlanRepository.findById("plan-update")).thenReturn(Optional.of(plan));
        when(mealRepository.findById("meal-1")).thenReturn(Optional.of(existingMeal));
        when(foodServiceClient.getFoodById("food-new")).thenReturn(newFood);
        when(mealRepository.save(any(Meal.class))).thenAnswer(invocation -> invocation.getArgument(0));

        MealResponse updated = mealPlanService.updateMeal("plan-update", "meal-1", updateReq, userId);

        assertThat(updated).isNotNull();
        assertThat(updated.getFoodId()).isEqualTo("food-new");
        assertThat(updated.getMealType()).isEqualTo(MealType.DINNER);
        assertThat(updated.getQuantity()).isEqualTo(2.0);
        assertThat(updated.getUnit()).isEqualTo("bowl");
        verify(mealRepository, times(1)).save(existingMeal);
    }

    @Test
    @DisplayName("updateMeal throws AccessDeniedException when caller is not the plan owner")
    void updateMeal_whenForeignUser_throwsAccessDenied() {
        MealPlan plan = MealPlan.builder()
                .id("plan-update")
                .userId(userId)
                .planDate(today)
                .build();

        when(mealPlanRepository.findById("plan-update")).thenReturn(Optional.of(plan));

        Long foreignUserId = 999L;
        MealRequest updateReq = new MealRequest();
        updateReq.setFoodId("food-1");

        assertThatThrownBy(() -> mealPlanService.updateMeal("plan-update", "meal-1", updateReq, foreignUserId))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("You do not own this meal plan");
    }

    @Test
    @DisplayName("updateMeal throws IllegalArgumentException when meal belongs to another plan")
    void updateMeal_whenMealBelongsToDifferentPlan_throwsException() {
        MealPlan plan = MealPlan.builder()
                .id("plan-A")
                .userId(userId)
                .planDate(today)
                .build();

        Meal mealFromPlanB = Meal.builder()
                .id("meal-diff")
                .mealPlanId("plan-B")
                .foodId("food-1")
                .build();

        MealRequest updateReq = new MealRequest();
        updateReq.setFoodId("food-1");

        when(mealPlanRepository.findById("plan-A")).thenReturn(Optional.of(plan));
        when(mealRepository.findById("meal-diff")).thenReturn(Optional.of(mealFromPlanB));

        assertThatThrownBy(() -> mealPlanService.updateMeal("plan-A", "meal-diff", updateReq, userId))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Meal does not belong to the specified meal plan");
    }

    @Test
    @DisplayName("getNutritionHistory returns continuous timeline with 0-value days included and deduplicates Feign requests")
    void getNutritionHistory_continuousTimelineAndDeduplication() {
        LocalDate start = LocalDate.of(2026, 10, 16);
        LocalDate end = LocalDate.of(2026, 10, 22); // 7 days: 16, 17, 18, 19, 20, 21, 22

        // Day 1: 2026-10-18 has 2 meals of the SAME food
        MealPlan plan18 = MealPlan.builder()
                .id("plan-18")
                .userId(userId)
                .planDate(LocalDate.of(2026, 10, 18))
                .build();
        Meal m1 = Meal.builder().id("m1").mealPlanId("plan-18").foodId("shared-food").quantity(100.0).build();
        Meal m2 = Meal.builder().id("m2").mealPlanId("plan-18").foodId("shared-food").quantity(100.0).build();

        // Day 2: 2026-10-22 has 1 meal of the SAME shared-food
        MealPlan plan22 = MealPlan.builder()
                .id("plan-22")
                .userId(userId)
                .planDate(LocalDate.of(2026, 10, 22))
                .build();
        Meal m3 = Meal.builder().id("m3").mealPlanId("plan-22").foodId("shared-food").quantity(100.0).build();

        FoodDto sharedFood = new FoodDto();
        sharedFood.setId("shared-food");
        sharedFood.setName("Banana");
        NutritionDto nutrition = new NutritionDto();
        nutrition.setCalories(89.0);
        nutrition.setProtein(1.1);
        nutrition.setCarbohydrates(22.8);
        nutrition.setFat(0.3);
        sharedFood.setNutrition(nutrition);

        when(mealPlanRepository.findAllByUserIdAndPlanDateBetweenOrderByPlanDateAsc(userId, start, end))
                .thenReturn(List.of(plan18, plan22));
        when(mealRepository.findByMealPlanId("plan-18")).thenReturn(List.of(m1, m2));
        when(mealRepository.findByMealPlanId("plan-22")).thenReturn(List.of(m3));
        when(foodServiceClient.getFoodById("shared-food")).thenReturn(sharedFood);

        List<DailySummaryResponse> history = mealPlanService.getNutritionHistory(userId, start, end);

        // Timeline must span exactly 7 calendar days
        assertThat(history).hasSize(7);
        assertThat(history.get(0).getDate()).isEqualTo(start);
        assertThat(history.get(6).getDate()).isEqualTo(end);

        // Day 16 (no plan logged) must have 0.0 values
        DailySummaryResponse day16 = history.get(0);
        assertThat(day16.getTotalCalories()).isEqualTo(0.0);
        assertThat(day16.getTotalProtein()).isEqualTo(0.0);

        // Day 18 (2x 100g banana = 178 kcal)
        DailySummaryResponse day18 = history.get(2);
        assertThat(day18.getDate()).isEqualTo(LocalDate.of(2026, 10, 18));
        assertThat(day18.getTotalCalories()).isEqualTo(178.0);

        // Day 22 (1x 100g banana = 89 kcal)
        DailySummaryResponse day22 = history.get(6);
        assertThat(day22.getDate()).isEqualTo(LocalDate.of(2026, 10, 22));
        assertThat(day22.getTotalCalories()).isEqualTo(89.0);

        // Feign call must be cached and invoked only ONCE for "shared-food"
        verify(foodServiceClient, times(1)).getFoodById("shared-food");
    }

    @Test
    @DisplayName("deleteMeal throws AccessDeniedException when authenticated user is not owner")
    void deleteMeal_whenNotOwner_throwsAccessDenied() {
        MealPlan plan = MealPlan.builder()
                .id("plan-1")
                .userId(userId)
                .build();

        when(mealPlanRepository.findById("plan-1")).thenReturn(Optional.of(plan));

        Long foreignUserId = 999L;
        assertThatThrownBy(() -> mealPlanService.deleteMeal("plan-1", "meal-1", foreignUserId))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("You do not own this meal plan");
    }
}

