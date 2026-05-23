import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ArrowUpRight, ArrowDownRight, Wallet, Download } from 'lucide-react';
import { useAuth } from '@/src/context/AuthContext';
import { motion } from 'motion/react';

export default function Transactions() {
  const [data, setData] = useState<any[]>([]);
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/transactions', {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(r => r.json()).then(res => {
      setData(res.transactions || []);
      setLoading(false);
    });
  }, [token]);

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
     <div className="space-y-6">
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
     </div>
  );
}
