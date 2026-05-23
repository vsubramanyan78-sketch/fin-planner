import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/src/context/AuthContext';
import { User, Bell, Shield, Repeat, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const mockSubscriptions = [
  { id: 1, name: 'Netflix Premium', amount: 19.99, date: '12th', status: 'active', color: 'bg-red-400' },
  { id: 2, name: 'Adobe Creative Cloud', amount: 54.99, date: '15th', status: 'active', color: 'bg-purple-400' },
  { id: 3, name: 'OpenAI API', amount: 30.00, date: '1st', status: 'active', color: 'bg-emerald-400' },
  { id: 4, name: 'Gym Membership', amount: 45.00, date: '28th', status: 'paused', color: 'bg-cyan-400' },
];

export default function Settings() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'general' | 'subscriptions'>('general');

  const totalMonthly = mockSubscriptions.filter(s => s.status === 'active').reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="space-y-6 max-w-4xl">
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
        ) : (
          <motion.div key="subscriptions" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid gap-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="glass-card border-none bg-gradient-to-br from-cyan-400/10 to-transparent">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-cyan-400/80 tracking-widest uppercase">Fixed Monthly Cost</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold font-mono text-cyan-400">${totalMonthly.toFixed(2)}</div>
                  <p className="text-xs text-white/50 mt-2">Across {mockSubscriptions.filter(s => s.status === 'active').length} active services</p>
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
                <Button className="bg-white/5 text-white hover:bg-white/10 border border-white/10 rounded-xl">
                  <Plus className="w-4 h-4 mr-2" /> Add Service
                </Button>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-white/5">
                  {mockSubscriptions.map((sub, idx) => (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      key={sub.id} 
                      className="py-4 flex items-center justify-between hover:bg-white/5 transition-colors -mx-6 px-6"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg bg-white/5 border border-white/10 font-bold text-lg font-display ${sub.status === 'paused' ? 'opacity-50' : ''}`}>
                          {sub.name.charAt(0)}
                        </div>
                        <div>
                          <p className={`font-semibold ${sub.status === 'paused' ? 'text-white/50 line-through' : 'text-white/90'}`}>{sub.name}</p>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-white/40">Billed on {sub.date}</span>
                            {sub.status === 'paused' && <span className="px-2 py-0.5 rounded border border-white/10 bg-white/5 text-white/40 uppercase tracking-widest text-[9px]">Paused</span>}
                          </div>
                        </div>
                      </div>
                      <div className={`font-bold font-mono ${sub.status === 'paused' ? 'text-white/30' : 'text-cyan-400'}`}>
                        ${sub.amount.toFixed(2)}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
