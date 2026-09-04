import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

export interface CableRow {
  type: string;
  boxes: number;
  meters: number;
}

interface Props {
  rows: CableRow[];
  onChange: (rows: CableRow[]) => void;
}

const CABLE_TYPES = ['Cat6', 'Cat6a', 'Power Cable', 'HDMI', 'RG59', 'Optical Fiber'];

const CableRows = ({ rows, onChange }: Props) => {
  const updateRow = (index: number, data: Partial<CableRow>) => {
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], ...data };
    onChange(newRows);
  };

  const addRow = () => {
    onChange([...rows, { type: 'Cat6', boxes: 1, meters: 0 }]);
  };

  const removeRow = (index: number) => {
    onChange(rows.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      {rows.map((row, idx) => (
        <div key={idx} className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex flex-wrap items-center gap-4 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex-1 min-w-[150px]">
            <p className="text-[10px] font-bold text-text-soft uppercase mb-1">Cable Type</p>
            <select
              className="w-full bg-white border-2 border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue/40 transition-all"
              value={row.type}
              onChange={e => updateRow(idx, { type: e.target.value })}
            >
              {CABLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {(row.type === 'Cat6' || row.type === 'Cat6a') ? (
            <div className="w-24">
              <p className="text-[10px] font-bold text-text-soft uppercase mb-1">Boxes</p>
              <input
                type="number"
                min="0"
                className="w-full bg-white border-2 border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue/40 transition-all"
                value={row.boxes}
                onChange={e => updateRow(idx, { boxes: Number(e.target.value) })}
              />
            </div>
          ) : (
            <div className="w-24">
              <p className="text-[10px] font-bold text-text-soft uppercase mb-1">Est. Meters</p>
              <input
                type="number"
                min="0"
                className="w-full bg-white border-2 border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue/40 transition-all"
                value={row.meters}
                onChange={e => updateRow(idx, { meters: Number(e.target.value) })}
              />
            </div>
          )}

          <button
            type="button"
            onClick={() => removeRow(idx)}
            className="mt-4 p-2 text-gray-300 hover:text-red-500 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addRow}
        className="w-full py-3 border-2 border-dashed border-gray-200 rounded-2xl text-blue font-bold text-sm hover:bg-soft transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="h-4 w-4" />
        Add Cable Run
      </button>
    </div>
  );
};

export default CableRows;
