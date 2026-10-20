import React, { useEffect, useState } from 'react';
import {
  CalendarDays,
  Plus,
  Trash2,
  Utensils,
  Flame,
  Dumbbell,
  Wheat,
  Droplet,
  Loader2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Info,
} from 'lucide-react';
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
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Alert } from '../components/ui/Alert';

export const MealPlanning: React.FC = () => {
  const { user, isDemoMode } = useAuth();

  const [mealPlan, setMealPlan] = useState<MealPlanResponse | null>(null);
  const [dailySummary, setDailySummary] = useState<DailySummaryResponse | null>(null);
  const [availableFoods, setAvailableFoods] = useState<FoodResponse[]>([]);
  const [foodsMap, setFoodsMap] = useState<Record<string, FoodResponse>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const [isAddMealModalOpen, setIsAddMealModalOpen] = useState(false);
  const [targetMealType, setTargetMealType] = useState<MealType>('BREAKFAST');
  const [selectedFoodId, setSelectedFoodId] = useState<string>('');
  const [portionGrams, setPortionGrams] = useState<number>(150);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Load meal plan, summary, and foods
  const loadPlanData = async () => {
    if (!user) return;
    setIsLoading(true);
    setActionError(null);

    try {
      // 1. Fetch foods for dropdown & name resolution
      let foodsList = mockFoods;
      try {
        foodsList = isDemoMode
          ? mockFoods
          : await foodService.getFoods();
      } catch {
        foodsList = mockFoods;
      }
      setAvailableFoods(foodsList);
      const map: Record<string, FoodResponse> = {};
      foodsList.forEach((f) => {
        map[f.id] = f;
      });
      setFoodsMap(map);
      if (foodsList.length > 0 && !selectedFoodId) {
        setSelectedFoodId(foodsList[0].id);
      }

      // 2. Fetch Meal Plan & Summary
      if (isDemoMode) {
        setMealPlan(mockMealPlan);
        setDailySummary(mockDailySummary);
      } else {
        try {
          const planRes = await mealService.getMealPlan(user.id);
          setMealPlan(planRes);
        } catch (planErr: any) {
          if (planErr.response?.status === 404) {
            setMealPlan(null);
          } else {
            setMealPlan(mockMealPlan);
          }
        }

        try {
          const summaryRes = await mealService.getDailySummary(user.id);
          setDailySummary(summaryRes);
        } catch {
          setDailySummary(null);
        }
      }
    } catch (err: any) {
      setActionError('Could not communicate with Meal Planning Service.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPlanData();
  }, [user, isDemoMode, selectedDate]);

  // Create plan for the date if none exists
  const handleCreatePlan = async () => {
    if (!user) return;
    setIsSubmitting(true);
    setActionError(null);
    try {
      if (isDemoMode) {
        const newPlan: MealPlanResponse = {
          id: `plan_${Date.now()}`,
          userId: user.id,
          planDate: selectedDate,
          createdAt: new Date().toISOString(),
          meals: [],
        };
        setMealPlan(newPlan);
        setActionSuccess('Created new meal plan for today.');
      } else {
        const created = await mealService.createMealPlan({
          userId: user.id,
          planDate: selectedDate,
        });
        setMealPlan(created);
        setActionSuccess('Created meal plan via Meal Planning Service.');
      }
    } catch (err: any) {
      setActionError('Failed to create meal plan. Ensure service is registered on Eureka.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add meal to plan
  const handleAddMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mealPlan || !selectedFoodId || portionGrams <= 0) return;

    setIsSubmitting(true);
    setActionError(null);
    try {
      if (isDemoMode) {
        const newMeal: MealResponse = {
          id: `meal_${Date.now()}`,
          mealPlanId: mealPlan.id,
          foodId: selectedFoodId,
          mealType: targetMealType,
          quantity: portionGrams,
        };
        const updatedMeals = [...mealPlan.meals, newMeal];
        setMealPlan({ ...mealPlan, meals: updatedMeals });

        // Update local daily summary
        const foodItem = foodsMap[selectedFoodId];
        if (foodItem && dailySummary) {
          const factor = portionGrams / 100.0;
          setDailySummary({
            ...dailySummary,
            totalCalories: Math.round(dailySummary.totalCalories + foodItem.nutrition.calories * factor),
            totalProtein: Math.round(dailySummary.totalProtein + foodItem.nutrition.protein * factor),
            totalCarbs: Math.round(dailySummary.totalCarbs + foodItem.nutrition.carbs * factor),
            totalFat: Math.round(dailySummary.totalFat + foodItem.nutrition.fat * factor),
          });
        }
        setActionSuccess('Meal logged in plan.');
      } else {
        await mealService.addMeal(mealPlan.id, {
          foodId: selectedFoodId,
          mealType: targetMealType,
          quantity: portionGrams,
        });
        await loadPlanData();
        setActionSuccess('Meal logged via Meal Planning Service.');
      }
      setIsAddMealModalOpen(false);
    } catch (err: any) {
      setActionError('Failed to add meal. Verify Food Database Feign client connectivity.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete meal
  const handleDeleteMeal = async (mealId: string) => {
    if (!mealPlan) return;
    if (!window.confirm('Remove this food item from your meal plan?')) return;

    try {
      if (isDemoMode) {
        setMealPlan({
          ...mealPlan,
          meals: mealPlan.meals.filter((m) => m.id !== mealId),
        });
        setActionSuccess('Item removed from plan.');
      } else {
        await mealService.deleteMeal(mealPlan.id, mealId);
        await loadPlanData();
        setActionSuccess('Item deleted from meal plan.');
      }
    } catch (err: any) {
      setActionError('Failed to delete meal from plan.');
    }
  };

  // Open modal pre-selecting meal type
  const openAddMealModal = (type: MealType) => {
    setTargetMealType(type);
    setPortionGrams(150);
    if (availableFoods.length > 0 && !selectedFoodId) {
      setSelectedFoodId(availableFoods[0].id);
    }
    setIsAddMealModalOpen(true);
  };

  const mealTypes: MealType[] = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'];

  // Group meals
  const groupedMeals = mealTypes.reduce((acc, type) => {
    acc[type] = (mealPlan?.meals || []).filter((m) => m.mealType === type);
    return acc;
  }, {} as Record<MealType, MealResponse[]>);

  // Selected food nutrition preview in modal
  const selectedFood = foodsMap[selectedFoodId];
  const previewCalories = selectedFood
    ? Math.round(((selectedFood.nutrition?.calories || 0) * portionGrams) / 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
            Daily Meal Planner
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-0.5">
            Manages meal logs and computes daily nutrition live via OpenFeign and Food Database Service.
          </p>
        </div>

        {/* Date Selector Navigation */}
        <div className="flex items-center gap-2 self-start sm:self-auto bg-white dark:bg-stone-900 p-1.5 rounded-lg border border-stone-200 dark:border-stone-800 text-xs">
          <CalendarDays className="w-4 h-4 text-[#84cc16] ml-1" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-transparent border-none text-stone-800 dark:text-stone-200 focus:outline-none text-xs font-medium cursor-pointer"
          />
        </div>
      </div>

      {actionSuccess && (
        <Alert type="success" onClose={() => setActionSuccess(null)}>
          {actionSuccess}
        </Alert>
      )}

      {actionError && (
        <Alert type="error" onClose={() => setActionError(null)}>
          {actionError}
        </Alert>
      )}

      {/* Daily Summary Banner */}
      {dailySummary && (
        <Card className="bg-stone-50/70 dark:bg-stone-900/60">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Computed Daily Nutrition:
                </span>
                <Badge variant="forest">Live Feign Totals</Badge>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-amber-600" />
                  <span className="text-stone-500">Calories:</span>
                  <span className="font-bold text-stone-900 dark:text-stone-100">
                    {Math.round(dailySummary.totalCalories)} kcal
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Dumbbell className="w-4 h-4 text-[#1b3b2b] dark:text-emerald-400" />
                  <span className="text-stone-500">Protein:</span>
                  <span className="font-bold text-stone-900 dark:text-stone-100">
                    {Math.round(dailySummary.totalProtein * 10) / 10}g
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Wheat className="w-4 h-4 text-[#84cc16]" />
                  <span className="text-stone-500">Carbs:</span>
                  <span className="font-bold text-stone-900 dark:text-stone-100">
                    {Math.round(dailySummary.totalCarbs * 10) / 10}g
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Droplet className="w-4 h-4 text-amber-700" />
                  <span className="text-stone-500">Fat:</span>
                  <span className="font-bold text-stone-900 dark:text-stone-100">
                    {Math.round(dailySummary.totalFat * 10) / 10}g
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Area */}
      {isLoading ? (
        <div className="py-16 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#1b3b2b] dark:text-emerald-400 mb-2" />
          <p className="text-xs text-stone-500">
            Loading meal plan from Meal Planning Service...
          </p>
        </div>
      ) : !mealPlan ? (
        <Card className="p-12 text-center border-dashed">
          <CalendarDays className="w-12 h-12 text-stone-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-stone-800 dark:text-stone-200">
            No Meal Plan for {selectedDate}
          </h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1 mb-4">
            Initialize a meal plan for this date to start logging breakfast, lunch, dinner, and snacks.
          </p>
          <Button onClick={handleCreatePlan} isLoading={isSubmitting}>
            Create Plan for {selectedDate}
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {mealTypes.map((type) => {
            const meals = groupedMeals[type];
            const typeCalories = meals.reduce((acc, m) => {
              const f = foodsMap[m.foodId];
              return acc + (f ? (f.nutrition.calories * m.quantity) / 100 : 0);
            }, 0);

            return (
              <Card key={type} className="flex flex-col justify-between">
                <CardHeader className="p-4 pb-2 border-b border-stone-100 dark:border-stone-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-bold tracking-wider uppercase text-[#1b3b2b] dark:text-emerald-400">
                        {type}
                      </CardTitle>
                      <CardDescription>
                        {meals.length} item{meals.length !== 1 ? 's' : ''} • approx.{' '}
                        {Math.round(typeCalories)} kcal
                      </CardDescription>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7 px-2.5"
                      onClick={() => openAddMealModal(type)}
                      leftIcon={<Plus className="w-3.5 h-3.5" />}
                    >
                      Add Item
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="p-4 pt-3 flex-1">
                  {meals.length === 0 ? (
                    <div className="py-6 text-center text-xs text-stone-400 border border-dashed border-stone-100 dark:border-stone-800 rounded-lg">
                      No foods logged for {type.toLowerCase()}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {meals.map((meal) => {
                        const food = foodsMap[meal.foodId];
                        const foodName = food ? food.name : `Food #${meal.foodId}`;
                        const cals = food
                          ? Math.round((food.nutrition.calories * meal.quantity) / 100)
                          : null;
                        const protein = food
                          ? Math.round(((food.nutrition.protein * meal.quantity) / 100) * 10) / 10
                          : null;

                        return (
                          <div
                            key={meal.id}
                            className="flex items-center justify-between p-2.5 rounded-lg border border-stone-100 dark:border-stone-800/80 bg-stone-50/40 dark:bg-stone-900/40 text-xs"
                          >
                            <div className="min-w-0 pr-2">
                              <p className="font-semibold text-stone-800 dark:text-stone-200 truncate">
                                {foodName}
                              </p>
                              <p className="text-[11px] text-stone-400">
                                {meal.quantity}g portion
                                {protein !== null && ` • ${protein}g protein`}
                              </p>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              {cals !== null && (
                                <span className="font-mono text-xs font-semibold text-stone-700 dark:text-stone-300">
                                  {cals} kcal
                                </span>
                              )}
                              <button
                                onClick={() => handleDeleteMeal(meal.id)}
                                className="p-1 text-stone-400 hover:text-rose-600 rounded-md transition-colors"
                                title="Remove meal"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Meal Dialog */}
      <Modal
        isOpen={isAddMealModalOpen}
        onClose={() => setIsAddMealModalOpen(false)}
        title={`Log Meal: ${targetMealType}`}
        description="Select a food item from the database and specify portion size in grams."
        maxWidth="sm"
      >
        <form onSubmit={handleAddMeal} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-1.5">
              Select Food Item *
            </label>
            <select
              value={selectedFoodId}
              onChange={(e) => setSelectedFoodId(e.target.value)}
              className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 px-3.5 py-2 text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#1b3b2b]"
              required
            >
              {availableFoods.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.category}) — {f.nutrition?.calories || 0} kcal/100g
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Portion Size (Grams) *"
            type="number"
            min="10"
            step="5"
            value={portionGrams}
            onChange={(e) => setPortionGrams(Number(e.target.value))}
            helperText={`Provides approximately ${previewCalories} calories`}
            required
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-stone-100 dark:border-stone-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddMealModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Add to {targetMealType}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
