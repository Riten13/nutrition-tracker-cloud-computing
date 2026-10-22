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
  Target,
  BarChart3,
  Loader2,
  Settings,
  Info,
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
  CartesianGrid,
  ReferenceLine,
  Legend,
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
  const [weeklyHistory, setWeeklyHistory] = useState<DailySummaryResponse[]>([]);
  const [historyView, setHistoryView] = useState<'calories' | 'macros'>('calories');
  const [mealPlan, setMealPlan] = useState<MealPlanResponse | null>(null);
  const [foodsMap, setFoodsMap] = useState<Record<string, FoodResponse>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Helper for past dates (YYYY-MM-DD)
  const getPastDateStr = (daysAgo: number): string => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split('T')[0];
  };

  // Calculate fallback daily calorie target if user hasn't set explicit goals
  const calculateDefaultCalorieTarget = () => {
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

  // Personalized targets from User Profile Service (with fallback)
  const calorieTarget = user?.nutritionGoal?.calorieTarget || calculateDefaultCalorieTarget();
  const proteinTarget = user?.nutritionGoal?.proteinTarget || 140;
  const carbTarget = user?.nutritionGoal?.carbTarget || 220;
  const fatTarget = user?.nutritionGoal?.fatTarget || 65;
  const fitnessGoal = user?.nutritionGoal?.fitnessGoal || 'MAINTAIN_WEIGHT';

  const fitnessGoalLabels: Record<string, string> = {
    LOSE_WEIGHT: 'Weight Loss',
    MAINTAIN_WEIGHT: 'Weight Maintenance',
    GAIN_WEIGHT: 'Muscle & Weight Gain',
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      setIsHistoryLoading(true);
      setError(null);

      const todayStr = getPastDateStr(0);
      const sevenDaysAgoStr = getPastDateStr(6);

      try {
        if (isDemoMode) {
          const map: Record<string, FoodResponse> = {};
          mockFoods.forEach((f) => {
            map[f.id] = f;
          });
          setFoodsMap(map);
          setSummary(mockDailySummary);
          setMealPlan(mockMealPlan);

          // Simulated 7-day history for demo
          const demoHistory: DailySummaryResponse[] = [];
          for (let i = 6; i >= 0; i--) {
            const dateStr = getPastDateStr(i);
            const factor = i === 0 ? 1.0 : 0.6 + (i % 3) * 0.2;
            demoHistory.push({
              date: dateStr,
              totalCalories: Math.round(mockDailySummary.totalCalories * factor),
              totalProtein: Math.round(mockDailySummary.totalProtein * factor),
              totalCarbs: Math.round(mockDailySummary.totalCarbs * factor),
              totalFat: Math.round(mockDailySummary.totalFat * factor),
            });
          }
          setWeeklyHistory(demoHistory);
          setIsLoading(false);
          setIsHistoryLoading(false);
          return;
        }

        // Real Backend Flow
        const foodsData = await foodService.getFoods();
        const map: Record<string, FoodResponse> = {};
        foodsData.forEach((f) => {
          map[f.id] = f;
        });
        setFoodsMap(map);

        if (user) {
          // 1. Daily Summary
          try {
            const summaryRes = await mealService.getDailySummary(user.id);
            setSummary(summaryRes);
          } catch (summaryErr: any) {
            setSummary({
              date: todayStr,
              totalCalories: 0,
              totalProtein: 0,
              totalCarbs: 0,
              totalFat: 0,
            });
          }

          // 2. Today's Meal Plan
          try {
            const planRes = await mealService.getMealPlan(user.id);
            setMealPlan(planRes);
          } catch (planErr: any) {
            if (planErr.response?.status === 404) {
              setMealPlan(null);
            } else {
              console.error('Failed to get today meal plan:', planErr);
            }
          }

          // 3. 7-Day Nutrition History
          try {
            const historyRes = await mealService.getNutritionHistory(
              user.id,
              sevenDaysAgoStr,
              todayStr
            );
            setWeeklyHistory(historyRes);
          } catch (histErr: any) {
            console.error('Failed to get 7-day nutrition history:', histErr);
            setWeeklyHistory([]);
          } finally {
            setIsHistoryLoading(false);
          }
        }
      } catch (err: any) {
        console.error('Failed to fetch dashboard data from backend:', err);
        setError('Unable to load live dashboard data from backend services. Please ensure microservices are running.');
        setSummary(null);
        setMealPlan(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [user, isDemoMode]);

  // Derived metrics
  const totalCalories = summary ? Math.round(summary.totalCalories) : 0;
  const remainingCalories = Math.max(0, calorieTarget - totalCalories);
  const isOverCalorieTarget = totalCalories > calorieTarget;
  const caloriePercent = Math.min(100, Math.round((totalCalories / calorieTarget) * 100));

  const proteinGrams = summary ? Math.round(summary.totalProtein * 10) / 10 : 0;
  const carbsGrams = summary ? Math.round(summary.totalCarbs * 10) / 10 : 0;
  const fatGrams = summary ? Math.round(summary.totalFat * 10) / 10 : 0;

  const proteinPercent = Math.min(100, Math.round((proteinGrams / proteinTarget) * 100));
  const carbsPercent = Math.min(100, Math.round((carbsGrams / carbTarget) * 100));
  const fatPercent = Math.min(100, Math.round((fatGrams / fatTarget) * 100));

  // Chart data for today's macronutrients pie chart
  const macroChartData = [
    { name: 'Protein', value: proteinGrams * 4, grams: proteinGrams, color: '#1b3b2b' },
    { name: 'Carbohydrates', value: carbsGrams * 4, grams: carbsGrams, color: '#84cc16' },
    { name: 'Healthy Fats', value: fatGrams * 9, grams: fatGrams, color: '#d97706' },
  ];
  const totalMacroCalories = macroChartData.reduce((acc, curr) => acc + curr.value, 0);

  // Chart data for 7-day weekly history
  const formattedWeeklyHistory = weeklyHistory.map((day) => {
    // Parse date ensuring local calendar alignment
    const parts = day.date.split('-');
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
    return {
      date: day.date,
      dayLabel,
      calories: Math.round(day.totalCalories),
      protein: Math.round(day.totalProtein * 10) / 10,
      carbs: Math.round(day.totalCarbs * 10) / 10,
      fat: Math.round(day.totalFat * 10) / 10,
      target: calorieTarget,
    };
  });

  const totalWeeklyCalories = weeklyHistory.reduce((acc, curr) => acc + curr.totalCalories, 0);

  // Group today's meals
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
            onClick={() => navigate('/profile')}
            leftIcon={<Settings className="w-4 h-4" />}
          >
            Manage Goals
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

      {isDemoMode && (
        <div className="text-xs font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 p-3 rounded-lg border border-amber-200 dark:border-amber-800 flex items-center justify-between">
          <span>⚠️ <strong>Demo Mode Active:</strong> Displaying simulated sample data. Disable demo mode or log in to use live backend services.</span>
        </div>
      )}

      {error && (
        <div className="text-sm text-rose-600 bg-rose-50 dark:bg-rose-950/40 p-3 rounded-lg border border-rose-200 dark:border-rose-800 flex items-center justify-between">
          <span>{error}</span>
          <Button size="sm" variant="outline" onClick={() => window.location.reload()}>Retry</Button>
        </div>
      )}

      {/* 2. Personalized Nutrition Goals Banner */}
      <Card className="bg-gradient-to-r from-stone-50 via-white to-stone-50/50 dark:from-stone-900 dark:via-stone-900/90 dark:to-stone-900/70 border-stone-200 dark:border-stone-800">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#1b3b2b]/10 dark:bg-emerald-950/50 text-[#1b3b2b] dark:text-emerald-400">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                    Active Nutrition Goal:
                  </span>
                  <Badge variant="forest">
                    {fitnessGoalLabels[fitnessGoal] || 'Custom Goal'}
                  </Badge>
                  {user?.nutritionGoal ? (
                    <Badge variant="outline">Saved Targets</Badge>
                  ) : (
                    <Badge variant="stone">Default Profile Estimate</Badge>
                  )}
                </div>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  Daily Targets: <strong>{calorieTarget.toLocaleString()} kcal</strong> •{' '}
                  <strong>{proteinTarget}g Protein</strong> •{' '}
                  <strong>{carbTarget}g Carbs</strong> •{' '}
                  <strong>{fatTarget}g Fat</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-7 px-2.5"
                onClick={() => navigate('/profile')}
                rightIcon={<ArrowUpRight className="w-3.5 h-3.5" />}
              >
                Edit Targets
              </Button>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-stone-100 dark:border-stone-800/80 flex items-center gap-1.5 text-[11px] text-stone-400">
            <Info className="w-3.5 h-3.5 shrink-0" />
            <span>Target goals are user-editable guidelines for habit tracking and should not be considered medical advice.</span>
          </div>
        </CardContent>
      </Card>

      {/* 3. Top Metric Cards: Daily Nutrition Consumed vs Target */}
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
                className={`h-2 rounded-full transition-all duration-500 ${
                  isOverCalorieTarget ? 'bg-amber-600' : 'bg-[#1b3b2b] dark:bg-[#84cc16]'
                }`}
                style={{ width: `${caloriePercent}%` }}
              />
            </div>
            <p className="mt-2 text-[11px] text-stone-500 flex justify-between">
              <span>
                {isOverCalorieTarget
                  ? `+${(totalCalories - calorieTarget).toLocaleString()} kcal over`
                  : `${remainingCalories.toLocaleString()} kcal remaining`}
              </span>
              <span className="font-semibold">{Math.round((totalCalories / calorieTarget) * 100)}%</span>
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
              <span className="text-xs text-stone-400">/ {proteinTarget}g</span>
            </div>
            <div className="mt-3 w-full bg-stone-100 dark:bg-stone-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-[#1b3b2b] dark:bg-emerald-500 h-1.5 rounded-full"
                style={{ width: `${proteinPercent}%` }}
              />
            </div>
            <p className="mt-2 text-[11px] text-stone-500 flex justify-between">
              <span>
                {proteinGrams >= proteinTarget
                  ? 'Goal reached'
                  : `${Math.round((proteinTarget - proteinGrams) * 10) / 10}g remaining`}
              </span>
              <span className="font-semibold">{proteinPercent}%</span>
            </p>
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
              <span className="text-xs text-stone-400">/ {carbTarget}g</span>
            </div>
            <div className="mt-3 w-full bg-stone-100 dark:bg-stone-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-[#84cc16] h-1.5 rounded-full"
                style={{ width: `${carbsPercent}%` }}
              />
            </div>
            <p className="mt-2 text-[11px] text-stone-500 flex justify-between">
              <span>
                {carbsGrams >= carbTarget
                  ? 'Goal reached'
                  : `${Math.round((carbTarget - carbsGrams) * 10) / 10}g remaining`}
              </span>
              <span className="font-semibold">{carbsPercent}%</span>
            </p>
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
              <span className="text-xs text-stone-400">/ {fatTarget}g</span>
            </div>
            <div className="mt-3 w-full bg-stone-100 dark:bg-stone-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-amber-600 h-1.5 rounded-full"
                style={{ width: `${fatPercent}%` }}
              />
            </div>
            <p className="mt-2 text-[11px] text-stone-500 flex justify-between">
              <span>
                {fatGrams >= fatTarget
                  ? 'Goal reached'
                  : `${Math.round((fatTarget - fatGrams) * 10) / 10}g remaining`}
              </span>
              <span className="font-semibold">{fatPercent}%</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 4. 7-Day Weekly Nutrition History Chart */}
      <Card>
        <CardHeader className="p-5 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle>7-Day Nutrition History</CardTitle>
                <Badge variant="outline">Live History API</Badge>
              </div>
              <CardDescription>
                Continuous timeline from Meal Planning Service including non-logged days
              </CardDescription>
            </div>

            {/* View switcher */}
            <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800 p-1 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setHistoryView('calories')}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  historyView === 'calories'
                    ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs'
                    : 'text-stone-500 hover:text-stone-900 dark:hover:text-stone-100'
                }`}
              >
                Calories vs Target
              </button>
              <button
                type="button"
                onClick={() => setHistoryView('macros')}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  historyView === 'macros'
                    ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs'
                    : 'text-stone-500 hover:text-stone-900 dark:hover:text-stone-100'
                }`}
              >
                Macronutrients (g)
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5 pt-1">
          {isHistoryLoading ? (
            <div className="h-64 flex flex-col items-center justify-center text-center">
              <Loader2 className="w-8 h-8 animate-spin text-[#1b3b2b] dark:text-emerald-400 mb-2" />
              <p className="text-xs text-stone-500">Retrieving 7-day nutrition summary...</p>
            </div>
          ) : totalWeeklyCalories === 0 && !isDemoMode ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 border border-dashed border-stone-200 dark:border-stone-800 rounded-lg">
              <BarChart3 className="w-10 h-10 text-stone-300 dark:text-stone-700 mb-2" />
              <h4 className="text-sm font-semibold text-stone-800 dark:text-stone-200">
                No Meals Logged in the Last 7 Days
              </h4>
              <p className="text-xs text-stone-500 max-w-sm mt-1 mb-4">
                Your daily calorie and macronutrient history will visualize here as you log meals in the planner.
              </p>
              <Button size="sm" onClick={() => navigate('/meals')}>
                Log Today's Meals
              </Button>
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                {historyView === 'calories' ? (
                  <BarChart data={formattedWeeklyHistory} margin={{ top: 15, right: 10, left: -15, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888820" />
                    <XAxis dataKey="dayLabel" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} domain={[0, 'auto']} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1c1917',
                        borderRadius: '8px',
                        border: 'none',
                        color: '#fff',
                        fontSize: '12px',
                      }}
                      formatter={(val: number) => [`${val} kcal`, 'Calories Consumed']}
                    />
                    <ReferenceLine
                      y={calorieTarget}
                      stroke="#84cc16"
                      strokeDasharray="4 4"
                      label={{
                        value: `Target: ${calorieTarget} kcal`,
                        fill: '#84cc16',
                        fontSize: 10,
                        position: 'insideTopRight',
                      }}
                    />
                    <Bar dataKey="calories" fill="#1b3b2b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                ) : (
                  <BarChart data={formattedWeeklyHistory} margin={{ top: 15, right: 10, left: -15, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888820" />
                    <XAxis dataKey="dayLabel" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1c1917',
                        borderRadius: '8px',
                        border: 'none',
                        color: '#fff',
                        fontSize: '12px',
                      }}
                      formatter={(val: number, name: string) => [`${val}g`, name]}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Bar dataKey="protein" name="Protein" fill="#1b3b2b" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="carbs" name="Carbs" fill="#84cc16" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="fat" name="Fat" fill="#d97706" radius={[3, 3, 0, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 5. Visualizations: Macronutrient Distribution & Today's Meals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Macronutrient Breakdown Pie Chart */}
        <Card className="lg:col-span-1">
          <CardHeader className="p-5 pb-2">
            <CardTitle>Today's Macro Ratio</CardTitle>
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
                            const isGrams = !meal.unit || meal.unit.toLowerCase() === 'g' || meal.unit.toLowerCase() === 'gram';
                            const grams = isGrams
                              ? meal.quantity
                              : food?.nutrition?.servingWeightGrams
                              ? meal.quantity * food.nutrition.servingWeightGrams
                              : meal.quantity;

                            const calories = food
                              ? Math.round((food.nutrition.calories * grams) / 100)
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
                                    ({isGrams ? `${meal.quantity}g` : `${meal.quantity} ${meal.unit}`})
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

      {/* 6. Microservice Health & System Quick Navigation */}
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

