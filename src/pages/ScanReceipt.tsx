import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Upload, FileText, CheckCircle2, Loader2, Sparkles, Camera, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/src/context/AuthContext';
import { useCurrency } from '@/src/context/CurrencyContext';

export default function ScanReceipt() {
  const { token } = useAuth();
  const { formatAmount } = useCurrency();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Camera integration state
  const [inputMode, setInputMode] = useState<'upload' | 'camera'>('upload');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // Cleanup stream on component unmount
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    setCameraError('');
    setCameraActive(true);
    setPreview(null);
    setFile(null);
    setResult(null);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error("Camera access failed:", err);
      setCameraError("Camera device access denied or busy. Please check browser permissions, or use image upload file mode.");
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            const capturedFile = new File([blob], "neurofin_receipt.jpg", { type: "image/jpeg" });
            setFile(capturedFile);
            setPreview(URL.createObjectURL(capturedFile));
            stopCamera();
            setInputMode('upload');
          }
        }, "image/jpeg");
      }
    }
  };

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
              date: data.date || new Date().toISOString()
            })
         });
         window.dispatchEvent(new Event('transactionAdded'));
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
        <h2 className="text-3xl font-display font-bold text-white">Neural Scanner</h2>
        <p className="text-muted-foreground">Extract real merchant, date, and amount parameters from receipts instantly using AI vision.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <Card className="glass-card border-none">
          <CardHeader className="border-b border-white/5 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="text-white/80">Receipt Intake Profile</CardTitle>
              <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 shrink-0 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => { setInputMode('upload'); stopCamera(); }}
                  className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg transition-all cursor-pointer ${inputMode === 'upload' ? 'bg-[#22d3ee] text-black shadow-md' : 'text-white/60 hover:text-white'}`}
                >
                  Upload File
                </button>
                <button
                  type="button"
                  onClick={() => { setInputMode('camera'); startCamera(); }}
                  className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${inputMode === 'camera' ? 'bg-[#22d3ee] text-black shadow-md' : 'text-white/60 hover:text-white'}`}
                >
                  <Camera className="w-3" /> Live Camera
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            
            {inputMode === 'camera' ? (
              <div className="relative border border-white/10 rounded-xl bg-black min-h-[300px] overflow-hidden flex flex-col items-center justify-center">
                {cameraActive ? (
                  <>
                     <video 
                       ref={videoRef} 
                       autoPlay 
                       playsInline 
                       muted
                       className="w-full h-full min-h-[300px] object-cover rounded-xl"
                     />
                     <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 z-20">
                       <Button 
                         type="button"
                         onClick={capturePhoto} 
                         className="bg-cyan-400 hover:bg-cyan-500 text-black font-bold text-xs rounded-xl shadow-[0_0_20px_rgba(34,211,238,0.5)] cursor-pointer"
                       >
                         Take Snapshot
                       </Button>
                       <Button 
                         type="button"
                         variant="secondary"
                         onClick={() => { stopCamera(); setInputMode('upload'); }} 
                         className="bg-white/10 hover:bg-white/15 text-white text-xs border border-white/10 rounded-xl cursor-pointer"
                       >
                         Cancel
                       </Button>
                     </div>
                  </>
                ) : (
                  <div className="p-6 text-center space-y-4">
                    {cameraError ? (
                      <>
                        <p className="text-red-400 text-xs font-mono bg-red-400/10 border border-red-500/20 p-3 rounded-lg leading-relaxed">{cameraError}</p>
                        <Button 
                          type="button"
                          onClick={() => { setInputMode('upload'); }}
                          className="bg-white/5 hover:bg-white/10 text-white text-xs border border-white/15 rounded-xl cursor-pointer"
                        >
                          Use Standard Upload Instead
                        </Button>
                      </>
                    ) : (
                      <>
                        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
                        <p className="text-xs text-white/40 font-mono tracking-widest uppercase">Initializing camera stream...</p>
                      </>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="relative border-2 border-dashed border-border/55 rounded-xl bg-background/50 p-8 flex flex-col items-center justify-center min-h-[300px] transition-colors hover:border-primary/50 group">
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFile}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                />
                
                {preview ? (
                  <div className="absolute inset-2 rounded-lg overflow-hidden flex flex-col items-center justify-center bg-[#070913]/90 border border-cyan-500/10">
                    <div className="absolute top-2 left-2 z-20 px-2.5 py-0.5 rounded-full bg-cyan-400/20 border border-cyan-400/30 text-cyan-300 font-mono text-[9px] font-bold uppercase tracking-wider animate-pulse flex items-center gap-1">
                      <Camera className="w-2.5 h-2.5" /> Captured Frame Preview
                    </div>
                    <img src={preview} alt="Receipt Preview" className="max-h-[85%] max-w-full object-contain filter brightness-105" />
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/25 flex items-center justify-center mx-auto group-hover:bg-primary/20 transition-colors">
                      <Upload className="w-8 h-8 text-cyan-400" />
                    </div>
                    <div>
                      <p className="font-medium text-lg text-white">Upload Receipt sheet</p>
                      <p className="text-sm text-white/40 mt-1 font-sans">Drag and drop receipts or tap to trigger disk upload</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {preview && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => { 
                  setFile(null); 
                  setPreview(null); 
                  setResult(null); 
                  setInputMode('camera'); 
                  startCamera(); 
                }}
                className="mt-3 text-xs font-mono text-cyan-400 hover:text-white flex items-center gap-1.5 cursor-pointer mx-auto bg-cyan-950/20 border border-cyan-800/20 px-4 py-2 rounded-xl"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Retake Snapshot
              </Button>
            )}

            <Button 
              className="w-full mt-4 bg-gradient-to-tr from-cyan-400 to-purple-500 hover:opacity-90 shadow-[0_0_20px_rgba(34,211,238,0.3)] text-white border-transparent"
              disabled={!file || loading}
              onClick={processReceipt}
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Deep Extracting Ledger Attributes...</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" /> Process via vision AI</>
              )}
            </Button>
          </CardContent>
        </Card>

        {result && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <Card className="glass-card border-none relative overflow-hidden h-full">
              <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white/80 font-display">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 animate-bounce" /> Cybernetic Extraction Complete
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="glass p-4 rounded-xl border border-white/5 flex justify-between items-center transition-all hover:bg-white/5">
                  <span className="text-white/50 text-sm">Merchant/Store</span>
                  <span className="font-bold text-white pr-1">{result.storeName || 'Unknown'}</span>
                </div>
                <div className="glass p-4 rounded-xl border border-white/5 flex justify-between items-center transition-all hover:bg-white/5">
                  <span className="text-white/50 text-sm">Amount Detected</span>
                  <span className="font-black text-xl text-emerald-400 font-mono">{formatAmount(result.totalAmount)}</span>
                </div>
                <div className="glass p-4 rounded-xl border border-white/5 flex justify-between items-center transition-all hover:bg-white/5">
                  <span className="text-white/50 text-sm">Date Parameter</span>
                  <span className="font-mono text-white text-xs">{result.date || new Date().toISOString().split('T')[0]}</span>
                </div>
                <div className="glass p-4 rounded-xl border border-white/5 flex justify-between items-center transition-all hover:bg-white/5">
                  <span className="text-white/50 text-sm">Suggested category</span>
                  <span className="px-3.5 py-1.5 bg-cyan-400/10 text-cyan-400 rounded-xl text-xs font-mono font-bold border border-cyan-400/20">
                    {result.category || 'Shopping'}
                  </span>
                </div>
                
                <div className="bg-emerald-400/5 border border-emerald-400/10 rounded-xl p-3.5 mt-4">
                  <p className="text-xs text-center text-emerald-400 font-mono tracking-wider leading-relaxed">
                    SUCCESS • Transaction automatically synced and stored permanently in your cloud ledger.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
