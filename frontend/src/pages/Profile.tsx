import React, { useEffect, useState } from 'react';
import {
  User,
  Mail,
  Activity,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  Shield,
  LogOut,
  Loader2,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { userService } from '../services/userService';
import { AllergyDto, DietaryPreferenceDto, ProfileDto, UserProfileResponse } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Alert } from '../components/ui/Alert';

export const Profile: React.FC = () => {
  const { user, isDemoMode, updateUser, logout } = useAuth();

  // Physical attributes
  const [age, setAge] = useState<number | ''>(user?.profile?.age ?? '');
  const [weight, setWeight] = useState<number | ''>(user?.profile?.weight ?? '');
  const [height, setHeight] = useState<number | ''>(user?.profile?.height ?? '');
  const [activityLevel, setActivityLevel] = useState(
    user?.profile?.activityLevel || 'Active'
  );

  // Dietary Preferences
  const [preferences, setPreferences] = useState<DietaryPreferenceDto>({
    vegan: user?.dietaryPreference?.vegan ?? false,
    vegetarian: user?.dietaryPreference?.vegetarian ?? false,
    keto: user?.dietaryPreference?.keto ?? false,
    glutenFree: user?.dietaryPreference?.glutenFree ?? false,
    dairyFree: user?.dietaryPreference?.dairyFree ?? false,
  });

  // Allergies
  const [allergies, setAllergies] = useState<AllergyDto[]>(user?.allergies || []);
  const [newAllergyName, setNewAllergyName] = useState('');

  // Status flags
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);
  const [isAddingAllergy, setIsAddingAllergy] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setAge(user.profile?.age ?? '');
      setWeight(user.profile?.weight ?? '');
      setHeight(user.profile?.height ?? '');
      setActivityLevel(user.profile?.activityLevel || 'Active');
      setPreferences({
        vegan: user.dietaryPreference?.vegan ?? false,
        vegetarian: user.dietaryPreference?.vegetarian ?? false,
        keto: user.dietaryPreference?.keto ?? false,
        glutenFree: user.dietaryPreference?.glutenFree ?? false,
        dairyFree: user.dietaryPreference?.dairyFree ?? false,
      });
      setAllergies(user.allergies || []);
    }
  }, [user]);

  // Save Physical Profile (PUT /api/users/{userId})
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSavingProfile(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    const profileDto: ProfileDto = {
      age: age === '' ? undefined : Number(age),
      weight: weight === '' ? undefined : Number(weight),
      height: height === '' ? undefined : Number(height),
      activityLevel,
    };

    try {
      if (isDemoMode) {
        const updated: UserProfileResponse = {
          ...user,
          profile: profileDto,
        };
        updateUser(updated);
        setSuccessMessage('Physical profile updated in local demo state.');
      } else {
        const updatedProfile = await userService.updateProfile(user.id, profileDto);
        const updated: UserProfileResponse = {
          ...user,
          profile: updatedProfile,
        };
        updateUser(updated);
        setSuccessMessage('Physical profile updated via User Profile Service.');
      }
    } catch (err: any) {
      setErrorMessage('Failed to update profile. Check User Profile Service connection.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Save Dietary Preferences (PUT /api/users/{userId}/preferences)
  const handleSavePreferences = async () => {
    if (!user) return;

    setIsSavingPreferences(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      if (isDemoMode) {
        const updated: UserProfileResponse = {
          ...user,
          dietaryPreference: preferences,
        };
        updateUser(updated);
        setSuccessMessage('Dietary preferences updated in local demo state.');
      } else {
        const updatedPref = await userService.updatePreferences(user.id, preferences);
        const updated: UserProfileResponse = {
          ...user,
          dietaryPreference: updatedPref,
        };
        updateUser(updated);
        setSuccessMessage('Dietary preferences saved via User Profile Service.');
      }
    } catch (err: any) {
      setErrorMessage('Failed to update dietary preferences.');
    } finally {
      setIsSavingPreferences(false);
    }
  };

  // Add Allergy (POST /api/users/{userId}/allergies)
  const handleAddAllergy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newAllergyName.trim()) return;

    setIsAddingAllergy(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      if (isDemoMode) {
        const newAllergy: AllergyDto = {
          id: Date.now(),
          name: newAllergyName.trim(),
        };
        const updatedAllergies = [...allergies, newAllergy];
        setAllergies(updatedAllergies);
        updateUser({ ...user, allergies: updatedAllergies });
        setNewAllergyName('');
        setSuccessMessage(`Added "${newAllergy.name}" to allergies.`);
      } else {
        const created = await userService.addAllergy(user.id, {
          name: newAllergyName.trim(),
        });
        const updatedAllergies = [...allergies, created];
        setAllergies(updatedAllergies);
        updateUser({ ...user, allergies: updatedAllergies });
        setNewAllergyName('');
        setSuccessMessage(`Allergy "${created.name}" recorded.`);
      }
    } catch (err: any) {
      setErrorMessage('Failed to record allergy.');
    } finally {
      setIsAddingAllergy(false);
    }
  };

  // Delete Allergy (DELETE /api/users/{userId}/allergies/{allergyId})
  const handleDeleteAllergy = async (allergy: AllergyDto) => {
    if (!user || !allergy.id) return;

    try {
      if (isDemoMode) {
        const updated = allergies.filter((a) => a.id !== allergy.id);
        setAllergies(updated);
        updateUser({ ...user, allergies: updated });
        setSuccessMessage(`Removed "${allergy.name}".`);
      } else {
        await userService.deleteAllergy(user.id, allergy.id);
        const updated = allergies.filter((a) => a.id !== allergy.id);
        setAllergies(updated);
        updateUser({ ...user, allergies: updated });
        setSuccessMessage(`Allergy removed.`);
      }
    } catch (err: any) {
      setErrorMessage('Failed to delete allergy.');
    }
  };

  // BMI Calculation
  const bmi =
    weight && height
      ? (Number(weight) / Math.pow(Number(height) / 100, 2)).toFixed(1)
      : null;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
            User Profile & Biometrics
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-0.5">
            Synchronized with User Profile Service (MySQL Port 8080 via Gateway 8088).
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={logout}
          leftIcon={<LogOut className="w-4 h-4" />}
          className="self-start sm:self-auto text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
        >
          Sign Out
        </Button>
      </div>

      {successMessage && (
        <Alert type="success" onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      )}

      {errorMessage && (
        <Alert type="error" onClose={() => setErrorMessage(null)}>
          {errorMessage}
        </Alert>
      )}

      {/* Account Identity Card */}
      <Card>
        <CardHeader className="p-5 pb-3">
          <CardTitle className="text-base">Account Identity</CardTitle>
          <CardDescription>
            Core authentication identity stored with encrypted credentials in MySQL
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3 rounded-lg border border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50">
              <span className="block text-stone-400 font-medium mb-1">User ID</span>
              <span className="font-mono font-bold text-stone-900 dark:text-stone-100">
                #{user?.id ?? '1'}
              </span>
            </div>
            <div className="p-3 rounded-lg border border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50">
              <span className="block text-stone-400 font-medium mb-1">Full Name</span>
              <span className="font-bold text-stone-900 dark:text-stone-100">
                {user?.name || 'Not provided'}
              </span>
            </div>
            <div className="p-3 rounded-lg border border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50">
              <span className="block text-stone-400 font-medium mb-1">Email Address</span>
              <span className="font-bold text-stone-900 dark:text-stone-100 truncate block">
                {user?.email || 'user@example.com'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Physical Attributes Form */}
      <Card>
        <CardHeader className="p-5 pb-3">
          <CardTitle className="text-base">Physical Attributes</CardTitle>
          <CardDescription>
            Biometrics used for energy calculation (PUT /api/users/{'{userId}'})
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Age (Years)"
                type="number"
                min="1"
                max="120"
                value={age}
                onChange={(e) =>
                  setAge(e.target.value === '' ? '' : Number(e.target.value))
                }
                placeholder="28"
              />

              <Input
                label="Weight (kg)"
                type="number"
                step="0.1"
                min="20"
                max="300"
                value={weight}
                onChange={(e) =>
                  setWeight(e.target.value === '' ? '' : Number(e.target.value))
                }
                placeholder="68.5"
              />

              <Input
                label="Height (cm)"
                type="number"
                step="0.1"
                min="50"
                max="250"
                value={height}
                onChange={(e) =>
                  setHeight(e.target.value === '' ? '' : Number(e.target.value))
                }
                placeholder="174"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-1.5">
                  Activity Level
                </label>
                <select
                  value={activityLevel}
                  onChange={(e) => setActivityLevel(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 px-3.5 py-2 text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#1b3b2b]"
                >
                  <option value="Sedentary">Sedentary (Little to no exercise)</option>
                  <option value="Lightly Active">Lightly Active (1-3 days/week)</option>
                  <option value="Moderately Active">Moderately Active (3-5 days/week)</option>
                  <option value="Active">Active (6-7 days/week)</option>
                  <option value="Very Active">Very Active (Intense training)</option>
                </select>
              </div>

              {bmi && (
                <div className="p-3 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/60 flex items-center justify-between">
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-stone-400">
                      Calculated BMI
                    </span>
                    <span className="text-lg font-bold text-stone-900 dark:text-stone-100">
                      {bmi}
                    </span>
                  </div>
                  <Badge variant={Number(bmi) < 18.5 ? 'amber' : Number(bmi) <= 24.9 ? 'lime' : 'amber'}>
                    {Number(bmi) < 18.5
                      ? 'Underweight'
                      : Number(bmi) <= 24.9
                      ? 'Normal Range'
                      : 'Overweight'}
                  </Badge>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" isLoading={isSavingProfile} leftIcon={<Save className="w-4 h-4" />}>
                Save Biometrics
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Dietary Preferences Card */}
      <Card>
        <CardHeader className="p-5 pb-3">
          <CardTitle className="text-base">Dietary Preferences</CardTitle>
          <CardDescription>
            Dietary restrictions recorded via PUT /api/users/{'{userId}'}/preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { key: 'vegan', label: 'Vegan' },
              { key: 'vegetarian', label: 'Vegetarian' },
              { key: 'keto', label: 'Keto' },
              { key: 'glutenFree', label: 'Gluten-Free' },
              { key: 'dairyFree', label: 'Dairy-Free' },
            ].map(({ key, label }) => {
              const checked = !!preferences[key as keyof DietaryPreferenceDto];
              return (
                <label
                  key={key}
                  className="flex items-center gap-2.5 p-3 rounded-lg border border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800/40 cursor-pointer text-xs font-medium"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) =>
                      setPreferences({
                        ...preferences,
                        [key]: e.target.checked,
                      })
                    }
                    className="rounded border-stone-300 text-[#1b3b2b] focus:ring-[#1b3b2b]"
                  />
                  <span>{label}</span>
                </label>
              );
            })}
          </div>

          <div className="flex justify-end pt-4">
            <Button
              type="button"
              onClick={handleSavePreferences}
              isLoading={isSavingPreferences}
              leftIcon={<Save className="w-4 h-4" />}
            >
              Save Preferences
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Allergies Card */}
      <Card>
        <CardHeader className="p-5 pb-3">
          <CardTitle className="text-base">Known Allergies</CardTitle>
          <CardDescription>
            Managed through User Profile Service (/api/users/{'{userId}'}/allergies)
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          <form onSubmit={handleAddAllergy} className="flex gap-2 mb-4">
            <Input
              placeholder="Add allergy name (e.g. Peanuts, Shellfish, Gluten)..."
              value={newAllergyName}
              onChange={(e) => setNewAllergyName(e.target.value)}
              className="flex-1"
            />
            <Button
              type="submit"
              variant="secondary"
              isLoading={isAddingAllergy}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Add
            </Button>
          </form>

          {allergies.length === 0 ? (
            <p className="text-xs text-stone-400 py-3 text-center border border-dashed border-stone-100 dark:border-stone-800 rounded-lg">
              No allergies recorded for this account.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {allergies.map((allergy) => (
                <Badge
                  key={allergy.id || allergy.name}
                  variant="stone"
                  className="gap-2 py-1 px-3 text-xs"
                >
                  <span>{allergy.name}</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteAllergy(allergy)}
                    className="text-stone-400 hover:text-rose-600 transition-colors"
                    title="Remove allergy"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
