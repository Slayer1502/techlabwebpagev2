import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import Layout from '../components/Layout';
import { serviceRequestService } from '../services/serviceRequestService';
import CameraRows, { CameraRow } from '../components/survey/CameraRows';
import CableRows, { CableRow } from '../components/survey/CableRows';
import PartRows, { PartRow } from '../components/survey/PartRows';
import PowerRows, { PowerRow } from '../components/survey/PowerRows';
import PhotoUpload from '../components/survey/PhotoUpload';
import {
  Save,
  Send,
  ChevronLeft,
  Loader2,
  Video,
  HardDrive,
  Zap,
  Wrench,
  Camera as CameraIcon,
  ClipboardList,
  Package
} from 'lucide-react';
import { toast } from '../utils/toast';

const SurveyForm = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Form State
  const [isExisting, setIsExisting] = useState(false);
  const [setupNotes, setSetupNotes] = useState('');
  const [workNeeded, setWorkNeeded] = useState('');
  const [cameras, setCameras] = useState<CameraRow[]>([]);
  const [nvrNeeded, setNvrNeeded] = useState('no');
  const [nvrType, setNvrType] = useState('NVR');
  const [nvrChannels, setNvrChannels] = useState('4');
  const [nvrQty, setNvrQty] = useState('1');
  const [nvrBrand, setNvrBrand] = useState('');
  const [powerUnits, setPowerUnits] = useState<PowerRow[]>([]);
  const [additionalParts, setAdditionalParts] = useState<PartRow[]>([]);
  const [cables, setCables] = useState<CableRow[]>([]);
  const [mountRackType, setMountRackType] = useState('');
  const [mountRackQty, setMountRackQty] = useState(1);
  const [mountPoles, setMountPoles] = useState(0);
  const [mountBoxes, setMountBoxes] = useState(0);
  const [mountOther, setMountOther] = useState('');
  const [generalNotes, setNotes] = useState('');
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);

  // Auto-calculate NVR channels from camera count
  useEffect(() => {
    const totalCameras = cameras.reduce((sum, c) => sum + c.count, 0);
    if (totalCameras > 0) {
      const validChannels = [4, 8, 16, 32, 64];
      const recommended = validChannels.find(c => c >= totalCameras) || 64;
      setNvrChannels(recommended.toString());
      if (nvrNeeded === 'no') setNvrNeeded('yes');
    }

    const totalCam = cameras.reduce((sum, c) => sum + c.count, 0);
    setMountBoxes(totalCam);
  }, [cameras]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('is_existing_installation', isExisting ? '1' : '0');
      formData.append('existing_setup_notes', setupNotes);
      formData.append('work_needed', workNeeded);
      formData.append('cameras', JSON.stringify(cameras));
      formData.append('camera_count', cameras.reduce((s, c) => s + c.count, 0).toString());

      formData.append('nvr_dvr', JSON.stringify({
        needed: nvrNeeded === 'yes',
        type: nvrType,
        channels: Number(nvrChannels),
        qty: Number(nvrQty) || 1,
        brand: nvrBrand,
        powerUnits
      }));

      formData.append('additional_parts', JSON.stringify(additionalParts));
      formData.append('cables', JSON.stringify(cables.map(c => ({ ...c, length: 0 }))));

      formData.append('mounting', JSON.stringify({
        rack: mountRackType ? `${mountRackQty}x ${mountRackType}` : '',
        rackQty: mountRackQty,
        rackType: mountRackType,
        poles: mountPoles,
        boxes: mountBoxes,
        other: mountOther
      }));

      formData.append('notes', generalNotes);
      photoFiles.forEach(file => formData.append('photos', file));

      await serviceRequestService.submitSurvey(id!, formData);
      toast('Survey submitted successfully', 'success');
      navigate('/services');
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to submit survey', 'error');
    } finally {
      setLoading(false);
    }
  };

  const SectionHeader = ({ icon: Icon, title, subtitle }: any) => (
    <div className="flex items-center gap-3 mb-6 pb-4 border-b">
      <div className="p-2.5 bg-soft rounded-xl text-blue">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h2 className="text-lg font-bold text-navy">{title}</h2>
        <p className="text-xs text-text-soft font-medium uppercase tracking-tight">{subtitle}</p>
      </div>
    </div>
  );

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8 pb-20">
        {/* Top Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/services')}
            className="flex items-center gap-2 text-text-soft font-bold text-sm hover:text-navy transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Tasks
          </button>
          <div className="flex gap-3">
             <button
                type="button"
                className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-bold hover:bg-gray-50 flex items-center gap-2"
             >
               <Save className="h-4 w-4 text-text-soft" />
               Save Draft
             </button>
             <button
                form="survey-form"
                disabled={loading}
                className="px-6 py-2 bg-blue text-white rounded-xl text-sm font-bold hover:bg-blue-600 transition-all flex items-center gap-2 shadow-lg shadow-blue/20"
             >
               {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
               Submit Survey
             </button>
          </div>
        </div>

        <form id="survey-form" onSubmit={handleSubmit} className="space-y-8">
          {/* Section: Cameras */}
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100">
            <SectionHeader
              icon={Video}
              title="Camera Requirements"
              subtitle="Form factors and technology types"
            />
            <CameraRows
              rows={cameras}
              onChange={setCameras}
              showTechSelect={nvrNeeded === 'no'}
            />
          </div>

          {/* Section: NVR/DVR */}
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100">
            <SectionHeader
              icon={HardDrive}
              title="Recording & Power"
              subtitle="Central storage and power management"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-text-soft uppercase">Is NVR/DVR Required?</label>
                  <select
                    className="w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue/20 transition-all"
                    value={nvrNeeded}
                    onChange={e => setNvrNeeded(e.target.value)}
                  >
                    <option value="no">No (Using standalone/Wireless)</option>
                    <option value="yes">Yes (Centralized recording)</option>
                  </select>
                </div>

                {nvrNeeded === 'yes' && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-text-soft uppercase">Type</label>
                        <select
                          className="w-full bg-white border-2 border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-blue/40 transition-all"
                          value={nvrType}
                          onChange={e => setNvrType(e.target.value)}
                        >
                          <option value="NVR">NVR</option>
                          <option value="DVR">DVR</option>
                          <option value="XVR">XVR</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-text-soft uppercase">Channels</label>
                        <select
                          className="w-full bg-white border-2 border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-blue/40 transition-all"
                          value={nvrChannels}
                          onChange={e => setNvrChannels(e.target.value)}
                        >
                          <option value="4">4 CH</option>
                          <option value="8">8 CH</option>
                          <option value="16">16 CH</option>
                          <option value="32">32 CH</option>
                          <option value="64">64 CH</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-text-soft uppercase">Quantity</label>
                        <input
                          type="number"
                          min="1"
                          className="w-full bg-white border-2 border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-blue/40 transition-all text-sm font-bold"
                          value={nvrQty}
                          onChange={e => setNvrQty(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-text-soft uppercase">Preferred Brand</label>
                      <input
                        className="w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue/40 transition-all"
                        placeholder="e.g. Hikvision / CP Plus"
                        value={nvrBrand}
                        onChange={e => setNvrBrand(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-xs font-bold text-text-soft uppercase">Power Units (per floor)</p>
                {nvrNeeded === 'yes' && (
                  <PowerRows rows={powerUnits} onChange={setPowerUnits} />
                )}
              </div>
            </div>
          </div>

          {/* Section: Additional Parts */}
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100">
            <SectionHeader
              icon={Package}
              title="Additional Parts"
              subtitle="Other components needed for the installation"
            />
            <PartRows rows={additionalParts} onChange={setAdditionalParts} />
          </div>

          {/* Section: Cables */}
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100">
            <SectionHeader
              icon={Zap}
              title="Cable Infrastructure"
              subtitle="Wiring runs and measurements"
            />
            <CableRows rows={cables} onChange={setCables} />
          </div>

          {/* Section: Mounting & Accessories */}
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100">
            <SectionHeader
              icon={Wrench}
              title="Hardware & Mounting"
              subtitle="Rack, poles, and housing"
            />
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-text-soft uppercase text-center block">Rack Type</label>
                <select
                  className="w-full text-center bg-white border-2 border-gray-200 rounded-xl py-2 font-bold outline-none focus:border-blue/40 transition-all text-xs"
                  value={mountRackType}
                  onChange={e => setMountRackType(e.target.value)}
                >
                  <option value="">Select</option>
                  <option value="Wall Rack">Wall Rack</option>
                  <option value="Floor Rack">Floor Rack</option>
                  <option value="Ceiling Rack">Ceiling Rack</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-text-soft uppercase text-center block">Rack Qty</label>
                <input
                  type="number"
                  min="1"
                  className="w-full text-center bg-white border-2 border-gray-200 rounded-xl py-2 font-bold text-sm"
                  value={mountRackQty}
                  onChange={e => setMountRackQty(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-text-soft uppercase text-center block">Poles</label>
                <input
                  type="number"
                  className="w-full text-center bg-white border-2 border-gray-200 rounded-xl py-2 font-bold text-sm"
                  value={mountPoles}
                  onChange={e => setMountPoles(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-text-soft uppercase text-center block">Camera Boxes</label>
                <input
                  type="number"
                  readOnly
                  className="w-full text-center bg-blue/5 border border-blue/20 rounded-xl py-2 font-bold text-blue"
                  value={mountBoxes}
                  onChange={e => setMountBoxes(Number(e.target.value))}
                  title="Auto-set from camera count"
                />
                <p className="text-[9px] text-text-soft text-center font-bold uppercase">Auto</p>
              </div>
              <div className="space-y-1 col-span-2 md:col-span-1">
                 <label className="text-xs font-bold text-text-soft uppercase block">Other</label>
                 <input
                  className="w-full bg-white border-2 border-gray-200 rounded-xl px-3 py-2 outline-none text-sm focus:border-blue/40 transition-all"
                  placeholder="e.g. PVC conduit"
                  value={mountOther}
                  onChange={e => setMountOther(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Section: Photos */}
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100">
            <SectionHeader
              icon={CameraIcon}
              title="Site Documentation"
              subtitle="Photos of site conditions"
            />
            <PhotoUpload files={photoFiles} onChange={setPhotoFiles} />
          </div>

          {/* Section: Additional Notes */}
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100">
            <SectionHeader
              icon={ClipboardList}
              title="General Observations"
              subtitle="Additional requirements or challenges"
            />
            <textarea
              rows={4}
              placeholder="Any other specific site requirements..."
              className="w-full bg-white border-2 border-gray-200 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-blue/20 transition-all resize-none"
              value={generalNotes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default SurveyForm;
