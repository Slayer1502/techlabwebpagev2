import React, { useState } from 'react';
import { X, IndianRupee, Loader2, CheckCircle2, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { Enquiry } from '../types';
import { formatCurrencyValue, getEnquiryQuoteTotal } from '../utils/helpers';
import { enquiryService } from '../services/enquiryService';
import { toast } from '../utils/toast';

interface Props {
  enquiry: Enquiry;
  onClose: () => void;
  onSuccess: () => void;
}

const MODES = ['Cash', 'UPI', 'Bank'];

const ConfirmOrderModal = ({ enquiry, onClose, onSuccess }: Props) => {
  const [loading, setLoading] = useState(false);
  const [customerAdvance, setCustomerAdvance] = useState(0);
  const [supplierAdvance, setSupplierAdvance] = useState(0);
  const [customerMode, setCustomerMode] = useState('Cash');
  const [supplierMode, setSupplierMode] = useState('Cash');
  const today = new Date().toISOString().slice(0, 10);
  const [customerDate, setCustomerDate] = useState(today);
  const [supplierDate, setSupplierDate] = useState(today);

  const quoteTotal = getEnquiryQuoteTotal(enquiry.quote_options);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await enquiryService.confirmOrder(enquiry.id, {
        customerAdvanceAmount: Number(customerAdvance) || 0,
        customerAdvanceMode: customerAdvance > 0 ? customerMode : 'Cash',
        customerAdvanceDate: customerAdvance > 0 ? customerDate : today,
        supplierAdvanceAmount: Number(supplierAdvance) || 0,
        supplierAdvanceMode: supplierAdvance > 0 ? supplierMode : 'Cash',
        supplierAdvanceDate: supplierAdvance > 0 ? supplierDate : today,
      });
      toast('Order confirmed and PO created', 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      const missing = (err as any)?.response?.data?.missing;
      if (Array.isArray(missing) && missing.length) {
        toast('Cannot confirm: ' + missing.join(' • '), 'error');
      } else {
        toast(err.response?.data?.error || err.message || 'Failed to confirm order', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const renderAdvanceField = (
    title: string,
    subtitle: string,
    direction: 'in' | 'out',
    value: number,
    setValue: (v: number) => void,
    mode: string,
    setMode: (m: string) => void,
    date: string,
    setDate: (d: string) => void,
  ) => (
    <div className="p-4 rounded-2xl border-2 border-gray-100">
      <div className="flex justify-between items-center mb-3">
        <div>
          <label className="text-[10px] font-bold text-text-soft uppercase tracking-widest block">{title}</label>
          <p className="text-[10px] text-text-soft mt-0.5">{subtitle}</p>
        </div>
        <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
          direction === 'in' ? 'text-green-700 bg-green-50 border-green-200' : 'text-red-600 bg-red-50 border-red-200'
        }`}>
          {direction === 'in' ? <ArrowDownLeft className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
          {direction === 'in' ? 'Received' : 'Paid out'}
        </span>
      </div>

      <div className="relative">
        <IndianRupee className="absolute left-3 top-2.5 h-4 w-4 text-text-soft" />
        <input
          type="number"
          min="0"
          step="1"
          className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-bold outline-none focus:border-blue/40"
          value={value}
          onChange={e => setValue(Number(e.target.value) || 0)}
        />
      </div>

      {value > 0 ? (
        <div className="mt-3 flex gap-2 items-center">
          <div className="flex bg-gray-50 p-1 rounded-xl flex-1">
            {MODES.map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${mode === m ? 'bg-white text-blue shadow-sm' : 'text-text-soft'}`}
              >
                {m}
              </button>
            ))}
          </div>
          <input
            type="date"
            className="w-36 px-2 py-1.5 border-2 border-gray-200 rounded-xl text-xs outline-none focus:border-blue/40"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
        </div>
      ) : (
        <p className="mt-3 text-[10px] text-text-soft italic">No advance — payment details not required.</p>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-navy/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="px-6 py-4 bg-gray-50 border-b flex justify-between items-center sticky top-0 bg-white z-10">
          <h3 className="font-bold text-navy uppercase text-xs tracking-widest">Confirm Order</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition-colors"><X className="h-4 w-4" /></button>
        </div>

        <div className="p-6">
          <div className="bg-navy rounded-2xl p-4 text-white mb-5">
            <p className="text-[10px] text-gray-400 uppercase font-bold">{enquiry.customer_name}</p>
            <p className="text-lg font-black mt-1">{formatCurrencyValue(quoteTotal)}</p>
            <p className="text-[10px] text-gray-400 uppercase mt-1">Quote Total</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {renderAdvanceField(
              'Customer Advance',
              'Received from customer',
              'in',
              customerAdvance, setCustomerAdvance,
              customerMode, setCustomerMode,
              customerDate, setCustomerDate,
            )}
            {renderAdvanceField(
              'Supplier Advance',
              'Paid to supplier to lock the order',
              'out',
              supplierAdvance, setSupplierAdvance,
              supplierMode, setSupplierMode,
              supplierDate, setSupplierDate,
            )}

            <div className="pt-2 flex justify-end gap-3 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 text-sm font-bold text-text-soft hover:bg-gray-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={loading}
                className="px-6 py-2.5 bg-green-600 text-white text-sm font-bold rounded-xl hover:bg-green-700 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Confirm Order &amp; Create PO
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ConfirmOrderModal;