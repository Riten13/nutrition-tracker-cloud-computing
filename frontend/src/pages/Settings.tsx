import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Server,
  RefreshCw,
  Sun,
  Moon,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Database,
  ExternalLink,
  Layers,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Alert } from '../components/ui/Alert';

export const Settings: React.FC = () => {
  const {
    isDemoMode,
    enableDemoMode,
    disableDemoMode,
    isBackendConnected,
    checkGatewayStatus,
    token,
  } = useAuth();
  const { theme, setTheme } = useTheme();

  const [isPinging, setIsPinging] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleTestConnection = async () => {
    setIsPinging(true);
    setFeedback(null);
    const connected = await checkGatewayStatus();
    setIsPinging(false);
    if (connected) {
      setFeedback('Success: Spring Cloud Gateway port 8088 is responding.');
    } else {
      setFeedback(
        'Offline: Could not connect to API Gateway on http://localhost:8088. Make sure Eureka and the Gateway are running.'
      );
    }
  };

  const services = [
    {
      name: 'API Gateway',
      port: 8088,
      route: 'http://localhost:8088',
      role: 'Unified Gateway, CORS, Swagger UI, lb:// routing',
      directFromFrontend: true,
    },
    {
      name: 'Eureka Discovery Server',
      port: 8761,
      route: 'http://localhost:8761',
      role: 'Service Discovery Registry',
      directFromFrontend: false,
    },
    {
      name: 'User Profile Service',
      port: 8080,
      route: '/api/users/**',
      role: 'MySQL, JWT Authentication, Biometrics & Allergies',
      directFromFrontend: false,
    },
    {
      name: 'Food Database Service',
      port: 3000,
      route: '/api/foods/**',
      role: 'MongoDB Atlas, Food & Nutrition Master Data',
      directFromFrontend: false,
    },
    {
      name: 'Meal Planning Service',
      port: 3001,
      route: '/api/meal-plans/**',
      role: 'MongoDB Atlas, Daily Nutrition (OpenFeign → Food DB)',
      directFromFrontend: false,
    },
    {
      name: 'Grocery Planning Service',
      port: 3002,
      route: '/api/grocery-lists/**',
      role: 'MongoDB Atlas, Cost Estimation (OpenFeign → Food DB)',
      directFromFrontend: false,
    },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
          System Configuration & Topology
        </h2>
        <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-0.5">
          Verify gateway connectivity, active microservices routes, and display settings.
        </p>
      </div>

      {feedback && (
        <Alert
          type={isBackendConnected ? 'success' : 'warning'}
          onClose={() => setFeedback(null)}
        >
          {feedback}
        </Alert>
      )}

      {/* Gateway Connection & Environment */}
      <Card>
        <CardHeader className="p-5 pb-3">
          <CardTitle className="text-base">API Gateway Configuration</CardTitle>
          <CardDescription>
            Frontend requests strictly target API Gateway at port 8088
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-0 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50">
            <div>
              <span className="text-xs font-semibold uppercase text-stone-500 block">
                VITE_API_BASE_URL
              </span>
              <span className="font-mono text-sm font-bold text-stone-900 dark:text-stone-100">
                {import.meta.env.VITE_API_BASE_URL || 'http://localhost:8088'}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {isBackendConnected ? (
                <Badge variant="forest" className="gap-1.5 py-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Gateway Connected
                </Badge>
              ) : (
                <Badge variant="rose" className="gap-1.5 py-1">
                  <XCircle className="w-3.5 h-3.5 text-rose-600" />
                  Gateway Unreachable
                </Badge>
              )}

              <Button
                size="sm"
                variant="outline"
                onClick={handleTestConnection}
                isLoading={isPinging}
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              >
                Ping Port 8088
              </Button>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center justify-between pt-2">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                Operating Mode
              </h4>
              <p className="text-xs text-stone-500">
                {isDemoMode
                  ? 'Currently running in isolated Demo Mode. Backend requests use structured sample data.'
                  : 'Currently communicating directly with live microservices via Gateway.'}
              </p>
            </div>

            {isDemoMode ? (
              <Button
                size="sm"
                onClick={disableDemoMode}
                variant="outline"
              >
                Switch to Live Gateway
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={enableDemoMode}
                variant="secondary"
              >
                Enable Demo Mode
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Microservice Architecture Topology */}
      <Card>
        <CardHeader className="p-5 pb-3">
          <CardTitle className="text-base">Microservices Architecture (MSA) Topology</CardTitle>
          <CardDescription>
            Strict North-South routing: React Frontend → Gateway (8088) → Eureka Discovery → Services
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          <div className="divide-y divide-stone-100 dark:divide-stone-800">
            {services.map((srv) => (
              <div
                key={srv.name}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-stone-900 dark:text-stone-100">
                      {srv.name}
                    </span>
                    <Badge variant="stone" className="font-mono text-[10px]">
                      Port {srv.port}
                    </Badge>
                    {srv.directFromFrontend ? (
                      <Badge variant="forest" className="text-[10px]">
                        Frontend Target
                      </Badge>
                    ) : (
                      <Badge variant="stone" className="text-[10px] text-stone-400">
                        Internal (lb://)
                      </Badge>
                    )}
                  </div>
                  <p className="text-stone-500 mt-0.5">{srv.role}</p>
                </div>

                <div className="text-right">
                  <span className="font-mono text-stone-400 text-[11px]">
                    {srv.route}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Theme Preference Card */}
      <Card>
        <CardHeader className="p-5 pb-3">
          <CardTitle className="text-base">Display Theme</CardTitle>
          <CardDescription>Select preferred interface mode</CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          <div className="grid grid-cols-2 gap-3 max-w-sm">
            <button
              onClick={() => setTheme('light')}
              className={`flex items-center justify-center gap-2 p-3 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
                theme === 'light'
                  ? 'border-[#1b3b2b] bg-[#eef4ee] text-[#1b3b2b] dark:bg-[#1b3b2b]/20 dark:text-[#86efac]'
                  : 'border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400'
              }`}
            >
              <Sun className="w-4 h-4" />
              Light Theme
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`flex items-center justify-center gap-2 p-3 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
                theme === 'dark'
                  ? 'border-[#2d5f47] bg-stone-800 text-white'
                  : 'border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400'
              }`}
            >
              <Moon className="w-4 h-4" />
              Dark Theme
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
