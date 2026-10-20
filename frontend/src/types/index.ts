// ============================================================================
// User Profile & Authentication Types
// Matches com.example.userprofile.dto.* and entities
// ============================================================================

export interface ProfileDto {
  age?: number;
  weight?: number; // in kilograms
  height?: number; // in centimeters
  activityLevel?: string;
}

export interface DietaryPreferenceDto {
  vegan?: boolean;
  vegetarian?: boolean;
  keto?: boolean;
  glutenFree?: boolean;
  dairyFree?: boolean;
}

export interface AllergyDto {
  id?: number;
  name: string;
}

export interface UserProfileResponse {
  id: number;
  name: string;
  email: string;
  profile?: ProfileDto;
  allergies?: AllergyDto[];
  dietaryPreference?: DietaryPreferenceDto;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  age?: number;
  weight?: number;
  height?: number;
  activityLevel?: string;
  vegan?: boolean;
  vegetarian?: boolean;
  keto?: boolean;
  glutenFree?: boolean;
  dairyFree?: boolean;
  allergies?: string[];
}

export interface AuthResponse {
  token: string;
  type: string;
  user: UserProfileResponse;
}

// ============================================================================
// Food Database Types
// Matches com.example.fooddatabase.dto.*
// ============================================================================

export interface NutritionDto {
  servingSize: number;
  servingUnit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
}

export interface FoodResponse {
  id: string;
  name: string;
  category: string;
  description?: string;
  nutrition: NutritionDto;
}

export interface FoodRequest {
  name: string;
  category: string;
  description?: string;
  nutrition: NutritionDto;
}

// ============================================================================
// Meal Planning Types
// Matches com.example.mealplanning.dto.* and MealType enum
// ============================================================================

export type MealType = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';

export interface MealPlanRequest {
  userId: number;
  planDate: string; // ISO date format YYYY-MM-DD
}

export interface MealRequest {
  foodId: string;
  mealType: MealType;
  quantity: number; // in grams (nutrition is scaled relative to 100g)
}

export interface MealResponse {
  id: string;
  mealPlanId: string;
  foodId: string;
  mealType: MealType;
  quantity: number;
}

export interface MealPlanResponse {
  id: string;
  userId: number;
  planDate: string;
  createdAt?: string;
  meals: MealResponse[];
}

export interface DailySummaryResponse {
  date: string;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}

// Enriched Meal with Food details for UI display
export interface EnrichedMeal extends MealResponse {
  food?: FoodResponse;
}

// ============================================================================
// Grocery Planning Types
// Matches com.example.groceryplanningservice.dto.* and GroceryListStatus
// ============================================================================

export type GroceryListStatus = 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';

export interface GroceryListRequest {
  userId: number;
}

export interface GroceryItemRequest {
  foodId: string;
  quantity: number;
  unit: string;
  estimatedPrice?: number;
}

export interface GroceryItemUpdateRequest {
  quantity?: number;
  unit?: string;
  checked?: boolean;
  estimatedPrice?: number;
}

export interface GroceryItemResponse {
  id: string;
  groceryListId: string;
  foodId: string;
  quantity: number;
  unit: string;
  checked: boolean;
  estimatedPrice?: number;
}

export interface GroceryListResponse {
  id: string;
  userId: number;
  status: GroceryListStatus;
  createdAt?: string;
  items?: GroceryItemResponse[];
}

export interface EstimatedCostResponse {
  listId: string;
  estimatedCost: number;
}

// Enriched Grocery item with Food details for UI display
export interface EnrichedGroceryItem extends GroceryItemResponse {
  food?: FoodResponse;
}
