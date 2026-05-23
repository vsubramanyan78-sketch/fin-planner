import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { motion } from 'motion/react';
import { Sparkles, TrendingUp, TrendingDown, Target } from 'lucide-react';
import { useAuth } from '@/src/context/AuthContext';

const monthlyData = [
  { name: 'Jan', spend: 2400, budget: 3000 },
  { name: 'Feb', spend: 1398, budget: 3000 },
  { name: 'Mar', spend: 3800, budget: 3000 },
  { name: 'Apr', spend: 3908, budget: 3000 },
  { name: 'May', spend: 4800, budget: 3000 },
  { name: 'Jun', spend: 3800, budget: 3000 },
  { name: 'Jul', spend: 4300, budget: 3000 },
];

const categoryData = [
  { name: 'Food', count: 45 },
  { name: 'Transport', count: 32 },
  { name: 'Shopping', count: 28 },
  { name: 'Utilities', count: 12 },
  { name: 'Entertainment', count: 20 }
];

const budgetCategories = [
  { name: 'Housing', spent: 1500, limit: 1800, color: 'bg-cyan-400' },
  { name: 'Food', spent: 850, limit: 800, color: 'bg-red-400' }, // Over budget
  { name: 'Transport', spent: 210, limit: 300, color: 'bg-purple-500' },
  { name: 'Entertainment', spent: 120, limit: 250, color: 'bg-emerald-400' },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#020203]/90 backdrop-blur-md border border-white/10 p-3 rounded-xl shadow-xl">
        <p className="text-white/70 text-xs mb-2 font-medium uppercase tracking-wider">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-3 mt-1.5">
            <div className="w-2 h-2 rounded-full shadow-[0_0_8px_currentColor]" style={{ color: entry.color, backgroundColor: entry.color }} />
            <span className="text-sm font-bold text-white font-mono">
              {entry.name === 'count' ? entry.value : `$${entry.value}`}
            </span>
            <span className="text-xs text-white/50 uppercase tracking-wider">{entry.name}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function Analytics() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-display font-bold text-white">Analytics & Insights</h2>
        <p className="text-white/50 mt-1">Neural analysis of your financial trajectories.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div whileHover={{ y: -5 }}>
          <Card className="glass-card border-none overflow-hidden relative group">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-white/50 tracking-widest uppercase">Spending Velocity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-mono text-white">High</div>
              <p className="text-xs text-red-400 flex items-center mt-2 font-medium">
                <TrendingUp className="h-3 w-3 mr-1" /> 15% above average
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileHover={{ y: -5 }}>
          <Card className="glass-card border-none overflow-hidden relative group">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-white/50 tracking-widest uppercase">Savings Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-mono text-white">18.4%</div>
              <p className="text-xs text-emerald-400 flex items-center mt-2 font-medium">
                <Target className="h-3 w-3 mr-1" /> On track for yearly goal
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileHover={{ y: -5 }}>
           <Card className="glass-card border-none bg-gradient-to-br from-cyan-400/10 to-purple-500/10 border-cyan-400/20 shadow-[0_0_20px_rgba(34,211,238,0.1)]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-cyan-400 flex items-center gap-2 uppercase tracking-widest">
                <Sparkles className="w-4 h-4" /> AI Insight
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-white/80 leading-relaxed">We detected you can save <span className="text-white font-bold font-mono">~$400</span> this month by curbing dining out expenses on weekends.</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-card border-none">
          <CardHeader>
            <CardTitle className="text-white/80">Budget vs Spend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                  <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} content={<CustomTooltip />} />
                  <Bar dataKey="spend" fill="#22d3ee" radius={[4, 4, 0, 0]} isAnimationActive={true} animationDuration={1500} />
                  <Bar dataKey="budget" fill="rgba(255,255,255,0.1)" radius={[4, 4, 0, 0]} isAnimationActive={true} animationDuration={1500} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-none">
          <CardHeader>
            <CardTitle className="text-white/80">Transaction Density</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={categoryData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="count" stroke="#a855f7" strokeWidth={3} dot={{ fill: '#a855f7', r: 4, strokeWidth: 0 }} activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }} isAnimationActive={true} animationDuration={1500} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Budget Categories Progress */}
      <Card className="glass-card border-none">
        <CardHeader>
          <CardTitle className="text-white/80">Active Budgets Utilization</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 pt-2">
          {budgetCategories.map((cat, i) => {
            const percentage = Math.min((cat.spent / cat.limit) * 100, 100);
            const isOver = cat.spent > cat.limit;
            return (
              <div key={i}>
                <div className="flex justify-between items-end mb-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-white/60">{cat.name}</span>
                  <span className="text-xs text-white/40 font-mono">
                    <span className={isOver ? 'text-red-400 font-bold' : 'text-white'}>${cat.spent}</span> / ${cat.limit}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 1.5, ease: "easeOut", delay: i * 0.1 }}
                    className={`h-full rounded-full ${isOver ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : `${cat.color} filter brightness-110 drop-shadow-[0_0_8px_currentColor]`}`}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
