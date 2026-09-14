import React, { useEffect } from 'react';
import {
  X,
  Loader2,
  FileText,
  Download,
  AlertCircle,
  Inbox
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface PreviewCtx {
  scope: string;
  start: string;
  end: string;
}

interface Props {
  report: PreviewCtx;
  data: any;
  loading: boolean;
  error: string | null;
  onGenerate: () => void;
  onGenerateExcel: () => void;
  onClose: () => void;
}

const ReportPreviewModal = ({ report, data, loading, error, onGenerate, onGenerateExcel, onClose }: Props) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const rangeLabel = report.start && report.end
    ? `${report.start}  to  ${report.end}`
    : 'All records';

  const renderTable = (headers: any[], rows: any[]) => (
    <div className="overflow-x-auto rounded-2xl border border-gray-100">
      <table className="w-full text-left">
        <thead className="bg-gray-50/70">
          <tr className="text-[10px] font-bold text-text-soft uppercase tracking-wider">
            {headers.map((h: any) => (
              <th key={h.key} className="px-4 py-3 whitespace-nowrap">{h.label}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row: any, i: number) => (
            <tr key={i} className="hover:bg-soft/30 transition-colors">
              {headers.map((h: any) => (
                <td key={h.key} className="px-4 py-3 text-sm font-medium text-navy whitespace-nowrap">
                  {row[h.key] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={headers.length} className="px-4 py-10 text-center">
                <Inbox className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                <p className="text-sm italic text-text-soft">No records in the selected period</p>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[2rem] w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-8 py-5 border-b flex items-start justify-between gap-4 bg-navy text-white">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-4 w-4 text-blue-300" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-300">
                Report Preview
              </span>
            </div>
            <h2 className="text-xl font-black tracking-tight truncate">{data?.meta?.title || 'Report'}</h2>
            <p className="text-xs text-gray-300 font-medium mt-0.5">
              {rangeLabel} • Scope: {report.scope.replace(/_/g, ' ')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/10 transition-colors shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-text-soft">
              <Loader2 className="h-8 w-8 animate-spin mb-3 text-blue" />
              <p className="text-sm font-bold">Loading report data...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 text-red-500">
              <AlertCircle className="h-8 w-8 mb-3" />
              <p className="text-sm font-bold">{error}</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Summary Cards */}
              {data?.summaryItems?.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {data.summaryItems.map((s: any, i: number) => (
                    <div
                      key={i}
                      className={cn(
                        "p-4 rounded-2xl border flex flex-col gap-1",
                        i % 2 === 0 ? "bg-navy/5 border-navy/10" : "bg-blue/5 border-blue/10"
                      )}
                    >
                      <span className="text-[10px] font-bold text-text-soft uppercase tracking-wider">{s.label}</span>
                      <span className="text-lg font-black text-navy">{String(s.value)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Sections (multi-part reports like P&L) */}
              {data?.sections?.length > 0 ? (
                <div className="space-y-8">
                  {data.sections.map((sec: any, i: number) => (
                    <div key={i} className="space-y-3">
                      <h3 className="text-sm font-black text-navy uppercase tracking-wider flex items-center gap-2">
                        <span className="w-1.5 h-5 bg-blue rounded-full"></span>
                        {sec.title}
                      </h3>
                      {renderTable(sec.headers, sec.rows)}
                    </div>
                  ))}
                </div>
              ) : data?.tableHeaders && (
                <div className="space-y-3">
                  <h3 className="text-sm font-black text-navy uppercase tracking-wider flex items-center gap-2">
                    <span className="w-1.5 h-5 bg-blue rounded-full"></span>
                    Detailed Breakdown
                  </h3>
                  {renderTable(data.tableHeaders, data.tableRows)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-4 border-t bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onGenerateExcel}
            disabled={loading || !!error}
            className="px-6 py-3 bg-emerald-600 text-white rounded-2xl text-sm font-bold hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/30 disabled:opacity-50 disabled:shadow-none"
          >
            <Download className="h-4 w-4" /> Generate Excel
          </button>
          <button
            onClick={onGenerate}
            disabled={loading || !!error}
            className="px-6 py-3 bg-blue text-white rounded-2xl text-sm font-bold hover:bg-blue-600 transition-all flex items-center gap-2 shadow-lg shadow-blue/30 disabled:opacity-50 disabled:shadow-none"
          >
            <Download className="h-4 w-4" /> Generate PDF
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportPreviewModal;