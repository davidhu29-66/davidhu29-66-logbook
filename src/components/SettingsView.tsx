import React, { useState, useEffect } from 'react';
import { UserSettings, Trip, WorkSession, CustomExcelTemplate } from '../types';
import {
  Settings,
  User,
  MapPin,
  Car,
  Building2,
  Tag,
  Plus,
  Trash2,
  Download,
  Upload,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Shield,
  FileSpreadsheet,
  Sliders,
  CheckCircle2,
  ShieldCheck,
  Globe,
  ExternalLink,
} from 'lucide-react';
import { TemplateManagerModal } from './TemplateManagerModal';
import { getCustomExcelTemplate } from '../lib/templateStorage';
import { DEFAULT_SETTINGS } from '../lib/storage';
import { User as FirebaseUser } from 'firebase/auth';

interface SettingsViewProps {
  settings: UserSettings;
  trips: Trip[];
  sessions: WorkSession[];
  onSaveSettings: (settings: UserSettings) => void;
  onRestoreData: (trips: Trip[], sessions: WorkSession[], settings: UserSettings) => void;
  onResetSampleData: () => void;
  onClearAllTrips?: () => void;
  onClearEntireDatabase?: (keepProfile: boolean) => void;
  currentUser?: FirebaseUser | null;
  cloudSyncStatus?: 'idle' | 'syncing' | 'synced' | 'error';
  onSignInWithGoogle?: () => void;
  onSignOut?: () => void;
  onManualSyncCloud?: () => void;
  onOpenDomainGuide?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  trips,
  sessions,
  onSaveSettings,
  onRestoreData,
  onResetSampleData,
  onClearAllTrips,
  onClearEntireDatabase,
  currentUser,
  cloudSyncStatus = 'idle',
  onSignInWithGoogle,
  onSignOut,
  onManualSyncCloud,
  onOpenDomainGuide,
}) => {
  const [driverName, setDriverName] = useState(settings.driverName);
  const [region, setRegion] = useState(settings.region);
  const [vehicleName, setVehicleName] = useState(settings.vehicleName);
  const [vehicleRego, setVehicleRego] = useState(settings.vehicleRego);
  const [currentOdometer, setCurrentOdometer] = useState(settings.currentOdometer);
  const [taxReferenceNo, setTaxReferenceNo] = useState(settings.taxReferenceNo || '');
  const [idNumber, setIdNumber] = useState(settings.idNumber || '');
  const [vehicleCostPrice, setVehicleCostPrice] = useState(settings.vehicleCostPrice ? String(settings.vehicleCostPrice) : '');
  const [employerName, setEmployerName] = useState(settings.employerName || '');

  const [clients, setClients] = useState<string[]>(settings.clients || []);
  const [newClient, setNewClient] = useState('');

  const [jobNumbers, setJobNumbers] = useState<string[]>(settings.jobNumbers || []);
  const [newJob, setNewJob] = useState('');

  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [customTemplateMeta, setCustomTemplateMeta] = useState<CustomExcelTemplate | null>(null);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    getCustomExcelTemplate().then((res) => {
      setCustomTemplateMeta(res ? res.metadata : null);
    });
  }, [settings.templateMode]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: UserSettings = {
      ...settings,
      driverName,
      region,
      vehicleName,
      vehicleRego,
      currentOdometer: Number(currentOdometer),
      taxReferenceNo: taxReferenceNo.trim(),
      idNumber: idNumber.trim(),
      vehicleCostPrice: vehicleCostPrice ? Number(vehicleCostPrice) : undefined,
      employerName: employerName.trim(),
      clients,
      jobNumbers,
    };
    onSaveSettings(updated);
    showToast('Driver profile and SARS settings saved successfully.');
  };

  const handleAddClient = () => {
    if (!newClient.trim() || clients.includes(newClient.trim())) return;
    const next = [...clients, newClient.trim()];
    setClients(next);
    setNewClient('');
    onSaveSettings({ ...settings, clients: next });
  };

  const handleRemoveClient = (client: string) => {
    const next = clients.filter((c) => c !== client);
    setClients(next);
    onSaveSettings({ ...settings, clients: next });
  };

  const handleAddJob = () => {
    if (!newJob.trim() || jobNumbers.includes(newJob.trim())) return;
    const next = [...jobNumbers, newJob.trim()];
    setJobNumbers(next);
    setNewJob('');
    onSaveSettings({ ...settings, jobNumbers: next });
  };

  const handleRemoveJob = (job: string) => {
    const next = jobNumbers.filter((j) => j !== job);
    setJobNumbers(next);
    onSaveSettings({ ...settings, jobNumbers: next });
  };

  // Export full JSON backup
  const handleExportJSON = () => {
    const backup = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      settings: {
        ...settings,
        driverName,
        region,
        vehicleName,
        vehicleRego,
        currentOdometer,
        taxReferenceNo,
        idNumber,
        vehicleCostPrice: vehicleCostPrice ? Number(vehicleCostPrice) : undefined,
        employerName,
        clients,
        jobNumbers,
      },
      trips,
      sessions,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mileage_timesheet_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Full application data exported to JSON.');
  };

  // Import JSON backup
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.trips && data.sessions && data.settings) {
          onRestoreData(data.trips, data.sessions, data.settings);
          setDriverName(data.settings.driverName || '');
          setRegion(data.settings.region || '');
          setVehicleName(data.settings.vehicleName || '');
          setVehicleRego(data.settings.vehicleRego || '');
          setCurrentOdometer(data.settings.currentOdometer || 0);
          setClients(data.settings.clients || []);
          setJobNumbers(data.settings.jobNumbers || []);
          showToast('Data successfully restored from JSON backup.');
        } else {
          showToast('Invalid backup file format.', 'error');
        }
      } catch (err) {
        showToast('Failed to parse backup file.', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-400" />
          Settings & HR-018 Configuration
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Driver identity metadata, vehicles, client presets and data management
        </p>
      </div>

      {toast && (
        <div
          className={`flex items-center gap-2 rounded-xl p-3 text-xs ${
            toast.type === 'success'
              ? 'border border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
              : 'border border-red-500/40 bg-red-950/40 text-red-300'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Driver Profile Form */}
      <form onSubmit={handleSaveProfile} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
        <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2 border-b border-slate-800 pb-3">
          <User className="w-4 h-4 text-blue-400" />
          Technician & Depot Profile (HR-018)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Technician Full Name (Timesheet Cell B1)
            </label>
            <input
              type="text"
              value={driverName}
              onChange={(e) => setDriverName(e.target.value)}
              placeholder="e.g. Alex Morgan / Technician Name"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              Operating Region / Depot (Timesheet Cell K1)
            </label>
            <input
              type="text"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="e.g. Western Cape / Field Operations"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
              <Car className="w-3.5 h-3.5 text-slate-400" />
              Primary Vehicle Model
            </label>
            <input
              type="text"
              value={vehicleName}
              onChange={(e) => setVehicleName(e.target.value)}
              placeholder="e.g. Toyota Hilux 4x4 WorkMate"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Vehicle Registration (Rego)
            </label>
            <input
              type="text"
              value={vehicleRego}
              onChange={(e) => setVehicleRego(e.target.value)}
              placeholder="e.g. 1ABC-889"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Current Baseline Odometer (KM)
            </label>
            <input
              type="number"
              step="1"
              value={currentOdometer}
              onChange={(e) => setCurrentOdometer(Number(e.target.value))}
              placeholder="148500"
              className="w-full md:w-1/2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Used as default start odometer for new trips if no prior trip exists today.
            </p>
          </div>

          {/* SARS Section 8(1)(b) Tax & Vehicle Particulars */}
          <div className="md:col-span-2 pt-4 border-t border-slate-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-3 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              SARS Monthly Logbook Tax Particulars (Section 8(1)(b))
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  SARS Tax Reference Number
                </label>
                <input
                  type="text"
                  value={taxReferenceNo}
                  onChange={(e) => setTaxReferenceNo(e.target.value)}
                  placeholder="e.g. 9482716304"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 font-mono focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Taxpayer ID / Passport Number
                </label>
                <input
                  type="text"
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  placeholder="e.g. 8804125089083"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 font-mono focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Vehicle Purchase / Retail Cost Price (ZAR)
                </label>
                <input
                  type="number"
                  step="1000"
                  value={vehicleCostPrice}
                  onChange={(e) => setVehicleCostPrice(e.target.value)}
                  placeholder="e.g. 385000"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 font-mono focus:border-blue-500 focus:outline-none"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Required on official SARS logbook to determine fixed travel deduction scale.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Employer / Firm Name
                </label>
                <input
                  type="text"
                  value={employerName}
                  onChange={(e) => setEmployerName(e.target.value)}
                  placeholder="e.g. Field Operations Pty Ltd"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-md hover:bg-blue-500 transition-colors"
          >
            Save Profile Settings
          </button>
        </div>
      </form>

      {/* Spreadsheet Template & Exact HR-018 Engine */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-blue-400" />
              Spreadsheet Template & HR-018 Population Engine
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Upload your exact company .xlsx timesheet or use the comprehensive built-in master template.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsTemplateModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-blue-600/20 border border-blue-500/40 px-3.5 py-1.5 text-xs font-semibold text-blue-300 hover:bg-blue-600/30 transition-all self-start sm:self-auto"
          >
            <Sliders className="w-3.5 h-3.5" />
            Configure Template & Coordinates
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 space-y-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Current Active Mode
            </span>
            <div className="flex items-center gap-2">
              <div
                className={`h-2.5 w-2.5 rounded-full ${
                  settings.templateMode === 'custom' || (!settings.templateMode && !!customTemplateMeta)
                    ? 'bg-blue-400'
                    : 'bg-emerald-400'
                }`}
              />
              <span className="font-semibold text-slate-100">
                {settings.templateMode === 'custom' || (!settings.templateMode && !!customTemplateMeta)
                  ? 'Custom Uploaded Template'
                  : 'Standard HR-018 Master Template'}
              </span>
            </div>
            <p className="text-slate-400 text-[11px]">
              {settings.templateMode === 'custom' || (!settings.templateMode && !!customTemplateMeta)
                ? `Populating into: ${customTemplateMeta?.filename || 'Uploaded File'} (${customTemplateMeta?.detectedSheetNames.join(', ') || 'Sheet'})`
                : 'Using formula-driven HR-018 master workbook with complete styling and validation.'}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 space-y-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Configured Target Coordinates
            </span>
            <div className="font-mono text-slate-300 space-y-0.5 text-[11px]">
              <div>• Driver Name: <span className="text-blue-400 font-bold">{settings.cellMapping?.nameCell || 'B1'}</span></div>
              <div>• Region / Depot: <span className="text-blue-400 font-bold">{settings.cellMapping?.regionCell || 'K1'}</span></div>
              <div>• Week Ending: <span className="text-blue-400 font-bold">{settings.cellMapping?.weekEndingCell || 'W1'}</span></div>
              <div>• Closing / Opening KM: <span className="text-blue-400 font-bold">{settings.cellMapping?.closingKmCell || 'AA21'} / {settings.cellMapping?.openingKmCell || 'AA22'}</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Preset Clients & Job Numbers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Clients list */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
          <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2 border-b border-slate-800 pb-3">
            <Building2 className="w-4 h-4 text-emerald-400" />
            Client Presets (Autocomplete)
          </h3>

          <div className="flex gap-2">
            <input
              type="text"
              value={newClient}
              onChange={(e) => setNewClient(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddClient())}
              placeholder="Add client name..."
              className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleAddClient}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1.5 max-h-48 overflow-y-auto pt-1">
            {clients.map((c) => (
              <div key={c} className="flex items-center justify-between rounded-lg bg-slate-950/60 px-3 py-1.5 text-xs text-slate-300">
                <span>{c}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveClient(c)}
                  className="text-slate-500 hover:text-red-400"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Job numbers list */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
          <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2 border-b border-slate-800 pb-3">
            <Tag className="w-4 h-4 text-yellow-400" />
            Job Number Presets
          </h3>

          <div className="flex gap-2">
            <input
              type="text"
              value={newJob}
              onChange={(e) => setNewJob(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddJob())}
              placeholder="e.g. J-2024-101..."
              className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-100 focus:border-yellow-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleAddJob}
              className="rounded-lg bg-yellow-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-yellow-500 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1.5 max-h-48 overflow-y-auto pt-1">
            {jobNumbers.map((j) => (
              <div key={j} className="flex items-center justify-between rounded-lg bg-slate-950/60 px-3 py-1.5 text-xs text-slate-300">
                <span className="font-mono">{j}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveJob(j)}
                  className="text-slate-500 hover:text-red-400"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Firebase Cloud Database & Authentication */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 text-amber-400 border border-amber-500/30">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M4.09 17.06l3.41-11.45a1 1 0 011.89-.04l2.84 9.12-8.14 2.37zm7.57-2.22l2.39-4.52a1 1 0 011.82.1l2.45 6.46-6.66-2.04zm7.64 3.73l-1.87-4.93-7.53-2.31 4.7-8.91a1 1 0 011.83.21l3.78 14.6a1 1 0 01-.91 1.34z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                Firebase Firestore Database & Google Auth
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Active
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Persistent cloud storage for trips, sessions & profile across all devices
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {cloudSyncStatus === 'syncing' ? (
              <span className="text-xs text-amber-400 flex items-center gap-1.5 animate-pulse">
                <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                Syncing Firestore...
              </span>
            ) : cloudSyncStatus === 'synced' ? (
              <span className="text-xs text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Cloud Synced
              </span>
            ) : null}
          </div>
        </div>

        {currentUser ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800">
            <div className="flex items-center gap-3">
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || 'Driver'}
                  className="w-12 h-12 rounded-full ring-2 ring-emerald-500/50"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-base font-bold text-white">
                  {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-100 text-sm">
                    {currentUser.displayName || 'Authenticated Driver'}
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                    Google Verified
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono">{currentUser.email}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Firestore User ID: <span className="font-mono text-slate-400">{currentUser.uid.slice(0, 12)}...</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onManualSyncCloud && (
                <button
                  type="button"
                  onClick={onManualSyncCloud}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-850 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 transition-colors"
                  title="Upload all local records to Firestore"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-blue-400" />
                  <span>Sync to Cloud</span>
                </button>
              )}
              {onSignOut && (
                <button
                  type="button"
                  onClick={onSignOut}
                  className="flex items-center gap-1.5 rounded-xl border border-rose-900/40 bg-rose-950/20 px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-900/40 transition-colors"
                >
                  <span>Sign Out</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800">
            <div>
              <p className="text-xs font-semibold text-slate-200">
                You are currently running in Local / Guest Mode
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Sign in with Google to automatically back up your trips, sessions, and settings to the persistent Firestore database.
              </p>
            </div>
            {onSignInWithGoogle && (
              <button
                type="button"
                onClick={onSignInWithGoogle}
                className="flex items-center justify-center gap-2 shrink-0 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-slate-900 shadow-md hover:bg-slate-100 transition-all hover:scale-105"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Sign in with Google</span>
              </button>
            )}
          </div>
        )}

        {/* Vercel & GitHub Domain Whitelisting Helper */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-blue-950/20 border border-blue-900/40 text-xs text-blue-200">
          <div className="flex items-start gap-2.5">
            <Globe className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-100">
                Deploying on Vercel or GitHub Pages? Fixing "auth/unauthorized-domain"
              </p>
              <p className="text-[11px] text-blue-300/80 mt-0.5">
                Google Sign-in requires adding your domain (e.g. <code className="font-mono text-emerald-300">run.app</code>, <code className="font-mono text-emerald-300">vercel.app</code>, or <code className="font-mono text-emerald-300">github.io</code>) to Authorized Domains in Firebase Console.
              </p>
            </div>
          </div>
          {onOpenDomainGuide && (
            <button
              type="button"
              onClick={onOpenDomainGuide}
              className="shrink-0 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-sm transition-colors"
            >
              <span>Domain Whitelist Guide</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Data Management & Backups */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-400" />
            Data Backup & Database Management
          </h3>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-300 font-mono">{trips.length} Trips</span>
            <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-300 font-mono">{sessions.length} Sessions</span>
          </div>
        </div>

        {/* Backups row */}
        <div>
          <span className="text-xs font-semibold text-slate-400 block mb-2">Backups & Portability</span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleExportJSON}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 p-3 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors"
            >
              <Download className="w-4 h-4 text-blue-400" />
              Export JSON Backup
            </button>

            <label className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 p-3 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors cursor-pointer">
              <Upload className="w-4 h-4 text-emerald-400" />
              Restore JSON Backup
              <input
                type="file"
                accept=".json"
                onChange={handleImportJSON}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Danger Zone: Clear Database */}
        <div className="border-t border-slate-800/80 pt-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span className="text-xs font-bold text-rose-300 uppercase tracking-wider">Database Clear & Clean Slate</span>
          </div>
          <p className="text-xs text-slate-400 mb-3">
            Wipe existing trips or reset your entire database if you want to start from scratch without pre-seeded data.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {onClearAllTrips && (
              <button
                type="button"
                onClick={onClearAllTrips}
                className="flex items-center justify-center gap-2 rounded-xl border border-amber-900/40 bg-amber-950/20 p-3 text-xs font-semibold text-amber-300 hover:bg-amber-950/40 transition-colors"
                title="Deletes only trips, keeps driver settings"
              >
                <Trash2 className="w-4 h-4 text-amber-400" />
                Clear All Trips Only
              </button>
            )}

            {onClearEntireDatabase && (
              <button
                type="button"
                onClick={() => onClearEntireDatabase(false)}
                className="flex items-center justify-center gap-2 rounded-xl border border-rose-800/60 bg-rose-950/40 p-3 text-xs font-bold text-rose-200 hover:bg-rose-900/50 transition-colors"
                title="Completely empties database"
              >
                <Trash2 className="w-4 h-4 text-rose-400" />
                Wipe Entire Database
              </button>
            )}

            <button
              type="button"
              onClick={onResetSampleData}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/60 p-3 text-xs font-semibold text-slate-300 hover:bg-slate-700/60 transition-colors"
              title="Clears all records to an empty blank database"
            >
              <RotateCcw className="w-4 h-4 text-slate-400" />
              Reset to Clean Blank State
            </button>
          </div>
        </div>
      </div>

      {/* Template Manager Modal */}
      <TemplateManagerModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        settings={settings}
        onUpdateSettings={(newSettings) => {
          onSaveSettings(newSettings);
        }}
        onTemplateChanged={() => {
          getCustomExcelTemplate().then((res) => {
            setCustomTemplateMeta(res ? res.metadata : null);
          });
        }}
      />
    </div>
  );
};
