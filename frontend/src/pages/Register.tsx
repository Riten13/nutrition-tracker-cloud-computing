import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Plus,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Alert } from '../components/ui/Alert';
import { Badge } from '../components/ui/Badge';

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const { register, enableDemoMode } = useAuth();

  // Core fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Profile fields
  const [age, setAge] = useState<number | ''>('');
  const [weight, setWeight] = useState<number | ''>('');
  const [height, setHeight] = useState<number | ''>('');
  const [activityLevel, setActivityLevel] = useState('Active');

  // Dietary Preferences
  const [vegan, setVegan] = useState(false);
  const [vegetarian, setVegetarian] = useState(false);
  const [keto, setKeto] = useState(false);
  const [glutenFree, setGlutenFree] = useState(false);
  const [dairyFree, setDairyFree] = useState(false);

  // Allergies
  const [allergies, setAllergies] = useState<string[]>([]);
  const [allergyInput, setAllergyInput] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleAddAllergy = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    const trimmed = allergyInput.trim();
    if (trimmed && !allergies.includes(trimmed)) {
      setAllergies([...allergies, trimmed]);
      setAllergyInput('');
    }
  };

  const handleRemoveAllergy = (nameToRemove: string) => {
    setAllergies(allergies.filter((a) => a !== nameToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Name, email, and password are required fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);
    try {
      await register({
        name: name.trim(),
        email: email.trim(),
        password,
        age: age === '' ? undefined : Number(age),
        weight: weight === '' ? undefined : Number(weight),
        height: height === '' ? undefined : Number(height),
        activityLevel,
        vegan,
        vegetarian,
        keto,
        glutenFree,
        dairyFree,
        allergies: allergies.length > 0 ? allergies : undefined,
      });
      navigate('/');
    } catch (err: any) {
      if (err.response?.status === 400) {
        setError(
          err.response?.data?.message ||
            'Registration failed. Email might already be registered.'
        );
      } else {
        setError(
          'Could not reach API Gateway at http://localhost:8088. You can use Demo Mode below to preview the platform.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-10 px-4 flex items-center justify-center bg-[#fbfbf9] dark:bg-stone-950">
      <div className="w-full max-w-xl">
        {/* Brand */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#1b3b2b] text-[#84cc16] mb-3 shadow-xs">
            <Activity className="w-6 h-6 text-[#84cc16]" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
            Create Nutrition Account
          </h1>
          <p className="mt-1 text-xs text-stone-500">
            Registered via User Profile Service & API Gateway
          </p>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 sm:p-8 shadow-xs">
          {error && (
            <Alert type="error" className="mb-5">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Account Credentials */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 pb-2 border-b border-stone-100 dark:border-stone-800">
                1. Account Credentials
              </h3>
              <div className="mt-3 space-y-3.5">
                <Input
                  id="reg-name"
                  label="Full Name *"
                  placeholder="e.g. Jane Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  leftIcon={<User className="w-4 h-4" />}
                  required
                />

                <Input
                  id="reg-email"
                  type="email"
                  label="Email Address *"
                  placeholder="user@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  leftIcon={<Mail className="w-4 h-4" />}
                  required
                />

                <Input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  label="Password (min 6 characters) *"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  leftIcon={<Lock className="w-4 h-4" />}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="cursor-pointer hover:text-stone-700 dark:hover:text-stone-200"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  }
                  required
                />
              </div>
            </div>

            {/* Physical Attributes */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 pb-2 border-b border-stone-100 dark:border-stone-800">
                2. Physical Profile
              </h3>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <Input
                  id="reg-age"
                  type="number"
                  min="1"
                  max="120"
                  label="Age"
                  placeholder="28"
                  value={age}
                  onChange={(e) =>
                    setAge(e.target.value === '' ? '' : Number(e.target.value))
                  }
                />

                <Input
                  id="reg-weight"
                  type="number"
                  step="0.1"
                  min="20"
                  max="300"
                  label="Weight (kg)"
                  placeholder="70"
                  value={weight}
                  onChange={(e) =>
                    setWeight(e.target.value === '' ? '' : Number(e.target.value))
                  }
                />

                <Input
                  id="reg-height"
                  type="number"
                  step="0.1"
                  min="50"
                  max="250"
                  label="Height (cm)"
                  placeholder="175"
                  value={height}
                  onChange={(e) =>
                    setHeight(e.target.value === '' ? '' : Number(e.target.value))
                  }
                />
              </div>

              <div className="mt-3">
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-1.5">
                  Activity Level
                </label>
                <select
                  value={activityLevel}
                  onChange={(e) => setActivityLevel(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 px-3.5 py-2 text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#1b3b2b]"
                >
                  <option value="Sedentary">Sedentary (Little to no exercise)</option>
                  <option value="Lightly Active">Lightly Active (Exercise 1-3 days/week)</option>
                  <option value="Moderately Active">Moderately Active (Exercise 3-5 days/week)</option>
                  <option value="Active">Active (Exercise 6-7 days/week)</option>
                  <option value="Very Active">Very Active (Intense training / physical job)</option>
                </select>
              </div>
            </div>

            {/* Dietary Preferences */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 pb-2 border-b border-stone-100 dark:border-stone-800">
                3. Dietary Preferences
              </h3>
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {[
                  { label: 'Vegan', state: vegan, setter: setVegan },
                  { label: 'Vegetarian', state: vegetarian, setter: setVegetarian },
                  { label: 'Keto', state: keto, setter: setKeto },
                  { label: 'Gluten-Free', state: glutenFree, setter: setGlutenFree },
                  { label: 'Dairy-Free', state: dairyFree, setter: setDairyFree },
                ].map((item) => (
                  <label
                    key={item.label}
                    className="flex items-center gap-2 p-2 rounded-lg border border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800/40 cursor-pointer text-xs font-medium text-stone-800 dark:text-stone-200"
                  >
                    <input
                      type="checkbox"
                      checked={item.state}
                      onChange={(e) => item.setter(e.target.checked)}
                      className="rounded border-stone-300 text-[#1b3b2b] focus:ring-[#1b3b2b]"
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Allergies */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 pb-2 border-b border-stone-100 dark:border-stone-800">
                4. Allergies
              </h3>
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Peanuts, Shellfish, Soy"
                  value={allergyInput}
                  onChange={(e) => setAllergyInput(e.target.value)}
                  onKeyDown={handleAddAllergy}
                  className="flex-1 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 px-3.5 py-2 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#1b3b2b]"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleAddAllergy}
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  Add
                </Button>
              </div>

              {allergies.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {allergies.map((allergy) => (
                    <Badge
                      key={allergy}
                      variant="stone"
                      className="gap-1 pr-1 py-1 text-xs"
                    >
                      {allergy}
                      <button
                        type="button"
                        onClick={() => handleRemoveAllergy(allergy)}
                        className="p-0.5 rounded-full hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              isLoading={isLoading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Complete Registration
            </Button>
          </form>

          {/* Demo Fallback */}
          <div className="mt-5 pt-4 border-t border-stone-100 dark:border-stone-800">
            <Button
              type="button"
              variant="outline"
              className="w-full text-xs"
              onClick={() => {
                enableDemoMode();
                navigate('/');
              }}
              leftIcon={<ShieldCheck className="w-4 h-4 text-[#84cc16]" />}
            >
              Skip & Preview in Demo Mode
            </Button>
          </div>

          <p className="mt-5 text-center text-xs text-stone-500">
            Already registered?{' '}
            <Link
              to="/login"
              className="font-semibold text-[#1b3b2b] dark:text-emerald-400 hover:underline"
            >
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
