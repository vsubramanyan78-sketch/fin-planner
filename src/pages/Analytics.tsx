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

export default function Analytics() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-display font-bold">Analytics & Insights</h2>
        <p className="text-muted-foreground">Neural analysis of your financial trajectories.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div whileHover={{ y: -5 }}>
          <Card className="glass-card border-none overflow-hidden relative group">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Spending Velocity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">High</div>
              <p className="text-xs text-destructive flex items-center mt-1">
                <TrendingUp className="h-3 w-3 mr-1" /> 15% above average
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileHover={{ y: -5 }}>
          <Card className="glass-card border-none overflow-hidden relative group">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Savings Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">18.4%</div>
              <p className="text-xs text-emerald-500 flex items-center mt-1">
                <Target className="h-3 w-3 mr-1" /> On track for yearly goal
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileHover={{ y: -5 }}>
           <Card className="glass-card border-none bg-gradient-to-br from-primary/10 to-neon-purple/10 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-primary flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> AI Insight
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">We detected you can save ~$400 this month by curbing dining out expenses on weekends.</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-card border-none">
          <CardHeader>
            <CardTitle>Budget vs Spend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(15,15,20,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="spend" fill="#22d3ee" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="budget" fill="rgba(255,255,255,0.1)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-none">
          <CardHeader>
            <CardTitle>Transaction Density</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={categoryData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(15,15,20,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Line type="monotone" dataKey="count" stroke="#a855f7" strokeWidth={3} dot={{ fill: '#a855f7', r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
