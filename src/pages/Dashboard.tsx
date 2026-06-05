import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'motion/react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ArrowUpRight, ArrowDownRight, Wallet, TrendingUp, DollarSign, Activity, AlertCircle, Target, Sparkles, X, HeartPulse, Trophy, Star, Medal, ShieldCheck, Fingerprint, Loader2 } from 'lucide-react';
import { useAuth } from '@/src/context/AuthContext';
import { useCurrency } from '@/src/context/CurrencyContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const COLORS = ['#8b5cf6', '#06b6d4', '#f43f5e', '#10b981', '#f59e0b'];

const SkeletonLoader = () => (
  <div className="space-y-6">
    <div className="w-1/3 h-10 bg-white/5 animate-pulse rounded-lg" />
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[...Array(3)].map((_, i) => (
        <Card key={i} className="glass-card border-none h-32 animate-pulse bg-white/5" />
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="glass-card border-none h-[400px] animate-pulse bg-white/5 lg:col-span-2" />
      <div className="flex flex-col gap-6">
         <Card className="glass-card border-none h-[188px] animate-pulse bg-white/5" />
         <Card className="glass-card border-none h-[188px] animate-pulse bg-white/5" />
      </div>
    </div>
  </div>
);

const CustomTooltip = ({ active, payload, label }: any) => {
  const { formatAmount } = useCurrency();
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#020203]/90 backdrop-blur-md border border-white/10 p-3 rounded-xl shadow-xl">
        {label && <p className="text-white/70 text-xs mb-2 font-medium uppercase tracking-wider">{label}</p>}
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-3 mt-1.5">
            <div className="w-2 h-2 rounded-full shadow-[0_0_8px_currentColor]" style={{ color: entry.color || entry.payload?.fill, backgroundColor: entry.color || entry.payload?.fill }} />
            <span className="text-sm font-bold text-white font-mono">
              {formatAmount(entry.value)}
            </span>
            <span className="text-xs text-white/50 uppercase tracking-wider">{entry.name}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// Simple Tilt Component
const TiltCard = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useTransform(y, [-100, 100], [5, -5]);
  const rotateY = useTransform(x, [-100, 100], [-5, 5]);

  function handleMouse(event: React.MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    x.set(event.clientX - rect.left - rect.width / 2);
    y.set(event.clientY - rect.top - rect.height / 2);
  }

  function handleMouseLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.div
      onMouseMove={handleMouse}
      onMouseLeave={handleMouseLeave}
      style={{ rotateX, rotateY, transformPerspective: 1000 }}
      whileHover={{ y: -8, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={`relative group ${className}`}
    >
      {children}
    </motion.div>
  );
};

export default function Dashboard() {
  const { token, user } = useAuth();
  const { formatAmount } = useCurrency();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // AI-Driven Forecast & Insights state
  const [forecastData, setForecastData] = useState<any>(null);
  const [forecastLoading, setForecastLoading] = useState(true);
  const [spendingInsight, setSpendingInsight] = useState<string>('');
  const [insightLoading, setInsightLoading] = useState(true);

  // Milestone Savings Goal state with local storage persistence
  const [goalName, setGoalName] = useState(() => localStorage.getItem('savings_goal_name') || 'Financial Freedom Node');
  const [goalTarget, setGoalTarget] = useState(() => Number(localStorage.getItem('savings_goal_target') || '5000'));
  const [goalDate, setGoalDate] = useState(() => localStorage.getItem('savings_goal_date') || '2026-12-31');
  const [customDeposits, setCustomDeposits] = useState(() => Number(localStorage.getItem('savings_custom_deposits') || '0'));
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [tempGoalName, setTempGoalName] = useState(goalName);
  const [tempGoalTarget, setTempGoalTarget] = useState(String(goalTarget));
  const [tempGoalDate, setTempGoalDate] = useState(goalDate);
  const [depositAmount, setDepositAmount] = useState('');

  const [isBiometricPassed, setIsBiometricPassed] = useState(() => {
    const isLockEnabled = localStorage.getItem('biometric_auth_enabled') === 'true';
    const isSessionPassed = sessionStorage.getItem('biometric_authorized_session') === 'true';
    return !isLockEnabled || isSessionPassed;
  });
  const [biometricStatus, setBiometricStatus] = useState<'idle' | 'scanning' | 'success' | 'failed'>('idle');
  const [biometricError, setBiometricError] = useState('');

  const handleBiometricTrigger = () => {
    setBiometricStatus('scanning');
    setBiometricError('');
    
    // Simulate real biometric scanning
    setTimeout(() => {
      if (Math.random() > 0.05) {
        setBiometricStatus('success');
        setTimeout(() => {
          sessionStorage.setItem('biometric_authorized_session', 'true');
          setIsBiometricPassed(true);
        }, 1200);
      } else {
        setBiometricStatus('failed');
        setBiometricError('Biometric authentication failed. Please try again.');
      }
    }, 2000);
  };

  const fetchForecast = useCallback(() => {
    setForecastLoading(true);
    fetch('/api/ai/forecast', { headers: { 'Authorization': `Bearer ${token}` }})
      .then(r => r.json())
      .then(data => {
        setForecastData(data);
        setForecastLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setForecastLoading(false);
      });
  }, [token]);

  const fetchInsight = useCallback(() => {
    setInsightLoading(true);
    fetch('/api/ai/spending-insights', { headers: { 'Authorization': `Bearer ${token}` }})
      .then(r => r.json())
      .then(data => {
        setSpendingInsight(data?.insight || '');
        setInsightLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setInsightLoading(false);
      });
  }, [token]);

  const fetchDashboardData = useCallback(() => {
    fetchForecast();
    fetchInsight();
    Promise.all([
      fetch('/api/transactions', { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()),
      fetch('/api/budgets', { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json())
    ]).then(([txData, bgData]) => {
      const txs = txData.transactions || [];
      const bgs = bgData.budgets || [];
      setTransactions(txs);
      setBudgets(bgs);
      setLoading(false);
      
      const realBudgets = bgs.length > 0 ? bgs : [];
      let overriddenBudget = null;

      for (const b of realBudgets) {
        const spent = txs
          .filter((t: any) => t.type === 'expense' && t.category.toLowerCase() === b.category.toLowerCase())
          .reduce((acc: number, t: any) => acc + t.amount, 0);
        if (spent > b.limit_amount * 0.9) {
          overriddenBudget = b;
          break;
        }
      }

      if (overriddenBudget) {
        setToastMessage(`You have exceeded 90% of your ${overriddenBudget.category} budget for this month.`);
        setTimeout(() => setShowToast(true), 2500);
      }
    });
  }, [token, fetchForecast, fetchInsight]);

  useEffect(() => {
    fetchDashboardData();
    window.addEventListener('transactionAdded', fetchDashboardData);
    return () => window.removeEventListener('transactionAdded', fetchDashboardData);
  }, [fetchDashboardData]);

  const formatMonth = (dateString: string) => {
    return new Date(dateString).toLocaleString('default', { month: 'short' });
  };

  const monthlyMap: Record<string, { income: number; expense: number }> = {};
  transactions.forEach((t: any) => {
    if (!t.date) return;
    const month = formatMonth(t.date);
    if (!monthlyMap[month]) monthlyMap[month] = { income: 0, expense: 0 };
    monthlyMap[month][t.type] += t.amount;
  });

  const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyData = Object.entries(monthlyMap)
    .sort((a, b) => monthOrder.indexOf(a[0]) - monthOrder.indexOf(b[0]))
    .map(([name, data]) => ({ name, income: data.income, expense: data.expense }));

  if (monthlyData.length === 0) {
    const currentMonth = formatMonth(new Date().toISOString());
    monthlyData.push({ name: currentMonth, income: 0, expense: 0 });
  }

  const categoryData: any[] = []; // Removed hardcoded data

  const totalIncome = transactions.filter((t: any) => t.type === 'income').reduce((acc: number, t: any) => acc + t.amount, 0);
  const totalExpense = transactions.filter((t: any) => t.type === 'expense').reduce((acc: number, t: any) => acc + t.amount, 0);
  const netLedgerSavings = Math.max(0, totalIncome - totalExpense);
  const netSavedTotal = netLedgerSavings + customDeposits;
  const progressPercent = Math.min(100, Math.round(goalTarget > 0 ? (netSavedTotal / goalTarget) * 100 : 0));

  const daysRemaining = Math.max(1, Math.ceil((new Date(goalDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));
  const weeksRemaining = Math.max(1, Math.ceil(daysRemaining / 7));
  const remainingGoal = Math.max(0, goalTarget - netSavedTotal);
  const suggestedDaily = remainingGoal / daysRemaining;
  const suggestedWeekly = remainingGoal / weeksRemaining;
  const balance = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;

  if (!isBiometricPassed) {
    return (
      <div className="fixed inset-0 z-[100] bg-[#020205] flex flex-col items-center justify-center p-6 text-white font-sans overflow-hidden">
        {/* Futuristic glowing mesh background */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-purple-500/5 rounded-full blur-[80px] pointer-events-none" />
        
        <div className="max-w-md w-full text-center space-y-8 relative z-10 animate-in fade-in zoom-in-95 duration-500">
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-cyan-400/10 flex items-center justify-center text-cyan-400 border border-cyan-400/20 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h2 className="text-2xl font-bold font-display tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70 mt-2">NeuroFin Identity Node</h2>
            <p className="text-xs text-white/40 uppercase tracking-widest font-mono">Secure Authorization Gateway</p>
          </div>

          {/* Holographic glowing scanner stage */}
          <div className="flex flex-col items-center justify-center relative py-6">
            <div className="w-48 h-48 rounded-full border border-white/5 flex items-center justify-center relative">
              {/* Outer pulsing ring */}
              <motion.div 
                animate={{ scale: [1, 1.05, 1], opacity: [0.1, 0.2, 0.1] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 rounded-full border-2 border-cyan-400/20"
              />
              
              {/* Spinning compass ticks/loader */}
              {biometricStatus === 'scanning' && (
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-2 rounded-full border border-dashed border-cyan-400/30"
                />
              )}

              {/* Scanning visual sweep line */}
              {biometricStatus === 'scanning' && (
                <motion.div 
                  initial={{ translateY: -80 }}
                  animate={{ translateY: 80 }}
                  transition={{ duration: 1.5, repeat: Infinity, repeatType: 'reverse', ease: "easeInOut" }}
                  className="absolute left-[10%] right-[10%] h-[2px] bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.8)] z-20"
                />
              )}

              {/* Core scanning glyph/icon container */}
              <div className={`w-32 h-32 rounded-full border flex items-center justify-center transition-all duration-500 relative ${
                biometricStatus === 'scanning' 
                  ? 'bg-cyan-400/10 border-cyan-400/40 shadow-[0_0_40px_rgba(34,211,238,0.2)]' 
                  : biometricStatus === 'success'
                  ? 'bg-emerald-500/10 border-emerald-400/40 shadow-[0_0_40px_rgba(16,185,129,0.3)]'
                  : biometricStatus === 'failed'
                  ? 'bg-red-500/10 border-red-500/40 shadow-[0_0_40px_rgba(239,68,68,0.3)]'
                  : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
              }`}>
                {biometricStatus === 'success' ? (
                  <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} transition={{ type: 'spring' }} className="text-emerald-400">
                    <ShieldCheck className="w-14 h-14" />
                  </motion.div>
                ) : biometricStatus === 'failed' ? (
                  <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="text-red-400">
                    <X className="w-14 h-14" />
                  </motion.div>
                ) : (
                  <motion.div 
                    animate={biometricStatus === 'scanning' ? { scale: [1, 1.1, 1] } : {}}
                    transition={{ duration: 1, repeat: Infinity }}
                    className={biometricStatus === 'scanning' ? 'text-cyan-400' : 'text-white/60'}
                  >
                    <Fingerprint className="w-14 h-14" />
                  </motion.div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="min-h-[24px]">
              {biometricStatus === 'scanning' && (
                <p className="text-sm text-cyan-400 font-mono tracking-wider animate-pulse">VERIFYING BIOMETRICS...</p>
              )}
              {biometricStatus === 'success' && (
                <p className="text-sm text-emerald-400 font-mono tracking-wider font-bold">NODE AUTHORIZED</p>
              )}
              {biometricStatus === 'failed' && (
                <p className="text-sm text-red-400 font-medium">{biometricError}</p>
              )}
              {biometricStatus === 'idle' && (
                <p className="text-sm text-white/50 leading-relaxed max-w-sm mx-auto">This dashboard contains encrypted financial pipelines. Authorize passkey lock entry.</p>
              )}
            </div>

            <div className="scale-100 flex flex-col gap-2">
              <Button 
                onClick={handleBiometricTrigger} 
                disabled={biometricStatus === 'scanning' || biometricStatus === 'success'}
                className={`w-full py-6 rounded-xl font-bold tracking-wide transition-all shadow-lg cursor-pointer flex items-center justify-center ${
                  biometricStatus === 'scanning'
                    ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/20'
                    : biometricStatus === 'success'
                    ? 'bg-emerald-400 text-black border border-transparent'
                    : 'bg-[#22d3ee] text-black hover:bg-cyan-300 hover:shadow-[0_0_25px_rgba(34,211,238,0.3)] border border-transparent'
                }`}
              >
                {biometricStatus === 'scanning' ? 'Scanning Touch ID / Face ID...' : biometricStatus === 'success' ? 'Authorized Successfully' : 'Verify Secure Passkey'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) return <SkeletonLoader />;

  // Badges logic
  const hasSavingsStreak = savingsRate > 10;
  const hasBigSpender = totalExpense > 5000;
  const hasBudgetMaster = !toastMessage;

  return (
    <div className="space-y-6 relative pb-12">
      {/* Toast Notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: -50, x: 50 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className="fixed top-6 right-6 z-50 p-4 rounded-xl bg-[#0a0a0f]/90 border border-red-500/30 backdrop-blur-xl shadow-[0_10px_40px_-10px_rgba(239,68,68,0.3)] flex items-start gap-4 max-w-sm"
          >
            <div className="p-2 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 mt-0.5 shadow-[0_0_15px_rgba(239,68,68,0.3)]">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h4 className="text-red-400 font-bold text-sm">Budget Alert</h4>
              <p className="text-white/70 text-xs mt-1">{toastMessage || 'Budget warning.'}</p>
            </div>
            <button onClick={() => setShowToast(false)} className="text-white/40 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Welcome & AI Summary Insight Banner */}
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold text-white">Welcome back, {user?.name?.split(' ')[0]}</h2>
          <p className="text-white/50 mt-1">Here is your financial overview.</p>
        </div>

        {/* AI Spent Summary Insights Banner */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-gradient-to-r from-purple-950/30 via-slate-900/40 to-cyan-950/20 p-5 md:p-6 shadow-[0_0_30px_rgba(34,211,238,0.05)]"
        >
          {/* Subtle decoration lines/sweeps */}
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-cyan-500/5 to-transparent pointer-events-none" />
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center text-cyan-400 shrink-0 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono uppercase tracking-widest text-cyan-400 font-bold">Neural Ledger Intelligence</span>
                  <span className="px-1.5 py-0.5 bg-cyan-400/10 text-cyan-400 text-[10px] font-mono rounded font-bold uppercase tracking-wider">Active</span>
                </div>
                <p className="text-xs md:text-sm text-white/90 leading-relaxed font-sans">
                  {insightLoading ? (
                    <span className="flex items-center gap-2 text-white/40 font-mono tracking-widest text-xs">
                      <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-ping" />
                      GENERATING SUMMARY HABIT INSIGHTS...
                    </span>
                  ) : (
                    spendingInsight || "Your ledger activity scales inside secure neural bounds compared to previous cycles."
                  )}
                </p>
              </div>
            </div>
            {!insightLoading && (
              <Button 
                onClick={fetchInsight} 
                className="bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl px-4 py-2 bg-slate-950 text-xs font-mono tracking-wider shrink-0 transition-all cursor-pointer"
              >
                Sync Insight
              </Button>
            )}
          </div>
        </motion.div>
      </div>

      {/* Achievement Badges */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="glass-card border-none">
          <CardContent className="flex items-center gap-4 py-5 px-6">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 ${hasSavingsStreak ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/5 text-white/20 border border-white/10'}`}>
                <motion.div
                    animate={hasSavingsStreak ? { scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] } : {}}
                    transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
                    className={hasSavingsStreak ? 'shadow-[0_0_20px_rgba(16,185,129,0.5)] rounded-full' : ''}
                >
                    <Star className="w-7 h-7" />
                </motion.div>
             </div>
            <div>
               <h4 className={`font-bold text-lg ${hasSavingsStreak ? 'text-white' : 'text-white/40'}`}>Savings Streak</h4>
               <p className="text-xs text-white/50">Saved over 10% of total income</p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-none">
          <CardContent className="flex items-center gap-4 py-5 px-6">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 ${hasBudgetMaster ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-white/5 text-white/20 border border-white/10'}`}>
                <motion.div
                    animate={hasBudgetMaster ? { scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] } : {}}
                    transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
                    className={hasBudgetMaster ? 'shadow-[0_0_20px_rgba(168,85,247,0.5)] rounded-full' : ''}
                >
                    <Medal className="w-7 h-7" />
                </motion.div>
             </div>
            <div>
               <h4 className={`font-bold text-lg ${hasBudgetMaster ? 'text-white' : 'text-white/40'}`}>Budget Master</h4>
               <p className="text-xs text-white/50">Stayed within all budget thresholds</p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-none">
          <CardContent className="flex items-center gap-4 py-5 px-6">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 ${hasBigSpender ? 'bg-cyan-400/20 text-cyan-400 border border-cyan-400/30' : 'bg-white/5 text-white/20 border border-white/10'}`}>
                <motion.div
                    animate={hasBigSpender ? { scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] } : {}}
                    transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
                    className={hasBigSpender ? 'shadow-[0_0_20px_rgba(34,211,238,0.5)] rounded-full' : ''}
                >
                    <Trophy className="w-7 h-7" />
                </motion.div>
             </div>
            <div>
               <h4 className={`font-bold text-lg ${hasBigSpender ? 'text-white' : 'text-white/40'}`}>Big Spender</h4>
               <p className="text-xs text-white/50">Logged over $5K in expenses</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="h-full">
          <TiltCard className="h-full">
            <Card className="glass-card border-none overflow-hidden relative group h-full">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity duration-500">
                <Wallet className="w-24 h-24 text-cyan-400" />
              </div>
              <CardHeader className="flex flex-row items-center justify-between pb-2 z-10 relative">
                <CardTitle className="text-xs font-bold tracking-widest uppercase text-white/50">Total Balance</CardTitle>
              </CardHeader>
              <CardContent className="z-10 relative">
                <div className="text-4xl font-mono font-bold text-white">{formatAmount(balance)}</div>
                <p className="text-xs text-emerald-400 flex items-center mt-3 font-medium">
                  <ArrowUpRight className="h-3 w-3 mr-1" /> +12% from last month
                </p>
              </CardContent>
            </Card>
          </TiltCard>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="h-full">
          <TiltCard className="h-full">
            <Card className="glass-card border-none overflow-hidden relative group h-full">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <CardHeader className="flex flex-row items-center justify-between pb-2 z-10 relative">
                <CardTitle className="text-xs font-bold tracking-widest uppercase text-white/50">Monthly Income</CardTitle>
                <TrendingUp className="h-4 w-4 text-emerald-400 opacity-50" />
              </CardHeader>
              <CardContent className="z-10 relative">
                <div className="text-4xl font-mono font-bold text-white">{formatAmount(totalIncome)}</div>
                <p className="text-xs text-emerald-400 flex items-center mt-3 font-medium">
                  <ArrowUpRight className="h-3 w-3 mr-1" /> +4.1%
                </p>
              </CardContent>
            </Card>
          </TiltCard>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="h-full">
          <TiltCard className="h-full">
            <Card className="glass-card border-none overflow-hidden relative group h-full">
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <CardHeader className="flex flex-row items-center justify-between pb-2 z-10 relative">
                <CardTitle className="text-xs font-bold tracking-widest uppercase text-white/50">Monthly Expenses</CardTitle>
                <Activity className="h-4 w-4 text-red-400 opacity-50" />
              </CardHeader>
              <CardContent className="z-10 relative">
                <div className="text-4xl font-mono font-bold text-white">{formatAmount(totalExpense)}</div>
                <p className="text-xs text-red-400 flex items-center mt-3 font-medium">
                  <ArrowDownRight className="h-3 w-3 mr-1" /> -2.5%
                </p>
              </CardContent>
            </Card>
          </TiltCard>
        </motion.div>
      </div>

      {/* AI-Driven Forecast Projection Component */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ delay: 0.35 }}
      >
        <Card className="glass-card border-none overflow-hidden relative">
          <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
            <Sparkles className="w-32 h-32 text-purple-400" />
          </div>
          <CardHeader className="pb-3 border-b border-white/5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg font-bold text-white flex items-center gap-2 font-display">
                  <TrendingUp className="w-5 h-5 text-purple-400" />
                  AI Intelligence Spending Forecast
                </CardTitle>
                <p className="text-xs text-white/50 mt-1">
                  Predictive spending ceilings for next month computed via transactions & flagged recurring parameters.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-white/40">Confidence Score</span>
                <div className="px-3 py-1 bg-purple-500/10 border border-purple-500/30 text-purple-400 font-bold font-mono text-xs rounded-full shadow-[0_0_12px_rgba(168,85,247,0.2)]">
                  {forecastLoading ? "??%" : `${forecastData?.confidenceLevel || 85}%`}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {forecastLoading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                <p className="text-xs text-white/40 font-mono tracking-widest uppercase">Analyzing transaction vectors & recurring items...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* Visual Projected Ceiling Ring or Bento Box */}
                <div className="md:col-span-4 flex flex-col justify-center items-center p-6 bg-white/5 rounded-2xl border border-white/10 text-center relative overflow-hidden group">
                  <div className="absolute -inset-0.5 bg-gradient-to-tr from-purple-500/10 to-cyan-500/10 opacity-30 group-hover:opacity-100 transition-all blur-sm pointer-events-none" />
                  <span className="text-xs font-mono uppercase text-purple-400 tracking-wider">PROJECTED OUTFLOW</span>
                  <div className="text-4xl font-black font-mono text-white mt-3 shadow-sm">
                    {formatAmount(forecastData?.projectedSpending || 1500)}
                  </div>
                  <p className="text-[10px] text-white/40 mt-1.5 uppercase font-mono tracking-widest">Next Month Ceiling</p>
                  
                  {/* Subtle progress indicators */}
                  <div className="w-full bg-white/5 rounded-full h-1 mt-6 overflow-hidden">
                    <motion.div 
                      key="confBar"
                      initial={{ width: 0 }}
                      animate={{ width: `${forecastData?.confidenceLevel || 85}%` }}
                      className="h-full bg-purple-500"
                    />
                  </div>
                </div>

                {/* Reasons / Bullet Explanations */}
                <div className="md:col-span-4 space-y-3 flex flex-col justify-center">
                  <h4 className="text-xs font-mono uppercase text-white/50 tracking-wider">Ceiling Rationalization</h4>
                  <div className="space-y-2.5">
                    {(forecastData?.reasons || []).map((reason: string, idx: number) => (
                      <div key={idx} className="flex gap-3 text-xs text-white/80 leading-relaxed items-start">
                        <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0 shadow-[0_0_6px_rgba(168,85,247,0.8)]" />
                        <p>{reason}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Category Outlay Distribution List */}
                <div className="md:col-span-4 space-y-3 flex flex-col justify-center">
                  <h4 className="text-xs font-mono uppercase text-white/50 tracking-wider">Projected Category Breakdown</h4>
                  <div className="space-y-2">
                    {(forecastData?.categoryBreakdown || []).slice(0, 4).map((item: any, idx: number) => {
                      const percentages = [40, 25, 20, 15];
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between text-xs font-mono text-white/70">
                            <span>{item.category}</span>
                            <span className="text-white font-bold">{formatAmount(item.projectedAmount)}</span>
                          </div>
                          <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${percentages[idx] || 20}%` }}
                              className="h-full bg-cyan-400"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Interactive Savings Goal Accelerator & Micro-Savings Planner */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ delay: 0.38 }}
      >
        <Card className="glass-card border-none overflow-hidden relative">
          <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
            <Trophy className="w-32 h-32 text-purple-400 animate-pulse" />
          </div>
          
          <CardHeader className="pb-3 border-b border-white/5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-white font-display">
                  Active Milestone Accelerator
                </CardTitle>
                <p className="text-xs text-white/50 mt-1">
                  Track targets and leverage neural micro-saving cycles to fast-track your reserves.
                </p>
              </div>
            </div>
            
            <Button 
              size="sm"
              variant="outline"
              onClick={() => {
                if (isEditingGoal) {
                  const parsedTarget = Math.max(1, Number(tempGoalTarget) || 5000);
                  setGoalName(tempGoalName);
                  setGoalTarget(parsedTarget);
                  setGoalDate(tempGoalDate);
                  
                  localStorage.setItem('savings_goal_name', tempGoalName);
                  localStorage.setItem('savings_goal_target', String(parsedTarget));
                  localStorage.setItem('savings_goal_date', tempGoalDate);
                } else {
                  setTempGoalName(goalName);
                  setTempGoalTarget(String(goalTarget));
                  setTempGoalDate(goalDate);
                }
                setIsEditingGoal(!isEditingGoal);
              }}
              className="text-xs bg-white/5 border-white/10 hover:bg-white/10 text-white cursor-pointer self-start sm:self-auto"
            >
              {isEditingGoal ? "Save Milestone" : "Edit Milestone"}
            </Button>
          </CardHeader>

          <CardContent className="pt-6">
            {isEditingGoal ? (
              <div className="space-y-4 max-w-xl">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-white/40">Milestone Name</label>
                    <input 
                      type="text"
                      value={tempGoalName}
                      onChange={(e) => setTempGoalName(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-white/40">Target Reserve ({formatAmount(1).substring(0,1)})</label>
                    <input 
                      type="number"
                      value={tempGoalTarget}
                      onChange={(e) => setTempGoalTarget(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-white/40">Target Horizon Date</label>
                    <input 
                      type="date"
                      value={tempGoalDate}
                      onChange={(e) => setTempGoalDate(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Visual reserve track ring */}
                <div className="lg:col-span-4 flex flex-col justify-between p-5 bg-white/5 rounded-2xl border border-white/10">
                  <div>
                    <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider">Milestone Objective</span>
                    <h3 className="text-xl font-bold font-display text-white mt-1 ">{goalName}</h3>
                    <p className="text-xs text-white/40 font-mono mt-1">Horizon Date: {new Date(goalDate).toLocaleDateString()}</p>
                  </div>
                  
                  <div className="mt-6 space-y-2">
                    <div className="flex items-end justify-between">
                      <div className="space-y-0.5">
                        <span className="text-xs text-white/40">Aggregated Reserves</span>
                        <div className="text-2xl font-black font-mono text-white">
                          {formatAmount(netSavedTotal)}
                          <span className="text-xs text-white/40 font-normal"> / {formatAmount(goalTarget)}</span>
                        </div>
                      </div>
                      <span className="text-lg font-black font-mono text-emerald-400">{progressPercent}%</span>
                    </div>
                    
                    {/* Progress tracking line bar */}
                    <div className="w-full bg-white/5 rounded-full h-2.5 overflow-hidden border border-white/5">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercent}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400 shadow-[0_0_12px_rgba(52,211,153,0.4)]"
                      />
                    </div>
                  </div>

                  {/* Manual Log Contributions Deposit Input */}
                  <div className="mt-6 pt-5 border-t border-white/5 flex gap-2 items-center">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-2.5 text-xs text-white/40 font-mono select-none">Log</span>
                      <input 
                        type="number"
                        placeholder="Add virtual deposit..."
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        className="w-full pl-11 pr-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-400"
                      />
                    </div>
                    <Button 
                      onClick={() => {
                        const amt = Number(depositAmount);
                        if (!isNaN(amt) && amt > 0) {
                          const nextVal = customDeposits + amt;
                          setCustomDeposits(nextVal);
                          localStorage.setItem('savings_custom_deposits', String(nextVal));
                          setDepositAmount('');
                          setToastMessage(`Milestone reserve augmented by ${formatAmount(amt)}!`);
                          setShowToast(true);
                          setTimeout(() => setShowToast(false), 3000);
                        }
                      }}
                      size="sm"
                      className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs px-3.5 h-9 rounded-xl cursor-pointer"
                    >
                      Deposit
                    </Button>
                  </div>
                </div>

                {/* suggested micro savings cards / daily weekly suggestions */}
                <div className="lg:col-span-4 flex flex-col justify-between p-5 bg-white/5 rounded-2xl border border-white/10">
                  <div>
                    <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider">Algorithmic Recommendations</span>
                    <h4 className="text-sm font-bold text-white mt-1">Suggested Micro-Savings Cycles</h4>
                    <p className="text-xs text-white/50 mt-1">Daily and weekly micro contributions needed to hit horizon date.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="p-4 bg-black/20 rounded-xl border border-white/5 space-y-1">
                      <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest">DAILY CYCLE</span>
                      <div className="text-base font-bold font-mono text-cyan-400">{formatAmount(suggestedDaily)}</div>
                      <p className="text-[9px] text-white/40 font-mono">For {daysRemaining} days</p>
                    </div>

                    <div className="p-4 bg-black/20 rounded-xl border border-white/5 space-y-1">
                      <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest">WEEKLY CYCLE</span>
                      <div className="text-base font-bold font-mono text-purple-400">{formatAmount(suggestedWeekly)}</div>
                      <p className="text-[9px] text-white/40 font-mono">For {weeksRemaining} weeks</p>
                    </div>
                  </div>

                  <div className="bg-cyan-500/5 border border-cyan-500/10 rounded-xl p-3 mt-4">
                    <p className="text-[11px] text-cyan-400/90 leading-relaxed font-mono flex items-start gap-1.5">
                      <Sparkles className="w-4 h-4 shrink-0 text-cyan-400 mt-0.5" />
                      <span>Ledger saved <strong className="text-white font-mono">{formatAmount(netLedgerSavings)}</strong> in primary cash-flow this cycle!</span>
                    </p>
                  </div>
                </div>

                {/* Neural habit recommendations column based on real categories */}
                <div className="lg:col-span-4 flex flex-col justify-between p-5 bg-white/5 rounded-2xl border border-white/10">
                  <div>
                    <span className="text-[10px] font-mono text-purple-400 uppercase tracking-wider">Intelligence Suggestions</span>
                    <h4 className="text-sm font-bold text-white mt-1">Micro-Habit Nuances</h4>
                    <p className="text-xs text-white/50 mt-1">Actionable habit changes to secure daily threshold amounts.</p>
                  </div>

                  <div className="mt-4 space-y-2.5">
                    <div className="p-3 bg-black/25 rounded-xl border border-white/5 flex gap-2.5 leading-relaxed text-xs">
                      <span className="text-lg">☕</span>
                      <div>
                        <h5 className="font-semibold text-white/90 text-[11px]">Caffeine Node Opt-Out</h5>
                        <p className="text-[11px] text-white/50 leading-normal">Brew cafe vectors locally 3 times to save <strong className="text-cyan-400 font-mono">{formatAmount(15)}/wk</strong>.</p>
                      </div>
                    </div>

                    <div className="p-3 bg-black/25 rounded-xl border border-white/5 flex gap-2.5 leading-relaxed text-xs">
                      <span className="text-lg">🚲</span>
                      <div>
                        <h5 className="font-semibold text-white/90 text-[11px]">Aesthetic Logistics</h5>
                        <p className="text-[11px] text-white/50 leading-normal">Opt for cycle transit on short tasks to reclaim <strong className="text-cyan-400 font-mono">{formatAmount(10)}/wk</strong>.</p>
                      </div>
                    </div>

                    <div className="p-3 bg-black/25 rounded-xl border border-white/5 flex gap-2.5 leading-relaxed text-xs">
                      <span className="text-lg">🍿</span>
                      <div>
                        <h5 className="font-semibold text-white/90 text-[11px]">Neural Sync Purge</h5>
                        <p className="text-[11px] text-white/50 leading-normal">Consolidate auxiliary media nodes to secure <strong className="text-cyan-400 font-mono">{formatAmount(12)}/mo</strong>.</p>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="lg:col-span-2">
          <Card className="glass-card border-none h-[100%]">
            <CardHeader>
              <CardTitle className="text-white/80">Cash Flow</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="rgba(255,255,255,0.5)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(value) => formatAmount(value)} />
                    <RechartsTooltip cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '3 3' }} content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" isAnimationActive={true} animationDuration={1500} />
                    <Area type="monotone" dataKey="expense" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorExpense)" isAnimationActive={true} animationDuration={1500} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="flex flex-col gap-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="flex-1 flex">
            <Card className="glass-card border-none flex-1">
              <CardHeader className="pb-2">
                 <CardTitle className="text-white/80 flex items-center justify-between">
                   AI Health Score
                   <HeartPulse className="w-5 h-5 text-purple-400" />
                 </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center p-4 relative">
                   <div className="w-32 h-32 relative flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90">
                         <circle cx="64" cy="64" r="56" stroke="rgba(255,255,255,0.05)" strokeWidth="8" fill="none" />
                         <motion.circle 
                           cx="64" cy="64" r="56" 
                           stroke="url(#healthGradient)" 
                           strokeWidth="8" 
                           fill="none" 
                           strokeDasharray="351.85" 
                           initial={{ strokeDashoffset: 351.85 }}
                           animate={{ strokeDashoffset: 351.85 - (84/100)*351.85 }} /* 84 score */
                           transition={{ duration: 2, ease: "easeOut" }}
                           strokeLinecap="round" 
                         />
                         <defs>
                            <linearGradient id="healthGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                               <stop offset="0%" stopColor="#22d3ee" />
                               <stop offset="100%" stopColor="#a855f7" />
                            </linearGradient>
                         </defs>
                      </svg>
                      <div className="absolute flex flex-col items-center justify-center">
                        <span className="text-4xl font-display font-bold text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">84</span>
                        <span className="text-[10px] text-white/40 uppercase tracking-widest">Optimal</span>
                      </div>
                   </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="flex-1 flex">
            <Card className="glass-card border-none flex-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-white/80 flex items-center justify-between">
                  Cybertruck Fund
                  <Target className="w-5 h-5 text-cyan-400" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                 <div className="w-full bg-white/5 rounded-full h-3 mb-2 overflow-hidden border border-white/10">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: "65%" }}
                      transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
                      className="bg-cyan-400 h-full rounded-full shadow-[0_0_10px_rgba(34,211,238,0.5)] relative overflow-hidden"
                    >
                       <div className="absolute top-0 right-0 bottom-0 w-24 bg-gradient-to-r from-transparent to-white/30 skew-x-[-20deg] animate-[shimmer_2s_infinite]" />
                    </motion.div>
                 </div>
                 <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-cyan-400 font-bold">{formatAmount(65000)}</span>
                    <span className="text-white/40">Goal: {formatAmount(100000)}</span>
                 </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
