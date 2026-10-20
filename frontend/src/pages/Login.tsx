import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Activity, Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Alert } from '../components/ui/Alert';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, enableDemoMode, isDemoMode } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError('Please provide both email and password.');
      return;
    }

    setIsLoading(true);
    try {
      await login({ email, password });
      navigate('/');
    } catch (err: any) {
      if (err.response?.status === 400 || err.response?.status === 401) {
        setError('Invalid email or password. Please try again.');
      } else {
        setError(
          'Could not reach API Gateway at http://localhost:8088. You may use Demo Mode if services are not yet running.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = () => {
    enableDemoMode();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#fbfbf9] dark:bg-stone-950">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#1b3b2b] text-[#84cc16] mb-3 shadow-xs">
            <Activity className="w-6 h-6 text-[#84cc16]" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
            Nutrition Tracker
          </h1>
          <p className="mt-1.5 text-xs text-stone-500 dark:text-stone-400">
            Microservices Platform Authenticated Access
          </p>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 sm:p-8 shadow-xs">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
              Sign In
            </h2>
            <p className="text-xs text-stone-500 mt-1">
              Enter your credentials to access your daily nutrition data.
            </p>
          </div>

          {error && (
            <Alert type="error" className="mb-5">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="login-email"
              type="email"
              label="Email Address"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="w-4 h-4" />}
              required
            />

            <Input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              label="Password"
              placeholder="Enter your password"
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

            <Button
              type="submit"
              className="w-full mt-2"
              isLoading={isLoading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Sign In to Gateway
            </Button>
          </form>

          {/* Offline / Demo Explore option */}
          <div className="mt-6 pt-5 border-t border-stone-100 dark:border-stone-800">
            <Button
              type="button"
              variant="outline"
              className="w-full text-xs"
              onClick={handleDemoLogin}
              leftIcon={<ShieldCheck className="w-4 h-4 text-[#84cc16]" />}
            >
              Explore with Demo Account (Backend Offline Fallback)
            </Button>
          </div>

          <p className="mt-6 text-center text-xs text-stone-500">
            Do not have an account?{' '}
            <Link
              to="/register"
              className="font-semibold text-[#1b3b2b] dark:text-emerald-400 hover:underline"
            >
              Register here
            </Link>
          </p>
        </div>

        {/* Footer info */}
        <p className="mt-6 text-center text-[11px] text-stone-400">
          All client calls route through Spring Cloud Gateway on port 8088.
        </p>
      </div>
    </div>
  );
};
