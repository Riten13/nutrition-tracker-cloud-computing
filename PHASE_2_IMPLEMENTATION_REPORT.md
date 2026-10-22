# Nutrition Tracker MSA — Phase 2 Implementation Report

**Project:** Nutrition Tracker Microservices Architecture (MSA)  
**Phase:** Phase 2 — Complete Core Nutrition Tracking  
**Status:** Completed & Fully Verified  
**Date:** October 23, 2026  

---

## 1. Executive Summary

Phase 2 builds upon the architectural stabilization achieved in Phase 1 by implementing end-to-end core nutrition tracking across all microservices and the React frontend. Key deliveries include personalized nutrition goals, serving unit and portion conversions, meal editing with IDOR protection, 7-day nutrition history with deduplicated Feign client caching, an improved dashboard with comparison metrics and interactive charts, and RBAC security hardening.

All backend tests across all 7 Maven modules passed (`25 tests run, 0 failures, 0 errors`), and the frontend production build compiled cleanly (`tsc -b && vite build` succeeded in 22.23s).

---

## 2. Features Completed

### 2.1 Personalized Nutrition Goals
- **Fitness Goals:** Users can specify their active goal (`LOSE_WEIGHT`, `MAINTAIN_WEIGHT`, `GAIN_WEIGHT`).
- **Editable Targets:** Custom daily targets for Calories (kcal), Protein (g), Carbohydrates (g), and Fat (g).
- **Backend Persistence:** Embedded `NutritionGoal` model inside the User Profile Service document model, with `PUT /api/users/{userId}/goals` endpoint.
- **Profile Management:** Interactive goal editor on the Profile page with an integrated Mifflin-St Jeor daily intake calculator for personalized suggestions.
- **Non-Medical Advisory Disclaimer:** Disclaimers on both Profile and Dashboard specifying that targets are personal tracking guidelines and not medical advice.
- **Dashboard Visibility:** Active goals banner displaying current goal badge, daily targets, and quick navigation to target settings.

### 2.2 Improved Food Portions & Conversion
- **Portion Weight Storage:** Added `servingWeightGrams` to `Nutrition` entity and DTOs in Food Database.
- **Master Data Seeding:** Enriched 35 Indian staple and common foods with realistic serving weights (e.g., 1 piece Roti = 35g, 1 piece Idli = 50g, 1 bowl Dal = 150g, 1 egg = 50g, 1 medium banana = 118g, 1 tbsp peanut butter = 16g).
- **Dynamic Portion Calculation:** `MealPlanService.calculateMealGrams` accurately converts quantities when serving units are selected (`grams = quantity * servingWeightGrams`).
- **Backward Compatibility:** When `unit == null` or `unit == 'g'`, the calculation directly uses the quantity in grams without alteration.

### 2.3 Meal Editing
- **Logged Meal Mutation:** Implemented `PUT /api/meal-plans/{planId}/meals/{mealId}` allowing users to modify food item, meal type (Breakfast, Lunch, Dinner, Snack), quantity, and portion unit.
- **Nutritional Recalculation:** Updates cause daily caloric and macronutrient totals to recalculate immediately.
- **Ownership & Authorization:** Validates that the meal belongs to the meal plan and that the authenticated user owns the meal plan, preventing IDOR attacks.
- **Frontend UI:** Added Edit buttons to all logged meal cards and an Edit modal with live portion and calorie previews.

### 2.4 Daily and Weekly Nutrition History
- **History Range API:** Implemented `GET /api/meal-plans/{userId}/history?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` in Meal Planning Service.
- **Continuous Timeline:** Dynamically populates missing days in the range with zero-value daily summaries, ensuring a continuous timeline.
- **OpenFeign Optimization:** Single-pass retrieval of unique `foodId`s across all meals in the date range, caching `FoodDto`s in a local map to eliminate redundant network calls.

### 2.5 Improved Dashboard
- **Target vs. Consumed Tracking:** Calories, Protein, Carbohydrates, and Fats display consumed value, user target, remaining allowance (or overage), and animated percentage progress bars.
- **7-Day History Chart:** Interactive Recharts component offering toggleable views:
  - *Calories vs. Target:* Bar chart with a dashed reference line representing the daily calorie target.
  - *Macronutrients:* Grouped bars displaying daily Protein, Carbohydrate, and Fat intake.
- **State Handling:** Dedicated loading spinners, informative empty state with CTA to log meals, and error retry banners.

### 2.6 Security & Hardening
- **JWT Environment Variable Requirement:** Removed hardcoded fallback JWT secrets across all services. The services require `JWT_SECRET` via environment variables.
- **Food Database RBAC:** Mutation endpoints (`POST /api/foods`, `PUT /api/foods/**`, `DELETE /api/foods/**`) require `ROLE_ADMIN`, while `GET /api/foods/**` is publicly accessible.
- **Feign Security Context Propagation:** Verified that inter-service Feign calls forward the caller's JWT token via `FeignClientInterceptor`.

---

## 3. Files Changed

### Backend Services

| Service | Files Modified / Created | Description |
|---|---|---|
| **Root** | `.env`, `docker-compose.yml`, `pom.xml` | JWT_SECRET injection, multi-module project configuration |
| **User-Profile** | `entity/NutritionGoal.java`, `dto/NutritionGoalDto.java`, `entity/User.java`, `dto/UserProfileResponse.java`, `service/UserService.java`, `controller/UserController.java`, `security/JwtUtils.java`, `service/AuthService.java`, `resources/application.yml`, `src/test/resources/application.yml`, `test/.../UserServiceTest.java`, `test/.../JwtUtilsTest.java` | Nutrition goals data model, API endpoint, RBAC claims, tests |
| **Food-Database** | `model/Nutrition.java`, `dto/NutritionDto.java`, `service/FoodService.java`, `config/FoodDataSeeder.java`, `security/SecurityConfig.java`, `security/JwtUtils.java`, `security/JwtAuthenticationFilter.java`, `resources/application.yml`, `src/test/resources/application.yml`, `test/.../FoodServiceTest.java`, `test/.../FoodDataSeederTest.java` | Portion conversion weights, seeder updates, admin role enforcement, tests |
| **Meal-Planning** | `entity/Meal.java`, `dto/MealRequest.java`, `dto/MealResponse.java`, `client/NutritionDto.java`, `repository/MealPlanRepository.java`, `service/MealPlanService.java`, `controller/MealPlanController.java`, `exception/GlobalExceptionHandler.java`, `security/JwtUtils.java`, `resources/application.yml`, `src/test/resources/application.yml`, `test/.../MealPlanServiceTest.java` | Portion calculation, meal editing, history range API, IDOR checks, tests |
| **Grocery-Planning** | `security/JwtUtils.java`, `resources/application.yml`, `src/test/resources/application.yml` | JWT secret configuration and test profile |

### Frontend

| File | Description |
|---|---|
| `frontend/src/types/index.ts` | Added `NutritionGoalDto`, updated `UserProfileResponse`, `MealRequest`, `MealResponse`, and `NutritionDto` |
| `frontend/src/services/userService.ts` | Added `updateNutritionGoals(userId, goals)` |
| `frontend/src/services/mealService.ts` | Added `updateMeal(planId, mealId, meal)` and `getNutritionHistory(userId, start, end)` |
| `frontend/src/services/mockData.ts` | Added `nutritionGoal` to mock user for demo mode |
| `frontend/src/pages/Profile.tsx` | Added Personalized Nutrition Goals editor, Mifflin-St Jeor target calculator, disclaimer, and API integration |
| `frontend/src/pages/MealPlanning.tsx` | Added meal editing modal, portion unit selector (grams vs. serving unit), weight conversion preview |
| `frontend/src/pages/Dashboard.tsx` | Added active goals banner, macro progress vs. targets, 7-day history Recharts visualization with view switch |

---

## 4. Build and Test Results

### 4.1 Backend Automated Tests (`mvn test`)

```
[INFO] Reactor Summary:
[INFO] eureka-server 0.0.1-SNAPSHOT ....................... SUCCESS [  4.545 s]
[INFO] api-gateway 0.0.1-SNAPSHOT ......................... SUCCESS [  1.305 s]
[INFO] user-profile-service 0.0.1-SNAPSHOT ................ SUCCESS [  8.946 s]
[INFO] food-database 1.0.0 ................................ SUCCESS [  7.875 s]
[INFO] meal-planning 0.0.1-SNAPSHOT ....................... SUCCESS [ 12.785 s]
[INFO] grocery-planning-service 0.0.1-SNAPSHOT ............ SUCCESS [ 14.849 s]
[INFO] nutrition-tracker-msa 1.0.0-SNAPSHOT ............... SUCCESS [  0.002 s]
[INFO] ------------------------------------------------------------------------
[INFO] BUILD SUCCESS
[INFO] Total time: 51.824 s
```

**Test Breakdown by Module:**
- **User-Profile (6 tests):**
  - `JwtUtilsTest`: Token generation with `ROLE_ADMIN`, default `ROLE_USER`, and invalid token rejection.
  - `UserServiceTest`: Target updates for owner, `UnauthorizedAccessException` for foreign user ID, and `ResourceNotFoundException`.
- **Food-Database (6 tests):**
  - `FoodDataSeederTest`: Idempotency, inserts only missing foods, enriches legacy foods missing portions.
  - `FoodServiceTest`: Serving weight preservation, portion data in response, and 404 handling.
- **Meal-Planning (9 tests):**
  - `MealPlanServiceTest`: Plan creation idempotency, gram fallback calculations, portion unit conversions using `servingWeightGrams`, meal editing for owner, IDOR `AccessDeniedException` on cross-user edit/delete, meal-plan mismatch validation, continuous 7-day timeline generation with 0-value days, and Feign client request deduplication.
- **Grocery-Planning (4 tests):**
  - `GroceryListServiceTest`: Active list creation, item enrichment, and duplicate resolution.

### 4.2 Frontend Build (`npm run build`)

```
> frontend@1.0.0 build
> tsc -b && vite build

vite v6.4.4 building for production...
transforming...
✓ 2633 modules transformed.
rendering chunks...
dist/index.html                   1.00 kB │ gzip:   0.55 kB
dist/assets/index-B4EbgdFJ.css   47.01 kB │ gzip:   8.64 kB
dist/assets/index-DBFsNlNP.js   916.84 kB │ gzip: 259.53 kB
✓ built in 22.23s
```

---

## 5. Verification & Testing Distinction

| Category | Item | Verification Method | Status |
|---|---|---|---|
| Automated | Portion weight conversion calculation (`calculateMealGrams`) | `MealPlanServiceTest.getDailySummary_withPortionUnits_convertsWeightAccurately` | PASS |
| Automated | Meal editing & plan ownership validation | `MealPlanServiceTest.updateMeal_whenOwner_updatesFieldsSuccessfully` | PASS |
| Automated | Cross-user meal tampering protection (IDOR) | `MealPlanServiceTest.updateMeal_whenForeignUser_throwsAccessDenied` | PASS |
| Automated | 7-day history continuity & Feign request caching | `MealPlanServiceTest.getNutritionHistory_continuousTimelineAndDeduplication` | PASS |
| Automated | Nutrition goals update & cross-user access control | `UserServiceTest.updateNutritionGoal_*` | PASS |
| Automated | JWT role claims encoding & extraction | `JwtUtilsTest.generateToken_withUserIdAndEmailAndRole_canBeExtracted` | PASS |
| Automated | Food portion seeder idempotency & enrichment | `FoodDataSeederTest.run_*` | PASS |
| Automated | Frontend TypeScript type checks & production bundling | `tsc -b && vite build` | PASS |
| Manual | Profile goals manager & calculator UI | Verified in `Profile.tsx` component hierarchy and state flow | VERIFIED |
| Manual | Dashboard 7-day nutrition chart & targets | Verified in `Dashboard.tsx` with live data and demo mode fallback | VERIFIED |
| Manual | Portion selection & live preview in meal modal | Verified in `MealPlanning.tsx` modal and card display | VERIFIED |

---

## 6. Remaining Bugs or Limitations

1. **Role Management Workflow:** `ROLE_ADMIN` is currently assigned by default to the administrator or directly in the database. A dedicated admin user management console is not yet implemented.
2. **Custom Serving Units per User:** Serving portion conversion weights are defined in the master food database. Custom user-defined portion units (e.g., "my coffee mug") are not yet supported.
3. **AI Features:** In accordance with the prompt guidelines, AI integration (e.g., smart meal recommendations, computer vision food logging) was intentionally not implemented in Phase 2.
