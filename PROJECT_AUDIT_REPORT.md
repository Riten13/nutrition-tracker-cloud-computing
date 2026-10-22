# 🔍 Nutrition Tracker MSA — Source Code Audit & Technical Assessment

**Audit Date:** October 2026  
**Methodology:** Direct inspection of active repository source code, configuration files, entity mappings, and API endpoints.

---

## 1. Project Structure & Responsibilities

The codebase consists of **7 primary directories**: 2 infrastructure services, 4 domain microservices, and 1 frontend client:

| Component | Port | Technology | Verified Responsibility | Key Source Path |
| :--- | :---: | :--- | :--- | :--- |
| **Eureka-Server** | `8761` | Spring Cloud Netflix Eureka | Service discovery registry; monitors service instance heartbeats. | [EurekaServerApplication.java](file:///c:/Riten/Java/nutrition-tracker-msa/Eureka-Server/src/main/java/com/example/eurekaserver/EurekaServerApplication.java) |
| **API-Gateway** | `8088` | Spring Cloud Gateway (Netty) | Single entry point; reverse proxy; route matching; global CORS; Swagger UI aggregation. | [application.yml](file:///c:/Riten/Java/nutrition-tracker-msa/API-Gateway/src/main/resources/application.yml) |
| **User-Profile** | `8080` | Spring Boot 3 + Spring Security + MongoDB | User registration, authentication, JWT generation/validation, biometric profile, allergies, dietary preferences. | [UserController.java](file:///c:/Riten/Java/nutrition-tracker-msa/User-Profile/src/main/java/com/example/userprofile/controller/UserController.java) |
| **Food-Database** | `3000` | Spring Boot 3 + MongoDB | Master data catalog for food items and standardized nutrition (per 100g). | [FoodController.java](file:///c:/Riten/Java/nutrition-tracker-msa/Food-Database/src/main/java/com/example/fooddatabase/controller/FoodController.java) |
| **Meal-Planning** | `3001` | Spring Boot 3 + OpenFeign + MongoDB | User meal plans (breakfast, lunch, dinner, snack); meal item logging; live daily nutritional summary calculation. | [MealPlanController.java](file:///c:/Riten/Java/nutrition-tracker-msa/Meal-Planning/src/main/java/com/example/mealplanning/controller/MealPlanController.java) |
| **Grocery-Planning** | `3002` | Spring Boot 3 + OpenFeign + MongoDB | Active grocery lists; grocery item checklist; estimated cost calculation. | [GroceryListController.java](file:///c:/Riten/Java/nutrition-tracker-msa/Grocery-Planning/src/main/java/com/example/groceryplanningservice/controller/GroceryListController.java) |
| **frontend** | `5173` | React 19 + TypeScript + Vite + Tailwind | Single-page application providing user UI for all domains. | [App.tsx](file:///c:/Riten/Java/nutrition-tracker-msa/frontend/src/App.tsx) |

---

## 2. Backend Features & Implementation Status

### [User-Profile Service](file:///c:/Riten/Java/nutrition-tracker-msa/User-Profile/)
- **Implemented:**
  - Registration with BCrypt password hashing: `POST /api/users/register` ([AuthService.java:34-58](file:///c:/Riten/Java/nutrition-tracker-msa/User-Profile/src/main/java/com/example/userprofile/service/AuthService.java#L34-L58)).
  - Login returning signed JWT token: `POST /api/users/login` ([AuthService.java:60-78](file:///c:/Riten/Java/nutrition-tracker-msa/User-Profile/src/main/java/com/example/userprofile/service/AuthService.java#L60-L78)).
  - Get/update user profile: `GET/PUT /api/users/{userId}` ([UserService.java:31-64](file:///c:/Riten/Java/nutrition-tracker-msa/User-Profile/src/main/java/com/example/userprofile/service/UserService.java#L31-L64)).
  - Add/delete allergies: `POST/GET/DELETE /api/users/{userId}/allergies` ([UserService.java:66-107](file:///c:/Riten/Java/nutrition-tracker-msa/User-Profile/src/main/java/com/example/userprofile/service/UserService.java#L66-L107)).
  - Update dietary preferences: `PUT /api/users/{userId}/preferences` ([UserService.java:109-124](file:///c:/Riten/Java/nutrition-tracker-msa/User-Profile/src/main/java/com/example/userprofile/service/UserService.java#L109-L124)).
- **Incomplete / Missing:**
  - Password reset / forgot password flow is completely absent.
  - Email verification is not implemented.

### [Food-Database Service](file:///c:/Riten/Java/nutrition-tracker-msa/Food-Database/)
- **Implemented:**
  - Full CRUD on foods: `GET /api/foods`, `GET /api/foods/{id}`, `POST /api/foods`, `PUT /api/foods/{id}`, `DELETE /api/foods/{id}` ([FoodService.java:23-74](file:///c:/Riten/Java/nutrition-tracker-msa/Food-Database/src/main/java/com/example/fooddatabase/service/FoodService.java#L23-L74)).
  - Filter by case-insensitive name or category: `findByNameContainingIgnoreCase`, `findByCategoryIgnoreCase` ([FoodRepository.java:13-17](file:///c:/Riten/Java/nutrition-tracker-msa/Food-Database/src/main/java/com/example/fooddatabase/repository/FoodRepository.java#L13-L17)).
  - Microservice-specific nutrition extraction: `GET /api/foods/{id}/nutrition` ([FoodController.java:180-188](file:///c:/Riten/Java/nutrition-tracker-msa/Food-Database/src/main/java/com/example/fooddatabase/controller/FoodController.java#L180-L188)).
- **Incomplete / Missing:**
  - No database migration or seed data: on a fresh run, database is completely empty.
  - No pagination on `GET /api/foods` (returns all documents as `List<FoodResponse>`).

### [Meal-Planning Service](file:///c:/Riten/Java/nutrition-tracker-msa/Meal-Planning/)
- **Implemented:**
  - Create meal plan: `POST /api/meal-plans` ([MealPlanService.java:29-38](file:///c:/Riten/Java/nutrition-tracker-msa/Meal-Planning/src/main/java/com/example/mealplanning/service/MealPlanService.java#L29-L38)).
  - Add meal item with Feign validation against Food-Database: `POST /api/meal-plans/{planId}/meals` ([MealPlanService.java:64-83](file:///c:/Riten/Java/nutrition-tracker-msa/Meal-Planning/src/main/java/com/example/mealplanning/service/MealPlanService.java#L64-L83)).
  - Delete meal item: `DELETE /api/meal-plans/{planId}/meals/{mealId}` ([MealPlanService.java:104-114](file:///c:/Riten/Java/nutrition-tracker-msa/Meal-Planning/src/main/java/com/example/mealplanning/service/MealPlanService.java#L104-L114)).
  - Calculate daily macro summary: `GET /api/meal-plans/{userId}/daily-summary` ([MealPlanService.java:124-159](file:///c:/Riten/Java/nutrition-tracker-msa/Meal-Planning/src/main/java/com/example/mealplanning/service/MealPlanService.java#L124-L159)).
- **Incomplete / Missing:**
  - Repository lookup lacks date filtering: `findByUserId(Long userId)` ([MealPlanRepository.java:12](file:///c:/Riten/Java/nutrition-tracker-msa/Meal-Planning/src/main/java/com/example/mealplanning/repository/MealPlanRepository.java#L12)). If a user creates plans for multiple dates, the service cannot query by specific date.
  - No weekly meal plan aggregation.

### [Grocery-Planning Service](file:///c:/Riten/Java/nutrition-tracker-msa/Grocery-Planning/)
- **Implemented:**
  - Create active list: `POST /api/grocery-lists` ([GroceryListService.java:50-59](file:///c:/Riten/Java/nutrition-tracker-msa/Grocery-Planning/src/main/java/com/example/groceryplanningservice/service/GroceryListService.java#L50-L59)).
  - Fetch active list and items: `GET /api/grocery-lists/{userId}` ([GroceryListService.java:68-82](file:///c:/Riten/Java/nutrition-tracker-msa/Grocery-Planning/src/main/java/com/example/groceryplanningservice/service/GroceryListService.java#L68-L82)).
  - Add item with Feign validation: `POST /api/grocery-lists/{listId}/items` ([GroceryListService.java:100-122](file:///c:/Riten/Java/nutrition-tracker-msa/Grocery-Planning/src/main/java/com/example/groceryplanningservice/service/GroceryListService.java#L100-L122)).
  - Update item checked state/quantity/price: `PUT /api/grocery-lists/{listId}/items/{itemId}` ([GroceryListService.java:135-163](file:///c:/Riten/Java/nutrition-tracker-msa/Grocery-Planning/src/main/java/com/example/groceryplanningservice/service/GroceryListService.java#L135-L163)).
  - Delete item: `DELETE /api/grocery-lists/{listId}/items/{itemId}` ([GroceryListService.java:173-185](file:///c:/Riten/Java/nutrition-tracker-msa/Grocery-Planning/src/main/java/com/example/groceryplanningservice/service/GroceryListService.java#L173-L185)).
  - Estimated cost calculation: `GET /api/grocery-lists/{listId}/estimated-cost` ([GroceryListService.java:201-218](file:///c:/Riten/Java/nutrition-tracker-msa/Grocery-Planning/src/main/java/com/example/groceryplanningservice/service/GroceryListService.java#L201-L218)).
- **Incomplete / Missing:**
  - No connection to Meal Planning: cannot automatically generate a grocery list from a user's scheduled meals.
  - No check preventing multiple `ACTIVE` lists for the same user.

---

## 3. Frontend Pages & Capabilities

The frontend has **10 page components** ([frontend/src/pages/](file:///c:/Riten/Java/nutrition-tracker-msa/frontend/src/pages)):

| Page | Verified User Capabilities | Connected to Real Backend? |
| :--- | :--- | :--- |
| **Login.tsx** | Form login (email/password), demo mode toggle | **Yes**: Calls `POST /api/users/login` via [authService.ts](file:///c:/Riten/Java/nutrition-tracker-msa/frontend/src/services/authService.ts#L6-L10). Falls back to mock user on network failure. |
| **Register.tsx** | Multi-field onboarding (biometrics, diet flags, allergies) | **Yes**: Calls `POST /api/users/register` via [authService.ts](file:///c:/Riten/Java/nutrition-tracker-msa/frontend/src/services/authService.ts#L12-L16). |
| **Dashboard.tsx** | Displays calorie gauge, macro breakdown, quick actions | **Yes**: Calls `GET /api/meal-plans/{userId}/daily-summary` & `GET /api/foods`. Falls back to `mockDailySummary` if 404/error. |
| **Foods.tsx** | Search by name, category tabs, nutrition detail modal | **Yes**: Calls `GET /api/foods` via [foodService.ts](file:///c:/Riten/Java/nutrition-tracker-msa/frontend/src/services/foodService.ts#L9-L12). Only read/search is wired to UI; no UI to create new food. |
| **MealPlanning.tsx** | Create plan, select food from dropdown, log meal, delete meal | **Yes**: Calls `mealService.createMealPlan`, `addMeal`, `deleteMeal`, `getDailySummary`. Falls back to `mockMealPlan` on error. |
| **GroceryPlanning.tsx** | View items, toggle item checkbox, add item, view estimated cost | **Yes**: Calls `groceryService.getActiveGroceryList`, `addGroceryItem`, `updateGroceryItem`, `getEstimatedCost`. |
| **Profile.tsx** | Update weight/height/age, add/delete allergy tags, toggle diet flags | **Yes**: Calls `userService.updateProfile`, `addAllergy`, `deleteAllergy`, `updateDietaryPreference`. |
| **Settings.tsx** | Local UI preference toggles (theme, notifications, units) | **No**: Pure client-side state saved to `localStorage`; no backend persistence endpoint. |
| **PrivacyPolicy.tsx** | Static informational legal text | **No**: Pure static component. |
| **TermsConditions.tsx**| Static informational terms text | **No**: Pure static component. |

> **Crucial Finding:** The frontend implements a **dual-mode pattern** ([AuthContext.tsx:90-159](file:///c:/Riten/Java/nutrition-tracker-msa/frontend/src/context/AuthContext.tsx#L90-L159)). If the API Gateway is down or returns network errors, pages silently fall back to [mockData.ts](file:///c:/Riten/Java/nutrition-tracker-msa/frontend/src/services/mockData.ts).

---

## 4. AI Integration

**Status: Zero AI functionality is implemented in this repository.**
- No AI/LLM SDKs (OpenAI, LangChain4j, Spring AI, Anthropic) exist in any `pom.xml` or `package.json`.
- There are no machine learning models, heuristics, prompt templates, or recommendation algorithms.
- Daily summaries ([MealPlanService.java:144-149](file:///c:/Riten/Java/nutrition-tracker-msa/Meal-Planning/src/main/java/com/example/mealplanning/service/MealPlanService.java#L144-L149)) and estimated grocery costs ([GroceryListService.java:208-213](file:///c:/Riten/Java/nutrition-tracker-msa/Grocery-Planning/src/main/java/com/example/groceryplanningservice/service/GroceryListService.java#L208-L213)) are calculated using deterministic standard multiplication and addition.

---

## 5. Inter-Service Communication & Discovery

### OpenFeign
Two microservices communicate with the **Food-Database Service** using Spring Cloud OpenFeign:
1. **Meal-Planning Service**:
   - Interface: [FoodServiceClient.java](file:///c:/Riten/Java/nutrition-tracker-msa/Meal-Planning/src/main/java/com/example/mealplanning/client/FoodServiceClient.java)
   - Configuration: `@FeignClient(name = "FOOD-DATABASE-SERVICE")`
   - Target Endpoints: `GET /api/foods/{foodId}`
2. **Grocery-Planning Service**:
   - Interface: [FoodServiceClient.java](file:///c:/Riten/Java/nutrition-tracker-msa/Grocery-Planning/src/main/java/com/example/groceryplanningservice/client/FoodServiceClient.java)
   - Configuration: `@FeignClient(name = "FOOD-DATABASE-SERVICE")`
   - Target Endpoints: `GET /api/foods/{foodId}`

### Eureka Service Discovery
- Configured via `spring-cloud-starter-netflix-eureka-client` in all 4 microservices and API-Gateway.
- Default zone configured in `application.yml`: `http://eureka-server:8761/eureka/`.

### API Gateway Routing
- Configured in [API-Gateway/src/main/resources/application.yml](file:///c:/Riten/Java/nutrition-tracker-msa/API-Gateway/src/main/resources/application.yml):
  - `Path=/api/users/**` ➔ `lb://USER-PROFILE-SERVICE`
  - `Path=/api/foods/**` ➔ `lb://FOOD-DATABASE-SERVICE`
  - `Path=/api/meal-plans/**` ➔ `lb://MEAL-PLANNING-SERVICE`
  - `Path=/api/grocery-lists/**` ➔ `lb://GROCERY-PLANNING-SERVICE`
  - Rewrite filters: `/api/meals/**` ➔ `/api/meal-plans/**`, `/api/grocery/**` ➔ `/api/grocery-lists/**`.

---

## 6. Database Tier & Separation

All services utilize **MongoDB** (either MongoDB Atlas or local container `mongo:7.0`):

| Microservice | Configured Database | MongoDB Collections | Entity Source Files |
| :--- | :--- | :--- | :--- |
| **User-Profile** | `user_profile_db` | `users`, `database_sequences` | [User.java](file:///c:/Riten/Java/nutrition-tracker-msa/User-Profile/src/main/java/com/example/userprofile/entity/User.java), [DatabaseSequence.java](file:///c:/Riten/Java/nutrition-tracker-msa/User-Profile/src/main/java/com/example/userprofile/entity/DatabaseSequence.java) |
| **Food-Database** | `food_database` | `foods` | [Food.java](file:///c:/Riten/Java/nutrition-tracker-msa/Food-Database/src/main/java/com/example/fooddatabase/model/Food.java) |
| **Meal-Planning** | `food_database` | `meal_plans`, `meals` | [MealPlan.java](file:///c:/Riten/Java/nutrition-tracker-msa/Meal-Planning/src/main/java/com/example/mealplanning/entity/MealPlan.java), [Meal.java](file:///c:/Riten/Java/nutrition-tracker-msa/Meal-Planning/src/main/java/com/example/mealplanning/entity/Meal.java) |
| **Grocery-Planning** | `grocery_planning_db` | `grocery_lists`, `grocery_items` | [GroceryList.java](file:///c:/Riten/Java/nutrition-tracker-msa/Grocery-Planning/src/main/java/com/example/groceryplanningservice/entity/GroceryList.java), [GroceryItem.java](file:///c:/Riten/Java/nutrition-tracker-msa/Grocery-Planning/src/main/java/com/example/groceryplanningservice/entity/GroceryItem.java) |

- **Separation Assessment:**
  - `User-Profile` and `Grocery-Planning` use completely isolated databases (`user_profile_db`, `grocery_planning_db`).
  - `Meal-Planning` shares the database name `food_database` with `Food-Database Service`, though collections are separated (`foods` vs `meal_plans`/`meals`).

---

## 7. Authentication & Authorization

- **Password Storage:** Encrypted using `BCryptPasswordEncoder` ([SecurityConfig.java:25-27](file:///c:/Riten/Java/nutrition-tracker-msa/User-Profile/src/main/java/com/example/userprofile/security/SecurityConfig.java#L25-L27)).
- **JWT Issuance:** Signed HMAC-SHA256 token generated upon login in `JwtUtils.java` with 24-hour expiration.
- **JWT Validation:** Validated exclusively in [JwtAuthenticationFilter.java](file:///c:/Riten/Java/nutrition-tracker-msa/User-Profile/src/main/java/com/example/userprofile/security/JwtAuthenticationFilter.java) within the `User-Profile Service`.
- **Downstream Security Absence:**
  - `API-Gateway` does **not** validate JWTs or enforce authentication before routing.
  - `Food-Database`, `Meal-Planning`, and `Grocery-Planning` do **not** have Spring Security or JWT filters. Any client can invoke `/api/meal-plans` or `/api/grocery-lists` directly without a token.
  - Endpoints in Meal/Grocery services accept arbitrary `userId` parameters with no validation against the authenticated principal (IDOR risk).

---

## 8. Major Issues (Top 5 Bugs & Architectural Gaps)

1. **Broken Access Control / Insecure Direct Object Reference (IDOR):**
   Downstream services (`Meal-Planning`, `Grocery-Planning`, `Food-Database`) have no security filters. A client can read or modify any user's meal plan or grocery list simply by altering `{userId}` in the request path or payload.
2. **Meal Plan Query Ignores Date:**
   [MealPlanRepository.java:12](file:///c:/Riten/Java/nutrition-tracker-msa/Meal-Planning/src/main/java/com/example/mealplanning/repository/MealPlanRepository.java#L12) declares only `findByUserId(Long userId)`. When a user attempts to create meal plans for multiple distinct dates, `getMealPlanByUserId` and `getDailySummary` either throw `IncorrectResultSizeDataAccessException` (multiple results returned) or only return the first plan ever created.
3. **Active Grocery List Duplication Bug:**
   [GroceryListService.java:50-59](file:///c:/Riten/Java/nutrition-tracker-msa/Grocery-Planning/src/main/java/com/example/groceryplanningservice/service/GroceryListService.java#L50-L59) creates a new `ACTIVE` list without checking if one already exists. Subsequent calls to `getActiveGroceryList()` trigger `IncorrectResultSizeDataAccessException` from `findByUserIdAndStatus`.
4. **Empty Initial State (No Seed Data):**
   `Food-Database` contains no seed data or migration scripts. On a clean database, `GET /api/foods` returns `[]`. Because Meal and Grocery additions strictly require food existence via Feign, the entire system is non-operational until foods are manually inserted via raw API calls.
5. **Silent Mock Fallbacks Conceal Backend Errors:**
   Frontend pages catch backend errors and silently display [mockData.ts](file:///c:/Riten/Java/nutrition-tracker-msa/frontend/src/services/mockData.ts). Users cannot distinguish between live data and hardcoded mock data when a service fails.

---

## 9. Current User Flow & Where it Breaks

1. **Registration & Login:**
   - User registers at `/register` and logs in at `/login`.
   - **Status:** **Works**. User is created in MongoDB, and a valid JWT is stored in `localStorage`.
2. **Dashboard:**
   - Navigates to `/dashboard`. BMR target is computed locally from user profile.
   - **Status:** **Works**. Displays 0 calories for new users, or mock data if backend errors occur.
3. **Browsing Foods:**
   - Navigates to `/foods`.
   - **Break Point:** If the database was not manually pre-seeded with foods, the catalog is empty. There is no UI button to create new foods.
4. **Logging a Meal:**
   - Navigates to `/meal-planning`. Clicks "Create Meal Plan" and opens "Add Food".
   - **Break Point:** If no foods exist, dropdown is empty. If user creates plans for different dates, the backend cannot differentiate them by date.
5. **Managing Grocery List:**
   - Navigates to `/grocery-planning`. User creates list and adds items.
   - **Break Point:** No connection exists between meals and groceries. The user must manually recreate grocery items one-by-one.

---

## 10. Project Status Breakdown

| Domain | Status | Notes |
| :--- | :---: | :--- |
| **Eureka Discovery** | ✅ Complete | Verified running and healthy on port 8761. |
| **API Gateway** | ✅ Complete | Verified routing, CORS, and unified Swagger aggregation. |
| **User Profile & Auth** | ✅ Complete | Registration, login, JWT issuance, profile/allergy/diet CRUD all operational. |
| **Food Master Data** | 🟡 Partially Complete | CRUD works; missing seed data, pagination, and frontend admin UI. |
| **Meal Planning** | 🟡 Partially Complete | Adding meals and daily summary work; missing date-based querying and weekly view. |
| **Grocery Planning** | 🟡 Partially Complete | Item tracking and cost estimate work; missing meal-plan sync and active-list deduplication. |
| **Frontend UI** | 🟡 Partially Complete | All views built and styled; relies heavily on silent mock data fallbacks. |
| **Distributed Security** | ❌ Missing | Gateway and business services lack JWT validation and IDOR protection. |
| **AI Capabilities** | ❌ Missing | No AI models, LLM prompts, or recommendation engines exist. |
