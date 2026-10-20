# 🥗 Nutrition Tracker — Frontend (React + TypeScript + Vite)

> **Client Application** for the Nutrition Tracker Microservices Architecture (MSA) Platform  
> Built with **React 19**, **TypeScript**, **Vite**, **Tailwind CSS**, and **shadcn/ui** design system principles.

---

## 🏛️ Architecture & Gateway Routing Rule

The React frontend communicates **exclusively with the Spring Cloud API Gateway on port `8088`**.

```
React Frontend (Port 5173) ──► Spring Cloud API Gateway (Port 8088) ──► Eureka Service Discovery (Port 8761)
                                                                       ├──► User Profile Service (8080)
                                                                       ├──► Food Database Service (3000)
                                                                       ├──► Meal Planning Service (3001)
                                                                       └──► Grocery Planning Service (3002)
```

- **Single Allowed Base URL:** `http://localhost:8088`
- **Environment Variable:** `VITE_API_BASE_URL=http://localhost:8088`
- The frontend **never** sends direct requests to ports `8761`, `8080`, `3000`, `3001`, or `3002`.

---

## 🛠️ Mandatory Technology Stack

| Technology | Purpose |
|------------|---------|
| **React 19** + **TypeScript** | Type-safe component architecture |
| **Vite** | Modern, ultra-fast build tool and dev server |
| **Tailwind CSS** | Custom design tokens: forest green accents, warm off-white surfaces |
| **shadcn/ui Principles** | Reusable UI primitives (`Button`, `Input`, `Card`, `Badge`, `Modal`, `Alert`) |
| **React Router DOM v7** | Client-side routing, protected routes, and active page highlighting |
| **Axios** | Centralized HTTP client (`src/services/api.ts`) with JWT interceptors |
| **Recharts** | Interactive macronutrient breakdown and progress visualizations |
| **Lucide React** | Clean, accessible vector icons (no emojis used) |
| **Context API** | `AuthContext` (JWT session & Gateway status) and `ThemeContext` (Light/Dark mode) |

---

## 📁 Project Directory Structure

```text
frontend/
├── public/
│   └── favicon.svg           # Custom leaf & nutrient SVG favicon
├── src/
│   ├── assets/               # Static assets
│   ├── components/
│   │   ├── ui/               # Reusable UI primitives
│   │   │   ├── Button.tsx    # Standard rectangular rounded buttons (no pill buttons)
│   │   │   ├── Input.tsx     # Validated text, number, and password fields
│   │   │   ├── Card.tsx      # Restrained cards with subtle borders
│   │   │   ├── Badge.tsx     # Color-coded status and category badges
│   │   │   ├── Modal.tsx     # Accessible modal dialog with backdrop
│   │   │   └── Alert.tsx     # Feedback notifications
│   │   └── ...
│   ├── context/
│   │   ├── AuthContext.tsx   # JWT storage, Gateway status check, Demo Mode fallback
│   │   └── ThemeContext.tsx  # Light and Dark theme persistence
│   ├── layouts/
│   │   └── DashboardLayout.tsx # Reusable layout with collapsible sidebar, top header, status badge
│   ├── pages/
│   │   ├── Login.tsx         # JWT authentication & Gateway connection
│   │   ├── Register.tsx      # Full registration with physical biometrics & allergies
│   │   ├── Dashboard.tsx     # Daily nutrition summary & Recharts macro visualization
│   │   ├── Foods.tsx         # Food database discovery, search, filters & CRUD
│   │   ├── MealPlanning.tsx  # Daily meal planner with Breakfast, Lunch, Dinner, Snack cards
│   │   ├── GroceryPlanning.tsx # Grocery checklist, shopping progress & cost estimation
│   │   ├── Profile.tsx       # User biometrics (BMI), dietary preferences & allergies
│   │   ├── Settings.tsx      # Gateway connectivity test & microservice topology
│   │   ├── PrivacyPolicy.tsx # Complete privacy and data protection documentation
│   │   └── TermsConditions.tsx # Terms of use and nutritional disclaimers
│   ├── services/
│   │   ├── api.ts            # Centralized Axios client (Port 8088 baseURL + JWT interceptors)
│   │   ├── authService.ts    # POST /api/users/login, POST /api/users/register
│   │   ├── userService.ts    # User biometrics, allergies, and dietary preferences
│   │   ├── foodService.ts    # Master food catalog and nutrition data
│   │   ├── mealService.ts    # Meal plans, logged meals, and daily nutrition summaries
│   │   ├── groceryService.ts # Grocery lists, items, and estimated costs
│   │   └── mockData.ts       # Structured fallback data matching backend DTOs
│   ├── types/
│   │   └── index.ts          # TypeScript interfaces matching Java Spring Boot DTOs
│   ├── utils/
│   │   └── cn.ts             # Tailwind class merging utility
│   ├── App.tsx               # Main application router with protected routes
│   ├── index.css             # Design tokens (warm off-white, forest green, lime highlights)
│   ├── main.tsx              # React DOM entry point
│   └── vite-env.d.ts         # Vite client type definitions
├── .env                      # VITE_API_BASE_URL=http://localhost:8088
├── .env.example              # Example environment template
├── package.json              # Project dependencies & build scripts
├── tsconfig.app.json         # TypeScript configuration with @ alias
└── vite.config.ts            # Vite bundler configuration
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v18+ (tested on Node.js v26.x)
- **npm**: v9+ (tested on npm v12.x)

### 2. Environment Setup
The `.env` file is preconfigured with the API Gateway endpoint:
```env
VITE_API_BASE_URL=http://localhost:8088
```

### 3. Installation
Navigate into the `frontend` directory and install dependencies:
```bash
cd frontend
npm install
```

### 4. Running the Development Server
```bash
npm run dev
```
Open **`http://localhost:5173`** in your browser.

### 5. Production Build Verification
To compile TypeScript and create an optimized production bundle:
```bash
npm run build
```
Bundle output is generated in `frontend/dist/`.

---

## 🔗 Integrated Backend Endpoints

All endpoints route strictly through the Spring Cloud Gateway (`http://localhost:8088`):

### 1. User Profile Service (`/api/users/**`)
- `POST /api/users/register`: Register new user with biometrics, dietary flags, and allergies.
- `POST /api/users/login`: Authenticate email and password, receives JWT token and user profile.
- `GET /api/users/{userId}`: Fetch complete profile.
- `PUT /api/users/{userId}`: Update physical profile (age, weight, height, activity level).
- `PUT /api/users/{userId}/preferences`: Update dietary flags (vegan, vegetarian, keto, etc.).
- `GET /api/users/{userId}/allergies`: Fetch user allergy list.
- `POST /api/users/{userId}/allergies`: Add an allergy tag.
- `DELETE /api/users/{userId}/allergies/{allergyId}`: Remove an allergy tag.

### 2. Food Database Service (`/api/foods/**`)
- `GET /api/foods`: Retrieve master food list (supports `?name=...` and `?category=...`).
- `GET /api/foods/{foodId}`: Fetch single food item with nutrition.
- `POST /api/foods`: Create new master food item.
- `PUT /api/foods/{foodId}`: Update existing food item.
- `DELETE /api/foods/{foodId}`: Remove food item.
- `GET /api/foods/{foodId}/nutrition`: Retrieve nutrition details per serving.

### 3. Meal Planning Service (`/api/meal-plans/**`)
- `POST /api/meal-plans`: Create meal plan for a specific date (`{ userId, planDate }`).
- `GET /api/meal-plans/{userId}`: Fetch active meal plan and associated meal records.
- `POST /api/meal-plans/{planId}/meals`: Add food portion to a meal (`{ foodId, mealType, quantity }`).
- `GET /api/meal-plans/{planId}/meals`: Retrieve meals in a plan.
- `DELETE /api/meal-plans/{planId}/meals/{mealId}`: Remove a meal item.
- `GET /api/meal-plans/{userId}/daily-summary`: Returns live aggregated nutrition totals computed by Feign calls to the Food Database Service.

### 4. Grocery Planning Service (`/api/grocery-lists/**`)
- `POST /api/grocery-lists`: Create new active grocery list for user.
- `GET /api/grocery-lists/{userId}`: Fetch user active grocery list and items.
- `POST /api/grocery-lists/{listId}/items`: Add item to grocery list (`{ foodId, quantity, unit, estimatedPrice }`).
- `PUT /api/grocery-lists/{listId}/items/{itemId}`: Update item quantity, unit, checked status, or price.
- `DELETE /api/grocery-lists/{listId}/items/{itemId}`: Remove item from grocery list.
- `GET /api/grocery-lists/{listId}/estimated-cost`: Calculate total estimated basket cost (`Σ price × quantity`).

---

## 🎨 Design System & Aesthetics Guidelines Adherence

- **Palette**: Warm off-white backgrounds (`#fbfbf9`), dark forest-green primary accents (`#1b3b2b`), and soft lime-green highlights (`#84cc16`).
- **Cards**: Crisp white surfaces with subtle stone borders (`border-stone-200/90`) and restrained shadows.
- **Buttons**: Standard rounded rectangles (`rounded-lg`). **No pill-shaped buttons**.
- **No Purple Gradients**: Pure, authentic natural tones fitting a health & nutrition platform.
- **Icons**: 100% vector SVG icons from `lucide-react` (no emoji icons).
- **Typography**: Inter font via Google Fonts with clear hierarchy.
- **Legal Compliance**: Full **Privacy Policy** and **Terms and Conditions** pages implemented.
- **Clean Head**: Custom SVG favicon (`favicon.svg`) included; zero AI tags or generic placeholders.
- **Offline Resilience**: Seamless fallback to isolated Demo Mode when Gateway is offline, with a one-click live Gateway ping and status indicator in the navigation header.
