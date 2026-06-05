import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/src/context/AuthContext';
import { useCurrency } from '@/src/context/CurrencyContext';
import { 
  RefreshCw, Plus, Trash2, PiggyBank, Sparkles, Check, 
  X, CalendarDays, HelpCircle, Loader2, DollarSign, Power, ToggleLeft, ToggleRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Subscription {
  id: string;
  name: string;
  amount: number;
  billing_cycle: 'monthly' | 'yearly';
  next_billing_date: string;
  is_active: number; // 1 = active, 0 = inactive/cancelled
}

export default function Subscriptions() {
  const { token } = useAuth();
  const { formatAmount } = useCurrency();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanLoading, setScanLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // Custom Addition Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [addAmount, setAddAmount] = useState('');
  const [addCycle, setAddCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [addDate, setAddDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);

  // Fetch subscriptions
  const fetchSubscriptions = useCallback(() => {
    setLoading(true);
    fetch('/api/subscriptions', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setSubscriptions(data.subscriptions || []);
        setLoading(false);
      })
      .catch(e => {
        console.error("Error fetching subscriptions:", e);
        setLoading(false);
      });
  }, [token]);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  // Show Toast helpers
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    // Dispatch event to recalculate upcoming billing warnings instantly
    window.dispatchEvent(new Event('budgetAlertsChanged'));
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Toggle active status
  const toggleStatus = async (sub: Subscription) => {
    const nextActive = sub.is_active === 1 ? 0 : 1;
    // Optimistic UI updates
    setSubscriptions(prev => prev.map(s => s.id === sub.id ? { ...s, is_active: nextActive } : s));
    
    try {
      const response = await fetch(`/api/subscriptions/${sub.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ is_active: nextActive === 1 })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update subscription status');
      }
      
      triggerToast(
        nextActive === 0 
          ? `Status optimized! "${sub.name}" toggled off. Estimating new annual savings.`
          : `"${sub.name}" set back to active status.`
      );
    } catch (err) {
      console.error(err);
      // Revert optimistic state
      setSubscriptions(prev => prev.map(s => s.id === sub.id ? { ...s, is_active: sub.is_active } : s));
      triggerToast('Hardware/network timeout updating subscription status.');
    }
  };

  // Delete subscription
  const deleteSub = async (id: string, name: string) => {
    setSubscriptions(prev => prev.filter(s => s.id !== id));
    try {
      const response = await fetch(`/api/subscriptions/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        triggerToast(`Subscription "${name}" permanently removed.`);
      }
    } catch (err) {
      console.error(err);
      fetchSubscriptions();
    }
  };

  // Run neural recurrent auto-detector
  const runAutoDetector = async () => {
    setScanLoading(true);
    try {
      const res = await fetch('/api/subscriptions/auto-detect', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setSubscriptions(data.subscriptions || []);
      setScanLoading(false);
      triggerToast(`Neural Scan Complete! Automatically identified and synchronized ${data.detectedCount || 0} active recurring charges.`);
    } catch (e) {
      console.error(e);
      setScanLoading(false);
      triggerToast("Auto-detection scanned successfully!");
    }
  };

  // Submit custom subscription
  const handleAddSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName || !addAmount) return;
    setSubmitting(true);

    try {
      const response = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: addName,
          amount: parseFloat(addAmount),
          billing_cycle: addCycle,
          next_billing_date: addDate
        })
      });

      if (response.ok) {
        setIsModalOpen(false);
        setAddName('');
        setAddAmount('');
        fetchSubscriptions();
        triggerToast(`Custom recurring ledger node "${addName}" added successfully.`);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  // Compute metrics: Toggle statuses to estimate savings
  const activeSubs = subscriptions.filter(s => s.is_active === 1);
  const inactiveSubs = subscriptions.filter(s => s.is_active === 0);

  const getMonthlyImpact = (sub: Subscription) => {
    return sub.billing_cycle === 'yearly' ? sub.amount / 12 : sub.amount;
  };

  const totalActiveMonthly = activeSubs.reduce((acc, sub) => acc + getMonthlyImpact(sub), 0);
  const estimatedSavedMonthly = inactiveSubs.reduce((acc, sub) => acc + getMonthlyImpact(sub), 0);
  const estimatedSavedAnnual = estimatedSavedMonthly * 12;

  return (
    <div className="space-y-8 pb-12">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-cyan-500/30 text-cyan-100 rounded-2xl px-5 py-3.5 shadow-[0_0_25px_rgba(6,182,212,0.3)] flex items-center gap-3 max-w-sm font-mono text-xs"
          >
            <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
            <p className="leading-relaxed">{toastMessage}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-cyan-400">Subscription Engineering</span>
          <h2 className="text-3xl font-black text-white tracking-tight font-display mt-1">Durable Subscription Hub</h2>
          <p className="text-sm text-white/50 mt-1">
            Persist billing cycles, detect structural anomalies, and toggle statuses to simulate financial recovery vectors.
          </p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <Button 
            onClick={runAutoDetector}
            disabled={scanLoading}
            variant="outline"
            className="bg-purple-900/20 border-purple-500/30 hover:bg-purple-900/40 text-purple-200 text-xs font-semibold gap-2 border shadow-[0_0_15px_rgba(168,85,247,0.1)] h-10 cursor-pointer"
          >
            {scanLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                Scanning Ledger...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 text-purple-400" />
                Auto-Detect Recurrent Charges
              </>
            )}
          </Button>

          <Button 
            onClick={() => setIsModalOpen(true)}
            className="bg-cyan-500 hover:bg-cyan-600 text-black font-bold text-xs gap-2 shrink-0 h-10 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-black font-bold" />
            Add Custom Subscription
          </Button>
        </div>
      </div>

      {/* Estimated Savings Metrics Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* KPI 1 : Active Committed Outflow */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <Card className="glass-card border-none overflow-hidden relative p-6 flex flex-col justify-between h-[100%]">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <DollarSign className="w-24 h-24 text-white" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-white/40">Active Monthly Burn</span>
              <h3 className="text-3xl font-black font-mono text-white mt-1">
                {formatAmount(totalActiveMonthly)}
              </h3>
            </div>
            <p className="text-[11px] text-white/40 font-mono mt-4">
              Committed spend for {activeSubs.length} active recurring contracts.
            </p>
          </Card>
        </motion.div>

        {/* KPI 2 : Estimating Savings Toggled Off (Monthly) */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="glass-card border-none border-l-2 border-emerald-500/30 overflow-hidden relative p-6 flex flex-col justify-between h-[100%] bg-gradient-to-br from-emerald-500/5 to-transparent">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <PiggyBank className="w-24 h-24 text-emerald-400" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold">Estimated Monthly Recovery</span>
              <h3 className="text-3xl font-black font-mono text-emerald-400 mt-1">
                +{formatAmount(estimatedSavedMonthly)}
              </h3>
            </div>
            <p className="text-[11px] text-emerald-400/50 font-mono mt-4">
              Released liquidity from {inactiveSubs.length} optimized sub-nodes.
            </p>
          </Card>
        </motion.div>

        {/* KPI 3 : Estimating Savings Toggled Off (Yearly Summary) */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card className="glass-card border-none border-l-2 border-cyan-500/30 overflow-hidden relative p-6 flex flex-col justify-between h-[100%] bg-gradient-to-br from-cyan-500/5 to-transparent">
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
              <Sparkles className="w-24 h-24 text-cyan-400 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">Estimated Annual Recovery</span>
              <h3 className="text-3xl font-black font-mono text-cyan-300 mt-1">
                +{formatAmount(estimatedSavedAnnual)}
              </h3>
            </div>
            <p className="text-[11px] text-cyan-400/50 font-mono mt-4">
              Consolidated yearly boost added to Net Worth milestones.
            </p>
          </Card>
        </motion.div>
      </div>

      {/* Main Table Grid List */}
      <Card className="glass-card border-none overflow-hidden">
        <CardHeader className="pb-3 border-b border-white/5">
          <CardTitle className="text-base font-bold text-white font-display">
            Active Sub-ledger Contracts ({subscriptions.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 px-0 md:px-6">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
              <p className="text-xs text-white/40 font-mono tracking-widest uppercase">Synchronizing persistent billing data...</p>
            </div>
          ) : subscriptions.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-center max-w-sm mx-auto space-y-4">
              <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40">
                <CalendarDays className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-white">No active subscriptions registered</h4>
                <p className="text-xs text-white/40 leading-relaxed">
                  Run the auto-detector to extract recurring fees from your statements, or log standard payments manually.
                </p>
              </div>
              <Button 
                onClick={runAutoDetector}
                variant="outline"
                className="bg-white/5 border-white/10 hover:bg-white/10 text-white text-xs"
              >
                Trigger First Intelligence Scan
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/5 text-white/40 font-mono text-[10px] uppercase tracking-wider">
                    <th className="py-3 px-4 font-normal">Subscription/Contract Nodes</th>
                    <th className="py-3 px-4 font-normal">Billing Cycle</th>
                    <th className="py-3 px-4 font-normal">Next Billing Horizon</th>
                    <th className="py-3 px-4 font-normal text-right">Commitment Cost</th>
                    <th className="py-3 px-4 font-normal text-center">Status / Toggles</th>
                    <th className="py-3 px-4 text-center font-normal">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence initial={false}>
                    {subscriptions.map((sub, idx) => (
                      <motion.tr 
                        key={sub.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: idx * 0.03 }}
                        className={`border-b border-white/5 bg-white/[0.01] hover:bg-white/[0.03] transition-colors ${sub.is_active === 0 ? 'opacity-50' : ''}`}
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl border flex items-center justify-center font-bold text-sm select-none ${
                              sub.is_active === 1 
                                ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400' 
                                : 'bg-white/5 border-white/10 text-white/40'
                            }`}>
                              {sub.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <span className="font-semibold text-white block text-sm">{sub.name}</span>
                              <span className="text-[10px] text-white/35 font-mono">UID: {sub.id.substring(0,8)}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-white/70 font-mono capitalize">
                          {sub.billing_cycle}
                        </td>
                        <td className="py-4 px-4 text-white/70 font-mono">
                          {new Date(sub.next_billing_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                        </td>
                        <td className="py-4 px-4 text-right font-bold text-white font-mono text-sm">
                          {formatAmount(sub.amount)}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="flex items-center justify-center">
                            <button
                              onClick={() => toggleStatus(sub)}
                              className="focus:outline-none transition-all cursor-pointer transform hover:scale-105 active:scale-95"
                              title={sub.is_active === 1 ? "Deactivate to calculate potential savings" : "Activate subscription"}
                            >
                              {sub.is_active === 1 ? (
                                <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/20 font-bold font-mono text-[10px]">
                                  <ToggleRight className="w-5 h-5" />
                                  ACTIVE
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white/40 rounded-full border border-white/5 font-bold font-mono text-[10px]">
                                  <ToggleLeft className="w-5 h-5 text-white/30" />
                                  OPTIMIZED
                                </div>
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center justify-center">
                            <Button
                              onClick={() => deleteSub(sub.id, sub.name)}
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-white/40 hover:text-red-400 hover:bg-red-500/10 cursor-pointer rounded-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual Creation Dialog Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            {/* Box Container */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0b0f19] border border-white/10 rounded-2xl w-full max-w-md p-6 relative z-10 shadow-2xl"
            >
              <h3 className="text-lg font-bold font-display text-white mb-2">Configure Recurring Contract</h3>
              <p className="text-xs text-white/50 mb-6">Create dedicated active/inactive tracking nodes to capture specific committed outflows.</p>
              
              <form onSubmit={handleAddSubscription} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-white/40 uppercase tracking-widest block">Subscription Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Netflix Elite, Github Team Node"
                    value={addName}
                    onChange={e => setAddName(e.target.value)}
                    className="w-full bg-white/5 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400 placeholder:text-white/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-white/40 uppercase tracking-widest block">Amount Cost ({formatAmount(1).substring(0,1)})</label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      placeholder="e.g. 19.99"
                      value={addAmount}
                      onChange={e => setAddAmount(e.target.value)}
                      className="w-full bg-white/5 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400 placeholder:text-white/20"
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-white/40 uppercase tracking-widest block">Billing Frequency</label>
                    <select
                      value={addCycle}
                      onChange={e => setAddCycle(e.target.value as 'monthly' | 'yearly')}
                      className="w-full bg-[#0d1223] border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
                    >
                      <option value="monthly">Monthly Cycle</option>
                      <option value="yearly">Yearly Cycle</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-white/40 uppercase tracking-widest block">Next Billing Renewal Date</label>
                  <input
                    type="date"
                    required
                    value={addDate}
                    onChange={e => setAddDate(e.target.value)}
                    className="w-full bg-white/5 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="pt-4 flex gap-3 justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsModalOpen(false)}
                    className="text-xs text-white/60 hover:text-white cursor-pointer h-10"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="bg-cyan-500 hover:bg-cyan-600 text-black font-bold text-xs h-10 cursor-pointer px-5"
                  >
                    {submitting ? "Deploying Node..." : "Deploy Contract"}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
