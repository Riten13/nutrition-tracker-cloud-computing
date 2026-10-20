import React, { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  UtensilsCrossed,
  CalendarDays,
  ShoppingCart,
  User,
  Settings as SettingsIcon,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  ShieldCheck,
  FileText,
  Activity,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

export const DashboardLayout: React.FC = () => {
  const { user, logout, isDemoMode, isBackendConnected, checkGatewayStatus, disableDemoMode } =
    useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);

  const navigationItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Food Database', path: '/foods', icon: UtensilsCrossed },
    { name: 'Meal Planning', path: '/meals', icon: CalendarDays },
    { name: 'Grocery Planning', path: '/grocery', icon: ShoppingCart },
    { name: 'Profile', path: '/profile', icon: User },
    { name: 'Settings', path: '/settings', icon: SettingsIcon },
  ];

  const secondaryNavItems = [
    { name: 'Privacy Policy', path: '/privacy', icon: ShieldCheck },
    { name: 'Terms of Service', path: '/terms', icon: FileText },
  ];

  // Derive current page title from path
  const getPageTitle = () => {
    const current = [...navigationItems, ...secondaryNavItems].find(
      (item) => item.path === location.pathname
    );
    return current ? current.name : 'Nutrition Tracker';
  };

  const handleTestConnection = async () => {
    setIsCheckingConnection(true);
    await checkGatewayStatus();
    setIsCheckingConnection(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex bg-[#fbfbf9] dark:bg-stone-950 text-stone-900 dark:text-stone-100">
      {/* Mobile navigation overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden backdrop-blur-xs"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Desktop & Mobile */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col border-r border-stone-200 dark:border-stone-800 bg-[#f7f7f4] dark:bg-stone-900 transition-all duration-300 ease-in-out lg:static ${
          isSidebarOpen ? 'w-64' : 'w-20'
        } ${
          isMobileMenuOpen
            ? 'translate-x-0 w-64'
            : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-stone-200 dark:border-stone-800">
          <NavLink
            to="/"
            className="flex items-center gap-3 overflow-hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#1b3b2b] text-[#84cc16] shrink-0 font-bold">
              <Activity className="w-5 h-5 text-[#84cc16]" />
            </div>
            {isSidebarOpen && (
              <div className="truncate">
                <span className="block text-sm font-bold tracking-tight text-[#1b3b2b] dark:text-emerald-400">
                  Nutrition Tracker
                </span>
                <span className="block text-[10px] text-stone-500 uppercase tracking-widest font-mono">
                  MSA Platform
                </span>
              </div>
            )}
          </NavLink>

          {/* Desktop Collapse Toggle */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="hidden lg:flex items-center justify-center w-7 h-7 rounded-md text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-colors"
            title={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {isSidebarOpen ? (
              <ChevronLeft className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>

          {/* Mobile close */}
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden p-1 text-stone-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Primary Navigation Menu */}
        <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#1b3b2b] text-white dark:bg-[#2d5f47] dark:text-white shadow-xs'
                    : 'text-stone-700 dark:text-stone-300 hover:bg-stone-200/70 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-white'
                }`}
                title={!isSidebarOpen ? item.name : undefined}
              >
                <Icon
                  className={`w-5 h-5 shrink-0 ${
                    isActive
                      ? 'text-[#84cc16]'
                      : 'text-stone-500 dark:text-stone-400'
                  }`}
                />
                {isSidebarOpen && <span>{item.name}</span>}
              </NavLink>
            );
          })}

          {/* Legal / Policy Section */}
          <div className="pt-6 pb-2">
            {isSidebarOpen && (
              <p className="px-3 text-[11px] font-semibold tracking-wider uppercase text-stone-400 dark:text-stone-500">
                System & Legal
              </p>
            )}
            <div className="mt-2 space-y-1">
              {secondaryNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-stone-200 dark:bg-stone-800 text-stone-900 dark:text-white'
                        : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-200/50 dark:hover:bg-stone-800/50'
                    }`}
                    title={!isSidebarOpen ? item.name : undefined}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {isSidebarOpen && <span>{item.name}</span>}
                  </NavLink>
                );
              })}
            </div>
          </div>
        </div>

        {/* User Card & Logout Bottom Section */}
        <div className="p-3 border-t border-stone-200 dark:border-stone-800 bg-[#f4f4f0] dark:bg-stone-900/80">
          {user && (
            <div
              className={`flex items-center gap-3 p-2 rounded-lg ${
                isSidebarOpen ? '' : 'justify-center'
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-[#1b3b2b] text-white flex items-center justify-center font-bold text-xs shrink-0">
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              {isSidebarOpen && (
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-stone-900 dark:text-stone-100 truncate">
                    {user.name}
                  </p>
                  <p className="text-[11px] text-stone-500 truncate">
                    {user.email}
                  </p>
                </div>
              )}
            </div>
          )}

          <div
            className={`mt-2 pt-2 border-t border-stone-200 dark:border-stone-800 flex items-center ${
              isSidebarOpen ? 'justify-between px-2' : 'justify-center'
            }`}
          >
            {isSidebarOpen && (
              <span className="text-[11px] text-stone-400">Gateway: 8088</span>
            )}
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-md text-stone-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-6 bg-[#fbfbf9]/95 dark:bg-stone-950/95 backdrop-blur-xs border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
              {getPageTitle()}
            </h1>
          </div>

          {/* Status & Action Center */}
          <div className="flex items-center gap-3">
            {/* Gateway Status Badge */}
            <div className="hidden sm:flex items-center gap-2">
              {isBackendConnected ? (
                <Badge variant="forest" className="gap-1.5 py-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-pulse" />
                  Gateway:8088 Active
                </Badge>
              ) : isDemoMode ? (
                <div className="flex items-center gap-2">
                  <Badge variant="amber" className="gap-1 py-1">
                    Demo Mode (Offline Gateway)
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleTestConnection}
                    disabled={isCheckingConnection}
                    className="h-7 text-xs px-2"
                  >
                    <RefreshCw
                      className={`w-3 h-3 mr-1 ${
                        isCheckingConnection ? 'animate-spin' : ''
                      }`}
                    />
                    Ping Gateway
                  </Button>
                </div>
              ) : (
                <Badge variant="rose" className="gap-1.5 py-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                  Gateway Offline
                </Badge>
              )}
            </div>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg border border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              title={
                theme === 'light'
                  ? 'Switch to dark theme'
                  : 'Switch to light theme'
              }
            >
              {theme === 'light' ? (
                <Moon className="w-4 h-4" />
              ) : (
                <Sun className="w-4 h-4" />
              )}
            </button>

            {/* User Initials Badge */}
            {user && (
              <div
                onClick={() => navigate('/profile')}
                className="w-8 h-8 rounded-lg bg-[#1b3b2b] text-[#84cc16] flex items-center justify-center font-bold text-xs cursor-pointer hover:opacity-90 transition-opacity"
                title={user.name}
              >
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </header>

        {/* Demo Mode Notice Banner if active */}
        {isDemoMode && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/60 px-4 py-2 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-semibold">Notice:</span>
              <span>
                Displaying isolated demo data because backend services are not running on port 8088. Real API contracts are preserved.
              </span>
            </div>
            <button
              onClick={handleTestConnection}
              className="underline font-semibold hover:text-amber-950 dark:hover:text-amber-100 cursor-pointer"
            >
              Test Gateway (Port 8088)
            </button>
          </div>
        )}

        {/* Page Content Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>

        {/* App Footer */}
        <footer className="mt-auto border-t border-stone-200 dark:border-stone-800 py-4 px-6 text-center text-xs text-stone-500 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Nutrition Tracker Platform — Microservices Architecture</span>
          <div className="flex items-center gap-4">
            <NavLink to="/privacy" className="hover:underline">
              Privacy Policy
            </NavLink>
            <NavLink to="/terms" className="hover:underline">
              Terms & Conditions
            </NavLink>
            <span>Gateway Base: port 8088</span>
          </div>
        </footer>
      </div>
    </div>
  );
};
