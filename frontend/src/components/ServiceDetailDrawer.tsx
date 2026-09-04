import React, { useState, useEffect } from 'react';
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
  Camera as CameraIcon
} from 'lucide-react';
import { ServiceRequest } from '../types';
import { formatCurrencyValue, formatDateValue } from '../utils/helpers';
import api from '../utils/api';
import { toast } from '../utils/toast';
import { serviceRequestService } from '../services/serviceRequestService';
import AssignTechModal from './AssignTechModal';
import GenerateBillModal from './GenerateBillModal';
import RecordPaymentModal from './RecordPaymentModal';
import QuotationBuilder from './QuotationBuilder';

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
  const [quoteOpen, setQuoteOpen] = useState(false);

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
          await api.patch(`/sales/service-requests/${request.id}/cancel`, { reason: 'Cancelled by user' });
          toast('Request cancelled', 'success');
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

           {/* Section: Parts & Consumption */}
           {(parts || used.length > 0) && (
              <div className="space-y-4">
                 <p className="text-[10px] font-bold text-text-soft uppercase tracking-widest flex items-center gap-2">
                    <Package className="h-3.5 w-3.5" /> Parts & Consumables
                 </p>
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
                    {parts?.inventory?.map((p: any, idx: number) => (
                       <div key={`p-${idx}`} className="p-4 flex justify-between items-center opacity-60">
                          <div>
                             <p className="text-sm font-bold text-navy">{p.name}</p>
                             <p className="text-[10px] text-text-soft uppercase font-bold">{p.qty} Requested</p>
                          </div>
                          <span className="text-[10px] font-bold text-orange-500 uppercase">Sourcing</span>
                       </div>
                    ))}
                 </div>
              </div>
           )}

           {/* Section: Site Survey */}
           <div className="space-y-4">
              <div className="flex justify-between items-center">
                 <p className="text-[10px] font-bold text-text-soft uppercase tracking-widest flex items-center gap-2">
                    <CameraIcon className="h-3.5 w-3.5" /> Site Survey
                 </p>
                 {request.survey_status === 'submitted' && (
                   <button
                     onClick={() => setQuoteOpen(true)}
                     className="text-[10px] font-bold text-blue hover:text-blue-600 transition-all flex items-center gap-1 uppercase tracking-widest"
                   >
                      <FileText className="h-3 w-3" /> Prepare Quotation
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
               {request.survey_status === 'submitted' && (
                  <button
                   onClick={() => setQuoteOpen(true)}
                   className="col-span-2 px-6 py-3 bg-purple-600 text-white rounded-2xl text-sm font-bold hover:bg-purple-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20"
                  >
                    <FileText className="h-4 w-4" /> Prepare Quotation from Survey
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
        </div>
      </div>

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
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-6">
           <div className="absolute inset-0 bg-navy/60 backdrop-blur-sm" onClick={() => setQuoteOpen(false)}></div>
           <div className="relative w-full max-w-4xl bg-white h-[85vh] rounded-[2rem] shadow-2xl p-6 overflow-y-auto custom-scrollbar">
              <div className="flex items-center justify-between mb-4">
                 <h3 className="text-lg font-black text-navy">Prepare Quotation</h3>
                 <button onClick={() => setQuoteOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-text-soft">
                    <X className="h-5 w-5" />
                 </button>
              </div>
              <QuotationBuilder
                 onClose={() => setQuoteOpen(false)}
                 onSuccess={() => {
                    onUpdate();
                    setQuoteOpen(false);
                    navigate('/quotations');
                 }}
                 initialCustomerName={request.customer_name || ''}
                 initialCustomerMobile={request.customer_mobile || ''}
                 initialCustomerAddress={''}
                 initialServiceRequestId={request.id}
                 initialItems={buildQuoteItems(survey)}
              />
           </div>
        </div>
      )}
    </div>
  );
};

export default ServiceDetailDrawer;
