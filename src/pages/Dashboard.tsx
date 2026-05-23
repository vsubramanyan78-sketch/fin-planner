import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'motion/react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ArrowUpRight, ArrowDownRight, Wallet, TrendingUp, DollarSign, Activity, AlertCircle, Target, Sparkles, X, HeartPulse, Trophy, Star, Medal } from 'lucide-react';
import { useAuth } from '@/src/context/AuthContext';
import { useCurrency } from '@/src/context/CurrencyContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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

  const fetchDashboardData = useCallback(() => {
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
  }, [token]);

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
  const balance = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;

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

      <div>
        <h2 className="text-3xl font-display font-bold text-white">Welcome back, {user?.name?.split(' ')[0]}</h2>
        <p className="text-white/50 mt-1">Here is your financial overview.</p>
      </div>

      {/* Achievement Badges */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="glass-card border-none">
          <CardContent className="flex items-center gap-4 py-5 px-6">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 ${hasSavingsStreak ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-white/5 text-white/20 border border-white/10'}`}>
               <Star className="w-7 h-7" />
            </div>
            <div>
               <h4 className={`font-bold text-lg ${hasSavingsStreak ? 'text-white' : 'text-white/40'}`}>Savings Streak</h4>
               <p className="text-xs text-white/50">Saved over 10% of total income</p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-none">
          <CardContent className="flex items-center gap-4 py-5 px-6">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 ${hasBudgetMaster ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.3)]' : 'bg-white/5 text-white/20 border border-white/10'}`}>
               <Medal className="w-7 h-7" />
            </div>
            <div>
               <h4 className={`font-bold text-lg ${hasBudgetMaster ? 'text-white' : 'text-white/40'}`}>Budget Master</h4>
               <p className="text-xs text-white/50">Stayed within all budget thresholds</p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-none">
          <CardContent className="flex items-center gap-4 py-5 px-6">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 ${hasBigSpender ? 'bg-cyan-400/20 text-cyan-400 border border-cyan-400/30 shadow-[0_0_15px_rgba(34,211,238,0.3)]' : 'bg-white/5 text-white/20 border border-white/10'}`}>
               <Trophy className="w-7 h-7" />
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
