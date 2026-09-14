import React, { useState, useEffect } from 'react';
import { X, Loader2, Save, User, Smartphone, Monitor, Calendar, AlertCircle, Search, Laptop, Printer } from 'lucide-react';
import { serviceRequestService } from '../services/serviceRequestService';
import { partyService } from '../services/partyService';
import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

const LAPTOP_BRANDS = ['HP', 'Dell', 'Lenovo', 'Asus', 'Acer', 'MSI', 'Apple', 'Samsung', 'Other'];
const PRINTER_BRANDS = ['HP', 'Canon', 'Epson', 'Brother', 'Samsung', 'Ricoh', 'Xerox', 'Other'];

const ConditionChips = ({ name, options, value, onChange }: { name: string; options: string[]; value: string; onChange: (v: string) => void }) => (
  <div className="flex flex-wrap gap-1.5">
    {options.map(opt => (
      <button
        key={opt}
        type="button"
        onClick={() => onChange(value === opt ? '' : opt)}
        className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-all ${value === opt ? 'bg-blue text-white border-blue' : 'bg-white text-text-soft border-gray-200 hover:border-blue/40'}`}
      >
        {opt}
      </button>
    ))}
  </div>
);

const DeviceIntakeForm = ({ deviceType, intake, setIntake }: { deviceType: string; intake: any; setIntake: (v: any) => void }) => {
  const isLaptop = deviceType === 'Laptop / PC';
  const isPrinter = deviceType === 'Printer Service';
  const brands = isPrinter ? PRINTER_BRANDS : LAPTOP_BRANDS;
  const update = (field: string, val: any) => setIntake({ ...intake, [field]: val });

  return (
    <div className="space-y-5 p-5 bg-blue-50/50 rounded-2xl border border-blue-100">
      <h4 className="text-xs font-bold text-navy uppercase tracking-widest flex items-center gap-2">
        {isLaptop ? <Laptop className="h-4 w-4 text-blue" /> : <Printer className="h-4 w-4 text-blue" />}
        Device Intake — {isLaptop ? 'Laptop / PC' : 'Printer'}
      </h4>

      {/* Device Identification */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Brand *</label>
          <div className="flex gap-2">
            <select
              required
              className="flex-1 px-3 py-2 border-2 border-gray-200 bg-white rounded-xl text-sm font-medium outline-none focus:border-blue/40 transition-all"
              value={intake.brand || ''}
              onChange={e => update('brand', e.target.value)}
            >
              <option value="">Select</option>
              {brands.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            {intake.brand === 'Other' && (
              <input
                className="flex-1 px-3 py-2 border-2 border-gray-200 bg-white rounded-xl text-sm font-medium outline-none focus:border-blue/40 transition-all"
                placeholder="Brand name"
                value={intake.brandOther || ''}
                onChange={e => update('brandOther', e.target.value)}
              />
            )}
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Model *</label>
          <input
            required
            className="w-full px-3 py-2 border-2 border-gray-200 bg-white rounded-xl text-sm font-medium outline-none focus:border-blue/40 transition-all"
            placeholder="e.g. HP 15sdy, ThinkPad T480"
            value={intake.model || ''}
            onChange={e => update('model', e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Serial #</label>
          <input
            className="w-full px-3 py-2 border-2 border-gray-200 bg-white rounded-xl text-sm font-medium outline-none focus:border-blue/40 transition-all"
            placeholder="Optional"
            value={intake.serialNumber || ''}
            onChange={e => update('serialNumber', e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Color</label>
          <input
            className="w-full px-3 py-2 border-2 border-gray-200 bg-white rounded-xl text-sm font-medium outline-none focus:border-blue/40 transition-all"
            placeholder="e.g. Silver, Black"
            value={intake.color || ''}
            onChange={e => update('color', e.target.value)}
          />
        </div>
      </div>

      {/* Condition Checks - Laptop/PC */}
      {isLaptop && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Body Condition *</label>
              <ConditionChips name="body" options={['Good', 'Minor Scratches', 'Dents', 'Cracked']} value={intake.bodyCondition || ''} onChange={v => update('bodyCondition', v)} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Screen Condition *</label>
              <ConditionChips name="screen" options={['Good', 'Scratched', 'Cracked', 'Dead Pixels', 'No Display']} value={intake.screenCondition || ''} onChange={v => update('screenCondition', v)} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Keyboard *</label>
              <ConditionChips name="keyboard" options={['Good', 'Keys Issue', 'Missing Keys', 'Replaced']} value={intake.keyboardCondition || ''} onChange={v => update('keyboardCondition', v)} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Ports *</label>
              <ConditionChips name="ports" options={['All Working', 'Some Not Working', 'Not Checked']} value={intake.portsCheck || ''} onChange={v => update('portsCheck', v)} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Power On *</label>
              <ConditionChips name="power" options={['Yes', 'No', 'Not Tested']} value={intake.powerOn || ''} onChange={v => update('powerOn', v)} />
            </div>
          </div>
        </>
      )}

      {/* Condition Checks - Printer */}
      {isPrinter && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Body Condition *</label>
              <ConditionChips name="body" options={['Good', 'Minor Scratches', 'Dents', 'Cracked']} value={intake.bodyCondition || ''} onChange={v => update('bodyCondition', v)} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Paper Tray *</label>
              <ConditionChips name="tray" options={['Good', 'Damaged', 'Missing']} value={intake.paperTray || ''} onChange={v => update('paperTray', v)} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Print Head *</label>
              <ConditionChips name="head" options={['Working', 'Not Working', 'Not Checked']} value={intake.printHead || ''} onChange={v => update('printHead', v)} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Ink / Toner *</label>
              <ConditionChips name="ink" options={['Present', 'Empty', 'Not Checked']} value={intake.inkToner || ''} onChange={v => update('inkToner', v)} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Power On *</label>
              <ConditionChips name="power" options={['Yes', 'No', 'Not Tested']} value={intake.powerOn || ''} onChange={v => update('powerOn', v)} />
            </div>
          </div>
        </>
      )}

      {/* Accessories */}
      <div className="space-y-1">
        <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Accessories Received</label>
        <div className="flex flex-wrap gap-3">
          {(isLaptop ? ['Charger / Adapter', 'Carry Bag / Case', 'Mouse'] : ['Power Cable', 'USB Cable', 'Ink / Toner Cartridge']).map(acc => (
            <label key={acc} className="flex items-center gap-1.5 text-xs font-medium text-text-soft cursor-pointer">
              <input
                type="checkbox"
                checked={(intake.accessories || []).includes(acc)}
                onChange={e => {
                  const current = intake.accessories || [];
                  update('accessories', e.target.checked ? [...current, acc] : current.filter((a: string) => a !== acc));
                }}
                className="rounded"
              />
              {acc}
            </label>
          ))}
          <label className="flex items-center gap-1.5 text-xs font-medium text-text-soft cursor-pointer">
            <input
              type="checkbox"
              checked={!!intake.accessoriesOther}
              onChange={e => update('accessoriesOther', e.target.checked ? '' : undefined)}
              className="rounded"
            />
            Other:
            {intake.accessoriesOther !== undefined && (
              <input
                className="px-2 py-0.5 border border-gray-200 rounded-lg text-xs w-24 outline-none focus:border-blue/40"
                placeholder="Specify"
                value={intake.accessoriesOther || ''}
                onChange={e => update('accessoriesOther', e.target.value)}
              />
            )}
          </label>
        </div>
      </div>

      {/* Passwords */}
      {isLaptop && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-text-soft uppercase ml-1">BIOS Password</label>
            <input
              className="w-full px-3 py-2 border-2 border-gray-200 bg-white rounded-xl text-sm font-medium outline-none focus:border-blue/40 transition-all"
              placeholder="Optional"
              value={intake.biosPassword || ''}
              onChange={e => update('biosPassword', e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Windows Login Password</label>
            <input
              className="w-full px-3 py-2 border-2 border-gray-200 bg-white rounded-xl text-sm font-medium outline-none focus:border-blue/40 transition-all"
              placeholder="Optional"
              value={intake.loginPassword || ''}
              onChange={e => update('loginPassword', e.target.value)}
            />
          </div>
        </div>
      )}
      {isPrinter && (
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Network Password</label>
          <input
            className="w-full px-3 py-2 border-2 border-gray-200 bg-white rounded-xl text-sm font-medium outline-none focus:border-blue/40 transition-all"
            placeholder="Optional"
            value={intake.networkPassword || ''}
            onChange={e => update('networkPassword', e.target.value)}
          />
        </div>
      )}

      {/* Pre-existing Damage */}
      <div className="space-y-1">
        <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Pre-existing Damage Notes *</label>
        <textarea
          required
          rows={2}
          className="w-full px-4 py-2.5 border-2 border-gray-200 bg-white rounded-xl text-sm font-medium outline-none focus:border-blue/40 transition-all resize-none"
          placeholder="Describe any pre-existing damage (scratches, dents, cracks, etc.). Customer confirmed."
          value={intake.preExistingDamage || ''}
          onChange={e => update('preExistingDamage', e.target.value)}
        />
      </div>
    </div>
  );
};

const ServiceRequestModal = ({ onClose, onSuccess }: Props) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    customerName: '',
    customer_mobile: '',
    device_type: 'CCTV System',
    issue: '',
    preferred_date: '',
    technicianId: '',
    technicianName: '',
  });

  const [deviceIntake, setDeviceIntake] = useState<any>({});
  const [nameSearch, setNameSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const { data: technicians } = useQuery({
    queryKey: ['technicians-lookup'],
    queryFn: async () => {
      const res = await api.get('/admin/technicians');
      return res.data.technicians;
    }
  });

  const { data: customers } = useQuery({
    queryKey: ['customers-lookup'],
    queryFn: () => partyService.getCustomers(),
  });

  const suggestions = customers?.filter((c: any) =>
    (c.name && c.name.toLowerCase().includes(nameSearch.toLowerCase())) ||
    (c.mobile && c.mobile.includes(nameSearch))
  ).slice(0, 5) || [];

  const handleSelectCustomer = (c: any) => {
    setFormData({ ...formData, customerName: c.name, customer_mobile: c.mobile });
    setNameSearch(c.name);
    setShowSuggestions(false);
  };

  const showIntake = formData.device_type === 'Laptop / PC' || formData.device_type === 'Printer Service';

  useEffect(() => {
    if (!showIntake) setDeviceIntake({});
  }, [showIntake]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload: any = { ...formData };
      if (showIntake && deviceIntake.brand) {
        const brand = deviceIntake.brand === 'Other' ? (deviceIntake.brandOther || 'Other') : deviceIntake.brand;
        const accessories = [...(deviceIntake.accessories || [])];
        if (deviceIntake.accessoriesOther) accessories.push(deviceIntake.accessoriesOther);
        payload.device_intake = {
          subType: formData.device_type === 'Laptop / PC' ? 'laptop' : 'printer',
          brand,
          model: deviceIntake.model || '',
          serialNumber: deviceIntake.serialNumber || '',
          color: deviceIntake.color || '',
          bodyCondition: deviceIntake.bodyCondition || '',
          powerOn: deviceIntake.powerOn || '',
          accessories,
          accessoriesOther: deviceIntake.accessoriesOther || '',
          preExistingDamage: deviceIntake.preExistingDamage || '',
          ...(formData.device_type === 'Laptop / PC' ? {
            screenCondition: deviceIntake.screenCondition || '',
            keyboardCondition: deviceIntake.keyboardCondition || '',
            portsCheck: deviceIntake.portsCheck || '',
            biosPassword: deviceIntake.biosPassword || '',
            loginPassword: deviceIntake.loginPassword || '',
          } : {
            paperTray: deviceIntake.paperTray || '',
            printHead: deviceIntake.printHead || '',
            inkToner: deviceIntake.inkToner || '',
            networkPassword: deviceIntake.networkPassword || '',
          }),
        };
      }
      await serviceRequestService.createRequest(payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-8 py-5 border-b bg-gray-50 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-navy">New Service Booking</h2>
            <p className="text-xs text-text-soft font-bold uppercase mt-0.5 tracking-tight">Installation & Support</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X className="h-5 w-5 text-text-soft" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 overflow-y-auto space-y-6">
          {error && (
            <div className="p-4 bg-red-50 text-red-600 text-sm rounded-2xl border border-red-100 font-medium animate-shake">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Customer Name</label>
                <div className="relative">
                   <User className="absolute left-3 top-3 h-4 w-4 text-text-soft pointer-events-none" />
                   <input
                    required
                    className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 bg-white rounded-2xl outline-none focus:border-blue/40 transition-all text-sm font-medium"
                    placeholder="Enter full name"
                    value={formData.customerName}
                    onChange={e => {
                        setFormData({ ...formData, customerName: e.target.value });
                        setNameSearch(e.target.value);
                        setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                   />
                   {showSuggestions && nameSearch.length > 0 && suggestions.length > 0 && (
                       <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 z-[70] overflow-hidden animate-in fade-in slide-in-from-top-2">
                           {suggestions.map((c: any) => (
                               <button
                                   key={c.mobile}
                                   type="button"
                                   onClick={() => handleSelectCustomer(c)}
                                   className="w-full text-left p-4 hover:bg-soft border-b last:border-0 flex justify-between items-center group"
                               >
                                   <div>
                                       <p className="text-sm font-bold text-navy group-hover:text-blue transition-colors">{c.name}</p>
                                       <p className="text-[10px] text-text-soft font-bold">{c.mobile}</p>
                                   </div>
                                   <Search className="h-4 w-4 text-blue opacity-0 group-hover:opacity-100 transition-opacity" />
                               </button>
                           ))}
                       </div>
                   )}
                </div>
             </div>
             <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Mobile Number</label>
                <div className="relative">
                   <Smartphone className="absolute left-3 top-3 h-4 w-4 text-text-soft pointer-events-none" />
                   <input
                    required
                    className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 bg-white rounded-2xl outline-none focus:border-blue/40 transition-all text-sm font-medium"
                    placeholder="10-digit number"
                    value={formData.customer_mobile}
                    onChange={e => setFormData({ ...formData, customer_mobile: e.target.value })}
                   />
                </div>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Device / Project Type</label>
                <div className="relative">
                   <Monitor className="absolute left-3 top-3 h-4 w-4 text-text-soft pointer-events-none" />
                   <select
                    className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 bg-white rounded-2xl outline-none focus:border-blue/40 transition-all text-sm font-medium appearance-none"
                    value={formData.device_type}
                    onChange={e => setFormData({ ...formData, device_type: e.target.value })}
                   >
                      <option value="CCTV System">CCTV System</option>
                      <option value="Laptop / PC">Laptop / PC</option>
                      <option value="Biometric Access">Biometric Access</option>
                      <option value="Networking">Networking</option>
                      <option value="Printer Service">Printer Service</option>
                      <option value="New Installation (Site Visit)">Site Survey / New Installation</option>
                   </select>
                </div>
             </div>
             <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Preferred Date</label>
                <div className="relative">
                   <Calendar className="absolute left-3 top-3 h-4 w-4 text-text-soft pointer-events-none" />
                   <input
                    type="date"
                    required
                    className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 bg-white rounded-2xl outline-none focus:border-blue/40 transition-all text-sm font-medium cursor-pointer"
                    value={formData.preferred_date}
                    onChange={e => setFormData({ ...formData, preferred_date: e.target.value })}
                   />
                </div>
             </div>
          </div>

          <div className="space-y-1">
             <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Issue Description / Work Details</label>
             <textarea
               required
               rows={3}
               className="w-full px-4 py-3 border-2 border-gray-200 bg-white rounded-2xl outline-none focus:border-blue/40 transition-all text-sm font-medium resize-none"
               placeholder="Briefly describe the requirement or problem..."
               value={formData.issue}
               onChange={e => setFormData({ ...formData, issue: e.target.value })}
             />
          </div>

          {showIntake && (
            <DeviceIntakeForm deviceType={formData.device_type} intake={deviceIntake} setIntake={setDeviceIntake} />
          )}

          <div className="pt-4 border-t">
             <h3 className="text-xs font-bold text-navy uppercase tracking-widest mb-4 flex items-center gap-2">
                <User className="h-4 w-4 text-blue" /> Assignment (Optional)
             </h3>
             <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Dispatch Technician</label>
                <select
                 className="w-full px-4 py-2.5 border-2 border-gray-200 bg-white rounded-2xl outline-none focus:border-blue/40 transition-all text-sm font-medium"
                 value={formData.technicianId}
                 onChange={e => {
                    const tech = technicians?.find((t: any) => t.id === e.target.value);
                    setFormData({ ...formData, technicianId: e.target.value, technicianName: tech ? tech.name : '' });
                 }}
                >
                   <option value="">Decide later (Keep Pending)</option>
                   {technicians?.map((t: any) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                   ))}
                </select>
             </div>
          </div>

          <div className="pt-4 border-t flex justify-end gap-3">
             <button
               type="button"
               onClick={onClose}
               className="px-8 py-3 text-sm font-bold text-text-soft hover:bg-gray-100 rounded-2xl transition-colors"
             >
               Cancel
             </button>
             <button
               disabled={loading}
               className="px-10 py-3 bg-blue text-white text-sm font-bold rounded-2xl hover:bg-blue-600 transition-all flex items-center gap-3 shadow-xl shadow-blue/20 disabled:opacity-50"
             >
               {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
               Create Ticket
             </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ServiceRequestModal;
