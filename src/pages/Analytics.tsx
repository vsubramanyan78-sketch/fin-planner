import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarHeatmap } from '@/src/components/CalendarHeatmap';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { motion } from 'motion/react';
import { Sparkles, TrendingUp, TrendingDown, Target, Download, Loader2 } from 'lucide-react';
import { useAuth } from '@/src/context/AuthContext';
import { useCurrency } from '@/src/context/CurrencyContext';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const PIE_COLORS = ['#22d3ee', '#a855f7', '#ec4899', '#f43f5e', '#10b981', '#f59e0b', '#3b82f6', '#14b8a6'];

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
  const { token, user } = useAuth();
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

  const downloadPDF = () => {
    setDownloading(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      // Document metadata
      const todayStr = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      const userName = user?.name || 'Active Client Node';
      const userEmail = user?.email || 'authenticated@neurofin.io';
      
      // Page 1 Setup (Slate header box)
      pdf.setFillColor(15, 23, 42); // slate 900
      pdf.rect(0, 0, 210, 40, 'F');
      
      // Header branding
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(22);
      pdf.text('NEUROFIN INTELLECTUAL LEDGER', 15, 20);
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(148, 163, 184); // slate 400
      pdf.text('Statement Cycle: Current Month Rolling Summary', 15, 28);
      pdf.text(`Printed: ${todayStr}`, 150, 28);
      
      // Executive Account Info Section
      let y = 55;
      pdf.setFillColor(15, 23, 42);
      pdf.setTextColor(15, 23, 42);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.text('ACCOUNT SUMMARY NODE', 15, y);
      
      pdf.setDrawColor(226, 232, 240); // slate 200
      pdf.setLineWidth(0.4);
      pdf.line(15, y + 2, 195, y + 2);
      
      y += 10;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(100, 116, 139); // slate 505
      pdf.text(`Client Owner:`, 15, y);
      pdf.setTextColor(15, 23, 42);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${userName}`, 42, y);
      
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 116, 139);
      pdf.text(`Client Node Email:`, 110, y);
      pdf.setTextColor(15, 23, 42);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${userEmail}`, 145, y);
      
      // Ledger Performance Metrics
      y += 15;
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.setTextColor(15, 23, 42);
      pdf.text('FINANCIAL VELOCITY METRICS', 15, y);
      pdf.line(15, y + 2, 195, y + 2);
      
      y += 12;
      const totalInflows = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
      const totalOutflows = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
      const activeSavings = totalInflows - totalOutflows;
      const savingsPercentage = totalInflows > 0 ? `${((activeSavings / totalInflows) * 100).toFixed(1)}%` : '0.0%';
      
      // Render clean metric cards
      pdf.setFillColor(248, 250, 252); // slate 50
      pdf.rect(15, y, 55, 22, 'F');
      pdf.rect(75, y, 55, 22, 'F');
      pdf.rect(135, y, 60, 22, 'F');
      
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 116, 139);
      pdf.text('TOTAL INFLOWS', 20, y + 6);
      pdf.text('TOTAL OUTFLOWS', 80, y + 6);
      pdf.text('LEDGER NET SAVINGS', 140, y + 6);
      
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(16, 185, 129); // green 500
      pdf.text(formatAmount(totalInflows), 20, y + 15);
      pdf.setTextColor(239, 68, 68); // red 500
      pdf.text(formatAmount(totalOutflows), 80, y + 15);
      pdf.setTextColor(15, 23, 42);
      pdf.text(`${formatAmount(activeSavings)} (${savingsPercentage})`, 140, y + 15);
      
      // Budget threshold status table
      y += 35;
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.setTextColor(15, 23, 42);
      pdf.text('BUDGET UTILIZATION TRACKING', 15, y);
      pdf.line(15, y + 2, 195, y + 2);
      
      y += 10;
      pdf.setFillColor(226, 232, 240); // header row background slate 200
      pdf.rect(15, y, 180, 7, 'F');
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(15, 23, 42);
      pdf.text('CATEGORY', 18, y + 5);
      pdf.text('ACTUAL SPENT', 75, y + 5);
      pdf.text('BUDGET LIMIT', 125, y + 5);
      pdf.text('UTILIZATION STATUS', 165, y + 5);
      
      pdf.setFont('helvetica', 'normal');
      budgetCategories.forEach((cat, idx) => {
        y += 8;
        // background zebra stripes
        if (idx % 2 === 1) {
          pdf.setFillColor(248, 250, 252);
          pdf.rect(15, y, 180, 7, 'F');
        }
        pdf.setTextColor(15, 23, 42);
        pdf.text(cat.name.toUpperCase(), 18, y + 5);
        pdf.text(formatAmount(cat.spent), 75, y + 5);
        pdf.text(formatAmount(cat.limit), 125, y + 5);
        
        const ratio = cat.limit > 0 ? (cat.spent / cat.limit) * 100 : 0;
        if (ratio > 100) {
          pdf.setTextColor(239, 68, 68);
          pdf.text(`${ratio.toFixed(0)}% OVER`, 165, y + 5);
        } else if (ratio >= 80) {
          pdf.setTextColor(245, 158, 11);
          pdf.text(`${ratio.toFixed(0)}% APPR`, 165, y + 5);
        } else {
          pdf.setTextColor(16, 185, 129);
          pdf.text(`${ratio.toFixed(0)}% OK`, 165, y + 5);
        }
      });
      
      // Transaction ledger breakdown
      y += 20;
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.setTextColor(15, 23, 42);
      pdf.text('RECENT ACTIVITY LEDGER NODES', 15, y);
      pdf.line(15, y + 2, 195, y + 2);
      
      y += 10;
      pdf.setFillColor(226, 232, 240);
      pdf.rect(15, y, 180, 7, 'F');
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(15, 23, 42);
      pdf.text('DATE', 18, y + 5);
      pdf.text('MERCHANT / TITLE', 55, y + 5);
      pdf.text('CATEGORY', 115, y + 5);
      pdf.text('AMOUNT', 165, y + 5);
      
      pdf.setFont('helvetica', 'normal');
      transactions.slice(0, 8).forEach((tx, idx) => {
        y += 8;
        const txDate = tx.date ? new Date(tx.date).toLocaleDateString() : 'N/A';
        pdf.setTextColor(100, 116, 139);
        pdf.text(txDate, 18, y + 5);
        pdf.setTextColor(15, 23, 42);
        pdf.text(tx.title || 'N/A', 55, y + 5);
        pdf.text(tx.category || 'Other', 115, y + 5);
        
        if (tx.type === 'income') {
          pdf.setTextColor(16, 185, 129);
          pdf.text(`+${formatAmount(tx.amount)}`, 165, y + 5);
        } else {
          pdf.setTextColor(15, 23, 42);
          pdf.text(`-${formatAmount(tx.amount)}`, 165, y + 5);
        }
      });
      
      // Footing note
      y += 14;
      pdf.setFontSize(7);
      pdf.setTextColor(148, 163, 184);
      pdf.text('NeuroFin Analytical Engine - Secure Ledger Cryptography Protocol Summary. Confidential document for personal account storage.', 16, y);
      
      pdf.save(`neurofin_ledger_statement_${new Date().getFullYear()}_${new Date().getMonth() + 1}.pdf`);
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

  const spendingCategoryMap: Record<string, number> = {};
  transactions.forEach((t: any) => {
    if (t.type !== 'expense') return;
    spendingCategoryMap[t.category] = (spendingCategoryMap[t.category] || 0) + t.amount;
  });

  const spendingCategoryData = Object.entries(spendingCategoryMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  if (spendingCategoryData.length === 0) {
    spendingCategoryData.push({ name: 'None', value: 0 });
  }

  // Historical category spending over time (multi-line graph)
  const categoryTrendMap: Record<string, Record<string, number>> = {};
  transactions.forEach((t: any) => {
    if (t.type !== 'expense' || !t.date) return;
    const m = formatMonth(t.date);
    if (!categoryTrendMap[m]) {
      categoryTrendMap[m] = {
        'Food': 0,
        'Utilities': 0,
        'Entertainment': 0,
        'Housing': 0,
        'Transport': 0,
        'Other': 0
      };
    }
    const cat = t.category || 'Other';
    const knownKeys = ['Food', 'Utilities', 'Entertainment', 'Housing', 'Transport', 'Other'];
    const matched = knownKeys.find(k => k.toLowerCase() === cat.toLowerCase()) || 'Other';
    categoryTrendMap[m][matched] += t.amount;
  });

  const categoryTrendData: { name: string; [key: string]: any }[] = Object.entries(categoryTrendMap)
    .sort((a, b) => monthOrder.indexOf(a[0]) - monthOrder.indexOf(b[0]))
    .map(([month, cats]) => ({
      name: month,
      ...cats
    }));

  if (categoryTrendData.length === 0) {
    const currM = formatMonth(new Date().toISOString());
    categoryTrendData.push({
      name: currM,
      'Food': 0,
      'Utilities': 0,
      'Entertainment': 0,
      'Housing': 0,
      'Transport': 0,
      'Other': 0
    });
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
            <CardTitle className="text-white/80">Spending Distribution</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row items-center justify-center gap-6 h-[300px]">
            <div className="h-[200px] w-[200px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={spendingCategoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {spendingCategoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} stroke="rgba(0,0,0,0.5)" strokeWidth={1} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-2 overflow-y-auto max-h-[260px] w-full pr-1">
              {spendingCategoryData.map((entry, index) => {
                const total = spendingCategoryData.reduce((acc, curr) => acc + curr.value, 0);
                const pct = total > 0 ? ((entry.value / total) * 100).toFixed(1) : '0';
                return (
                  <div key={entry.name} className="flex items-center justify-between text-xs font-mono border-b border-white/5 pb-1 mt-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                      <span className="text-white/70 truncate max-w-[80px]">{entry.name}</span>
                    </div>
                    <span className="text-white text-right">
                      {formatAmount(entry.value)} <span className="text-white/30 text-[9px] ml-1">({pct}%)</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="lg:col-span-2">
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

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }} className="lg:col-span-2">
        <Card className="glass-card border-none h-full">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-white/80">Category Spending Comparison Over Time</CardTitle>
                <p className="text-xs text-white/40 mt-1">Timeline comparisons across core expenditure categories.</p>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-xl font-mono text-[10px] text-white">
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#ec4899]" /> Food</div>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#f59e0b]" /> Utilities</div>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#a855f7]" /> Entertainment</div>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#22d3ee]" /> Housing</div>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#10b981]" /> Transport</div>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#64748b]" /> Other</div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[320px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={categoryTrendData} margin={{ top: 15, right: 15, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => formatAmount(v)} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="Food" stroke="#ec4899" strokeWidth={2.5} dot={{ fill: '#ec4899', r: 3 }} activeDot={{ r: 5 }} isAnimationActive={true} animationDuration={1500} />
                  <Line type="monotone" dataKey="Utilities" stroke="#f59e0b" strokeWidth={2.5} dot={{ fill: '#f59e0b', r: 3 }} activeDot={{ r: 5 }} isAnimationActive={true} animationDuration={1500} />
                  <Line type="monotone" dataKey="Entertainment" stroke="#a855f7" strokeWidth={2.5} dot={{ fill: '#a855f7', r: 3 }} activeDot={{ r: 5 }} isAnimationActive={true} animationDuration={1500} />
                  <Line type="monotone" dataKey="Housing" stroke="#22d3ee" strokeWidth={2.5} dot={{ fill: '#22d3ee', r: 3 }} activeDot={{ r: 5 }} isAnimationActive={true} animationDuration={1500} />
                  <Line type="monotone" dataKey="Transport" stroke="#10b981" strokeWidth={2.5} dot={{ fill: '#10b981', r: 3 }} activeDot={{ r: 5 }} isAnimationActive={true} animationDuration={1500} />
                  <Line type="monotone" dataKey="Other" stroke="#64748b" strokeWidth={2.5} dot={{ fill: '#64748b', r: 3 }} activeDot={{ r: 5 }} isAnimationActive={true} animationDuration={1500} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        </motion.div>
      </div>
      
      {/* Heatmap Section */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
        <Card className="glass-card border-none">
          <CardHeader>
            <CardTitle className="text-white/80">Transaction Density Heatmap</CardTitle>
          </CardHeader>
          <CardContent>
            <CalendarHeatmap transactions={transactions} />
          </CardContent>
        </Card>
      </motion.div>

      {/* Budget Categories Progress */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
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
