import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Upload, FileText, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/src/context/AuthContext';

export default function ScanReceipt() {
  const { token } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setPreview(URL.createObjectURL(f));
      setResult(null);
    }
  };

  const processReceipt = async () => {
    if (!file) return;
    setLoading(true);
    
    const formData = new FormData();
    formData.append('receipt', file);

    try {
      const res = await fetch('/api/receipt', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      setResult(data);
      
      // Auto-save the extracted transaction
      if (data.totalAmount && data.storeName) {
         await fetch('/api/transactions', {
            method: 'POST',
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              amount: data.totalAmount,
              type: 'expense',
              title: data.storeName,
              category: data.category || 'Shopping',
              date: data.date
            })
         });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-display font-bold">Neural Scanner</h2>
        <p className="text-muted-foreground">Extract transaction data using Vision AI.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <Card className="glass-card border-none">
          <CardHeader>
            <CardTitle>Image Input</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative border-2 border-dashed border-border/50 rounded-xl bg-background/50 p-8 flex flex-col items-center justify-center min-h-[300px] transition-colors hover:border-primary/50 group">
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleFile}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
              />
              
              {preview ? (
                <div className="absolute inset-2 rounded-lg overflow-hidden flex items-center justify-center bg-black/50">
                  <img src={preview} alt="Receipt Preview" className="max-h-full max-w-full object-contain" />
                </div>
              ) : (
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto group-hover:bg-primary/20 transition-colors">
                    <Upload className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-lg">Upload Receipt</p>
                    <p className="text-sm text-muted-foreground mt-1">Drag and drop or click</p>
                  </div>
                </div>
              )}
            </div>

            <Button 
              className="w-full mt-4 bg-gradient-to-tr from-cyan-400 to-purple-500 hover:opacity-90 shadow-[0_0_20px_rgba(34,211,238,0.3)] text-white border-transparent"
              disabled={!file || loading}
              onClick={processReceipt}
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" /> Process via AI</>
              )}
            </Button>
          </CardContent>
        </Card>

        {result && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <Card className="glass-card border-none relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" /> Extraction Complete
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="glass p-4 rounded-xl border border-white/5 flex justify-between items-center">
                  <span className="text-muted-foreground text-sm">Merchant</span>
                  <span className="font-medium">{result.storeName || 'Unknown'}</span>
                </div>
                <div className="glass p-4 rounded-xl border border-white/5 flex justify-between items-center">
                  <span className="text-muted-foreground text-sm">Amount Detected</span>
                  <span className="font-bold text-xl text-emerald-400">${result.totalAmount}</span>
                </div>
                <div className="glass p-4 rounded-xl border border-white/5 flex justify-between items-center">
                  <span className="text-muted-foreground text-sm">Suggested Category</span>
                  <span className="px-3 py-1 bg-primary/20 text-primary rounded-full text-xs font-medium border border-primary/30">
                    {result.category || 'General'}
                  </span>
                </div>
                <div className="glass p-4 rounded-xl border border-white/5 flex justify-between items-center">
                  <span className="text-muted-foreground text-sm">Date</span>
                  <span className="font-medium">{result.date || 'Pending'}</span>
                </div>
                
                <p className="text-xs text-center text-muted-foreground mt-4">
                  Transaction automatically synced to your ledger.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
