import { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Send, Bot, User, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/src/context/AuthContext';

export default function AiAssistantPanel({ onClose }: { onClose: () => void }) {
  const { token } = useAuth();
  const [messages, setMessages] = useState<{ role: 'ai' | 'user'; text: string }[]>([
    { role: 'ai', text: 'Hello! I am Neuro, your AI financial co-pilot. Want me to analyze your latest expenses or help set a budget?' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsTyping(true);

    try {
      const res = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ prompt: userMsg })
      });
      const data = await res.json();
      
      setMessages(prev => [...prev, { role: 'ai', text: data.text || "I'm having trouble connecting right now." }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'ai', text: "Error connecting to AI core." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden"
      />
      <motion.div
        initial={{ x: '100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed top-0 right-0 bottom-0 w-[90%] md:w-[450px] glass border-l border-border/20 z-50 flex flex-col shadow-2xl"
      >
        <div className="p-4 border-b border-border/20 flex items-center justify-between bg-primary/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center border border-primary/50 neon-glow-primary">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg">Neuro AI</h3>
              <p className="text-xs text-primary flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" /> Online
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-white/10">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {messages.map((msg, i) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={i}
              className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-secondary' : 'bg-primary/20 border border-primary/30'}`}>
                {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4 text-primary" />}
              </div>
              <div className={`p-3 rounded-2xl max-w-[80%] text-sm ${msg.role === 'user' ? 'bg-secondary text-secondary-foreground rounded-tr-sm' : 'glass-card border-none rounded-tl-sm text-foreground/90 leading-relaxed'}`}>
                {msg.text}
              </div>
            </motion.div>
          ))}
          {isTyping && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div className="glass-card border-none p-4 rounded-2xl rounded-tl-sm flex items-center gap-2">
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce delay-75" />
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce delay-150" />
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="p-4 border-t border-border/20 bg-background/50">
          <form
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="relative flex items-center"
          >
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask Neuro..."
              className="pr-12 py-6 rounded-full bg-white/5 border-white/10 focus-visible:ring-primary/50 text-base"
            />
            <Button
              type="submit"
              size="icon"
              disabled={isTyping || !input.trim()}
              className="absolute right-1.5 rounded-full bg-primary hover:bg-primary/80 transition-transform active:scale-95"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </motion.div>
    </>
  );
}
