import React, { useState } from 'react';
import { X, Loader2, Upload, FileText, Building2, Tag } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { purchaseService } from '../services/purchaseService';
import { toast } from '../utils/toast';
import { SupplierQuote, SupplierQuoteItem } from '../types';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

const UploadQuoteModal = ({ onClose, onSuccess }: Props) => {
  const [quoteId, setQuoteId] = useState('');
  const [selectedDetail, setSelectedDetail] = useState<{ quote: SupplierQuote; items: SupplierQuoteItem[] } | null>(null);
  const [perItemCosts, setPerItemCosts] = useState<Record<string, string>>({});
  const [pdf, setPdf] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const { data: quotes, isLoading } = useQuery({
    queryKey: ['quotes-pending'],
    queryFn: () => purchaseService.getQuotes('pending'),
  });

  const pending: SupplierQuote[] = quotes || [];

  const handleSelect = async (id: string) => {
    setQuoteId(id);
    if (!id) {
      setSelectedDetail(null);
      setPerItemCosts({});
      return;
    }
    setDetailLoading(true);
    try {
      const detail = await purchaseService.getQuoteDetail(id);
      setSelectedDetail(detail);
      const map: Record<string, string> = {};
      detail.items.forEach(it => { map[it.id] = String(it.unit_cost || ''); });
      setPerItemCosts(map);
    } catch {
      setSelectedDetail(null);
      setPerItemCosts({});
    } finally {
      setDetailLoading(false);
    }
  };

  const items = selectedDetail?.items || [];

  const handleSubmit = async () => {
    if (!quoteId) return toast('Select the quote to attach the PDF to', 'error');

    const payloadItems = items.map(it => ({
      id: it.id,
      unitCost: perItemCosts[it.id] !== undefined && perItemCosts[it.id] !== '' ? Number(perItemCosts[it.id]) : Number(it.unit_cost),
      name: it.product_name,
    }));

    setSubmitting(true);
    try {
      const formData = new FormData();
      if (pdf) formData.append('pdf', pdf);
      formData.append('items', JSON.stringify(payloadItems));
      formData.append('noPdf', pdf ? 'false' : 'true');
      await purchaseService.attachQuotePdf(quoteId, formData);
      toast(pdf ? 'Supplier quote attached — prices saved' : 'Prices saved', 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to upload quote', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-navy/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h3 className="text-lg font-black text-navy flex items-center gap-2">
              <Upload className="h-5 w-5 text-blue" /> Upload Supplier Quote
            </h3>
            <p className="text-xs text-text-soft font-bold uppercase tracking-tight">Attach PDF & confirmed prices</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-text-soft">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-text-soft uppercase tracking-widest">Pending Quote</label>
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-text-soft font-medium py-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading quotes...
              </div>
            ) : (
              <select
                value={quoteId}
                onChange={e => handleSelect(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl text-sm font-medium outline-none focus:border-blue/20 transition-all bg-white"
              >
                <option value="">Select a pending quote...</option>
                {pending.map(q => (
                  <option key={q.id} value={q.id}>{q.quote_number} — {q.supplier_name}{q.service_request_id ? ' (Service)' : q.for_enquiry_id ? ' (Enquiry)' : ''}</option>
                ))}
              </select>
            )}
            {pending.length === 0 && !isLoading && (
              <p className="text-xs text-text-soft italic">No pending quotes right now. Send one from a service request first.</p>
            )}
          </div>

          {selectedDetail && (
            <>
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-3">
                <Building2 className="h-4 w-4 text-blue shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-navy">{selectedDetail.quote.supplier_name}</p>
                  <p className="text-[10px] text-text-soft uppercase font-bold">
                    {selectedDetail.quote.service_request_id
                      ? `Linked to service request`
                      : selectedDetail.quote.for_enquiry_id ? `Linked to enquiry` : 'Standalone quote'}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-text-soft uppercase tracking-widest">Confirmed Unit Prices</label>
                {detailLoading ? (
                  <div className="flex items-center gap-2 text-sm text-text-soft font-medium py-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading items...
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y">
                    {items.length > 0 ? items.map(it => (
                      <div key={it.id} className="p-4 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-navy truncate">{it.product_name}</p>
                          <p className="text-[10px] text-text-soft">Qty {it.quantity}{it.brand ? ` · ${it.brand}${it.model ? ` ${it.model}` : ''}` : ''}</p>
                        </div>
                        <div className="relative">
                          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-soft" />
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={perItemCosts[it.id] ?? ''}
                            onChange={e => setPerItemCosts(prev => ({ ...prev, [it.id]: e.target.value }))}
                            placeholder="Unit cost"
                            className="w-32 pl-9 pr-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-bold text-navy outline-none focus:border-blue/20 transition-all"
                          />
                        </div>
                      </div>
                    )) : (
                      <p className="p-4 text-xs text-text-soft italic">No line items found on this quote.</p>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-text-soft uppercase tracking-widest">Supplier Quote PDF (optional)</label>
                <label className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:border-blue/30 hover:bg-blue/5 transition-all">
                  <FileText className="h-6 w-6 text-blue" />
                  <p className="text-sm font-bold text-navy">{pdf ? pdf.name : 'Click to select the supplier PDF'}</p>
                  <p className="text-[10px] text-text-soft">{pdf ? `${(pdf.size / 1024).toFixed(1)} KB` : 'PDF only — optional'}</p>
                  <input type="file" accept="application/pdf" className="hidden" onChange={e => setPdf(e.target.files?.[0] || null)} />
                </label>
              </div>
            </>
          )}
        </div>

        <div className="p-6 border-t bg-gray-50">
          <button
            onClick={handleSubmit}
            disabled={submitting || !quoteId || items.length === 0}
            className="w-full py-3.5 bg-navy text-white rounded-2xl font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-xl shadow-navy/20 flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
            Save Prices{pdf ? ' & Upload PDF' : ''}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UploadQuoteModal;