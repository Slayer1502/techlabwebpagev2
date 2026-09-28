import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Users,
  Wrench,
  LogOut,
  Bell,
  Menu,
  X,
  ClipboardList,
  BarChart3,
  Settings,
  ShoppingBag,
  Zap,
  Truck,
  Crosshair,
  FileText,
  AlertTriangle,
  Info,
  CheckCircle2,
  ChevronRight,
  IndianRupee,
  RefreshCw,
  ScrollText
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationService, Notification } from '../services/notificationService';
import { stockAlertService } from '../services/stockAlertService';
import { wsClient } from '../utils/ws';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const Layout = ({ children }: { children: React.ReactNode }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationService.getNotifications(),
    refetchInterval: 30000, // Check every 30 seconds
    enabled: !!user
  });

  // Real-time WebSocket push for notifications
  useEffect(() => {
    if (!user) return;
    wsClient.connect();

    const onNotif = () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    };
    const onStockAlert = () => {
      queryClient.invalidateQueries({ queryKey: ['stock-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    };
    wsClient.on('notifications', onNotif);
    wsClient.on('stock-alert', onStockAlert);

    return () => {
      wsClient.off('notifications', onNotif);
      wsClient.off('stock-alert', onStockAlert);
    };
  }, [user, queryClient]);

  // Stock alerts for admin/sales
  const { data: stockAlerts = [] } = useQuery({
    queryKey: ['stock-alerts'],
    queryFn: () => stockAlertService.getAlerts(true),
    refetchInterval: 60000,
    enabled: !!user && ['admin', 'sales'].includes(user.role),
  });

  // Close notif dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: `/${user?.role}/dashboard`, roles: ['admin', 'sales', 'employee', 'technician', 'customer', 'auditor'] },
    { label: 'Service Req', icon: Wrench, path: '/tickets', roles: ['admin', 'sales', 'employee', 'technician'] },
    { label: 'Lead', icon: Crosshair, path: '/enquiry', roles: ['admin', 'sales'] },
    { label: 'Quotations', icon: FileText, path: '/quotations', roles: ['admin', 'sales'] },
    { label: 'Bills', icon: ClipboardList, path: '/orders', roles: ['admin', 'sales', 'auditor'] },
    { label: 'Purchase', icon: ShoppingBag, path: '/purchases', roles: ['admin', 'sales'] },
    { label: 'Challans', icon: Truck, path: '/challans', roles: ['admin', 'sales'] },
    { label: 'Parties', icon: Users, path: '/parties', roles: ['admin', 'sales'] },
    { label: 'Inventory', icon: Package, path: '/inventory', roles: ['admin', 'sales', 'employee'] },
    { label: 'Expenses', icon: IndianRupee, path: '/expenses', roles: ['admin', 'sales', 'auditor'] },
    { label: 'Recurring', icon: RefreshCw, path: '/recurring-services', roles: ['admin', 'sales'] },
    { label: 'Reports', icon: FileText, path: '/reports', roles: ['admin', 'sales', 'auditor'] },
    { label: 'Analytics', icon: BarChart3, path: '/analytics', roles: ['admin', 'auditor'] },
    { label: 'Audit Trail', icon: ScrollText, path: '/audit-log', roles: ['admin'] },
    { label: 'Settings', icon: Settings, path: '/settings', roles: ['admin'] },
  ].filter(item => item.roles.includes(user?.role || ''));

  return (
    <div className="flex h-screen bg-soft overflow-hidden">
      {/* Sidebar Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-30 w-64 bg-navy text-white transition-transform duration-300 transform lg:translate-x-0 lg:static lg:inset-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-center h-20 border-b border-white/10 px-6">
          <span className="text-2xl font-bold tracking-wider">TECHLAB</span>
        </div>

        <nav className="mt-6 px-3 space-y-1 overflow-y-auto max-h-[calc(100vh-160px)] custom-scrollbar">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setIsSidebarOpen(false)}
              className={cn(
                "flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors",
                location.pathname === item.path
                  ? "bg-blue text-white"
                  : "text-gray-400 hover:bg-white/5 hover:text-white"
              )}
            >
              <item.icon className="mr-3 h-5 w-5" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-0 w-full p-4 border-t border-white/10 bg-navy">
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-3 text-sm font-medium text-gray-400 rounded-lg hover:bg-red-500/10 hover:text-red-500 transition-colors"
          >
            <LogOut className="mr-3 h-5 w-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-20 bg-white border-b flex items-center justify-between px-4 lg:px-8 shrink-0">
          <div className="flex items-center">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 rounded-lg lg:hidden hover:bg-gray-100"
            >
              <Menu className="h-6 w-6 text-text" />
            </button>
            <h2 className="text-xl font-semibold text-navy ml-4 lg:ml-0">
              Welcome, {user?.name}
            </h2>
          </div>

          <div className="flex items-center space-x-4">
            {/* Notification Bell */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className={cn(
                  "p-2 rounded-xl transition-all relative",
                  isNotifOpen ? "bg-blue/10 text-blue" : "hover:bg-gray-100 text-text-soft"
                )}
              >
                <Bell className="h-6 w-6" />
                {notifications.length > 0 && (
                  <span className="absolute top-2 right-2 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
                )}
              </button>

              {/* Notification Dropdown */}
              {isNotifOpen && (
                <div className="absolute right-0 mt-3 w-80 bg-white rounded-3xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                   <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center">
                      <h3 className="font-bold text-navy text-sm uppercase tracking-wider">Alert Center</h3>
                      <span className="bg-navy text-white text-[10px] font-black px-2 py-0.5 rounded-full">{notifications.length}</span>
                   </div>
                   <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                      {notifications.length > 0 ? (
                        notifications.map((n) => (
                           <Link
                            key={n.id}
                            to={n.link}
                            onClick={() => setIsNotifOpen(false)}
                            className="p-4 flex items-start gap-4 hover:bg-soft/50 transition-colors border-b last:border-0"
                           >
                              <div className={cn(
                                "p-2 rounded-xl shrink-0",
                                n.type === 'warning' ? "bg-orange-100 text-orange-600" :
                                n.type === 'danger' ? "bg-red-100 text-red-600" :
                                n.type === 'success' ? "bg-green-100 text-green-600" :
                                "bg-blue-100 text-blue-600"
                              )}>
                                {n.type === 'warning' ? <AlertTriangle className="h-4 w-4" /> :
                                 n.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> :
                                 <Info className="h-4 w-4" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                 <p className="text-xs font-black text-navy leading-none mb-1">{n.title}</p>
                                 <p className="text-[11px] text-text-soft font-medium leading-tight line-clamp-2">{n.message}</p>
                              </div>
                              <ChevronRight className="h-3 w-3 text-gray-300 self-center" />
                           </Link>
                        ))
                      ) : (
                        <div className="p-10 text-center text-text-soft italic text-xs">
                           <Bell className="h-8 w-8 mx-auto mb-2 opacity-20" />
                           No new notifications
                        </div>
                      )}
                   </div>
                   {notifications.length > 0 && (
                     <div className="p-3 bg-gray-50 text-center border-t">
                        <button className="text-[10px] font-black text-blue uppercase tracking-widest hover:underline">Clear All</button>
                     </div>
                   )}
                </div>
              )}
            </div>

            <div className="h-10 w-10 rounded-full bg-blue/10 flex items-center justify-center border border-blue/20">
              <span className="text-blue font-bold">{user?.name.charAt(0)}</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8 custom-scrollbar">
          {stockAlerts.length > 0 && (
            <Link
              to="/inventory"
              className="flex items-center gap-3 bg-orange-50 border border-orange-200 text-orange-700 rounded-xl px-4 py-3 mb-4 hover:bg-orange-100 transition-colors"
            >
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <span className="text-sm font-semibold">
                {stockAlerts.length} product{stockAlerts.length > 1 ? 's' : ''} low on stock
              </span>
              <span className="text-xs font-medium text-orange-600 ml-auto truncate">
                {stockAlerts.slice(0, 3).map(a => a.product_name).join(', ')}{stockAlerts.length > 3 ? '...' : ''}
              </span>
            </Link>
          )}
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
