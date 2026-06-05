import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export const DebtPaydownCalculator = () => {
  const [balance, setBalance] = useState(5000);
  const [rate, setRate] = useState(15);
  const [extraPayment, setExtraPayment] = useState(200);

  const calculateMonths = () => {
    let b = balance;
    let months = 0;
    const monthlyRate = rate / 100 / 12;
    const minPayment = b * (monthlyRate + 0.02); // rough estimate
    const payment = minPayment + extraPayment;
    
    while (b > 0 && months < 360) {
      b = b * (1 + monthlyRate) - payment;
      months++;
    }
    return months;
  };

  return (
    <Card className="glass-card border-none bg-indigo-950/20">
      <CardHeader>
        <CardTitle className="text-white">Debt Paydown Calculator</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
            <Label className="text-white/70">Remaining Balance ($)</Label>
            <Input type="number" value={balance} onChange={e => setBalance(Number(e.target.value))} className="bg-white/5 border-white/10 text-white" />
        </div>
        <div className="space-y-2">
            <Label className="text-white/70">Interest Rate (%)</Label>
            <Input type="number" value={rate} onChange={e => setRate(Number(e.target.value))} className="bg-white/5 border-white/10 text-white" />
        </div>
        <div className="space-y-2">
            <Label className="text-white/70">Extra Monthly Pay ($)</Label>
            <Input type="number" value={extraPayment} onChange={e => setExtraPayment(Number(e.target.value))} className="bg-white/5 border-white/10 text-white" />
        </div>
        <div className="pt-4 text-center">
            <p className="text-3xl font-bold text-cyan-400">{calculateMonths()} Months</p>
            <p className="text-sm text-white/50">to debt freedom</p>
        </div>
      </CardContent>
    </Card>
  );
};
