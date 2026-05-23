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
      {/* Background Mesh Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none z-0"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[150px] pointer-events-none z-0"></div>
      <div className="absolute top-[20%] right-[10%] w-[300px] h-[300px] bg-cyan-400/10 rounded-full blur-[100px] pointer-events-none z-0"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md z-10"
      >
        <div className="text-center mb-10">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="w-16 h-16 mx-auto bg-gradient-to-tr from-cyan-400 to-purple-500 rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(34,211,238,0.3)]"
          >
            <Bot className="w-8 h-8 text-white mix-blend-overlay animate-pulse" />
          </motion.div>
          <h1 className="text-4xl font-display font-bold text-white tracking-tight">
            NeuroFin
          </h1>
          <p className="text-white/50 mt-3 font-medium">Next-gen financial intelligence.</p>
        </div>

        <Card className="glass-card border-none relative overflow-visible shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
          <CardHeader className="pb-4">
            <CardTitle className="text-xl text-center text-white/90">
              {isLogin ? 'Initialize Session' : 'Create Identity'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {!isLogin && (
                <div className="space-y-2 relative">
                  <UserIcon />
                  <Input 
                    placeholder="Full Name" 
                    value={name} onChange={e => setName(e.target.value)}
                    className="pl-11 h-12 bg-white/5 border-white/10 focus:border-cyan-400/50 focus:ring-cyan-400/20 text-white placeholder-white/30 rounded-xl" required 
                  />
                </div>
              )}
              <div className="space-y-2 relative">
                <MailIcon />
                <Input 
                  type="email" placeholder="Email Node" 
                  value={email} onChange={e => setEmail(e.target.value)}
                  className="pl-11 h-12 bg-white/5 border-white/10 focus:border-cyan-400/50 focus:ring-cyan-400/20 text-white placeholder-white/30 rounded-xl" required 
                />
              </div>
              <div className="space-y-2 relative">
                <LockIcon />
                <Input 
                  type="password" placeholder="Access Key" 
                  value={password} onChange={e => setPassword(e.target.value)}
                  className="pl-11 h-12 bg-white/5 border-white/10 focus:border-cyan-400/50 focus:ring-cyan-400/20 text-white placeholder-white/30 rounded-xl" required 
                />
              </div>

              {error && <p className="text-sm text-destructive text-center">{error}</p>}

              <Button 
                type="submit" 
                className="w-full h-12 mt-2 bg-gradient-to-tr from-cyan-400 to-purple-500 text-white font-bold tracking-wide border border-transparent hover:border-white/20 hover:opacity-90 shadow-[0_0_20px_rgba(34,211,238,0.2)] transition-all rounded-xl" 
                disabled={loading}
              >
                {loading ? <span className="animate-pulse">Processing...</span> : (isLogin ? 'Authenticate' : 'Initialize')}
              </Button>
            </form>

            <div className="mt-8 text-center text-sm text-white/50">
              {isLogin ? "Don't have an identity?" : "Already initialized?"}{' '}
              <button onClick={() => setIsLogin(!isLogin)} className="text-cyan-400 hover:text-cyan-300 transition-colors font-semibold">
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
