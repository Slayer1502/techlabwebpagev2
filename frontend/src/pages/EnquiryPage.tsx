import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../components/Layout';
import { enquiryService } from '../services/enquiryService';
import {
  Crosshair,
  Plus,
  Search,
  Clock,
  CheckCircle2,
  Package,
  ChevronRight,
  TrendingUp,
  FileText,
  Smartphone,
  Calendar,
  MoreVertical,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { formatCurrencyValue, formatDateValue, getEnquiryQuoteTotal, getEnquiryMargin } from '../utils/helpers';
import { Enquiry, EnquiryStatus } from '../types';
import { toast } from '../utils/toast';
import EnquiryModal from '../components/EnquiryModal';
import EnquiryDetailDrawer from '../components/EnquiryDetailDrawer';
import ConfirmOrderModal from '../components/ConfirmOrderModal';

const EnquiryPage = () => {
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'bni'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEnquiry, setSelectedEnquiry] = useState<Enquiry | null>(null);
  const [confirmEnquiry, setConfirmEnquiry] = useState<Enquiry | null>(null);

  const queryClient = useQueryClient();

  const { data: enquiries, isLoading } = useQuery({
    queryKey: ['enquiries'],
    queryFn: () => enquiryService.getEnquiries(),
  });

  const filteredEnquiries = enquiries?.filter(e => {
    const matchesSearch = e.customer_name.toLowerCase().includes(search.toLowerCase()) ||
                         e.customer_mobile.includes(search) ||
                         e.product_interest?.toLowerCase().includes(search.toLowerCase());
    const matchesSource = sourceFilter === 'all' || (e.lead_source && e.lead_source.includes('BNI'));
    return matchesSearch && matchesSource;
  });

  const Column = ({ status, title, color }: { status: EnquiryStatus, title: string, color: string }) => {
    const items = filteredEnquiries?.filter(e => e.status === status) || [];

    return (
      <div className="flex flex-col gap-4 min-w-[300px] w-full">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${color}`}></div>
            <h3 className="font-bold text-navy uppercase text-xs tracking-widest">{title}</h3>
          </div>
          <span className="bg-white px-2 py-0.5 rounded-md border text-[10px] font-bold text-text-soft">{items.length}</span>
        </div>

        <div className="flex-1 space-y-4">
          {items.map(enq => (
            <div
              key={enq.id}
              className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
              onClick={() => setSelectedEnquiry(enq)}
            >
              {enq.status === 'confirmed' && (
                 <div className="absolute top-0 left-0 w-1 h-full bg-green-500"></div>
              )}

              <div className="flex justify-between items-start mb-3">
                 <div className="min-w-0">
                    <div className="flex items-center gap-2">
                       <p className="text-sm font-bold text-navy leading-tight truncate">{enq.customer_name}</p>
                       <span className="flex items-center gap-1 text-[10px] font-bold text-text-soft shrink-0">
                          <Smartphone className="h-3 w-3 text-blue" />{enq.customer_mobile}
                       </span>
                    </div>
                    {enq.lead_source && (
                       <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${enq.lead_source.includes('BNI') ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-gray-100 text-text-soft'}`}>
                          {enq.lead_source}
                       </span>
                    )}
                 </div>
                 <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-blue transition-colors shrink-0" />
              </div>

              <p className="text-xs text-text-soft font-medium mb-4 line-clamp-2 leading-relaxed">
                 {enq.product_interest || enq.type}
              </p>

              <div className="flex items-center justify-between mt-auto pt-3 border-t border-dashed">
                 {enq.status === 'quoted' && (
                    <button
                       onClick={(e) => { e.stopPropagation(); setConfirmEnquiry(enq); }}
                       className="flex items-center gap-1 bg-green-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-green-700 transition-all shadow-sm"
                    >
                       <CheckCircle2 className="h-3 w-3" /> Confirm Order
                    </button>
                 )}
                 <div className="text-right">
                    <p className="text-[10px] font-black text-blue">
                       {getEnquiryQuoteTotal(enq.quote_options) ? formatCurrencyValue(getEnquiryQuoteTotal(enq.quote_options)) : (enq.budget ? `~ ${formatCurrencyValue(enq.budget)}` : 'No Quote')}
                    </p>
                    {(() => {
                      const m = getEnquiryMargin(enq.quote_options);
                      if (m.totalCost <= 0) return null;
                      return (
                        <p className={`text-[9px] font-black mt-0.5 ${m.margin > 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {m.margin > 0 ? '+' : ''}{formatCurrencyValue(m.margin)} ({m.marginPercent}%)
                        </p>
                      );
                    })()}
                 </div>
              </div>
            </div>
          ))}

          {items.length === 0 && (
            <div className="py-12 text-center border-2 border-dashed rounded-[2rem] opacity-20 bg-gray-50/50">
               <Package className="h-8 w-8 mx-auto" />
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-navy tracking-tight">Sales Pipeline</h1>
            <p className="text-text-soft text-sm font-medium">Manage leads and conversions</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-blue text-white px-6 py-2.5 rounded-xl font-bold hover:bg-blue-600 transition-all shadow-lg shadow-blue/20"
          >
            <Plus className="h-5 w-5" />
            Record New Lead
          </button>
        </div>

        <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-center">
          <div className="flex bg-gray-50 rounded-2xl p-1 shrink-0">
             <button
                onClick={() => setSourceFilter('all')}
                className={`px-6 py-2 text-xs font-bold rounded-xl transition-all ${sourceFilter === 'all' ? 'bg-white text-navy shadow-sm' : 'text-text-soft hover:bg-gray-100'}`}
             >
                All Leads
             </button>
             <button
                onClick={() => setSourceFilter('bni')}
                className={`px-6 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${sourceFilter === 'bni' ? 'bg-purple-600 text-white shadow-md' : 'text-purple-600 hover:bg-purple-50'}`}
             >
                <Sparkles className="h-3.5 w-3.5" /> BNI Only
             </button>
          </div>

          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-3 h-4 w-4 text-text-soft" />
            <input
              placeholder="Search pipeline by customer, mobile, or interest..."
              className="w-full pl-12 pr-4 py-2.5 border-2 border-gray-200 bg-white rounded-2xl text-sm outline-none focus:border-blue/40 transition-all"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-6 px-4 py-2 bg-gray-50 rounded-2xl border border-gray-100">
             <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                <span className="text-[10px] font-bold text-text-soft uppercase">New</span>
             </div>
             <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span className="text-[10px] font-bold text-text-soft uppercase">Quoted</span>
             </div>
             <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-[10px] font-bold text-text-soft uppercase">Confirmed</span>
             </div>
          </div>
        </div>

        <div className="overflow-x-auto pb-6 scrollbar-hide">
           <div className="flex gap-6 min-w-max">
              <Column status="new" title="Fresh Leads" color="bg-orange-500" />
              <Column status="quoted" title="Quotations Sent" color="bg-blue-500" />
              <Column status="confirmed" title="Order Confirmed" color="bg-green-500" />
              <Column status="delivered" title="Fulfilled" color="bg-navy" />
           </div>
        </div>
      </div>

      {isModalOpen && (
        <EnquiryModal
           onClose={() => setIsModalOpen(false)}
           onSuccess={() => queryClient.invalidateQueries({ queryKey: ['enquiries'] })}
        />
      )}

      {selectedEnquiry && (
        <EnquiryDetailDrawer
           enquiry={selectedEnquiry}
           onClose={() => setSelectedEnquiry(null)}
           onUpdate={() => queryClient.invalidateQueries({ queryKey: ['enquiries'] })}
        />
      )}

      {confirmEnquiry && (
        <ConfirmOrderModal
          enquiry={confirmEnquiry}
          onClose={() => setConfirmEnquiry(null)}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['enquiries'] })}
        />
      )}
    </Layout>
  );
};

export default EnquiryPage;
