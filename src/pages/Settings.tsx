import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useAuth } from '@/src/context/AuthContext';
import { useCurrency } from '@/src/context/CurrencyContext';
import { useTheme } from '@/src/context/ThemeContext';
import { User, Bell, Shield, Repeat, Plus, PieChart, Sun, Moon, ShieldCheck, Fingerprint } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const mockSubscriptions: any[] = [];

export default function Settings() {
  const { user, logout, token } = useAuth();
  const { formatAmount } = useCurrency();
  const [activeTab, setActiveTab] = useState<'general' | 'subscriptions' | 'budgets'>('general');
  const [biometricEnabled, setBiometricEnabled] = useState(() => localStorage.getItem('biometric_auth_enabled') === 'true');
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);
  
  // New sub state
  const [isSubOpen, setIsSubOpen] = useState(false);
  const [subName, setSubName] = useState('');
  const [subAmount, setSubAmount] = useState('');
  const [subCycle, setSubCycle] = useState('monthly');
  
  // New budget state
  const [isBudgetOpen, setIsBudgetOpen] = useState(false);
  const [budgetCat, setBudgetCat] = useState('');
  const [budgetLimit, setBudgetLimit] = useState('');

  useEffect(() => {
    fetch('/api/subscriptions', { headers: { 'Authorization': `Bearer ${token}` }})
      .then(r => r.json())
      .then(d => setSubscriptions(d.subscriptions || []));
      
    fetch('/api/budgets', { headers: { 'Authorization': `Bearer ${token}` }})
      .then(r => r.json())
      .then(d => setBudgets(d.budgets || []));
  }, [token]);

  const handleAddSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subName || !subAmount) return;
    const res = await fetch('/api/subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ name: subName, amount: Number(subAmount), billing_cycle: subCycle, next_billing_date: new Date().toISOString() })
    });
    if (res.ok) {
      const newSub = await res.json();
      setSubscriptions([newSub, ...subscriptions]);
      setIsSubOpen(false);
      setSubName('');
      setSubAmount('');
    }
  };

  const handleAddBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!budgetCat || !budgetLimit) return;
    const res = await fetch('/api/budgets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ category: budgetCat, limit_amount: Number(budgetLimit) })
    });
    if (res.ok) {
      const newBudget = await res.json();
      setBudgets([...budgets, newBudget]);
      setIsBudgetOpen(false);
      setBudgetCat('');
      setBudgetLimit('');
    }
  };

  const totalMonthly = subscriptions.filter(s => s.billing_cycle === 'monthly').reduce((acc, curr) => acc + curr.amount, 0) + (subscriptions.filter(s => s.billing_cycle === 'yearly').reduce((acc, curr) => acc + curr.amount, 0) / 12);

  const { theme, toggleTheme, syncWithSystem, setSyncWithSystem } = useTheme();

  return (
    <div className="space-y-6 max-w-4xl relative pb-20">
      {/* Floating Theme Switcher */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={toggleTheme}
          className="bg-purple-500/10 backdrop-blur-xl border border-white/10 p-4 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:bg-white/10 transition-all flex items-center justify-center group"
          title={`Switch to ${theme === 'neon-dark' ? 'Frosted Glass' : 'Neon Dark'} theme`}
        >
          {theme === 'neon-dark' ? <Sun className="w-6 h-6 text-yellow-400 group-hover:rotate-45 transition-transform" /> : <Moon className="w-6 h-6 text-purple-400 group-hover:-rotate-12 transition-transform" />}
        </button>
      </div>

      <div>
        <h2 className="text-3xl font-display font-bold">System Configuration</h2>
        <p className="text-muted-foreground mt-1">Manage your NeuroFin operational parameters.</p>
      </div>

      <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/10 w-fit">
        <button
          onClick={() => setActiveTab('general')}
          className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'general' ? 'bg-cyan-400 border border-cyan-400 text-black shadow-[0_0_15px_rgba(34,211,238,0.4)]' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
        >
          General
        </button>
        <button
          onClick={() => setActiveTab('subscriptions')}
          className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'subscriptions' ? 'bg-cyan-400 border border-cyan-400 text-black shadow-[0_0_15px_rgba(34,211,238,0.4)]' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
        >
          Subscriptions
        </button>
        <button
          onClick={() => setActiveTab('budgets')}
          className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'budgets' ? 'bg-cyan-400 border border-cyan-400 text-black shadow-[0_0_15px_rgba(34,211,238,0.4)]' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
        >
          Budgets
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'general' ? (
          <motion.div key="general" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid gap-6">
            <Card className="glass-card border-none">
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-cyan-400/20 flex flex-col items-center justify-center text-cyan-400 border border-cyan-400/30">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <CardTitle className="text-white/90">Identity Profile</CardTitle>
                  <CardDescription className="text-white/50">Manage your personal credentials.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-white/70">Full Name</Label>
                    <Input defaultValue={user?.name} className="bg-white/5 border-white/10 text-white focus:border-cyan-400 focus:ring-cyan-400/20" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/70">Email Node</Label>
                    <Input defaultValue={user?.email} className="bg-white/5 border-white/10 text-white/50" disabled />
                  </div>
                </div>
                <Button className="bg-gradient-to-tr from-cyan-400 to-purple-500 text-white font-bold tracking-wide border border-transparent shadow-[0_0_20px_rgba(34,211,238,0.2)]">Save Changes</Button>
              </CardContent>
            </Card>

            <Card className="glass-card border-none">
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-cyan-400/20 flex flex-col items-center justify-center text-cyan-400 border border-cyan-400/30">
                  <Sun className="w-6 h-6" />
                </div>
                <div>
                  <CardTitle className="text-white/90">Theme & Aesthetics</CardTitle>
                  <CardDescription className="text-white/50">Configure visual themes and user-interface preferences.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                  <div>
                    <h4 className="font-medium text-white/90">Automated OS Theme Sync</h4>
                    <p className="text-xs sm:text-sm text-white/50 pr-4">Automatically synchronize interface with your operating system light and dark color schemes.</p>
                  </div>
                  <button 
                    onClick={() => setSyncWithSystem(!syncWithSystem)}
                    className={`w-10 h-6 rounded-full relative transition-all duration-300 shrink-0 cursor-pointer ${syncWithSystem ? 'bg-[#22d3ee] shadow-[0_0_12px_rgba(34,211,238,0.4)]' : 'bg-white/10'}`}
                  >
                    <div className={`w-5 h-5 bg-black rounded-full absolute duration-300 top-0.5 shadow-sm ${syncWithSystem ? 'right-0.5' : 'left-0.5'}`} />
                  </button>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-none">
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-purple-500/20 flex flex-col items-center justify-center text-purple-400 border border-purple-500/30">
                  <Bell className="w-6 h-6" />
                </div>
                <div>
                  <CardTitle className="text-white/90">Notification Protocols</CardTitle>
                  <CardDescription className="text-white/50">Configure alerting and AI insights.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                  <div>
                    <h4 className="font-medium text-white/90">AI Insights Summaries</h4>
                    <p className="text-sm text-white/50">Receive daily neural analysis.</p>
                  </div>
                  <div className="w-10 h-6 bg-cyan-400 rounded-full relative cursor-pointer shadow-[0_0_10px_rgba(34,211,238,0.3)]">
                    <div className="w-5 h-5 bg-black rounded-full absolute right-0.5 top-0.5 shadow-sm"></div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                  <div>
                    <h4 className="font-medium text-white/90">Budget Overrun Alerts</h4>
                    <p className="text-sm text-white/50">Critical warnings when exceeding targets.</p>
                  </div>
                  <div className="w-10 h-6 bg-cyan-400 rounded-full relative cursor-pointer shadow-[0_0_10px_rgba(34,211,238,0.3)]">
                    <div className="w-5 h-5 bg-black rounded-full absolute right-0.5 top-0.5 shadow-sm"></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-none">
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-cyan-400/20 flex flex-col items-center justify-center text-cyan-400 border border-cyan-400/30">
                  <Fingerprint className="w-6 h-6" />
                </div>
                <div>
                  <CardTitle className="text-white/90">Security Protocols</CardTitle>
                  <CardDescription className="text-white/50">Configure credential locks and secure gates.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                  <div>
                    <h4 className="font-medium text-white/90">Biometric Secure Gate</h4>
                    <p className="text-xs sm:text-sm text-white/50 pr-4">Require biometric Face ID / Touch ID verification before loading sensitive dashboard balances.</p>
                  </div>
                  <button 
                    onClick={() => {
                      const nextVal = !biometricEnabled;
                      localStorage.setItem('biometric_auth_enabled', nextVal ? 'true' : 'false');
                      setBiometricEnabled(nextVal);
                      
                      // Also clear local session token if turning off, so it resets
                      if (!nextVal) {
                        sessionStorage.removeItem('biometric_authorized_session');
                      }
                    }}
                    className={`w-10 h-6 rounded-full relative transition-all duration-300 shrink-0 cursor-pointer ${biometricEnabled ? 'bg-[#22d3ee] shadow-[0_0_12px_rgba(34,211,238,0.4)]' : 'bg-white/10'}`}
                  >
                    <div className={`w-5 h-5 bg-black rounded-full absolute duration-300 top-0.5 shadow-sm ${biometricEnabled ? 'right-0.5' : 'left-0.5'}`} />
                  </button>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-none border-destructive/20 relative overflow-hidden">
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-destructive/20 flex flex-col items-center justify-center text-destructive border border-destructive/30">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <CardTitle className="text-destructive font-display">Danger Zone</CardTitle>
                  <CardDescription className="text-white/50">Irreversible account actions.</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <p className="text-sm text-white/70">Terminate session or permanently delete your identity node.</p>
                  <div className="flex gap-4">
                    <Button variant="outline" className="border-white/10 text-white hover:bg-white/5 hover:text-white/80" onClick={logout}>Terminate Session</Button>
                    <Button variant="destructive" className="bg-destructive hover:bg-destructive/90 shadow-[0_0_15px_rgba(239,68,68,0.4)]">Delete Node</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : activeTab === 'subscriptions' ? (
          <motion.div key="subscriptions" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid gap-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="glass-card border-none bg-gradient-to-br from-cyan-400/10 to-transparent">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-cyan-400/80 tracking-widest uppercase">Fixed Monthly Cost</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold font-mono text-cyan-400">{formatAmount(totalMonthly)}</div>
                  <p className="text-xs text-white/50 mt-2">Across {subscriptions.filter(s => s.billing_cycle === 'monthly').length + subscriptions.filter(s => s.billing_cycle === 'yearly').length} active services</p>
                </CardContent>
              </Card>
            </div>

            <Card className="glass-card border-none">
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-purple-500/20 flex flex-col items-center justify-center text-purple-400 border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                    <Repeat className="w-6 h-6" />
                  </div>
                  <div>
                    <CardTitle className="text-white/90">Recurring Expenses</CardTitle>
                    <CardDescription className="text-white/50">Manage your active subscriptions.</CardDescription>
                  </div>
                </div>
                <Dialog open={isSubOpen} onOpenChange={setIsSubOpen}>
                  <DialogTrigger className={cn(buttonVariants({ variant: 'outline' }), "bg-white/5 text-white hover:bg-white/10 border border-white/10 rounded-xl px-4 py-2 flex items-center")}>
                    <Plus className="w-4 h-4 mr-2" /> Add Service
                </DialogTrigger>
                  <DialogContent className="glass-card border-white/10 text-white">
                    <DialogHeader>
                      <DialogTitle>Add Subscription</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddSubscription} className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label>Name</Label>
                        <Input value={subName} onChange={e => setSubName(e.target.value)} placeholder="e.g. Netflix" className="bg-white/5 border-white/10 text-white" required />
                      </div>
                      <div className="space-y-2">
                        <Label>Amount</Label>
                        <Input type="number" step="0.01" value={subAmount} onChange={e => setSubAmount(e.target.value)} placeholder="0.00" className="bg-white/5 border-white/10 text-white" required />
                      </div>
                      <div className="space-y-2">
                        <Label>Billing Cycle</Label>
                        <select value={subCycle} onChange={(e) => setSubCycle(e.target.value)} className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:border-cyan-400 focus:ring-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-50 text-white">
                            <option value="monthly" className="bg-[#0f172a]">Monthly</option>
                            <option value="yearly" className="bg-[#0f172a]">Yearly</option>
                        </select>
                      </div>
                      <Button type="submit" className="w-full bg-cyan-500 text-black hover:bg-cyan-400 font-bold">Add Subscription</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-white/5">
                  {subscriptions.length === 0 ? (
                    <div className="py-8 text-center text-white/50 text-sm">
                      No active subscriptions detected.
                    </div>
                  ) : (
                    subscriptions.map((sub, idx) => (
                    <motion.div 
                      key={sub.id || idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="py-4 flex items-center justify-between hover:bg-white/5 transition-colors -mx-6 px-6"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg bg-white/5 border border-white/10 font-bold text-lg font-display`}>
                          {sub.name?.charAt(0)}
                        </div>
                        <div>
                          <p className={`font-semibold text-white/90`}>{sub.name}</p>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-white/40">Billed {sub.billing_cycle}</span>
                          </div>
                        </div>
                      </div>
                      <div className={`font-bold font-mono text-cyan-400`}>
                        {formatAmount(sub.amount)}
                      </div>
                    </motion.div>
                  )))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div key="budgets" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid gap-6">
            <Card className="glass-card border-none">
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex flex-col items-center justify-center text-emerald-400 border border-emerald-500/30 shadow-[0_0_15px_rgba(52,211,153,0.2)]">
                    <PieChart className="w-6 h-6" />
                  </div>
                  <div>
                    <CardTitle className="text-white/90">Budget Thresholds</CardTitle>
                    <CardDescription className="text-white/50">Manage your spending limits per category.</CardDescription>
                  </div>
                </div>
                <Dialog open={isBudgetOpen} onOpenChange={setIsBudgetOpen}>
                  <DialogTrigger className={cn(buttonVariants({ variant: 'outline' }), "bg-white/5 text-white hover:bg-white/10 border border-white/10 rounded-xl px-4 py-2 flex items-center")}>
                    <Plus className="w-4 h-4 mr-2" /> Add Category
                </DialogTrigger>
                  <DialogContent className="glass-card border-white/10 text-white">
                    <DialogHeader>
                      <DialogTitle>Add Budget Threshold</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddBudget} className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label>Category</Label>
                        <Input value={budgetCat} onChange={e => setBudgetCat(e.target.value)} placeholder="e.g. Travel" className="bg-white/5 border-white/10 text-white" required />
                      </div>
                      <div className="space-y-2">
                        <Label>Monthly Limit Amount</Label>
                        <Input type="number" step="0.01" value={budgetLimit} onChange={e => setBudgetLimit(e.target.value)} placeholder="0.00" className="bg-white/5 border-white/10 text-white" required />
                      </div>
                      <Button type="submit" className="w-full bg-cyan-500 text-black hover:bg-cyan-400 font-bold">Add Threshold</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-white/5">
                  {budgets.length === 0 ? (
                    <div className="py-8 text-center text-white/50 text-sm">
                      No custom budgets set yet.
                    </div>
                  ) : (
                    budgets.map((budget, idx) => (
                    <motion.div 
                      key={budget.id || idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="py-4 flex items-center justify-between hover:bg-white/5 transition-colors -mx-6 px-6"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg bg-white/5 border border-white/10 font-bold text-lg font-display`}>
                          {budget.category?.charAt(0)}
                        </div>
                        <div>
                          <p className={`font-semibold text-white/90`}>{budget.category}</p>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-white/40">Monthly Limit</span>
                          </div>
                        </div>
                      </div>
                      <div className={`font-bold font-mono text-cyan-400`}>
                        {formatAmount(budget.limit_amount)}
                      </div>
                    </motion.div>
                  )))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
