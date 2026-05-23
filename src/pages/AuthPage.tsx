import { useState } from 'react';
import { useAuth } from '@/src/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Bot, Fingerprint, Lock, Mail } from 'lucide-react';
import { motion } from 'motion/react';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/signup';
      const body = isLogin ? { email, password } : { email, password, name };
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Authentication failed');
      
      login(data.token, data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden bg-background">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:32px]" />
      <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[128px] mix-blend-screen" />
      <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-neon-purple/20 rounded-full blur-[128px] mix-blend-screen" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md z-10"
      >
        <div className="text-center mb-8">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="w-16 h-16 mx-auto bg-primary/10 border border-primary/50 rounded-2xl flex items-center justify-center mb-4 neon-glow-primary"
          >
            <Bot className="w-8 h-8 text-primary" />
          </motion.div>
          <h1 className="text-3xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60">
            NeuroFin
          </h1>
          <p className="text-muted-foreground mt-2">Next-gen financial intelligence.</p>
        </div>

        <Card className="glass-card border-none relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />
          <CardHeader>
            <CardTitle className="text-xl text-center">
              {isLogin ? 'Initialize Session' : 'Create Identity'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2 relative">
                  <UserIcon />
                  <Input 
                    placeholder="Full Name" 
                    value={name} onChange={e => setName(e.target.value)}
                    className="pl-10 bg-white/5 border-white/10" required 
                  />
                </div>
              )}
              <div className="space-y-2 relative">
                <MailIcon />
                <Input 
                  type="email" placeholder="Email Node" 
                  value={email} onChange={e => setEmail(e.target.value)}
                  className="pl-10 bg-white/5 border-white/10" required 
                />
              </div>
              <div className="space-y-2 relative">
                <LockIcon />
                <Input 
                  type="password" placeholder="Access Key" 
                  value={password} onChange={e => setPassword(e.target.value)}
                  className="pl-10 bg-white/5 border-white/10" required 
                />
              </div>

              {error && <p className="text-sm text-destructive text-center">{error}</p>}

              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-primary to-neon-purple hover:opacity-90 neon-glow-primary relative overflow-hidden" 
                disabled={loading}
              >
                {loading ? <span className="animate-pulse">Processing...</span> : (isLogin ? 'Authenticate' : 'Initialize')}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              {isLogin ? "Don't have an identity?" : "Already initialized?"}{' '}
              <button onClick={() => setIsLogin(!isLogin)} className="text-primary hover:underline font-medium">
                {isLogin ? 'Create one' : 'Authenticate'}
              </button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

const UserIcon = () => <User className="w-4 h-4 absolute left-3 top-3 text-muted-foreground z-10" />
const MailIcon = () => <Mail className="w-4 h-4 absolute left-3 top-3 text-muted-foreground z-10" />
const LockIcon = () => <Lock className="w-4 h-4 absolute left-3 top-3 text-muted-foreground z-10" />
// Simple fix for lucide User not imported
import { User } from 'lucide-react';
