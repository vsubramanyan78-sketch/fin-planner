import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/src/context/AuthContext';
import { Home, PieChart, CreditCard, Camera, Settings, LogOut, Bot, Menu, X, Bell, AlertTriangle, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import AiAssistantPanel from './AiAssistantPanel';

export default function Layout() {
  const { user, logout, token } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAiPanelOpen, setAiPanelOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Notifications State
  const [notifications, setNotifications] = useState<{ id: string; type: 'warning' | 'danger'; message: string; category: string }[]>([]);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const fetchBudgetAlerts = () => {
    const isEnabled = localStorage.getItem('budget_alerts_enabled') !== 'false';
    if (!isEnabled) {
      setNotifications([]);
      return;
    }

    Promise.all([
      fetch('/api/transactions', { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()),
      fetch('/api/budgets', { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json())
    ]).then(([txData, budgetData]) => {
      const txs = txData.transactions || [];
      const budg = budgetData.budgets || [];
      
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      
      // Calculate current month's spent per category
      const categorySpent: Record<string, number> = {};
      txs.forEach((t: any) => {
        if (t.type !== 'expense' || !t.date) return;
        const d = new Date(t.date);
        if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
          const cat = (t.category || '').toLowerCase();
          categorySpent[cat] = (categorySpent[cat] || 0) + (t.amount || 0);
        }
      });
      
      const alerts: any[] = [];
      budg.forEach((b: any) => {
        const catName = b.category;
        const spent = categorySpent[catName.toLowerCase()] || 0;
        const limit = b.limit_amount || 0;
        
        if (limit > 0) {
          const ratio = spent / limit;
          if (ratio >= 1.0) {
            alerts.push({
              id: `exceeded-${catName}`,
              type: 'danger',
              category: catName,
              message: `Over budget limits: Spent $${spent.toFixed(2)} of $${limit.toFixed(2)} monthly cap.`
            });
          } else if (ratio >= 0.8) {
            alerts.push({
              id: `approaching-${catName}`,
              type: 'warning',
              category: catName,
              message: `Approaching budget caps: Spent $${spent.toFixed(2)} of $${limit.toFixed(2)} monthly limit (${(ratio * 100).toFixed(0)}%).`
            });
          }
        }
      });
      
      setNotifications(alerts);
    }).catch(console.error);
  };

  useEffect(() => {
    if (token) {
      fetchBudgetAlerts();
      window.addEventListener('transactionAdded', fetchBudgetAlerts);
      window.addEventListener('budgetAlertsChanged', fetchBudgetAlerts);
    }
    return () => {
      window.removeEventListener('transactionAdded', fetchBudgetAlerts);
      window.removeEventListener('budgetAlertsChanged', fetchBudgetAlerts);
    };
  }, [token]);

  const navItems = [
    { name: 'Dashboard', path: '/', icon: Home },
    { name: 'Transactions', path: '/transactions', icon: CreditCard },
    { name: 'Analytics', path: '/analytics', icon: PieChart },
    { name: 'Subscriptions', path: '/subscriptions', icon: RefreshCw },
    { name: 'Scan Receipt', path: '/scan', icon: Camera },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background relative">
      {/* Background Mesh Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none z-0"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[150px] pointer-events-none z-0"></div>
      <div className="absolute top-[20%] right-[10%] w-[300px] h-[300px] bg-cyan-400/10 rounded-full blur-[100px] pointer-events-none z-0"></div>

      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-64 flex-col border-r border-border/20 glass shadow-2xl relative z-10">
        <div className="p-6">
          <h1 className="text-2xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 flex items-center gap-2">
            <Bot className="w-8 h-8 text-cyan-400" />
            NeuroFin
          </h1>
        </div>

        {/* Live Notification Indicator Hub */}
        <div className="px-4 mb-2">
          <button 
            onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
            className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all relative group cursor-pointer ${
              notifications.length > 0 
                ? 'bg-red-500/5 hover:bg-red-500/10 border-red-500/20 text-red-400' 
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/80'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className="relative">
                <Bell className={`w-4 h-4 ${notifications.length > 0 ? 'text-red-400 animate-bounce' : 'text-cyan-400'}`} />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-400 animate-ping" />
                )}
              </div>
              <span className="text-[10px] font-mono uppercase tracking-widest font-bold">System Alerts</span>
            </div>
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
              notifications.length > 0 ? 'bg-red-500/20 text-red-300' : 'bg-cyan-400/10 text-cyan-400'
            }`}>
              {notifications.length}
            </span>
          </button>
          
          {/* Detailed drawer dropdown inside sidebar */}
          <AnimatePresence>
            {showNotificationDropdown && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 p-2.5 bg-[#0c0f1d]/95 rounded-xl border border-cyan-500/20 space-y-2 overflow-hidden"
              >
                {notifications.length === 0 ? (
                  <p className="text-[9px] font-mono text-white/40 text-center py-1 uppercase tracking-wider">No threshold alerts active</p>
                ) : (
                  notifications.map((n) => (
                    <div 
                      key={n.id} 
                      className={`p-2 rounded-lg border text-[9px] leading-relaxed font-mono ${
                        n.type === 'danger' 
                          ? 'bg-red-500/10 border-red-500/30 text-red-400' 
                          : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
                      }`}
                    >
                      <div className="flex items-center gap-1 font-bold mb-0.5 uppercase tracking-wider">
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        {n.type === 'danger' ? 'Limit Exceeded' : 'Approaching Warning'}
                      </div>
                      <p className="text-white/80">{n.message}</p>
                    </div>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link key={item.name} to={item.path}>
                <motion.div
                  whileHover={{ scale: 1.02, x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    isActive 
                      ? 'bg-cyan-400/20 text-cyan-400 border border-cyan-400/30 flex shadow-[0_0_15px_rgba(34,211,238,0.2)]' 
                      : 'text-muted-foreground hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.name}</span>
                </motion.div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border/20">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="relative">
              <Avatar className="h-10 w-10 border border-primary/50">
                <AvatarFallback className="bg-primary/20 text-primary">
                  {user?.name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background ${isOnline ? 'bg-emerald-400' : 'bg-red-400'}`} title={isOnline ? 'Online' : 'Offline'}></span>
            </div>
            <div className="flex flex-col truncate">
              <span className="text-sm font-medium truncate">{user?.name}</span>
              <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
            </div>
          </div>
          <Button variant="ghost" className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={logout}>
            <LogOut className="w-4 h-4 mr-2" /> Logout
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen relative overflow-hidden">
        
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 border-b border-border/20 glass z-20">
          <h1 className="text-xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
            NeuroFin
          </h1>
          <div className="flex items-center gap-3">
            {/* Mobile notification bell dropdown */}
            <div className="relative">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
                className={`w-9 h-9 rounded-full ${notifications.length > 0 ? 'bg-red-500/15 text-red-400 border border-red-500/20' : 'text-cyan-400'}`}
              >
                <Bell className="w-4 h-4" />
                {notifications.length > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-400 rounded-full" />
                )}
              </Button>
              {showNotificationDropdown && (
                <div className="absolute right-0 mt-2 w-64 p-3 bg-[#0c0f1d]/95 rounded-xl border border-cyan-500/20 space-y-2 z-50 shadow-2xl">
                  {notifications.length === 0 ? (
                    <p className="text-[9px] font-mono text-white/40 text-center py-1 uppercase tracking-wider">No active alerts</p>
                  ) : (
                    notifications.map((n) => (
                      <div 
                        key={n.id} 
                        className={`p-2 rounded-lg border text-[9px] leading-normal font-mono ${
                          n.type === 'danger' 
                            ? 'bg-red-500/10 border-red-500/30 text-red-400' 
                            : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500'
                        }`}
                      >
                        <p className="text-white font-medium">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!isMobileMenuOpen)}>
              {isMobileMenuOpen ? <X /> : <Menu />}
            </Button>
          </div>
        </header>

        {/* Mobile menu dropdown */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden absolute top-[73px] left-0 right-0 glass z-30 border-b border-border/20"
            >
              <nav className="p-4 space-y-2">
                {navItems.map((item) => (
                  <Link key={item.name} to={item.path} onClick={() => setMobileMenuOpen(false)}>
                    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl ${
                      location.pathname === item.path ? 'bg-primary/20 text-primary' : 'text-muted-foreground'
                    }`}>
                      <item.icon className="w-5 h-5" />
                      <span>{item.name}</span>
                    </div>
                  </Link>
                ))}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth relative">
          <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:32px] pointer-events-none" />
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="max-w-7xl mx-auto h-full space-y-8 relative z-10"
          >
            <Outlet />
          </motion.div>
        </div>

        {/* AI Assistant Floating Button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setAiPanelOpen(true)}
          className="absolute bottom-6 right-6 md:bottom-10 md:right-10 w-14 h-14 bg-gradient-to-tr from-cyan-400 to-purple-600 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(34,211,238,0.4)] cursor-pointer z-40 border border-white/20"
        >
          <Bot className="w-6 h-6 text-white" />
        </motion.button>
        
      </main>

      {/* AI Assistant Panel Container */}
      <AnimatePresence>
        {isAiPanelOpen && (
           <AiAssistantPanel onClose={() => setAiPanelOpen(false)} />
        )}
      </AnimatePresence>

    </div>
  );
}
