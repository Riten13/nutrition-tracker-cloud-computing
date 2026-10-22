# 🥗 Nutrition Tracker — Comprehensive Microservices Architecture Guide

> **System Deep-Dive & Service Specification**  
> **Platform Stack:** Java 21 • Spring Boot 3.3.x • Spring Cloud 2023.0.3 (Eureka, Gateway, OpenFeign) • MongoDB NoSQL • React 19 + Vite • Docker Compose

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
   - [Meal Planning Service (Port 3001)](#43-meal-planning-service-nutrition-engine)
   - [Grocery Planning Service (Port 3002)](#44-grocery-planning-service-cost-estimation)
5. [Frontend Client Application (Port 5173)](#5-frontend-client-application)
6. [Database Layer: Unified MongoDB Architecture](#6-database-layer-unified-mongodb-architecture)
7. [End-to-End Request Lifecycles](#7-end-to-end-request-lifecycles)
8. [Docker Containerization & Memory Optimization](#8-docker-containerization--memory-optimization)
9. [Future Roadmap: Integrating AI via OpenRouter](#9-future-roadmap-integrating-ai-via-openrouter)

---

## 1. Architectural Overview & Philosophy

The **Nutrition Tracker Platform** is engineered following modern **Microservices Architecture (MSA)** principles. Instead of a monolithic codebase where all business domains, persistence logic, and web handlers are coupled together, the system is decomposed into **four domain-focused microservices** supported by **two infrastructure services** and a **React single-page application (SPA)**.

### Core Architectural Principles:
1. **Single Responsibility Principle (SRP)**: Each service owns exactly one domain (Identity, Food Master Data, Meal Tracking, Grocery Planning).
2. **Database-per-Service Pattern**: No microservice directly queries the database of another microservice. Data ownership is strict.
3. **Decoupled Inter-Service Communication**: Microservices communicate over HTTP REST using **Spring Cloud OpenFeign** with dynamic instance resolution via **Eureka Service Discovery**.
4. **Data Normalization across Services**: Business services (Meal Planning & Grocery Planning) store only lightweight foreign references (`foodId`) and query the Food Database on demand, avoiding stale data and duplication.
5. **Centralized Entry Point**: The client never communicates directly with backend microservices; all traffic passes through the **Spring Cloud API Gateway**.

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
│ [Spring Sec]  │        │  [Master Data]   │        │ [Live Nutrition] │       │ [Cost Estimation]  │
└───────┬───────┘        └────────▲─────────┘        └────────┬─────────┘       └─────────┬──────────┘
        │                         │                           │                           │
        │                         │  OpenFeign (lb://)        │  OpenFeign (lb://)        │
        │                         ├───────────────────────────┘                           │
        │                         │                                                       │
        │                         └───────────────────────────────────────────────────────┘
        ▼                                                     ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   MongoDB Data Tier                                    │
│                 Collections: users, foods, meal_plans, meals, grocery_lists             │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Infrastructure Layer

### 3.1 Eureka Server (Service Discovery & Registry)
- **Port:** `8761`
- **Application Name:** `EUREKA-SERVER`
- **Main Class:** `EurekaServerApplication.java` (`@EnableEurekaServer`)
- **Role & How it Works:**
  - Acts as the central telephone directory for the entire ecosystem.
  - When any microservice boots up, it broadcasts its hostname, IP, and assigned port to Eureka (Registration).
  - Every 30 seconds, microservices send a heartbeat to Eureka. If heartbeats stop, Eureka marks the instance down.
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

### 4.1 User Profile Service (Auth & Identity)
- **Port:** `8080`
- **Database:** MongoDB (`user_profile_db` / `users` collection)
- **Primary Package:** `com.example.userprofile`

#### What It Does:
Manages customer accounts, authentication, personal biometric metrics (age, gender, height, weight), dietary preferences (vegan, keto, dairy-free), and known allergens (peanuts, gluten, etc.).

#### How It Works (Internal Mechanics):
1. **Security & Cryptography**:
   - Uses **Spring Security 6** with custom `SecurityConfig`.
   - Passwords are encrypted using **BCrypt** hashing (`BCryptPasswordEncoder`) before storing in the database.
   - On successful login, `JwtUtils` generates an HMAC-SHA256 signed JSON Web Token (JWT) containing the user's email and claims with an expiration period (typically 24 hours).
2. **Stateless Request Authentication**:
   - Protected endpoints require `Authorization: Bearer <token>`.
   - `JwtAuthenticationFilter` intercepts incoming requests, extracts the JWT, validates its digital signature, loads `UserDetailsServiceImpl`, and populates the `SecurityContextHolder`.
3. **Sequence-Generated Long IDs**:
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
  ]
}
```

#### Key API Endpoints:
| Method | Endpoint | Description | Auth Required |
|:---|:---|:---|:---:|
| `POST` | `/api/users/register` | Create account & default profile | No |
| `POST` | `/api/users/login` | Authenticate email/password & receive JWT | No |
| `GET` | `/api/users/{userId}` | Fetch user profile, preferences & allergies | Yes |
| `PUT` | `/api/users/{userId}` | Update physical profile metrics | Yes |
| `POST` | `/api/users/{userId}/allergies` | Add an allergy record | Yes |
| `DELETE` | `/api/users/{userId}/allergies/{id}` | Delete an allergy record | Yes |
| `PUT` | `/api/users/{userId}/preferences` | Update dietary preference flags | Yes |

---

### 4.2 Food Database Service (Master Data)
- **Port:** `3000`
- **Database:** MongoDB (`food_database` / `foods` collection)
- **Primary Package:** `com.example.fooddatabase`

#### What It Does:
Acts as the **single source of truth** for food items and nutritional values. Other microservices never store calorie or macronutrient figures; they look up data from this service.

#### How It Works (Internal Mechanics):
1. **Normalized Nutrition Metrics**:
   - Every food document embeds a `Nutrition` sub-document standardized **per 100 grams / 100 mL**.
   - Fields include: `calories` (kcal), `protein` (g), `carbohydrates` (g), `fat` (g), `fiber` (g), `sugar` (g), and `sodium` (mg).
2. **Search & Filter Pipeline**:
   - `FoodRepository` exposes Spring Data MongoDB methods with Regex matching (`findByCategoryIgnoreCase`, `findByNameContainingIgnoreCase`) allowing partial and case-insensitive lookups from the UI search bar.
3. **Lightweight Nutrition Query**:
   - Exposes `/api/foods/{foodId}/nutrition` which extracts only the nutritional payload, optimizing payload size for inter-service Feign calls.

#### Data Model (`Food.java`):
```json
{
  "_id": "67b5e4f201a9b",
  "name": "Rolled Oats",
  "category": "Grains",
  "description": "Whole grain steel cut oats",
  "nutrition": {
    "calories": 389.0,
    "protein": 16.9,
    "carbohydrates": 66.3,
    "fat": 6.9,
    "fiber": 10.6,
    "sugar": 0.0,
    "sodium": 2.0
  }
}
```

#### Key API Endpoints:
| Method | Endpoint | Description |
|:---|:---|:---|
| `GET` | `/api/foods` | List all foods (supports `?name=` and `?category=`) |
| `GET` | `/api/foods/{foodId}` | Fetch single food item with full nutrition |
| `GET` | `/api/foods/{foodId}/nutrition` | Inter-service endpoint returning only nutrition |
| `POST` | `/api/foods` | Add a new food item to the catalog |
| `PUT` | `/api/foods/{foodId}` | Update an existing food item |
| `DELETE` | `/api/foods/{foodId}` | Remove a food item from the catalog |

---

### 4.3 Meal Planning Service (Nutrition Engine)
- **Port:** `3001`
- **Database:** MongoDB (`food_database` or dedicated DB / `meal_plans`, `meals` collections)
- **Primary Package:** `com.example.mealplanning`

#### What It Does:
Enables users to build daily meal schedules (Breakfast, Lunch, Dinner, Snack), log portions consumed, and **dynamically calculate total daily calories and macronutrients**.

#### How It Works (Internal Mechanics):
1. **Zero Data Duplication Principle**:
   - When a user logs "250g of Rolled Oats", the `Meal` record stores:
     `{ "mealPlanId": "...", "foodId": "67b5e4f201a9b", "mealType": "BREAKFAST", "quantity": 250.0 }`.
   - It **does not** store the calories, carbs, or protein in MongoDB.
2. **Validation via OpenFeign**:
   - Before saving a meal, `FoodServiceClient` makes a synchronous Feign call to `http://food-database-service:3000/api/foods/{foodId}`.
   - If the food does not exist or the service is down, it halts the operation with an informative error.
3. **Dynamic Nutrition Synthesis Engine (`getDailySummary`)**:
   - When the client requests the daily summary:
     $$\text{Nutrient Total} = \sum_{i=1}^{N} \left( \text{Nutrient per 100g} \times \frac{\text{Meal Quantity}_i}{100.0} \right)$$
   - Queries all meals for that plan date.
   - For each meal, fetches the up-to-date food nutrition from `Food Database Service`.
   - Aggregates total calories, protein, carbs, and fat, rounds to 2 decimal places, and returns the response in real time.

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
  "quantity": 200.0
}
```

#### Key API Endpoints:
| Method | Endpoint | Description |
|:---|:---|:---|
| `POST` | `/api/meal-plans` | Initialize a daily meal plan for a user |
| `GET` | `/api/meal-plans/{userId}` | Get user's meal plan with all nested meals |
| `POST` | `/api/meal-plans/{planId}/meals` | Log a food item into a meal plan (calls Food DB) |
| `GET` | `/api/meal-plans/{planId}/meals` | Retrieve all logged meals for a plan |
| `DELETE` | `/api/meal-plans/{planId}/meals/{mealId}` | Remove a meal entry |
| `GET` | `/api/meal-plans/{userId}/daily-summary` | Compute & return live daily calorie/macro totals |

---

### 4.4 Grocery Planning Service (Cost Estimation)
- **Port:** `3002`
- **Database:** MongoDB (`grocery_planning_db` / `grocery_lists`, `grocery_items` collections)
- **Primary Package:** `com.example.groceryplanningservice`

#### What It Does:
Allows users to maintain active grocery shopping lists, tick off purchased items, track desired quantities/units, and **compute real-time estimated grocery bills**.

#### How It Works (Internal Mechanics):
1. **Catalog Integrity**:
   - Like Meal Planning, `GroceryItem` stores only the `foodId`, `quantity`, `unit` (e.g., `KG`, `GRAMS`, `PCS`), `checked` status (`boolean`), and `estimatedPrice` (`BigDecimal`).
   - Adding an item validates the item against the `Food Database Service` via OpenFeign.
2. **High-Precision Financial Arithmetic (`getEstimatedCost`)**:
   - Uses `java.math.BigDecimal` to eliminate floating-point precision errors when calculating financial totals:
     $$\text{Estimated Cost} = \sum \left( \text{estimatedPrice} \times \text{quantity} \right)$$
   - Safely ignores items with null prices.

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
| Method | Endpoint | Description |
|:---|:---|:---|
| `POST` | `/api/grocery-lists` | Create a new active grocery list for a user |
| `GET` | `/api/grocery-lists/{userId}` | Fetch user's active grocery list and all items |
| `POST` | `/api/grocery-lists/{listId}/items` | Add grocery item to list (calls Food DB) |
| `PUT` | `/api/grocery-lists/{listId}/items/{itemId}` | Partial update (toggle checked, edit quantity/price) |
| `DELETE` | `/api/grocery-lists/{listId}/items/{itemId}` | Remove grocery item from list |
| `GET` | `/api/grocery-lists/{listId}/estimated-cost` | Calculate total estimated cost of all items |

---

## 5. Frontend Client Application

- **Port:** `5173` (Served through Nginx in Docker)
- **Location:** `c:\Riten\Java\nutrition-tracker-msa\frontend`
- **Tech Stack:** React 19, Vite, TypeScript, Tailwind CSS, Lucide Icons, Axios

### Architecture & Key Modules:
- **Routing & Views:**
  - `Dashboard.tsx`: High-level analytics, daily calorie breakdown, macro progress rings, quick links.
  - `Foods.tsx`: Live searchable food catalog with category filters and nutritional inspection drawers.
  - `MealPlanning.tsx`: Visual timeline for Breakfast, Lunch, Dinner, and Snacks with live macro calculators.
  - `GroceryPlanning.tsx`: Interactive grocery checklist with cost summaries and instant item check-off.
  - `Profile.tsx`: User profile management, biometric metrics, and allergy toggles.
  - `Login.tsx` / `Register.tsx`: Authentication screens.
- **API Service Layer (`/src/services`)**:
  - Centralized Axios client (`api.ts`) configured with `VITE_API_BASE_URL=http://localhost:8088`.
  - Automatically attaches `Authorization: Bearer <token>` from `localStorage` on every outbound request via Axios interceptors.
  - Gracefully redirects to `/login` upon receiving `401 Unauthorized` responses.

---

## 6. Database Layer: Unified MongoDB Architecture

Initially, parts of the project used MySQL while others used MongoDB. The system has now been **unified onto a pure MongoDB architecture**:

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
1. **Document Flexibility**: Nutrition data has varied micronutrients, and user profiles have variable allergies and preferences. Document embedding eliminates complicated SQL multi-table joins.
2. **High Read Performance**: Nutrition lookups and meal queries are retrieved in a single BSON document fetch.
3. **Environment Portability**: Supports transparent switching between **MongoDB Atlas (cloud)** and **local containerized MongoDB** using standard connection strings in `.env`:
   ```bash
   SPRING_DATA_MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.ioo4yf3.mongodb.net/<dbName>
   ```

---

## 7. End-to-End Request Lifecycles

### Flow A: User Logs In
1. User enters email and password on React Frontend (`http://localhost:5173/login`).
2. Frontend sends `POST http://localhost:8088/api/users/login`.
3. **API Gateway** intercepts request, matches predicate `Path=/api/users/**`, consults **Eureka** for `USER-PROFILE-SERVICE`, and forwards request.
4. **User Profile Service** verifies email, checks password hash with `BCryptPasswordEncoder.matches()`, generates a signed JWT, and returns `AuthResponse` containing token + profile.
5. React saves JWT in `localStorage` and redirects user to `/dashboard`.

---

### Flow B: User Adds a Meal and Views Daily Summary
```
[User Browser]           [API Gateway]           [Meal Planning]          [Food Database]
      │                         │                       │                        │
   1. │ POST /api/meal-plans/.../meals                  │                        │
      ├────────────────────────►│                       │                        │
      │                         │ 2. lb://MEAL-PLANNING │                        │
      │                         ├──────────────────────►│                        │
      │                         │                       │ 3. Feign: getFood(id)  │
      │                         │                       ├───────────────────────►│
      │                         │                       │ 4. Food verified       │
      │                         │                       │◄───────────────────────┤
      │                         │                       │ 5. Save Meal (foodId)  │
      │                         │ 6. 201 Created        │                        │
      │◄────────────────────────┴───────────────────────┤                        │
      │                                                                          │
   7. │ GET /api/meal-plans/{userId}/daily-summary                               │
      ├────────────────────────►│                                                │
      │                         │ 8. lb://MEAL-PLANNING                          │
      │                         ├──────────────────────►│                        │
      │                         │                       │ 9. Fetch all meals     │
      │                         │                       │ 10. Loop Feign queries │
      │                         │                       ├───────────────────────►│
      │                         │                       │ 11. Nutrition per 100g │
      │                         │                       │◄───────────────────────┤
      │                         │                       │ 12. Scale by quantity  │
      │                         │ 13. DailySummaryJSON  │                        │
      │◄────────────────────────┴───────────────────────┤                        │
```

---

## 8. Docker Containerization & Memory Optimization

The entire ecosystem runs with a single command:
```bash
docker compose up -d
```

### Key Engineering Optimizations:
1. **Pre-Built Multi-Module JAR Pattern**:
   - Rather than executing 6 independent heavy Maven builds inside Docker (which triggered concurrency lockouts and OOM crashes), the root aggregator [pom.xml](file:///c:/Riten/Java/nutrition-tracker-msa/pom.xml) compiles all modules on the host in ~40 seconds.
   - Lightweight Dockerfiles copy pre-compiled JARs into `eclipse-temurin:21-jre-alpine` containers, producing tiny image footprints and instant startup.
2. **JVM Memory Tuning for Low-RAM Machines**:
   - To comfortably run 8 full containers on systems with limited RAM, each JVM is tuned with serial garbage collection and explicit heap caps:
     ```yaml
     JAVA_TOOL_OPTIONS: "-XX:+UseSerialGC -Xss256k -XX:MaxMetaspaceSize=128m -Xms64m -Xmx256m"
     ```
   - Total memory footprint for all 5 Spring Boot services combined is under **1.2 GB**!
3. **Container Healthcheck Ordering**:
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
   - Fetch the user's profile, dietary preference (e.g. Vegetarian), and allergies (e.g. Peanuts) from `User-Profile Service`.
   - Query available foods from `Food Database Service`.
   - Send a prompt to OpenRouter via an OpenFeign client:
     > *"Given a target of 2200 kcal, vegetarian, allergic to peanuts, recommend a 3-meal plan from these available foods..."*
   - Parse the JSON response and automatically log the meals into the user's plan.
