import React from 'react';
import { TrendingUp, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { formatCurrencyValue } from '../utils/helpers';

interface MarginItem {
  name: string;
  quantity: number;
  costPrice: number;
  quotedPrice: number;
}

interface Props {
  items: MarginItem[];
  compact?: boolean;
}

const MarginEngineBar: React.FC<Props> = ({ items, compact = false }) => {
  const totalCost = items.reduce((sum, item) => sum + ((Number(item.costPrice) || 0) * (Number(item.quantity) || 1)), 0);
  const totalQuoted = items.reduce((sum, item) => sum + ((Number(item.quotedPrice) || 0) * (Number(item.quantity) || 1)), 0);
  const netProfit = totalQuoted - totalCost;
  const marginPercent = totalCost > 0 ? Math.round((netProfit / totalCost) * 100) : (totalQuoted > 0 ? 100 : 0);

  const hasNegativeMargin = items.some(item => {
    const cost = (Number(item.costPrice) || 0);
    const price = (Number(item.quotedPrice) || 0);
    return price < cost;
  });

  const isHealthy = marginPercent >= 15 && !hasNegativeMargin;
  const isModerate = marginPercent > 0 && marginPercent < 15 && !hasNegativeMargin;
  const isLoss = marginPercent <= 0 || hasNegativeMargin;

  if (compact) {
    return (
      <div className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl border text-xs font-bold ${
        isLoss ? 'bg-red-50 border-red-200 text-red-700' :
        isModerate ? 'bg-amber-50 border-amber-200 text-amber-700' :
        'bg-green-50 border-green-200 text-green-700'
      }`}>
        {isLoss ? <ShieldAlert className="h-4 w-4 shrink-0 text-red-600 animate-pulse" /> :
         isModerate ? <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" /> :
         <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />}
        <div className="flex items-center gap-3">
           <span>Profit: {formatCurrencyValue(netProfit)}</span>
           <span>Margin: {marginPercent}%</span>
           {isLoss && <span className="text-[10px] font-black uppercase bg-red-200 text-red-800 px-1.5 py-0.5 rounded">Loss Warning</span>}
        </div>
      </div>
    );
  }

  return (
    <div className={`p-5 rounded-3xl border-2 shadow-sm space-y-3 ${
      isLoss ? 'bg-red-50/70 border-red-200' :
      isModerate ? 'bg-amber-50/70 border-amber-200' :
      'bg-green-50/70 border-green-200'
    }`}>
       <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
             {isLoss ? <ShieldAlert className="h-5 w-5 text-red-600 animate-pulse" /> :
              isModerate ? <AlertTriangle className="h-5 w-5 text-amber-600" /> :
              <CheckCircle2 className="h-5 w-5 text-green-600" />}
             <h4 className="text-xs font-black uppercase tracking-wider text-navy">Margin Engine Intelligence</h4>
          </div>
          <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${
             isLoss ? 'bg-red-600 text-white' :
             isModerate ? 'bg-amber-600 text-white' :
             'bg-green-600 text-white'
          }`}>
             {isLoss ? 'Negative Margin / Loss' : isModerate ? 'Moderate Margin (<15%)' : 'Healthy Margin (≥15%)'}
          </span>
       </div>

       <div className="grid grid-cols-3 gap-3 pt-2 border-t border-black/5">
          <div>
             <p className="text-[9px] font-bold text-text-soft uppercase">Total Cost</p>
             <p className="text-sm font-black text-navy">{formatCurrencyValue(totalCost)}</p>
          </div>
          <div>
             <p className="text-[9px] font-bold text-text-soft uppercase">Total Quoted</p>
             <p className="text-sm font-black text-blue">{formatCurrencyValue(totalQuoted)}</p>
          </div>
          <div className="text-right">
             <p className="text-[9px] font-bold text-text-soft uppercase">Est. Net Profit</p>
             <p className={`text-sm font-black ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {netProfit >= 0 ? '+' : ''}{formatCurrencyValue(netProfit)} ({marginPercent}%)
             </p>
          </div>
       </div>

       {hasNegativeMargin && (
          <div className="p-2.5 bg-red-100 text-red-800 rounded-xl text-xs font-bold flex items-center gap-2">
             <AlertTriangle className="h-4 w-4 shrink-0 text-red-700" />
             Warning: One or more line items have a quoted price lower than their supplier cost!
          </div>
       )}
    </div>
  );
};

export default MarginEngineBar;
