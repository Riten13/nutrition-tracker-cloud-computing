import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Utensils,
  Plus,
  Flame,
  Dumbbell,
  Wheat,
  Droplet,
  ArrowUpRight,
  TrendingUp,
  AlertCircle,
  Apple,
  ShoppingCart,
  CalendarDays,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { mealService } from '../services/mealService';
import { foodService } from '../services/foodService';
import {
  DailySummaryResponse,
  FoodResponse,
  MealPlanResponse,
  MealResponse,
  MealType,
} from '../types';
import {
  mockDailySummary,
  mockFoods,
  mockMealPlan,
} from '../services/mockData';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

export const Dashboard: React.FC = () => {
  const { user, isDemoMode } = useAuth();
  const navigate = useNavigate();

  const [summary, setSummary] = useState<DailySummaryResponse | null>(null);
  const [mealPlan, setMealPlan] = useState<MealPlanResponse | null>(null);
  const [foodsMap, setFoodsMap] = useState<Record<string, FoodResponse>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calculate estimated daily calorie target based on user profile (Harris-Benedict formula)
  const calculateCalorieTarget = () => {
    if (!user?.profile?.weight || !user?.profile?.height || !user?.profile?.age) {
      return 2000; // Standard reference intake
    }
    const bmr =
      10 * user.profile.weight +
      6.25 * user.profile.height -
      5 * user.profile.age +
      5;
    const factorMap: Record<string, number> = {
      Sedentary: 1.2,
      'Lightly Active': 1.375,
      'Moderately Active': 1.55,
      Active: 1.725,
      'Very Active': 1.9,
    };
    const factor = factorMap[user.profile.activityLevel || 'Active'] || 1.4;
    return Math.round(bmr * factor);
  };

  const calorieTarget = calculateCalorieTarget();

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      setError(null);

      // Pre-populate foods dictionary
      try {
        const foodsData = isDemoMode
          ? mockFoods
          : await foodService.getFoods().catch(() => mockFoods);
        const map: Record<string, FoodResponse> = {};
        foodsData.forEach((f) => {
          map[f.id] = f;
        });
        setFoodsMap(map);

        if (user) {
          if (isDemoMode) {
            setSummary(mockDailySummary);
            setMealPlan(mockMealPlan);
          } else {
            try {
              const [summaryRes, planRes] = await Promise.all([
                mealService.getDailySummary(user.id),
                mealService.getMealPlan(user.id),
              ]);
              setSummary(summaryRes);
              setMealPlan(planRes);
            } catch (apiErr: any) {
              // If user has not created a meal plan yet (404)
              if (apiErr.response?.status === 404) {
                setSummary({
                  date: new Date().toISOString().split('T')[0],
                  totalCalories: 0,
                  totalProtein: 0,
                  totalCarbs: 0,
                  totalFat: 0,
                });
                setMealPlan(null);
              } else {
                console.warn('Using fallback data for dashboard visualization');
                setSummary(mockDailySummary);
                setMealPlan(mockMealPlan);
              }
            }
          }
        }
      } catch (err: any) {
        setError('Failed to fetch nutrition data from API Gateway.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [user, isDemoMode]);

  // Derived metrics
  const totalCalories = summary ? Math.round(summary.totalCalories) : 0;
  const remainingCalories = Math.max(0, calorieTarget - totalCalories);
  const caloriePercent = Math.min(100, Math.round((totalCalories / calorieTarget) * 100));

  const proteinGrams = summary ? Math.round(summary.totalProtein * 10) / 10 : 0;
  const carbsGrams = summary ? Math.round(summary.totalCarbs * 10) / 10 : 0;
  const fatGrams = summary ? Math.round(summary.totalFat * 10) / 10 : 0;

  // Chart data for macronutrients
  const macroChartData = [
    { name: 'Protein', value: proteinGrams * 4, grams: proteinGrams, color: '#1b3b2b' }, // Forest Green
    { name: 'Carbohydrates', value: carbsGrams * 4, grams: carbsGrams, color: '#84cc16' }, // Lime Green
    { name: 'Healthy Fats', value: fatGrams * 9, grams: fatGrams, color: '#d97706' }, // Warm Amber
  ];

  const totalMacroCalories = macroChartData.reduce((acc, curr) => acc + curr.value, 0);

  // Group meals by type
  const mealGroups: Record<MealType, MealResponse[]> = {
    BREAKFAST: [],
    LUNCH: [],
    DINNER: [],
    SNACK: [],
  };

  if (mealPlan?.meals) {
    mealPlan.meals.forEach((meal) => {
      if (mealGroups[meal.mealType]) {
        mealGroups[meal.mealType].push(meal);
      }
    });
  }

  const currentDateFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="space-y-6">
      {/* 1. Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2 text-xs text-stone-500 font-medium mb-1">
            <Calendar className="w-4 h-4 text-[#84cc16]" />
            <span>{currentDateFormatted}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
            Welcome back, {user?.name || 'User'}
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-0.5">
            Track daily nutrition metrics calculated live via the Meal Planning Microservice.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            size="sm"
            onClick={() => navigate('/meals')}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Log Meal
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate('/foods')}
            leftIcon={<Utensils className="w-4 h-4" />}
          >
            Explore Foods
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate('/grocery')}
            leftIcon={<ShoppingCart className="w-4 h-4" />}
          >
            Groceries
          </Button>
        </div>
      </div>

      {error && <div className="text-sm text-rose-600 bg-rose-50 p-3 rounded-lg border border-rose-200">{error}</div>}

      {/* 2. Top Metric Cards: Daily Nutrition Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Calories Card */}
        <Card className="relative overflow-hidden">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                Calories
              </span>
              <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400">
                <Flame className="w-4 h-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-stone-900 dark:text-stone-100">
                {totalCalories.toLocaleString()}
              </span>
              <span className="text-xs text-stone-400">
                / {calorieTarget.toLocaleString()} kcal
              </span>
            </div>
            <div className="mt-3 w-full bg-stone-100 dark:bg-stone-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-[#1b3b2b] dark:bg-[#84cc16] h-2 rounded-full transition-all duration-500"
                style={{ width: `${caloriePercent}%` }}
              />
            </div>
            <p className="mt-2 text-[11px] text-stone-500 flex justify-between">
              <span>{remainingCalories.toLocaleString()} kcal remaining</span>
              <span>{caloriePercent}% target</span>
            </p>
          </CardContent>
        </Card>

        {/* Protein Card */}
        <Card>
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                Protein
              </span>
              <div className="p-2 rounded-lg bg-[#1b3b2b]/10 text-[#1b3b2b] dark:text-[#86efac]">
                <Dumbbell className="w-4 h-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-stone-900 dark:text-stone-100">
                {proteinGrams}
              </span>
              <span className="text-xs font-medium text-stone-400">g</span>
            </div>
            <p className="mt-3 text-xs text-stone-500">
              {Math.round(proteinGrams * 4)} kcal from protein
            </p>
            <div className="mt-2 w-full bg-stone-100 dark:bg-stone-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-[#1b3b2b] dark:bg-emerald-500 h-1.5 rounded-full"
                style={{ width: `${Math.min(100, (proteinGrams / 140) * 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Carbohydrates Card */}
        <Card>
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                Carbohydrates
              </span>
              <div className="p-2 rounded-lg bg-[#84cc16]/15 text-[#3f6212] dark:text-[#bef264]">
                <Wheat className="w-4 h-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-stone-900 dark:text-stone-100">
                {carbsGrams}
              </span>
              <span className="text-xs font-medium text-stone-400">g</span>
            </div>
            <p className="mt-3 text-xs text-stone-500">
              {Math.round(carbsGrams * 4)} kcal from carbs
            </p>
            <div className="mt-2 w-full bg-stone-100 dark:bg-stone-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-[#84cc16] h-1.5 rounded-full"
                style={{ width: `${Math.min(100, (carbsGrams / 220) * 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Fats Card */}
        <Card>
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                Healthy Fats
              </span>
              <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400">
                <Droplet className="w-4 h-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-stone-900 dark:text-stone-100">
                {fatGrams}
              </span>
              <span className="text-xs font-medium text-stone-400">g</span>
            </div>
            <p className="mt-3 text-xs text-stone-500">
              {Math.round(fatGrams * 9)} kcal from fats
            </p>
            <div className="mt-2 w-full bg-stone-100 dark:bg-stone-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-amber-600 h-1.5 rounded-full"
                style={{ width: `${Math.min(100, (fatGrams / 65) * 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Visualizations: Macronutrient Distribution & Summary Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Macronutrient Breakdown Pie Chart */}
        <Card className="lg:col-span-1">
          <CardHeader className="p-5 pb-2">
            <CardTitle>Macro Distribution</CardTitle>
            <CardDescription>
              Proportion of total energy intake from protein, carbs, and fats
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            {totalMacroCalories > 0 ? (
              <div className="space-y-4">
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={macroChartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={3}
                      >
                        {macroChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val: number) => [`${Math.round(val)} kcal`, 'Energy']}
                        contentStyle={{
                          backgroundColor: '#1c1917',
                          borderRadius: '8px',
                          border: 'none',
                          color: '#fff',
                          fontSize: '12px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                  {macroChartData.map((macro) => {
                    const pct =
                      totalMacroCalories > 0
                        ? Math.round((macro.value / totalMacroCalories) * 100)
                        : 0;
                    return (
                      <div
                        key={macro.name}
                        className="flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-xs"
                            style={{ backgroundColor: macro.color }}
                          />
                          <span className="text-stone-700 dark:text-stone-300">
                            {macro.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-stone-900 dark:text-stone-100">
                            {macro.grams}g
                          </span>
                          <span className="text-stone-400 w-8 text-right">
                            ({pct}%)
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="h-56 flex flex-col items-center justify-center text-center p-4">
                <Utensils className="w-8 h-8 text-stone-300 dark:text-stone-700 mb-2" />
                <p className="text-xs text-stone-500">
                  No food logged for today yet. Log items in Meal Planning to see breakdown.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Today's Meals Activity Breakdown */}
        <Card className="lg:col-span-2">
          <CardHeader className="p-5 pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle>Today's Meal Plan</CardTitle>
              <CardDescription>
                Logged foods scaled from Food Database Service
              </CardDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate('/meals')}
              rightIcon={<ArrowUpRight className="w-3.5 h-3.5" />}
            >
              Manage Meals
            </Button>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            {mealPlan && mealPlan.meals && mealPlan.meals.length > 0 ? (
              <div className="space-y-4">
                {(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'] as MealType[]).map(
                  (type) => {
                    const mealsForType = mealGroups[type];
                    if (mealsForType.length === 0) return null;

                    return (
                      <div
                        key={type}
                        className="p-3 rounded-lg border border-stone-200/80 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold tracking-wider uppercase text-[#1b3b2b] dark:text-[#84cc16]">
                            {type}
                          </span>
                          <span className="text-[11px] text-stone-400">
                            {mealsForType.length} item{mealsForType.length > 1 ? 's' : ''}
                          </span>
                        </div>

                        <div className="divide-y divide-stone-100 dark:divide-stone-800">
                          {mealsForType.map((meal) => {
                            const food = foodsMap[meal.foodId];
                            const foodName = food ? food.name : `Food #${meal.foodId}`;
                            const calories = food
                              ? Math.round(
                                  (food.nutrition.calories * meal.quantity) / 100
                                )
                              : null;

                            return (
                              <div
                                key={meal.id}
                                className="py-1.5 flex items-center justify-between text-xs"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
                                  <span className="font-medium text-stone-800 dark:text-stone-200">
                                    {foodName}
                                  </span>
                                  <span className="text-stone-400">
                                    ({meal.quantity}g)
                                  </span>
                                </div>
                                {calories !== null && (
                                  <span className="text-stone-500 font-mono text-[11px]">
                                    {calories} kcal
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            ) : (
              <div className="h-56 flex flex-col items-center justify-center text-center p-6 border border-dashed border-stone-200 dark:border-stone-800 rounded-lg">
                <Utensils className="w-8 h-8 text-stone-300 dark:text-stone-700 mb-2" />
                <h4 className="text-sm font-semibold text-stone-800 dark:text-stone-200">
                  No meals logged today
                </h4>
                <p className="text-xs text-stone-500 max-w-sm mt-1 mb-4">
                  Add items to your meal plan to track live caloric intake and macro distributions.
                </p>
                <Button size="sm" onClick={() => navigate('/meals')}>
                  Create Today's Meal Plan
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 4. Microservice Health & System Quick Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          onClick={() => navigate('/foods')}
          className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:border-stone-300 cursor-pointer transition-colors flex items-center gap-3.5"
        >
          <div className="p-2.5 rounded-lg bg-[#1b3b2b]/10 text-[#1b3b2b] dark:text-[#84cc16]">
            <Apple className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
              Food Database
            </h4>
            <p className="text-xs text-stone-500">
              Browse master foods and nutrition profiles
            </p>
          </div>
        </div>

        <div
          onClick={() => navigate('/meals')}
          className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:border-stone-300 cursor-pointer transition-colors flex items-center gap-3.5"
        >
          <div className="p-2.5 rounded-lg bg-[#84cc16]/15 text-[#3f6212] dark:text-[#bef264]">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
              Meal Planner
            </h4>
            <p className="text-xs text-stone-500">
              Build daily plans and scale meal quantities
            </p>
          </div>
        </div>

        <div
          onClick={() => navigate('/grocery')}
          className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:border-stone-300 cursor-pointer transition-colors flex items-center gap-3.5"
        >
          <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
              Grocery Planning
            </h4>
            <p className="text-xs text-stone-500">
              Manage shopping checklists and price estimates
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
