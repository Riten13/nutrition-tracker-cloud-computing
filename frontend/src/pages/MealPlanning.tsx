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
  Pencil,
  Scale,
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

  // Modal & form states (supports both Add and Edit)
  const [isMealModalOpen, setIsMealModalOpen] = useState(false);
  const [editingMeal, setEditingMeal] = useState<MealResponse | null>(null);
  const [targetMealType, setTargetMealType] = useState<MealType>('BREAKFAST');
  const [selectedFoodId, setSelectedFoodId] = useState<string>('');
  const [portionQuantity, setPortionQuantity] = useState<number>(150);
  const [selectedUnit, setSelectedUnit] = useState<string>('g');

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
      let foodsList: FoodResponse[] = [];
      if (isDemoMode) {
        foodsList = mockFoods;
      } else {
        foodsList = await foodService.getFoods();
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

      // 2. Fetch Meal Plan & Summary for the selected date
      if (isDemoMode) {
        setMealPlan(mockMealPlan);
        setDailySummary(mockDailySummary);
      } else {
        try {
          const planRes = await mealService.getMealPlan(user.id, selectedDate);
          setMealPlan(planRes);
        } catch (planErr: any) {
          if (planErr.response?.status === 404) {
            setMealPlan(null);
          } else {
            console.error('Failed to fetch meal plan:', planErr);
            setActionError('Could not retrieve meal plan from Meal Planning Service.');
            setMealPlan(null);
          }
        }

        try {
          const summaryRes = await mealService.getDailySummary(user.id, selectedDate);
          setDailySummary(summaryRes);
        } catch (summaryErr: any) {
          setDailySummary({
            date: selectedDate,
            totalCalories: 0,
            totalProtein: 0,
            totalCarbs: 0,
            totalFat: 0,
          });
        }
      }
    } catch (err: any) {
      console.error('MealPlanning data load failure:', err);
      setActionError('Could not communicate with backend services. Ensure API Gateway is running on port 8088.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPlanData();
  }, [user, isDemoMode, selectedDate]);

  // Helper to convert meal quantity to grams
  const getMealGrams = (quantity: number, unit?: string, food?: FoodResponse): number => {
    if (!unit || unit.toLowerCase() === 'g' || unit.toLowerCase() === 'gram' || unit.toLowerCase() === 'grams') {
      return quantity;
    }
    if (food?.nutrition?.servingWeightGrams && food.nutrition.servingWeightGrams > 0) {
      return quantity * food.nutrition.servingWeightGrams;
    }
    return quantity;
  };

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

  // Open modal in ADD mode
  const openAddMealModal = (type: MealType) => {
    setEditingMeal(null);
    setTargetMealType(type);
    const initialFood = availableFoods.find((f) => f.id === selectedFoodId) || availableFoods[0];
    if (initialFood) {
      setSelectedFoodId(initialFood.id);
      setSelectedUnit(initialFood.nutrition.servingUnit || 'g');
      setPortionQuantity(initialFood.nutrition.servingUnit && initialFood.nutrition.servingUnit.toLowerCase() !== 'g' ? 1 : 150);
    } else {
      setSelectedUnit('g');
      setPortionQuantity(150);
    }
    setIsMealModalOpen(true);
  };

  // Open modal in EDIT mode
  const openEditMealModal = (meal: MealResponse) => {
    setEditingMeal(meal);
    setTargetMealType(meal.mealType);
    setSelectedFoodId(meal.foodId);
    setPortionQuantity(meal.quantity);
    setSelectedUnit(meal.unit || 'g');
    setIsMealModalOpen(true);
  };

  // When food selection changes in modal, adjust unit option if appropriate
  const handleFoodSelectChange = (newFoodId: string) => {
    setSelectedFoodId(newFoodId);
    const food = foodsMap[newFoodId];
    if (food && !editingMeal) {
      const hasUnit = food.nutrition.servingUnit && food.nutrition.servingUnit.toLowerCase() !== 'g';
      if (hasUnit) {
        setSelectedUnit(food.nutrition.servingUnit);
        setPortionQuantity(1);
      } else {
        setSelectedUnit('g');
        setPortionQuantity(150);
      }
    }
  };

  // Save meal (Add or Edit)
  const handleSaveMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mealPlan || !selectedFoodId || portionQuantity <= 0) return;

    setIsSubmitting(true);
    setActionError(null);
    try {
      if (isDemoMode) {
        if (editingMeal) {
          // Edit existing meal in demo mode
          const updatedMeals = mealPlan.meals.map((m) =>
            m.id === editingMeal.id
              ? {
                  ...m,
                  foodId: selectedFoodId,
                  mealType: targetMealType,
                  quantity: portionQuantity,
                  unit: selectedUnit,
                }
              : m
          );
          setMealPlan({ ...mealPlan, meals: updatedMeals });
          setActionSuccess('Meal updated in plan (Demo Mode).');
        } else {
          // Add new meal in demo mode
          const newMeal: MealResponse = {
            id: `meal_${Date.now()}`,
            mealPlanId: mealPlan.id,
            foodId: selectedFoodId,
            mealType: targetMealType,
            quantity: portionQuantity,
            unit: selectedUnit,
          };
          setMealPlan({ ...mealPlan, meals: [...mealPlan.meals, newMeal] });
          setActionSuccess('Meal logged in plan (Demo Mode).');
        }
      } else {
        if (editingMeal) {
          await mealService.updateMeal(mealPlan.id, editingMeal.id, {
            foodId: selectedFoodId,
            mealType: targetMealType,
            quantity: portionQuantity,
            unit: selectedUnit,
          });
          setActionSuccess('Meal updated successfully.');
        } else {
          await mealService.addMeal(mealPlan.id, {
            foodId: selectedFoodId,
            mealType: targetMealType,
            quantity: portionQuantity,
            unit: selectedUnit,
          });
          setActionSuccess('Meal logged via Meal Planning Service.');
        }
        await loadPlanData();
      }
      setIsMealModalOpen(false);
    } catch (err: any) {
      console.error('Failed to save meal:', err);
      setActionError(
        editingMeal
          ? 'Failed to update meal. Verify Meal Planning Service connectivity.'
          : 'Failed to add meal. Verify Food Database Feign client connectivity.'
      );
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

  const mealTypes: MealType[] = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'];

  // Group meals
  const groupedMeals = mealTypes.reduce((acc, type) => {
    acc[type] = (mealPlan?.meals || []).filter((m) => m.mealType === type);
    return acc;
  }, {} as Record<MealType, MealResponse[]>);

  // Selected food preview calculation in modal
  const selectedFood = foodsMap[selectedFoodId];
  const modalGrams = getMealGrams(portionQuantity, selectedUnit, selectedFood);
  const previewCalories = selectedFood
    ? Math.round(((selectedFood.nutrition?.calories || 0) * modalGrams) / 100)
    : 0;
  const previewProtein = selectedFood
    ? Math.round((((selectedFood.nutrition?.protein || 0) * modalGrams) / 100) * 10) / 10
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
            Log, edit, and scale meals in grams or portion units with live nutrition computation.
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

      {isDemoMode && (
        <div className="text-xs font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 p-3 rounded-lg border border-amber-200 dark:border-amber-800 flex items-center justify-between">
          <span>⚠️ <strong>Demo Mode Active:</strong> Displaying simulated meal plans and calories. Meals logged will not be saved to the Meal Planning microservice.</span>
        </div>
      )}

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
              const grams = getMealGrams(m.quantity, m.unit, f);
              return acc + (f ? (f.nutrition.calories * grams) / 100 : 0);
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
                        const grams = getMealGrams(meal.quantity, meal.unit, food);
                        const cals = food
                          ? Math.round((food.nutrition.calories * grams) / 100)
                          : null;
                        const protein = food
                          ? Math.round(((food.nutrition.protein * grams) / 100) * 10) / 10
                          : null;

                        const isGrams = !meal.unit || meal.unit.toLowerCase() === 'g' || meal.unit.toLowerCase() === 'gram';
                        const portionDisplay = isGrams
                          ? `${meal.quantity}g`
                          : `${meal.quantity} ${meal.unit}${grams !== meal.quantity ? ` (${Math.round(grams)}g)` : ''}`;

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
                                {portionDisplay}
                                {protein !== null && ` • ${protein}g protein`}
                              </p>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {cals !== null && (
                                <span className="font-mono text-xs font-semibold text-stone-700 dark:text-stone-300 mr-1">
                                  {cals} kcal
                                </span>
                              )}
                              <button
                                onClick={() => openEditMealModal(meal)}
                                className="p-1 text-stone-400 hover:text-[#1b3b2b] dark:hover:text-emerald-400 rounded-md transition-colors"
                                title="Edit meal"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
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

      {/* Add / Edit Meal Dialog */}
      <Modal
        isOpen={isMealModalOpen}
        onClose={() => setIsMealModalOpen(false)}
        title={editingMeal ? 'Edit Logged Meal' : `Log Meal: ${targetMealType}`}
        description={
          editingMeal
            ? 'Update the food item, meal type, portion quantity, or unit.'
            : 'Select a food item and specify portion size in grams or serving units.'
        }
        maxWidth="sm"
      >
        <form onSubmit={handleSaveMeal} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-1.5">
              Meal Category *
            </label>
            <select
              value={targetMealType}
              onChange={(e) => setTargetMealType(e.target.value as MealType)}
              className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 px-3.5 py-2 text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#1b3b2b]"
              required
            >
              {mealTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-1.5">
              Select Food Item *
            </label>
            <select
              value={selectedFoodId}
              onChange={(e) => handleFoodSelectChange(e.target.value)}
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

          {/* Unit & Quantity Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-1.5">
                Portion Unit *
              </label>
              <select
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
                className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-2 text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#1b3b2b]"
              >
                <option value="g">Grams (g)</option>
                {selectedFood?.nutrition?.servingUnit &&
                  selectedFood.nutrition.servingUnit.toLowerCase() !== 'g' && (
                    <option value={selectedFood.nutrition.servingUnit}>
                      {selectedFood.nutrition.servingUnit}{' '}
                      {selectedFood.nutrition.servingWeightGrams
                        ? `(≈${selectedFood.nutrition.servingWeightGrams}g)`
                        : ''}
                    </option>
                  )}
              </select>
            </div>

            <Input
              label={`Quantity (${selectedUnit}) *`}
              type="number"
              min={selectedUnit === 'g' ? '5' : '0.25'}
              step={selectedUnit === 'g' ? '5' : '0.5'}
              value={portionQuantity}
              onChange={(e) => setPortionQuantity(Number(e.target.value))}
              required
            />
          </div>

          {/* Real-time preview */}
          {selectedFood && (
            <div className="p-3 bg-stone-50 dark:bg-stone-900/70 rounded-lg border border-stone-200 dark:border-stone-800 text-xs flex items-center justify-between">
              <div>
                <span className="text-stone-500">Calculated portion:</span>{' '}
                <strong className="text-stone-800 dark:text-stone-200">{Math.round(modalGrams)}g</strong>
              </div>
              <div className="flex items-center gap-3 font-semibold">
                <span className="text-amber-600">{previewCalories} kcal</span>
                <span className="text-[#1b3b2b] dark:text-emerald-400">{previewProtein}g protein</span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-stone-100 dark:border-stone-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsMealModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {editingMeal ? 'Update Meal' : `Add to ${targetMealType}`}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

