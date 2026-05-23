import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/src/context/AuthContext';
import { User, Bell, Shield, Key } from 'lucide-react';
import { motion } from 'motion/react';

export default function Settings() {
  const { user, logout } = useAuth();

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-3xl font-display font-bold">System Configuration</h2>
        <p className="text-muted-foreground">Manage your NeuroFin operational parameters.</p>
      </div>

      <div className="grid gap-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="glass-card border-none">
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex flex-col items-center justify-center text-primary border border-primary/30">
                <User className="w-6 h-6" />
              </div>
              <div>
                <CardTitle>Identity Profile</CardTitle>
                <CardDescription>Manage your personal credentials.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input defaultValue={user?.name} className="bg-white/5 border-white/10" />
                </div>
                <div className="space-y-2">
                  <Label>Email Node</Label>
                  <Input defaultValue={user?.email} className="bg-white/5 border-white/10" disabled />
                </div>
              </div>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">Save Changes</Button>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="glass-card border-none">
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-neon-purple/20 flex flex-col items-center justify-center text-neon-purple border border-neon-purple/30">
                <Bell className="w-6 h-6" />
              </div>
              <div>
                <CardTitle>Notification Protocols</CardTitle>
                <CardDescription>Configure alerting and AI insights.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                <div>
                  <h4 className="font-medium">AI Insights Summaries</h4>
                  <p className="text-sm text-muted-foreground">Receive daily neural analysis.</p>
                </div>
                <div className="w-10 h-6 bg-primary rounded-full relative cursor-pointer">
                  <div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5 shadow-sm"></div>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                <div>
                  <h4 className="font-medium">Budget Overrun Alerts</h4>
                  <p className="text-sm text-muted-foreground">Critical warnings when exceeding targets.</p>
                </div>
                <div className="w-10 h-6 bg-primary rounded-full relative cursor-pointer">
                  <div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5 shadow-sm"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="glass-card border-none border-destructive/20 relative overflow-hidden">
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-destructive/20 flex flex-col items-center justify-center text-destructive border border-destructive/30">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
                <CardDescription>Irreversible account actions.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <p className="text-sm text-muted-foreground">Terminate session or permanently delete your identity node.</p>
                <div className="flex gap-4">
                  <Button variant="outline" className="border-white/10 hover:bg-white/5" onClick={logout}>Terminate Session</Button>
                  <Button variant="destructive" className="bg-destructive/80 hover:bg-destructive">Delete Node</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
