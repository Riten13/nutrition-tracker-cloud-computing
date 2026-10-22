# Nutrition Tracker MSA — Phase 1: Implementation & Fixes Report

**Date:** October 2026  
**Audience:** Development Team & Project Maintainers  
**Status:** Completed & Verified  

---

## Executive Summary

This report documents the resolution of the critical architectural and runtime defects identified during the codebase audit of the **Nutrition Tracker Microservices Architecture (MSA)**. All fixes strictly adhere to the existing technology stack (Spring Boot 3, Spring Security 6, MongoDB, Spring Cloud Gateway, Netflix Eureka, OpenFeign, React 18, TypeScript, and Vite).

No new microservices or AI dependencies were added during Phase 1. All modified services compile cleanly, passing multi-module builds and focused automated unit test suites.

---

## 1. Summary of Implemented Tasks

### Task 1: Remove Silent Mock-Data Fallbacks
- **Problem:** When backend microservices were down or network requests failed, the frontend silently fell back to simulated mock data from `mockData.ts`. Users were unaware that their actions were not persisting.
- **Implementation:**
  - **`AuthContext.tsx`**: Removed automatic demo mode activation in `login()` and `register()`. Network and API errors are now thrown directly to caller components so the UI can inform the user.
  - **`Dashboard.tsx`**: Removed silent assignments of `mockFoods`, `mockDailySummary`, and `mockMealPlan`. Added an explicit error alert with a manual "Retry" action, empty states, and a dedicated yellow banner when Demo Mode is explicitly toggled by the user.
  - **`MealPlanning.tsx`**: Removed fallback assignments to mock meal plans and daily summaries. Errors are presented via error alert banners.
  - **`Foods.tsx`**: Removed fallback to `mockFoods` in `loadFoods()`. Replaced static mock-based category filtering with dynamic categories extracted from live food records.
  - **`GroceryPlanning.tsx`**: Removed fallback to `mockFoods` and `mockGroceryList`. Unsuccessful backend requests now display an error banner while preserving the active list creation flow.
  - **`Login.tsx`**: Clarified the explicit demo exploration button to `"Explore in Demo Mode (Simulated Data)"`, ensuring users know demo mode is an opt-in simulated preview, never an automatic fallback.

---

### Task 2: Fix Date-Based Meal Planning
- **Problem:** Meal plans previously relied on `findByUserId()` without date filtering. Logging meals across different days aggregated all historical items into a single daily summary, and users could not navigate or manage meal plans by date.
- **Implementation:**
  - **`MealPlanRepository.java`**: Added query methods:
    - `Optional<MealPlan> findByUserIdAndPlanDate(Long userId, LocalDate planDate)`
    - `List<MealPlan> findAllByUserIdOrderByPlanDateDesc(Long userId)`
    - `Optional<MealPlan> findFirstByUserIdOrderByPlanDateDesc(Long userId)`
  - **`MealPlanService.java`**:
    - `createMealPlan()`: Checks if a plan already exists for the given user and date. If present, returns it idempotently rather than creating duplicate plan documents.
    - `getMealPlanByUserIdAndDate()`: Retrieves a meal plan for a specific date (defaults to current date or latest plan if date is omitted).
    - `getDailySummary()`: Calculates total calories and macronutrients strictly for the selected date. Returns zeroed metrics (`0.0 kcal`, `0.0g protein`) if no meals are logged for that date.
    - Added user ownership validation to prevent unauthorized users from viewing or deleting meals.
  - **`MealPlanController.java`**: Updated `getMealPlan()` and `getDailySummary()` to accept `@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date`.
  - **Frontend UI**: Updated `mealService.ts` and added an HTML5 date picker in `MealPlanning.tsx`, enabling users to select any calendar date to view and log meals independently.

---

### Task 3: Idempotent Initial Food Data Seeding
- **Problem:** The Food Database started completely empty with zero items, preventing users from logging meals or creating grocery items unless manually entered one by one.
- **Implementation:**
  - **`FoodRepository.java`**: Added `boolean existsByNameIgnoreCase(String name)` and `Optional<Food> findByNameIgnoreCase(String name)`.
  - **`FoodDataSeeder.java`**: Created a Spring Boot `CommandLineRunner` component that runs upon service startup:
    - Seeds **35 staple foods** with priority on Indian cuisine:
      - *Grains:* Whole Wheat Roti (Chapati), Cooked White Rice, Cooked Brown Rice, Rolled Oats
      - *Legumes / Dal:* Yellow Moong Dal, Toor Dal, Chana Masala, Rajma (Kidney Beans), Sambar
      - *Dairy:* Fresh Paneer, Plain Curd (Dahi), Whole Cow Milk
      - *Breakfast:* Poha, Steamed Idli, Plain Dosa, Upma
      - *Vegetables:* Palak Paneer, Aloo Gobi, Mixed Vegetable Sabzi, Bhindi Masala, Boiled Potato, Raw Spinach, Tomato, Cucumber, Raw Onion
      - *Fruits:* Banana, Apple, Papaya, Mango
      - *Proteins & Non-Veg:* Boiled Whole Egg, Egg Omelet, Egg Bhurji, Indian Chicken Curry, Grilled Chicken Breast
    - Standardized nutritional metrics (Calories, Protein, Carbohydrates, Fat, Fiber) per 100g based on documented Indian Food Composition Tables (IFCT) and USDA food data.
    - Verified idempotency: The seeder checks `existsByNameIgnoreCase` before saving each item, avoiding duplicate records or overwriting existing user modifications.

---

### Task 4: Fix Duplicate Active Grocery Lists
- **Problem:** Users could create multiple `ACTIVE` grocery lists. Calling `getActiveGroceryList()` threw Spring Data's `IncorrectResultSizeDataAccessException` (expected 1 result, found multiple), breaking the grocery feature.
- **Implementation:**
  - **`GroceryListStatus.java`**: Added `ARCHIVED` status enum value.
  - **`GroceryListRepository.java`**: Added:
    - `Optional<GroceryList> findFirstByUserIdAndStatusOrderByCreatedAtDesc(Long userId, GroceryListStatus status)`
    - `List<GroceryList> findAllByUserIdAndStatusOrderByCreatedAtDesc(Long userId, GroceryListStatus status)`
  - **`GroceryListService.java`**:
    - `createGroceryList()`: Checks for an existing active list. If one is found, returns it directly instead of creating a second active list.
    - `getActiveGroceryList()`: Detects legacy duplicate active lists safely. Consolidates items from older active lists into the newest list, updates older lists to status `ARCHIVED`, and returns the primary list. No user data is lost, and exceptions are eliminated.

---

### Task 5: End-to-End Authentication & Authorization
- **Problem:** JWT authentication was previously implemented only in `User-Profile`. Downstream services (`Meal-Planning`, `Grocery-Planning`, `Food-Database`) had no security filters, did not validate tokens, and accepted spoofed `userId` values without verifying caller identity (Insecure Direct Object Reference - IDOR).
- **Implementation:**
  - **Shared Secret Key**: Standardized the HS256 secret across all services via configuration:
    ```yaml
    app:
      jwt:
        secret: ${JWT_SECRET:404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970}
    ```
  - **`User-Profile`**:
    - Updated `JwtUtils.java` to encode the numeric `userId` claim into issued tokens (`generateToken(userId, email)`).
    - Added `getUserIdFromJwtToken(token)` to extract the verified user ID.
  - **Security in Downstream Services** (`Meal-Planning`, `Grocery-Planning`, `Food-Database`):
    - Added `spring-boot-starter-security` and `jjwt` dependencies.
    - Added `SecurityConfig`, `JwtAuthenticationFilter`, `JwtUtils`, and `UserPrincipal` to each service.
    - Added `FeignClientInterceptor` in `Meal-Planning` and `Grocery-Planning` to forward the incoming `Authorization: Bearer <token>` to inter-service calls (e.g., Food Database).
    - Endpoints in `Meal-Planning` and `Grocery-Planning` require valid authenticated tokens.
    - Endpoints in `Food-Database` allow public food catalog browsing (`GET /api/v1/foods/**`), while restricting mutations (`POST`, `PUT`, `DELETE`) to authenticated callers.
    - Controllers inspect `@AuthenticationPrincipal UserPrincipal` and reject requests where the requested resource owner does not match the authenticated caller.

---

## 2. Inventory of Modified & Created Files

### Backend Services

| Service | File | Type | Description |
| :--- | :--- | :---: | :--- |
| **User-Profile** | [JwtUtils.java](file:///c:/Riten/Java/nutrition-tracker-msa/User-Profile/src/main/java/com/example/userprofile/security/JwtUtils.java) | Modified | Added `userId` claim generation & extraction |
| **User-Profile** | [AuthService.java](file:///c:/Riten/Java/nutrition-tracker-msa/User-Profile/src/main/java/com/example/userprofile/service/AuthService.java) | Modified | Encodes `userId` in tokens upon registration & login |
| **User-Profile** | [JwtUtilsTest.java](file:///c:/Riten/Java/nutrition-tracker-msa/User-Profile/src/test/java/com/example/userprofile/security/JwtUtilsTest.java) | **New** | Unit test verifying JWT claim extraction and validation |
| **Meal-Planning** | [pom.xml](file:///c:/Riten/Java/nutrition-tracker-msa/Meal-Planning/pom.xml) | Modified | Added Spring Security and JJWT 0.12.6 dependencies |
| **Meal-Planning** | [application.yml](file:///c:/Riten/Java/nutrition-tracker-msa/Meal-Planning/src/main/resources/application.yml) | Modified | Configured `app.jwt.secret` |
| **Meal-Planning** | `Meal-Planning/.../security/SecurityConfig.java` | **New** | Stateless security filter chain configuration |
| **Meal-Planning** | `Meal-Planning/.../security/JwtAuthenticationFilter.java` | **New** | JWT bearer token extraction filter |
| **Meal-Planning** | `Meal-Planning/.../security/JwtUtils.java` | **New** | Downstream token validator and claim reader |
| **Meal-Planning** | `Meal-Planning/.../security/UserPrincipal.java` | **New** | Authenticated principal entity holding `userId` and `email` |
| **Meal-Planning** | [FeignClientInterceptor.java](file:///c:/Riten/Java/nutrition-tracker-msa/Meal-Planning/src/main/java/com/example/mealplanning/config/FeignClientInterceptor.java) | **New** | Propagates JWT to downstream Feign requests |
| **Meal-Planning** | [MealPlanRepository.java](file:///c:/Riten/Java/nutrition-tracker-msa/Meal-Planning/src/main/java/com/example/mealplanning/repository/MealPlanRepository.java) | Modified | Added date-filtered and ordered query methods |
| **Meal-Planning** | [MealPlanService.java](file:///c:/Riten/Java/nutrition-tracker-msa/Meal-Planning/src/main/java/com/example/mealplanning/service/MealPlanService.java) | Modified | Idempotent creation, date summary calculation, ownership checks |
| **Meal-Planning** | [MealPlanController.java](file:///c:/Riten/Java/nutrition-tracker-msa/Meal-Planning/src/main/java/com/example/mealplanning/controller/MealPlanController.java) | Modified | Added `@AuthenticationPrincipal` and date request parameter |
| **Meal-Planning** | [MealPlanServiceTest.java](file:///c:/Riten/Java/nutrition-tracker-msa/Meal-Planning/src/test/java/com/example/mealplanning/service/MealPlanServiceTest.java) | **New** | Unit tests for date filtering, idempotent creation, summary calculations, IDOR protection |
| **Grocery-Planning** | [pom.xml](file:///c:/Riten/Java/nutrition-tracker-msa/Grocery-Planning/pom.xml) | Modified | Added Spring Security and JJWT 0.12.6 dependencies |
| **Grocery-Planning** | [application.yml](file:///c:/Riten/Java/nutrition-tracker-msa/Grocery-Planning/src/main/resources/application.yml) | Modified | Configured `app.jwt.secret` |
| **Grocery-Planning** | `Grocery-Planning/.../security/SecurityConfig.java` | **New** | Stateless security filter chain configuration |
| **Grocery-Planning** | `Grocery-Planning/.../security/JwtAuthenticationFilter.java` | **New** | JWT bearer token extraction filter |
| **Grocery-Planning** | `Grocery-Planning/.../security/JwtUtils.java` | **New** | Downstream token validator and claim reader |
| **Grocery-Planning** | `Grocery-Planning/.../security/UserPrincipal.java` | **New** | Authenticated principal entity holding `userId` and `email` |
| **Grocery-Planning** | [FeignClientInterceptor.java](file:///c:/Riten/Java/nutrition-tracker-msa/Grocery-Planning/src/main/java/com/example/groceryplanningservice/config/FeignClientInterceptor.java) | **New** | Propagates JWT to downstream Feign requests |
| **Grocery-Planning** | [GroceryListStatus.java](file:///c:/Riten/Java/nutrition-tracker-msa/Grocery-Planning/src/main/java/com/example/groceryplanningservice/entity/GroceryListStatus.java) | Modified | Added `ARCHIVED` status enum |
| **Grocery-Planning** | [GroceryListRepository.java](file:///c:/Riten/Java/nutrition-tracker-msa/Grocery-Planning/src/main/java/com/example/groceryplanningservice/repository/GroceryListRepository.java) | Modified | Added active status retrieval query methods |
| **Grocery-Planning** | [GroceryListService.java](file:///c:/Riten/Java/nutrition-tracker-msa/Grocery-Planning/src/main/java/com/example/groceryplanningservice/service/GroceryListService.java) | Modified | Deduplication of active lists, safe duplicate merging, caller validation |
| **Grocery-Planning** | [GroceryListController.java](file:///c:/Riten/Java/nutrition-tracker-msa/Grocery-Planning/src/main/java/com/example/groceryplanningservice/controller/GroceryListController.java) | Modified | Added `@AuthenticationPrincipal` and IDOR authorization checks |
| **Grocery-Planning** | [GroceryListServiceTest.java](file:///c:/Riten/Java/nutrition-tracker-msa/Grocery-Planning/src/test/java/com/example/groceryplanningservice/service/GroceryListServiceTest.java) | **New** | Unit tests for list deduplication, safe archiving, and ownership checks |
| **Food-Database** | [pom.xml](file:///c:/Riten/Java/nutrition-tracker-msa/Food-Database/pom.xml) | Modified | Added Spring Security and JJWT 0.12.6 dependencies |
| **Food-Database** | [application.yml](file:///c:/Riten/Java/nutrition-tracker-msa/Food-Database/src/main/resources/application.yml) | Modified | Configured `app.jwt.secret` |
| **Food-Database** | `Food-Database/.../security/SecurityConfig.java` | **New** | Allows public GET, secures POST/PUT/DELETE |
| **Food-Database** | `Food-Database/.../security/JwtAuthenticationFilter.java` | **New** | JWT bearer token extraction filter |
| **Food-Database** | `Food-Database/.../security/JwtUtils.java` | **New** | Downstream token validator and claim reader |
| **Food-Database** | `Food-Database/.../security/UserPrincipal.java` | **New** | Authenticated principal entity |
| **Food-Database** | [FoodRepository.java](file:///c:/Riten/Java/nutrition-tracker-msa/Food-Database/src/main/java/com/example/fooddatabase/repository/FoodRepository.java) | Modified | Added `existsByNameIgnoreCase` and `findByNameIgnoreCase` |
| **Food-Database** | [FoodDataSeeder.java](file:///c:/Riten/Java/nutrition-tracker-msa/Food-Database/src/main/java/com/example/fooddatabase/config/FoodDataSeeder.java) | **New** | Startup seeder with 35 staple foods and verified nutrition |
| **Food-Database** | [FoodDataSeederTest.java](file:///c:/Riten/Java/nutrition-tracker-msa/Food-Database/src/test/java/com/example/fooddatabase/config/FoodDataSeederTest.java) | **New** | Unit test verifying seeder idempotency and skipping existing items |

### Frontend Client

| File | Type | Description |
| :--- | :---: | :--- |
| [AuthContext.tsx](file:///c:/Riten/Java/nutrition-tracker-msa/frontend/src/context/AuthContext.tsx) | Modified | Stopped silent fallback to demo mode on network or authentication failure |
| [mealService.ts](file:///c:/Riten/Java/nutrition-tracker-msa/frontend/src/services/mealService.ts) | Modified | Added `date?: string` parameter to `getMealPlan` and `getDailySummary` |
| [Dashboard.tsx](file:///c:/Riten/Java/nutrition-tracker-msa/frontend/src/pages/Dashboard.tsx) | Modified | Removed silent mock fallbacks; added error banner, retry button, demo indicator |
| [MealPlanning.tsx](file:///c:/Riten/Java/nutrition-tracker-msa/frontend/src/pages/MealPlanning.tsx) | Modified | Added date picker, date-filtered summary display, removed silent mock fallbacks |
| [Foods.tsx](file:///c:/Riten/Java/nutrition-tracker-msa/frontend/src/pages/Foods.tsx) | Modified | Removed `mockFoods` fallback; dynamic category calculation; clear error states |
| [GroceryPlanning.tsx](file:///c:/Riten/Java/nutrition-tracker-msa/frontend/src/pages/GroceryPlanning.tsx) | Modified | Removed `mockFoods` & `mockGroceryList` fallbacks; explicit empty & error states |
| [Login.tsx](file:///c:/Riten/Java/nutrition-tracker-msa/frontend/src/pages/Login.tsx) | Modified | Renamed demo button to clearly indicate explicit simulated preview |

---

## 3. Verification & Test Execution Results

### 3.1. Frontend Production Build
Executed from `frontend/`:
```bash
npm run build
```
- **Command:** `tsc -b && vite build`
- **Result:** `✓ built in 14.07s`
- **Output:** 2,633 modules transformed with **0 compilation errors**. Generated production bundle in `dist/assets/`.

### 3.2. Backend Automated Unit Tests
Executed from project root:
```bash
mvn test
```
- **Result:** **`BUILD SUCCESS`** across all modules in 33.74s.
- **Detailed Test Breakdown:**
  - `user-profile-service`:
    - `JwtUtilsTest.generateToken_withUserIdAndEmail_canBeExtracted`: **PASSED**
    - `JwtUtilsTest.validateJwtToken_invalidToken_returnsFalse`: **PASSED**
  - `food-database`:
    - `FoodDataSeederTest.run_insertsOnlyNonExistingFoods`: **PASSED**
    - `FoodDataSeederTest.run_skipsAllWhenAlreadySeeded`: **PASSED**
  - `meal-planning`:
    - `MealPlanServiceTest.createMealPlan_whenNotExists_createsNew`: **PASSED**
    - `MealPlanServiceTest.createMealPlan_whenExists_returnsExisting`: **PASSED**
    - `MealPlanServiceTest.getDailySummary_calculatesForTargetDate`: **PASSED**
    - `MealPlanServiceTest.deleteMeal_whenNotOwner_throwsAccessDenied`: **PASSED**
  - `grocery-planning-service`:
    - `GroceryListServiceTest.createGroceryList_whenNoActiveList_createsNew`: **PASSED**
    - `GroceryListServiceTest.createGroceryList_whenActiveListExists_returnsExisting`: **PASSED**
    - `GroceryListServiceTest.getActiveGroceryList_whenDuplicatesExist_mergesAndArchivesSafely`: **PASSED**
    - `GroceryListServiceTest.createGroceryList_whenForeignUser_throwsAccessDenied`: **PASSED**
- **Total Test Failures:** 0, **Errors:** 0, **Skipped:** 0.

### 3.3. Multi-Module JAR Packaging
Executed from project root:
```bash
mvn package -DskipTests
```
- **Result:** **`BUILD SUCCESS`** in 23.10s across all 7 projects:
  - `Eureka-Server/target/eureka-server-0.0.1-SNAPSHOT.jar`
  - `API-Gateway/target/api-gateway-0.0.1-SNAPSHOT.jar`
  - `User-Profile/target/user-profile-service-0.0.1-SNAPSHOT.jar`
  - `Food-Database/target/food-database-1.0.0.jar`
  - `Meal-Planning/target/meal-planning-0.0.1-SNAPSHOT.jar`
  - `Grocery-Planning/target/grocery-planning-service-0.0.1-SNAPSHOT.jar`

---

## 4. Operational Instructions & Verification Guide

### 4.1. Updating Docker Containers
To build and run the updated application with Docker:
```powershell
docker compose build
docker compose up -d
```

### 4.2. Recommended Manual Verification Checklist
1. **Food Catalog Seeding:**
   - Inspect startup logs:
     ```powershell
     docker logs food-database-service
     ```
   - Confirm log line: `"Successfully seeded 35 new food items into Food Database."`
2. **Authentication Flow:**
   - Open `http://localhost:5173/register` and register a new user account.
   - Verify immediate redirect to Dashboard upon successful registration without demo banner.
3. **Date-Based Meal Planning:**
   - Navigate to `http://localhost:5173/meals`.
   - Select today's date and log a meal (e.g., 200g of Whole Wheat Roti).
   - Change the date selector to tomorrow. Confirm the meal list is empty and the daily summary displays 0 kcal.
   - Switch back to today's date. Confirm the logged meal persists.
4. **Grocery Planning Deduplication:**
   - Navigate to `http://localhost:5173/grocery`.
   - Click "Create Active Grocery List". Refresh the page or click add items to confirm only one active list is maintained.
5. **Authorization Verification:**
   - Send a `GET /api/v1/meals?userId=999` with User A's token. Confirm the request receives HTTP 403 Forbidden.
