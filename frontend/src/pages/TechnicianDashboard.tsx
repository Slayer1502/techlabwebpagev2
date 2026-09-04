import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../components/Layout';
import { serviceRequestService } from '../services/serviceRequestService';
import { useAuthStore } from '../store/authStore';
import {
  Wrench,
  Clock,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  AlertCircle,
  Calendar,
  MapPin,
  Camera,
  MessageSquare
} from 'lucide-react';
import { formatCurrencyValue, formatDateValue, isSiteVisitType } from '../utils/helpers';
import { useNavigate } from 'react-router-dom';
import UsedItemsModal from '../components/UsedItemsModal';
import { toast } from '../utils/toast';

const TechnicianDashboard = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<'complete' | 'update'>('complete');

  const { data: requests, isLoading } = useQuery({
    queryKey: ['tech-tasks'],
    queryFn: () => serviceRequestService.getRequests('technician'),
  });

  const currentRequest = requests?.find(r => r.id === selectedRequestId);

  const completeMutation = useMutation({
    mutationFn: async ({ id, data, notes, mode }: { id: string, data: any, notes?: string, mode: 'complete' | 'update' }) => {
      if (notes !== undefined) {
        await serviceRequestService.updateNotes(id, notes);
      }
      return mode === 'complete'
        ? serviceRequestService.completeJob(id, data)
        : serviceRequestService.updateJobProgress(id, data);
    },
    onSuccess: (_, variables) => {
      toast(variables.mode === 'complete' ? 'Job marked as complete' : 'Progress & Notes saved', 'success');
      queryClient.invalidateQueries({ queryKey: ['tech-tasks'] });
      setSelectedRequestId(null);
    },
    onError: (err: any) => {
      toast(err.response?.data?.error || 'Action failed', 'error');
    }
  });

  if (isLoading) return (
    <Layout>
      <div className="animate-pulse space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map(i => <div key={i} className="h-32 bg-white rounded-3xl"></div>)}
        </div>
        <div className="h-96 bg-white rounded-3xl"></div>
      </div>
    </Layout>
  );

  const pendingJobs = requests?.filter(r => r.status === 'Scheduled') || [];
  const completedToday = requests?.filter(r => r.status === 'Completed') || [];

  return (
    <Layout>
      <div className="space-y-8 pb-10">
        <div className="flex justify-between items-center">
           <div>
              <h1 className="text-2xl font-bold text-navy tracking-tight">Tech Console</h1>
              <p className="text-text-soft text-sm font-medium">Your assigned field tasks and site surveys</p>
           </div>
           <div className="h-12 w-12 rounded-2xl bg-navy flex items-center justify-center text-white font-black text-xl shadow-lg shadow-navy/20">
              {pendingJobs.length}
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-6">
              <div className="p-4 rounded-2xl bg-blue text-white shadow-lg shadow-blue/20">
                 <Calendar className="h-6 w-6" />
              </div>
              <div>
                 <p className="text-[10px] font-bold text-text-soft uppercase tracking-widest mb-1">Today's Jobs</p>
                 <p className="text-2xl font-black text-navy">{pendingJobs.length}</p>
              </div>
           </div>
           <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-6">
              <div className="p-4 rounded-2xl bg-green-500 text-white shadow-lg shadow-green-500/20">
                 <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                 <p className="text-[10px] font-bold text-text-soft uppercase tracking-widest mb-1">Completed</p>
                 <p className="text-2xl font-black text-navy">{completedToday.length}</p>
              </div>
           </div>
           <div className="bg-navy p-6 rounded-[2rem] text-white shadow-xl shadow-navy/30 flex items-center gap-6 md:col-span-2 lg:col-span-1 overflow-hidden relative">
              <Camera className="absolute -right-2 -bottom-2 h-16 w-16 text-white/5 rotate-12" />
              <div className="p-4 rounded-2xl bg-white/10">
                 <Wrench className="h-6 w-6" />
              </div>
              <div>
                 <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Performance</p>
                 <p className="text-lg font-bold">Field Expert Mode</p>
              </div>
           </div>
        </div>

        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
           <div className="p-6 border-b flex justify-between items-center bg-gray-50/50">
              <h2 className="font-bold text-navy flex items-center gap-2">
                 <ClipboardList className="h-5 w-5 text-blue" /> Priority Task List
              </h2>
           </div>
           <div className="divide-y">
              {pendingJobs.map(r => (
                 <div key={r.id} className="p-6 hover:bg-soft/20 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6 group">
                    <div className="flex-1 space-y-2">
                       <div className="flex items-center gap-3">
                          <h3 className="font-black text-navy text-lg">{r.customer_name}</h3>
                          <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest">Active</span>
                       </div>
                       <p className="text-sm font-bold text-blue flex items-center gap-2">
                          <Wrench className="h-4 w-4" /> {r.device_type}
                       </p>
                       <p className="text-xs text-text-soft leading-relaxed pr-8 italic">
                          "{r.issue}"
                       </p>
                       {r.status_notes && (
                          <div className="flex items-center gap-2 text-[10px] text-blue font-bold uppercase bg-blue/5 self-start px-2 py-0.5 rounded border border-blue/10">
                             <MessageSquare className="h-3 w-3" /> {r.status_notes.slice(0, 50)}{r.status_notes.length > 50 ? '...' : ''}
                          </div>
                       )}
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                       <div className="space-y-1">
                          <div className="flex items-center gap-2 text-xs font-bold text-navy">
                             <Calendar className="h-3.5 w-3.5 text-text-soft" />
                             {formatDateValue(r.scheduled_date || r.preferred_date)}
                          </div>
                          <div className="flex items-center gap-2 text-xs font-bold text-navy">
                             <MapPin className="h-3.5 w-3.5 text-text-soft" />
                             On-Site Assignment
                          </div>
                       </div>

                       {isSiteVisitType(r.device_type) ? (
                          <button
                             onClick={() => navigate(`/tickets/${r.id}/survey`)}
                            className="px-6 py-3 bg-blue text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg shadow-blue/20"
                          >
                             Start Survey
                          </button>
                       ) : (
                          <div className="flex gap-2">
                             <button
                               onClick={() => { setSelectedRequestId(r.id); setModalMode('update'); }}
                               className="px-5 py-3 bg-soft text-blue rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue/10 transition-all border border-blue/10"
                             >
                                Update
                             </button>
                             <button
                               onClick={() => { setSelectedRequestId(r.id); setModalMode('complete'); }}
                               className="px-5 py-3 bg-green-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-green-700 transition-all shadow-lg shadow-green-600/20"
                             >
                                Complete
                             </button>
                          </div>
                       )}
                    </div>
                 </div>
              ))}

              {pendingJobs.length === 0 && (
                 <div className="p-20 text-center text-text-soft">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-20 text-green-500" />
                    <p className="font-bold">No active jobs assigned to you.</p>
                    <p className="text-xs">Take a break or check back later for new tickets.</p>
                 </div>
              )}
           </div>
        </div>
      </div>

      {selectedRequestId && (
        <UsedItemsModal
          onClose={() => setSelectedRequestId(null)}
          loading={completeMutation.isPending}
          mode={modalMode}
          initialItems={currentRequest?.used_items}
          initialConveyance={currentRequest?.conveyance_expense}
          initialNotes={currentRequest?.status_notes}
          onConfirm={(items, conveyance, notes) => {
            completeMutation.mutate({
              id: selectedRequestId,
              data: {
                used_items: items,
                conveyance_expense: conveyance
              },
              notes,
              mode: modalMode
            });
          }}
        />
      )}
    </Layout>
  );
};

export default TechnicianDashboard;
