import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../components/Layout';
import { quotationService } from '../services/quotationService';
import { settingsService } from '../services/settingsService';
import {
  FileText,
  Plus,
  Search,
  Download,
  Trash2,
  CheckCircle2,
  MessageSquare,
  ChevronRight,
  Printer,
  Pencil
} from 'lucide-react';
import { formatCurrencyValue, formatDateValue } from '../utils/helpers';
import { Quotation } from '../types';
import { toast } from '../utils/toast';
import QuotationBuilder from '../components/QuotationBuilder';

const QuotationPage = () => {
  const [view, setView] = useState<'list' | 'form'>('list');
  const [search, setSearch] = useState('');
  const [editingQuote, setEditingQuote] = useState<Quotation | null>(null);
  const [viewingQuote, setViewingQuote] = useState<Quotation | null>(null);
  const queryClient = useQueryClient();

  const { data: quotations, isLoading } = useQuery({
    queryKey: ['quotations'],
    queryFn: () => quotationService.getQuotations(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => quotationService.deleteQuotation(id),
    onSuccess: () => {
      toast('Quotation deleted', 'success');
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
    },
  });

  const convertMutation = useMutation({
    mutationFn: (id: string) => quotationService.convertToSale(id),
    onSuccess: () => {
      toast('Quotation converted to Sale!', 'success');
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
    },
  });

  const shareWhatsApp = (q: Quotation) => {
    const mobile = q.customer_mobile.replace(/[^0-9]/g, "");
    if (!mobile) return toast("No customer mobile number", "error");

    const lines = (q.items || [])
      .map(l => `• ${l.product_name} x ${l.quantity} — ${formatCurrencyValue(l.unit_price * l.quantity)}`)
      .join("\n");

    const msg = [
      `Dear ${q.customer_name || "Customer"},`,
      ``,
      `Thank you for choosing TECHLAB. Here is your quotation:`,
      ``,
      `Quotation No: ${q.quote_number}`,
      `Date: ${formatDateValue(q.quote_date)}`,
      q.valid_until ? `Valid until: ${formatDateValue(q.valid_until)}` : "",
      ``,
      lines,
      ``,
      `Total: ${formatCurrencyValue(q.total_amount)}`,
      ``,
      `Please let us know if you have any questions.`,
    ].filter(Boolean).join("\n");

    window.open(`https://wa.me/91${mobile}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const printQuotation = async (q: Quotation) => {
    let biz = { business_name: "TECHLAB", business_address: "", business_phone: "", business_email: "" };
    try {
      const data = await settingsService.getBusiness();
      biz = { ...biz, ...(data.settings || {}) };
    } catch (e) { /* use defaults */ }

    const lineRows = (q.items || [])
      .map(l => `<tr><td>${l.product_name}</td><td>${l.quantity}</td><td>${formatCurrencyValue(l.unit_price)}</td><td>${formatCurrencyValue(l.unit_price * l.quantity)}</td></tr>`)
      .join('');

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Quotation | TECHLAB</title>
<style>
  body{font-family:"Segoe UI",Arial,sans-serif;color:#17253d;max-width:720px;margin:24px auto;padding:0 16px;}
  h1{font-size:22px;margin:0 0 2px;}
  .biz{color:#63748d;font-size:13px;line-height:1.6;}
  .doc-type{font-size:13px;text-transform:uppercase;letter-spacing:1px;color:#1663ff;font-weight:700;margin:18px 0 4px;}
  .meta{display:flex;justify-content:space-between;gap:20px;margin-top:10px;color:#63748d;font-size:12px;flex-wrap:wrap;}
  table{width:100%;border-collapse:collapse;margin-top:14px;font-size:14px;}
  th,td{padding:8px 10px;border-bottom:1px solid #d7e3f2;text-align:left;}
  th{color:#63748d;font-size:11px;text-transform:uppercase;}
  .total-row td{font-weight:800;font-size:16px;border-top:2px solid #1663ff;}
  .foot{color:#63748d;font-size:12px;margin-top:24px;}
  @media print{body{margin:0}}
</style>
</head>
<body>
  <h1>${biz.business_name || "TECHLAB"}</h1>
  <div class="biz">${biz.business_address || ""}${biz.business_phone ? "<br>Phone: " + biz.business_phone : ""}${biz.business_email ? "<br>Email: " + biz.business_email : ""}</div>
  <div class="doc-type">Quotation</div>
  <div class="meta"><span>Quotation No: ${q.quote_number}</span><span>Date: ${formatDateValue(q.quote_date)}</span><span>Valid until: ${q.valid_until ? formatDateValue(q.valid_until) : "-"}</span></div>
  <div style="margin-top:12px;"><strong>Customer:</strong> ${q.customer_name || "-"}${q.customer_mobile ? " (" + q.customer_mobile + ")" : ""}${q.customer_address ? "<br>" + q.customer_address : ""}</div>
  <table>
    <thead><tr><th>Item</th><th>Qty</th><th>Unit Price</th><th>Amount</th></tr></thead>
    <tbody>${lineRows}</tbody>
    <tr class="total-row"><td colspan="3">Total</td><td>${formatCurrencyValue(q.total_amount)}</td></tr>
  </table>
  <p class="foot">This quotation is valid until the date shown above. Prices include applicable taxes unless stated otherwise.</p>
  <script>window.onload = function(){ window.print(); };<\/script>
</body>
</html>`;

    const win = window.open("", "_blank", "width=760,height=900");
    if (!win) return toast("Pop-up blocked. Please allow pop-ups for printing.", "error");
    win.document.write(html);
    win.document.close();
  };

  const filtered = quotations?.filter(q =>
    q.customer_name.toLowerCase().includes(search.toLowerCase()) ||
    q.customer_mobile.includes(search) ||
    q.quote_number.includes(search)
  );

  return (
    <Layout>
      <div className="space-y-6 pb-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-navy tracking-tight text-center md:text-left">Sales Quotations</h1>
            <p className="text-text-soft text-sm font-medium text-center md:text-left">Propose pricing and products to potential customers</p>
          </div>
          <button
            onClick={() => setView('form')}
            className="flex items-center justify-center gap-2 bg-blue text-white px-6 py-2.5 rounded-xl font-bold hover:bg-blue-600 transition-all shadow-lg shadow-blue/20"
          >
            <Plus className="h-5 w-5" />
            Create Quotation
          </button>
        </div>

        {viewingQuote ? (
           <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm animate-in zoom-in-95 duration-300">
              <div className="flex justify-between items-center mb-6 pb-4 border-b">
                 <div>
                    <h2 className="text-xl font-bold text-navy">Quotation Detail</h2>
                    <p className="text-text-soft text-sm">{viewingQuote.quote_number}</p>
                 </div>
                 <div className="flex items-center gap-2">
                    {viewingQuote.status !== 'converted' && (
                       <button
                         onClick={() => { setViewingQuote(null); setEditingQuote(viewingQuote); setView('form'); }}
                         className="flex items-center gap-2 bg-blue text-white px-4 py-2 rounded-xl font-bold hover:bg-blue-600 transition-all"
                       >
                          <Pencil className="h-4 w-4" /> Edit
                       </button>
                    )}
                    <button onClick={() => printQuotation(viewingQuote)} className="flex items-center gap-2 bg-blue/5 text-blue px-4 py-2 rounded-xl font-bold hover:bg-blue/10 transition-all">
                       <Printer className="h-4 w-4" /> Print
                    </button>
                    <button onClick={() => setViewingQuote(null)} className="text-sm font-bold text-text-soft hover:text-navy transition-colors px-2">Back</button>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                 <div className="p-4 rounded-2xl bg-soft/40">
                    <p className="text-[10px] font-bold text-text-soft uppercase mb-1">Date</p>
                    <p className="text-sm font-bold text-navy">{formatDateValue(viewingQuote.quote_date)}</p>
                 </div>
                 <div className="p-4 rounded-2xl bg-soft/40">
                    <p className="text-[10px] font-bold text-text-soft uppercase mb-1">Valid Until</p>
                    <p className="text-sm font-bold text-navy">{viewingQuote.valid_until ? formatDateValue(viewingQuote.valid_until) : '—'}</p>
                 </div>
                 <div className="p-4 rounded-2xl bg-soft/40">
                    <p className="text-[10px] font-bold text-text-soft uppercase mb-1">Status</p>
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${viewingQuote.status === 'converted' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                       {viewingQuote.status}
                    </span>
                 </div>
              </div>

              <div className="p-4 rounded-2xl bg-soft/40 mb-6">
                 <p className="text-[10px] font-bold text-text-soft uppercase mb-1">Customer</p>
                 <p className="text-sm font-bold text-navy">{viewingQuote.customer_name || '—'}</p>
                 <p className="text-xs text-text-soft">{viewingQuote.customer_mobile || ''} {viewingQuote.customer_address ? `• ${viewingQuote.customer_address}` : ''}</p>
              </div>

              <div className="overflow-x-auto">
                 <table className="w-full text-left">
                    <thead className="bg-gray-50/50 border-b">
                       <tr className="text-[10px] font-bold text-text-soft uppercase tracking-wider">
                          <th className="px-6 py-4">Item</th>
                          <th className="px-6 py-4 text-right">Qty</th>
                          <th className="px-6 py-4 text-right">Unit Price</th>
                          <th className="px-6 py-4 text-right">Amount</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y">
                       {(viewingQuote.items || []).map((it, i) => (
                          <tr key={i} className="hover:bg-soft/20">
                             <td className="px-6 py-4 text-sm font-semibold text-navy">{it.product_name}</td>
                             <td className="px-6 py-4 text-sm text-right">{it.quantity}</td>
                             <td className="px-6 py-4 text-sm text-right">{formatCurrencyValue(it.unit_price)}</td>
                             <td className="px-6 py-4 text-sm font-bold text-right">{formatCurrencyValue(it.unit_price * it.quantity)}</td>
                          </tr>
                       ))}
                       <tr>
                          <td colSpan={3} className="px-6 py-4 text-sm font-bold text-navy text-right">Total</td>
                          <td className="px-6 py-4 text-base font-extrabold text-navy text-right">{formatCurrencyValue(viewingQuote.total_amount)}</td>
                       </tr>
                    </tbody>
                 </table>
              </div>
           </div>
        ) : view === 'list' ? (
           <div className="space-y-6 animate-in fade-in duration-300">
              <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100">
                 <div className="relative">
                    <Search className="absolute left-4 top-3 h-4 w-4 text-text-soft" />
                    <input
                      placeholder="Search quotations..."
                      className="w-full pl-12 pr-4 py-2.5 border-2 border-gray-200 bg-white rounded-2xl text-sm outline-none focus:border-blue/40 transition-all"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                    />
                 </div>
              </div>

              <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                 <div className="overflow-x-auto">
                    <table className="w-full text-left">
                       <thead className="bg-gray-50/50 border-b">
                          <tr className="text-[10px] font-bold text-text-soft uppercase tracking-wider">
                              <th className="px-8 py-5">Quote Number</th>
                              <th className="px-8 py-5">Service Request</th>
                              <th className="px-8 py-5">Customer</th>
                             <th className="px-8 py-5">Amount</th>
                             <th className="px-8 py-5">Status</th>
                             <th className="px-8 py-5">Date</th>
                             <th className="px-8 py-5 text-right">Actions</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y">
                          {isLoading ? (
                              [1, 2, 3, 4].map(i => <tr key={i} className="animate-pulse"><td colSpan={7} className="px-8 py-8"><div className="h-4 bg-gray-100 rounded-full w-full"></div></td></tr>)
                          ) : filtered?.map((q: Quotation) => (
                             <tr key={q.id} onClick={() => setViewingQuote(q)} className="group hover:bg-soft/20 transition-colors cursor-pointer">
                                <td className="px-8 py-5">
                                   <div className="flex items-center gap-3">
                                      <div className="p-2 bg-blue/5 rounded-lg text-blue">
                                         <FileText className="h-4 w-4" />
                                      </div>
                                       <p className="text-sm font-bold text-navy uppercase">{q.quote_number}</p>
                                    </div>
                                 </td>
                                 <td className="px-8 py-5">
                                    {q.service_request_id ? (
                                       <span className="text-xs font-bold text-blue bg-blue/5 px-2.5 py-1 rounded-lg uppercase">{q.service_request_id}</span>
                                    ) : (
                                       <span className="text-xs text-text-soft">—</span>
                                    )}
                                 </td>
                                 <td className="px-8 py-5">
                                    <div>
                                       <p className="text-sm font-bold text-navy">{q.customer_name}</p>
                                      <p className="text-[10px] text-text-soft">{q.customer_mobile}</p>
                                   </div>
                                </td>
                                <td className="px-8 py-5 text-sm font-bold text-navy">
                                   {formatCurrencyValue(q.total_amount)}
                                </td>
                                <td className="px-8 py-5">
                                   <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${q.status === 'converted' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                                     {q.status}
                                   </span>
                                </td>
                                <td className="px-8 py-5 text-xs text-text-soft font-medium">
                                   {formatDateValue(q.quote_date)}
                                </td>
                                 <td className="px-8 py-5 text-right" onClick={(e) => e.stopPropagation()}>
                                     <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                       {q.status !== 'converted' && (
                                          <button
                                           onClick={() => convertMutation.mutate(q.id)}
                                           className="px-4 py-1.5 bg-green-600 text-white text-[10px] font-bold uppercase rounded-lg hover:bg-green-700 transition-colors shadow-lg shadow-green-600/20"
                                          >
                                             Convert to Sale
                                          </button>
                                       )}
                                       <button
                                         onClick={() => { setEditingQuote(q); setView('form'); }}
                                         className="p-2 text-blue bg-blue/5 rounded-xl hover:bg-blue hover:text-white transition-all shadow-sm"
                                         title="View / Edit Quotation"
                                       >
                                          <Pencil className="h-4 w-4" />
                                       </button>
                                      <button
                                        onClick={() => shareWhatsApp(q)}
                                        className="p-2 bg-green-500 text-white rounded-xl hover:opacity-90 transition-all shadow-sm"
                                        title="WhatsApp Share"
                                      >
                                         <MessageSquare className="h-4 w-4" />
                                      </button>
                                      <button
                                        onClick={() => printQuotation(q)}
                                        className="p-2 text-blue bg-blue/5 rounded-xl hover:bg-blue hover:text-white transition-all shadow-sm"
                                        title="Print"
                                      >
                                         <Printer className="h-4 w-4" />
                                      </button>
                                      <button
                                        onClick={() => { if(window.confirm('Delete this quotation?')) deleteMutation.mutate(q.id); }}
                                        className="p-2 text-text-soft hover:bg-red-50 hover:text-red-500 rounded-xl transition-all"
                                      >
                                         <Trash2 className="h-4 w-4" />
                                      </button>
                                   </div>
                                </td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              </div>
           </div>
        ) : (
           <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm animate-in zoom-in-95 duration-300 h-full">
              <div className="flex justify-between items-center mb-8 pb-4 border-b">
                 <h2 className="text-xl font-bold text-navy">Quotation Builder</h2>
                 <button onClick={() => { setEditingQuote(null); setView('list'); }} className="text-sm font-bold text-text-soft hover:text-navy transition-colors">Cancel & Return</button>
              </div>

              <QuotationBuilder
                onClose={() => setView('list')}
                onSuccess={() => queryClient.invalidateQueries({ queryKey: ['quotations'] })}
                editingId={editingQuote?.id || ''}
                initialQuoteDate={editingQuote?.quote_date || ''}
                initialCustomerName={editingQuote?.customer_name || ''}
                initialCustomerMobile={editingQuote?.customer_mobile || ''}
                initialCustomerAddress={editingQuote?.customer_address || ''}
                initialValidUntil={editingQuote?.valid_until || ''}
                initialServiceRequestId={editingQuote?.service_request_id || ''}
                initialItems={(editingQuote?.items || []).map(i => ({
                  productId: i.product_id ?? null,
                  product_name: i.product_name,
                  quantity: i.quantity,
                  unit_price: i.unit_price
                }))}
              />
           </div>
        )}
      </div>
    </Layout>
  );
};

export default QuotationPage;
