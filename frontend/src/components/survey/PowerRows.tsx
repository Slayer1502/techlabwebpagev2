import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

export interface PowerRow {
  location: string;
  type: string;
  ports: number;
  brand: string;
  qty: number;
}

interface Props {
  rows: PowerRow[];
  onChange: (rows: PowerRow[]) => void;
}

const POWER_TYPES = ['PoE Switch', 'SMPS', 'Individual Adaptors'];
const PORT_OPTIONS = [4, 8, 16, 24, 48];

const PowerRows = ({ rows, onChange }: Props) => {
  const updateRow = (index: number, data: Partial<PowerRow>) => {
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], ...data };
    onChange(newRows);
  };

  const addRow = () => {
    onChange([...rows, { location: '', type: 'PoE Switch', ports: 8, brand: '', qty: 1 }]);
  };

  const removeRow = (index: number) => {
    onChange(rows.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      {rows.map((row, idx) => (
        <div key={idx} className="bg-gray-50 p-4 rounded-2xl border border-gray-100 grid grid-cols-1 md:grid-cols-12 gap-4 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="md:col-span-4">
            <p className="text-[10px] font-bold text-text-soft uppercase mb-1">Floor / Area</p>
            <input
              placeholder="e.g. Ground, 1st floor, Underground"
              className="w-full bg-white border-2 border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue/40 transition-all"
              value={row.location}
              onChange={e => updateRow(idx, { location: e.target.value })}
            />
          </div>

          <div className="md:col-span-3">
            <p className="text-[10px] font-bold text-text-soft uppercase mb-1">Type</p>
            <select
              className="w-full bg-white border-2 border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue/40 transition-all"
              value={row.type}
              onChange={e => updateRow(idx, { type: e.target.value })}
            >
              {POWER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="md:col-span-2">
            <p className="text-[10px] font-bold text-text-soft uppercase mb-1">Ports</p>
            <select
              className="w-full bg-white border-2 border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue/40 transition-all"
              value={row.ports}
              onChange={e => updateRow(idx, { ports: Number(e.target.value) })}
            >
              {PORT_OPTIONS.map(p => <option key={p} value={p}>{p} Port</option>)}
            </select>
          </div>

          <div className="md:col-span-1">
            <p className="text-[10px] font-bold text-text-soft uppercase mb-1">Qty</p>
            <input
              type="number"
              min="1"
              className="w-full bg-white border-2 border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue/40 transition-all"
              value={row.qty}
              onChange={e => updateRow(idx, { qty: Number(e.target.value) })}
            />
          </div>

          <div className="md:col-span-2">
            <p className="text-[10px] font-bold text-text-soft uppercase mb-1">Brand</p>
            <input
              placeholder="e.g. TP-Link"
              className="w-full bg-white border-2 border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue/40 transition-all"
              value={row.brand}
              onChange={e => updateRow(idx, { brand: e.target.value })}
            />
          </div>

          <div className="md:col-span-0 flex items-end justify-end py-1">
            <button
              type="button"
              onClick={() => removeRow(idx)}
              className="p-2 text-gray-300 hover:text-red-500 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addRow}
        className="w-full py-3 border-2 border-dashed border-gray-200 rounded-2xl text-blue font-bold text-sm hover:bg-soft transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="h-4 w-4" />
        Add Power Unit
      </button>
    </div>
  );
};

export default PowerRows;