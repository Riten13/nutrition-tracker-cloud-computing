package com.example.mealplanning.controller;

import com.example.mealplanning.dto.*;
import com.example.mealplanning.security.UserPrincipal;
import com.example.mealplanning.service.MealPlanService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/meal-plans")
@RequiredArgsConstructor
@Tag(name = "Meal Plans", description = "APIs for managing meal plans and logged meals")
@SecurityRequirement(name = "bearerAuth")
public class MealPlanController {

    private final MealPlanService mealPlanService;

    // ─────────────────────────────────────────────────────────────
    // POST /api/meal-plans
    // ─────────────────────────────────────────────────────────────
    @Operation(
            summary = "Create a meal plan",
            description = "Creates a new meal plan for a user on a specific date. If one already exists for that date, returns it."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Meal plan created or retrieved successfully"),
            @ApiResponse(responseCode = "403", description = "Access denied"),
            @ApiResponse(responseCode = "500", description = "Internal server error")
    })
    @PostMapping
    public ResponseEntity<MealPlanResponse> createMealPlan(
            @RequestBody MealPlanRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        if (principal != null) {
            if (request.getUserId() != null && !request.getUserId().equals(principal.getUserId())) {
                throw new AccessDeniedException("Access denied: You cannot create a meal plan for another user");
            }
            request.setUserId(principal.getUserId());
        }
        MealPlanResponse response = mealPlanService.createMealPlan(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // ─────────────────────────────────────────────────────────────
    // GET /api/meal-plans/{userId}
    // ─────────────────────────────────────────────────────────────
    @Operation(
            summary = "Get user's meal plan",
            description = "Returns the meal plan (and all its meals) for a given userId, optionally filtered by date."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Meal plan found"),
            @ApiResponse(responseCode = "403", description = "Access denied"),
            @ApiResponse(responseCode = "404", description = "Meal plan not found for this user")
    })
    @GetMapping("/{userId}")
    public ResponseEntity<MealPlanResponse> getMealPlan(
            @Parameter(description = "ID of the user", example = "1")
            @PathVariable Long userId,
            @Parameter(description = "Date of the meal plan in YYYY-MM-DD format (optional)")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @AuthenticationPrincipal UserPrincipal principal) {
        if (principal != null && !userId.equals(principal.getUserId())) {
            throw new AccessDeniedException("Access denied: You can only view your own meal plan");
        }
        MealPlanResponse response = mealPlanService.getMealPlanByUserIdAndDate(userId, date);
        return ResponseEntity.ok(response);
    }

    // ─────────────────────────────────────────────────────────────
    // POST /api/meal-plans/{planId}/meals
    // ─────────────────────────────────────────────────────────────
    @Operation(
            summary = "Add a meal to a meal plan",
            description = """
                    Adds a meal to an existing meal plan.
                    The Food Database Service is called internally to validate the foodId.
                    Only foodId, mealType, and quantity are stored — no nutrition data is persisted.
                    """
    )
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Meal added successfully"),
            @ApiResponse(responseCode = "403", description = "Access denied"),
            @ApiResponse(responseCode = "404", description = "Meal plan not found"),
            @ApiResponse(responseCode = "500", description = "Food Database Service unreachable or foodId invalid")
    })
    @PostMapping("/{planId}/meals")
    public ResponseEntity<MealResponse> addMeal(
            @Parameter(description = "ID of the meal plan", example = "64abc123...")
            @PathVariable String planId,
            @RequestBody MealRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        Long authUserId = principal != null ? principal.getUserId() : null;
        MealResponse response = mealPlanService.addMeal(planId, request, authUserId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // ─────────────────────────────────────────────────────────────
    // GET /api/meal-plans/{planId}/meals
    // ─────────────────────────────────────────────────────────────
    @Operation(
            summary = "Get all meals for a meal plan",
            description = "Returns a list of all meals belonging to the specified meal plan."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "List of meals returned"),
            @ApiResponse(responseCode = "403", description = "Access denied"),
            @ApiResponse(responseCode = "404", description = "Meal plan not found")
    })
    @GetMapping("/{planId}/meals")
    public ResponseEntity<List<MealResponse>> getMeals(
            @Parameter(description = "ID of the meal plan", example = "64abc123...")
            @PathVariable String planId,
            @AuthenticationPrincipal UserPrincipal principal) {
        Long authUserId = principal != null ? principal.getUserId() : null;
        List<MealResponse> response = mealPlanService.getMeals(planId, authUserId);
        return ResponseEntity.ok(response);
    }

    // ─────────────────────────────────────────────────────────────
    // DELETE /api/meal-plans/{planId}/meals/{mealId}
    // ─────────────────────────────────────────────────────────────
    @Operation(
            summary = "Delete a meal",
            description = "Removes a specific meal from a meal plan."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Meal deleted successfully"),
            @ApiResponse(responseCode = "403", description = "Access denied"),
            @ApiResponse(responseCode = "404", description = "Meal plan or meal not found")
    })
    @DeleteMapping("/{planId}/meals/{mealId}")
    public ResponseEntity<Void> deleteMeal(
            @Parameter(description = "ID of the meal plan") @PathVariable String planId,
            @Parameter(description = "ID of the meal to delete") @PathVariable String mealId,
            @AuthenticationPrincipal UserPrincipal principal) {
        Long authUserId = principal != null ? principal.getUserId() : null;
        mealPlanService.deleteMeal(planId, mealId, authUserId);
        return ResponseEntity.noContent().build();
    }

    @Operation(
            summary = "Update a meal",
            description = "Updates foodId, mealType, quantity, or unit for an existing meal."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Meal updated successfully"),
            @ApiResponse(responseCode = "403", description = "Access denied"),
            @ApiResponse(responseCode = "404", description = "Meal plan or meal not found")
    })
    @PutMapping("/{planId}/meals/{mealId}")
    public ResponseEntity<MealResponse> updateMeal(
            @Parameter(description = "ID of the meal plan") @PathVariable String planId,
            @Parameter(description = "ID of the meal to update") @PathVariable String mealId,
            @RequestBody MealRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        Long authUserId = principal != null ? principal.getUserId() : null;
        MealResponse response = mealPlanService.updateMeal(planId, mealId, request, authUserId);
        return ResponseEntity.ok(response);
    }

    // ─────────────────────────────────────────────────────────────
    // GET /api/meal-plans/{userId}/daily-summary
    // ─────────────────────────────────────────────────────────────
    @Operation(
            summary = "Get daily nutrition summary",
            description = """
                    Returns the total calories, protein, carbohydrates, and fat for a user's meal plan on a given date.
                    Nutrition data is fetched live from the Food Database Service and scaled by each meal's quantity.
                    """
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Daily summary returned"),
            @ApiResponse(responseCode = "403", description = "Access denied"),
            @ApiResponse(responseCode = "500", description = "Food Database Service unreachable")
    })
    @GetMapping("/{userId}/daily-summary")
    public ResponseEntity<DailySummaryResponse> getDailySummary(
            @Parameter(description = "ID of the user", example = "1")
            @PathVariable Long userId,
            @Parameter(description = "Date for summary in YYYY-MM-DD format (optional, defaults to today)")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @AuthenticationPrincipal UserPrincipal principal) {
        if (principal != null && !userId.equals(principal.getUserId())) {
            throw new AccessDeniedException("Access denied: You can only view your own daily summary");
        }
        DailySummaryResponse response = mealPlanService.getDailySummary(userId, date);
        return ResponseEntity.ok(response);
    }

    // ─────────────────────────────────────────────────────────────
    // GET /api/meal-plans/{userId}/history
    // ─────────────────────────────────────────────────────────────
    @Operation(
            summary = "Get nutrition history for a date range",
            description = "Returns daily calories, protein, carbs, and fat across a specified date range (defaulting to the past 7 days). Includes days with 0 meals."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Nutrition history returned"),
            @ApiResponse(responseCode = "403", description = "Access denied")
    })
    @GetMapping("/{userId}/history")
    public ResponseEntity<List<DailySummaryResponse>> getNutritionHistory(
            @Parameter(description = "ID of the user", example = "1")
            @PathVariable Long userId,
            @Parameter(description = "Start date in YYYY-MM-DD format (optional, defaults to 6 days before endDate)")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @Parameter(description = "End date in YYYY-MM-DD format (optional, defaults to today)")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @AuthenticationPrincipal UserPrincipal principal) {
        if (principal != null && !userId.equals(principal.getUserId())) {
            throw new AccessDeniedException("Access denied: You can only view your own nutrition history");
        }
        List<DailySummaryResponse> response = mealPlanService.getNutritionHistory(userId, startDate, endDate);
        return ResponseEntity.ok(response);
    }
}
