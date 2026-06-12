import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'motion/react';
import confetti from 'canvas-confetti';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { 
  ArrowUpRight, ArrowDownRight, Wallet, TrendingUp, DollarSign, Activity, AlertCircle, 
  Target, Sparkles, X, HeartPulse, Trophy, Star, Medal, ShieldCheck, Fingerprint, 
  Loader2, Plus, Camera, Mic, Check, HelpCircle, FileSpreadsheet, RotateCcw, LayoutDashboard, FileText
} from 'lucide-react';
import { useAuth } from '@/src/context/AuthContext';
import { useCurrency } from '@/src/context/CurrencyContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DebtPaydownCalculator } from '@/src/components/DebtPaydownCalculator';
import { FinancialHealthScore } from '@/src/components/FinancialHealthScore';
import { cn } from '@/lib/utils';
import { Joyride, STATUS } from 'react-joyride';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Floating Action Button (FAB) and Quick Action states
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  
  // Quick Transaction Dialog state
  const [quickTitle, setQuickTitle] = useState('');
  const [quickAmount, setQuickAmount] = useState('');
  const [quickType, setQuickType] = useState('expense');
  const [quickCategory, setQuickCategory] = useState('Food');
  
  // Quick Add Auto-Tagging state
  const [isQuickTagging, setIsQuickTagging] = useState(false);
  const [isQuickAiTagged, setIsQuickAiTagged] = useState(false);

  // Voice Command / Quick Micro-Logger State
  const [isListening, setIsListening] = useState(false);
  const [voiceSuccess, setVoiceSuccess] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef('');

  // Intelligent parser for Quick Voice Commands
  const parseVoiceCommand = (sentence: string) => {
    const text = sentence.toLowerCase().trim();
    
    // 1. Determine type (default: expense)
    let finalType = 'expense';
    if (text.includes('earned') || text.includes('received') || text.includes('salary') || text.includes('income') || text.includes('deposit')) {
      finalType = 'income';
    }

    // 2. Determine category
    let finalCategory = 'Other';
    const catKeywords: Record<string, string[]> = {
      'Food': ['groceries', 'food', 'dinner', 'lunch', 'coffee', 'restaurant', 'eat', 'starbucks', 'breakfast', 'subway', 'mcdonalds'],
      'Utilities': ['bill', 'power', 'utility', 'water', 'electricity', 'gas bill', 'internet', 'wifi', 'phone', 'comcast'],
      'Entertainment': ['movie', 'netflix', 'game', 'concert', 'spotify', 'disney', 'play', 'subscription', 'fun'],
      'Housing': ['rent', 'mortgage', 'housing', 'apartment', 'home'],
      'Salary': ['salary', 'paycheck', 'dividend', 'stripe payout'],
      'Transport': ['bus', 'train', 'uber', 'lyft', 'taxi', 'gas', 'subway', 'transportation', 'toll'],
      'Shopping': ['clothes', 'shoes', 'amazon', 'mall', 'shopping', 'store', 'target', 'walmart'],
      'Investment': ['stock', 'crypto', 'investment', 'savings', 'deposit']
    };

    for (const [catName, words] of Object.entries(catKeywords)) {
      if (words.some(word => text.includes(word))) {
        finalCategory = catName;
        break;
      }
    }

    // 3. Extract Amount
    let finalAmount = 15.0; // Fallback
    const digitsMatch = text.match(/\d+(\.\d+)?/);
    if (digitsMatch) {
      finalAmount = parseFloat(digitsMatch[0]);
    } else {
      const wordToNum: Record<string, number> = {
        'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
        'eleven': 11, 'twelve': 12, 'fifteen': 15, 'twenty': 20, 'fifty': 50, 'hundred': 100
      };
      for (const [w, n] of Object.entries(wordToNum)) {
        if (text.includes(w)) {
          finalAmount = n;
          break;
        }
      }
    }

    // 4. Extract Title (filter numbers and common stop words)
    const stopWords = [
      'spent', 'bought', 'paid', 'received', 'earned', 'on', 'at', 'for', 'a', 'an', 'the', 'dollar', 'dollars', 'cents', 'payout', 
      'monthly', 'weekly', 'and', 'to', 'some', 'from'
    ];
    const merchantClean = sentence.replace(/\$?\d+(\.\d+)?/g, '');
    const words = merchantClean.split(/\s+/).filter(w => {
      const lower = w.toLowerCase().trim();
      return lower && !stopWords.includes(lower) && isNaN(Number(lower));
    });

    const finalTitle = words.slice(0, 3).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || 'Voice Ledger Node';

    return {
      title: finalTitle,
      amount: finalAmount,
      type: finalType,
      category: finalCategory
    };
  };

  const handleVoiceCommand = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceError('Speech recognition is not supported in this browser. Please use Google Chrome or Safari.');
      return;
    }

    if (!recognitionRef.current) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setIsListening(true);
        setVoiceError('');
        setTranscript('');
        transcriptRef.current = '';
      };

      rec.onresult = (event: any) => {
        const transcriptText = event.results[0][0].transcript;
        setTranscript(transcriptText);
        transcriptRef.current = transcriptText;
      };

      rec.onerror = (event: any) => {
        setVoiceError(`Voice error: ${event.error}`);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
        const rawText = transcriptRef.current;
        if (rawText.trim().length > 0) {
          setVoiceSuccess(true);
          const payload = parseVoiceCommand(rawText);

          fetch('/api/transactions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              amount: payload.amount,
              type: payload.type,
              title: payload.title,
              category: payload.category,
              date: new Date().toISOString()
            })
          })
          .then(() => {
            fetchDashboardData();
            window.dispatchEvent(new Event('transactionAdded'));
            setToastMessage(`Voice Ledger: Created ${payload.title} worth ${formatAmount(payload.amount)}!`);
            setShowToast(true);
            setTimeout(() => {
              setShowToast(false);
            }, 3000);
          })
          .catch(console.error);

          setTimeout(() => {
            setVoiceSuccess(false);
            setTranscript('');
            transcriptRef.current = '';
          }, 3500);
        }
      };

      recognitionRef.current = rec;
    }

    try {
      recognitionRef.current.start();
    } catch {
      recognitionRef.current.abort();
    }
  }, [token, formatAmount]);

  const handleQuickSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(quickAmount);
    if (isNaN(amt) || amt <= 0 || !quickTitle) return;

    try {
      await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: quickTitle,
          amount: amt,
          type: quickType,
          category: quickCategory,
          date: new Date().toISOString()
        })
      });
      setIsQuickAddOpen(false);
      setQuickTitle('');
      setQuickAmount('');
      fetchDashboardData();
      
      window.dispatchEvent(new Event('transactionAdded'));
      setToastMessage('Transaction saved successfully to cloud ledger!');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleQuickAutoCategorize = async () => {
    if (!quickTitle || quickTitle.trim().length < 3) return;
    setIsQuickTagging(true);
    try {
      const response = await fetch('/api/ai/categorize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          title: quickTitle, 
          amount: quickAmount ? parseFloat(quickAmount) : 0 
        }),
      });
      if (response.ok) {
        const result = await response.json();
        if (result.category) {
          setQuickCategory(result.category);
          setIsQuickAiTagged(true);
          setTimeout(() => setIsQuickAiTagged(false), 2000);
        }
      }
    } catch (err) {
      console.error("AI Quick Auto-Tag error:", err);
    } finally {
      setIsQuickTagging(false);
    }
  };

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
  const [authMode, setAuthMode] = useState<'biometric' | 'pin'>('biometric');
  const [pin, setPin] = useState('');

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
    
    const handleSuccess = (txs: any[], bgs: any[]) => {
      setTransactions(txs);
      setBudgets(bgs);
      setLoading(false);
      
      localStorage.setItem('cached_transactions', JSON.stringify(txs));
      localStorage.setItem('cached_budgets', JSON.stringify(bgs));

      const realBudgets = bgs.length > 0 ? bgs : [];
      let overriddenBudget = null;

      for (const b of realBudgets) {
        if (!b.category) continue;
        const spent = txs
          .filter((t: any) => t.type === 'expense' && t.category && t.category.toLowerCase() === b.category.toLowerCase())
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
      
      // Spend Alert: Unusual High Velocity
      if (txs.length > 0) {
        const sortedTxs = [...txs].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const recentTxs = sortedTxs.slice(0, 10);
        const avgRecent = recentTxs.reduce((a, b) => a + b.amount, 0) / (recentTxs.length || 1);
        if (recentTxs[0]?.amount > avgRecent * 3) {
            setToastMessage(`Unusual high-velocity expense detected: ${recentTxs[0].title}`);
            setShowToast(true);
        }
      }
    };

    const handleFailure = (err?: any) => {
      console.warn("API fetch failed, loading offline-safe cache", err);
      const cachedTxsStr = localStorage.getItem('cached_transactions');
      const cachedBgsStr = localStorage.getItem('cached_budgets');
      if (cachedTxsStr || cachedBgsStr) {
        const txs = cachedTxsStr ? JSON.parse(cachedTxsStr) : [];
        const bgs = cachedBgsStr ? JSON.parse(cachedBgsStr) : [];
        handleSuccess(txs, bgs);
        setToastMessage("Network issue. Viewing offline cached transaction history.");
        setShowToast(true);
      } else {
        setLoading(false);
      }
    };

    if (!navigator.onLine) {
      handleFailure();
      return;
    }

    Promise.all([
      fetch('/api/transactions', { headers: { 'Authorization': `Bearer ${token}` } }).then(r => {
        if (!r.ok) throw new Error("TX details error");
        return r.json();
      }),
      fetch('/api/budgets', { headers: { 'Authorization': `Bearer ${token}` } }).then(r => {
        if (!r.ok) throw new Error("Budget details error");
        return r.json();
      })
    ])
    .then(([txData, bgData]) => {
      const txs = txData.transactions || [];
      const bgs = bgData.budgets || [];
      handleSuccess(txs, bgs);
    })
    .catch((err) => {
      handleFailure(err);
    });
  }, [token, fetchForecast, fetchInsight]);

  useEffect(() => {
    fetchDashboardData();
    window.addEventListener('transactionAdded', fetchDashboardData);
    return () => window.removeEventListener('transactionAdded', fetchDashboardData);
  }, [fetchDashboardData]);

  const downloadDashboardPDF = async () => {
    try {
      setExportingPdf(true);
      const element = document.getElementById("dashboard-capture-area");
      if (!element) {
        console.warn("Capture area id 'dashboard-capture-area' not found");
        return;
      }
      
      const canvas = await html2canvas(element, {
        scale: 2, // High resolution
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#0a0a14",
        logging: false,
      });
      
      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF("p", "mm", "a4");
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      
      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      pdf.save(`neurofin_dashboard_snapshot_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error("Failed to generate PDF snapshot:", err);
    } finally {
      setExportingPdf(false);
    }
  };

  const handleAutoRebalanceBudgets = async () => {
    try {
      const cats = Array.from(new Set([
        ...["Food", "Utilities", "Entertainment", "Housing", "Transport", "Shopping", "Investment"],
        ...(budgets.map((b: any) => b.category))
      ]));
      
      let itemsRebalanced = 0;
      
      for (const cat of cats) {
        // Calculate historical avg spending for category based on all our transactions
        const catTx = transactions.filter(t => t.type === 'expense' && t.category?.toLowerCase() === cat.toLowerCase());
        const total = catTx.reduce((a,b) => a + b.amount, 0);
        
        let avgMonth = 500;
        if (catTx.length > 0) {
           avgMonth = Math.max(total / 6, 50); // assume 6 months data generally, set a floor limit
        } else {
           // fallback logic
           avgMonth = cat === 'Housing' ? 1200 : cat === 'Food' ? 500 : 250;
        }
        
        // Rebalance target is 5% buffer above average
        const newTargetLimit = Math.round(avgMonth * 1.05);
        
        await fetch('/api/budgets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ category: cat, limit_amount: newTargetLimit })
        });
        itemsRebalanced++;
      }
      
      setToastMessage(`Auto-Balanced ${itemsRebalanced} Category Limits based on AI Trajectory!`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3500);
      
      // refresh budgets
      fetch('/api/budgets', { headers: { 'Authorization': `Bearer ${token}` } })
        .then(r => r.json())
        .then(bdata => setBudgets(bdata.budgets || []));
    } catch(e) {
      console.error(e);
    }
  };

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

  // Calculate Savings Streak (Consecutive days under average daily budget)
  const calculateStreak = () => {
    let streak = 0;
    const today = new Date();
    // Simplified logic: iterating back day by day
    for (let i = 0; i < 30; i++) {
        const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
        const dayStr = d.toISOString().split('T')[0];
        
        const dayExpenses = transactions
            .filter((t: any) => t.type === 'expense' && t.date.startsWith(dayStr))
            .reduce((sum: number, t: any) => sum + t.amount, 0);
            
        // Arbitrary reasonable daily limit based on monthly budgets total
        const monthlyBudgetsTotal = budgets.reduce((sum: number, b: any) => sum + (b.limit_amount || 0), 0) || 3000;
        const dailyLimit = monthlyBudgetsTotal / 30;
        
        if (dayExpenses <= dailyLimit * 1.1) {
            streak++;
        } else {
            break; // streak broke on this day
        }
    }
    return streak;
  };
  const savingsStreak = calculateStreak();

  // Highlight achievements with confetti
  useEffect(() => {
    if (savingsStreak > 0 && savingsStreak % 7 === 0) {
      if (!localStorage.getItem(`streak_confetti_${savingsStreak}`)) {
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
        localStorage.setItem(`streak_confetti_${savingsStreak}`, 'true');
      }
    }
  }, [savingsStreak]);

  useEffect(() => {
    if (goalTarget > 0 && remainingGoal === 0) {
      if (!localStorage.getItem(`goal_confetti_${goalName}`)) {
        confetti({ particleCount: 200, spread: 100, origin: { y: 0.5 }, zIndex: 1000 });
        localStorage.setItem(`goal_confetti_${goalName}`, 'true');
      }
    }
  }, [remainingGoal, goalTarget, goalName]);

  // Smart Forecast logic (Top 3 Potential Shortfalls for Next Month based on 6-month data)
  const getSmartForecastShortfalls = () => {
     const catAverages: Record<string, number> = {};
     const sixMonthsAgo = new Date();
     sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
     
     // calculate total per category over last 6 months
     transactions.forEach((t: any) => {
         if(t.type === 'expense' && new Date(t.date) >= sixMonthsAgo) {
             const c = t.category || 'Other';
             catAverages[c] = (catAverages[c] || 0) + t.amount;
         }
     });
     
     const shortfalls: any[] = [];
     Object.keys(catAverages).forEach(cat => {
         const avgMonthly = catAverages[cat] / 6;
         const dbBudget = budgets.find((b: any) => b.category?.toLowerCase() === cat.toLowerCase());
         const limit = dbBudget ? dbBudget.limit_amount : (cat === 'Food' ? 500 : cat === 'Utilities' ? 250 : cat === 'Entertainment' ? 300 : cat === 'Housing' ? 1200 : cat === 'Transport' ? 150 : cat === 'Shopping' ? 350 : cat === 'Investment' ? 400 : 200);
         
         if (avgMonthly > limit * 1.05) { // Predicted to overspend by > 5%
             shortfalls.push({ category: cat, projected: Math.round(avgMonthly), limit, overspend: Math.round(avgMonthly - limit) });
         }
     });
     return shortfalls.sort((a, b) => b.overspend - a.overspend).slice(0, 3);
  };
  const smartShortfalls = getSmartForecastShortfalls();

  const [exportingPdf, setExportingPdf] = useState(false);

  // Offline Pending Financial Tasks Checklist
  const [tasks, setTasks] = useState<{ id: string; text: string; completed: boolean }[]>(() => {
    const stored = localStorage.getItem('offline_tasks_list');
    if (stored) return JSON.parse(stored);
    return [
      { id: '1', text: 'Define Extra Debt Paydown (Calculator Widget)', completed: false },
      { id: '2', text: 'Ensure category budget limits are satisfied', completed: false },
      { id: '3', text: 'Validate current savings rate percentage', completed: false },
      { id: '4', text: 'Audit monthly active subscription renewals', completed: false }
    ];
  });

  const toggleTask = (id: string) => {
    const updated = tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    setTasks(updated);
    localStorage.setItem('offline_tasks_list', JSON.stringify(updated));
  };

  // Widget Manager Preferences
  const [activeWidgets, setActiveWidgets] = useState<string[]>([]);
  useEffect(() => {
    const stored = localStorage.getItem('dashboard_widgets');
    if (stored) setActiveWidgets(JSON.parse(stored));
    else setActiveWidgets(['savings_goal', 'smart_forecast', 'ai_insights', 'quick_actions']);
  }, []);

  const isWidgetActive = (id: string) => activeWidgets.includes(id);

  // Joyride Tour State
  const [tourState, setTourState] = useState<any>({ run: false, steps: [] });
  useEffect(() => {
     if (!localStorage.getItem('tour_smart_forecast')) {
         // short delay to let things load
         setTimeout(() => {
           setTourState({
              run: true,
              steps: [
                {
                  target: 'body',
                  title: 'Welcome to NeuroFinance!',
                  content: 'Let us show you around some intelligent AI-powered features.',
                  placement: 'center',
                  disableBeacon: true
                },
                {
                  target: '#step-smart-forecast',
                  title: 'Smart Forecast Tracker',
                  content: 'This AI Engine predicts your spending ceilings based on your 6-month historical trends, so you never get caught off-guard.',
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
      localStorage.setItem('tour_smart_forecast', 'true');
    }
  };

  if (!isBiometricPassed) {
    return (
      <div className="fixed inset-0 z-[100] bg-[#020205] flex flex-col items-center justify-center p-6 text-white font-sans overflow-hidden">
        {/* Futuristic glowing mesh background */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-purple-500/0.5 rounded-full blur-[80px] pointer-events-none" />
        
        <div className="max-w-md w-full text-center space-y-6 relative z-10 animate-in fade-in zoom-in-95 duration-500">
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-cyan-400/10 flex items-center justify-center text-cyan-400 border border-cyan-400/20 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h2 className="text-2xl font-bold font-display tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70 mt-2">NeuroFin Security</h2>
            <p className="text-xs text-white/40 uppercase tracking-widest font-mono">Secure Authorization Required</p>
          </div>

          {authMode === 'biometric' ? (
            <>
              {/* Holographic glowing scanner stage */}
              <div className="flex flex-col items-center justify-center relative py-4">
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
                    <p className="text-sm text-white/50 leading-relaxed max-w-sm mx-auto">Click scanner to activate TouchID / FaceID security verification.</p>
                  )}
                </div>

                <div className="scale-100 flex flex-col gap-3">
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
                    {biometricStatus === 'scanning' ? 'Scanning Biometrics...' : biometricStatus === 'success' ? 'Authorized' : 'Scan Fingerprint / Face ID'}
                  </Button>

                  <button
                    onClick={() => {
                      setAuthMode('pin');
                      setPin('');
                    }}
                    className="text-xs text-cyan-400 hover:text-cyan-300 font-mono tracking-wider cursor-pointer underline flex items-center justify-center gap-1.5"
                  >
                    Bypass with Secure Device PIN instead
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Device PIN key entry dots */}
              <div className="space-y-4 py-2">
                <p className="text-sm text-white/60 font-mono">ENTER SECURE 4-DIGIT PIN</p>
                <div className="flex gap-5 justify-center py-2">
                  {[...Array(4)].map((_, i) => (
                    <div 
                      key={i} 
                      className={`w-4 h-4 rounded-full border border-cyan-400/40 transition-all duration-300 ${
                        pin.length > i 
                          ? 'bg-cyan-400 scale-110 shadow-[0_0_12px_#22d3ee]' 
                          : 'bg-transparent shadow-none'
                      }`} 
                    />
                  ))}
                </div>
                {biometricError ? (
                  <p className="text-xs text-red-400 font-mono animate-shake">{biometricError}</p>
                ) : (
                  <p className="text-xs text-white/30 font-mono">Use default PIN "1234" to pass</p>
                )}
              </div>

              {/* 3x4 Grid layout tactile custom PIN keypad */}
              <div className="grid grid-cols-3 gap-3 w-64 mx-auto pt-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button
                    key={num}
                    onClick={() => {
                      if (pin.length < 4) {
                        const nextPin = pin + num;
                        setPin(nextPin);
                        if (nextPin === '1234') {
                          setBiometricStatus('success');
                          setTimeout(() => {
                            setIsBiometricPassed(true);
                            sessionStorage.setItem('biometric_authorized_session', 'true');
                          }, 600);
                        } else if (nextPin.length === 4) {
                          setBiometricError('Incorrect secure PIN. Resetting...');
                          setTimeout(() => {
                            setPin('');
                            setBiometricError('');
                          }, 1000);
                        }
                      }
                    }}
                    className="w-14 h-14 rounded-full bg-white/5 border border-white/10 text-white font-mono font-bold text-lg hover:bg-cyan-400/10 hover:border-cyan-400/30 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
                  >
                    {num}
                  </button>
                ))}
                <button
                  onClick={() => setPin('')}
                  className="w-14 h-14 rounded-full bg-white/5 text-white/50 text-xs hover:bg-white/10 flex items-center justify-center cursor-pointer font-bold font-mono"
                >
                  Clear
                </button>
                <button
                  onClick={() => {
                    if (pin.length < 4) {
                      const nextPin = pin + '0';
                      setPin(nextPin);
                      if (nextPin === '1234') {
                        setBiometricStatus('success');
                        setTimeout(() => {
                          setIsBiometricPassed(true);
                          sessionStorage.setItem('biometric_authorized_session', 'true');
                        }, 600);
                      } else if (nextPin.length === 4) {
                        setBiometricError('Incorrect secure PIN. Resetting...');
                        setTimeout(() => {
                          setPin('');
                          setBiometricError('');
                        }, 1000);
                      }
                    }
                  }}
                  className="w-14 h-14 rounded-full bg-white/5 border border-white/10 text-white font-mono font-bold text-lg hover:bg-cyan-400/10 hover:border-cyan-400/30 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
                >
                  0
                </button>
                <button
                  onClick={() => setAuthMode('biometric')}
                  className="w-14 h-14 rounded-full bg-white/5 text-cyan-400 hover:bg-white/10 flex items-center justify-center cursor-pointer font-bold"
                >
                  <Fingerprint className="w-5 h-5" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  if (loading) return <SkeletonLoader />;

  // Badges logic
  const hasSavingsStreak = savingsRate > 10;
  const hasBigSpender = totalExpense > 5000;
  const hasBudgetMaster = !toastMessage;

  // Active budget limit approaching calculations (spent >= 80%)
  const getApproachingBudgets = () => {
    const approaching: { category: string; spent: number; limit: number; ratio: number }[] = [];
    budgets.forEach((b: any) => {
      const catName = b.category || '';
      const spent = transactions
        .filter((t: any) => t.type === 'expense' && t.category && t.category.toLowerCase() === catName.toLowerCase())
        .reduce((sum: number, t: any) => sum + t.amount, 0);
      const limit = b.limit_amount || 0;
      if (limit > 0) {
        const r = spent / limit;
        if (r >= 0.8) {
          approaching.push({ category: catName, spent, limit, ratio: r });
        }
      }
    });
    return approaching;
  };
  const approachingBudgets = getApproachingBudgets();

  return (
    <div id="dashboard-capture-area" className="flex flex-col gap-6 relative pb-12 p-4 bg-[#0c0a1a]">
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
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h2 className="text-3xl font-display font-bold text-white">Welcome back, {user?.name?.split(' ')[0]}</h2>
            <p className="text-white/50 mt-1">Here is your financial overview.</p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Savings Streak Widget */}
            <div className="flex items-center gap-3 p-2.5 px-4 bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/20 rounded-2xl shadow-[0_0_15px_rgba(249,115,22,0.1)]">
              <div className="relative">
                <span className="text-3xl filter drop-shadow-lg">🔥</span>
                {savingsStreak >= 7 && (
                  <span className="absolute -top-2 -right-2 bg-amber-400 text-black text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-black animate-pulse">HOT</span>
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-mono uppercase tracking-widest text-orange-400 font-bold leading-none mb-1">Savings Streak</span>
                <span className="text-sm text-white font-mono font-bold leading-none">{savingsStreak} Days <span className="text-white/40 text-xs font-sans font-normal ml-0.5">under budget</span></span>
              </div>
            </div>

            {/* PDF Layout Snapshot Button */}
            <Button 
              onClick={downloadDashboardPDF}
              disabled={exportingPdf}
              className="bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 font-medium rounded-2xl h-[46px] px-4 cursor-pointer"
              variant="outline"
            >
              {exportingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating Snapshot...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  Layout PDF
                </>
              )}
            </Button>

            {/* Widget Manager Button */}
            <Dialog>
              <DialogTrigger className={cn(buttonVariants({ variant: 'outline' }), "bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-2xl h-full py-3")}>
                 <LayoutDashboard className="w-4 h-4 mr-2" /> Widgets
              </DialogTrigger>
              <DialogContent className="glass-card border-white/10 text-white max-w-sm">
                <DialogHeader>
                  <DialogTitle>Dashboard Layout</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <p className="text-xs text-white/50 uppercase tracking-widest font-mono">Toggle & Reorder Widgets</p>
                  {activeWidgets.map((widgetId, idx) => {
                     const wName = {
                        'savings_goal': 'Milestone Savings Goal',
                        'smart_forecast': 'Smart Forecast & Shortfalls',
                        'ai_insights': 'Category Progress & Deviations',
                        'cash_flow': 'Cash Flow & Income',
                        'recent_tx': 'Recent Transactions'
                     }[widgetId] || widgetId;
                     
                     return (
                      <div key={widgetId} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                        <div className="flex items-center gap-2">
                           <button 
                             onClick={() => {
                               if (idx > 0) {
                                 const copy = [...activeWidgets];
                                 const temp = copy[idx - 1]; copy[idx - 1] = copy[idx]; copy[idx] = temp;
                                 setActiveWidgets(copy); localStorage.setItem('dashboard_widgets', JSON.stringify(copy));
                               }
                             }}
                             className="text-white/40 hover:text-white"
                           >↑</button>
                           <button 
                             onClick={() => {
                               if (idx < activeWidgets.length - 1) {
                                 const copy = [...activeWidgets];
                                 const temp = copy[idx + 1]; copy[idx + 1] = copy[idx]; copy[idx] = temp;
                                 setActiveWidgets(copy); localStorage.setItem('dashboard_widgets', JSON.stringify(copy));
                               }
                             }}
                             className="text-white/40 hover:text-white"
                           >↓</button>
                           <span className="text-sm text-white font-medium ml-2">{wName}</span>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={true}
                          onChange={(e) => {
                            if (!e.target.checked) {
                              const updated = activeWidgets.filter(w => w !== widgetId);
                              setActiveWidgets(updated); localStorage.setItem('dashboard_widgets', JSON.stringify(updated));
                            }
                          }}
                          className="w-4 h-4 rounded border-white/20 accent-cyan-400 cursor-pointer"
                        />
                      </div>
                     );
                  })}
                  
                  {['savings_goal', 'smart_forecast', 'ai_insights', 'cash_flow', 'recent_tx']
                    .filter(id => !activeWidgets.includes(id))
                    .map(widgetId => {
                     const wName = {
                        'savings_goal': 'Milestone Savings Goal',
                        'smart_forecast': 'Smart Forecast & Shortfalls',
                        'ai_insights': 'Category Progress & Deviations',
                        'cash_flow': 'Cash Flow & Income',
                        'recent_tx': 'Recent Transactions'
                     }[widgetId] || widgetId;
                     return (
                      <div key={widgetId} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10 opacity-50">
                        <span className="text-sm text-white font-medium pl-10">{wName}</span>
                        <input 
                          type="checkbox" 
                          checked={false}
                          onChange={(e) => {
                            if (e.target.checked) {
                              const updated = [...activeWidgets, widgetId];
                              setActiveWidgets(updated); localStorage.setItem('dashboard_widgets', JSON.stringify(updated));
                            }
                          }}
                          className="w-4 h-4 rounded border-white/20 accent-cyan-400 cursor-pointer"
                        />
                      </div>
                     );
                  })}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Approaching Budget Limits Notification Badge & Service Alerts */}
        {approachingBudgets.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -15 }} 
            animate={{ opacity: 1, y: 0 }}
            className="p-5 rounded-2xl bg-gradient-to-r from-red-950/20 to-[#1e141a] border border-red-500/20 relative overflow-hidden shadow-[0_0_20px_rgba(239,68,68,0.06)]"
          >
            <div className="flex items-start gap-4">
              <div className="relative shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 mt-1">
                <AlertCircle className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,1)]"></span>
                </span>
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-red-400">Budget Limit Notification Alarm</span>
                  <span className="px-2 py-0.5 bg-red-500/10 text-red-00 border border-red-500/10 text-[9px] font-bold font-mono rounded-full uppercase">Approaching Cap Limit!</span>
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs text-white/85 leading-normal">
                    You have <span className="font-bold text-white">{approachingBudgets.length} budget categor{approachingBudgets.length > 1 ? 'ies' : 'y'}</span> nearing or exceeding limit:
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {approachingBudgets.map((b, i) => (
                      <span key={i} className="px-2.5 py-1 text-[10px] font-mono rounded-xl bg-white/5 border border-white/10 text-white font-medium flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                        {b.category}: {formatAmount(b.spent)} / {formatAmount(b.limit)} ({(b.ratio * 105).toFixed(0)}%)
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

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
      {isWidgetActive('smart_forecast') && (
      <motion.div 
        id="step-smart-forecast"
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ delay: 0.35 }}
        style={{ order: activeWidgets.indexOf('smart_forecast') }}
        className="w-full flex-shrink-0"
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
                  Predictive spending ceilings computed dynamically from transactions & active recurring ledger channels.
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
              <div className="space-y-8">
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

                  {/* Predicted Shortfalls based on 6 month history */}
                  <div className="md:col-span-8 space-y-3 flex flex-col justify-center">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-mono uppercase text-white/50 tracking-wider">Top Potential Shortfalls Next Month</h4>
                      <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[9px] font-mono tracking-widest font-bold">6-MONTH TREND-BASED</span>
                    </div>
                    {smartShortfalls.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {smartShortfalls.map((sf, i) => (
                           <div key={i} className="p-3 bg-red-500/5 border border-red-500/10 rounded-xl space-y-2 relative overflow-hidden">
                             <div className="absolute top-0 right-0 p-2 opacity-10">
                               <AlertCircle className="w-8 h-8 text-red-500" />
                             </div>
                             <span className="text-xs font-bold text-white relative z-10">{sf.category}</span>
                             <div className="relative z-10 space-y-1">
                               <p className="text-[10px] text-white/50 font-mono uppercase tracking-widest">Projected vs Limit</p>
                               <div className="flex items-center gap-2">
                                  <span className="font-mono text-red-400 font-bold">{formatAmount(sf.projected)}</span>
                                  <span className="text-white/30 text-xs">/</span>
                                  <span className="font-mono text-white/70">{formatAmount(sf.limit)}</span>
                               </div>
                               <p className="text-[10px] text-red-400 mt-2 font-bold">+ {formatAmount(sf.overspend)} predicted over budget</p>
                             </div>
                           </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl border border-dashed border-emerald-500/30 bg-emerald-500/5 text-center space-y-1">
                        <Trophy className="w-5 h-5 text-emerald-400 mx-auto" />
                        <p className="text-sm text-white font-medium">Looking Good!</p>
                        <p className="text-xs text-emerald-400/70">Historical 6-month trends show no likely budget overspends next month.</p>
                      </div>
                    )}
                  </div>

                </div>

                {/* Multi-Month AI Spending Forecast Section */}
                <div className="pt-6 border-t border-white/5 space-y-6">
                  <div>
                    <h4 className="text-xs font-mono uppercase text-purple-400 tracking-wider font-bold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> 3-Month Trajectory Projection
                    </h4>
                    <p className="text-[10px] text-white/40 mt-1">
                      Multi-month forecast modeling based on continuous historic transaction cycles.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                    {/* Visual graph line projection */}
                    <div className="lg:col-span-8 h-[200px] w-full bg-white/[0.01] border border-white/5 rounded-2xl p-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={forecastData?.threeMonthTrend || [
                          { month: "Month 1 Proj", projectedSpending: (forecastData?.projectedSpending || 1500) * 1.05 },
                          { month: "Month 2 Proj", projectedSpending: (forecastData?.projectedSpending || 1500) * 0.98 },
                          { month: "Month 3 Proj", projectedSpending: (forecastData?.projectedSpending || 1500) * 1.08 }
                        ]} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                          <defs>
                            <linearGradient id="purpleGlow" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#a855f7" stopOpacity={0.25}/>
                              <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                          <XAxis dataKey="month" stroke="rgba(255,255,255,0.3)" fontSize={9} tickLine={false} axisLine={false} />
                          <YAxis stroke="rgba(255,255,255,0.3)" fontSize={9} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                          <RechartsTooltip content={<CustomTooltip />} />
                          <Area type="monotone" dataKey="projectedSpending" name="Projected Outlay" stroke="#a855f7" strokeWidth={2.5} fillOpacity={1} fill="url(#purpleGlow)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Timeline forecast metric cards */}
                    <div className="lg:col-span-4 space-y-3">
                      {(forecastData?.threeMonthTrend || [
                        { month: "Month 1 Proj", projectedSpending: (forecastData?.projectedSpending || 1500) * 1.05 },
                        { month: "Month 2 Proj", projectedSpending: (forecastData?.projectedSpending || 1500) * 0.98 },
                        { month: "Month 3 Proj", projectedSpending: (forecastData?.projectedSpending || 1500) * 1.08 }
                      ]).map((item: any, idx: number) => (
                        <div key={idx} className="p-3 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between transition-all hover:bg-white/10">
                          <div>
                            <span className="text-[9px] font-mono text-purple-400 font-bold uppercase tracking-widest">Projection M+{idx + 1}</span>
                            <p className="text-white text-xs font-semibold uppercase mt-0.5">{item.month}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-[9px] font-mono text-white/30 uppercase">Expected Spend</span>
                            <p className="text-sm font-black font-mono text-white mt-0.5">{formatAmount(item.projectedSpending)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
      )}

      {/* Interactive Savings Goal Accelerator & Micro-Savings Planner */}
      {isWidgetActive('savings_goal') && (
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ delay: 0.38 }}
        style={{ order: activeWidgets.indexOf('savings_goal') }}
        className="w-full flex-shrink-0"
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

                  {/* Offline Pending Task List */}
                  <div className="mt-6 pt-4 border-t border-white/5 space-y-3">
                    <div>
                      <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider">OFFLINE LEDGER TASKS</span>
                      <h5 className="font-bold text-white text-[11px] mt-0.5">Pending Financial Checklist</h5>
                    </div>
                    <div className="space-y-2">
                      {tasks.map((t) => (
                        <div 
                          key={t.id} 
                          onClick={() => toggleTask(t.id)}
                          className="flex items-center gap-3 p-2 bg-black/20 rounded-lg border border-white/5 hover:bg-black/30 transition-all cursor-pointer group"
                        >
                          <div className={`w-4.5 h-4.5 rounded flex items-center justify-center border transition-all ${
                            t.completed 
                              ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.3)]' 
                              : 'border-white/20 group-hover:border-white/40 text-transparent'
                          }`}>
                            <Check className="w-3 h-3" strokeWidth={3} />
                          </div>
                          <span className={`text-[10px] font-mono transition-all ${
                            t.completed ? 'text-white/40 line-through' : 'text-white/80'
                          }`}>
                            {t.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
      )}

      {/* Automated AI Budget Health Monitor & Category Progress Centre */}
      {isWidgetActive('ai_insights') && (
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ delay: 0.39 }}
        style={{ order: activeWidgets.indexOf('ai_insights') }}
        className="w-full flex-shrink-0"
      >
        <Card className="glass-card border-none overflow-hidden">
          <CardHeader className="pb-3 border-b border-white/5">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-cyan-500/10 border border-cyan-400/20 flex items-center justify-center text-cyan-400 shrink-0">
                  <Activity className="w-5 h-5 shadow-[0_0_15px_rgba(34,211,238,0.4)] animate-pulse" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-white font-display">
                    AI Budget Health & Category Integrity Tracker
                  </CardTitle>
                  <p className="text-xs text-white/50 mt-1">
                    Automated monitor tracking spending velocity deviations compared to the 3-month forecast models.
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Category-level Budget Progress Bars */}
              <div className="lg:col-span-7 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <FinancialHealthScore savingsRate={savingsRate} debtToIncome={30} />
                  <DebtPaydownCalculator />
                </div>
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-mono text-cyan-400 uppercase tracking-widest font-bold">Category Budgets</h4>
                  <Button 
                    onClick={handleAutoRebalanceBudgets}
                    size="sm"
                    className="h-7 text-[10px] uppercase tracking-wider font-bold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 p-2"
                  >
                    Auto-Rebalance Limits
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Array.from(new Set([
                    ...["Food", "Utilities", "Entertainment", "Housing", "Transport", "Shopping", "Investment"],
                    ...(budgets.map((b: any) => b.category))
                  ])).map((cat: any) => {
                    const dbBudget = budgets.find((b: any) => b.category?.toLowerCase() === cat.toLowerCase());
                    const limit = dbBudget ? dbBudget.limit_amount : (cat === 'Food' ? 500 : cat === 'Utilities' ? 250 : cat === 'Entertainment' ? 300 : cat === 'Housing' ? 1200 : cat === 'Transport' ? 150 : cat === 'Shopping' ? 350 : cat === 'Investment' ? 400 : 200);
                    const spent = transactions
                      .filter((t: any) => t.type === 'expense' && t.category?.toLowerCase() === cat.toLowerCase())
                      .reduce((acc: number, t: any) => acc + t.amount, 0);

                    const percent = Math.min(100, Math.round(limit > 0 ? (spent / limit) * 100 : 0));
                    
                    // Styled colors based on categories
                    const catColors: Record<string, string> = {
                      food: "from-emerald-400 to-teal-500 shadow-[0_0_8px_rgba(52,211,153,0.3)]",
                      utilities: "from-amber-400 to-yellow-500 shadow-[0_0_8px_rgba(251,191,36,0.3)]",
                      entertainment: "from-purple-400 to-indigo-500 shadow-[0_0_8px_rgba(167,139,250,0.3)]",
                      housing: "from-blue-400 to-cyan-500 shadow-[0_0_8px_rgba(96,165,250,0.3)]",
                      transport: "from-cyan-400 to-blue-500 shadow-[0_0_8px_rgba(34,211,238,0.3)]",
                      shopping: "from-pink-400 to-rose-400 shadow-[0_0_8px_rgba(244,114,182,0.3)]",
                      investment: "from-violet-400 to-pink-500 shadow-[0_0_8px_rgba(139,92,246,0.3)]",
                    };
                    const colorClasses = catColors[cat.toLowerCase()] || "from-slate-400 to-white";

                    return (
                      <div key={cat} className="p-4 bg-white/5 border border-white/5 rounded-2xl flex flex-col justify-between space-y-3 hover:bg-white/10 transition-all duration-300">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-white/90">{cat === 'Food' ? 'Food / Groceries' : cat}</span>
                          <span className="text-[10px] font-mono text-white/40">{formatAmount(spent)} / {formatAmount(limit)}</span>
                        </div>
                        <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${percent}%` }}
                            transition={{ duration: 0.6 }}
                            className={`h-full bg-gradient-to-r ${colorClasses}`}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-mono">
                          <span className={percent > 100 ? "text-red-400 font-bold" : percent > 80 ? "text-amber-400" : "text-emerald-400"}>
                            {percent}% consumed
                          </span>
                          <span>
                            {percent > 100 ? "Over Limit!" : percent > 80 ? "Approaching Limit" : "Optimal Vector"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Automated AI "Budget Health" Deviation Monitor */}
              <div className="lg:col-span-15 space-y-4">
                <h4 className="text-xs font-mono text-purple-400 uppercase tracking-widest font-bold">Neural Health Monitor</h4>
                
                <div className="bg-white/5 border border-white/5 rounded-2xl p-5 space-y-4">
                  {/* Spend deviation analysis engine */}
                  {(() => {
                    const deviationAlerts: any[] = [];
                    
                  Array.from(new Set([
                    ...["Food", "Utilities", "Entertainment", "Housing", "Transport", "Shopping", "Investment"],
                    ...(budgets.map((b: any) => b.category))
                  ])).forEach((cat: any) => {
                      const dbBudget = budgets.find((b: any) => b.category?.toLowerCase() === cat.toLowerCase());
                      const limit = dbBudget ? dbBudget.limit_amount : (cat === 'Food' ? 500 : cat === 'Utilities' ? 250 : cat === 'Entertainment' ? 300 : cat === 'Housing' ? 1200 : cat === 'Transport' ? 150 : cat === 'Shopping' ? 350 : cat === 'Investment' ? 400 : 200);
                      const spent = transactions
                        .filter((t: any) => t.type === 'expense' && t.category?.toLowerCase() === cat.toLowerCase())
                        .reduce((acc: number, t: any) => acc + t.amount, 0);

                      // Match category projectedAmount from 3-month forecast model to compute deviation
                      const forecastItem = forecastData?.categoryBreakdown?.find((f: any) => f.category?.toLowerCase() === cat.toLowerCase());
                      const expectedAmount = forecastItem ? forecastItem.projectedAmount : limit * 0.9;
                      
                      const deviationPercent = expectedAmount > 0 ? ((spent - expectedAmount) / expectedAmount) * 100 : 0;
                      
                      if (deviationPercent > 8) { // deviance is > 8% higher than projected
                        deviationAlerts.push({
                          category: cat,
                          spent,
                          expectedAmount,
                          deviationPercent: Math.round(deviationPercent)
                        });
                      }
                    });

                    return (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${
                            deviationAlerts.length > 0
                              ? 'bg-amber-400/10 border-amber-400/20 text-amber-400'
                              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                          }`}>
                            <HeartPulse className="w-4.5 h-4.5 animate-pulse" />
                          </div>
                          <div>
                            <p className="text-xs font-mono uppercase tracking-wider text-white/50">SYSTEM DIAGNOSTIC</p>
                            <h5 className="text-sm font-bold text-white">
                              {deviationAlerts.length > 0 ? "Budget Boundary Deviations" : "Budget Soundness is Optimal"}
                            </h5>
                          </div>
                        </div>

                        {deviationAlerts.length > 0 ? (
                          <div className="space-y-3">
                            <p className="text-xs text-white/60 leading-normal">
                              The automated boundary sentinel has detected active categories exceeding their 3-month projected neural spend coordinates. High caution recommended:
                            </p>
                            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-2">
                              {deviationAlerts.map((alert, i) => (
                                <motion.div 
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: i * 0.05 }}
                                  key={alert.category} 
                                  className="p-3 bg-red-500/5 border border-red-500/10 rounded-xl space-y-1.5"
                                >
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="font-bold text-white">{alert.category} Boundary Alert</span>
                                    <span className="text-red-400 font-mono font-bold">+{alert.deviationPercent}% deviation</span>
                                  </div>
                                  <p className="text-[10px] text-white/40 leading-normal">
                                    Real expenditure is <strong className="text-white font-mono">{formatAmount(alert.spent)}</strong> compared to the projected trend budget coordinate of <span className="font-mono text-cyan-400">{formatAmount(alert.expectedAmount)}</span>.
                                  </p>
                                </motion.div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <p className="text-xs text-white/60 leading-normal">
                              Quantum vectors are perfectly synchronized. Your active spending patterns are fully aligned with the 3-month simulated forecast envelopes.
                            </p>
                            <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
                              <span className="text-xs text-emerald-400 font-bold font-mono">✓ boundary compliance 100%</span>
                              <p className="text-[10px] text-white/40 leading-normal mt-1">
                                No boundary deviations detected. Daily, weekly velocities and billing vectors are within projected limits. Keep it up!
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>

            </div>
          </CardContent>
        </Card>
      </motion.div>
      )}

      {isWidgetActive('cash_flow') && (
      <div 
        className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full flex-shrink-0"
        style={{ order: activeWidgets.indexOf('cash_flow') }}
      >
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
      )}

      {/* Voice Recording Active HUD Overlay */}
      <AnimatePresence>
        {isListening && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 bg-[#020203]/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          >
            <div className="bg-[#0b0f19] border border-cyan-500/30 rounded-3xl p-8 max-w-sm w-full text-center space-y-6 shadow-[0_0_50px_rgba(34,211,238,0.15)] relative overflow-hidden">
              <div className="absolute -top-12 -left-12 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl" />
              <div className="absolute -bottom-12 -right-12 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl" />
              
              <div className="relative">
                <div className="w-20 h-20 bg-cyan-400/10 border border-cyan-400/20 rounded-full flex items-center justify-center mx-auto relative">
                  <div className="absolute inset-0 bg-cyan-400/20 rounded-full animate-ping opacity-70" />
                  <Mic className="w-8 h-8 text-cyan-400 animate-pulse animate-bounce" />
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-lg font-bold font-display text-white">Quantum Voice Recorder</h3>
                <p className="text-xs text-cyan-400 font-mono tracking-widest uppercase animate-pulse">LISTENING IN REAL-TIME...</p>
              </div>

              <div className="p-4 bg-white/5 border border-white/5 rounded-2xl">
                <p className="text-xs text-white/40 font-mono italic">
                  {transcript || '"Spent 15 dollars on coffee at Starbucks"'}
                </p>
              </div>

              <Button
                type="button"
                onClick={() => {
                  if (recognitionRef.current) recognitionRef.current.abort();
                  setIsListening(false);
                }}
                className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-xl px-6 py-2 text-xs font-mono font-bold cursor-pointer"
              >
                ABORT LOGGING
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Add Transaction Dialog */}
      <Dialog open={isQuickAddOpen} onOpenChange={setIsQuickAddOpen}>
        <DialogContent className="bg-[#0b0f19] border border-white/10 text-white rounded-3xl p-6 shadow-2xl max-w-md w-full">
          <DialogHeader className="border-b border-white/5 pb-3">
            <DialogTitle className="text-xl font-display font-bold text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-cyan-400" /> Quick Ledger Add
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleQuickSubmit} className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-white/50 uppercase tracking-wider font-bold">Transaction Description</label>
              <input
                type="text"
                required
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                onBlur={handleQuickAutoCategorize}
                placeholder="e.g., Starbucks Coffee"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400 font-sans"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-white/50 uppercase tracking-wider font-bold">Value amount</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400" />
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={quickAmount}
                    onChange={(e) => setQuickAmount(e.target.value)}
                    placeholder="12.50"
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-white/50 uppercase tracking-wider font-bold">Ledger flow</label>
                <select
                  value={quickType}
                  onChange={(e) => setQuickType(e.target.value)}
                  className="w-full bg-[#0b0f19] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-mono text-white/50 uppercase tracking-wider font-bold">Ledger Category</label>
                {isQuickTagging && (
                  <span className="text-[10px] text-cyan-400 font-mono animate-pulse flex items-center gap-1">
                    <Loader2 className="w-2.5 h-2.5 animate-spin" /> Tagging...
                  </span>
                )}
                {isQuickAiTagged && (
                  <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1 animate-bounce">
                    <Check className="w-2.5 h-2.5" /> AI Tagged
                  </span>
                )}
              </div>
              <select
                value={quickCategory}
                onChange={(e) => setQuickCategory(e.target.value)}
                className={cn(
                  "w-full bg-[#0b0f19] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400 cursor-pointer transition-all duration-300",
                  isQuickAiTagged && "border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]",
                  isQuickTagging && "border-cyan-400 opacity-80"
                )}
              >
                <option value="Food">Food / Groceries</option>
                <option value="Utilities">Utilities</option>
                <option value="Transport">Transport</option>
                <option value="Entertainment">Entertainment</option>
                <option value="Housing">Housing</option>
                <option value="Shopping">Shopping</option>
                <option value="Salary">Salary / Intake</option>
                <option value="Investment">Investment</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsQuickAddOpen(false)}
                className="flex-1 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs py-2.5 font-mono font-bold border border-white/5 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-gradient-to-r from-cyan-400 to-purple-500 text-white hover:opacity-90 font-bold rounded-xl text-xs py-2.5 shadow-[0_0_15px_rgba(34,211,238,0.2)] border-transparent cursor-pointer"
              >
                Sync Transaction
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dynamic Multi-Action FAB */}
      <div className="fixed bottom-24 right-5 md:right-8 z-45 flex flex-col items-end gap-3.5">
        <AnimatePresence>
          {isFabOpen && (
            <div className="flex flex-col items-end gap-3">
              {/* Action 1: Scan Receipt */}
              <motion.button
                type="button"
                initial={{ opacity: 0, y: 15, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 15, scale: 0.8 }}
                transition={{ duration: 0.15 }}
                onClick={() => {
                  setIsFabOpen(false);
                  navigate('/scan');
                }}
                className="flex items-center gap-2.5 px-3 py-2 bg-[#22d3ee] hover:bg-cyan-400 text-black font-mono font-bold text-xs rounded-xl shadow-lg border-transparent flex-row cursor-pointer hover:scale-105 transition-all"
              >
                <span>Scan Receipt Sheet</span>
                <span className="w-7 h-7 bg-black/10 rounded-lg flex items-center justify-center">
                  <Camera className="w-4 h-4 text-black" />
                </span>
              </motion.button>

              {/* Action 2: Voice Entry */}
              <motion.button
                type="button"
                initial={{ opacity: 0, y: 15, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 15, scale: 0.8 }}
                transition={{ duration: 0.15, delay: 0.04 }}
                onClick={() => {
                  setIsFabOpen(false);
                  handleVoiceCommand();
                }}
                className="flex items-center gap-2.5 px-3 py-2 bg-purple-500 hover:bg-purple-600 text-white font-mono font-bold text-xs rounded-xl shadow-lg border-transparent flex-row cursor-pointer hover:scale-105 transition-all"
              >
                <span>Voice Ledger Log</span>
                <span className="w-7 h-7 bg-white/10 rounded-lg flex items-center justify-center">
                  <Mic className="w-4 h-4 text-white" />
                </span>
              </motion.button>

              {/* Action 3: Quick Add */}
              <motion.button
                type="button"
                initial={{ opacity: 0, y: 15, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 15, scale: 0.8 }}
                transition={{ duration: 0.15, delay: 0.08 }}
                onClick={() => {
                  setIsFabOpen(false);
                  setIsQuickAddOpen(true);
                }}
                className="flex items-center gap-2.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-black font-mono font-bold text-xs rounded-xl shadow-lg border-transparent flex-row cursor-pointer hover:scale-105 transition-all"
              >
                <span>Standard Quick Add</span>
                <span className="w-7 h-7 bg-black/10 rounded-lg flex items-center justify-center">
                  <Plus className="w-4 h-4 text-black" />
                </span>
              </motion.button>
            </div>
          )}
        </AnimatePresence>

        {/* Master Toggle Trigger */}
        <button
          type="button"
          onClick={() => setIsFabOpen(!isFabOpen)}
          className={`w-14 h-14 rounded-full flex items-center justify-center text-white bg-gradient-to-r from-cyan-400 to-purple-500 shadow-[0_0_20px_rgba(34,211,238,0.4)] cursor-pointer hover:scale-105 transition-all duration-300 relative overflow-hidden group ${
            isFabOpen ? 'rotate-95' : ''
          }`}
        >
          <div className="absolute top-0 right-0 bottom-0 left-0 bg-white/15 opacity-0 group-hover:opacity-100 transition-opacity" />
          <motion.div
            animate={{ rotate: isFabOpen ? 45 : 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
          >
            <Plus className="w-6 h-6 text-white" />
          </motion.div>
        </button>
      </div>
    </div>
  );
}
