import { useMemo } from 'react';
import { format, eachDayOfInterval, startOfMonth, endOfMonth, isSameDay } from 'date-fns';
import { useCurrency } from '@/src/context/CurrencyContext';

interface HeatmapProps {
  transactions: any[];
}

export const CalendarHeatmap = ({ transactions }: HeatmapProps) => {
  const { formatAmount } = useCurrency();
  const days = useMemo(() => {
    const now = new Date();
    return eachDayOfInterval({
      start: startOfMonth(now),
      end: endOfMonth(now),
    });
  }, []);

  return (
    <div className="grid grid-cols-7 gap-1">
      {days.map((day) => {
        const dayTxs = transactions.filter(t => t.date && isSameDay(new Date(t.date), day));
        const total = dayTxs.reduce((acc, t) => acc + t.amount, 0);
        const intensity = Math.min(total / 500, 1); // Simplistic heatmap intensity

        return (
          <div 
            key={day.toISOString()}
            className="aspect-square rounded-sm flex items-center justify-center text-[10px] relative group"
            style={{ 
              backgroundColor: total > 0 ? `rgba(16, 185, 129, ${0.1 + intensity * 0.9})` : 'rgba(255,255,255,0.05)'
            }}
          >
            {format(day, 'd')}
            <div className="absolute bottom-full mb-2 w-max bg-black text-white text-[10px] p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              {format(day, 'MMM d')}: {formatAmount(total)}
            </div>
          </div>
        );
      })}
    </div>
  );
};
