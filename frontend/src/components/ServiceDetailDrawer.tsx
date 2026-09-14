import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Smartphone,
  Hash,
  Clock,
  Wrench,
  Calendar,
  User,
  ClipboardList,
  CheckCircle2,
  AlertTriangle,
  FileText,
  IndianRupee,
  ChevronRight,
  Package,
  History,
  MessageSquare,
  Save,
  Download,
  Mail,
  Loader2,
  Video,
  HardDrive,
  Cable,
  Camera as CameraIcon,
  Truck,
  Minus,
  Plus,
  Undo2,
  Pencil,
  RefreshCw
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { challanService } from '../services/challanService';
import { ServiceRequest, SupplierQuote } from '../types';
import { formatCurrencyValue, formatDateValue } from '../utils/helpers';
import api from '../utils/api';
import { toast } from '../utils/toast';
import { serviceRequestService } from '../services/serviceRequestService';
import { purchaseService } from '../services/purchaseService';
import { useAuthStore } from '../store/authStore';
import AssignTechModal from './AssignTechModal';
import GenerateBillModal from './GenerateBillModal';
import RecordPaymentModal from './RecordPaymentModal';
import QuotationComposer from './QuotationComposer';
import RequestSupplierQuoteModal from './RequestSupplierQuoteModal';
import ChallanReturnModal from './ChallanReturnModal';
import RecurringScheduleModal from './RecurringScheduleModal';

interface Props {
  request: ServiceRequest;
  onClose: () => void;
  onUpdate: () => void;
}

const ServiceDetailDrawer = ({ request, onClose, onUpdate }: Props) => {
  const navigate = useNavigate();
  const [modal, setModal] = useState<'assign' | 'bill' | 'payment' | 'quote' | null>(null);
  const [notes, setNotes] = useState(request.status_notes || '');
  const [savingNotes, setSavingNotes] = useState(false);
  const [survey, setSurvey] = useState<any>(null);
  const [surveyLoading, setSurveyLoading] = useState(false);
  const [quotation, setQuotation] = useState<any>(null);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [linkedDc, setLinkedDc] = useState<any>(null);
  const [rfqOpen, setRfqOpen] = useState(false);
  const [amcOpen, setAmcOpen] = useState(false);
  const [supplierQuotes, setSupplierQuotes] = useState<SupplierQuote[]>([]);
  const queryClient = useQueryClient();

  useEffect(() => {
    setNotes(request.status_notes || '');
  }, [request.status_notes]);

  useEffect(() => {
    let mounted = true;
    setSurveyLoading(true);
    serviceRequestService.getSalesSurvey(request.id)
      .then(s => { if (mounted) setSurvey(s || null); })
      .catch(() => { if (mounted) setSurvey(null); })
      .finally(() => { if (mounted) setSurveyLoading(false); });
    serviceRequestService.getQuotationsForRequest(request.id)
      .then(d => { if (mounted) setQuotation(d.quotation || null); })
      .catch(() => { if (mounted) setQuotation(null); });
    purchaseService.getSupplierQuotesForService(request.id)
      .then(qs => { if (mounted) setSupplierQuotes(qs || []); })
      .catch(() => { if (mounted) setSupplierQuotes([]); });
    challanService.getChallanForSource('service', request.id)
      .then(d => { if (mounted) setLinkedDc(d || null); })
      .catch(() => { if (mounted) setLinkedDc(null); });
    return () => { mounted = false; };
  }, [request.id]);

  const parseJson = (raw: any, fallback: any) => {
    if (raw === null || raw === undefined) return fallback;
    if (typeof raw === 'object') return raw;
    try { return JSON.parse(raw); } catch { return fallback; }
  };

  const buildQuoteItems = (s: any): any[] => {
    const items: any[] = [];
    const cameras = parseJson(s.cameras, []);
    const cables = parseJson(s.cables, []);
    const mounting = parseJson(s.mounting, {});
    const additionalParts = parseJson(s.additional_parts, []);
    const nvrDvr = parseJson(s.nvr_dvr, {});

    cameras.forEach((c: any) => {
      const label = c.formFactor || c.type || 'Camera';
      let name = `${c.count || 1}x ${label}`;
      if (c.technology) name += ` ${c.technology}`;
      if (c.resolution) name += ` ${c.resolution}`;
      if (c.mounting) name += ` @ ${c.mounting}`;
      items.push({ product_name: name, unit_price: 0, quantity: 1 });
    });

    if (nvrDvr.needed && nvrDvr.type) {
      items.push({
        product_name: `${nvrDvr.type || 'NVR'} ${nvrDvr.channels || '-'}ch${nvrDvr.brand ? ' ' + nvrDvr.brand : ''}`.trim(),
        unit_price: 0,
        quantity: 1
      });
      if (nvrDvr.power && nvrDvr.power.type && nvrDvr.power.channels) {
        items.push({
          product_name: `${nvrDvr.power.type} ${nvrDvr.power.channels}ch${nvrDvr.power.brand ? ' ' + nvrDvr.power.brand : ''}`.trim(),
          unit_price: 0,
          quantity: 1
        });
      }
    }

    cables.forEach((c: any) => {
      const type = c.type || 'Cable';
      const mtrBased = /cat6|fiber|optical|coaxial|rg59|power cable|hdmi|cable/i.test(type);
      const name = mtrBased ? `${type} (per mtr)` : type;
      items.push({ product_name: name, unit_price: 0, quantity: 1 });
    });

    if (mounting.rack) items.push({ product_name: `${mounting.rack}`, unit_price: 0, quantity: 1 });
    if (mounting.poles) items.push({ product_name: `${mounting.poles} pole${mounting.poles > 1 ? 's' : ''}`, unit_price: 0, quantity: 1 });
    if (mounting.boxes) items.push({ product_name: `${mounting.boxes} camera box${mounting.boxes > 1 ? 'es' : ''}`, unit_price: 0, quantity: 1 });
    if (mounting.other) items.push({ product_name: String(mounting.other), unit_price: 0, quantity: 1 });

    additionalParts.forEach((p: any) => {
      items.push({
        product_name: `${p.qty || 1}x ${p.name}${p.notes ? ' (' + p.notes + ')' : ''}`,
        unit_price: 0,
        quantity: 1
      });
    });

    return items;
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      await serviceRequestService.updateNotes(request.id, notes);
      toast('Notes updated!', 'success');
      onUpdate();
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to update notes', 'error');
    } finally {
      setSavingNotes(false);
    }
  };

  const [emailingBill, setEmailingBill] = useState(false);

  const downloadBillPdf = () => {
    window.open(`/api/sales/service-requests/${request.id}/bill.pdf`, '_blank');
  };

  const emailBillPdf = async () => {
    const email = prompt('Enter customer email address:', request.customer_email || '');
    if (!email) return;

    setEmailingBill(true);
    try {
      await api.post(`/sales/service-requests/${request.id}/email-bill`, { recipientEmail: email });
      toast(`Bill PDF emailed successfully to ${email}!`, 'success');
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to email bill', 'error');
    } finally {
      setEmailingBill(false);
    }
  };

  const shareWhatsAppBill = () => {
    const mobile = String(request.customer_mobile || '').replace(/[^0-9]/g, '');
    if (!mobile) return toast('No customer mobile number available', 'error');

    const msg = [
      `Dear ${request.customer_name || 'Customer'},`,
      ``,
      `Thank you for choosing TECHLAB for your service needs. Here are your bill details:`,
      ``,
      `*Bill No:* ${request.bill_number}`,
      `*Device / Service:* ${request.device_type}`,
      `*Bill Date:* ${formatDateValue(request.bill_date || request.created_at)}`,
      `*Total Amount:* ${formatCurrencyValue(request.bill_amount || 0)}`,
      `*Payment Status:* ${(request.payment_status || 'PENDING').toUpperCase()}`,
      ``,
      `If you have any questions, feel free to contact us.`,
      `~ TECHLAB Team`
    ].filter(Boolean).join('\n');

    window.open(`https://wa.me/91${mobile}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleAction = async (action: string) => {
    if (action === 'assign') setModal('assign');
    else if (action === 'bill') setModal('bill');
    else if (action === 'payment') setModal('payment');
    else if (action === 'cancel') {
       if (window.confirm('Cancel this request?')) {
          try {
            const res = await api.patch(`/sales/service-requests/${request.id}/cancel`, { reason: 'Cancelled by user' });
            const pos: string[] = res?.data?.cancelledPos || [];
            const quotes: string[] = res?.data?.cancelledQuotes || [];
            const suffix = pos.length ? ` — PO cancelled: ${pos.join(', ')}` : quotes.length ? ` — quotation cancelled: ${quotes.join(', ')}` : '';
            toast(`Request cancelled${suffix}`, 'success');
          } catch (err: any) {
            toast(err?.response?.data?.error || 'Failed to cancel request', 'error');
          }
          onUpdate();
          onClose();
       }
    }
  };

  const statusColors: any = {
    Pending: 'bg-orange-500',
    Scheduled: 'bg-blue-500',
    Completed: 'bg-green-500',
    Canceled: 'bg-red-500'
  };

  const parts = (() => {
    if (!request.requested_parts) return null;
    try {
      const p = JSON.parse(request.requested_parts);
      return p;
    } catch { return { procurement: request.requested_parts }; }
  })();

  const used = (() => {
    if (!request.used_items) return [];
    try { return JSON.parse(request.used_items); } catch { return []; }
  })();

  const partsStatus = (status?: string) => {
    if (status === 'available') return { text: 'Ready', cls: 'text-green-600 bg-green-50 border-green-200' };
    if (status === 'collected') return { text: 'Collected', cls: 'text-green-600 bg-green-50 border-green-200' };
    return { text: 'Sourcing', cls: 'text-orange-500 bg-orange-50 border-orange-100' };
  };
  const partBadge = partsStatus(request.part_request_status);
  const resolvedDc = linkedDc || request.challan || null;
  const dcItemNames = new Set((resolvedDc?.items || []).map((i: any) => String(i.item_name || '').trim().toLowerCase()));
  const isMtrItem = (n: string) => /(cat6|fiber|optical|coaxial|rg59|power cable|hdmi|cable|mtr|meter)/i.test(String(n || ''));
  const pendingParts = parts?.inventory?.filter((p: any) => {
    if (!resolvedDc?.items?.length) return true;
    return !dcItemNames.has(String(p.name || '').trim().toLowerCase());
  }) || [];

  const dispatchItems = (() => {
    const isCable = (n: string) => /(cat6|fiber|optical|coaxial|rg59|power cable|hdmi|cable|mtr|meter)/i.test(n || '');
    const unitOf = (n: string) => isCable(n) ? 'm' : 'x';
    const fromUsed = used
      .filter((u: any) => String(u.type || '').toLowerCase() !== 'service')
      .map((u: any) => ({
        productId: u.product_id || u.productId || null,
        name: String(u.name || '').trim(),
        qty: Number(u.qty) || 1,
        rate: Number(u.price) || 0,
        unit: unitOf(String(u.name || '')),
      }));
    if (fromUsed.length) return fromUsed;
    const quoteLines = (Array.isArray(quotation?.items) ? quotation.items : [])
      .filter((it: any) => {
        const n = String(it.product_name || '').toLowerCase();
        return !!n && !/(installation|labou?r|service charge|charge)/i.test(n);
      })
      .map((it: any) => ({
        productId: it.product_id || null,
        name: String(it.product_name || '').trim(),
        qty: Number(it.quantity) || 1,
        rate: Number(it.unit_price) || 0,
        unit: unitOf(String(it.product_name || '')),
      }));
    if (quoteLines.length) return quoteLines;
    const reqPartsList = parts?.inventory || [];
    const baseItems = reqPartsList
      .filter((p: any) => String(p.name || '').trim())
      .map((p: any) => ({
        productId: p.productId || p.product_id || null,
        name: String(p.name || '').trim(),
        qty: Number(p.qty) || 1,
        rate: 0,
        unit: unitOf(String(p.name || '')),
      }));
    const cableItems: { productId: null; name: string; qty: number; rate: number; unit: string }[] = [];
    if (survey?.cables) {
      let cables: any[] = [];
      try {
        cables = typeof survey.cables === 'string' ? JSON.parse(survey.cables) : (Array.isArray(survey.cables) ? survey.cables : []);
      } catch { cables = []; }
      (Array.isArray(cables) ? cables : []).forEach((c: any) => {
        const type = String(c.type || '').trim();
        if (!type) return;
        const knownMeters = Number(c.actual_meters) || Number(c.meters) || Number(c.length);
        cableItems.push({
          productId: null,
          name: `${type} (per mtr)`,
          qty: knownMeters || (Number(c.boxes) || 1),
          rate: 0,
          unit: knownMeters ? 'm' : 'box',
        });
      });
    }
    return [...baseItems, ...cableItems];
  })();
  const { user } = useAuthStore();
  const canWrite = ['admin', 'sales'].includes(user?.role || '');
  const canDispatch = dispatchItems.length > 0 && canWrite;

  const requisition: any = useMemo(() => {
    if (!request.buyout_requisition) return null;
    try {
      return typeof request.buyout_requisition === 'string' ? JSON.parse(request.buyout_requisition) : request.buyout_requisition;
    } catch { return null; }
  }, [request.buyout_requisition]);

  const activeRfq = supplierQuotes.find(q => q.id === requisition?.supplierQuoteId)
    || (supplierQuotes.length ? supplierQuotes[0] : null);
  const hasActiveRfq = !!requisition && ['quote_requested', 'uploaded', 'po_placed'].includes(requisition.status);
  const pastSourcing = ['uploaded', 'po_placed', 'received'].includes(requisition?.status) || request.status === 'Completed';
  const canRequestRfq = canWrite && !hasActiveRfq && !pastSourcing;
  const rfqChip = (status: string | undefined) => {
    const map: any = {
      quote_requested: { label: 'Awaiting supplier', cls: 'bg-orange-100 text-orange-600' },
      uploaded: { label: 'Awaiting approval', cls: 'bg-blue-100 text-blue-600' },
      po_placed: { label: 'PO placed', cls: 'bg-green-100 text-green-600' },
      received: { label: 'Received', cls: 'bg-green-100 text-green-600' },
      rejected: { label: 'Rejected', cls: 'bg-red-100 text-red-600' },
    };
    const c = map[status || ''] || { label: status || '-', cls: 'bg-gray-100 text-gray-600' };
    return <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${c.cls}`}>{c.label}</span>;
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-navy/40 backdrop-blur-sm" onClick={onClose}></div>

      <div className="relative w-full max-w-xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="p-8 border-b bg-gray-50 flex justify-between items-start">
           <div>
              <div className={`px-2.5 py-0.5 rounded-full text-[10px] font-black text-white uppercase tracking-widest inline-block mb-3 ${statusColors[request.status]}`}>
                 {request.status}
              </div>
              <h2 className="text-2xl font-black text-navy leading-tight">{request.customer_name}</h2>
              <div className="flex items-center gap-4 mt-2 text-text-soft">
                 <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-tight">
                    <Smartphone className="h-3.5 w-3.5" /> {request.customer_mobile}
                 </div>
                 <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-tight">
                    <Hash className="h-3.5 w-3.5" /> {request.id}
                 </div>
              </div>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-text-soft">
              <X className="h-6 w-6" />
           </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
           {/* Section: Core Info */}
           <div className="grid grid-cols-2 gap-8">
              <div className="space-y-1">
                 <p className="text-[10px] font-bold text-text-soft uppercase tracking-widest">Device / Work</p>
                 <div className="flex items-center gap-2 text-sm font-bold text-navy">
                    <Wrench className="h-4 w-4 text-blue" />
                    {request.device_type}
                 </div>
              </div>
              <div className="space-y-1">
                 <p className="text-[10px] font-bold text-text-soft uppercase tracking-widest">Scheduled For</p>
                 <div className="flex items-center gap-2 text-sm font-bold text-navy">
                    <Calendar className="h-4 w-4 text-blue" />
                    {formatDateValue(request.scheduled_date || request.preferred_date)}
                 </div>
              </div>
              <div className="space-y-1">
                 <p className="text-[10px] font-bold text-text-soft uppercase tracking-widest">Assigned Tech</p>
                 <div className="flex items-center gap-2 text-sm font-bold text-navy">
                    <User className="h-4 w-4 text-blue" />
                    {request.service_person || 'Awaiting Schedule'}
                 </div>
              </div>
              <div className="space-y-1">
                 <p className="text-[10px] font-bold text-text-soft uppercase tracking-widest">Estimated Cost</p>
                 <div className="flex items-center gap-2 text-sm font-bold text-blue">
                    <IndianRupee className="h-4 w-4" />
                    {formatCurrencyValue(request.estimated_cost || 0)}
                 </div>
              </div>
           </div>

            {/* Section: Issue Description */}
            <div className="space-y-3">
               <p className="text-[10px] font-bold text-text-soft uppercase tracking-widest flex items-center gap-2">
                  <ClipboardList className="h-3.5 w-3.5" /> Client Reported Issue
               </p>
               <div className="p-5 bg-gray-50 rounded-2xl border-2 border-gray-100 text-sm text-navy leading-relaxed italic">
                  "{request.issue}"
               </div>
            </div>

            {/* Section: Device Intake */}
            {request.device_intake && (() => {
              let intake: any;
              try { intake = typeof request.device_intake === 'string' ? JSON.parse(request.device_intake) : request.device_intake; } catch { return null; }
              if (!intake || !intake.brand) return null;
              const isLaptop = intake.subType !== 'printer';
              return (
                <div className="space-y-3">
                  <p className="text-[10px] font-bold text-text-soft uppercase tracking-widest flex items-center gap-2">
                     <Wrench className="h-3.5 w-3.5" /> Device Intake
                  </p>
                  <div className="bg-blue-50/50 rounded-2xl border border-blue-100 overflow-hidden divide-y divide-blue-100">
                    <div className="p-4">
                      <p className="text-sm font-black text-navy">{intake.brand} {intake.model} <span className="text-text-soft font-normal text-xs">({isLaptop ? 'Laptop / PC' : 'Printer'})</span></p>
                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-text-soft font-bold">
                        {intake.serialNumber && <span>SN: {intake.serialNumber}</span>}
                        {intake.color && <span>Color: {intake.color}</span>}
                      </div>
                    </div>
                    <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      {intake.bodyCondition && <div><span className="text-text-soft">Body:</span> <span className="font-bold text-navy">{intake.bodyCondition}</span></div>}
                      {isLaptop && intake.screenCondition && <div><span className="text-text-soft">Screen:</span> <span className="font-bold text-navy">{intake.screenCondition}</span></div>}
                      {isLaptop && intake.keyboardCondition && <div><span className="text-text-soft">Keyboard:</span> <span className="font-bold text-navy">{intake.keyboardCondition}</span></div>}
                      {isLaptop && intake.portsCheck && <div><span className="text-text-soft">Ports:</span> <span className="font-bold text-navy">{intake.portsCheck}</span></div>}
                      {!isLaptop && intake.paperTray && <div><span className="text-text-soft">Paper Tray:</span> <span className="font-bold text-navy">{intake.paperTray}</span></div>}
                      {!isLaptop && intake.printHead && <div><span className="text-text-soft">Print Head:</span> <span className="font-bold text-navy">{intake.printHead}</span></div>}
                      {!isLaptop && intake.inkToner && <div><span className="text-text-soft">Ink/Toner:</span> <span className="font-bold text-navy">{intake.inkToner}</span></div>}
                      {intake.powerOn && <div><span className="text-text-soft">Power:</span> <span className="font-bold text-navy">{intake.powerOn}</span></div>}
                    </div>
                    {intake.accessories && intake.accessories.length > 0 && (
                      <div className="p-4 text-xs">
                        <span className="text-text-soft">Accessories:</span> <span className="font-bold text-navy">{intake.accessories.join(', ')}</span>
                      </div>
                    )}
                    {(intake.biosPassword || intake.loginPassword || intake.networkPassword) && (
                      <div className="p-4 text-xs">
                        {intake.biosPassword && <span className="mr-3"><span className="text-text-soft">BIOS:</span> <span className="font-bold text-navy">••••••••</span></span>}
                        {intake.loginPassword && <span className="mr-3"><span className="text-text-soft">Windows:</span> <span className="font-bold text-navy">••••••••</span></span>}
                        {intake.networkPassword && <span><span className="text-text-soft">Network:</span> <span className="font-bold text-navy">••••••••</span></span>}
                      </div>
                    )}
                    {intake.preExistingDamage && (
                      <div className="p-4 bg-amber-50 border-l-4 border-amber-400 text-xs">
                        <span className="font-bold text-amber-700">Pre-existing Damage:</span> <span className="text-amber-900">{intake.preExistingDamage}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

           {/* Section: Internal Notes / Status Log */}
           <div className="space-y-3">
              <div className="flex justify-between items-center">
                 <p className="text-[10px] font-bold text-text-soft uppercase tracking-widest flex items-center gap-2">
                    <MessageSquare className="h-3.5 w-3.5 text-blue" /> Internal Tracking Notes
                 </p>
                 <button
                   onClick={handleSaveNotes}
                   disabled={savingNotes || notes === (request.status_notes || '')}
                   className="text-[10px] font-bold text-blue hover:text-blue-600 disabled:opacity-30 transition-all flex items-center gap-1 uppercase tracking-widest"
                 >
                    {savingNotes ? <Clock className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                    Save Notes
                 </button>
              </div>
              <textarea
                rows={4}
                className="w-full p-5 bg-white border-2 border-gray-100 rounded-2xl text-sm text-navy outline-none focus:border-blue/20 transition-all resize-none font-medium"
                placeholder="Type internal notes here (e.g. 'Waiting for spare parts', 'Customer unreachable')..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
           </div>

{/* Section: Site Survey */}
           {(parts || used.length > 0 || resolvedDc?.items?.length) && (
              <div className="space-y-4">
                 <div className="flex justify-between items-center">
                    <p className="text-[10px] font-bold text-text-soft uppercase tracking-widest flex items-center gap-2">
                       <Package className="h-3.5 w-3.5" /> Parts & Consumables
                    </p>
                    {canWrite && request.part_request_status === 'requested' && (
                       <button
                         onClick={async () => {
                            if (!window.confirm("Are you sure all requested parts are ready for collection?")) return;
                            try {
                               await serviceRequestService.markPartsAvailable(request.id);
                               toast("Parts marked as ready. Technician will be notified.", "success");
                               onUpdate();
                            } catch (e: any) {
                               toast(e.response?.data?.error || "Failed to mark parts as ready", "error");
                            }
                         }}
                         className="text-[10px] font-bold text-green-600 hover:text-green-700 transition-all flex items-center gap-1 uppercase tracking-widest bg-green-50 px-2 py-1 rounded border border-green-100"
                       >
                          <CheckCircle2 className="h-3 w-3" /> Mark Parts Ready
                       </button>
                    )}
                 </div>

                 {resolvedDc?.items?.length > 0 && (
                    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y">
                       <div className="px-4 py-2 bg-blue-50/60 flex justify-between items-center">
                          <p className="text-[10px] font-black text-blue uppercase tracking-widest flex items-center gap-1.5">
                             <Truck className="h-3 w-3" /> Dispatched via DC — {resolvedDc.challan_number}
                             {request.part_request_status === 'collected' && <span className="text-[8px] font-bold text-green-600 bg-green-100 px-1.5 py-0.5 rounded tracking-widest">UPDATED</span>}
                          </p>
                          <p className="text-[10px] font-black text-blue uppercase tracking-widest">{formatCurrencyValue(resolvedDc.total_value)}</p>
                       </div>
                       {resolvedDc.items.map((it: any, idx: number) => (
                          <div key={`dc-${idx}`} className="p-4 flex justify-between items-center bg-green-50/20">
                             <div>
                                <p className="text-sm font-bold text-navy">{it.item_name}</p>
                                <p className="text-[10px] text-text-soft uppercase font-bold">{it.qty} {isMtrItem(it.item_name) ? 'm' : 'x'} · Rs. {it.unit_price}</p>
                             </div>
                             <div className="flex items-center gap-3">
                                <span className="text-[10px] font-bold uppercase text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded">Dispatched</span>
                                <p className="text-sm font-bold text-blue">{formatCurrencyValue(it.total_price || it.qty * it.unit_price)}</p>
                             </div>
                          </div>
                       ))}
                    </div>
                 )}

                 <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y">
                    {used.map((item: any, idx: number) => (
                       <div key={idx} className="p-4 flex justify-between items-center bg-green-50/20">
                          <div>
                             <p className="text-sm font-bold text-navy">{item.name}</p>
                             <p className="text-[10px] text-text-soft uppercase font-bold">{item.qty} Units used</p>
                          </div>
                          <p className="text-sm font-bold text-blue">{formatCurrencyValue(item.price * item.qty)}</p>
                       </div>
                    ))}
                    {pendingParts.map((p: any, idx: number) => (
                       <div key={`p-${idx}`} className="p-4 flex justify-between items-center opacity-70">
                          <div>
                             <p className="text-sm font-bold text-navy">{p.name}</p>
                             <p className="text-[10px] text-text-soft uppercase font-bold">{p.qty}{request.part_request_status === 'requested' ? ' Requested' : ''}</p>
                          </div>
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${partBadge.cls}`}>{partBadge.text}</span>
                       </div>
                    ))}
                    {parts?.procurement && (
                       <div className="p-4 flex flex-col opacity-80">
                          <p className="text-[10px] font-bold text-text-soft uppercase mb-1">Procurement Notes</p>
                          <p className="text-sm text-navy">{parts.procurement}</p>
                          <span className={`text-[10px] font-bold uppercase mt-2 px-2 py-0.5 rounded border w-fit ${partBadge.cls}`}>{partBadge.text}</span>
                       </div>
                    )}
 </div>
               </div>
            )}

            {/* Section: Supplier Quote (RFQ) */}
            {(canWrite || requisition) && (
               <div className="space-y-4">
                  <div className="flex justify-between items-center">
                     <p className="text-[10px] font-bold text-text-soft uppercase tracking-widest flex items-center gap-2">
                        <Truck className="h-3.5 w-3.5" /> Supplier Quote
                     </p>
                     {canRequestRfq && (
                        <button
                          onClick={() => setRfqOpen(true)}
                          className="text-[10px] font-bold text-blue hover:text-blue-600 transition-all flex items-center gap-1 uppercase tracking-widest"
                        >
                           <Truck className="h-3 w-3" /> Request Supplier Quote
                        </button>
                     )}
                  </div>

                  {requisition ? (
                     <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y">
                        {activeRfq && (
                           <div className="p-4 flex justify-between items-center">
                              <div>
                                 <p className="text-sm font-bold text-navy">{activeRfq.quote_number}</p>
                                 <p className="text-[10px] text-text-soft uppercase font-bold">{activeRfq.supplier_name || 'Supplier'}</p>
                              </div>
                              <div className="flex flex-col items-end gap-1.5">
                                 {rfqChip(requisition.status)}
                                 {activeRfq.pdf_path && (
                                    <button
                                      onClick={() => window.open(`/api/sales/quotes/${activeRfq.id}/pdf`, '_blank')}
                                      className="text-[10px] font-bold text-blue flex items-center gap-1 hover:underline"
                                    >
                                       <Download className="h-3 w-3" /> View PDF
                                    </button>
                                 )}
                              </div>
                           </div>
                        )}
{requisition.poNumber && (
                            <div className="p-4 flex items-center justify-between">
                               <p className="text-[10px] font-bold text-text-soft uppercase tracking-widest flex items-center gap-2">
                                  <History className="h-3.5 w-3.5" /> Purchase Order
                               </p>
                               <div className="flex items-center gap-2">
                                  <span className="text-sm font-bold text-navy uppercase">{requisition.poNumber}</span>
                                  {requisition.status === 'received' && rfqChip('received')}
                                  {request.part_request_status === 'collected' && (
                                     <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-green-100 text-green-600">Collected</span>
                                  )}
                               </div>
                            </div>
                         )}
                        {requisition.status === 'quote_requested' && (
                           <div className="p-4 bg-orange-50/50">
                              <p className="text-xs text-text-soft font-medium">
                                 Supplier has been asked to quote. Awaiting the submitted price sheet to upload in Purchases &gt; Quotes.
                              </p>
                           </div>
                        )}
                        {requisition.status === 'uploaded' && (
                           <div className="p-4 bg-blue-50/50">
                              <p className="text-xs text-text-soft font-medium">
                                 Supplier quote uploaded — waiting for admin approval to place the PO.
                              </p>
                           </div>
                        )}
                        {requisition.status === 'po_placed' && requisition.supplierQuoteId && (
                           <div className="p-4 bg-green-50/50">
                              <p className="text-xs text-text-soft font-medium">
                                 PO {requisition.poNumber} placed against approved quote {requisition.quoteNumber}. Waiting for stock in.
                              </p>
                           </div>
                        )}
{requisition.status === 'received' && (
                            <div className="p-4 bg-green-50/50">
                               <p className="text-xs text-text-soft font-medium">
                                  {request.part_request_status === 'collected'
                                     ? resolvedDc
                                        ? `Parts collected by technician and dispatched via ${resolvedDc.challan_number}${request.status === 'Completed' ? ' — job completed' : ''}.`
                                        : 'Parts collected by technician.'
                                     : request.part_request_status === 'available'
                                        ? `Parts received against PO ${requisition.poNumber}. Ready for collection.`
                                        : `Parts received against PO ${requisition.poNumber}. Technician can collect them.`}
                               </p>
                            </div>
                         )}
                        {requisition.status === 'rejected' && (
                           <div className="p-4 bg-red-50/50">
                              <p className="text-xs text-text-soft font-medium">
                                 This quote was rejected. You can request a new supplier quote.
                              </p>
                           </div>
                        )}
                     </div>
                  ) : (
                     <p className="text-xs text-text-soft italic">No supplier quote requested yet.</p>
                  )}
               </div>
            )}

            {/* Section: Parts & Consumption */}
           <div className="space-y-4">
              <div className="flex justify-between items-center">
                 <p className="text-[10px] font-bold text-text-soft uppercase tracking-widest flex items-center gap-2">
                    <CameraIcon className="h-3.5 w-3.5" /> Site Survey
                 </p>
                 {request.survey_status === 'submitted' && !quotation && (
                   <button
                     onClick={() => setQuoteOpen(true)}
                     className="text-[10px] font-bold text-blue hover:text-blue-600 transition-all flex items-center gap-1 uppercase tracking-widest"
                   >
                      <FileText className="h-3 w-3" /> Prepare Quotation
                   </button>
                 )}
                 {quotation && (
                   <button
                     onClick={() => navigate(`/quotations/${quotation.id}`)}
                     className="text-[10px] font-bold text-green-600 hover:text-green-700 transition-all flex items-center gap-1 uppercase tracking-widest"
                     title={quotation.quote_number}
                   >
                      <FileText className="h-3 w-3" /> View Quotation {quotation.quote_number}
                   </button>
                 )}
              </div>

              {surveyLoading ? (
                <div className="p-5 bg-gray-50 rounded-2xl border-2 border-gray-100 flex items-center gap-2 text-sm text-text-soft font-medium">
                   <Loader2 className="h-4 w-4 animate-spin" /> Loading survey...
                </div>
              ) : survey ? (() => {
                 const cameras = parseJson(survey.cameras, []);
                 const cables = parseJson(survey.cables, []);
                 const mounting = parseJson(survey.mounting, {});
                 const additionalParts = parseJson(survey.additional_parts, []);
                 const nvrDvr = parseJson(survey.nvr_dvr, {});
                 const photos = parseJson(survey.photos, []);
                 const mountItems: string[] = [];
                 if (mounting.brackets) mountItems.push(`${mounting.brackets} brackets`);
                 if (mounting.poles) mountItems.push(`${mounting.poles} poles`);
                 if (mounting.boxes) mountItems.push(`${mounting.boxes} camera boxes`);
                 if (mounting.rack) mountItems.push(`${mounting.rack}`);
                 if (mounting.other) mountItems.push(String(mounting.other));

                 return (
                   <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y">
                      {cameras.length > 0 && (
                        <div className="p-5 space-y-2">
                           <p className="text-[10px] font-bold text-text-soft uppercase tracking-widest flex items-center gap-2">
                              <Video className="h-3.5 w-3.5" /> Cameras ({survey.camera_count || cameras.reduce((s: number, c: any) => s + (c.count || 1), 0)} total)
                           </p>
                           {cameras.map((c: any, ix: number) => (
                             <p key={ix} className="text-sm text-navy font-medium">
                                {c.count || 1}x {c.formFactor || c.type || 'Camera'}{c.technology ? ` (${c.technology})` : ''} {c.resolution || ''}{c.mounting ? ` @ ${c.mounting}` : ''}
                             </p>
                           ))}
                        </div>
                      )}

                      {nvrDvr.needed && (
                        <div className="p-5 space-y-2">
                           <p className="text-[10px] font-bold text-text-soft uppercase tracking-widest flex items-center gap-2">
                              <HardDrive className="h-3.5 w-3.5" /> {nvrDvr.type || 'NVR/DVR'}
                           </p>
                           <p className="text-sm text-navy font-medium">
                              {nvrDvr.channels || '-'} channels{nvrDvr.brand ? ` - ${nvrDvr.brand}` : ''}
                           </p>
                           {nvrDvr.power && nvrDvr.power.type && (
                             <p className="text-sm text-navy font-medium">
                                {nvrDvr.power.type === 'PoE' ? 'PoE Switch' : nvrDvr.power.type === 'SMPS' ? 'SMPS Power Supply' : nvrDvr.power.type} - {nvrDvr.power.channels || '-'} channels{nvrDvr.power.brand ? ` - ${nvrDvr.power.brand}` : ''}
                             </p>
                           )}
                        </div>
                      )}

                      {cables.length > 0 && (
                        <div className="p-5 space-y-2">
                           <p className="text-[10px] font-bold text-text-soft uppercase tracking-widest flex items-center gap-2">
                              <Cable className="h-3.5 w-3.5" /> Cables
                           </p>
                           {cables.map((c: any, ix: number) => {
                             const box = Number(c.boxes) || 0;
                             const mtr = Number(c.meters) || 0;
                             const boxInfo = box ? ` (${box} box${box > 1 ? 'es' : ''})` : '';
                             const mtrsInfo = mtr ? ` (${mtr} mtrs)` : '';
                             return <p key={ix} className="text-sm text-navy font-medium">{c.type || 'Cable'}{boxInfo}{mtrsInfo}</p>;
                           })}
                        </div>
                      )}

                      {mountItems.length > 0 && (
                        <div className="p-5 space-y-2">
                           <p className="text-[10px] font-bold text-text-soft uppercase tracking-widest">Mounting Hardware</p>
                           <p className="text-sm text-navy font-medium">{mountItems.join(', ')}</p>
                        </div>
                      )}

                      {additionalParts.length > 0 && (
                        <div className="p-5 space-y-2">
                           <p className="text-[10px] font-bold text-text-soft uppercase tracking-widest">Additional Parts</p>
                           {additionalParts.map((p: any, ix: number) => (
                             <p key={ix} className="text-sm text-navy font-medium">{p.qty || 1}x {p.name}{p.notes ? ` (${p.notes})` : ''}</p>
                           ))}
                        </div>
                      )}

                      {photos.length > 0 && (
                        <div className="p-5 space-y-2">
                           <p className="text-[10px] font-bold text-text-soft uppercase tracking-widest">Photos</p>
                           <div className="flex flex-wrap gap-2">
                              {photos.map((p: string, ix: number) => (
                                <a key={ix} href={p} target="_blank" rel="noreferrer">
                                   <img src={p} alt="Site photo" className="h-16 w-16 object-cover rounded-xl border border-gray-200" />
                                </a>
                              ))}
                           </div>
                        </div>
                      )}

                      {survey.notes && (
                        <div className="p-5 space-y-1">
                           <p className="text-[10px] font-bold text-text-soft uppercase tracking-widest">Technician Notes</p>
                           <p className="text-sm text-navy">{survey.notes}</p>
                        </div>
                      )}

                      <div className="p-5">
                         <p className="text-[10px] font-bold text-text-soft uppercase tracking-widest">Submitted</p>
                         <p className="text-sm text-navy">
                            {survey.submitted_at ? new Date(survey.submitted_at).toLocaleString() : '-'}
                            {survey.survey_status ? ` · ${survey.survey_status}` : ''}
                         </p>
                      </div>
                   </div>
                 );
              })() : (
                <div className="p-5 bg-gray-50 rounded-2xl border-2 border-gray-100 text-sm text-text-soft italic">
                   No site survey submitted for this request yet.
                </div>
              )}
           </div>

           {/* Section: Billing Summary */}
           {request.bill_status === 'billed' && (
              <div className="space-y-4">
                 <p className="text-[10px] font-bold text-text-soft uppercase tracking-widest flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5" /> Billing & Payment
                 </p>
                 <div className="bg-navy p-6 rounded-[2rem] text-white space-y-4 shadow-xl shadow-navy/20 relative overflow-hidden">
                    <div className="flex justify-between items-center border-b border-white/10 pb-4">
                       <div>
                          <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Bill Number</p>
                          <p className="text-lg font-bold">{request.bill_number}</p>
                       </div>
                       <div className="flex items-center gap-2">
                          <button
                            onClick={emailBillPdf}
                            disabled={emailingBill}
                            className="p-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-all shadow-md flex items-center gap-1 text-xs font-bold disabled:opacity-50"
                            title="Send Bill PDF via Gmail"
                          >
                             {emailingBill ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                             <span className="hidden sm:inline">Email</span>
                          </button>
                          <button
                            onClick={shareWhatsAppBill}
                            className="p-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl transition-all shadow-md flex items-center gap-1 text-xs font-bold"
                            title="Share Bill via WhatsApp"
                          >
                             <MessageSquare className="h-4 w-4" />
                             <span className="hidden sm:inline">WhatsApp</span>
                          </button>
                          <button
                            onClick={downloadBillPdf}
                            className="p-2.5 bg-blue hover:bg-blue-600 text-white rounded-xl transition-all shadow-md flex items-center gap-1 text-xs font-bold"
                            title="Download Bill PDF"
                          >
                             <Download className="h-4 w-4" />
                             <span>PDF</span>
                          </button>
                       </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div>
                          <p className="text-[10px] text-gray-400 uppercase font-bold">Total Amount</p>
                          <p className="text-xl font-black">{formatCurrencyValue(request.bill_amount || 0)}</p>
                       </div>
                       <div className="text-right">
                          <p className="text-[10px] text-gray-400 uppercase font-bold">Status</p>
                          <p className={`text-sm font-black uppercase ${request.payment_status === 'paid' ? 'text-green-400' : 'text-orange-400'}`}>
                             {request.payment_status}
                          </p>
                       </div>
                    </div>
                 </div>
              </div>
           )}

           <div className="pt-4 opacity-50">
              <p className="text-[10px] text-text-soft font-medium flex items-center gap-2">
                 <History className="h-3 w-3" />
                 Ticket lifecycle updated {new Date(request.created_at).toLocaleString()}
              </p>
           </div>
        </div>

        <div className="p-8 border-t bg-gray-50 flex flex-col gap-3">
           {canWrite && (
           <>
           {request.bill_status !== 'billed' && (linkedDc ? (
              <button
                onClick={() => setDispatchOpen(true)}
                className="w-full px-6 py-3 bg-navy text-white rounded-2xl text-sm font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-navy/20"
              >
                 <Pencil className="h-4 w-4" /> View / Update DC — {linkedDc.challan_number}
              </button>
           ) : canDispatch && (
              <button
                onClick={() => setDispatchOpen(true)}
                className="w-full px-6 py-3 bg-navy text-white rounded-2xl text-sm font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-navy/20"
              >
                 <Truck className="h-4 w-4" /> Dispatch via DC ({dispatchItems.length} item{dispatchItems.length > 1 ? 's' : ''})
              </button>
           ))}
           {linkedDc && linkedDc.billing_status === 'pending' && !linkedDc.voided && (
              <button
                onClick={() => setReturnOpen(true)}
                className="w-full px-6 py-3 bg-amber-500 text-white rounded-2xl text-sm font-bold hover:bg-amber-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
              >
                 <Package className="h-4 w-4" /> Record Return — {linkedDc.challan_number}
              </button>
           )}
           <div className="grid grid-cols-2 gap-3">
              {request.status === 'Pending' && (
                 <button
                  onClick={() => handleAction('assign')}
                  className="col-span-2 px-6 py-3 bg-blue text-white rounded-2xl text-sm font-bold hover:bg-blue-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue/20"
                 >
                   <Calendar className="h-4 w-4" /> Assign Technician
                 </button>
              )}
              {request.status === 'Completed' && request.bill_status !== 'billed' && (
                 <button
                  onClick={() => handleAction('bill')}
                  className="col-span-2 px-6 py-3 bg-green-600 text-white rounded-2xl text-sm font-bold hover:bg-green-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-600/20"
                 >
                   <FileText className="h-4 w-4" /> Generate Bill
                 </button>
              )}
               {request.bill_status === 'billed' && request.payment_status !== 'paid' && (
                  <button
                   onClick={() => handleAction('payment')}
                   className="col-span-2 px-6 py-3 bg-blue text-white rounded-2xl text-sm font-bold hover:bg-blue-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue/20"
                  >
                    <IndianRupee className="h-4 w-4" /> Record Payment
                  </button>
               )}
               {request.status === 'Completed' && (
                  <button
                   onClick={() => { setAmcOpen(true); }}
                   className="col-span-2 px-6 py-3 bg-teal-500 text-white rounded-2xl text-sm font-bold hover:bg-teal-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20"
                  >
                    <RefreshCw className="h-4 w-4" /> Start AMC / Recurring Service
                  </button>
               )}
               {request.survey_status === 'submitted' && !quotation && (
                  <button
                   onClick={() => setQuoteOpen(true)}
                   className="col-span-2 px-6 py-3 bg-purple-600 text-white rounded-2xl text-sm font-bold hover:bg-purple-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20"
                  >
                    <FileText className="h-4 w-4" /> Prepare Quotation from Survey
                  </button>
               )}
               {quotation && (
                  <button
                   onClick={() => navigate(`/quotations/${quotation.id}`)}
                   className="col-span-2 px-6 py-3 bg-green-600 text-white rounded-2xl text-sm font-bold hover:bg-green-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-600/20"
                  >
                    <FileText className="h-4 w-4" /> View Quotation {quotation.quote_number}
                  </button>
               )}
           </div>

           {request.status !== 'Completed' && request.status !== 'Canceled' && (
              <button
                onClick={() => handleAction('cancel')}
                className="w-full py-3 text-red-500 text-xs font-bold uppercase tracking-widest hover:bg-red-50 rounded-2xl transition-colors flex items-center justify-center gap-2"
              >
                 Cancel Request
              </button>
           )}
           </>
           )}
        </div>
      </div>

      {rfqOpen && (
        <RequestSupplierQuoteModal
           request={request}
           onClose={() => setRfqOpen(false)}
           onSuccess={onUpdate}
        />
      )}

      {amcOpen && (
        <RecurringScheduleModal
          schedule={null}
          prefill={{
            customer_name: request.customer_name || '',
            customer_mobile: request.customer_mobile || '',
            device_type: request.device_type || '',
            description: `AMC for ${request.device_type || 'service'}`,
            start_date: new Date().toISOString().slice(0, 10),
            next_due_date: new Date().toISOString().slice(0, 10),
          }}
          onClose={() => setAmcOpen(false)}
          onSuccess={onUpdate}
        />
      )}

      {modal === 'assign' && (
        <AssignTechModal
           requestId={request.id}
           onClose={() => setModal(null)}
           onSuccess={onUpdate}
        />
      )}

      {modal === 'bill' && (
        <GenerateBillModal
           request={request}
           onClose={() => setModal(null)}
           onSuccess={onUpdate}
        />
      )}

      {modal === 'payment' && (
        <RecordPaymentModal
           requestId={request.id}
           remaining={(request.bill_amount || 0) - (request.amount_paid || 0) - (request.discount_amount || 0)}
           onClose={() => setModal(null)}
           onSuccess={onUpdate}
        />
      )}

      {quoteOpen && survey && (
        <QuotationComposer
          context={{
            type: 'service',
            customerName: request.customer_name || '',
            customerMobile: request.customer_mobile || '',
            serviceRequestId: request.id,
            initialLines: buildQuoteItems(survey)
          }}
          onClose={() => setQuoteOpen(false)}
          onSuccess={() => {
            serviceRequestService.getQuotationsForRequest(request.id)
              .then(d => { if (d.quotation) setQuotation(d.quotation); })
              .catch(() => {});
            onUpdate();
            navigate('/quotations');
          }}
        />
      )}

      {dispatchOpen && (
        <DispatchModal
          request={request}
          initialItems={dispatchItems}
          existing={linkedDc}
          onClose={() => setDispatchOpen(false)}
          onSuccess={() => {
            challanService.getChallanForSource('service', request.id)
              .then(d => setLinkedDc(d || null))
              .catch(() => {});
            queryClient.invalidateQueries({ queryKey: ['challans'] });
            onUpdate();
            setDispatchOpen(false);
          }}
        />
      )}

      {returnOpen && linkedDc && (
        <ChallanReturnModal
          dc={linkedDc}
          onClose={() => setReturnOpen(false)}
          onConfirm={async (payload) => {
            await challanService.returnItems(linkedDc.id, payload);
            const updated = await challanService.getChallanForSource('service', request.id);
            toast('Items returned and stock updated', 'success');
            setLinkedDc(updated || linkedDc);
            setReturnOpen(false);
            queryClient.invalidateQueries({ queryKey: ['challans'] });
            onUpdate();
          }}
        />
      )}
    </div>
  );
};

const DispatchModal = ({ request, initialItems, existing, onClose, onSuccess }: {
  request: ServiceRequest;
  initialItems: { productId: string | null; name: string; qty: number; rate: number; unit: string }[];
  existing?: any;
  onClose: () => void;
  onSuccess: () => void;
}) => {
  const [items, setItems] = useState<any[]>(() => {
    const base = existing?.items?.length
      ? existing.items.map((i: any) => ({ productId: null, name: i.item_name, qty: i.qty, rate: i.unit_price, unit: 'x' }))
      : initialItems;
    return base.map((i: any) => ({ ...i }));
  });
  const isUpdate = Boolean(existing);
  const [dispatchDate, setDispatchDate] = useState((existing?.dispatch_date || new Date().toISOString()).slice(0, 10));
  const [receiver, setReceiver] = useState(existing?.receiver_name || request.customer_name || '');
  const [notes, setNotes] = useState(existing?.notes || `Hand to tech ${request.service_person || ''} - customer's electricians to install`.trim());
  const [submitting, setSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const total = items.reduce((s, i) => s + (i.qty * i.rate), 0);

  const handleCreate = async () => {
    const validItems = items.filter(i => i.name && i.qty > 0);
    if (!validItems.length) return toast('No item to dispatch', 'error');

    setSubmitting(true);
    try {
      const res = await challanService.createChallan({
        sourceType: 'service',
        sourceId: request.id,
        items: validItems.map(i => ({ productId: i.productId, name: i.name, qty: i.qty, rate: i.rate })),
        dispatchDate,
        receiverName: receiver,
        notes,
      });
      toast(`${isUpdate ? 'DC updated' : 'DC created'}: ${res.challan_number}`, 'success');
      queryClient.invalidateQueries({ queryKey: ['challans'] });
      onSuccess();
      if (!isUpdate) window.open(`/api/sales/challans/${res.id}.pdf`, '_blank');
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to save DC', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-navy/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl p-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-black text-navy flex items-center gap-2">
              <Truck className="h-5 w-5 text-blue" /> {isUpdate ? `Update DC — ${existing.challan_number}` : 'Dispatch via DC'}
            </h3>
            <p className="text-xs text-text-soft font-bold uppercase tracking-tight">Service Request {request.id} {isUpdate ? '· saving records the dispatch date' : ''}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-text-soft">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y">
            {items.map((item, idx) => (
              <div key={idx} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 bg-gray-50/30">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-navy">{item.name}</p>
                  <p className="text-[10px] text-text-soft uppercase font-bold">Dispatch to site</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl px-2 py-1">
                    <button
                      onClick={() => setItems(items.map((i, ix) => ix === idx ? { ...i, qty: Math.max(1, i.qty - 1) } : i))}
                      className="p-0.5 hover:bg-gray-100 rounded text-text-soft"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={item.qty}
                      onChange={e => setItems(items.map((i, ix) => ix === idx ? { ...i, qty: Math.max(1, Math.floor(Number(e.target.value) || 1)) } : i))}
                      className="font-bold text-navy w-16 text-center text-sm outline-none bg-transparent"
                    />
                    <span className="text-xs text-text-soft font-bold w-7">{item.unit || 'x'}</span>
                    <button
                      onClick={() => setItems(items.map((i, ix) => ix === idx ? { ...i, qty: i.qty + 1 } : i))}
                      className="p-0.5 hover:bg-gray-100 rounded text-blue"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl px-2 py-1">
                    <span className="text-xs text-text-soft font-bold">Rs.</span>
                    <input
                      type="number"
                      value={item.rate}
                      onChange={e => setItems(items.map((i, ix) => ix === idx ? { ...i, rate: Number(e.target.value) || 0 } : i))}
                      className="w-20 text-sm font-bold text-right outline-none"
                    />
                  </div>
                  <span className="text-sm font-black text-blue w-20 text-right">{formatCurrencyValue(item.qty * item.rate)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Dispatch Date</label>
              <input
                type="date"
                value={dispatchDate}
                onChange={e => setDispatchDate(e.target.value)}
                className="w-full px-4 py-2.5 border-2 border-gray-200 bg-white rounded-2xl outline-none focus:border-blue/20 transition-all text-sm font-medium"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Receiver / Consignee</label>
              <input
                value={receiver}
                onChange={e => setReceiver(e.target.value)}
                className="w-full px-4 py-2.5 border-2 border-gray-200 bg-white rounded-2xl outline-none focus:border-blue/20 transition-all text-sm font-medium"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Dispatch Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 bg-white rounded-2xl outline-none focus:border-blue/20 transition-all text-sm font-medium resize-none"
            />
          </div>

          <div className="flex items-center justify-between bg-navy rounded-2xl px-5 py-4">
            <div>
              <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">DC Value</p>
              <p className="text-lg font-black text-white">{formatCurrencyValue(total)}</p>
            </div>
            <p className="text-[10px] text-gray-400 uppercase font-bold text-right leading-relaxed">
              Stock deducts in meters<br />on generation
            </p>
          </div>

          <button
            onClick={handleCreate}
            disabled={submitting || !items.some(i => i.qty > 0)}
            className="w-full py-3.5 bg-navy text-white rounded-2xl font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-xl shadow-navy/20 flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Truck className="h-5 w-5" />}
            {isUpdate ? 'Save & Update DC' : 'Save & Generate DC'}
          </button>
        </div>
      </div>
    </div>
  );
};

const ReturnModal = ({ dc, onClose, onSuccess }: {
  dc: any;
  onClose: () => void;
  onSuccess: (updated: any) => void;
}) => {
  const [returns, setReturns] = useState<Record<number, number>>({});
  const [submitting, setSubmitting] = useState(false);

  const setReturn = (itemId: number, qty: number) => {
    setReturns(prev => ({ ...prev, [itemId]: qty }));
  };

  const returnedTotal = dc.items.reduce((s: number, it: any) =>
    s + (Math.min(Number(returns[it.id]) || 0, it.qty) * it.unit_price), 0);
  const projectedValue = (dc.total_value || 0) - returnedTotal;

  const handleConfirm = async () => {
    const payload: Record<string, number> = {};
    dc.items.forEach((it: any) => {
      const q = Math.min(Number(returns[it.id]) || 0, it.qty);
      if (q > 0) payload[it.id] = q;
    });
    if (!Object.keys(payload).length) return toast('Enter a returned quantity', 'error');

    setSubmitting(true);
    try {
      await challanService.returnItems(dc.id, payload);
      const updated = await challanService.getChallanForSource('service', dc.source_id);
      toast('Items returned and stock updated', 'success');
      if (updated) onSuccess(updated); else onClose();
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to record return', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-navy/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl p-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-black text-navy flex items-center gap-2">
              <Undo2 className="h-5 w-5 text-amber-500" /> Record Return
            </h3>
            <p className="text-xs text-text-soft font-bold uppercase tracking-tight">{dc.challan_number} — unused items picked up from site return to stock</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-text-soft">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y">
            {dc.items.map((it: any) => (
              <div key={it.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 bg-amber-50/30">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-navy">{it.item_name}</p>
                  <p className="text-[10px] text-text-soft uppercase font-bold">
                    Dispatched {it.qty} · Rs. {it.unit_price} each
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={it.qty}
                    value={returns[it.id] || 0}
                    onChange={e => setReturn(it.id, Number(e.target.value))}
                    className="w-20 border-2 border-amber-200 bg-white rounded-xl px-3 py-1.5 text-sm font-bold text-right outline-none focus:border-amber-400 transition-all"
                  />
                  <span className="text-xs text-text-soft font-bold">of {it.qty} return</span>
                  <span className="text-sm font-black text-blue w-20 text-right">
                    {formatCurrencyValue((it.qty - Math.min(Number(returns[it.id]) || 0, it.qty)) * it.unit_price)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-navy rounded-2xl px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">DC Value After Return</p>
              <p className="text-lg font-black text-white">{formatCurrencyValue(projectedValue)}</p>
            </div>
            <p className="text-[10px] text-gray-400 uppercase font-bold text-right leading-relaxed">
              Returning<br />{formatCurrencyValue(returnedTotal)}<br />back to stock
            </p>
          </div>

          <button
            onClick={handleConfirm}
            disabled={submitting}
            className="w-full py-3.5 bg-amber-500 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-amber-600 transition-all shadow-xl shadow-amber-500/20 flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Undo2 className="h-5 w-5" />}
            Confirm Return
          </button>
        </div>
      </div>
    </div>
  );
};

export default ServiceDetailDrawer;
