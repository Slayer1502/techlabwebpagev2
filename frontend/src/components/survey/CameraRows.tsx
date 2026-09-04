import React from 'react';
import { Plus, Minus, Trash2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface CameraRow {
  formFactor: string;
  technology: string;
  count: number;
  resolution: string;
  mounting: string;
}

interface Props {
  rows: CameraRow[];
  onChange: (rows: CameraRow[]) => void;
  showTechSelect?: boolean;
}

const CameraRows = ({ rows, onChange, showTechSelect = true }: Props) => {
  const updateRow = (index: number, data: Partial<CameraRow>) => {
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], ...data };
    onChange(newRows);
  };

  const addRow = (formFactor: string) => {
    const existing = rows.findIndex(r => r.formFactor === formFactor);
    if (existing >= 0) {
      updateRow(existing, { count: rows[existing].count + 1 });
    } else {
      onChange([...rows, { formFactor, technology: 'IP', count: 1, resolution: '2MP', mounting: '' }]);
    }
  };

  const removeRow = (index: number) => {
    onChange(rows.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 mb-4">
        {['Dome', 'Bullet', 'PTZ', 'FishEye'].map(type => (
          <button
            key={type}
            type="button"
            onClick={() => addRow(type)}
            className="px-4 py-2 bg-soft border border-blue/20 text-blue rounded-xl text-sm font-bold hover:bg-blue/10 transition-colors flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            {type}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {rows.map((row, idx) => (
          <div key={idx} className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[120px]">
              <p className="text-[10px] font-bold text-text-soft uppercase mb-1">Form Factor</p>
              <p className="font-bold text-navy">{row.formFactor}</p>
            </div>

            {showTechSelect && (
              <div className="w-24">
                <p className="text-[10px] font-bold text-text-soft uppercase mb-1">Tech</p>
                <select
                  className="w-full bg-white border-2 border-gray-200 rounded-lg px-2 py-1 text-sm outline-none focus:border-blue/40 transition-all"
                  value={row.technology}
                  onChange={e => updateRow(idx, { technology: e.target.value })}
                >
                  <option value="IP">IP</option>
                  <option value="Analog">Analog</option>
                  <option value="Wireless">Wi-Fi</option>
                </select>
              </div>
            )}

            <div className="w-32">
              <p className="text-[10px] font-bold text-text-soft uppercase mb-1">Resolution</p>
              <input
                placeholder="e.g. 2MP"
                className="w-full bg-white border-2 border-gray-200 rounded-lg px-2 py-1 text-sm outline-none focus:border-blue/40 transition-all"
                value={row.resolution}
                onChange={e => updateRow(idx, { resolution: e.target.value })}
              />
            </div>

            <div className="flex items-center gap-3 bg-white border rounded-xl px-2 py-1">
              <button
                type="button"
                onClick={() => updateRow(idx, { count: Math.max(0, row.count - 1) })}
                className="p-1 hover:bg-gray-100 rounded-lg text-text-soft"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="font-bold text-navy min-w-[20px] text-center">{row.count}</span>
              <button
                type="button"
                onClick={() => updateRow(idx, { count: row.count + 1 })}
                className="p-1 hover:bg-gray-100 rounded-lg text-blue"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => removeRow(idx)}
              className="p-2 text-gray-300 hover:text-red-500 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}

        {rows.length === 0 && (
          <div className="text-center py-8 border-2 border-dashed rounded-2xl text-text-soft">
            No cameras added yet. Click a button above to start.
          </div>
        )}
      </div>
    </div>
  );
};

export default CameraRows;
