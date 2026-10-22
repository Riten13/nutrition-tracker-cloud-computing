import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthResponse, LoginRequest, RegisterRequest, UserProfileResponse } from '../types';
import { authService } from '../services/authService';
import { userService } from '../services/userService';
import { mockUser } from '../services/mockData';
import api from '../services/api';

interface AuthContextType {
  user: UserProfileResponse | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isDemoMode: boolean;
  isBackendConnected: boolean | null;
  login: (credentials: LoginRequest, allowDemoFallback?: boolean) => Promise<void>;
  register: (payload: RegisterRequest, allowDemoFallback?: boolean) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  updateUser: (user: UserProfileResponse) => void;
  enableDemoMode: () => void;
  disableDemoMode: () => void;
  checkGatewayStatus: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfileResponse | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    return localStorage.getItem('nutrition_demo_mode') === 'true';
  });
  const [isBackendConnected, setIsBackendConnected] = useState<boolean | null>(null);

  // Check API Gateway connectivity on load
  const checkGatewayStatus = async (): Promise<boolean> => {
    try {
      // API Gateway port 8088 endpoint or docs check
      const res = await api.get('/api/foods', { timeout: 3000 });
      setIsBackendConnected(res.status < 500);
      return true;
    } catch (err: any) {
      if (err.response) {
        // Gateway responded (e.g., 401, 403, 404), so it is reachable!
        setIsBackendConnected(true);
        return true;
      }
      setIsBackendConnected(false);
      return false;
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('nutrition_token');
      const storedUser = localStorage.getItem('nutrition_user');
      const demoModeFlag = localStorage.getItem('nutrition_demo_mode') === 'true';

      if (storedToken && storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          setToken(storedToken);
          setIsDemoMode(demoModeFlag);
        } catch {
          localStorage.removeItem('nutrition_token');
          localStorage.removeItem('nutrition_user');
        }
      } else if (demoModeFlag) {
        setUser(mockUser);
        setToken('demo_token_jwt');
        setIsDemoMode(true);
      }

      await checkGatewayStatus();
      setIsLoading(false);
    };

    initializeAuth();

    const handleUnauthorized = () => {
      logout();
    };

    window.addEventListener('auth-unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth-unauthorized', handleUnauthorized);
  }, []);

  const login = async (credentials: LoginRequest) => {
    setIsLoading(true);
    try {
      const response: AuthResponse = await authService.login(credentials);
      setToken(response.token);
      setUser(response.user);
      setIsDemoMode(false);
      setIsBackendConnected(true);
      localStorage.setItem('nutrition_token', response.token);
      localStorage.setItem('nutrition_user', JSON.stringify(response.user));
      localStorage.removeItem('nutrition_demo_mode');
    } catch (err: any) {
      if (!err.response || err.code === 'ERR_NETWORK') {
        setIsBackendConnected(false);
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (payload: RegisterRequest) => {
    setIsLoading(true);
    try {
      const response: AuthResponse = await authService.register(payload);
      setToken(response.token);
      setUser(response.user);
      setIsDemoMode(false);
      setIsBackendConnected(true);
      localStorage.setItem('nutrition_token', response.token);
      localStorage.setItem('nutrition_user', JSON.stringify(response.user));
      localStorage.removeItem('nutrition_demo_mode');
    } catch (err: any) {
      if (!err.response || err.code === 'ERR_NETWORK') {
        setIsBackendConnected(false);
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('nutrition_token');
    localStorage.removeItem('nutrition_user');
    localStorage.removeItem('nutrition_demo_mode');
    setIsDemoMode(false);
  };

  const enableDemoMode = () => {
    setUser(mockUser);
    setToken('demo_token_jwt');
    setIsDemoMode(true);
    localStorage.setItem('nutrition_token', 'demo_token_jwt');
    localStorage.setItem('nutrition_user', JSON.stringify(mockUser));
    localStorage.setItem('nutrition_demo_mode', 'true');
  };

  const disableDemoMode = () => {
    logout();
  };

  const refreshProfile = async () => {
    if (!user || isDemoMode) return;
    try {
      const refreshed = await userService.getUserProfile(user.id);
      setUser(refreshed);
      localStorage.setItem('nutrition_user', JSON.stringify(refreshed));
    } catch (err) {
      console.error('Failed to refresh profile:', err);
    }
  };

  const updateUser = (updated: UserProfileResponse) => {
    setUser(updated);
    localStorage.setItem('nutrition_user', JSON.stringify(updated));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        isDemoMode,
        isBackendConnected,
        login,
        register,
        logout,
        refreshProfile,
        updateUser,
        enableDemoMode,
        disableDemoMode,
        checkGatewayStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
