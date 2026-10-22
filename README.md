# 🥗 Nutrition Tracker — Microservices Architecture (MSA)

> **Phase 2 Project** | Microservices Architecture | Java 21 + Spring Boot 3 + Spring Cloud

A complete **Nutrition Tracking Platform** built as a suite of independently deployable microservices with **Spring Cloud Netflix Eureka Service Discovery** and **Spring Cloud API Gateway**. Each service is self-contained with its own database, REST API, Swagger documentation, and Eureka client integration.

---

## 📦 Microservices Overview

| # | Service | Port | Application Name | Database | Communication |
|---|---------|------|------------------|----------|---------------|
| 1 | [Eureka Server](./Eureka-Server/) | `8761` | `EUREKA-SERVER` | — | Service Discovery Registry |
| 2 | [API Gateway](./API-Gateway/) | `8088` | `API-GATEWAY` | — | Spring Cloud Gateway (Eureka Client, CORS, Unified Swagger) |
| 3 | [User Profile Service](./User-Profile/) | `8080` | `USER-PROFILE-SERVICE` | MongoDB Atlas | JWT Auth (Eureka Client) |
| 4 | [Food Database Service](./Food-Database/) | `3000` | `FOOD-DATABASE-SERVICE` | MongoDB Atlas | Master Data (Eureka Client) |
| 5 | [Meal Planning Service](./Meal-Planning/) | `3001` | `MEAL-PLANNING-SERVICE` | MongoDB Atlas | OpenFeign → Food DB via Eureka |
| 6 | [Grocery Planning Service](./Grocery-Planning/) | `3002` | `GROCERY-PLANNING-SERVICE` | MongoDB Atlas | OpenFeign → Food DB via Eureka |

---

## 🏗️ Architecture Diagram

```
                              Client (Web / Mobile / Postman)
                                            │
                                            ▼
                        ┌───────────────────────────────────────┐
                        │      API Gateway (Port 8088)          │
                        │      • Central Entry Point            │
                        │      • JWT Header Forwarding          │
                        │      • Unified Swagger UI             │
                        │      • CORS Enabled                   │
                        └───────────────────┬───────────────────┘
                                            │
                                            │ Resolves instances via lb://
                                            ▼
                                ┌───────────────────────┐
                                │     Eureka Server     │
                                │      (Port 8761)      │
                                │  (Service Discovery)  │
                                └───────────┬───────────┘
                                            │
               ┌────────────────────────────┼───────────────────────────┐
               │                            │                           │
               ▼                            ▼                           ▼
    ┌─────────────────────┐      ┌─────────────────────┐     ┌─────────────────────┐
    │ User Profile Service│      │Food Database Service│     │Meal Planning Service│
    │     (Port 8080)     │      │     (Port 3000)     │     │     (Port 3001)     │
    │      [MongoDB]      │      │      [MongoDB]      │     │      [MongoDB]      │
    └─────────────────────┘      └──────────▲──────────┘     └──────────▲──────────┘
                                            │ Feign (Eureka)            │
                                            ├───────────────────────────┘
                                            │ Feign (Eureka)
                                 ┌──────────┴──────────┐
                                 │  Grocery Planning   │
                                 │     (Port 3002)     │
                                 │      [MongoDB]      │
                                 └─────────────────────┘
```

---

## 🛠️ Technology Stack

| Technology | Purpose |
|------------|---------|
| Java 21 | Core language |
| Spring Boot 3.3.x | Microservice framework |
| Spring Cloud 2023.0.3 | Cloud ecosystem release train |
| Spring Cloud Netflix Eureka | Service Discovery Registry & Client |
| Spring Cloud Gateway | Reactive API Gateway (reverse proxy, routing, CORS) |
| Spring Cloud LoadBalancer | Client-side load balancing for Gateway (`lb://`) & OpenFeign |
| Spring Cloud OpenFeign | Inter-service REST communication using Eureka service discovery |
| Spring Data MongoDB | Unified NoSQL data access for User, Food, Meal & Grocery services |
| Spring Security + JWT (JJWT 0.12.6) | Authentication & Authorization |
| Springdoc OpenAPI 3 (Swagger UI) | Interactive API documentation (Direct & Aggregated) |
| MongoDB Atlas | Cloud NoSQL database across all 4 microservices |
| Lombok | Boilerplate reduction |
| Maven | Build & dependency management |

---

## 🌐 API Gateway Routes

All client requests should be routed through the API Gateway on port **`8088`**:

| Client Request Path | Backend Route | Destination Service | Features |
|---------------------|---------------|---------------------|----------|
| `/api/users/**` | Direct | `lb://USER-PROFILE-SERVICE` | Forwards `Authorization: Bearer <token>` |
| `/api/foods/**` | Direct | `lb://FOOD-DATABASE-SERVICE` | Food & nutrition master data |
| `/api/meal-plans/**` | Direct | `lb://MEAL-PLANNING-SERVICE` | Meal plans & daily summary |
| `/api/meals/**` | Path Rewrite → `/api/meal-plans/**` | `lb://MEAL-PLANNING-SERVICE` | Alias route support |
| `/api/grocery-lists/**` | Direct | `lb://GROCERY-PLANNING-SERVICE` | Grocery lists & items |
| `/api/grocery/**` | Path Rewrite → `/api/grocery-lists/**` | `lb://GROCERY-PLANNING-SERVICE` | Alias route support |
| `/swagger-ui.html` | Aggregator | API Gateway | Dropdown to view Swagger for all 4 microservices |
| `/v3/api-docs/**` | Aggregator routes | All 4 Microservices | Dynamic OpenAPI spec aggregation |

---

## 🐳 Running with Docker Compose (Recommended)

Run the entire microservice stack (Eureka, Gateway, 4 Microservices, MySQL, MongoDB, and React Frontend) with a single command!

### 1. Configure Environment (Optional)
A default `.env` file is pre-configured with ready-to-run settings (MongoDB Atlas URI, MySQL credentials, and Gateway routing). You can customize it or review options in [`.env.example`](./.env.example):
```bash
cp .env.example .env
```

### 2. Build and Start All Containers
```bash
docker compose up --build
```
> Or run in detached (background) mode:
> ```bash
> docker compose up -d
> ```

### 3. Check Container Health & Status
```bash
docker compose ps
```

To view live logs from any service:
```bash
docker compose logs -f [service-name]
# Example: docker compose logs -f api-gateway
```

### 4. Stop All Services
```bash
docker compose down
```
> To also wipe persistent database volumes (reset MySQL and local MongoDB):
> ```bash
> docker compose down -v
> ```

### 🌐 Container Access Points

| Service | URL / Host Port | Description |
|---------|-----------------|-------------|
| **Frontend Web Client** | [http://localhost:5173](http://localhost:5173) | React 19 + Vite + Tailwind dashboard |
| **API Gateway** | [http://localhost:8088](http://localhost:8088) | Central reverse proxy & routing |
| **Unified Swagger UI** | [http://localhost:8088/swagger-ui.html](http://localhost:8088/swagger-ui.html) | Aggregated OpenAPI docs for all microservices |
| **Eureka Dashboard** | [http://localhost:8761](http://localhost:8761) | Netflix Eureka service discovery console |
| **User Profile Service** | [http://localhost:8080](http://localhost:8080) | Auth & User Profile microservice (MongoDB) |
| **Food Database Service** | [http://localhost:3000](http://localhost:3000) | Food & Nutrition master data (MongoDB) |
| **Meal Planning Service** | [http://localhost:3001](http://localhost:3001) | Meal plans & daily nutrition (MongoDB) |
| **Grocery Planning Service** | [http://localhost:3002](http://localhost:3002) | Grocery lists & cost estimation (MongoDB) |
| **MongoDB (Optional Local)** | `localhost:27017` | Local containerized MongoDB instance |

---

## 🚀 Running All Services Locally (Without Docker)

### Prerequisites

| Requirement | Notes |
|-------------|-------|
| Java 21 | `java -version` should show 21 |
| Maven 3.9+ | `mvn -version` |
| MongoDB | Atlas URI configured in each service's `application.yml` (or local Mongo) |

### Start Order

> ⚠️ **Important:** Start the **Eureka Server** first so all subsequent services can register, followed by the **API Gateway** and the business microservices.

```bash
# 1. Eureka Server (Port 8761)
cd Eureka-Server
mvn spring-boot:run

# 2. API Gateway (Port 8088)
cd API-Gateway
mvn spring-boot:run

# 3. User Profile Service (Port 8080)
cd User-Profile
mvn spring-boot:run

# 4. Food Database Service (Port 3000)
cd Food-Database
mvn spring-boot:run

# 5. Meal Planning Service (Port 3001)
cd Meal-Planning
mvn spring-boot:run

# 6. Grocery Planning Service (Port 3002)
cd Grocery-Planning
mvn spring-boot:run

# 7. Frontend Client (Port 5173)
cd frontend
npm run dev
```

---

## 📊 Eureka Service Discovery Dashboard

Once the services are running, open the Eureka Dashboard in your browser:

👉 **http://localhost:8761**

The dashboard will list all 5 registered client applications:
* `API-GATEWAY`
* `USER-PROFILE-SERVICE`
* `FOOD-DATABASE-SERVICE`
* `MEAL-PLANNING-SERVICE`
* `GROCERY-PLANNING-SERVICE`

---

## 📖 Swagger UI — Quick Access

### Unified Swagger UI (via API Gateway)
Explore all microservice APIs from a single consolidated interface:
👉 **http://localhost:8088/swagger-ui.html** (Select service from the top-right dropdown)

### Direct Swagger UIs (Individual Services)
| Service | Swagger UI |
|---------|-----------|
| User Profile | http://localhost:8080/swagger-ui.html |
| Food Database | http://localhost:3000/swagger-ui/index.html |
| Meal Planning | http://localhost:3001/swagger-ui.html |
| Grocery Planning | http://localhost:3002/swagger-ui.html |

---

## 📂 Repository Structure

```
MSA/
├── Eureka-Server/       ← Netflix Eureka Service Discovery (Port 8761)
│   ├── src/
│   └── pom.xml
├── API-Gateway/         ← Spring Cloud Gateway + Eureka Client + CORS (Port 8088)
│   ├── src/
│   └── pom.xml
├── User-Profile/        ← Microservice 1: Auth + User Profile (MySQL + JWT, Port 8080)
│   ├── src/
│   ├── pom.xml
│   └── README.md
├── Food-Database/       ← Microservice 2: Food & Nutrition Master Data (MongoDB, Port 3000)
│   ├── src/
│   ├── pom.xml
│   └── README.md
├── Meal-Planning/       ← Microservice 3: Meal Plans + Daily Nutrition (MongoDB + Feign, Port 3001)
│   ├── src/
│   ├── pom.xml
│   └── README.md
├── Grocery-Planning/    ← Microservice 4: Grocery Lists + Cost Estimation (MongoDB + Feign, Port 3002)
│   ├── src/
│   ├── pom.xml
│   └── README.md
├── frontend/            ← React 18 + Vite + TypeScript Web Client (Port 5173)
│   ├── src/
│   ├── package.json
│   └── README.md
└── README.md            ← Root Documentation
```

---

## 🔗 Inter-Service Communication

This project utilizes two complementary communication paradigms:

1. **North-South Traffic (Clients → Gateway → Services)**:
   - External clients communicate strictly via the **API Gateway** on port `8088`.
   - The Gateway queries Eureka to dynamically route requests using `lb://<SERVICE-NAME>`.
   - `Authorization: Bearer <token>` is seamlessly preserved and forwarded to downstream services.

2. **East-West Traffic (Service-to-Service via OpenFeign & Eureka)**:
   - **Meal Planning** → calls **Food Database** via `@FeignClient(name = "food-database-service")` (direct discovery via Eureka, bypassing the gateway).
   - **Grocery Planning** → calls **Food Database** via `@FeignClient(name = "food-database-service")` (direct discovery via Eureka).
   - Neither service uses hardcoded URLs, enabling resilient client-side load balancing.

---

## 👤 Author

**Riten** | **Sanika** | **Tamanna** | SEM 3 MSA Project

---

## 📄 License

This project is submitted as part of academic coursework. All rights reserved.
