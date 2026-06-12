import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarHeatmap } from '@/src/components/CalendarHeatmap';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { motion } from 'motion/react';
import { Sparkles, TrendingUp, TrendingDown, Target, Download, Loader2, Play, Square } from 'lucide-react';
import { useAuth } from '@/src/context/AuthContext';
import { useCurrency } from '@/src/context/CurrencyContext';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Joyride, STATUS } from 'react-joyride';

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
    const dataObj = payload[0].payload;
    return (
      <div className="bg-[#020203]/90 backdrop-blur-md border border-white/10 p-3 rounded-xl shadow-xl z-50 min-w-[200px]">
        <p className="text-white/70 text-xs mb-2 font-medium uppercase tracking-wider">
          {dataObj.dateRange ? dataObj.dateRange : label}
        </p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-3 mt-1.5">
            <div className="w-2 h-2 rounded-full shadow-[0_0_8px_currentColor]" style={{ color: entry.color, backgroundColor: entry.color }} />
            <span className="text-sm font-bold text-white font-mono">
              {entry.name === 'count' ? entry.value : formatAmount(entry.value)}
            </span>
            <span className="text-xs text-white/50 uppercase tracking-wider">{entry.name}</span>
          </div>
        ))}
        {dataObj.topTransactions && dataObj.topTransactions.length > 0 && (
          <div className="mt-3 pt-3 border-t border-white/10">
            <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold block mb-1">Key Transactions</span>
            <div className="space-y-1.5">
              {dataObj.topTransactions.map((tx: any, i: number) => (
                <div key={i} className="flex items-center justify-between gap-4 text-xs">
                  <span className="text-white/70 truncate max-w-[120px]">{tx.title}</span>
                  <div className="text-right flex flex-col items-end">
                     <span className="text-emerald-400 font-mono">{formatAmount(tx.amount)}</span>
                     <span className="text-[9px] text-white/40">{new Date(tx.date).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
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
  const [spendingInsight, setSpendingInsight] = useState<string>("Analyzing your latest spending velocity...");
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);

  const toggleVoiceSummary = () => {
    if (isPlayingVoice) {
      window.speechSynthesis.cancel();
      setIsPlayingVoice(false);
      return;
    }
    
    // Formulate a detailed summary based on data
    const totalInc = transactions.filter(t => t.type === 'income').reduce((a,b) => a + b.amount, 0);
    const totalOut = transactions.filter(t => t.type === 'expense').reduce((a,b) => a + b.amount, 0);
    
    let topCat = 'various categories';
    if (transactions.length > 0) {
      const catMap: Record<string, number> = {};
      transactions.forEach(t => {
        if(t.type === 'expense') catMap[t.category] = (catMap[t.category] || 0) + t.amount;
      });
      const sorted = Object.entries(catMap).sort((a,b) => b[1] - a[1]);
      if(sorted.length > 0) topCat = sorted[0][0];
    }
    
    const rate = totalInc > 0 ? ((totalInc - totalOut) / totalInc * 100).toFixed(1) : '0';
    
    const textToSpeak = `Here is your 6-month trend analysis. Your active spending logic has calculated a primary outflow velocity focused mostly on ${topCat}. Total outflow is ${formatAmount(totalOut)}. The AI reports: ${spendingInsight}. Overall, your savings rate is currently modeling at ${rate} percent based on the latest ledger snapshot.`;
    
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.onend = () => setIsPlayingVoice(false);
    
    window.speechSynthesis.speak(utterance);
    setIsPlayingVoice(true);
  };
  
  // What-If Simulation State
  const [whatIfContribution, setWhatIfContribution] = useState(250);
  const [whatIfMilestone, setWhatIfMilestone] = useState('emergency');
  const [customMilestoneName, setCustomMilestoneName] = useState('Custom Action Goal');
  const [customMilestoneAmount, setCustomMilestoneAmount] = useState(15000);

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

    fetch('/api/ai/spending-insights', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(r => r.json())
    .then(data => {
      if (data.insight) setSpendingInsight(data.insight);
    }).catch(() => {
      setSpendingInsight("Your expense speed is stable. Consider checking budget limits.");
    });
  }, [token]);

  useEffect(() => {
    fetchAnalyticsData();
    window.addEventListener('transactionAdded', fetchAnalyticsData);
    return () => window.removeEventListener('transactionAdded', fetchAnalyticsData);
  }, [fetchAnalyticsData]);

  // Joyride Tour State
  const [tourState, setTourState] = useState<any>({ run: false, steps: [] });
  useEffect(() => {
     if (!localStorage.getItem('tour_what_if')) {
         setTimeout(() => {
           setTourState({
              run: true,
              steps: [
                {
                  target: '#step-what-if',
                  title: 'What-If Savings Simulator',
                  content: 'Test out different future savings strategies here! Play around with contribution values to see exactly how fast you can hit your long-term milestones.',
                  placement: 'top',
                  disableBeacon: true
                }
              ]
           });
         }, 1000);
     }
  }, []);

  const handleJoyrideCallback = (data: any) => {
    const { status } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];
    if (finishedStatuses.includes(status)) {
      setTourState({ ...tourState, run: false });
      localStorage.setItem('tour_what_if', 'true');
    }
  };

  const downloadPDF = async () => {
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
      pdf.text('Monthly Snapshot & Insights Report', 15, 28);
      pdf.text(`Printed: ${todayStr}`, 150, 28);
      
      let y = 50;

      // Check if we can capture the chart and insight HTML
      const chartEl = document.getElementById('main-bar-chart');
      const insightEl = document.getElementById('ai-insight-box');
      
      if (chartEl) {
         const chartCanvas = await html2canvas(chartEl, { scale: 2, backgroundColor: '#0f172a' });
         const chartImg = chartCanvas.toDataURL('image/jpeg', 0.8);
         const imgWidth = 180;
         const imgHeight = (chartCanvas.height * imgWidth) / chartCanvas.width;
         
         pdf.setFont('helvetica', 'bold');
         pdf.setFontSize(12);
         pdf.setTextColor(15, 23, 42);
         pdf.text('MONTHLY SPENDING TRAJECTORY', 15, y);
         y += 5;
         
         pdf.addImage(chartImg, 'JPEG', 15, y, imgWidth, imgHeight);
         y += imgHeight + 15;
      }

      if (insightEl) {
         const insightCanvas = await html2canvas(insightEl, { scale: 2, backgroundColor: '#0f172a' });
         const insightImg = insightCanvas.toDataURL('image/jpeg', 0.8);
         const imgWidth = 180;
         const imgHeight = (insightCanvas.height * imgWidth) / insightCanvas.width;
         
         if (y + imgHeight > 280) {
            pdf.addPage();
            y = 20;
         }

         pdf.setFont('helvetica', 'bold');
         pdf.setFontSize(12);
         pdf.setTextColor(15, 23, 42);
         pdf.text('NEURAL FORECASTS & INSIGHTS', 15, y);
         y += 5;
         
         pdf.addImage(insightImg, 'JPEG', 15, y, imgWidth, imgHeight);
      }
      
      // Footing note
      pdf.setFontSize(7);
      pdf.setTextColor(148, 163, 184);
      pdf.text('NeuroFin Analytical Engine - Extracted Monthly Snapshot.', 16, 290);
      
      pdf.save(`neurofin_monthly_report_${new Date().getFullYear()}_${new Date().getMonth() + 1}.pdf`);
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
      .filter((t: any) => t.type === 'expense' && t.category && t.category.toLowerCase() === item.name.toLowerCase())
      .reduce((acc: number, t: any) => acc + t.amount, 0);
    return { name: item.name, spent, limit: item.limit, color: item.color };
  });

  const savingsString = "0.0";
  // If we want savings percentage
  const totalIncome = transactions.filter((t: any) => t.type === 'income').reduce((acc: number, t: any) => acc + t.amount, 0);
  const totalExpense = transactions.filter((t: any) => t.type === 'expense').reduce((acc: number, t: any) => acc + t.amount, 0);
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome * 100).toFixed(1) : '0.0';

  // Last 6-months Chronological Expense and Budget Trends Tracker
  const getLast6MonthsData = () => {
    const dataList = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mName = d.toLocaleString('default', { month: 'short' });
      
      const txsInMonth = transactions
        .filter((t: any) => {
          if (t.type !== 'expense' || !t.date) return false;
          const txDate = new Date(t.date);
          return txDate.getFullYear() === d.getFullYear() && txDate.getMonth() === d.getMonth();
        });
      
      const spend = txsInMonth.reduce((sum: number, t: any) => sum + t.amount, 0);
      
      // Get top 3 transactions to display exact amounts & dates in Tooltip
      const sortedTxs = [...txsInMonth].sort((a, b) => b.amount - a.amount).slice(0, 3);
        
      dataList.push({
        name: mName,
        spend: spend,
        budget: 3500, // standard ceiling limit
        dateRange: `${d.toLocaleString('default', { month: 'long', year: 'numeric' })}`,
        topTransactions: sortedTxs
      });
    }
    return dataList;
  };
  const last6MonthsData = getLast6MonthsData();

  // What-If Milestone Calculations
  const calculatedBaseline = totalIncome - totalExpense;
  const baselineSavingsRate = calculatedBaseline > 0 ? calculatedBaseline : 450; // standard fallback of $450/month if negative or 0
  const adjustedSavingsRate = Math.max(15, baselineSavingsRate + whatIfContribution);

  const targetValue = 
    whatIfMilestone === 'emergency' ? 15000 : 
    whatIfMilestone === 'home' ? 85000 : 
    whatIfMilestone === 'retirement' ? 500000 : 
    Number(customMilestoneAmount) || 10000;

  const targetName = 
    whatIfMilestone === 'emergency' ? 'Emergency Reserve Fund' : 
    whatIfMilestone === 'home' ? 'Silicon Valley Downpayment' : 
    whatIfMilestone === 'retirement' ? 'Financial Freedom Nest' : 
    customMilestoneName;

  const monthsStandard = targetValue / baselineSavingsRate;
  const monthsAdjusted = targetValue / adjustedSavingsRate;
  const monthlySavingsDelta = monthsStandard - monthsAdjusted;

  // Projection points for AreaChart comparisons
  const projectionData: { month: string; Baseline: number; Adjusted: number }[] = [];
  for (let m = 0; m <= 36; m += 3) {
    projectionData.push({
      month: `M+${m}`,
      Baseline: Math.round(baselineSavingsRate * m),
      Adjusted: Math.round(adjustedSavingsRate * m)
    });
  }

  if (loading) return <SkeletonLoader />;

  return (
    <div className="space-y-6 pb-12" id="analytics-report">
      <Joyride {...({
        callback: handleJoyrideCallback,
        continuous: true,
        hideCloseButton: true,
        run: tourState.run,
        scrollToFirstStep: true,
        showProgress: true,
        showSkipButton: true,
        steps: tourState.steps,
        styles: {
          options: {
            zIndex: 10000,
            primaryColor: '#22d3ee',
            backgroundColor: '#0f172a',
            textColor: '#fff',
            arrowColor: '#0f172a',
          },
          tooltip: {
            border: '1px solid rgba(34, 211, 238, 0.2)',
            borderRadius: '16px',
            boxShadow: '0 0 20px rgba(34, 211, 238, 0.1)'
          },
          buttonBack: {
             color: '#fff',
          }
        }
      } as any)} />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold text-white">Analytics & Insights</h2>
          <p className="text-white/50 mt-1">Neural analysis of your financial trajectories.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button 
            variant="outline"
            onClick={toggleVoiceSummary}
            className={`border rounded-xl max-w-fit font-medium flex items-center shadow-lg transition-all ${
              isPlayingVoice 
                 ? "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)] animate-pulse"
                 : "bg-[#0b0c15] border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 shadow-[0_0_15px_rgba(34,211,238,0.15)]"
            }`}
          >
            {isPlayingVoice ? <Square className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2 text-cyan-400" />}
            {isPlayingVoice ? 'Stop AI Summary' : 'Play AI Summary'}
          </Button>

          <Button 
            variant="outline" 
            onClick={downloadPDF} 
            disabled={downloading}
            className="bg-white/5 border-white/10 text-white hover:bg-white/10 rounded-xl max-w-fit shadow-lg"
          >
            {downloading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            Download Monthly Report
          </Button>
        </div>
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

        <motion.div id="ai-insight-box" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} whileHover={{ y: -5 }}>
           <Card className="glass-card border-none bg-gradient-to-br from-cyan-400/10 to-purple-500/10 border-cyan-400/20 shadow-[0_0_20px_rgba(34,211,238,0.1)]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-cyan-400 flex items-center gap-2 uppercase tracking-widest">
                <Sparkles className="w-4 h-4" /> AI Insight
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-white/80 leading-relaxed">{spendingInsight}</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* What-If Forecasting & Savings Milestone Simulator */}
      <motion.div id="step-what-if" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
        <Card className="glass-card border-none bg-gradient-to-br from-cyan-950/20 via-slate-900/40 to-purple-950/20 border border-cyan-500/15">
          <CardHeader className="border-b border-white/5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse" />
              <CardTitle className="text-white font-display text-lg">Interactive Milestone & What-If Savings Simulator</CardTitle>
            </div>
            <p className="text-xs text-white/50">Model adjustments to your monthly savings level to visualize target milestones timing outcomes.</p>
          </CardHeader>
          <CardContent className="pt-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Simulation Controls - Left Side */}
            <div className="lg:col-span-5 space-y-6">
              
              <div className="space-y-2">
                <label className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold block">1. Select Target Milestone</label>
                <select
                  value={whatIfMilestone}
                  onChange={(e) => setWhatIfMilestone(e.target.value)}
                  className="w-full bg-[#0d1223] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white uppercase font-mono tracking-wider focus:outline-none focus:border-cyan-400 cursor-pointer"
                >
                  <option value="emergency">Emergency Reserve Fund ($15,000)</option>
                  <option value="home">Silicon Valley Downpayment ($85,000)</option>
                  <option value="retirement">Financial Freedom Nest ($500,000)</option>
                  <option value="custom">Custom Investment Milestone</option>
                </select>
              </div>

              {whatIfMilestone === 'custom' && (
                <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-white/5 border border-white/10 animate-in fade-in duration-250">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-mono text-white/40 uppercase tracking-widest block font-bold">Goal Name</label>
                    <input
                      type="text"
                      value={customMilestoneName}
                      onChange={(e) => setCustomMilestoneName(e.target.value)}
                      className="w-full bg-slate-950 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white uppercase tracking-wider focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-mono text-white/40 uppercase tracking-widest block font-bold">Target Cost</label>
                    <input
                      type="number"
                      value={customMilestoneAmount}
                      onChange={(e) => setCustomMilestoneAmount(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-cyan-400 uppercase tracking-wider font-bold">2. Adjust Save Level</span>
                  <span className={`px-2.5 py-0.5 rounded-full font-bold ${whatIfContribution >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                    {whatIfContribution >= 0 ? "+" : ""}{formatAmount(whatIfContribution)}/mo
                  </span>
                </div>
                
                <input
                  type="range"
                  min="-300"
                  max="1500"
                  step="50"
                  value={whatIfContribution}
                  onChange={(e) => setWhatIfContribution(Number(e.target.value))}
                  className="w-full select-none cursor-ew-resize accent-cyan-400"
                />
                
                <div className="flex items-center justify-between text-[10px] text-white/35 font-mono">
                  <span>Reduce Save (-{formatAmount(300)})</span>
                  <span>Neutral ($0)</span>
                  <span>Amplify (+{formatAmount(1500)})</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-cyan-400/5 border border-cyan-400/10 space-y-3 font-mono">
                <div className="flex justify-between items-center text-[10px] text-white/50 border-b border-white/5 pb-2">
                  <span>BASELINE RATE:</span>
                  <span className="text-white font-bold">{formatAmount(baselineSavingsRate)} / mo</span>
                </div>
                <div className="flex justify-between items-center text-[11px] text-cyan-400 font-bold">
                  <span>ADJUSTED SAVING VECTOR:</span>
                  <span className="text-cyan-300 font-extrabold">{formatAmount(adjustedSavingsRate)} / mo</span>
                </div>
              </div>

            </div>

            {/* Simulated Outcomes - Right Side */}
            <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
              
              <div className="p-5 rounded-2xl bg-[#030612]/80 border border-white/5 relative overflow-hidden flex-1 flex flex-col justify-center">
                <div className="absolute top-[-20%] right-[-20%] w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
                
                <p className="text-xs uppercase font-mono tracking-widest text-[#22d3ee]/80 font-bold mb-2">Simulated Outcome Delta</p>
                
                <div className="space-y-3">
                  <h4 className="text-white font-bold text-base leading-normal">
                    Target Goal: <span className="text-cyan-300 font-extrabold">"{targetName}"</span> ({formatAmount(targetValue)})
                  </h4>
                  
                  <p className="text-[#94a3b8] text-sm leading-relaxed">
                    At your standard baseline save velocity, you will reach this milestone in <span className="text-white font-bold font-mono">{monthsStandard.toFixed(1)} months</span> ({ (monthsStandard / 12).toFixed(1) } yrs).
                  </p>
                  
                  <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                    <div>
                      <span className="text-[10px] font-mono text-white/50 uppercase tracking-widest block">Adjusted Horizon</span>
                      <span className="text-xl font-black text-white font-mono">{monthsAdjusted.toFixed(1)} months</span>
                    </div>
                    {monthlySavingsDelta !== 0 && (
                      <div className="shrink-0 flex items-center gap-2">
                        {monthlySavingsDelta > 0 ? (
                          <div className="px-3.5 py-2 bg-emerald-500/10 text-emerald-400 font-mono text-xs font-bold rounded-xl border border-emerald-500/20 flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                            <TrendingUp className="w-3.5 h-3.5 animate-bounce" />
                            {Math.round(monthlySavingsDelta).toFixed(0)} MONTHS SOONER!
                          </div>
                        ) : (
                          <div className="px-3.5 py-2 bg-red-500/10 text-red-400 font-mono text-xs font-bold rounded-xl border border-red-500/25 flex items-center gap-1.5">
                            <TrendingDown className="w-3.5 h-3.5" />
                            {Math.abs(Math.round(monthlySavingsDelta)).toFixed(0)} MONTHS DELAY
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Area Chart Comparison */}
              <div className="h-[150px] w-full mt-4">
                <span className="text-[9px] font-mono uppercase tracking-widest text-white/35 block mb-2 text-center font-bold">Net Worth Forecast (3 Years Projection Sandbox)</span>
                <ResponsiveContainer width="100%" height="85%">
                  <AreaChart data={projectionData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorBaseline" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorAdjusted" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                    <XAxis dataKey="month" stroke="rgba(255,255,255,0.25)" fontSize={9} tickLine={false} axisLine={false} />
                    <YAxis stroke="rgba(255,255,255,0.25)" fontSize={9} tickLine={false} axisLine={false} tickFormatter={(v) => formatAmount(v).split('.')[0]} />
                    <Tooltip cursor={{ stroke: 'rgba(34,211,238,0.1)', strokeWidth: 1 }} content={<CustomTooltip />} />
                    <Area type="monotone" name="Standard" dataKey="Baseline" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorBaseline)" />
                    <Area type="monotone" name="Adjusted" dataKey="Adjusted" stroke="#22d3ee" strokeWidth={3} fillOpacity={1} fill="url(#colorAdjusted)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

            </div>

          </CardContent>
        </Card>
      </motion.div>

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

        {/* 6-Month Spending Trends BarChart */}
        <motion.div id="main-bar-chart" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
        <Card className="glass-card border-none h-full bg-gradient-to-tr from-[#0b0c15] to-[#121323]">
          <CardHeader>
            <CardTitle className="text-white/80">6-Month Spending Trends</CardTitle>
            <p className="text-xs text-white/40 mt-1">Sustained rolling half-year outflow and ceiling targets velocity analysis.</p>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={last6MonthsData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="barSpend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.85}/>
                      <stop offset="100%" stopColor="#ec4899" stopOpacity={0.4}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => formatAmount(v)} />
                  <Tooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} content={<CustomTooltip />} />
                  <Bar dataKey="spend" name="Monthly Incurred" fill="url(#barSpend)" radius={[6, 6, 0, 0]} isAnimationActive={true} animationDuration={1800} />
                  <Bar dataKey="budget" name="Budget Limit" fill="rgba(255,255,255,0.05)" radius={[6, 6, 0, 0]} isAnimationActive={true} animationDuration={1800} />
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
