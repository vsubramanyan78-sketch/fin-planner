import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { format } from 'date-fns';
import { ArrowUpRight, ArrowDownRight, Wallet, Download, Mic, MicOff, Check, AlertCircle, Plus, Search, Loader2 } from 'lucide-react';
import { useAuth } from '@/src/context/AuthContext';
import { useCurrency, EXCHANGE_RATES } from '@/src/context/CurrencyContext';
import { motion, AnimatePresence } from 'motion/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export default function Transactions() {
  const [data, setData] = useState<any[]>([]);
  const { token } = useAuth();
  const { formatAmount } = useCurrency();
  const [loading, setLoading] = useState(true);
  
  // Real-time search query
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Currency Converter Widget State
  const [convAmount, setConvAmount] = useState('100');
  const [convFrom, setConvFrom] = useState('USD');
  const [convTo, setConvTo] = useState('EUR');
  const [convertExpanded, setConvertExpanded] = useState(true);

  // Add Transaction Form state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('expense');
  const [category, setCategory] = useState('Food');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [notes, setNotes] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState('monthly');
  const [formError, setFormError] = useState('');

  // AI Auto-Tagging state
  const [isTagging, setIsTagging] = useState(false);
  const [isAiTagged, setIsAiTagged] = useState(false);

  // Voice input state
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [voiceError, setVoiceError] = useState('');
  const [voiceSuccess, setVoiceSuccess] = useState(false);
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef('');

  // Intelligent parser for Web Speech commands
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

  const loadTransactions = useCallback(() => {
    fetch('/api/transactions', {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(r => r.json()).then(res => {
      setData(res.transactions || []);
      setLoading(false);
    });
  }, [token]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  useEffect(() => {
    // Initialize Speech Recognition
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = true;
        
        recognitionRef.current.onresult = (event: any) => {
          const current = event.resultIndex;
          const transcriptText = event.results[current][0].transcript;
          setTranscript(transcriptText);
          transcriptRef.current = transcriptText;
        };
        
        recognitionRef.current.onerror = (event: any) => {
          setVoiceError('Error recognizing speech: ' + event.error);
          setIsListening(false);
        };
        
        recognitionRef.current.onend = () => {
          setIsListening(false);
          const rawText = transcriptRef.current;
          if (rawText.trim().length > 0) {
             setVoiceSuccess(true);
             
             // Run voice-command logic optimizer
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
             }).then(() => {
                  window.dispatchEvent(new Event('transactionAdded'));
             }).catch(console.error);
  
             setTimeout(() => {
               setVoiceSuccess(false);
               setTranscript('');
               transcriptRef.current = '';
               loadTransactions();
             }, 3500);
          }
        };
      }
    }
    
    return () => {
      if (recognitionRef.current) {
         recognitionRef.current.abort();
      }
    };
  }, [token, loadTransactions]);

  const handleAutoCategorize = async (vendorName?: string, valAmount?: string) => {
    const targetTitle = vendorName !== undefined ? vendorName : title;
    const targetAmount = valAmount !== undefined ? valAmount : amount;
    if (!targetTitle || targetTitle.trim().length < 3) return;
    setIsTagging(true);
    try {
      const response = await fetch('/api/ai/categorize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          title: targetTitle, 
          amount: targetAmount ? parseFloat(targetAmount) : 0 
        }),
      });
      if (response.ok) {
        const result = await response.json();
        if (result.category) {
          setCategory(result.category);
          setIsAiTagged(true);
          setTimeout(() => setIsAiTagged(false), 2000);
        }
      }
    } catch (err) {
      console.error("AI Auto-Tag error:", err);
    } finally {
      setIsTagging(false);
    }
  };

  const toggleListening = () => {
    setVoiceError('');
    setVoiceSuccess(false);
    if (!recognitionRef.current) {
      setVoiceError("Speech recognition not supported in this browser.");
      return;
    }
    
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setTranscript('');
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!title || !amount) {
      setFormError('Please fill in title and amount.');
      return;
    }

    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          amount: parseFloat(amount),
          type,
          category,
          date: date ? new Date(date).toISOString() : new Date().toISOString(),
          is_recurring: isRecurring,
          recurring_frequency: isRecurring ? recurringFrequency : null,
          notes,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save transaction');
      }

      // Reset form fields
      setTitle('');
      setAmount('');
      setType('expense');
      setCategory('Food');
      setDate(format(new Date(), 'yyyy-MM-dd'));
      setNotes('');
      setIsRecurring(false);
      setRecurringFrequency('monthly');
      setIsAddOpen(false);

      // Reload state
      loadTransactions();
      window.dispatchEvent(new Event('transactionAdded'));
    } catch (err: any) {
      setFormError(err.message || 'An error occurred while adding the transaction.');
    }
  };

  const filteredData = data.filter(tx => {
    // 1. Merchant name, category, or notes search
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q ? true : (
      (tx.title || '').toLowerCase().includes(q) ||
      (tx.category || '').toLowerCase().includes(q) ||
      (tx.notes || '').toLowerCase().includes(q)
    );

    // 2. Date range envelope
    let matchesDate = true;
    if (tx.date) {
      try {
        const txDateStr = format(new Date(tx.date), 'yyyy-MM-dd');
        if (startDate) {
          matchesDate = matchesDate && (txDateStr >= startDate);
        }
        if (endDate) {
          matchesDate = matchesDate && (txDateStr <= endDate);
        }
      } catch (err) {
        console.error("Date format error:", err);
      }
    }

    return matchesSearch && matchesDate;
  });

  const exportCSV = () => {
    const target = filteredData;
    if (!target || target.length === 0) return;
    const headers = ['Date', 'Title', 'Category', 'Type', 'Amount', 'Recurring', 'Frequency', 'Notes'];
    const rows = target.map(tx => [
      format(new Date(tx.date), 'yyyy-MM-dd'),
      `"${(tx.title || '').replace(/"/g, '""')}"`,
      tx.category,
      tx.type,
      tx.amount,
      tx.is_recurring ? 'Yes' : 'No',
      tx.recurring_frequency || '',
      `"${(tx.notes || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `neurofin_ledger_${format(new Date(), 'yyyyMMdd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <div className="p-8"><div className="w-8 h-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" /></div>;

  return (
     <div className="space-y-6 relative pb-20 md:pb-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold">Ledger</h2>
          <p className="text-muted-foreground">Historical transaction data.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={exportCSV} className="bg-white/5 border border-white/10 hover:bg-white/10 text-white font-medium rounded-xl" variant="outline">
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </Button>

          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger className={cn(buttonVariants({ variant: 'default' }), "bg-[#22d3ee] text-black hover:bg-cyan-400 font-medium rounded-xl cursor-pointer flex items-center px-4 py-2")}>
              <Plus className="w-4 h-4 mr-2" /> Add Transaction
            </DialogTrigger>
            <DialogContent className="glass-card border-white/10 text-white max-w-md">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold font-display">Add Transaction</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddTransaction} className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-white/70">Type</Label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-white/10 bg-[#0f172a] px-3 py-2 text-sm text-white"
                    >
                      <option value="expense">Expense</option>
                      <option value="income">Income</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-white/70">Category</Label>
                      {isTagging && (
                        <span className="text-[10px] text-cyan-400 font-mono animate-pulse flex items-center gap-1">
                          <Loader2 className="w-2.5 h-2.5 animate-spin" /> Tagging...
                        </span>
                      )}
                      {isAiTagged && (
                        <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1 animate-bounce">
                          <Check className="w-2.5 h-2.5" /> AI Suggestion
                        </span>
                      )}
                    </div>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className={cn(
                        "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-white/10 bg-[#0f172a] px-3 py-2 text-sm text-white transition-all duration-300",
                        isAiTagged && "border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]",
                        isTagging && "border-cyan-400 opacity-80"
                      )}
                    >
                      <option value="Food">Food</option>
                      <option value="Utilities">Utilities</option>
                      <option value="Entertainment">Entertainment</option>
                      <option value="Housing">Housing</option>
                      <option value="Salary">Salary</option>
                      <option value="Transport">Transport</option>
                      <option value="Shopping">Shopping</option>
                      <option value="Investment">Investment</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-white/70">Title / Vendor</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onBlur={() => handleAutoCategorize()}
                    placeholder="e.g. Acme Supermarket"
                    className="bg-white/5 border-white/10 text-white rounded-lg"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-white/70">Amount</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="bg-white/5 border-white/10 text-white rounded-lg"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/70">Date</Label>
                    <Input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="bg-white/5 border-white/10 text-white rounded-lg"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-white/70">Notes</Label>
                  <Input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional details or note content..."
                    className="bg-white/5 border-white/10 text-white rounded-lg"
                  />
                </div>

                <div className="pt-2 border-t border-white/5 mt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="recurring-toggle" className="text-white/90 font-medium cursor-pointer">Mark as Recurring</Label>
                    <input
                      id="recurring-toggle"
                      type="checkbox"
                      checked={isRecurring}
                      onChange={(e) => setIsRecurring(e.target.checked)}
                      className="w-4 h-4 rounded text-cyan-500 bg-white/5 border-white/10"
                    />
                  </div>

                  {isRecurring && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                      <Label className="text-white/70">Frequency</Label>
                      <select
                        value={recurringFrequency}
                        onChange={(e) => setRecurringFrequency(e.target.value)}
                        className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-white/10 bg-[#0f172a] px-3 py-2 text-sm text-white"
                      >
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                  )}
                </div>

                {formError && (
                  <p className="text-xs text-red-400 mt-2">{formError}</p>
                )}

                <Button type="submit" className="w-full bg-[#22d3ee] text-black hover:bg-cyan-400 font-bold rounded-xl mt-4">
                  Add Transaction
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Real-Time Currency Converter helper widget */}
      <AnimatePresence>
        {convertExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-6"
          >
            <Card className="glass-card border-none bg-gradient-to-r from-cyan-950/15 to-purple-950/15 border border-cyan-500/10 p-5 rounded-2xl relative shadow-[0_0_20px_rgba(34,211,238,0.05)]">
              <div className="absolute top-3 right-3">
                <Button 
                  onClick={() => setConvertExpanded(false)}
                  variant="ghost" 
                  size="sm" 
                  className="text-white/40 hover:text-white hover:bg-white/5 rounded-full w-8 h-8 p-0 cursor-pointer"
                >
                  ✕
                </Button>
              </div>
              <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
                <div>
                  <h4 className="text-white font-bold text-sm tracking-wide uppercase flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
                    </span>
                    Live Multi-Currency Calculator Widget
                  </h4>
                  <p className="text-xs text-white/50 mt-1">Update, convert, and query relative exchange values utilizing real-time exchange ratios.</p>
                </div>
                <div className="flex flex-wrap items-center gap-4 bg-black/30 p-3 rounded-2xl border border-white/5 w-full lg:w-auto">
                  <div className="space-y-1.5 flex-1 sm:flex-initial">
                    <span className="text-[10px] font-mono text-white/40 block font-bold uppercase tracking-wider">From Amount</span>
                    <input
                      type="number"
                      value={convAmount}
                      onChange={(e) => setConvAmount(e.target.value)}
                      className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white w-full sm:w-28 font-mono focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  
                  <div className="space-y-1.5 flex-1 sm:flex-initial">
                    <span className="text-[10px] font-mono text-white/40 block font-bold uppercase tracking-wider">Source Code</span>
                    <select
                      value={convFrom}
                      onChange={(e) => setConvFrom(e.target.value)}
                      className="bg-slate-950 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white w-full sm:w-24 focus:outline-none focus:border-cyan-400 cursor-pointer"
                    >
                      {Object.keys(EXCHANGE_RATES).map(cur => (
                        <option key={cur} value={cur}>{cur}</option>
                      ))}
                    </select>
                  </div>

                  <span className="text-cyan-400 font-mono text-xs font-bold pt-4 self-center text-center">➔</span>

                  <div className="space-y-1.5 flex-1 sm:flex-initial">
                    <span className="text-[10px] font-mono text-white/40 block font-bold uppercase tracking-wider">Target Code</span>
                    <select
                      value={convTo}
                      onChange={(e) => setConvTo(e.target.value)}
                      className="bg-slate-950 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white w-full sm:w-24 focus:outline-none focus:border-cyan-400 cursor-pointer"
                    >
                      {Object.keys(EXCHANGE_RATES).map(cur => (
                        <option key={cur} value={cur}>{cur}</option>
                      ))}
                    </select>
                  </div>

                  <div className="self-stretch flex items-center justify-center sm:border-l border-white/10 pl-0 sm:pl-4">
                    <div className="text-left py-2">
                      <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest block font-bold">Calculation Output</span>
                      <span className="text-lg font-black text-white font-mono leading-none">
                        {(() => {
                          const amt = parseFloat(convAmount) || 0;
                          const usdVal = convFrom === 'USD' ? amt : amt / (EXCHANGE_RATES[convFrom] || 1);
                          const targetVal = convTo === 'USD' ? usdVal : usdVal * (EXCHANGE_RATES[convTo] || 1);
                          
                          return new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: convTo
                          }).format(targetVal);
                        })()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {!convertExpanded && (
        <div className="flex justify-start mb-4">
          <Button 
            onClick={() => setConvertExpanded(true)}
            variant="outline"
            className="text-xs bg-white/5 border border-white/10 text-cyan-400 hover:text-white rounded-xl py-1 px-3 cursor-pointer"
          >
            💱 Open Currency Converter Widget
          </Button>
        </div>
      )}

      {/* Real-Time Filter Search Bar & Date Range Pickers */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-white/40" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by vendor/merchant name, category or details..."
            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40 rounded-xl py-5"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 bg-white/5 border border-white/10 p-2.5 rounded-xl">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-white/40">From</span>
            <input 
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-[#0f172a] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-white/40">To</span>
            <input 
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-[#0f172a] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400"
            />
          </div>
          {(startDate || endDate || searchQuery) && (
            <Button 
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setSearchQuery('');
              }}
              size="sm"
              variant="ghost" 
              className="text-xs text-red-400 hover:text-red-300 hover:bg-white/5 px-2.5 h-8 rounded-lg cursor-pointer"
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      <Card className="glass-card border-none">
        <CardContent className="p-0 sm:p-6">
          <div className="divide-y divide-border/20">
            {filteredData.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No transactions match your criteria.</div>
            ) : (
              filteredData.map((tx, idx) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  key={tx.id} 
                  className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg ${tx.type === 'income' ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30' : 'bg-red-500/20 text-red-500 border border-red-500/30'}`}>
                      {tx.type === 'income' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="font-semibold">{tx.title}</p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>{format(new Date(tx.date), 'MMM dd, yyyy')}</span>
                        <span>•</span>
                        <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10">{tx.category}</span>
                        {tx.is_recurring ? (
                          <>
                            <span>•</span>
                            <span className="px-2 py-0.5 rounded-full bg-cyan-400/15 border border-cyan-400/30 text-cyan-400 font-bold uppercase text-[9px] tracking-wider">
                              🔁 {tx.recurring_frequency}
                            </span>
                          </>
                        ) : null}
                      </div>
                      {tx.notes && (
                        <p className="text-xs text-white/40 mt-1 italic">"{tx.notes}"</p>
                      )}
                    </div>
                  </div>
                  <div className={`font-bold font-mono ${tx.type === 'income' ? 'text-emerald-500' : 'text-foreground'}`}>
                    {tx.type === 'income' ? '+' : '-'}{formatAmount(tx.amount)}
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Voice Input FAB */}
      <div className="fixed bottom-24 md:bottom-8 right-6 z-50 flex flex-col items-end pointer-events-none">
        <AnimatePresence>
          {(isListening || transcript || voiceError || voiceSuccess) && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="mb-4 p-4 rounded-2xl bg-[#0a0a0f]/95 border border-cyan-400/30 shadow-[0_0_30px_rgba(34,211,238,0.2)] backdrop-blur-xl max-w-[280px] w-full pointer-events-auto"
            >
              {voiceError ? (
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                  <p className="text-sm text-red-400">{voiceError}</p>
                </div>
              ) : voiceSuccess ? (
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 border border-emerald-500/30">
                    <Check className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm text-white font-medium">Added via Voice</p>
                    <p className="text-xs text-emerald-400 mt-1 italic">"{transcript}"</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                     <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,1)]"></span>
                     </span>
                     <span className="text-sm text-cyan-400 font-medium uppercase tracking-widest animate-pulse">Listening...</span>
                  </div>
                  <p className="text-sm text-white/90 min-h-[40px] italic">
                    {transcript || "Speak to add a transaction..."}
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleListening}
          className={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl cursor-pointer pointer-events-auto border transition-colors relative ${isListening ? 'bg-cyan-400 border-cyan-300 text-black shadow-[0_0_30px_rgba(34,211,238,0.6)]' : 'bg-gradient-to-tr from-[#1a1a24] to-[#2a2a35] border-white/10 text-cyan-400 hover:border-cyan-400/50 hover:shadow-[0_0_20px_rgba(34,211,238,0.3)]'}`}
        >
          {isListening ? (
             <>
               <div className="absolute inset-0 rounded-full border-2 border-black/20 animate-ping"></div>
               <Mic className="w-6 h-6 z-10" />
             </>
          ) : (
            <Mic className="w-6 h-6" />
          )}
        </motion.button>
      </div>

     </div>
  );
}
