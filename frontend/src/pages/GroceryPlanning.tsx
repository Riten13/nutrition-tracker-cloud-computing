import React, { useEffect, useState } from 'react';
import {
  ShoppingCart,
  Plus,
  Check,
  Trash2,
  Edit2,
  DollarSign,
  CheckCircle2,
  Circle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { groceryService } from '../services/groceryService';
import { foodService } from '../services/foodService';
import {
  FoodResponse,
  GroceryItemResponse,
  GroceryListResponse,
} from '../types';
import {
  mockFoods,
  mockGroceryList,
} from '../services/mockData';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Alert } from '../components/ui/Alert';

export const GroceryPlanning: React.FC = () => {
  const { user, isDemoMode } = useAuth();

  const [groceryList, setGroceryList] = useState<GroceryListResponse | null>(null);
  const [foodsMap, setFoodsMap] = useState<Record<string, FoodResponse>>({});
  const [availableFoods, setAvailableFoods] = useState<FoodResponse[]>([]);
  const [estimatedCost, setEstimatedCost] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Add Item Modal
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [selectedFoodId, setSelectedFoodId] = useState('');
  const [itemQuantity, setItemQuantity] = useState<number>(1);
  const [itemUnit, setItemUnit] = useState('kg');
  const [itemPrice, setItemPrice] = useState<number>(150);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Item Modal
  const [isEditItemModalOpen, setIsEditItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<GroceryItemResponse | null>(null);
  const [editQuantity, setEditQuantity] = useState<number>(1);
  const [editUnit, setEditUnit] = useState('kg');
  const [editPrice, setEditPrice] = useState<number>(150);

  const loadGroceryData = async () => {
    if (!user) return;
    setIsLoading(true);
    setActionError(null);

    try {
      // 1. Fetch foods for item names
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

      // 2. Fetch active grocery list & estimated cost
      if (isDemoMode) {
        setGroceryList(mockGroceryList);
        const cost = (mockGroceryList.items || []).reduce(
          (acc, item) => acc + (item.estimatedPrice || 0) * item.quantity,
          0
        );
        setEstimatedCost(Math.round(cost * 100) / 100);
      } else {
        try {
          const listRes = await groceryService.getActiveGroceryList(user.id);
          setGroceryList(listRes);

          try {
            const costRes = await groceryService.getEstimatedCost(listRes.id);
            setEstimatedCost(costRes.estimatedCost);
          } catch {
            const computed = (listRes.items || []).reduce(
              (acc, item) => acc + (item.estimatedPrice || 0) * item.quantity,
              0
            );
            setEstimatedCost(Math.round(computed * 100) / 100);
          }
        } catch (listErr: any) {
          if (listErr.response?.status === 404) {
            setGroceryList(null);
            setEstimatedCost(0);
          } else {
            setGroceryList(mockGroceryList);
            setEstimatedCost(1350);
          }
        }
      }
    } catch (err: any) {
      setActionError('Could not load grocery list from Grocery Planning Service.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadGroceryData();
  }, [user, isDemoMode]);

  // Create list if none exists
  const handleCreateList = async () => {
    if (!user) return;
    setIsSubmitting(true);
    setActionError(null);
    try {
      if (isDemoMode) {
        const newList: GroceryListResponse = {
          id: `grocery_${Date.now()}`,
          userId: user.id,
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
          items: [],
        };
        setGroceryList(newList);
        setEstimatedCost(0);
        setActionSuccess('Created new active grocery list.');
      } else {
        const created = await groceryService.createGroceryList({ userId: user.id });
        setGroceryList(created);
        setEstimatedCost(0);
        setActionSuccess('Active grocery list created via Gateway.');
      }
    } catch (err: any) {
      setActionError('Failed to create grocery list. Check service health.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle item checked state
  const handleToggleChecked = async (item: GroceryItemResponse) => {
    if (!groceryList) return;
    const newCheckedState = !item.checked;

    try {
      if (isDemoMode) {
        const updatedItems = (groceryList.items || []).map((i) =>
          i.id === item.id ? { ...i, checked: newCheckedState } : i
        );
        setGroceryList({ ...groceryList, items: updatedItems });
      } else {
        await groceryService.updateGroceryItem(groceryList.id, item.id, {
          checked: newCheckedState,
        });
        const updatedItems = (groceryList.items || []).map((i) =>
          i.id === item.id ? { ...i, checked: newCheckedState } : i
        );
        setGroceryList({ ...groceryList, items: updatedItems });
      }
    } catch (err: any) {
      setActionError('Failed to update checked status on backend.');
    }
  };

  // Add Item to List
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groceryList || !selectedFoodId || itemQuantity <= 0) return;

    setIsSubmitting(true);
    setActionError(null);
    try {
      if (isDemoMode) {
        const newItem: GroceryItemResponse = {
          id: `gitem_${Date.now()}`,
          groceryListId: groceryList.id,
          foodId: selectedFoodId,
          quantity: itemQuantity,
          unit: itemUnit,
          checked: false,
          estimatedPrice: itemPrice > 0 ? itemPrice : undefined,
        };
        const updated = [...(groceryList.items || []), newItem];
        setGroceryList({ ...groceryList, items: updated });
        setEstimatedCost(
          (estimatedCost || 0) + (newItem.estimatedPrice || 0) * newItem.quantity
        );
        setActionSuccess('Added item to grocery list.');
      } else {
        await groceryService.addGroceryItem(groceryList.id, {
          foodId: selectedFoodId,
          quantity: itemQuantity,
          unit: itemUnit,
          estimatedPrice: itemPrice > 0 ? itemPrice : undefined,
        });
        await loadGroceryData();
        setActionSuccess('Item added via Grocery Planning Service.');
      }
      setIsAddItemModalOpen(false);
    } catch (err: any) {
      setActionError('Failed to add item to grocery list.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Item
  const handleDeleteItem = async (itemId: string) => {
    if (!groceryList) return;
    if (!window.confirm('Are you sure you want to delete this grocery item?')) return;

    try {
      if (isDemoMode) {
        const updated = (groceryList.items || []).filter((i) => i.id !== itemId);
        setGroceryList({ ...groceryList, items: updated });
        setActionSuccess('Item removed.');
      } else {
        await groceryService.deleteGroceryItem(groceryList.id, itemId);
        await loadGroceryData();
        setActionSuccess('Item removed from grocery list.');
      }
    } catch (err: any) {
      setActionError('Failed to delete item.');
    }
  };

  // Edit Item Modal Handlers
  const openEditModal = (item: GroceryItemResponse) => {
    setEditingItem(item);
    setEditQuantity(item.quantity);
    setEditUnit(item.unit);
    setEditPrice(item.estimatedPrice || 0);
    setIsEditItemModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groceryList || !editingItem) return;

    setIsSubmitting(true);
    setActionError(null);
    try {
      if (isDemoMode) {
        const updated = (groceryList.items || []).map((i) =>
          i.id === editingItem.id
            ? {
                ...i,
                quantity: editQuantity,
                unit: editUnit,
                estimatedPrice: editPrice,
              }
            : i
        );
        setGroceryList({ ...groceryList, items: updated });
        setActionSuccess('Item updated.');
      } else {
        await groceryService.updateGroceryItem(groceryList.id, editingItem.id, {
          quantity: editQuantity,
          unit: editUnit,
          estimatedPrice: editPrice,
        });
        await loadGroceryData();
        setActionSuccess('Item updated via Grocery Planning Service.');
      }
      setIsEditItemModalOpen(false);
      setEditingItem(null);
    } catch (err: any) {
      setActionError('Failed to update grocery item.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const items = groceryList?.items || [];
  const checkedItems = items.filter((i) => i.checked);
  const remainingItems = items.filter((i) => !i.checked);
  const progressPercent = items.length > 0 ? Math.round((checkedItems.length / items.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
            Grocery Planning & Checklist
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-0.5">
            Synchronized with Grocery Planning Service (Port 3002 via Gateway 8088).
          </p>
        </div>

        {groceryList && (
          <Button
            onClick={() => setIsAddItemModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
            className="self-start sm:self-auto"
          >
            Add Grocery Item
          </Button>
        )}
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

      {/* Progress & Cost Summary Card */}
      {groceryList && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="p-4 pb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                Shopping Progress
              </span>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-stone-900 dark:text-stone-100">
                  {checkedItems.length} / {items.length}
                </span>
                <span className="text-xs text-stone-400">items checked</span>
              </div>
              <div className="mt-3 w-full bg-stone-100 dark:bg-stone-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-[#1b3b2b] dark:bg-[#84cc16] h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="mt-2 text-[11px] text-stone-500">
                {progressPercent}% completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 pb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                Estimated Total Cost
              </span>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-stone-900 dark:text-stone-100">
                  ${estimatedCost !== null ? estimatedCost.toFixed(2) : '0.00'}
                </span>
                <span className="text-xs text-stone-400">total estimate</span>
              </div>
              <p className="mt-3 text-xs text-stone-500">
                Calculated live: Σ (estimatedPrice × quantity)
              </p>
            </CardContent>
          </Card>

          <Card className="sm:col-span-2 lg:col-span-1">
            <CardHeader className="p-4 pb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                Active List Status
              </span>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <div className="flex items-center gap-2">
                <Badge variant="forest">{groceryList.status}</Badge>
                <span className="text-xs text-stone-500">
                  ID: #{groceryList.id.substring(0, 10)}
                </span>
              </div>
              <p className="mt-3 text-[11px] text-stone-400">
                Created: {new Date(groceryList.createdAt || Date.now()).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Checklist Body */}
      {isLoading ? (
        <div className="py-16 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#1b3b2b] dark:text-emerald-400 mb-2" />
          <p className="text-xs text-stone-500">Loading grocery list from Gateway...</p>
        </div>
      ) : !groceryList ? (
        <Card className="p-12 text-center border-dashed">
          <ShoppingCart className="w-12 h-12 text-stone-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-stone-800 dark:text-stone-200">
            No Active Grocery List
          </h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1 mb-4">
            Create an active grocery list to organize your weekly pantry and fresh produce shopping.
          </p>
          <Button onClick={handleCreateList} isLoading={isSubmitting}>
            Create Active Grocery List
          </Button>
        </Card>
      ) : items.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <ShoppingCart className="w-12 h-12 text-stone-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-stone-800 dark:text-stone-200">
            Grocery list is empty
          </h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1 mb-4">
            Add food items to your grocery list to track purchase status while shopping.
          </p>
          <Button onClick={() => setIsAddItemModalOpen(true)}>
            Add First Item
          </Button>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Section 1: Remaining Items (To Buy) */}
          <Card>
            <CardHeader className="p-4 pb-2 border-b border-stone-100 dark:border-stone-800">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">
                  Items to Purchase ({remainingItems.length})
                </CardTitle>
                <span className="text-xs text-stone-400">Click circle to check off</span>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-3">
              {remainingItems.length === 0 ? (
                <div className="py-6 text-center text-xs text-stone-400">
                  All items checked off! Great job.
                </div>
              ) : (
                <div className="divide-y divide-stone-100 dark:divide-stone-800">
                  {remainingItems.map((item) => {
                    const food = foodsMap[item.foodId];
                    const foodName = food ? food.name : `Food #${item.foodId}`;
                    const lineTotal = item.estimatedPrice
                      ? (item.estimatedPrice * item.quantity).toFixed(2)
                      : null;

                    return (
                      <div
                        key={item.id}
                        className="py-2.5 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <button
                            onClick={() => handleToggleChecked(item)}
                            className="text-stone-400 hover:text-[#1b3b2b] dark:hover:text-[#84cc16] transition-colors cursor-pointer"
                            title="Mark as purchased"
                          >
                            <Circle className="w-5 h-5" />
                          </button>
                          <div className="truncate">
                            <span className="font-semibold text-stone-900 dark:text-stone-100">
                              {foodName}
                            </span>
                            <span className="ml-2 text-stone-500">
                              {item.quantity} {item.unit}
                            </span>
                            {food && (
                              <Badge variant="stone" className="ml-2 py-0 text-[10px]">
                                {food.category}
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          {lineTotal && (
                            <span className="font-mono text-stone-600 dark:text-stone-300">
                              ${lineTotal}
                            </span>
                          )}
                          <button
                            onClick={() => openEditModal(item)}
                            className="p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-md"
                            title="Edit quantity"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1 text-stone-400 hover:text-rose-600 rounded-md"
                            title="Remove item"
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

          {/* Section 2: Purchased Items */}
          {checkedItems.length > 0 && (
            <Card className="opacity-80">
              <CardHeader className="p-4 pb-2 border-b border-stone-100 dark:border-stone-800">
                <CardTitle className="text-sm font-semibold text-stone-500">
                  Purchased Items ({checkedItems.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-3">
                <div className="divide-y divide-stone-100 dark:divide-stone-800">
                  {checkedItems.map((item) => {
                    const food = foodsMap[item.foodId];
                    const foodName = food ? food.name : `Food #${item.foodId}`;

                    return (
                      <div
                        key={item.id}
                        className="py-2.5 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <button
                            onClick={() => handleToggleChecked(item)}
                            className="text-emerald-600 dark:text-emerald-400 transition-colors cursor-pointer"
                            title="Uncheck item"
                          >
                            <CheckCircle2 className="w-5 h-5" />
                          </button>
                          <div className="truncate line-through text-stone-400">
                            <span>{foodName}</span>
                            <span className="ml-2">
                              {item.quantity} {item.unit}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1 text-stone-400 hover:text-rose-600 rounded-md"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Modal 1: Add Item */}
      <Modal
        isOpen={isAddItemModalOpen}
        onClose={() => setIsAddItemModalOpen(false)}
        title="Add Grocery Item"
        description="Select a food and specify requested quantity for the active list."
        maxWidth="sm"
      >
        <form onSubmit={handleAddItem} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-1.5">
              Select Food *
            </label>
            <select
              value={selectedFoodId}
              onChange={(e) => setSelectedFoodId(e.target.value)}
              className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 px-3.5 py-2 text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#1b3b2b]"
              required
            >
              {availableFoods.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.category})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Quantity *"
              type="number"
              step="0.1"
              min="0.1"
              value={itemQuantity}
              onChange={(e) => setItemQuantity(Number(e.target.value))}
              required
            />
            <Input
              label="Unit *"
              value={itemUnit}
              onChange={(e) => setItemUnit(e.target.value)}
              placeholder="kg, pack, litre..."
              required
            />
          </div>

          <Input
            label="Estimated Price (per unit)"
            type="number"
            step="0.01"
            value={itemPrice}
            onChange={(e) => setItemPrice(Number(e.target.value))}
            placeholder="e.g. 150.00"
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-stone-100 dark:border-stone-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddItemModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Add to List
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal 2: Edit Item */}
      <Modal
        isOpen={isEditItemModalOpen}
        onClose={() => {
          setIsEditItemModalOpen(false);
          setEditingItem(null);
        }}
        title="Update Grocery Item"
        description="Modify quantity, unit, or estimated price."
        maxWidth="sm"
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Quantity *"
              type="number"
              step="0.1"
              min="0.1"
              value={editQuantity}
              onChange={(e) => setEditQuantity(Number(e.target.value))}
              required
            />
            <Input
              label="Unit *"
              value={editUnit}
              onChange={(e) => setEditUnit(e.target.value)}
              required
            />
          </div>

          <Input
            label="Estimated Price (per unit)"
            type="number"
            step="0.01"
            value={editPrice}
            onChange={(e) => setEditPrice(Number(e.target.value))}
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-stone-100 dark:border-stone-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsEditItemModalOpen(false);
                setEditingItem(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Update Item
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
