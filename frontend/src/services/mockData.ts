import {
  UserProfileResponse,
  FoodResponse,
  MealPlanResponse,
  DailySummaryResponse,
  GroceryListResponse,
} from '../types';

export const mockUser: UserProfileResponse = {
  id: 1,
  name: 'Alex Morgan',
  email: 'alex.morgan@example.com',
  profile: {
    age: 29,
    weight: 68.5,
    height: 174.0,
    activityLevel: 'Active',
  },
  dietaryPreference: {
    vegan: false,
    vegetarian: false,
    keto: false,
    glutenFree: true,
    dairyFree: false,
  },
  allergies: [
    { id: 1, name: 'Peanuts' },
    { id: 2, name: 'Shellfish' },
  ],
  nutritionGoal: {
    fitnessGoal: 'MAINTAIN_WEIGHT',
    calorieTarget: 2200,
    proteinTarget: 140,
    carbTarget: 240,
    fatTarget: 65,
  },
  role: 'ROLE_ADMIN',
};

export const mockFoods: FoodResponse[] = [
  {
    id: 'food_1',
    name: 'Grilled Chicken Breast',
    category: 'Poultry',
    description: 'Boneless, skinless lean chicken breast grilled with herbs',
    nutrition: {
      servingSize: 100,
      servingUnit: 'g',
      calories: 165,
      protein: 31,
      carbs: 0,
      fat: 3.6,
      fiber: 0,
    },
  },
  {
    id: 'food_2',
    name: 'Steel Cut Oatmeal',
    category: 'Grains',
    description: 'Whole grain steel cut rolled oats cooked with water',
    nutrition: {
      servingSize: 100,
      servingUnit: 'g',
      calories: 71,
      protein: 2.5,
      carbs: 12,
      fat: 1.5,
      fiber: 1.7,
    },
  },
  {
    id: 'food_3',
    name: 'Atlantic Salmon Fillet',
    category: 'Seafood',
    description: 'Wild caught Atlantic salmon rich in omega-3 fatty acids',
    nutrition: {
      servingSize: 100,
      servingUnit: 'g',
      calories: 208,
      protein: 20.4,
      carbs: 0,
      fat: 13.4,
      fiber: 0,
    },
  },
  {
    id: 'food_4',
    name: 'Organic Baby Spinach',
    category: 'Vegetables',
    description: 'Fresh baby spinach leaves rich in iron and folate',
    nutrition: {
      servingSize: 100,
      servingUnit: 'g',
      calories: 23,
      protein: 2.9,
      carbs: 3.6,
      fat: 0.4,
      fiber: 2.2,
    },
  },
  {
    id: 'food_5',
    name: 'Hass Avocado',
    category: 'Fruits',
    description: 'Fresh ripe Hass avocado packed with monounsaturated fats',
    nutrition: {
      servingSize: 100,
      servingUnit: 'g',
      calories: 160,
      protein: 2,
      carbs: 8.5,
      fat: 14.7,
      fiber: 6.7,
    },
  },
  {
    id: 'food_6',
    name: 'Greek Yogurt Plain (0%)',
    category: 'Dairy',
    description: 'Strained nonfat plain Greek yogurt with active cultures',
    nutrition: {
      servingSize: 100,
      servingUnit: 'g',
      calories: 59,
      protein: 10.2,
      carbs: 3.6,
      fat: 0.4,
      fiber: 0,
    },
  },
  {
    id: 'food_7',
    name: 'Quinoa Grain Cooked',
    category: 'Grains',
    description: 'Cooked organic white quinoa with all 9 essential amino acids',
    nutrition: {
      servingSize: 100,
      servingUnit: 'g',
      calories: 120,
      protein: 4.4,
      carbs: 21.3,
      fat: 1.9,
      fiber: 2.8,
    },
  },
  {
    id: 'food_8',
    name: 'Steamed Broccoli Florets',
    category: 'Vegetables',
    description: 'Tender crisp fresh broccoli florets steamed to retain nutrients',
    nutrition: {
      servingSize: 100,
      servingUnit: 'g',
      calories: 35,
      protein: 2.4,
      carbs: 7.2,
      fat: 0.4,
      fiber: 3.3,
    },
  },
  {
    id: 'food_9',
    name: 'Fresh Blueberries',
    category: 'Fruits',
    description: 'Sweet fresh blueberries rich in anthocyanins and vitamin C',
    nutrition: {
      servingSize: 100,
      servingUnit: 'g',
      calories: 57,
      protein: 0.7,
      carbs: 14.5,
      fat: 0.3,
      fiber: 2.4,
    },
  },
  {
    id: 'food_10',
    name: 'Raw Almonds',
    category: 'Nuts & Seeds',
    description: 'Natural unroasted whole almonds rich in vitamin E and magnesium',
    nutrition: {
      servingSize: 100,
      servingUnit: 'g',
      calories: 579,
      protein: 21.2,
      carbs: 21.6,
      fat: 49.9,
      fiber: 12.5,
    },
  },
];

export const mockMealPlan: MealPlanResponse = {
  id: 'plan_demo_101',
  userId: 1,
  planDate: new Date().toISOString().split('T')[0],
  createdAt: new Date().toISOString(),
  meals: [
    {
      id: 'meal_1',
      mealPlanId: 'plan_demo_101',
      foodId: 'food_2', // Steel Cut Oatmeal
      mealType: 'BREAKFAST',
      quantity: 180,
    },
    {
      id: 'meal_2',
      mealPlanId: 'plan_demo_101',
      foodId: 'food_9', // Fresh Blueberries
      mealType: 'BREAKFAST',
      quantity: 80,
    },
    {
      id: 'meal_3',
      mealPlanId: 'plan_demo_101',
      foodId: 'food_1', // Grilled Chicken Breast
      mealType: 'LUNCH',
      quantity: 200,
    },
    {
      id: 'meal_4',
      mealPlanId: 'plan_demo_101',
      foodId: 'food_7', // Quinoa Grain Cooked
      mealType: 'LUNCH',
      quantity: 150,
    },
    {
      id: 'meal_5',
      mealPlanId: 'plan_demo_101',
      foodId: 'food_4', // Organic Baby Spinach
      mealType: 'LUNCH',
      quantity: 60,
    },
    {
      id: 'meal_6',
      mealPlanId: 'plan_demo_101',
      foodId: 'food_3', // Atlantic Salmon Fillet
      mealType: 'DINNER',
      quantity: 180,
    },
    {
      id: 'meal_7',
      mealPlanId: 'plan_demo_101',
      foodId: 'food_8', // Steamed Broccoli Florets
      mealType: 'DINNER',
      quantity: 150,
    },
    {
      id: 'meal_8',
      mealPlanId: 'plan_demo_101',
      foodId: 'food_6', // Greek Yogurt Plain
      mealType: 'SNACK',
      quantity: 150,
    },
  ],
};

export const mockDailySummary: DailySummaryResponse = {
  date: new Date().toISOString().split('T')[0],
  totalCalories: 1485.4,
  totalProtein: 128.6,
  totalCarbs: 98.2,
  totalFat: 38.5,
};

export const mockGroceryList: GroceryListResponse = {
  id: 'grocery_demo_201',
  userId: 1,
  status: 'ACTIVE',
  createdAt: new Date().toISOString(),
  items: [
    {
      id: 'gitem_1',
      groceryListId: 'grocery_demo_201',
      foodId: 'food_1', // Grilled Chicken Breast
      quantity: 1.0,
      unit: 'kg',
      checked: true,
      estimatedPrice: 320.0,
    },
    {
      id: 'gitem_2',
      groceryListId: 'grocery_demo_201',
      foodId: 'food_3', // Atlantic Salmon Fillet
      quantity: 0.8,
      unit: 'kg',
      checked: false,
      estimatedPrice: 560.0,
    },
    {
      id: 'gitem_3',
      groceryListId: 'grocery_demo_201',
      foodId: 'food_4', // Organic Baby Spinach
      quantity: 2.0,
      unit: 'bunch',
      checked: false,
      estimatedPrice: 60.0,
    },
    {
      id: 'gitem_4',
      groceryListId: 'grocery_demo_201',
      foodId: 'food_7', // Quinoa Grain Cooked
      quantity: 0.5,
      unit: 'kg',
      checked: true,
      estimatedPrice: 180.0,
    },
    {
      id: 'gitem_5',
      groceryListId: 'grocery_demo_201',
      foodId: 'food_6', // Greek Yogurt Plain
      quantity: 2.0,
      unit: 'tub',
      checked: false,
      estimatedPrice: 140.0,
    },
    {
      id: 'gitem_6',
      groceryListId: 'grocery_demo_201',
      foodId: 'food_8', // Steamed Broccoli Florets
      quantity: 1.0,
      unit: 'kg',
      checked: false,
      estimatedPrice: 90.0,
    },
  ],
};
