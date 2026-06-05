import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HeartPulse } from 'lucide-react';

export const FinancialHealthScore = ({ savingsRate, debtToIncome }: { savingsRate: number, debtToIncome: number }) => {
  // Simple heuristic score
  const score = Math.max(0, Math.min(100, 
    (savingsRate * 2) + (100 - debtToIncome * 50)
  ));
  
  return (
    <Card className="glass-card border-none bg-emerald-950/20">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
            <HeartPulse className="text-emerald-400" />
            Financial Health Score
        </CardTitle>
      </CardHeader>
      <CardContent className="text-center pt-2">
        <div className="text-4xl font-black text-white mb-2">{Math.round(score)}</div>
        <p className="text-sm text-emerald-400">
            {score > 80 ? 'Excellent' : score > 50 ? 'Good' : 'Needs Attention'}
        </p>
        <p className="text-xs text-white/50 mt-4">
            {score < 50 ? 'Try increasing savings rate.' : 'Keep up the good habits!'}
        </p>
      </CardContent>
    </Card>
  );
};
