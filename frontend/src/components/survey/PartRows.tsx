import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

export interface PartRow {
  name: string;
  qty: number;
  notes: string;
}

interface Props {
  rows: PartRow[];
  onChange: (rows: PartRow[]) => void;
}

const PartRows = ({ rows, onChange }: Props) => {
  const updateRow = (index: number, data: Partial<PartRow>) => {
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], ...data };
    onChange(newRows);
  };

  const addRow = () => {
    onChange([...rows, { name: '', qty: 1, notes: '' }]);
  };

  const removeRow = (index: number) => {
    onChange(rows.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      {rows.map((row, idx) => (
        <div key={idx} className="bg-gray-50 p-4 rounded-2xl border border-gray-100 grid grid-cols-1 md:grid-cols-12 gap-4 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="md:col-span-5">
            <p className="text-[10px] font-bold text-text-soft uppercase mb-1">Part Name</p>
            <input
              required
              placeholder="e.g. Hard Disk 2TB"
              className="w-full bg-white border-2 border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue/40 transition-all"
              value={row.name}
              onChange={e => updateRow(idx, { name: e.target.value })}
            />
          </div>

          <div className="md:col-span-2">
            <p className="text-[10px] font-bold text-text-soft uppercase mb-1">Qty</p>
            <input
              type="number"
              min="1"
              className="w-full bg-white border-2 border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue/40 transition-all"
              value={row.qty}
              onChange={e => updateRow(idx, { qty: Number(e.target.value) })}
            />
          </div>

          <div className="md:col-span-4">
            <p className="text-[10px] font-bold text-text-soft uppercase mb-1">Notes</p>
            <input
              placeholder="Specific brand/model..."
              className="w-full bg-white border-2 border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue/40 transition-all"
              value={row.notes}
              onChange={e => updateRow(idx, { notes: e.target.value })}
            />
          </div>

          <div className="md:col-span-1 flex items-end justify-end">
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
        Add Additional Part
      </button>
    </div>
  );
};

export default PartRows;
