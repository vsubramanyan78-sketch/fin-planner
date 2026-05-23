import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'motion/react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ArrowUpRight, ArrowDownRight, Wallet, TrendingUp, DollarSign, Activity, AlertCircle, Target, Sparkles, X, HeartPulse } from 'lucide-react';
import { useAuth } from '@/src/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const COLORS = ['#8b5cf6', '#06b6d4', '#f43f5e', '#10b981', '#f59e0b'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#020203]/90 backdrop-blur-md border border-white/10 p-3 rounded-xl shadow-xl">
        {label && <p className="text-white/70 text-xs mb-2 font-medium uppercase tracking-wider">{label}</p>}
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-3 mt-1.5">
            <div className="w-2 h-2 rounded-full shadow-[0_0_8px_currentColor]" style={{ color: entry.color || entry.payload?.fill, backgroundColor: entry.color || entry.payload?.fill }} />
            <span className="text-sm font-bold text-white font-mono">
              ${entry.value}
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
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    fetch('/api/transactions', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(r => r.json())
    .then(data => {
      setTransactions(data.transactions || []);
      setLoading(false);
      
      // Check for over-budget (mock logic for Food category)
      setTimeout(() => setShowToast(true), 2500);
    });
  }, [token]);

  // Mock data for charts
  const monthlyData = [
    { name: 'Jan', expense: 2400, income: 4000 },
    { name: 'Feb', expense: 1398, income: 3000 },
    { name: 'Mar', expense: 9800, income: 2000 },
    { name: 'Apr', expense: 3908, income: 2780 },
    { name: 'May', expense: 4800, income: 1890 },
    { name: 'Jun', expense: 3800, income: 2390 },
    { name: 'Jul', expense: 4300, income: 3490 },
  ];

  const categoryData = [
    { name: 'Housing', value: 1200 },
    { name: 'Food', value: 850 }, // High relative to budget
    { name: 'Transport', value: 200 },
    { name: 'Entertainment', value: 300 },
    { name: 'Utilities', value: 150 },
  ];

  const totalIncome = 8450.00;
  const totalExpense = 4320.50;
  const balance = totalIncome - totalExpense;

  if (loading) return <div className="p-8"><div className="w-8 h-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" /></div>;

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
              <p className="text-white/70 text-xs mt-1">You have exceeded 90% of your <strong className="text-white">Food</strong> budget for this month ($850 / $800).</p>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <TiltCard>
          <Card className="glass-card border-none overflow-hidden relative group h-full">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity duration-500">
              <Wallet className="w-24 h-24 text-cyan-400" />
            </div>
            <CardHeader className="flex flex-row items-center justify-between pb-2 z-10 relative">
              <CardTitle className="text-xs font-bold tracking-widest uppercase text-white/50">Total Balance</CardTitle>
            </CardHeader>
            <CardContent className="z-10 relative">
              <div className="text-4xl font-mono font-bold text-white">${balance.toLocaleString()}</div>
              <p className="text-xs text-emerald-400 flex items-center mt-3 font-medium">
                <ArrowUpRight className="h-3 w-3 mr-1" /> +12% from last month
              </p>
            </CardContent>
          </Card>
        </TiltCard>

        <TiltCard>
          <Card className="glass-card border-none overflow-hidden relative group h-full">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <CardHeader className="flex flex-row items-center justify-between pb-2 z-10 relative">
              <CardTitle className="text-xs font-bold tracking-widest uppercase text-white/50">Monthly Income</CardTitle>
              <TrendingUp className="h-4 w-4 text-emerald-400 opacity-50" />
            </CardHeader>
            <CardContent className="z-10 relative">
              <div className="text-4xl font-mono font-bold text-white">${totalIncome.toLocaleString()}</div>
              <p className="text-xs text-emerald-400 flex items-center mt-3 font-medium">
                <ArrowUpRight className="h-3 w-3 mr-1" /> +4.1%
              </p>
            </CardContent>
          </Card>
        </TiltCard>

        <TiltCard>
          <Card className="glass-card border-none overflow-hidden relative group h-full">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <CardHeader className="flex flex-row items-center justify-between pb-2 z-10 relative">
              <CardTitle className="text-xs font-bold tracking-widest uppercase text-white/50">Monthly Expenses</CardTitle>
              <Activity className="h-4 w-4 text-red-400 opacity-50" />
            </CardHeader>
            <CardContent className="z-10 relative">
              <div className="text-4xl font-mono font-bold text-white">${totalExpense.toLocaleString()}</div>
              <p className="text-xs text-red-400 flex items-center mt-3 font-medium">
                <ArrowDownRight className="h-3 w-3 mr-1" /> -2.5%
              </p>
            </CardContent>
          </Card>
        </TiltCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 glass-card border-none">
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
                  <YAxis stroke="rgba(255,255,255,0.5)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                  <RechartsTooltip cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '3 3' }} content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" isAnimationActive={true} animationDuration={1500} />
                  <Area type="monotone" dataKey="expense" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorExpense)" isAnimationActive={true} animationDuration={1500} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
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
                  <span className="text-cyan-400 font-bold">$65,000</span>
                  <span className="text-white/40">Goal: $100,000</span>
               </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
