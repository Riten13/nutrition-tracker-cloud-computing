# 🥗 Nutrition Tracker — Comprehensive Microservices Architecture Guide

> **System Deep-Dive & Service Specification**  
> **Platform Stack:** Java 21 • Spring Boot 3.3.x • Spring Cloud 2023.0.3 (Eureka, Gateway, OpenFeign) • Amazon S3 (AWS SDK for Java v2) • MongoDB NoSQL • React 19 + Vite • Docker Compose (Local & EC2 Production)  
> **Official Repository:** [nutrition-tracker-msa](https://github.com/Riten13/nutrition-tracker-msa.git) • **Branch:** `main`  
> **Production Target:** AWS EC2 (Ubuntu 24.04 LTS, `c7i-flex.large`, 4 GB RAM, Region `ap-southeast-2`)

---

## 📑 Table of Contents
1. [Architectural Overview & Philosophy](#1-architectural-overview--philosophy)
2. [Global Architecture & Communication Topology](#2-global-architecture--communication-topology)
3. [Infrastructure Layer](#3-infrastructure-layer)
   - [Eureka Server (Port 8761)](#31-eureka-server-service-discovery--registry)
   - [API Gateway (Port 8088)](#32-api-gateway-reverse-proxy--router)
4. [Core Business Microservices](#4-core-business-microservices)
   - [User Profile Service (Port 8080)](#41-user-profile-service-auth--identity)
   - [Food Database Service (Port 3000)](#42-food-database-service-master-data)
     - [Amazon S3 Image Storage Engine & Presigned URLs](#amazon-s3-food-image-storage-engine)
     - [Catalog Modification Privileges (ROLE_USER & ROLE_ADMIN)](#4-access-control-and-permissions)
   - [Meal Planning Service (Port 3001)](#43-meal-planning-service-nutrition-engine)
   - [Grocery Planning Service (Port 3002)](#44-grocery-planning-service-cost-estimation)
5. [Frontend Client Application (Port 5173)](#5-frontend-client-application)
6. [Database Layer: Unified MongoDB Architecture](#6-database-layer-unified-mongodb-architecture)
7. [End-to-End Request Lifecycles](#7-end-to-end-request-lifecycles)
   - [Flow E: S3 Food Image Upload & Presigned URL Resolution](#flow-e-s3-food-image-upload--presigned-url-resolution)
8. [Docker Containerization, AWS Credentials & Memory Optimization](#8-docker-containerization-aws-credentials--memory-optimization)
9. [Future Roadmap: Integrating AI via OpenRouter](#9-future-roadmap-integrating-ai-via-openrouter)

---

## 1. Architectural Overview & Philosophy

The **Nutrition Tracker Platform** is engineered following modern **Microservices Architecture (MSA)** principles. Instead of a monolithic codebase where all business domains, persistence logic, and web handlers are coupled together, the system is decomposed into **four domain-focused microservices** supported by **two infrastructure services**, **Amazon S3 Cloud Object Storage**, and a **React single-page application (SPA)**.

### Core Architectural Principles:
1. **Single Responsibility Principle (SRP)**: Each service owns exactly one domain (Identity & Goals, Food Master Data & Portions, Meal Tracking & History, Grocery Planning).
2. **Database-per-Service Pattern**: No microservice directly queries the database of another microservice. Data ownership is strict.
3. **Decoupled Inter-Service Communication**: Microservices communicate over HTTP REST using **Spring Cloud OpenFeign** with dynamic instance resolution via **Eureka Service Discovery**.
4. **Cloud Object Storage Separation**: Binary image files are never stored in MongoDB or service local disks. All food imagery is stored in **Amazon S3**, keeping MongoDB lightweight (storing only string object keys) and serving images via secure, short-lived presigned URLs.
5. **Decoupled Access Permissions**: Food catalog write privileges are open to all authenticated users (`ROLE_USER` and `ROLE_ADMIN`) while keeping unauthenticated access read-only and requiring authentication for all mutations.
6. **Centralized Entry Point**: The client never communicates directly with backend microservices; all traffic passes through the **Spring Cloud API Gateway**.
7. **Stateless Security Propagation**: Authentication uses digitally signed HMAC-SHA JWT tokens. Gateway routes forward the `Authorization: Bearer <token>` header downstream, and OpenFeign clients propagate tokens via request interceptors.

---

## 2. Global Architecture & Communication Topology

```
                                  ┌─────────────────────────────┐
                                  │   React 19 Frontend (SPA)   │
                                  │      (Port: 5173 / Nginx)   │
                                  └──────────────┬──────────────┘
                                                 │ HTTP Requests (with JWT)
                                                 ▼
                                  ┌─────────────────────────────┐
                                  │     Spring Cloud Gateway    │
                                  │          Port: 8088         │
                                  │  • Reverse Proxy & Routing  │
                                  │  • Global CORS & Rewrites   │
                                  │  • Unified Swagger UI Docs  │
                                  └──────────────┬──────────────┘
                                                 │
                                                 │ Dynamic Route Resolution (lb://)
                                                 ▼
                                  ┌─────────────────────────────┐
                                  │    Eureka Service Server    │
                                  │          Port: 8761         │
                                  │  (Registry & Heartbeats)    │
                                  └──────────────┬──────────────┘
                                                 │
       ┌──────────────────────────┬──────────────┴──────────────┬──────────────────────────┐
       │                          │                             │                          │
       ▼                          ▼                             ▼                          ▼
┌───────────────┐        ┌──────────────────┐        ┌──────────────────┐       ┌────────────────────┐
│ User Profile  │        │  Food Database   │        │  Meal Planning   │       │  Grocery Planning  │
│  (Port 8080)  │        │   (Port 3000)    │        │   (Port 3001)    │       │    (Port 3002)     │
│ [Goals & Sec] │        │ [Portion Master] │        │ [History Engine] │       │ [Cost Estimation]  │
└───────┬───────┘        └─────┬──────▲─────┘        └────────┬─────────┘       └─────────┬──────────┘
        │                      │      │  OpenFeign (lb://)    │                           │
        │      AWS SDK v2 (S3) │      ├───────────────────────┘                           │
        │                      │      │                                                   │
        │                      │      └───────────────────────────────────────────────────┘
        │                      ▼
        │             ┌──────────────────────────────────────────────────┐
        │             │             Amazon S3 Object Storage             │
        │             │   Bucket: nutrition-tracker-food-images-2026-new │
        │             │   Region: ap-southeast-2                         │
        │             │   Prefix: food-images/                           │
        │             │   • Private Bucket (No Public Access)            │
        │             │   • 60-Minute Signed GET URLs via S3Presigner    │
        │             └──────────────────────────────────────────────────┘
        ▼                                                     ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   MongoDB Data Tier                                    │
│               Collections: users, foods, meal_plans, meals, grocery_lists               │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Infrastructure Layer

### 3.1 Eureka Server (Service Discovery & Registry)
- **Port:** `8761`
- **Application Name:** `EUREKA-SERVER`
- **Main Class:** `EurekaServerApplication.java` (`@EnableEurekaServer`)
- **Role & How it Works:**
  - Acts as the central registry for the entire ecosystem.
  - When any microservice boots up, it broadcasts its hostname, IP, and assigned port to Eureka (Registration).
  - Every 30 seconds, microservices send a heartbeat to Eureka. If heartbeats stop, Eureka evicts the instance.
  - Other services (and the Gateway) query Eureka to dynamically discover target service IP addresses without hardcoding URLs.
  - Exposes an interactive web dashboard at `http://localhost:8761` showing all live registered nodes.

### 3.2 API Gateway (Reverse Proxy & Router)
- **Port:** `8088`
- **Application Name:** `API-GATEWAY`
- **Technology:** Spring Cloud Gateway (Reactive, built on Project Reactor & Netty)
- **Role & How it Works:**
  - **Single Entry Point:** Clients only talk to port `8088`. Backend ports (`8080`, `3000`, `3001`, `3002`) remain shielded.
  - **Dynamic Load Balancing (`lb://`):** Uses Spring Cloud LoadBalancer to resolve service names (e.g., `lb://USER-PROFILE-SERVICE`) through Eureka.
  - **Route Aliases & Rewrites:**
    - Standard Route: `/api/meal-plans/**` ➔ `lb://MEAL-PLANNING-SERVICE`
    - Convenient Alias: `/api/meals/**` ➔ Path rewritten automatically to `/api/meal-plans/**`.
    - Convenient Alias: `/api/grocery/**` ➔ Path rewritten automatically to `/api/grocery-lists/**`.
  - **CORS Handling:** Enforces global CORS headers allowing cross-origin requests from the React frontend (`http://localhost:5173`).
  - **JWT Pass-Through:** Forwards the `Authorization: Bearer <token>` header downstream to protected microservices without modifying payload integrity.
  - **Unified Swagger Aggregation:** Hosts an aggregated OpenAPI documentation console at `http://localhost:8088/swagger-ui.html` with a dropdown switch between all 4 services.

---

## 4. Core Business Microservices

---

### 4.1 User Profile Service (Auth, Identity & Goals)
- **Port:** `8080`
- **Database:** MongoDB (`user_profile_db` / `users` collection)
- **Primary Package:** `com.example.userprofile`

#### What It Does:
Manages customer accounts, authentication, physical biometrics (age, gender, height, weight), dietary preferences (vegan, keto, dairy-free), allergens (peanuts, gluten, etc.), and **personalized daily nutrition targets** (lose/maintain/gain weight, calories, protein, carbs, fat).

#### How It Works (Internal Mechanics):
1. **Security & Cryptography**:
   - Uses **Spring Security 6** with custom `SecurityConfig`.
   - Passwords are encrypted using **BCrypt** hashing (`BCryptPasswordEncoder`) before storing in the database.
   - On successful login, `JwtUtils` generates an HMAC-SHA256 signed JSON Web Token (JWT) containing the user's email, ID, and claims with an expiration period (24 hours).
2. **Stateless Request Authentication**:
   - Protected endpoints require `Authorization: Bearer <token>`.
   - `JwtAuthenticationFilter` intercepts incoming requests, extracts the JWT, validates its digital signature, loads `UserDetailsServiceImpl`, and populates the `SecurityContextHolder`.
3. **Personalized Nutrition Goals (`NutritionGoal`)**:
   - Users can choose a fitness goal (`LOSE_WEIGHT`, `MAINTAIN_WEIGHT`, `GAIN_WEIGHT`) and configure custom daily targets for calories, protein, carbs, and fat.
   - Profile page offers a client-side **Mifflin-St Jeor equation calculator** (TDEE estimation) based on age, gender, height, weight, and activity level.
   - **Non-Medical Disclaimer**: Target suggestions include clear disclaimers that calculations are mathematical estimates and not medical advice. All targets are 100% user-editable.
4. **Ownership Verification (IDOR Protection)**:
   - `UserService.validateUserOwnership(userId)` confirms that the user ID in the JWT matches the `{userId}` URL parameter, preventing cross-user data tampering.
5. **Sequence-Generated Long IDs**:
   - Because MongoDB uses `ObjectId` by default while client Feign contracts expect numeric `Long` IDs, a `SequenceGeneratorService` increments a sequence counter in the `database_sequences` collection (`getNextSequence("users_sequence")`), ensuring backward-compatible numeric IDs (`1, 2, 3...`).

#### Data Model (`User.java`):
```json
{
  "_id": 1,
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "$2a$10$e7V9...hashed...",
  "profile": {
    "age": 28,
    "gender": "FEMALE",
    "weight": 62.5,
    "height": 168.0,
    "activityLevel": "MODERATE"
  },
  "dietaryPreference": {
    "vegan": false,
    "vegetarian": true,
    "glutenFree": false,
    "dairyFree": false,
    "keto": false
  },
  "allergies": [
    { "id": 101, "allergyName": "Peanuts", "severity": "HIGH" }
  ],
  "nutritionGoal": {
    "fitnessGoal": "LOSE_WEIGHT",
    "dailyCalories": 1850.0,
    "proteinGrams": 130.0,
    "carbsGrams": 190.0,
    "fatGrams": 55.0
  }
}
```

#### Key API Endpoints:
| Method | Endpoint | Description | Auth Required |
|:---|:---|:---|:---:|
| `POST` | `/api/users/register` | Create account & default profile | No |
| `POST` | `/api/users/login` | Authenticate email/password & receive JWT | No |
| `GET` | `/api/users/{userId}` | Fetch user profile, preferences, allergies & goals | Yes |
| `PUT` | `/api/users/{userId}` | Update physical biometric profile metrics | Yes |
| `PUT` | `/api/users/{userId}/goals` | Set or update daily calorie & macronutrient targets | Yes |
| `POST` | `/api/users/{userId}/allergies` | Add an allergy record | Yes |
| `DELETE` | `/api/users/{userId}/allergies/{id}` | Delete an allergy record | Yes |
| `PUT` | `/api/users/{userId}/preferences` | Update dietary preference flags | Yes |

---

### 4.2 Food Database Service (Master Data & Portion Weights)
- **Port:** `3000`
- **Database:** MongoDB (`food_database` / `foods` collection)
- **Object Storage:** Amazon S3 (`nutrition-tracker-food-images-2026-new`)
- **Primary Package:** `com.example.fooddatabase`

#### What It Does:
Acts as the **single source of truth** for food items, nutritional values, **serving portion weight conversions** (e.g. roti = 35g, boiled egg = 50g, dal bowl = 180g), and **food imagery stored securely in Amazon S3**.

#### How It Works (Internal Mechanics):
1. **Standardized Nutrition + Portion Unit Conversions**:
   - Nutritional values (`calories`, `protein`, `carbohydrates`, `fat`, `fiber`, `sugar`, `sodium`) are stored normalized **per 100g**.
   - Concurrently, `servingSize`, `servingUnit` (e.g. `'piece'`, `'bowl / katori'`, `'cup'`, `'tablespoon'`), and `servingWeightGrams` specify meaningful real-world serving conversions.
2. **Automated Food Catalog Seeder (`FoodDataSeeder.java`)**:
   - On startup, seeds and upgrades a curated collection of 35 staple foods (Indian breads, lentils, curries, dairy, eggs, breakfast items, fruits, nuts).
   - Idempotently enriches existing entries with missing `servingWeightGrams` data without duplicate insertion.
3. **Search & Filter Pipeline**:
   - `FoodRepository` exposes Spring Data MongoDB methods with Regex matching (`findByCategoryIgnoreCase`, `findByNameContainingIgnoreCase`) for instant catalog searching.
4. **Access Control and Permissions (`SecurityConfig.java`)**:
   - Public read operations (`GET /api/foods/**`): Anyone, including unauthenticated visitors and inter-service Feign clients, can read food catalog data without a JWT.
   - Catalog management (`POST`, `PUT`, `DELETE`): Protected by Spring Security with `.hasAnyRole("ADMIN", "USER")`. All authenticated users have full access to add new foods, edit existing items, and delete catalog entries without needing elevated administrator rights. Unauthenticated requests are rejected with `401 Unauthorized`.
5. **Amazon S3 Food Image Storage Engine**:
   - **AWS SDK for Java v2**: Integrates `software.amazon.awssdk:s3:2.25.16` (`S3Client` and `S3Presigner`).
   - **Private Bucket Isolation**: The bucket (`nutrition-tracker-food-images-2026-new` in region `ap-southeast-2`) has AWS S3 Block Public Access enabled. Raw object URLs cannot be read without cryptographic signing.
   - **Unique Object Keying**: Stored under prefix `food-images/` using the template `food-images/{foodId}_{UUID}.{ext}`, preventing filename clashes and overwrites.
   - **MIME Magic-Bytes Validation (Apache Tika)**: Verifies the actual file binary signatures (magic bytes) to guarantee only authentic JPEG (`FF D8 FF`), PNG (`89 50 4E 47`), and WebP (`52 49 46 46`) files under 5 MB are accepted. Spoofed file extensions (e.g., `.exe` renamed to `.jpg`) are rejected with `400 Bad Request`.
   - **Storage Decoupling**: MongoDB stores only the lightweight string key `imageKey` in the `Food` document (never image bytes).
   - **Temporary Presigned GET URLs**: When foods are queried via API, `S3Presigner` generates a temporary pre-signed URL valid for **60 minutes** (`3600 seconds`) allowing the browser to stream the image directly from AWS S3.
   - **S3 Cleanup Lifecycle**: When a food item is deleted or its image is replaced, the service dispatches an `s3Client.deleteObject` call to automatically delete the orphaned image from S3.
   - **Local & Cloud AWS Authentication**: In local Docker development, the container mounts `${USERPROFILE}/.aws` read-only and uses `AWS_PROFILE=nutrition-dev`. The AWS SDK Default Credentials Provider Chain automatically falls back to EC2 IAM Role instance metadata in production with zero code changes.

#### Data Model (`Food.java`):
```json
{
  "_id": "67b5e4f201a9b",
  "name": "Whole Wheat Roti / Chapati",
  "category": "Grains",
  "description": "Traditional Indian flatbread made of whole wheat flour cooked on a tawa",
  "imageKey": "food-images/67b5e4f201a9b_7d428bf1-2cfb-4a3d-b2a1-e94d8cb8e04b.png",
  "imageUrl": "https://nutrition-tracker-food-images-2026-new.s3.ap-southeast-2.amazonaws.com/food-images/67b5e4f201a9b_7d428bf1-2cfb-4a3d-b2a1-e94d8cb8e04b.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Date=...",
  "nutrition": {
    "servingSize": 1.0,
    "servingUnit": "piece",
    "servingWeightGrams": 35.0,
    "calories": 264.0,
    "protein": 9.1,
    "carbohydrates": 54.0,
    "fat": 1.2,
    "fiber": 9.2,
    "sugar": 0.4,
    "sodium": 5.0
  }
}
```

#### Key API Endpoints:
| Method | Endpoint | Description | Auth / Role |
|:---|:---|:---|:---:|
| `GET` | `/api/foods` | List all foods (supports `?name=` and `?category=`) | Public |
| `GET` | `/api/foods/{foodId}` | Fetch single food item with full nutrition, portion data, and presigned image URL | Public |
| `GET` | `/api/foods/{foodId}/nutrition` | Inter-service Feign endpoint returning nutrition macros | Public |
| `POST` | `/api/foods` | Add a new food item to catalog | `ROLE_USER` or `ROLE_ADMIN` |
| `PUT` | `/api/foods/{foodId}` | Update an existing food item | `ROLE_USER` or `ROLE_ADMIN` |
| `DELETE` | `/api/foods/{foodId}` | Remove a food item from catalog and cleans up S3 image | `ROLE_USER` or `ROLE_ADMIN` |
| `POST` | `/api/foods/{foodId}/image` | Upload or replace S3 food photo (JPG, PNG, WebP ≤ 5 MB) | `ROLE_USER` or `ROLE_ADMIN` |
| `DELETE` | `/api/foods/{foodId}/image` | Delete S3 image and clear `imageKey` from food record | `ROLE_USER` or `ROLE_ADMIN` |

---

### 4.3 Meal Planning Service (Nutrition Engine & History)
- **Port:** `3001`
- **Database:** MongoDB (`food_database` or dedicated DB / `meal_plans`, `meals` collections)
- **Primary Package:** `com.example.mealplanning`

#### What It Does:
Enables users to schedule daily meals (Breakfast, Lunch, Dinner, Snack), log portions in grams or serving units, edit logged meals, and compute **continuous 7-day nutritional timelines**.

#### How It Works (Internal Mechanics):
1. **Dynamic Portion-to-Gram Conversion**:
   - When a meal is logged with a specific unit (e.g. `2 pieces` of Roti), `MealPlanService.calculateMealGrams` dynamically converts quantity to grams:
     $$\text{effectiveGrams} = \begin{cases} \text{quantity} \times \left(\frac{\text{servingWeightGrams}}{\text{servingSize}}\right) & \text{if unit matches servingUnit} \\ \text{quantity} & \text{if unit is 'g' or null} \end{cases}$$
   - This prevents inaccurate assumptions (e.g. treating 1 roti as 1 gram or assuming all bowls weigh the same).
2. **Meal Editing with Validation (`PUT /api/meal-plans/{planId}/meals/{mealId}`)**:
   - Validates that the meal belongs to the specified `planId`.
   - Validates that the authenticated user owns the `MealPlan` (cross-user IDOR protection).
   - Verifies the new `foodId` exists in `Food Database Service` before updating fields.
3. **Continuous 7-Day History Generation (`GET /api/meal-plans/{userId}/history`)**:
   - Queries all meal plans within the window `[today - 6 days, today]`.
   - Backfills days with no logged meals with clean 0-value summaries, ensuring the frontend chart receives an unbroken timeline.
4. **Single-Pass OpenFeign In-Memory Caching**:
   - To eliminate N+1 HTTP calls during daily summaries or 7-day history generation, `MealPlanService` collects distinct `foodId`s across all meals and caches the `FoodDto` in a local request map. Duplicate food entries query the cache rather than triggering repeated HTTP calls.
5. **OpenFeign Token Propagation**:
   - [FeignClientInterceptor](file:///c:/Riten/Java/nutrition-tracker-msa/Meal-Planning/src/main/java/com/example/mealplanning/config/FeignClientInterceptor.java) automatically extracts the JWT from the current `HttpServletRequest` and attaches it to outbound Feign requests, maintaining authentication context across internal services.

#### Data Models (`MealPlan.java` & `Meal.java`):
```json
// meal_plans
{
  "_id": "plan_991",
  "userId": 1,
  "planDate": "2026-10-22",
  "createdAt": "2026-10-22T08:00:00"
}

// meals
{
  "_id": "meal_001",
  "mealPlanId": "plan_991",
  "foodId": "67b5e4f201a9b",
  "mealType": "BREAKFAST",
  "quantity": 2.0,
  "unit": "piece"
}
```

#### Key API Endpoints:
| Method | Endpoint | Description | Auth Required |
|:---|:---|:---|:---:|
| `POST` | `/api/meal-plans` | Initialize a daily meal plan for a user | Yes |
| `GET` | `/api/meal-plans/{userId}` | Get user's meal plan with all nested meals for a date | Yes |
| `POST` | `/api/meal-plans/{planId}/meals` | Log a food item into a meal plan (quantity + unit) | Yes |
| `PUT` | `/api/meal-plans/{planId}/meals/{mealId}` | Edit logged meal (type, food, quantity, unit) | Yes |
| `GET` | `/api/meal-plans/{planId}/meals` | Retrieve all logged meals for a plan | Yes |
| `DELETE` | `/api/meal-plans/{planId}/meals/{mealId}` | Remove a meal entry | Yes |
| `GET` | `/api/meal-plans/{userId}/daily-summary` | Compute & return live daily calorie/macro totals | Yes |
| `GET` | `/api/meal-plans/{userId}/history` | Continuous 7-day nutritional timeline with target comparison | Yes |

---

### 4.4 Grocery Planning Service (Cost Estimation)
- **Port:** `3002`
- **Database:** MongoDB (`grocery_planning_db` / `grocery_lists`, `grocery_items` collections)
- **Primary Package:** `com.example.groceryplanningservice`

#### What It Does:
Allows users to maintain active grocery shopping lists, tick off purchased items, track desired quantities/units, and **compute real-time estimated grocery bills**.

#### How It Works (Internal Mechanics):
1. **Catalog Integrity**:
   - `GroceryItem` stores only `foodId`, `quantity`, `unit` (e.g., `KG`, `GRAMS`, `PCS`), `checked` status (`boolean`), and `estimatedPrice` (`BigDecimal`).
   - Validates items against `Food Database Service` via OpenFeign.
2. **High-Precision Financial Arithmetic (`getEstimatedCost`)**:
   - Uses `java.math.BigDecimal` to eliminate floating-point precision errors:
     $$\text{Estimated Cost} = \sum \left( \text{estimatedPrice} \times \text{quantity} \right)$$
   - Safely ignores unchecked or unpriced items depending on calculation mode.

#### Data Models (`GroceryList.java` & `GroceryItem.java`):
```json
// grocery_lists
{
  "_id": "list_404",
  "userId": 1,
  "status": "ACTIVE",
  "createdAt": "2026-10-22T08:30:00"
}

// grocery_items
{
  "_id": "item_552",
  "groceryListId": "list_404",
  "foodId": "67b5e4f201a9b",
  "quantity": 2,
  "unit": "BOX",
  "checked": false,
  "estimatedPrice": 4.50
}
```

#### Key API Endpoints:
| Method | Endpoint | Description | Auth Required |
|:---|:---|:---|:---:|
| `POST` | `/api/grocery-lists` | Create a new active grocery list for a user | Yes |
| `GET` | `/api/grocery-lists/{userId}` | Fetch user's active grocery list and all items | Yes |
| `POST` | `/api/grocery-lists/{listId}/items` | Add grocery item to list (calls Food DB) | Yes |
| `PUT` | `/api/grocery-lists/{listId}/items/{itemId}` | Partial update (toggle checked, edit quantity/price) | Yes |
| `DELETE` | `/api/grocery-lists/{listId}/items/{itemId}` | Remove grocery item from list | Yes |
| `GET` | `/api/grocery-lists/{listId}/estimated-cost` | Calculate total estimated cost of all items | Yes |

---

## 5. Frontend Client Application

- **Port:** `5173` (Served through Nginx in Docker)
- **Location:** `c:\Riten\Java\nutrition-tracker-msa\frontend`
- **Tech Stack:** React 19, Vite, TypeScript, Tailwind CSS, Lucide Icons, Recharts, Axios

### Architecture & Key Modules:
- **`Dashboard.tsx`**:
  - Displays saved personal nutrition targets (Calories, Protein, Carbs, Fat) with real consumed vs. target progress bars.
  - Interactive **7-Day History Chart (Recharts)** with dual-mode toggle: "Calories vs Target" and "Macronutrients Breakdown".
  - Clean empty, loading, and error states without mock fallbacks.
- **`MealPlanning.tsx`**:
  - Date navigator and visual meal timeline for Breakfast, Lunch, Dinner, and Snacks.
  - Portion unit selector supporting grams and custom serving units (`piece`, `bowl`, `cup`, `serving`).
  - **Meal Editing Modal**: Allows inline editing of meal type, quantity, and portion unit.
- **`Profile.tsx`**:
  - Biometric metrics management (age, gender, height, weight, activity level).
  - Allergy and dietary preference checklists.
  - **Mifflin-St Jeor Target Calculator**: Provides estimated baseline TDEE targets based on physical metrics, paired with a non-medical advice disclaimer. All targets remain user-editable before saving.
- **`Foods.tsx`**:
  - Live searchable and category-filtered master food catalog displaying serving sizes, portion conversion weights, and 100g nutritional facts.
  - **Amazon S3 Image Integration**: Renders food photos directly from temporary presigned S3 URLs with automatic graceful fallback to placeholder artwork.
  - **Image Management Modal**: Allows users to preview and upload JPG, PNG, or WebP images (max 5 MB) directly to S3.
  - **Accessible Catalog Controls**: Authenticated users can add new foods, edit existing records, delete foods, and upload/replace/remove S3 food photos directly without needing dedicated admin role elevation.
- **`GroceryPlanning.tsx`**:
  - Interactive checklist with real-time bill calculations and item check-offs.
- **API Service Layer (`/src/services`)**:
  - Centralized Axios client ([api.ts](file:///c:/Riten/Java/nutrition-tracker-msa/frontend/src/services/api.ts)) with environment-aware `baseURL` resolution:
    - **Local Development:** Defaults to `http://localhost:8088` when running Vite dev server locally.
    - **Production (EC2):** Resolves to same-origin relative URLs (`/api/...`) via `VITE_API_BASE_URL=""`, seamlessly proxied by Nginx to `http://api-gateway:8088/api/*` internally, completely avoiding CORS and keeping internal microservices and Eureka private.
  - Automatically attaches `Authorization: Bearer <token>` from `localStorage` on outbound requests.
  - Redirects to `/login` upon receiving `401 Unauthorized` responses.

---

## 6. Database Layer: Unified MongoDB Architecture

The entire ecosystem operates on a **pure MongoDB NoSQL architecture**:

```
                       ┌─────────────────────────────────────────┐
                       │        MongoDB Database Tier            │
                       │   (Local Docker or MongoDB Atlas)       │
                       └────────────────────┬────────────────────┘
                                            │
        ┌────────────────────┬──────────────┴─────┬────────────────────┐
        ▼                    ▼                    ▼                    ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│  user_profile_db │ │  food_database   │ │  food_database   │ │grocery_planning_db│
│  (Port 8080)     │ │  (Port 3000)     │ │  (Port 3001)     │ │  (Port 3002)     │
│  • users         │ │  • foods         │ │  • meal_plans    │ │  • grocery_lists │
│  • sequences     │ │                  │ │  • meals         │ │  • grocery_items │
└──────────────────┘ └──────────────────┘ └──────────────────┘ └──────────────────┘
```

### Why MongoDB Fits This Domain:
1. **Document Flexibility**: Nutrition data has varied micronutrients, and user profiles have variable allergies, preferences, and goals. Document embedding eliminates complex SQL multi-table joins.
2. **High Read Performance**: Nutrition lookups and meal queries are retrieved in a single BSON document fetch.
3. **Environment Portability**: Supports transparent switching between **MongoDB Atlas (cloud)** and **local containerized MongoDB** using standard connection strings in `.env`:
   ```bash
   USER_PROFILE_MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.ioo4yf3.mongodb.net/user_profile_db
   ```

---

## 7. End-to-End Request Lifecycles

### Flow A: User Logs In
1. User enters email and password on React Frontend (`http://localhost:5173/login`).
2. Frontend sends `POST http://localhost:8088/api/users/login`.
3. **API Gateway** matches predicate `Path=/api/users/**`, consults **Eureka** for `USER-PROFILE-SERVICE`, and forwards the request.
4. **User Profile Service** verifies email, checks password hash with `BCryptPasswordEncoder.matches()`, generates a signed JWT, and returns `AuthResponse` containing token + profile + goals.
5. React saves JWT in `localStorage` and redirects user to `/dashboard`.

---

### Flow B: User Adds a Meal with Serving Units
```
[User Browser]           [API Gateway]           [Meal Planning]          [Food Database]
      │                         │                       │                        │
   1. │ POST /api/meal-plans/.../meals                  │                        │
      │ { foodId, quantity: 2, unit: "piece" }          │                        │
      ├────────────────────────►│                       │                        │
      │                         │ 2. lb://MEAL-PLANNING │                        │
      │                         ├──────────────────────►│                        │
      │                         │                       │ 3. Feign: getFood(id)  │
      │                         │                       ├───────────────────────►│
      │                         │                       │ 4. Returns FoodDto     │
      │                         │                       │    (serving: 35g/piece)│
      │                         │                       │◄───────────────────────┤
      │                         │                       │ 5. Save Meal (2 piece) │
      │                         │ 6. 201 Created        │                        │
      │◄────────────────────────┴───────────────────────┤                        │
      │                                                                          │
   7. │ GET /api/meal-plans/{userId}/daily-summary                               │
      ├────────────────────────►│                                                │
      │                         │ 8. lb://MEAL-PLANNING                          │
      │                         ├──────────────────────►│                        │
      │                         │                       │ 9. Fetch all meals     │
      │                         │                       │ 10. Distinct Feign get │
      │                         │                       ├───────────────────────►│
      │                         │                       │ 11. Nutrition per 100g │
      │                         │                       │◄───────────────────────┤
      │                         │                       │ 12. Convert 2 pcs=70g  │
      │                         │                       │     Scale macros       │
      │                         │ 13. DailySummaryJSON  │                        │
      │◄────────────────────────┴───────────────────────┤                        │
```

---

### Flow C: Meal Editing with Security Checks
1. User clicks **Edit** on a logged meal in `MealPlanning.tsx`.
2. Frontend sends `PUT http://localhost:8088/api/meal-plans/{planId}/meals/{mealId}` with updated `{ mealType, foodId, quantity, unit }`.
3. **API Gateway** proxies request to `MEAL-PLANNING-SERVICE` with JWT.
4. `MealPlanService`:
   - Extracts authenticated `userId` from security context.
   - Verifies user ownership of `planId` (IDOR check).
   - Validates that `mealId` exists and belongs to `planId`.
   - Validates updated `foodId` with Food Database via OpenFeign.
   - Updates meal entity and persists changes to MongoDB.
5. Returns `200 OK` with updated `MealResponse`.

---

### Flow D: 7-Day History Generation
1. Dashboard mounts and triggers `GET http://localhost:8088/api/meal-plans/{userId}/history`.
2. Gateway routes to `MEAL-PLANNING-SERVICE`.
3. `MealPlanService`:
   - Calculates target date range: `[today - 6 days, today]`.
   - Finds existing meal plans in date range.
   - Collects all unique `foodId`s across the 7 days and loads nutrition data once into an in-memory cache via OpenFeign.
   - Iterates through each date in the 7-day range, calculates daily totals (or inserts 0-value summaries for missed days).
4. Returns array of 7 ordered `DailySummaryResponse` objects rendered directly by Recharts.

---

### Flow E: S3 Food Image Upload & Presigned URL Resolution
1. User selects an image file (e.g., `oatmeal.png`) and clicks **Upload Image** in `Foods.tsx`.
2. Frontend sends a `multipart/form-data` POST request to `http://localhost:8088/api/foods/{foodId}/image` with the Bearer JWT token.
3. **API Gateway** proxies the multipart payload directly to `FOOD-DATABASE-SERVICE`.
4. `FoodImageService`:
   - Checks that the file is not empty and is under 5 MB.
   - Inspects the raw file magic bytes with **Apache Tika** to verify that the binary content is strictly `image/jpeg`, `image/png`, or `image/webp`.
   - Generates an immutable S3 key: `food-images/{foodId}_{uuid}.png`.
   - If the food already had an existing image, calls `s3Client.deleteObject` to clean up the obsolete file in S3.
   - Streams the binary bytes directly to the private S3 bucket `nutrition-tracker-food-images-2026-new` with metadata `contentType`.
   - Updates the MongoDB `Food` document with `imageKey = "food-images/{foodId}_{uuid}.png"`.
   - Generates a **60-minute presigned GET URL** using AWS SDK v2 `S3Presigner`.
5. Returns `200 OK` with the updated `FoodResponse` containing the temporary `imageUrl`.
6. Frontend immediately displays the photo inside the food card without requiring a page refresh.

---

## 8. Docker Containerization, AWS Credentials & Production Deployment

The project provides two tailored deployment configurations:
1. **Local Development:** [`docker-compose.yml`](file:///c:/Riten/Java/nutrition-tracker-msa/docker-compose.yml) (maps all service ports to host, mounts host `${USERPROFILE}/.aws` profile `nutrition-dev`).
2. **Production Single-Host EC2:** [`docker-compose.prod.yml`](file:///c:/Riten/Java/nutrition-tracker-msa/docker-compose.prod.yml) (exposes only Port 80 publicly, leverages EC2 IAM Instance Role, applies container memory limits for 4 GB RAM, and keeps all internal microservices private).

```bash
# Local development workflow:
docker compose up -d

# Production EC2 deployment workflow:
mvn clean package -DskipTests
docker compose -f docker-compose.prod.yml up -d --build
```

### Verified Production Environment:
- **Cloud Provider & Region:** AWS EC2 in `ap-southeast-2` (Asia Pacific - Sydney)
- **Instance Type:** `c7i-flex.large` (2 vCPU, 4.0 GB RAM)
- **Operating System:** Ubuntu 24.04 LTS (`noble`)
- **Container Runtimes:** Docker Engine `29.1.3` + Docker Compose plugin `2.40.3`
- **Official Repository:** [`https://github.com/Riten13/nutrition-tracker-msa.git`](https://github.com/Riten13/nutrition-tracker-msa.git)
- **Deployment Operations Manual:** Full step-by-step setup guide is in [`DEPLOY_EC2.md`](file:///c:/Riten/Java/nutrition-tracker-msa/DEPLOY_EC2.md).

### Key Engineering & Security Optimizations:
1. **Single Public Port (Port 80) & Same-Origin Nginx Reverse Proxy**:
   - In production, **only** the `frontend` container binds port `80:80` to the EC2 host.
   - Nginx serves the compiled React single-page application and transparently reverse-proxies all `/api/*` traffic to `http://api-gateway:8088/api/*` inside the private Docker bridge network (`nutrition-network`).
   - Eliminates CORS issues across all client browsers and keeps Eureka (8761), API Gateway (8088), User Profile (8080), Food DB (3000), Meal Planning (3001), and Grocery Planning (3002) unexposed to the public internet.
   - Configured with `client_max_body_size 10M;` and gzip compression to effortlessly support up to 5 MB S3 image uploads.
2. **EC2 IAM Role Authentication (`NutritionTrackerEC2Role`) & IMDSv2 Hop Limit**:
   - The production container for `food-database-service` has **zero static AWS credentials** and **no mounted credential files**.
   - The AWS SDK v2 `DefaultCredentialsProvider` queries the EC2 Instance Metadata Service (IMDSv2) at `169.254.169.254` to automatically fetch temporary STS credentials for the attached **`NutritionTrackerEC2Role`**.
   - **Crucial IMDSv2 Hop Limit**: Because containers run on a Docker bridge network (1 network hop from the host), the default IMDSv2 hop limit of 1 causes container credential requests to time out. Setting the hop limit to 2 allows containers to reach IMDSv2:
     ```bash
     aws ec2 modify-instance-metadata-options \
       --instance-id <YOUR_EC2_INSTANCE_ID> \
       --http-put-response-hop-limit 2 \
       --http-endpoint enabled \
       --region ap-southeast-2
     ```
3. **Container Resource Limits & JVM Memory Tuning (4 GB RAM Budget)**:
   - To guarantee stability without host OOM-killer crashes on a 4 GB RAM instance, each service in [`docker-compose.prod.yml`](file:///c:/Riten/Java/nutrition-tracker-msa/docker-compose.prod.yml) is allocated strict Docker resource limits and JVM memory flags:
     | Container | JVM Options | Docker `mem_limit` | Docker `mem_reservation` | CPU Limit |
     |:---|:---|:---:|:---:|:---:|
     | `eureka-server` | `-Xms64m -Xmx256m -XX:+UseSerialGC` | 512 MB | 256 MB | 0.50 |
     | `api-gateway` | `-Xms64m -Xmx256m -XX:+UseSerialGC` | 512 MB | 256 MB | 0.75 |
     | `user-profile-service` | `-Xms64m -Xmx256m -XX:+UseSerialGC` | 640 MB | 384 MB | 0.75 |
     | `food-database-service` | `-Xms64m -Xmx256m -XX:+UseSerialGC` | 640 MB | 384 MB | 0.75 |
     | `meal-planning-service` | `-Xms64m -Xmx256m -XX:+UseSerialGC` | 640 MB | 384 MB | 0.75 |
     | `grocery-planning-service` | `-Xms64m -Xmx256m -XX:+UseSerialGC` | 512 MB | 256 MB | 0.50 |
     | `frontend` (Nginx) | N/A (Static + Reverse Proxy) | 128 MB | 64 MB | 0.25 |
   - Total peak container consumption is safely bounded to **~3.5 GB**, leaving ample headroom for the Ubuntu OS kernel and Docker daemon.
4. **Pre-Built Multi-Module JAR Pattern**:
   - Rather than executing 6 independent heavy Maven builds inside Docker, the root aggregator [pom.xml](file:///c:/Riten/Java/nutrition-tracker-msa/pom.xml) compiles all modules on the host (`mvn clean package -DskipTests`) in ~40 seconds.
   - Lightweight Dockerfiles copy pre-compiled JARs into `eclipse-temurin:21-jre-alpine` containers, producing tiny image footprints and rapid startup.
5. **Container Healthcheck Ordering**:
   - Dependent microservices wait for `eureka-server` to become **healthy** (`test: curl -f http://localhost:8761/`) before starting, preventing startup registration race conditions.

---

## 9. Future Roadmap: Integrating AI via OpenRouter

While the current architecture is deterministic and rule-based, the system is primed for **AI integration using OpenRouter**:

### Why OpenRouter?
- OpenRouter provides a single OpenAI-compatible API endpoint (`https://openrouter.ai/api/v1/chat/completions`) offering access to models like **DeepSeek-V3**, **Llama 3.3**, **Claude 3.5 Sonnet**, and **GPT-4o**, including free-tier models.

### Implementation Blueprint:
1. **New Endpoint in Meal Planning Service**:
   `POST /api/meal-plans/generate-ai`
2. **Logic Flow**:
   - Fetch the user's profile, personalized calorie & macro targets, dietary preference (e.g. Vegetarian), and allergies (e.g. Peanuts) from `User-Profile Service`.
   - Query available foods and portion weights from `Food Database Service`.
   - Send a prompt to OpenRouter via an OpenFeign client:
     > *"Given a daily target of 2000 kcal, 130g protein, vegetarian, allergic to peanuts, recommend a 4-meal plan with portion units from these available foods..."*
   - Parse the JSON response and automatically log the meals into the user's plan.
