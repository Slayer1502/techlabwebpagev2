import React, { useEffect, useMemo, useState } from 'react';
import { X, Search, User, Factory, Loader2, ChevronRight } from 'lucide-react';
import { reportService } from '../services/reportService';

interface Party {
  id: string;
  name: string;
  mobile: string | null;
  is_customer: number;
  is_supplier: number;
}

const PartySelectModal = ({ onSelect, onClose }: { onSelect: (party: Party) => void; onClose: () => void }) => {
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    reportService.getParties()
      .then((p: Party[]) => setParties(p))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q ? parties.filter(p => p.name.toLowerCase().includes(q) || (p.mobile || '').includes(q)) : parties;
    return list.slice(0, 40);
  }, [parties, search]);

  const typeLabel = (p: Party) =>
    p.is_customer === 1 && p.is_supplier === 1 ? 'Customer & Supplier'
      : p.is_supplier === 1 ? 'Supplier' : 'Customer';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-[2rem] w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-8 py-5 border-b flex items-start justify-between gap-4 bg-navy text-white">
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-300">Party Ledger Report</span>
            <h2 className="text-xl font-black tracking-tight mt-1">Select Customer / Supplier</h2>
            <p className="text-xs text-gray-300 font-medium mt-0.5">Statement of account will be generated for this party</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 transition-colors shrink-0">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-5 w-5 text-text-soft" />
            <input
              type="text"
              autoFocus
              placeholder="Search by name or mobile..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-blue/40 transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-text-soft">
              <Loader2 className="h-8 w-8 animate-spin mb-3 text-blue" />
              <p className="text-sm font-bold">Loading parties...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-text-soft">
              <p className="text-sm font-bold">No parties match "{search}"</p>
            </div>
          ) : (
            filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => onSelect(p)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-2xl hover:bg-soft/50 transition-colors text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2.5 bg-soft rounded-xl text-blue shrink-0">
                    {p.is_supplier === 1 ? <Factory className="h-4 w-4" /> : <User className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-navy truncate">{p.name}</p>
                    <p className="text-[10px] font-semibold text-text-soft">{typeLabel(p)}{p.mobile ? ` • ${p.mobile}` : ''}</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-text-soft shrink-0" />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default PartySelectModal;