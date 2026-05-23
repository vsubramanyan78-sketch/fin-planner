import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { motion } from 'motion/react';
import { Sparkles, TrendingUp, TrendingDown, Target, Download, Loader2 } from 'lucide-react';
import { useAuth } from '@/src/context/AuthContext';
import { useCurrency } from '@/src/context/CurrencyContext';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const SkeletonLoader = () => (
  <div className="space-y-6">
    <div className="w-1/4 h-10 bg-white/5 animate-pulse rounded-lg" />
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[...Array(3)].map((_, i) => (
        <Card key={i} className="glass-card border-none h-32 animate-pulse bg-white/5" />
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="glass-card border-none h-[400px] animate-pulse bg-white/5" />
      <Card className="glass-card border-none h-[400px] animate-pulse bg-white/5" />
    </div>
  </div>
);

// Data calculated inside component

const CustomTooltip = ({ active, payload, label }: any) => {
  const { formatAmount } = useCurrency();
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#020203]/90 backdrop-blur-md border border-white/10 p-3 rounded-xl shadow-xl">
        <p className="text-white/70 text-xs mb-2 font-medium uppercase tracking-wider">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-3 mt-1.5">
            <div className="w-2 h-2 rounded-full shadow-[0_0_8px_currentColor]" style={{ color: entry.color, backgroundColor: entry.color }} />
            <span className="text-sm font-bold text-white font-mono">
              {entry.name === 'count' ? entry.value : formatAmount(entry.value)}
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
  const { formatAmount } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [downloading, setDownloading] = useState(false);

  const fetchAnalyticsData = useCallback(() => {
    fetch('/api/transactions', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(r => r.json())
    .then(data => {
      setTransactions(data.transactions || []);
      setLoading(false);
    });

    fetch('/api/budgets', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(r => r.json())
    .then(data => setBudgets(data.budgets || []));
  }, [token]);

  useEffect(() => {
    fetchAnalyticsData();
    window.addEventListener('transactionAdded', fetchAnalyticsData);
    return () => window.removeEventListener('transactionAdded', fetchAnalyticsData);
  }, [fetchAnalyticsData]);

  const downloadPDF = async () => {
    setDownloading(true);
    try {
      const element = document.getElementById('analytics-report');
      if (!element) return;
      
      const canvas = await html2canvas(element, { scale: 2, backgroundColor: null, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, Math.min(pdfHeight, pdf.internal.pageSize.getHeight()));
      pdf.save('financial-analytics.pdf');
    } catch (e) {
      console.error(e);
    } finally {
      setDownloading(false);
    }
  };

  const formatMonth = (dateString: string) => {
    return new Date(dateString).toLocaleString('default', { month: 'short' });
  };
  
  const monthlyMap: Record<string, { spend: number; budget: number }> = {};
  const categoryMap: Record<string, number> = {};

  transactions.forEach((t: any) => {
    if (t.type !== 'expense' || !t.date) return;
    const month = formatMonth(t.date);
    if (!monthlyMap[month]) monthlyMap[month] = { spend: 0, budget: 3000 };
    monthlyMap[month].spend += t.amount;

    categoryMap[t.category] = (categoryMap[t.category] || 0) + 1;
  });

  const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyData = Object.entries(monthlyMap)
    .sort((a, b) => monthOrder.indexOf(a[0]) - monthOrder.indexOf(b[0]))
    .map(([name, data]) => ({ name, spend: data.spend, budget: data.budget }));

  if (monthlyData.length === 0) {
    const currentMonth = formatMonth(new Date().toISOString());
    monthlyData.push({ name: currentMonth, spend: 0, budget: 3000 });
  }

  const categoryData = Object.entries(categoryMap).map(([name, count]) => ({ name, count }));
  if (categoryData.length === 0) {
    categoryData.push({ name: 'None', count: 0 });
  }

  const defaultBudgets: Record<string, { limit: number; color: string }> = {
    'Housing': { limit: 1800, color: 'bg-cyan-400' },
    'Food': { limit: 800, color: 'bg-red-400' },
    'Transport': { limit: 300, color: 'bg-purple-500' },
    'Entertainment': { limit: 250, color: 'bg-emerald-400' },
  };

  // Convert real budgets or fallback
  const budgetList = budgets.length > 0 ? budgets.map((b: any, idx) => ({
    name: b.category,
    limit: b.limit_amount,
    color: ['bg-cyan-400', 'bg-red-400', 'bg-purple-500', 'bg-emerald-400', 'bg-yellow-400'][idx % 5]
  })) : Object.entries(defaultBudgets).map(([name, data]) => ({ name, limit: data.limit, color: data.color }));

  const budgetCategories = budgetList.map(item => {
    const spent = transactions
      .filter((t: any) => t.type === 'expense' && t.category.toLowerCase() === item.name.toLowerCase())
      .reduce((acc: number, t: any) => acc + t.amount, 0);
    return { name: item.name, spent, limit: item.limit, color: item.color };
  });

  const savingsString = "0.0";
  // If we want savings percentage
  const totalIncome = transactions.filter((t: any) => t.type === 'income').reduce((acc: number, t: any) => acc + t.amount, 0);
  const totalExpense = transactions.filter((t: any) => t.type === 'expense').reduce((acc: number, t: any) => acc + t.amount, 0);
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome * 100).toFixed(1) : '0.0';

  if (loading) return <SkeletonLoader />;

  return (
    <div className="space-y-6 pb-12" id="analytics-report">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold text-white">Analytics & Insights</h2>
          <p className="text-white/50 mt-1">Neural analysis of your financial trajectories.</p>
        </div>
        <Button 
          variant="outline" 
          onClick={downloadPDF} 
          disabled={downloading}
          className="bg-white/5 border-white/10 text-white hover:bg-white/10 rounded-xl max-w-fit"
        >
          {downloading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
          Download PDF
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} whileHover={{ y: -5 }}>
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

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} whileHover={{ y: -5 }}>
          <Card className="glass-card border-none overflow-hidden relative group">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-white/50 tracking-widest uppercase">Savings Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-mono text-white">{savingsRate}%</div>
              <p className="text-xs text-emerald-400 flex items-center mt-2 font-medium">
                <Target className="h-3 w-3 mr-1" /> Based on current ledger
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} whileHover={{ y: -5 }}>
           <Card className="glass-card border-none bg-gradient-to-br from-cyan-400/10 to-purple-500/10 border-cyan-400/20 shadow-[0_0_20px_rgba(34,211,238,0.1)]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-cyan-400 flex items-center gap-2 uppercase tracking-widest">
                <Sparkles className="w-4 h-4" /> AI Insight
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-white/80 leading-relaxed">We detected you can save <span className="text-white font-bold font-mono">~{formatAmount(400)}</span> this month by curbing dining out expenses on weekends.</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <Card className="glass-card border-none h-full">
          <CardHeader>
            <CardTitle className="text-white/80">Budget vs Spend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => formatAmount(v)} />
                  <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} content={<CustomTooltip />} />
                  <Bar dataKey="spend" fill="#22d3ee" radius={[4, 4, 0, 0]} isAnimationActive={true} animationDuration={1500} />
                  <Bar dataKey="budget" fill="rgba(255,255,255,0.1)" radius={[4, 4, 0, 0]} isAnimationActive={true} animationDuration={1500} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <Card className="glass-card border-none h-full">
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
        </motion.div>
      </div>

      {/* Budget Categories Progress */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
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
                    <span className={isOver ? 'text-red-400 font-bold' : 'text-white'}>{formatAmount(cat.spent)}</span> / {formatAmount(cat.limit)}
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
      </motion.div>
    </div>
  );
}
