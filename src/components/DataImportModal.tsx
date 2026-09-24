import React, { useState, useRef } from 'react';
import { X, Upload, FileText, CheckCircle2, AlertTriangle, ArrowRight, RefreshCw, Database, Sparkles, Filter } from 'lucide-react';
import { Trip, UserSettings } from '../types';
import { parseCsvTrips, RAW_USER_CSV, ParseCsvResult } from '../lib/csvParser';
import { importCsvTripsIntoStorage } from '../lib/storage';

interface DataImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (updatedTrips: Trip[], updatedSettings?: UserSettings) => void;
  currentTripCount: number;
  onClearAllTrips?: () => void;
}

export const DataImportModal: React.FC<DataImportModalProps> = ({
  isOpen,
  onClose,
  onImportComplete,
  currentTripCount,
  onClearAllTrips,
}) => {
  const [activeTab, setActiveTab] = useState<'preset' | 'file' | 'paste'>('preset');
  const [csvContent, setCsvContent] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseResult, setParseResult] = useState<ParseCsvResult | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Process text whenever paste content changes or preset is selected
  const handleParse = (text: string, label?: string) => {
    setCsvContent(text);
    if (label) setFileName(label);
    const result = parseCsvTrips(text);
    setParseResult(result);
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  const handleSelectPreset = () => {
    setActiveTab('preset');
    handleParse(RAW_USER_CSV, 'Official Fleet Trip Log (July - Sept 2026)');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      handleParse(content, file.name);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      handleParse(content, file.name);
    };
    reader.readAsText(file);
  };

  const executeImport = () => {
    if (!parseResult || parseResult.trips.length === 0) return;
    setIsProcessing(true);

    try {
      const importResult = importCsvTripsIntoStorage(
        parseResult.trips,
        parseResult.uniqueClients,
        parseResult.uniqueJobNumbers,
        importMode
      );

      // Reload fresh trips from localStorage
      const raw = localStorage.getItem('mileage_logbook_trips_v1');
      const freshTrips: Trip[] = raw ? JSON.parse(raw) : parseResult.trips;

      const rawSettings = localStorage.getItem('mileage_logbook_settings_v1');
      const freshSettings: UserSettings | undefined = rawSettings ? JSON.parse(rawSettings) : undefined;

      setSuccessMessage(
        `Successfully imported ${importResult.newAdded} new trips! (Total records: ${importResult.totalCount})`
      );

      setTimeout(() => {
        onImportComplete(freshTrips, freshSettings);
        setIsProcessing(false);
        onClose();
      }, 900);
    } catch (err: any) {
      setErrorMessage(`Import error: ${err?.message || 'Failed to parse and store CSV'}`);
      setIsProcessing(false);
    }
  };

  // Preview metrics
  const previewTotalKm = parseResult?.trips.reduce((acc, t) => acc + Math.max(0, (t.mileageIn || 0) - (t.mileageOut || 0)), 0) || 0;
  const previewBusinessTrips = parseResult?.trips.filter((t) => t.category === 'business').length || 0;
  const previewPrivateTrips = parseResult?.trips.filter((t) => t.category === 'private').length || 0;
  const dateStart = parseResult?.trips[0]?.date || '';
  const dateEnd = parseResult?.trips[parseResult.trips.length - 1]?.date || '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl p-6 my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Import Vehicle Trips & Mileage Data
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                  CSV Support
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Import trip logs, odometers, clients, and purpose descriptions from CSV
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="grid grid-cols-3 gap-2 mt-4 p-1 bg-slate-950/60 rounded-xl border border-slate-800 text-xs font-semibold">
          <button
            type="button"
            onClick={handleSelectPreset}
            className={`py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all ${
              activeTab === 'preset' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            User Fleet Data (85 Trips)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('file')}
            className={`py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all ${
              activeTab === 'file' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            Upload CSV File
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('paste')}
            className={`py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all ${
              activeTab === 'paste' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Paste Raw CSV
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto space-y-4 my-4 pr-1">
          {activeTab === 'preset' && (
            <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-950/20 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-bold text-blue-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Pre-Packaged Fleet Trips Ready for Import
                  </h4>
                  <p className="text-xs text-slate-300 mt-1">
                    Contains your complete South African fleet travel logbook spanning July 20, 2026 to September 19, 2026.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleParse(RAW_USER_CSV, 'Official Fleet Trip Log (July - Sept 2026)')}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 text-xs font-semibold text-white hover:bg-blue-500 shadow"
                >
                  Load for Preview
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">Date Period</span>
                  <span className="font-mono font-bold text-slate-200">Jul - Sep 2026</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">Total Distance</span>
                  <span className="font-mono font-bold text-blue-400">~7,509 KM</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">Clients</span>
                  <span className="font-semibold text-slate-200">UWC, SBSA, SBM, Eskom...</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">Odometer Span</span>
                  <span className="font-mono font-bold text-emerald-400">430,375 - 437,884</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'file' && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                dragOver
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-slate-700 bg-slate-950/40 hover:border-slate-600'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-200">
                {fileName ? `Selected: ${fileName}` : 'Drop your CSV file here, or click to browse'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Standard headers: Date, From, To, Odometer Out, Odometer In, KM, Client, Purpose, Job Number
              </p>
            </div>
          )}

          {activeTab === 'paste' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">Paste CSV or Multi-line SARS Records</label>
                <span className="text-[11px] text-slate-400">Supports standard CSV or multi-line table copies</span>
              </div>
              <textarea
                value={csvContent}
                onChange={(e) => handleParse(e.target.value, 'Pasted CSV Content')}
                placeholder="Supports both CSV rows or copied SARS table blocks:&#10;2026-07-20&#10;430 375.00&#10;430 498.00&#10;123.00&#10;123.00&#10;0.00&#10;UWC Main Campus Maintenance..."
                rows={7}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-xs font-mono text-slate-200 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
              />
            </div>
          )}

          {/* Parse Results Preview */}
          {parseResult && (
            <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Validated Import Preview ({parseResult.trips.length} Trips Found)
                </span>
                {parseResult.skippedCount > 0 && (
                  <span className="text-[11px] text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                    {parseResult.skippedCount} duplicate entries filtered
                  </span>
                )}
              </div>

              {/* Metric cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="rounded-lg bg-slate-900 border border-slate-800 p-2.5">
                  <span className="text-slate-400 text-[11px] block">Date Range</span>
                  <span className="font-mono font-bold text-slate-200">
                    {dateStart ? `${dateStart} → ${dateEnd}` : 'N/A'}
                  </span>
                </div>
                <div className="rounded-lg bg-slate-900 border border-slate-800 p-2.5">
                  <span className="text-slate-400 text-[11px] block">Total Distance</span>
                  <span className="font-mono font-bold text-blue-400">{previewTotalKm.toLocaleString()} KM</span>
                </div>
                <div className="rounded-lg bg-slate-900 border border-slate-800 p-2.5">
                  <span className="text-slate-400 text-[11px] block">Trip Types</span>
                  <span className="font-medium text-slate-200">
                    {previewBusinessTrips} Biz / {previewPrivateTrips} Pvt
                  </span>
                </div>
                <div className="rounded-lg bg-slate-900 border border-slate-800 p-2.5">
                  <span className="text-slate-400 text-[11px] block">Detected Clients</span>
                  <span className="font-semibold text-emerald-400">
                    {parseResult.uniqueClients.length} clients
                  </span>
                </div>
              </div>

              {/* Client badges */}
              {parseResult.uniqueClients.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] text-slate-400 mr-1">Clients:</span>
                  {parseResult.uniqueClients.map((c) => (
                    <span
                      key={c}
                      className="px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[11px] font-medium"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              )}

              {/* Sample Trips Table (first 5) */}
              <div className="overflow-x-auto rounded-lg border border-slate-800">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-1.5 px-2">Date</th>
                      <th className="py-1.5 px-2">From → To</th>
                      <th className="py-1.5 px-2 text-right">Odo (Out → In)</th>
                      <th className="py-1.5 px-2 text-right">KM</th>
                      <th className="py-1.5 px-2">Client / Job</th>
                      <th className="py-1.5 px-2">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {parseResult.trips.slice(0, 5).map((t, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/40">
                        <td className="py-1.5 px-2 text-slate-300">{t.date}</td>
                        <td className="py-1.5 px-2 font-sans text-slate-200">
                          {t.origin || 'Home'} → <span className="font-medium text-white">{t.destination || 'Site'}</span>
                        </td>
                        <td className="py-1.5 px-2 text-right text-slate-400">
                          {t.mileageOut} → {t.mileageIn}
                        </td>
                        <td className="py-1.5 px-2 text-right font-bold text-blue-400">
                          {(t.mileageIn || 0) - (t.mileageOut || 0)}
                        </td>
                        <td className="py-1.5 px-2 font-sans">
                          {t.client ? (
                            <span className="text-emerald-400 font-medium">{t.client}</span>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                          {t.jobNumber && <span className="text-slate-400 text-[10px] ml-1">#{t.jobNumber}</span>}
                        </td>
                        <td className="py-1.5 px-2 font-sans text-slate-400 truncate max-w-[150px]">
                          {t.notes || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parseResult.trips.length > 5 && (
                <p className="text-[11px] text-slate-400 text-center">
                  + {parseResult.trips.length - 5} more trips will be imported...
                </p>
              )}
            </div>
          )}

          {/* Import Mode Selection */}
          <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <span className="font-semibold text-slate-200 block">Import Action Mode</span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-slate-400 text-[11px]">
                  Currently {currentTripCount} trips in your logbook
                </span>
                {currentTripCount > 0 && onClearAllTrips && (
                  <button
                    type="button"
                    onClick={() => {
                      onClearAllTrips();
                      setSuccessMessage('Database cleared. You now have a clean slate.');
                    }}
                    className="text-[11px] text-rose-400 hover:text-rose-300 underline font-medium"
                  >
                    Clear All Existing Now
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setImportMode('merge')}
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                  importMode === 'merge'
                    ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                    : 'border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Merge (Add New)
              </button>
              <button
                type="button"
                onClick={() => setImportMode('replace')}
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                  importMode === 'replace'
                    ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                    : 'border-slate-800 text-slate-400 hover:text-white'
                }`}
                title="Wipes existing trips and replaces with imported rows"
              >
                Replace Existing
              </button>
            </div>
          </div>

          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              {successMessage}
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              {errorMessage}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white border border-slate-800 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!parseResult || parseResult.trips.length === 0 || isProcessing}
              onClick={executeImport}
              className="px-5 py-2 rounded-xl bg-blue-600 text-xs font-bold text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center gap-2 transition-all hover:scale-105"
            >
              <ArrowRight className="w-4 h-4" />
              {isProcessing
                ? 'Importing...'
                : `Import ${parseResult?.trips.length || 0} Trips`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
