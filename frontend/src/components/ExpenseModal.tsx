import React, { useState, useEffect } from 'react';
import { X, Loader2, Save, IndianRupee, Fuel as FuelIcon, RefreshCw } from 'lucide-react';
import { expenseService, Expense } from '../services/expenseService';
import { fuelPriceService } from '../services/fuelPriceService';
import { serviceRequestService } from '../services/serviceRequestService';
import { toast } from '../utils/toast';

interface Props {
  expense: Expense | null;
  onClose: () => void;
  onSuccess: () => void;
}

const CATEGORIES = ['Fuel', 'Travel', 'Transport', 'Office', 'Rent', 'Utilities', 'Salary', 'Internet', 'Marketing', 'Maintenance', 'Other'];

const ExpenseModal = ({ expense, onClose, onSuccess }: Props) => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    category: expense?.category || CATEGORIES[0],
    description: expense?.description || '',
    amount: expense?.amount || 0,
    paidTo: expense?.paid_to || '',
    paymentMode: expense?.payment_mode || 'Cash',
    expenseDate: expense?.expense_date || new Date().toISOString().slice(0, 10),
  });
  const [fuel, setFuel] = useState({ type: 'Petrol', litres: 0 });
  const [fuelPrices, setFuelPrices] = useState<{ petrol: any; diesel: any } | null>(null);
  const [fuelCity, setFuelCity] = useState('Karur');
  const [loadingFuel, setLoadingFuel] = useState(false);
  const [serviceRequests, setServiceRequests] = useState<any[]>([]);
  const [serviceSearch, setServiceSearch] = useState('');
  const [linkedServiceId, setLinkedServiceId] = useState(expense?.related_service_id || '');

  const fetchServiceRequests = async (search = serviceSearch) => {
    try {
      const rows = await serviceRequestService.getRequestsForLinking(search);
      setServiceRequests(rows);
    } catch {
      setServiceRequests([]);
    }
  };

  useEffect(() => {
    if (form.category === 'Fuel' && !expense) fetchServiceRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.category]);

  useEffect(() => {
    if (expense && expense.category === 'Fuel') {
      const match = form.description?.match(/(\d+(?:\.\d+)?)\s*L/);
      if (match) setFuel({ type: form.description?.includes('Diesel') ? 'Diesel' : 'Petrol', litres: Number(match[1]) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchFuelPrices = async () => {
    setLoadingFuel(true);
    try {
      const data = await fuelPriceService.get(fuelCity);
      setFuelPrices({ petrol: data.petrol, diesel: data.diesel });
      if (data.city) setFuelCity(data.city);
    } catch (err) {
      setFuelPrices(null);
    } finally {
      setLoadingFuel(false);
    }
  };

  useEffect(() => {
    if (form.category === 'Fuel' && !expense) fetchFuelPrices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.category]);

  const activePrice = fuel.type === 'Petrol' ? fuelPrices?.petrol?.pricePerLitre : fuelPrices?.diesel?.pricePerLitre;

  useEffect(() => {
    if (form.category === 'Fuel' && !expense && activePrice && fuel.litres > 0) {
      setForm(f => ({ ...f, amount: Number((fuel.litres * activePrice).toFixed(2)) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fuel.litres, fuel.type, activePrice]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let amount = Number(form.amount);
      if (form.category === 'Fuel' && !(amount > 0)) {
        toast(activePrice ? 'Enter litres to calculate the fuel amount, or type the amount directly.' : 'Could not fetch fuel rate. Enter the amount manually.', 'error');
        setLoading(false);
        return;
      }
      const payload = {
        category: form.category,
        description: form.description || (form.category === 'Fuel' ? `${fuel.litres}L ${fuel.type}` : ''),
        amount,
        paidTo: form.paidTo,
        paymentMode: form.paymentMode,
        expenseDate: form.expenseDate,
        relatedServiceId: linkedServiceId || null,
      };
      if (expense) {
        await expenseService.update(expense.id, payload);
        toast('Expense updated', 'success');
      } else {
        await expenseService.create(payload);
        toast('Expense recorded', 'success');
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to save expense', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-navy/20 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="px-6 py-4 bg-gray-50 border-b flex justify-between items-center sticky top-0 bg-white z-10">
          <h3 className="font-bold text-navy uppercase text-xs tracking-widest">{expense ? 'Edit Expense' : 'Record Expense'}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition-colors"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Category</label>
              <select
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-blue/40 appearance-none"
                value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Amount</label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-2.5 h-4 w-4 text-text-soft" />
                <input
                  type="number"
                  required
                  min="1"
                  className="w-full pl-10 pr-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-blue/40 font-bold"
                  value={form.amount}
                  onChange={e => setForm({ ...form, amount: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>

          {form.category === 'Fuel' && (
            <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FuelIcon className="h-5 w-5 text-orange-600" />
                  <span className="text-xs font-bold text-navy uppercase tracking-wide">Auto Fuel Price</span>
                </div>
                <button
                  type="button"
                  onClick={fetchFuelPrices}
                  className="flex items-center gap-1 text-[10px] font-bold text-blue hover:text-blue-600"
                >
                  <RefreshCw className={`h-3 w-3 ${loadingFuel ? 'animate-spin' : ''}`} />
                  {loadingFuel ? 'Loading...' : 'Refresh'}
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Fuel Type</label>
                  <select
                    className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-blue/40 appearance-none bg-white"
                    value={fuel.type}
                    onChange={e => setFuel({ ...fuel, type: e.target.value })}
                  >
                    <option value="Petrol">Petrol</option>
                    <option value="Diesel">Diesel</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Litres</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-blue/40 bg-white"
                    value={fuel.litres}
                    onChange={e => setFuel({ ...fuel, litres: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Rate / Ltr</label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-2.5 h-4 w-4 text-text-soft" />
                    <input
                      disabled
                      className="w-full pl-10 pr-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm outline-none bg-white font-bold"
                      value={activePrice ? activePrice.toFixed(2) : '-'}
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between bg-white rounded-xl px-3 py-2 border border-gray-100">
                <span className="text-[10px] font-bold text-text-soft uppercase">Est. Total ({fuel.type} × {fuel.litres}L) in {fuelCity || 'Karur'}</span>
                <span className="text-lg font-black text-orange-600">{activePrice && fuel.litres > 0 ? `₹${(fuel.litres * activePrice).toFixed(2)}` : (activePrice ? '₹0.00' : 'Unavailable')}</span>
              </div>
              <div className="space-y-1 border-t border-orange-200 pt-3">
                <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Link Service Request (Optional - for billing)</label>
                <div className="flex items-center gap-2">
                  <input
                    className="w-full px-3 py-2.5 border-2 border-gray-200 bg-white rounded-xl text-sm outline-none focus:border-orange-400/50"
                    placeholder="Search customer / request ID..."
                    value={serviceSearch}
                    onChange={e => { setServiceSearch(e.target.value); fetchServiceRequests(e.target.value); }}
                  />
                </div>
                <select
                  className="w-full px-3 py-2.5 border-2 border-gray-200 bg-white rounded-xl text-sm outline-none focus:border-orange-400/50 appearance-none"
                  value={linkedServiceId}
                  onChange={e => setLinkedServiceId(e.target.value)}
                >
                  <option value="">— No service request —</option>
                  {serviceRequests.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.customer_name} | {r.device_type} | {r.status}{r.bill_status && r.bill_status !== 'none' ? ` | ${r.bill_status}` : ''} | #{String(r.id).slice(-6)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Description</label>
            <textarea
              rows={3}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-blue/40"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="What was this expense for?"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Paid To</label>
              <input
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-blue/40"
                value={form.paidTo}
                onChange={e => setForm({ ...form, paidTo: e.target.value })}
                placeholder="Vendor / person"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Payment Mode</label>
              <select
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-blue/40 appearance-none"
                value={form.paymentMode}
                onChange={e => setForm({ ...form, paymentMode: e.target.value })}
              >
                {['Cash', 'UPI', 'Bank', 'Card'].map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Expense Date</label>
            <input
              type="date"
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-blue/40"
              value={form.expenseDate}
              onChange={e => setForm({ ...form, expenseDate: e.target.value })}
            />
          </div>

          <button
            disabled={loading}
            className="w-full py-3 bg-blue text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-blue-600 transition-all shadow-lg shadow-blue/20 flex justify-center items-center gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {expense ? 'Save Changes' : 'Record Expense'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ExpenseModal;
