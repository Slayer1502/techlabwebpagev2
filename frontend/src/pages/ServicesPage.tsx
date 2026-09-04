import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../components/Layout';
import { serviceRequestService } from '../services/serviceRequestService';
import { useAuthStore } from '../store/authStore';
import {
  Wrench,
  Plus,
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  Calendar,
  User,
  MoreVertical,
  ChevronRight,
  ClipboardList,
  MessageSquare
} from 'lucide-react';
import { formatDateValue } from '../utils/helpers';
import { ServiceRequest } from '../types';
import UsedItemsModal from '../components/UsedItemsModal';
import { toast } from '../utils/toast';
import ServiceRequestModal from '../components/ServiceRequestModal';
import ServiceDetailDrawer from '../components/ServiceDetailDrawer';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const StatusBadge = ({ status }: { status: string }) => {
  const styles: any = {
    Pending: "bg-orange-100 text-orange-600",
    Scheduled: "bg-blue-100 text-blue-600",
    Completed: "bg-green-100 text-green-600",
    Canceled: "bg-red-100 text-red-600"
  };
  return (
    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
};

const ServicesPage = () => {
  const [searchParams] = useSearchParams();
  const initialStatus = searchParams.get('status');
  const initialBill = searchParams.get('bill');
  const initialSearch = searchParams.get('q') || (initialStatus && !['Completed', 'Pending', 'Scheduled', 'Canceled'].includes(initialStatus) ? initialStatus : '');

  const [search, setSearch] = useState(initialSearch);
  const [isUsedItemsModalOpen, setIsUsedItemsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<'complete' | 'update'>('complete');
  const [viewingRequest, setViewingRequest] = useState<ServiceRequest | null>(null);

  const initialTab = (initialStatus === 'Completed' || initialBill === 'pending')
    ? 'billing'
    : (initialStatus === 'Canceled' ? 'archive' : 'ongoing');

  const [activeTab, setActiveTab] = useState<'ongoing' | 'billing' | 'archive'>(initialTab);
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: requests, isLoading } = useQuery({
    queryKey: ['service-requests', user?.role],
    queryFn: () => serviceRequestService.getRequests(user?.role || ''),
    enabled: !!user?.role
  });

  const currentRequest = requests?.find(r => r.id === selectedRequestId);

  const completeJobMutation = useMutation({
    mutationFn: async ({ id, data, notes, mode }: { id: string, data: any, notes?: string, mode: 'complete' | 'update' }) => {
      if (notes !== undefined) {
        await serviceRequestService.updateNotes(id, notes);
      }
      return mode === 'complete'
        ? serviceRequestService.completeJob(id, data)
        : serviceRequestService.updateJobProgress(id, data);
    },
    onSuccess: (_, variables) => {
      toast(variables.mode === 'complete' ? 'Job marked as complete' : 'Progress saved', 'success');
      queryClient.invalidateQueries({ queryKey: ['service-requests'] });
      setIsUsedItemsModalOpen(false);
    },
    onError: (err: any) => {
      toast(err.response?.data?.error || 'Action failed', 'error');
    }
  });

  const handleOpenCompletion = (id: string, mode: 'complete' | 'update') => {
    setSelectedRequestId(id);
    setModalMode(mode);
    setIsUsedItemsModalOpen(true);
  };

  const handleConfirmCompletion = (items: any[], conveyance: number, notes: string) => {
    if (!selectedRequestId) return;
    completeJobMutation.mutate({
      id: selectedRequestId,
      data: {
        used_items: items,
        conveyance_expense: conveyance
      },
      notes,
      mode: modalMode
    });
  };

  const filteredRequests = requests?.filter(r => {
    const matchesSearch = r.customer_name.toLowerCase().includes(search.toLowerCase()) ||
                         r.customer_mobile.includes(search) ||
                         r.device_type.toLowerCase().includes(search.toLowerCase());

    if (activeTab === 'ongoing') {
        return matchesSearch && r.status !== 'Completed' && r.status !== 'Canceled';
    } else if (activeTab === 'billing') {
        return matchesSearch && r.status === 'Completed' && r.payment_status !== 'paid';
    } else {
        return matchesSearch && (r.status === 'Canceled' || (r.status === 'Completed' && r.payment_status === 'paid'));
    }
  });

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-navy text-center md:text-left">Service Management</h1>
            <p className="text-text-soft text-sm text-center md:text-left">Track and manage installation and repair requests</p>
          </div>
          {['admin', 'sales'].includes(user?.role || '') && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center justify-center gap-2 bg-blue text-white px-6 py-2.5 rounded-xl font-bold hover:bg-blue-600 transition-all shadow-lg shadow-blue/20"
            >
              <Plus className="h-5 w-5" />
              New Request
            </button>
          )}
        </div>

        {/* Search & Tabs */}
        <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4">
          <div className="flex bg-gray-50 rounded-xl p-1 md:w-fit">
            <button
              onClick={() => setActiveTab('ongoing')}
              className={cn(
                "px-6 py-2 text-xs font-bold rounded-lg transition-all",
                activeTab === 'ongoing' ? "bg-white text-blue shadow-sm" : "text-text-soft hover:bg-gray-100"
              )}
            >
              Ongoing
            </button>
            <button
              onClick={() => setActiveTab('billing')}
              className={cn(
                "px-6 py-2 text-xs font-bold rounded-lg transition-all relative",
                activeTab === 'billing' ? "bg-white text-blue shadow-sm" : "text-text-soft hover:bg-gray-100"
              )}
            >
              Billing & Action
              {requests?.filter(r => r.status === 'Completed' && r.payment_status !== 'paid').length! > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white shadow-sm animate-bounce">
                    {requests?.filter(r => r.status === 'Completed' && r.payment_status !== 'paid').length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('archive')}
              className={cn(
                "px-6 py-2 text-xs font-bold rounded-lg transition-all",
                activeTab === 'archive' ? "bg-white text-blue shadow-sm" : "text-text-soft hover:bg-gray-100"
              )}
            >
              Archive
            </button>
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-soft" />
            <input
              type="text"
              placeholder="Search by customer, mobile, or device..."
              className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 bg-white rounded-xl outline-none focus:border-blue/40 transition-all text-sm"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-4 animate-pulse">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white h-24 rounded-2xl border border-gray-100"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredRequests?.map((req: ServiceRequest) => (
              <div
                key={req.id}
                onClick={() => setViewingRequest(req)}
                className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group cursor-pointer"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "p-3 rounded-xl transition-colors",
                      req.status === 'Completed' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'
                    )}>
                      <Wrench className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-navy">{req.customer_name}</h3>
                        <StatusBadge status={req.status} />
                      </div>
                      <p className="text-sm text-text-soft flex items-center gap-2">
                        <span className="font-medium text-navy">{req.device_type}</span>
                        <span>•</span>
                        <span>{req.customer_mobile}</span>
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-1 gap-4 md:gap-1 text-right">
                    <div className="text-left md:text-right">
                      <p className="text-[10px] text-text-soft font-bold uppercase mb-0.5">Scheduled Date</p>
                      <p className="text-sm font-semibold text-navy flex items-center md:justify-end gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-blue" />
                        {formatDateValue(req.scheduled_date || req.preferred_date)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-text-soft font-bold uppercase mb-0.5">Technician</p>
                      <p className="text-sm font-semibold text-navy flex items-center justify-end gap-1.5">
                        <User className="h-3.5 w-3.5 text-blue" />
                        {req.service_person || req.assigned_employee_name || 'Unassigned'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-4 md:pt-0 border-t md:border-0" onClick={e => e.stopPropagation()}>
                    {user?.role === 'technician' && req.status !== 'Completed' && (
                       <>
                         <button
                           onClick={() => navigate(`/tickets/${req.id}/survey`)}
                          className="flex-1 md:flex-none bg-soft text-blue px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue/10 transition-colors border border-blue/10"
                         >
                           Survey
                         </button>
                         <button
                          onClick={() => handleOpenCompletion(req.id, 'update')}
                          className="flex-1 md:flex-none bg-soft text-navy px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-100 transition-colors border border-gray-200"
                         >
                           Update
                         </button>
                         <button
                          onClick={() => handleOpenCompletion(req.id, 'complete')}
                          className="flex-1 md:flex-none bg-blue text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-600 transition-colors"
                         >
                           Complete
                         </button>
                       </>
                    )}
                    {['admin', 'sales'].includes(user?.role || '') && (
                       <button
                        onClick={() => setViewingRequest(req)}
                        className="flex-1 md:flex-none bg-soft text-blue px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue/10 transition-colors border border-blue/10"
                       >
                         {req.status === 'Completed'
                           ? (req.bill_status === 'billed' ? 'Details' : 'Bill Now')
                           : 'Manage'}
                       </button>
                    )}
                    <button className="p-2 text-text-soft hover:bg-gray-100 rounded-lg">
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {req.issue && (
                  <div className="mt-4 pt-4 border-t border-dashed flex flex-col gap-2">
                    <p className="text-xs text-text-soft line-clamp-2 italic">
                      " {req.issue} "
                    </p>
                    {req.status_notes && (
                      <div className="flex items-center gap-2 text-[10px] text-blue font-bold uppercase bg-blue/5 self-start px-2 py-0.5 rounded border border-blue/10">
                        <MessageSquare className="h-3 w-3" /> Note: {req.status_notes.slice(0, 40)}{req.status_notes.length > 40 ? '...' : ''}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {filteredRequests?.length === 0 && !isLoading && (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
            <ClipboardList className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-navy">No requests found</h3>
            <p className="text-text-soft text-sm mt-1">Try adjusting your search</p>
          </div>
        )}
      </div>

      {isUsedItemsModalOpen && (
        <UsedItemsModal
          onClose={() => setIsUsedItemsModalOpen(false)}
          onConfirm={handleConfirmCompletion}
          loading={completeJobMutation.isPending}
          mode={modalMode}
          initialItems={currentRequest?.used_items}
          initialConveyance={currentRequest?.conveyance_expense}
          initialNotes={currentRequest?.status_notes}
        />
      )}

      {isCreateModalOpen && (
        <ServiceRequestModal
           onClose={() => setIsCreateModalOpen(false)}
           onSuccess={() => queryClient.invalidateQueries({ queryKey: ['service-requests'] })}
        />
      )}

      {viewingRequest && (
        <ServiceDetailDrawer
           request={viewingRequest}
           onClose={() => setViewingRequest(null)}
           onUpdate={() => queryClient.invalidateQueries({ queryKey: ['service-requests'] })}
        />
      )}
    </Layout>
  );
};

export default ServicesPage;
