import React, { useEffect, useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Filter,
  Flame,
  Dumbbell,
  Wheat,
  Droplet,
  Trash2,
  Edit2,
  CalendarPlus,
  ShoppingCart,
  Loader2,
  Check,
  Camera,
  Image as ImageIcon,
  Upload,
  Utensils,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { foodService } from '../services/foodService';
import { mealService } from '../services/mealService';
import { groceryService } from '../services/groceryService';
import { FoodRequest, FoodResponse, MealType } from '../types';
import { mockFoods } from '../services/mockData';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Alert } from '../components/ui/Alert';

export const Foods: React.FC = () => {
  const { user, token, isDemoMode } = useAuth();

  // Determine if the current authenticated user has administrative privileges
  const isAdmin = useMemo(() => {
    if (user?.role === 'ROLE_ADMIN' || user?.role === 'ADMIN') return true;
    if (token && token.includes('.')) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.role === 'ROLE_ADMIN' || payload.role === 'ADMIN') return true;
      } catch {
        // malformed token
      }
    }
    return false;
  }, [user, token]);

  // All authenticated users can manage foods and images
  const canManageFoods = useMemo(() => {
    return !!user || isDemoMode;
  }, [user, isDemoMode]);

  const [foods, setFoods] = useState<FoodResponse[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Modals
  const [isAddFoodOpen, setIsAddFoodOpen] = useState(false);
  const [isEditFoodOpen, setIsEditFoodOpen] = useState(false);
  const [editingFood, setEditingFood] = useState<FoodResponse | null>(null);
  const [isAddToMealOpen, setIsAddToMealOpen] = useState(false);
  const [isAddToGroceryOpen, setIsAddToGroceryOpen] = useState(false);
  const [targetFood, setTargetFood] = useState<FoodResponse | null>(null);

  // Image Upload Modal states
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [imageTargetFood, setImageTargetFood] = useState<FoodResponse | null>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);

  // Form states for Food Creation/Editing
  const [foodFormName, setFoodFormName] = useState('');
  const [foodFormCategory, setFoodFormCategory] = useState('Vegetables');
  const [foodFormDescription, setFoodFormDescription] = useState('');
  const [foodFormServingSize, setFoodFormServingSize] = useState<number>(100);
  const [foodFormServingUnit, setFoodFormServingUnit] = useState('g');
  const [foodFormCalories, setFoodFormCalories] = useState<number>(100);
  const [foodFormProtein, setFoodFormProtein] = useState<number>(5);
  const [foodFormCarbs, setFoodFormCarbs] = useState<number>(10);
  const [foodFormFat, setFoodFormFat] = useState<number>(2);
  const [foodFormFiber, setFoodFormFiber] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state for Add To Meal Plan
  const [mealQuantity, setMealQuantity] = useState<number>(150);
  const [mealType, setMealType] = useState<MealType>('LUNCH');

  // Form state for Add To Grocery
  const [groceryQuantity, setGroceryQuantity] = useState<number>(1);
  const [groceryUnit, setGroceryUnit] = useState('kg');
  const [groceryPrice, setGroceryPrice] = useState<number>(120);

  // Fetch foods with debounced search and category
  const loadFoods = async (search?: string, category?: string) => {
    setIsLoading(true);
    setActionError(null);
    try {
      if (isDemoMode) {
        let filtered = [...mockFoods];
        if (search && search.trim()) {
          filtered = filtered.filter((f) =>
            f.name.toLowerCase().includes(search.toLowerCase())
          );
        }
        if (category && category !== 'ALL') {
          filtered = filtered.filter(
            (f) => f.category.toLowerCase() === category.toLowerCase()
          );
        }
        setFoods(filtered);
      } else {
        const cat = category === 'ALL' ? undefined : category;
        const result = await foodService.getFoods(search, cat);
        setFoods(result);
      }
    } catch (err: any) {
      console.error('Food Database Service API call failed:', err);
      setActionError(
        err.response?.data?.message ||
        err.message ||
        'Failed to load foods from Food Database Service. Please check backend connection.'
      );
      setFoods([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      loadFoods(searchTerm, selectedCategory);
    }, 250);
    return () => clearTimeout(handler);
  }, [searchTerm, selectedCategory, isDemoMode]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    const defaultCats = ['Vegetables', 'Grains', 'Proteins', 'Dairy', 'Snacks', 'Beverages', 'Legumes'];
    defaultCats.forEach((c) => cats.add(c));
    foods.forEach((f) => {
      if (f.category) cats.add(f.category);
    });
    return ['ALL', ...Array.from(cats)];
  }, [foods]);

  const openCreateModal = () => {
    setFoodFormName('');
    setFoodFormCategory('Vegetables');
    setFoodFormDescription('');
    setFoodFormServingSize(100);
    setFoodFormServingUnit('g');
    setFoodFormCalories(120);
    setFoodFormProtein(4);
    setFoodFormCarbs(15);
    setFoodFormFat(2);
    setFoodFormFiber(2);
    setIsAddFoodOpen(true);
  };

  const openEditModal = (food: FoodResponse) => {
    setEditingFood(food);
    setFoodFormName(food.name);
    setFoodFormCategory(food.category);
    setFoodFormDescription(food.description || '');
    setFoodFormServingSize(food.nutrition?.servingSize || 100);
    setFoodFormServingUnit(food.nutrition?.servingUnit || 'g');
    setFoodFormCalories(food.nutrition?.calories || 0);
    setFoodFormProtein(food.nutrition?.protein || 0);
    setFoodFormCarbs(food.nutrition?.carbs || 0);
    setFoodFormFat(food.nutrition?.fat || 0);
    setFoodFormFiber(food.nutrition?.fiber || 0);
    setIsEditFoodOpen(true);
  };

  const openImageModal = (food: FoodResponse) => {
    setImageTargetFood(food);
    setSelectedImageFile(null);
    setImagePreviewUrl(food.imageUrl || null);
    setImageUploadError(null);
    setIsImageModalOpen(true);
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageUploadError(null);

    // Validate type (JPG, PNG, WebP)
    const validMimes = ['image/jpeg', 'image/png', 'image/webp'];
    const validExtensions = /\.(jpe?g|png|webp)$/i;
    if (!validMimes.includes(file.type) && !validExtensions.test(file.name)) {
      setImageUploadError('Invalid format. Only JPG, PNG, and WebP images are allowed.');
      return;
    }

    // Validate size (max 5 MB)
    if (file.size > 5 * 1024 * 1024) {
      setImageUploadError(
        `File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds maximum allowed limit of 5 MB.`
      );
      return;
    }

    setSelectedImageFile(file);
    const objectUrl = URL.createObjectURL(file);
    setImagePreviewUrl(objectUrl);
  };

  const handleUploadImage = async () => {
    if (!imageTargetFood || !selectedImageFile) return;

    setIsUploadingImage(true);
    setImageUploadError(null);

    try {
      if (isDemoMode) {
        const updatedFood: FoodResponse = {
          ...imageTargetFood,
          imageKey: `food-images/demo-${Date.now()}`,
          imageUrl: imagePreviewUrl || undefined,
        };
        setFoods((prev) => prev.map((f) => (f.id === updatedFood.id ? updatedFood : f)));
        setActionSuccess(`Simulated image upload for "${imageTargetFood.name}" in demo mode.`);
        setIsImageModalOpen(false);
      } else {
        const updatedFood = await foodService.uploadFoodImage(imageTargetFood.id, selectedImageFile);
        setFoods((prev) => prev.map((f) => (f.id === updatedFood.id ? updatedFood : f)));
        setActionSuccess(`Image uploaded to S3 and linked to "${imageTargetFood.name}".`);
        setIsImageModalOpen(false);
      }
    } catch (err: any) {
      console.error('Food image upload failed:', err);
      setImageUploadError(
        err.response?.data?.message ||
        err.message ||
        'Failed to upload image to S3 bucket. Verify AWS credentials and permissions.'
      );
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleDeleteImage = async () => {
    if (!imageTargetFood) return;
    if (!window.confirm(`Are you sure you want to delete the image for "${imageTargetFood.name}" from S3?`)) return;

    setIsUploadingImage(true);
    setImageUploadError(null);

    try {
      if (isDemoMode) {
        const updatedFood: FoodResponse = {
          ...imageTargetFood,
          imageKey: undefined,
          imageUrl: undefined,
        };
        setFoods((prev) => prev.map((f) => (f.id === updatedFood.id ? updatedFood : f)));
        setActionSuccess(`Image removed for "${imageTargetFood.name}" in demo mode.`);
        setIsImageModalOpen(false);
      } else {
        const updatedFood = await foodService.deleteFoodImage(imageTargetFood.id);
        setFoods((prev) => prev.map((f) => (f.id === updatedFood.id ? updatedFood : f)));
        setActionSuccess(`Image removed from Amazon S3 for "${imageTargetFood.name}".`);
        setIsImageModalOpen(false);
      }
    } catch (err: any) {
      console.error('Food image delete failed:', err);
      setImageUploadError(
        err.response?.data?.message ||
        err.message ||
        'Failed to delete image from S3.'
      );
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSaveFood = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foodFormName.trim()) return;

    setIsSubmitting(true);
    const requestPayload: FoodRequest = {
      name: foodFormName.trim(),
      category: foodFormCategory,
      description: foodFormDescription,
      nutrition: {
        servingSize: Number(foodFormServingSize),
        servingUnit: foodFormServingUnit,
        calories: Number(foodFormCalories),
        protein: Number(foodFormProtein),
        carbs: Number(foodFormCarbs),
        fat: Number(foodFormFat),
        fiber: Number(foodFormFiber),
      },
    };

    try {
      if (isDemoMode) {
        if (editingFood) {
          setFoods(
            foods.map((f) =>
              f.id === editingFood.id ? { ...f, ...requestPayload } : f
            )
          );
          setActionSuccess(`Updated "${foodFormName}" in local state.`);
        } else {
          const newFood: FoodResponse = {
            id: `food_${Date.now()}`,
            ...requestPayload,
          };
          setFoods([newFood, ...foods]);
          setActionSuccess(`Added "${foodFormName}" successfully.`);
        }
      } else {
        if (editingFood) {
          const updated = await foodService.updateFood(editingFood.id, requestPayload);
          setFoods(foods.map((f) => (f.id === updated.id ? updated : f)));
          setActionSuccess(`Updated "${foodFormName}" via API Gateway.`);
        } else {
          const created = await foodService.addFood(requestPayload);
          setFoods([created, ...foods]);
          setActionSuccess(`Added "${foodFormName}" via API Gateway.`);
        }
      }
      setIsAddFoodOpen(false);
      setIsEditFoodOpen(false);
      setEditingFood(null);
    } catch (err: any) {
      setActionError('Failed to save food record through API Gateway.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteFood = async (food: FoodResponse) => {
    if (!window.confirm(`Are you sure you want to delete "${food.name}"?`)) return;

    try {
      if (isDemoMode) {
        setFoods(foods.filter((f) => f.id !== food.id));
        setActionSuccess(`Removed "${food.name}".`);
      } else {
        await foodService.deleteFood(food.id);
        setFoods(foods.filter((f) => f.id !== food.id));
        setActionSuccess(`Deleted "${food.name}" via API Gateway.`);
      }
    } catch (err: any) {
      setActionError(`Could not delete "${food.name}". Check service permissions.`);
    }
  };

  // Add to Meal Plan
  const handleAddToMealPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetFood || !user) return;

    setIsSubmitting(true);
    setActionError(null);
    try {
      if (isDemoMode) {
        setActionSuccess(
          `Added ${mealQuantity}g of ${targetFood.name} to ${mealType} in Demo Plan.`
        );
      } else {
        // Fetch or create user's plan
        let plan;
        try {
          plan = await mealService.getMealPlan(user.id);
        } catch {
          plan = await mealService.createMealPlan({
            userId: user.id,
            planDate: new Date().toISOString().split('T')[0],
          });
        }

        await mealService.addMeal(plan.id, {
          foodId: targetFood.id,
          mealType,
          quantity: Number(mealQuantity),
        });
        setActionSuccess(
          `Logged ${mealQuantity}g of ${targetFood.name} to ${mealType} via Gateway.`
        );
      }
      setIsAddToMealOpen(false);
      setTargetFood(null);
    } catch (err: any) {
      setActionError(
        'Failed to add meal to active plan. Verify Meal Planning Service is up on Eureka.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add to Grocery List
  const handleAddToGrocery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetFood || !user) return;

    setIsSubmitting(true);
    setActionError(null);
    try {
      if (isDemoMode) {
        setActionSuccess(
          `Added ${groceryQuantity} ${groceryUnit} of ${targetFood.name} to Grocery List.`
        );
      } else {
        let list;
        try {
          list = await groceryService.getActiveGroceryList(user.id);
        } catch {
          list = await groceryService.createGroceryList({ userId: user.id });
        }

        await groceryService.addGroceryItem(list.id, {
          foodId: targetFood.id,
          quantity: Number(groceryQuantity),
          unit: groceryUnit,
          estimatedPrice: groceryPrice ? Number(groceryPrice) : undefined,
        });
        setActionSuccess(`Added ${targetFood.name} to Grocery List.`);
      }
      setIsAddToGroceryOpen(false);
      setTargetFood(null);
    } catch (err: any) {
      setActionError(
        'Failed to add item to grocery list. Verify Grocery Planning Service is running.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
            Food & Nutrition Master Database
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-0.5">
            Master records stored in MongoDB Atlas with food imagery backed by Amazon S3.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {isAdmin && (
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              Admin Mode
            </span>
          )}
          <Button
            onClick={openCreateModal}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add Food Item
          </Button>
        </div>
      </div>

      {isDemoMode && (
        <div className="text-xs font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 p-3 rounded-lg border border-amber-200 dark:border-amber-800 flex items-center justify-between">
          <span>⚠️ <strong>Demo Mode Active:</strong> Displaying simulated food items and images. Added foods or image uploads will update local state only.</span>
        </div>
      )}

      {actionSuccess && (
        <Alert
          type="success"
          onClose={() => setActionSuccess(null)}
          className="animate-in fade-in-0"
        >
          {actionSuccess}
        </Alert>
      )}

      {actionError && (
        <Alert
          type="error"
          onClose={() => setActionError(null)}
          className="animate-in fade-in-0"
        >
          {actionError}
        </Alert>
      )}

      {/* Filter & Search Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="Search food by name (e.g. Chicken, Oatmeal, Salmon)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#1b3b2b]"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              <Filter className="w-3.5 h-3.5 text-stone-400 shrink-0 ml-1 mr-1" />
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-[#1b3b2b] text-white dark:bg-[#2d5f47]'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Foods Grid / List */}
      {isLoading ? (
        <div className="py-16 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#1b3b2b] dark:text-emerald-400 mb-2" />
          <p className="text-xs text-stone-500">Querying Food Database Service via Gateway...</p>
        </div>
      ) : foods.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <Search className="w-10 h-10 text-stone-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-stone-800 dark:text-stone-200">
            No foods found
          </h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1 mb-4">
            No items matched "{searchTerm}". Try clearing your filters or add a new food item.
          </p>
          <Button size="sm" variant="outline" onClick={() => { setSearchTerm(''); setSelectedCategory('ALL'); }}>
            Clear Search Filter
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {foods.map((food) => (
            <Card
              key={food.id}
              className="flex flex-col justify-between overflow-hidden hover:border-stone-300 dark:hover:border-stone-700 transition-colors shadow-sm"
            >
              {/* Food Image Banner with Placeholder & Admin Overlay */}
              <div className="relative h-44 w-full overflow-hidden bg-stone-100 dark:bg-stone-800/80 flex items-center justify-center border-b border-stone-100 dark:border-stone-800">
                {food.imageUrl ? (
                  <img
                    src={food.imageUrl}
                    alt={food.name}
                    className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                      const placeholder = (e.target as HTMLElement).nextElementSibling;
                      if (placeholder) (placeholder as HTMLElement).classList.remove('hidden');
                    }}
                  />
                ) : null}
                <div
                  className={`w-full h-full flex flex-col items-center justify-center text-stone-400 dark:text-stone-500 bg-gradient-to-br from-stone-50 to-stone-100 dark:from-stone-900/60 dark:to-stone-800/60 ${
                    food.imageUrl ? 'hidden' : 'flex'
                  }`}
                >
                  <Utensils className="w-8 h-8 mb-1.5 opacity-30 text-stone-500" />
                  <span className="text-xs font-medium text-stone-400 dark:text-stone-500">No image available</span>
                </div>

                {/* Category Pill over image */}
                <div className="absolute top-2.5 left-2.5">
                  <Badge variant="lime" className="shadow-sm backdrop-blur-md bg-white/95 dark:bg-stone-900/95 font-medium">
                    {food.category}
                  </Badge>
                </div>

                {/* Image Control over image */}
                {canManageFoods && (
                  <button
                    onClick={() => openImageModal(food)}
                    className="absolute top-2.5 right-2.5 px-2 py-1 rounded-md bg-stone-900/80 hover:bg-stone-900 text-white text-[11px] font-medium backdrop-blur-md transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                    title="Upload or change image"
                  >
                    <Camera className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{food.imageUrl ? 'Change' : 'Upload'}</span>
                  </button>
                )}
              </div>

              <CardHeader className="p-4 pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base font-semibold">
                      {food.name}
                    </CardTitle>
                    {food.imageKey && (
                      <span className="text-[10px] text-stone-400 font-mono flex items-center gap-1 mt-0.5">
                        <Check className="w-2.5 h-2.5 text-emerald-500 inline" /> S3 Stored
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {canManageFoods && (
                      <button
                        onClick={() => openImageModal(food)}
                        className="p-1.5 text-stone-400 hover:text-emerald-600 rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
                        title="Upload/Manage image"
                      >
                        <Camera className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => openEditModal(food)}
                      className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-md hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                      title="Edit food"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteFood(food)}
                      className="p-1.5 text-stone-400 hover:text-rose-600 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                      title="Delete food"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {food.description && (
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-2 line-clamp-2">
                    {food.description}
                  </p>
                )}
              </CardHeader>

              <CardContent className="p-4 pt-1">
                {/* Nutrition Highlights Grid */}
                <div className="mt-2 p-2.5 rounded-lg bg-stone-50 dark:bg-stone-900/60 border border-stone-100 dark:border-stone-800 grid grid-cols-4 gap-1 text-center">
                  <div>
                    <span className="block text-[10px] uppercase font-semibold text-stone-400">
                      Energy
                    </span>
                    <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
                      {food.nutrition?.calories ?? 0}
                    </span>
                    <span className="text-[10px] text-stone-400">kcal</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase font-semibold text-[#1b3b2b] dark:text-emerald-400">
                      Protein
                    </span>
                    <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
                      {food.nutrition?.protein ?? 0}g
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase font-semibold text-lime-700 dark:text-lime-400">
                      Carbs
                    </span>
                    <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
                      {food.nutrition?.carbs ?? 0}g
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase font-semibold text-amber-600 dark:text-amber-400">
                      Fat
                    </span>
                    <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
                      {food.nutrition?.fat ?? 0}g
                    </span>
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-between text-[11px] text-stone-400">
                  <span>
                    Per {food.nutrition?.servingSize ?? 100}
                    {food.nutrition?.servingUnit ?? 'g'}
                    {food.nutrition?.servingWeightGrams && food.nutrition?.servingUnit !== 'g'
                      ? ` (${food.nutrition.servingWeightGrams}g)`
                      : ''}
                  </span>
                  {food.nutrition?.fiber !== undefined && (
                    <span>Fiber: {food.nutrition.fiber}g</span>
                  )}
                </div>

                {/* Direct Action Buttons */}
                <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800 grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs py-1"
                    onClick={() => {
                      setTargetFood(food);
                      setIsAddToMealOpen(true);
                    }}
                    leftIcon={<CalendarPlus className="w-3.5 h-3.5 text-[#1b3b2b] dark:text-emerald-400" />}
                  >
                    Add to Meal
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs py-1"
                    onClick={() => {
                      setTargetFood(food);
                      setIsAddToGroceryOpen(true);
                    }}
                    leftIcon={<ShoppingCart className="w-3.5 h-3.5 text-amber-600" />}
                  >
                    To Grocery
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal 1: Add or Edit Food Item */}
      <Modal
        isOpen={isAddFoodOpen || isEditFoodOpen}
        onClose={() => {
          setIsAddFoodOpen(false);
          setIsEditFoodOpen(false);
          setEditingFood(null);
        }}
        title={editingFood ? 'Edit Food Item' : 'Add New Food to Master Database'}
        description="Creates or updates master food and nutrition data in MongoDB Atlas."
        maxWidth="lg"
      >
        <form onSubmit={handleSaveFood} className="space-y-4">
          <Input
            label="Food Name *"
            placeholder="e.g. Skinless Turkey Breast"
            value={foodFormName}
            onChange={(e) => setFoodFormName(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-1.5">
                Category
              </label>
              <input
                type="text"
                placeholder="Poultry, Seafood, Grains..."
                value={foodFormCategory}
                onChange={(e) => setFoodFormCategory(e.target.value)}
                className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 px-3.5 py-2 text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#1b3b2b]"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Serving Size"
                type="number"
                value={foodFormServingSize}
                onChange={(e) => setFoodFormServingSize(Number(e.target.value))}
                required
              />
              <Input
                label="Unit"
                value={foodFormServingUnit}
                onChange={(e) => setFoodFormServingUnit(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-1.5">
              Description
            </label>
            <textarea
              rows={2}
              value={foodFormDescription}
              onChange={(e) => setFoodFormDescription(e.target.value)}
              placeholder="Brief description of the item"
              className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 px-3.5 py-2 text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#1b3b2b]"
            />
          </div>

          <div className="pt-2 border-t border-stone-100 dark:border-stone-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-2">
              Nutrition Values (Per Serving)
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <Input
                label="Calories (kcal)"
                type="number"
                step="0.1"
                value={foodFormCalories}
                onChange={(e) => setFoodFormCalories(Number(e.target.value))}
                required
              />
              <Input
                label="Protein (g)"
                type="number"
                step="0.1"
                value={foodFormProtein}
                onChange={(e) => setFoodFormProtein(Number(e.target.value))}
                required
              />
              <Input
                label="Carbs (g)"
                type="number"
                step="0.1"
                value={foodFormCarbs}
                onChange={(e) => setFoodFormCarbs(Number(e.target.value))}
                required
              />
              <Input
                label="Fat (g)"
                type="number"
                step="0.1"
                value={foodFormFat}
                onChange={(e) => setFoodFormFat(Number(e.target.value))}
                required
              />
              <Input
                label="Fiber (g)"
                type="number"
                step="0.1"
                value={foodFormFiber}
                onChange={(e) => setFoodFormFiber(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-stone-100 dark:border-stone-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsAddFoodOpen(false);
                setIsEditFoodOpen(false);
                setEditingFood(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {editingFood ? 'Update Food' : 'Save Food'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal 2: Add Food to Meal Plan */}
      <Modal
        isOpen={isAddToMealOpen}
        onClose={() => {
          setIsAddToMealOpen(false);
          setTargetFood(null);
        }}
        title={`Add to Meal Plan: ${targetFood?.name || ''}`}
        description="Scales nutrition live via Meal Planning Service based on grams logged."
        maxWidth="sm"
      >
        <form onSubmit={handleAddToMealPlan} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-1.5">
              Meal Timing
            </label>
            <select
              value={mealType}
              onChange={(e) => setMealType(e.target.value as MealType)}
              className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 px-3.5 py-2 text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#1b3b2b]"
            >
              <option value="BREAKFAST">Breakfast</option>
              <option value="LUNCH">Lunch</option>
              <option value="DINNER">Dinner</option>
              <option value="SNACK">Snack</option>
            </select>
          </div>

          <Input
            label="Portion Quantity (Grams) *"
            type="number"
            min="5"
            step="5"
            value={mealQuantity}
            onChange={(e) => setMealQuantity(Number(e.target.value))}
            helperText={
              targetFood
                ? `Approx. ${Math.round(
                    ((targetFood.nutrition?.calories || 0) * mealQuantity) / 100
                  )} kcal`
                : ''
            }
            required
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-stone-100 dark:border-stone-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddToMealOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Add to Plan
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal 3: Add Food to Grocery List */}
      <Modal
        isOpen={isAddToGroceryOpen}
        onClose={() => {
          setIsAddToGroceryOpen(false);
          setTargetFood(null);
        }}
        title={`Add to Grocery List: ${targetFood?.name || ''}`}
        description="Persists to active grocery list via Grocery Planning Service."
        maxWidth="sm"
      >
        <form onSubmit={handleAddToGrocery} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Quantity *"
              type="number"
              step="0.1"
              min="0.1"
              value={groceryQuantity}
              onChange={(e) => setGroceryQuantity(Number(e.target.value))}
              required
            />
            <Input
              label="Unit *"
              value={groceryUnit}
              onChange={(e) => setGroceryUnit(e.target.value)}
              placeholder="kg, bunch, pack..."
              required
            />
          </div>

          <Input
            label="Estimated Price (per unit)"
            type="number"
            step="0.01"
            value={groceryPrice}
            onChange={(e) => setGroceryPrice(Number(e.target.value))}
            placeholder="e.g. 150.00"
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-stone-100 dark:border-stone-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddToGroceryOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Add to Grocery
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal 4: Manage Food Image */}
      <Modal
        isOpen={isImageModalOpen}
        onClose={() => {
          if (!isUploadingImage) {
            setIsImageModalOpen(false);
            setImageTargetFood(null);
            setSelectedImageFile(null);
            setImagePreviewUrl(null);
            setImageUploadError(null);
          }
        }}
        title={`Manage Food Image: ${imageTargetFood?.name || ''}`}
        description="Upload a photo (JPG, PNG, WebP — max 5 MB). The image binary is securely stored in Amazon S3 and served via temporary presigned URLs."
        maxWidth="md"
      >
        <div className="space-y-4">
          {imageUploadError && (
            <Alert type="error" onClose={() => setImageUploadError(null)}>
              {imageUploadError}
            </Alert>
          )}

          {/* Image Preview Box */}
          <div className="rounded-xl border border-stone-200 dark:border-stone-800 overflow-hidden bg-stone-50 dark:bg-stone-900 flex flex-col items-center justify-center p-4">
            {imagePreviewUrl ? (
              <div className="relative w-full max-h-64 flex items-center justify-center overflow-hidden rounded-lg">
                <img
                  src={imagePreviewUrl}
                  alt="Preview"
                  className="max-h-64 w-auto object-contain rounded-lg shadow-sm"
                />
              </div>
            ) : (
              <div className="py-10 text-center text-stone-400 dark:text-stone-500">
                <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-40 text-stone-400" />
                <p className="text-xs font-medium">No image currently assigned</p>
                <p className="text-[11px] text-stone-400 mt-0.5">Select a photo below to preview and upload to S3.</p>
              </div>
            )}

            {selectedImageFile && (
              <div className="mt-3 text-xs text-stone-500 dark:text-stone-400 flex items-center gap-2">
                <span className="font-semibold text-stone-700 dark:text-stone-300">{selectedImageFile.name}</span>
                <span>({(selectedImageFile.size / (1024 * 1024)).toFixed(2)} MB)</span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedImageFile(null);
                    setImagePreviewUrl(imageTargetFood?.imageUrl || null);
                  }}
                  className="text-rose-500 hover:text-rose-700 text-xs underline cursor-pointer ml-1"
                >
                  Clear selection
                </button>
              </div>
            )}
          </div>

          {/* File Input Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-1.5">
              Choose Image File (JPG, PNG, WebP — Max 5 MB)
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageFileChange}
              disabled={isUploadingImage}
              className="w-full text-xs text-stone-600 dark:text-stone-300 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#1b3b2b] file:text-white hover:file:bg-[#2d5f47] file:cursor-pointer border border-stone-200 dark:border-stone-800 rounded-lg p-1.5 bg-white dark:bg-stone-900"
            />
            <p className="text-[11px] text-stone-400 mt-1">
              Images are validated by binary magic bytes and stored in private S3 bucket{' '}
              <code className="text-[10px] bg-stone-100 dark:bg-stone-800 px-1 py-0.5 rounded font-mono">
                nutrition-tracker-food-images-2026-new
              </code>
              . S3 object key is saved to MongoDB.
            </p>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-stone-100 dark:border-stone-800">
            <div>
              {imageTargetFood?.imageKey && (
                <Button
                  type="button"
                  variant="outline"
                  className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs"
                  onClick={handleDeleteImage}
                  isLoading={isUploadingImage}
                  leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                >
                  Remove S3 Image
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={isUploadingImage}
                onClick={() => {
                  setIsImageModalOpen(false);
                  setImageTargetFood(null);
                  setSelectedImageFile(null);
                  setImagePreviewUrl(null);
                  setImageUploadError(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={!selectedImageFile || isUploadingImage}
                isLoading={isUploadingImage}
                onClick={handleUploadImage}
                leftIcon={<Upload className="w-4 h-4" />}
              >
                {imageTargetFood?.imageKey ? 'Replace Image' : 'Upload Image'}
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

