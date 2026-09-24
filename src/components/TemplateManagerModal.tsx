import React, { useState, useEffect } from 'react';
import { CellMappingConfig, CustomExcelTemplate, UserSettings } from '../types';
import {
  saveCustomExcelTemplate,
  getCustomExcelTemplate,
  deleteCustomExcelTemplate,
  loadCellMapping,
  saveCellMapping,
  resetCellMapping,
  generateBlankMasterTemplate,
  DEFAULT_CELL_MAPPING,
} from '../lib/templateStorage';
import {
  FileSpreadsheet,
  Upload,
  Download,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  FileCheck,
  Settings2,
  Sliders,
  RotateCcw,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface TemplateManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onUpdateSettings: (newSettings: UserSettings) => void;
  onTemplateChanged?: () => void;
}

export const TemplateManagerModal: React.FC<TemplateManagerModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onTemplateChanged,
}) => {
  const [templateMode, setTemplateMode] = useState<'standard' | 'custom'>(
    settings.templateMode || 'standard'
  );
  const [customTemplate, setCustomTemplate] = useState<CustomExcelTemplate | null>(null);
  const [mapping, setMapping] = useState<CellMappingConfig>(() => settings.cellMapping || loadCellMapping());
  const [activeTab, setActiveTab] = useState<'template' | 'mapping' | 'preview'>('template');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isDownloadingMaster, setIsDownloadingMaster] = useState(false);

  // Load custom template details when modal opens
  useEffect(() => {
    if (isOpen) {
      setTemplateMode(settings.templateMode || 'standard');
      setMapping(settings.cellMapping || loadCellMapping());
      setErrorMsg(null);
      setSuccessMsg(null);

      getCustomExcelTemplate().then((res) => {
        if (res) {
          setCustomTemplate(res.metadata);
          // If custom template exists and mode not set, suggest custom
          if (!settings.templateMode) {
            setTemplateMode('custom');
          }
        } else {
          setCustomTemplate(null);
        }
      });
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const showNotification = (msg: string, isError = false) => {
    if (isError) {
      setErrorMsg(msg);
      setSuccessMsg(null);
    } else {
      setSuccessMsg(msg);
      setErrorMsg(null);
    }
    setTimeout(() => {
      setErrorMsg(null);
      setSuccessMsg(null);
    }, 4500);
  };

  // Upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx')) {
      showNotification('Please upload a Microsoft Excel (.xlsx) file.', true);
      return;
    }

    try {
      setIsLoading(true);
      const { metadata } = await saveCustomExcelTemplate(file);
      setCustomTemplate(metadata);
      setTemplateMode('custom');

      // Update mapping sheetName if detected sheet exists
      const updatedMapping = {
        ...mapping,
        sheetName: metadata.detectedSheetNames[0] || mapping.sheetName,
      };
      setMapping(updatedMapping);

      const nextSettings: UserSettings = {
        ...settings,
        templateMode: 'custom',
        cellMapping: updatedMapping,
      };
      onUpdateSettings(nextSettings);
      saveCellMapping(updatedMapping);

      showNotification(`Template "${file.name}" loaded successfully (${metadata.detectedSheetNames.length} sheet(s) detected).`);
      onTemplateChanged?.();
    } catch (err: any) {
      console.error('Template upload error:', err);
      showNotification(err.message || 'Failed to read Excel template file.', true);
    } finally {
      setIsLoading(false);
      e.target.value = '';
    }
  };

  const handleDeleteTemplate = async () => {
    await deleteCustomExcelTemplate();
    setCustomTemplate(null);
    setTemplateMode('standard');

    const nextSettings: UserSettings = {
      ...settings,
      templateMode: 'standard',
    };
    onUpdateSettings(nextSettings);
    showNotification('Custom template removed. Standard HR-018 template is active.');
    onTemplateChanged?.();
  };

  const handleDownloadMasterTemplate = async () => {
    try {
      setIsDownloadingMaster(true);
      const buffer = await generateBlankMasterTemplate(mapping, settings);
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `HR-018_Master_Template_Blank.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showNotification('Master Blank Template (.xlsx) downloaded.');
    } catch (err) {
      console.error('Download master template error:', err);
      showNotification('Failed to generate template download.', true);
    } finally {
      setIsDownloadingMaster(false);
    }
  };

  const handleSaveAll = () => {
    saveCellMapping(mapping);
    const nextSettings: UserSettings = {
      ...settings,
      templateMode,
      cellMapping: mapping,
    };
    onUpdateSettings(nextSettings);
    showNotification('Template configuration & mappings saved.');
    onTemplateChanged?.();
    setTimeout(() => {
      onClose();
    }, 600);
  };

  const handleResetMappingToDefault = () => {
    const def = resetCellMapping();
    setMapping(def);
    showNotification('Cell mapping reset to default HR-018 coordinates.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Spreadsheet Template & HR-018 Engine
              </h2>
              <p className="text-xs text-slate-400">
                Populate your company&apos;s exact Excel (.xlsx) file or use the built-in comprehensive template
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 px-6 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('template')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-all ${
              activeTab === 'template'
                ? 'border-blue-500 text-blue-400 bg-slate-900/60'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Template Source</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('mapping')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-all ${
              activeTab === 'mapping'
                ? 'border-blue-500 text-blue-400 bg-slate-900/60'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Cell Mappings</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-all ${
              activeTab === 'preview'
                ? 'border-blue-500 text-blue-400 bg-slate-900/60'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCheck className="w-4 h-4" />
            <span>Target Preview</span>
          </button>
        </div>

        {/* Feedback Messages */}
        {errorMsg && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-xl bg-red-950/60 border border-red-500/40 p-3 text-xs text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-xl bg-emerald-950/60 border border-emerald-500/40 p-3 text-xs text-emerald-300">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Body content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: TEMPLATE SOURCE */}
          {activeTab === 'template' && (
            <div className="space-y-6">
              {/* Active Mode Selector */}
              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-3">
                  Export Generation Mode
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Option A: Custom Uploaded Template */}
                  <div
                    onClick={() => setTemplateMode('custom')}
                    className={`cursor-pointer relative rounded-xl border p-4 transition-all ${
                      templateMode === 'custom'
                        ? 'border-blue-500 bg-blue-950/20 ring-1 ring-blue-500/50'
                        : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                          <FileSpreadsheet className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-100">Exact Company Spreadsheet</h4>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Upload your official corporate .xlsx file
                          </p>
                        </div>
                      </div>
                      <input
                        type="radio"
                        checked={templateMode === 'custom'}
                        onChange={() => setTemplateMode('custom')}
                        className="mt-1 accent-blue-500"
                      />
                    </div>
                    <p className="mt-3 text-xs text-slate-300 leading-relaxed">
                      Loads your exact workbook, preserving all corporate headers, company logos, existing formulas,
                      macros, and worksheets, writing data straight into the configured cells.
                    </p>
                    {customTemplate && (
                      <div className="mt-3 flex items-center gap-2 text-[11px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-2.5 py-1 rounded-md">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Ready: {customTemplate.filename}</span>
                      </div>
                    )}
                  </div>

                  {/* Option B: Built-in HR-018 Template */}
                  <div
                    onClick={() => setTemplateMode('standard')}
                    className={`cursor-pointer relative rounded-xl border p-4 transition-all ${
                      templateMode === 'standard'
                        ? 'border-blue-500 bg-blue-950/20 ring-1 ring-blue-500/50'
                        : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-slate-800 text-slate-300">
                          <Settings2 className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-100">Standard Built-in Template</h4>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Compliant HR-018 format with formulas
                          </p>
                        </div>
                      </div>
                      <input
                        type="radio"
                        checked={templateMode === 'standard'}
                        onChange={() => setTemplateMode('standard')}
                        className="mt-1 accent-blue-500"
                      />
                    </div>
                    <p className="mt-3 text-xs text-slate-300 leading-relaxed">
                      Generates a full-featured Microsoft Excel workbook with standard Column 0 (Admin) and Columns 1–9
                      (Clients), automatic =SUM() formulas, landscape print setup, and double-underline borders.
                    </p>
                  </div>
                </div>
              </div>

              {/* Upload Dropzone */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <Upload className="w-4 h-4 text-blue-400" />
                    Upload Company Excel File (.xlsx)
                  </h3>
                  <button
                    type="button"
                    onClick={handleDownloadMasterTemplate}
                    disabled={isDownloadingMaster}
                    className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Blank HR-018 Template</span>
                  </button>
                </div>

                {customTemplate ? (
                  <div className="rounded-xl border border-slate-700/80 bg-slate-900/80 p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
                          <FileSpreadsheet className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white">{customTemplate.filename}</h4>
                          <p className="text-xs text-slate-400">
                            {(customTemplate.fileSize / 1024).toFixed(1)} KB • Uploaded on{' '}
                            {new Date(customTemplate.uploadedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition-colors">
                          <Upload className="w-3.5 h-3.5" />
                          <span>Replace</span>
                          <input
                            type="file"
                            accept=".xlsx"
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                        </label>

                        <button
                          type="button"
                          onClick={handleDeleteTemplate}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-950/30 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-900/40 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>

                    {/* Sheet Selector */}
                    <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <label className="text-xs text-slate-300">
                        Target Worksheet in Workbook:
                      </label>
                      <select
                        value={mapping.sheetName}
                        onChange={(e) => setMapping({ ...mapping, sheetName: e.target.value })}
                        className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-white focus:border-blue-500 focus:outline-none"
                      >
                        {customTemplate.detectedSheetNames.map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-800 hover:border-blue-500/50 bg-slate-900/40 p-8 text-center cursor-pointer transition-all hover:bg-slate-900/80">
                    <Upload className="w-8 h-8 text-slate-500 mb-2" />
                    <span className="text-sm font-semibold text-slate-200">
                      Click or drag your company spreadsheet template here
                    </span>
                    <span className="text-xs text-slate-400 mt-1">
                      Supports any standard Microsoft Excel (.xlsx) file
                    </span>
                    <input
                      type="file"
                      accept=".xlsx"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: CELL MAPPINGS */}
          {activeTab === 'mapping' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Exact Spreadsheet Coordinates
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Match where each piece of HR-018 timesheet data is placed in your Excel template
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleResetMappingToDefault}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 rounded-lg border border-slate-800 px-2.5 py-1.5 hover:bg-slate-800 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset to HR-018 Default</span>
                </button>
              </div>

              {/* Group 1: Header Cells */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 space-y-3">
                <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                  Header & Employee Information
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Driver Name Cell</label>
                    <input
                      type="text"
                      value={mapping.nameCell}
                      onChange={(e) => setMapping({ ...mapping, nameCell: e.target.value.toUpperCase() })}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-mono text-white text-center focus:border-blue-500 focus:outline-none"
                      placeholder="B1"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Region / Depot Cell</label>
                    <input
                      type="text"
                      value={mapping.regionCell}
                      onChange={(e) => setMapping({ ...mapping, regionCell: e.target.value.toUpperCase() })}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-mono text-white text-center focus:border-blue-500 focus:outline-none"
                      placeholder="K1"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Week Ending Cell</label>
                    <input
                      type="text"
                      value={mapping.weekEndingCell}
                      onChange={(e) => setMapping({ ...mapping, weekEndingCell: e.target.value.toUpperCase() })}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-mono text-white text-center focus:border-blue-500 focus:outline-none"
                      placeholder="W1"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Vehicle Rego Cell</label>
                    <input
                      type="text"
                      value={mapping.vehicleRegoCell || ''}
                      onChange={(e) => setMapping({ ...mapping, vehicleRegoCell: e.target.value.toUpperCase() })}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-mono text-white text-center focus:border-blue-500 focus:outline-none"
                      placeholder="(Optional)"
                    />
                  </div>
                </div>
              </div>

              {/* Group 2: Odometer Reconciliation Cells */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 space-y-3">
                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  Odometer Reconciliation Block
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Closing KM Cell</label>
                    <input
                      type="text"
                      value={mapping.closingKmCell}
                      onChange={(e) => setMapping({ ...mapping, closingKmCell: e.target.value.toUpperCase() })}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-mono text-white text-center focus:border-blue-500 focus:outline-none"
                      placeholder="AA21"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Opening KM Cell</label>
                    <input
                      type="text"
                      value={mapping.openingKmCell}
                      onChange={(e) => setMapping({ ...mapping, openingKmCell: e.target.value.toUpperCase() })}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-mono text-white text-center focus:border-blue-500 focus:outline-none"
                      placeholder="AA22"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Total Distance Cell</label>
                    <input
                      type="text"
                      value={mapping.totalDistanceCell || ''}
                      onChange={(e) => setMapping({ ...mapping, totalDistanceCell: e.target.value.toUpperCase() })}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-mono text-white text-center focus:border-blue-500 focus:outline-none"
                      placeholder="AA23"
                    />
                  </div>
                </div>
              </div>

              {/* Group 3: Days Rows */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 space-y-3">
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                  Daily Rows (Monday – Sunday)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-7 gap-2">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => (
                    <div key={day}>
                      <label className="text-[10px] text-slate-400 block mb-1 text-center font-bold">
                        {day} Row
                      </label>
                      <input
                        type="number"
                        value={mapping.dayRows[idx] || ''}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          const nextRows = [...mapping.dayRows];
                          nextRows[idx] = val;
                          setMapping({ ...mapping, dayRows: nextRows });
                        }}
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs font-mono text-white text-center focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Group 4: Column Placements */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 space-y-3">
                <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider">
                  Admin & Private Columns
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Admin HRS Column</label>
                    <input
                      type="text"
                      value={mapping.adminHrsCol}
                      onChange={(e) => setMapping({ ...mapping, adminHrsCol: e.target.value.toUpperCase() })}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-mono text-white text-center focus:border-blue-500 focus:outline-none"
                      placeholder="B"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Admin KM Column</label>
                    <input
                      type="text"
                      value={mapping.adminKmCol}
                      onChange={(e) => setMapping({ ...mapping, adminKmCol: e.target.value.toUpperCase() })}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-mono text-white text-center focus:border-blue-500 focus:outline-none"
                      placeholder="C"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Private KM Column</label>
                    <input
                      type="text"
                      value={mapping.privateKmCol}
                      onChange={(e) => setMapping({ ...mapping, privateKmCol: e.target.value.toUpperCase() })}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-mono text-white text-center focus:border-blue-500 focus:outline-none"
                      placeholder="AA"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TARGET PREVIEW */}
          {activeTab === 'preview' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Live Population Preview
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Here is how the data will be written into the spreadsheet template
                </p>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <table className="w-full text-xs text-left">
                  <thead className="text-[11px] text-slate-400 uppercase border-b border-slate-800">
                    <tr>
                      <th className="py-2 px-3">Field Name</th>
                      <th className="py-2 px-3">Mapped Target Cell</th>
                      <th className="py-2 px-3">Sample Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    <tr>
                      <td className="py-2 px-3 font-semibold text-white">Driver Name</td>
                      <td className="py-2 px-3 font-mono text-blue-400">{mapping.nameCell}</td>
                      <td className="py-2 px-3">{settings.driverName || 'Technician Name'}</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-semibold text-white">Region</td>
                      <td className="py-2 px-3 font-mono text-blue-400">{mapping.regionCell}</td>
                      <td className="py-2 px-3">{settings.region || 'Operating Depot'}</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-semibold text-white">Week Ending Date</td>
                      <td className="py-2 px-3 font-mono text-blue-400">{mapping.weekEndingCell}</td>
                      <td className="py-2 px-3">[Current Sunday YYYY-MM-DD]</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-semibold text-white">Admin Column (Hrs / Km)</td>
                      <td className="py-2 px-3 font-mono text-blue-400">
                        {mapping.adminHrsCol} (HRS), {mapping.adminKmCol} (KM)
                      </td>
                      <td className="py-2 px-3">Shop/Depot work & Admin travels</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-semibold text-white">Client 1 (Hrs / Km)</td>
                      <td className="py-2 px-3 font-mono text-blue-400">
                        {mapping.clientColPairs[0]?.[0]} (HRS), {mapping.clientColPairs[0]?.[1]} (KM)
                      </td>
                      <td className="py-2 px-3">{settings.clients[0] || 'Client 1'}</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-semibold text-white">Closing KM (Odometer)</td>
                      <td className="py-2 px-3 font-mono text-emerald-400">{mapping.closingKmCell}</td>
                      <td className="py-2 px-3">{settings.currentOdometer || 148560}</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-semibold text-white">Opening KM (Odometer)</td>
                      <td className="py-2 px-3 font-mono text-emerald-400">{mapping.openingKmCell}</td>
                      <td className="py-2 px-3">{(settings.currentOdometer || 148560) - 340}</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-semibold text-white">Private Mileage</td>
                      <td className="py-2 px-3 font-mono text-purple-400">{mapping.privateKmCol}</td>
                      <td className="py-2 px-3">Personal & Commute distance</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-slate-900/90 px-6 py-4">
          <div className="text-xs text-slate-400">
            Active Mode:{' '}
            <span className="font-semibold text-white">
              {templateMode === 'custom'
                ? `Custom Template (${customTemplate?.filename || 'Uploaded File'})`
                : 'Built-in HR-018 Standard'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-blue-500 transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Save & Apply Template</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
