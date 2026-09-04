import React, { useState } from 'react';
import { X, User, Loader2, Save, Calendar } from 'lucide-react';
import { serviceRequestService } from '../services/serviceRequestService';
import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';
import { toast } from '../utils/toast';

interface Props {
  requestId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const AssignTechModal = ({ requestId, onClose, onSuccess }: Props) => {
  const [loading, setLoading] = useState(false);
  const [techId, setTechId] = useState('');

  const { data: technicians } = useQuery({
    queryKey: ['technicians-lookup'],
    queryFn: async () => {
      const res = await api.get('/admin/technicians');
      return res.data.technicians;
    }
  });

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!techId) return toast('Select a technician', 'error');

    setLoading(true);
    try {
      const tech = technicians?.find((t: any) => t.id === techId);
      await serviceRequestService.assignTechnician(requestId, techId, tech?.name || '');
      toast('Technician assigned successfully', 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast(err.response?.data?.error || 'Assignment failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-navy/20 backdrop-blur-sm">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 bg-gray-50 border-b flex justify-between items-center">
           <h3 className="font-bold text-navy uppercase text-xs tracking-widest">Dispatch Task</h3>
           <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition-colors"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={handleAssign} className="p-6 space-y-6">
           <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Select Service Expert</label>
              <div className="relative">
                 <User className="absolute left-3 top-2.5 h-4 w-4 text-text-soft" />
                 <select
                   required
                   className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 bg-white rounded-xl text-sm outline-none focus:border-blue/40 transition-all appearance-none font-bold text-navy"
                   value={techId}
                   onChange={e => setTechId(e.target.value)}
                 >
                    <option value="">Choose Technician...</option>
                    {technicians?.map((t: any) => (
                       <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                 </select>
              </div>
           </div>
           <button
             disabled={loading || !techId}
             className="w-full py-3 bg-blue text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-blue-600 transition-all shadow-lg shadow-blue/20 flex justify-center items-center gap-2"
           >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Confirm Assignment
           </button>
        </form>
      </div>
    </div>
  );
};

export default AssignTechModal;
