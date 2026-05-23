import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ArrowUpRight, ArrowDownRight, Wallet, Download, Mic, MicOff, Check, AlertCircle } from 'lucide-react';
import { useAuth } from '@/src/context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';

export default function Transactions() {
  const [data, setData] = useState<any[]>([]);
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  
  // Voice input state
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [voiceError, setVoiceError] = useState('');
  const [voiceSuccess, setVoiceSuccess] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    fetch('/api/transactions', {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(r => r.json()).then(res => {
      setData(res.transactions || []);
      setLoading(false);
    });
    
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
        };
        
        recognitionRef.current.onerror = (event: any) => {
          setVoiceError('Error recognizing speech: ' + event.error);
          setIsListening(false);
        };
        
        recognitionRef.current.onend = () => {
          setIsListening(false);
          // If we have a transcript, simulate adding a transaction after a brief pause
          if (transcript.length > 0) {
             setVoiceSuccess(true);
             setTimeout(() => {
               setVoiceSuccess(false);
               setTranscript('');
             }, 3000);
          }
        };
      }
    }
    
    return () => {
      if (recognitionRef.current) {
         recognitionRef.current.abort();
      }
    };
  }, [token, transcript]);

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

  const exportCSV = () => {
    if (!data || data.length === 0) return;
    const headers = ['Date', 'Title', 'Category', 'Type', 'Amount'];
    const rows = data.map(tx => [
      format(new Date(tx.date), 'yyyy-MM-dd'),
      `"${tx.title}"`,
      tx.category,
      tx.type,
      tx.amount
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
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
        <Button onClick={exportCSV} className="bg-white/5 border border-white/10 hover:bg-white/10 text-white font-medium" variant="outline">
          <Download className="w-4 h-4 mr-2" /> Export CSV
        </Button>
      </div>

      <Card className="glass-card border-none">
        <CardContent className="p-0 sm:p-6">
          <div className="divide-y divide-border/20">
            {data.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No transactions found.</div>
            ) : (
              data.map((tx, idx) => (
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
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{format(new Date(tx.date), 'MMM dd, yyyy')}</span>
                        <span>•</span>
                        <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10">{tx.category}</span>
                      </div>
                    </div>
                  </div>
                  <div className={`font-bold font-mono ${tx.type === 'income' ? 'text-emerald-500' : 'text-foreground'}`}>
                    {tx.type === 'income' ? '+' : '-'}${tx.amount.toFixed(2)}
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
