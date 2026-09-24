import React, { useState, useEffect } from 'react';
import { Trip, WorkSession, UserSettings, CustomExcelTemplate } from '../types';
import {
  weekRange,
  currentWeekAnchor,
  lastWeekAnchor,
  computeWeeklyTimesheet,
} from '../lib/timesheetLogic';
import { generateTimesheetExcel, generateTripsCSV, generateSessionsCSV } from '../lib/excelExport';
import {
  getCustomExcelTemplate,
  generateBlankMasterTemplate,
} from '../lib/templateStorage';
import { TemplateManagerModal } from './TemplateManagerModal';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  FileText,
  Printer,
  Gauge,
  CheckCircle,
  Sliders,
  Sparkles,
} from 'lucide-react';

interface TimesheetViewProps {
  trips: Trip[];
  sessions: WorkSession[];
  settings: UserSettings;
  onUpdateSettings?: (settings: UserSettings) => void;
}

const DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const TimesheetView: React.FC<TimesheetViewProps> = ({
  trips,
  sessions,
  settings,
  onUpdateSettings,
}) => {
  const [selectedAnchor, setSelectedAnchor] = useState<string>(currentWeekAnchor());
  const [isExporting, setIsExporting] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [customTemplateMeta, setCustomTemplateMeta] = useState<CustomExcelTemplate | null>(null);

  // Load custom template metadata on mount and when modal closes
  const reloadTemplateMeta = () => {
    getCustomExcelTemplate().then((res) => {
      setCustomTemplateMeta(res ? res.metadata : null);
    });
  };

  useEffect(() => {
    reloadTemplateMeta();
  }, [settings.templateMode]);

  const weekDays = weekRange(selectedAnchor);
  const calculation = computeWeeklyTimesheet(trips, sessions, weekDays);
  const { columns, daily, openingKm, closingKm, overflowClients } = calculation;

  // Move week backward / forward by 7 days
  const handleShiftWeek = (daysOffset: number) => {
    const [y, m, d] = selectedAnchor.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() + daysOffset);
    setSelectedAnchor(dt.toISOString().slice(0, 10));
  };

  // Totals
  const colTotals = columns.map((_, cIdx) => {
    let hrs = 0;
    let km = 0;
    weekDays.forEach((day) => {
      const d = daily[day];
      if (d && d.cols[cIdx]) {
        hrs += d.cols[cIdx].hrs;
        km += d.cols[cIdx].km;
      }
    });
    return { hrs, km };
  });

  const totalPrivateKm = weekDays.reduce((acc, day) => acc + (daily[day]?.pvte || 0), 0);
  const totalAllKm = colTotals.reduce((acc, c) => acc + c.km, 0) + totalPrivateKm;
  const totalAllHrs = colTotals.reduce((acc, c) => acc + c.hrs, 0);

  // Download real .xlsx Excel file (custom template or comprehensive standard)
  const handleDownloadExcel = async () => {
    try {
      setIsExporting(true);
      setExportNotice(null);

      // Check if custom template buffer is available and active
      let customBuffer: ArrayBuffer | null = null;
      if (settings.templateMode === 'custom' || (!settings.templateMode && customTemplateMeta)) {
        const stored = await getCustomExcelTemplate();
        if (stored) {
          customBuffer = stored.buffer;
        }
      }

      const { buffer, filename, templateUsed, sheetNameUsed } = await generateTimesheetExcel(
        trips,
        sessions,
        selectedAnchor,
        settings,
        customBuffer,
        settings.cellMapping
      );

      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const modeLabel =
        templateUsed === 'custom'
          ? `Exact Company Template (${customTemplateMeta?.filename || 'Uploaded File'} • ${sheetNameUsed})`
          : `Standard HR-018 Comprehensive Template`;

      setExportNotice(`Populated & downloaded: ${filename} [${modeLabel}]`);
      setTimeout(() => setExportNotice(null), 6000);
    } catch (err: any) {
      console.error('Failed to generate Excel file:', err);
      setExportNotice(err.message || 'Failed to generate Excel timesheet. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Fast download of clean blank master template
  const handleDownloadBlankTemplate = async () => {
    try {
      const buffer = await generateBlankMasterTemplate(settings.cellMapping, settings);
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
      setExportNotice('Blank HR-018 Master Template (.xlsx) downloaded.');
      setTimeout(() => setExportNotice(null), 4000);
    } catch (err) {
      console.error('Failed to generate master template:', err);
    }
  };

  // Download CSV
  const handleDownloadCSV = () => {
    const tripsCsv = generateTripsCSV(trips);
    const blob = new Blob([tripsCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Trips_Log_${selectedAnchor}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  const isCustomActive =
    settings.templateMode === 'custom' || (!settings.templateMode && !!customTemplateMeta);

  return (
    <div className="space-y-6">
      {/* Top Controls: Week Navigator and Export Buttons */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-400" />
            HR-018 Weekly Timesheet & Vehicle Log
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Automatic attribution: KM from odometer trips • HRS from Time On/Off sessions
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Week Selection Buttons */}
          <div className="flex items-center rounded-xl border border-slate-800 bg-slate-900/80 p-1">
            <button
              type="button"
              onClick={() => handleShiftWeek(-7)}
              className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors"
              title="Previous Week"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setSelectedAnchor(currentWeekAnchor())}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                selectedAnchor === currentWeekAnchor()
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              This Week
            </button>

            <button
              type="button"
              onClick={() => setSelectedAnchor(lastWeekAnchor())}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                selectedAnchor === lastWeekAnchor()
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Last Week
            </button>

            <button
              type="button"
              onClick={() => handleShiftWeek(7)}
              className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors"
              title="Next Week"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={selectedAnchor}
              onChange={(e) => e.target.value && setSelectedAnchor(e.target.value)}
              className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Template Config / Uploader Button */}
          <button
            type="button"
            onClick={() => setIsTemplateModalOpen(true)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-all ${
              isCustomActive
                ? 'border-blue-500/50 bg-blue-950/40 text-blue-300 hover:bg-blue-900/50'
                : 'border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800'
            }`}
            title="Configure Exact Spreadsheet Template & Coordinates"
          >
            <Sliders className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">
              {isCustomActive
                ? `Template: ${customTemplateMeta?.filename || 'Custom'}`
                : 'Template Engine'}
            </span>
            <span className="sm:hidden">Template</span>
          </button>

          {/* Export Buttons */}
          <button
            type="button"
            onClick={handleDownloadExcel}
            disabled={isExporting}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-lg hover:bg-emerald-500 transition-all hover:scale-105 disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            {isExporting ? 'Populating Excel...' : 'Download Excel (.xlsx)'}
          </button>

          <button
            type="button"
            onClick={handleDownloadCSV}
            className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
          >
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            CSV
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-slate-400" />
            Print
          </button>
        </div>
      </div>

      {/* Template Status Pill Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-2.5 text-xs">
        <div className="flex items-center gap-2">
          <div
            className={`h-2 w-2 rounded-full ${
              isCustomActive ? 'bg-blue-400 animate-pulse' : 'bg-emerald-400'
            }`}
          />
          <span className="text-slate-400">Current Template Target:</span>
          <span className="font-semibold text-slate-200">
            {isCustomActive ? (
              <span className="text-blue-400">
                Exact Company Spreadsheet ({customTemplateMeta?.filename || 'Uploaded .xlsx'} • Sheet:{' '}
                {settings.cellMapping?.sheetName || 'HR-018 Timesheet'})
              </span>
            ) : (
              <span className="text-emerald-400">HR-018 Built-in Comprehensive Master</span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleDownloadBlankTemplate}
            className="text-[11px] text-slate-400 hover:text-slate-200 underline transition-colors"
          >
            Download Blank Master .xlsx
          </button>
          <span className="text-slate-600">•</span>
          <button
            type="button"
            onClick={() => setIsTemplateModalOpen(true)}
            className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 underline transition-colors"
          >
            Manage Template / Cell Coordinates
          </button>
        </div>
      </div>

      {/* Export feedback toast */}
      {exportNotice && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-3 text-xs text-emerald-300">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{exportNotice}</span>
        </div>
      )}

      {/* Overflow Warning */}
      {overflowClients.length > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-950/40 p-3.5 text-xs text-amber-300">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
          <span>
            <strong>Notice:</strong> This week includes {overflowClients.length} additional chargeable client/job combinations beyond the standard 9 form slots. Their time and KM are saved in your logs and database.
          </span>
        </div>
      )}

      {/* HR-018 Form Sheet Container */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 shadow-2xl overflow-hidden print:border-black print:bg-white print:text-black">
        {/* Form Header Information (B1, K1, W1) */}
        <div className="border-b border-slate-800 bg-slate-950/60 p-4 print:bg-transparent">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-6">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Name (Cell B1)
                </span>
                <p className="text-sm font-bold text-slate-100 font-mono mt-0.5">
                  {settings.driverName || 'Not configured'}
                </p>
              </div>

              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Region (Cell K1)
                </span>
                <p className="text-sm font-bold text-slate-100 font-mono mt-0.5">
                  {settings.region || 'Not configured'}
                </p>
              </div>

              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Vehicle
                </span>
                <p className="text-sm font-bold text-slate-100 font-mono mt-0.5">
                  {settings.vehicleName} ({settings.vehicleRego})
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 justify-end">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Week Ending (Cell W1)
              </span>
              <p className="text-sm font-bold text-blue-400 font-mono mt-0.5">
                Sunday, {weekDays[6]}
              </p>
            </div>
          </div>
        </div>

        {/* Matrix Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              {/* Row 1: Client Names */}
              <tr className="border-b border-slate-800 bg-slate-950 text-slate-300">
                <th className="p-2.5 font-bold uppercase tracking-wider text-slate-400 border-r border-slate-800 min-w-[140px]">
                  CLIENT
                </th>
                {columns.map((col, idx) => (
                  <th
                    key={idx}
                    colSpan={2}
                    className={`p-2.5 text-center font-bold border-r border-slate-800 min-w-[120px] ${
                      col.type === 'admin' ? 'bg-amber-950/20 text-amber-300' : 'text-slate-100'
                    }`}
                  >
                    {col.client}
                  </th>
                ))}
                <th className="p-2.5 text-center font-bold text-rose-300 min-w-[90px]">
                  PRIVATE
                </th>
              </tr>

              {/* Row 2: Job Numbers */}
              <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400">
                <th className="p-2 font-bold uppercase tracking-wider text-slate-500 border-r border-slate-800">
                  JOB NUMBER
                </th>
                {columns.map((col, idx) => (
                  <th
                    key={idx}
                    colSpan={2}
                    className={`p-2 text-center font-mono text-[11px] border-r border-slate-800 ${
                      col.type === 'admin' ? 'bg-amber-950/20 text-amber-400/80' : 'text-blue-300'
                    }`}
                  >
                    {col.jobNumber || (col.type === 'admin' ? 'Admin' : '-')}
                  </th>
                ))}
                <th className="p-2 text-center font-mono text-[11px] text-rose-400">
                  -
                </th>
              </tr>

              {/* Row 3: Subheaders (HRS / KM) */}
              <tr className="border-b border-slate-800 bg-slate-900 text-slate-400 font-mono text-[11px]">
                <th className="p-2 font-bold text-slate-300 border-r border-slate-800">
                  DAY / DATE
                </th>
                {columns.map((col, idx) => (
                  <React.Fragment key={idx}>
                    <th className={`p-1.5 text-center font-semibold border-r border-slate-800/60 w-16 ${col.type === 'admin' ? 'bg-amber-950/10 text-amber-300' : 'text-slate-300'}`}>
                      HRS
                    </th>
                    <th className={`p-1.5 text-center font-semibold border-r border-slate-800 w-16 ${col.type === 'admin' ? 'bg-amber-950/10 text-amber-300' : 'text-slate-300'}`}>
                      KM
                    </th>
                  </React.Fragment>
                ))}
                <th className="p-1.5 text-center font-semibold text-rose-300 w-20">
                  KM
                </th>
              </tr>
            </thead>

            {/* Daily Rows */}
            <tbody className="divide-y divide-slate-800/80 font-mono">
              {weekDays.map((day, idx) => {
                const dayData = daily[day] || { cols: [], pvte: 0 };
                const dayName = DAY_LABELS[idx];

                return (
                  <tr key={day} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-2.5 font-sans font-semibold text-slate-200 border-r border-slate-800 whitespace-nowrap">
                      {dayName}{' '}
                      <span className="font-mono text-xs font-normal text-slate-500 ml-1">
                        {day.slice(5)}
                      </span>
                    </td>

                    {columns.map((col, cIdx) => {
                      const colData = dayData.cols[cIdx] || { hrs: 0, km: 0 };
                      const roundedHrs = colData.hrs > 0 ? Math.round(colData.hrs * 4) / 4 : 0;
                      const roundedKm = colData.km > 0 ? Math.round(colData.km) : 0;

                      return (
                        <React.Fragment key={cIdx}>
                          <td
                            className={`p-2 text-right border-r border-slate-800/60 ${
                              roundedHrs > 0 ? 'text-emerald-400 font-bold' : 'text-slate-600'
                            } ${col.type === 'admin' ? 'bg-amber-950/5' : ''}`}
                          >
                            {roundedHrs > 0 ? roundedHrs.toFixed(2) : '-'}
                          </td>
                          <td
                            className={`p-2 text-right border-r border-slate-800 ${
                              roundedKm > 0 ? 'text-blue-300 font-bold' : 'text-slate-600'
                            } ${col.type === 'admin' ? 'bg-amber-950/5' : ''}`}
                          >
                            {roundedKm > 0 ? roundedKm : '-'}
                          </td>
                        </React.Fragment>
                      );
                    })}

                    <td className="p-2 text-right text-rose-300 font-bold">
                      {dayData.pvte > 0 ? Math.round(dayData.pvte) : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Totals Row */}
            <tfoot>
              <tr className="border-t-2 border-slate-700 bg-slate-950/90 font-mono font-bold text-slate-100">
                <td className="p-3 font-sans font-extrabold uppercase tracking-wider text-slate-200 border-r border-slate-800">
                  TOTALS:
                </td>
                {columns.map((col, cIdx) => {
                  const t = colTotals[cIdx];
                  return (
                    <React.Fragment key={cIdx}>
                      <td
                        className={`p-2 text-right border-r border-slate-800/60 ${
                          t.hrs > 0 ? 'text-emerald-400' : 'text-slate-600'
                        } ${col.type === 'admin' ? 'bg-amber-950/20' : ''}`}
                      >
                        {t.hrs > 0 ? t.hrs.toFixed(2) : '0.00'}
                      </td>
                      <td
                        className={`p-2 text-right border-r border-slate-800 ${
                          t.km > 0 ? 'text-blue-300' : 'text-slate-600'
                        } ${col.type === 'admin' ? 'bg-amber-950/20' : ''}`}
                      >
                        {t.km > 0 ? Math.round(t.km) : '0'}
                      </td>
                    </React.Fragment>
                  );
                })}
                <td className="p-2 text-right text-rose-400 font-extrabold">
                  {Math.round(totalPrivateKm)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Odometer Reconciliation Footer (Cells AA21 & AA22) */}
        <div className="border-t border-slate-800 bg-slate-950/80 p-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
                <Gauge className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-100">
                  Odometer Reconciliation & Balance
                </h4>
                <p className="text-xs text-slate-400">
                  Week boundary integrity (opening vs closing readings)
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6">
              <div className="rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Opening KM (AA22)
                </span>
                <p className="text-base font-bold font-mono text-slate-200">
                  {openingKm !== null ? openingKm.toLocaleString() : 'No trips'}
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Closing KM (AA21)
                </span>
                <p className="text-base font-bold font-mono text-slate-200">
                  {closingKm !== null ? closingKm.toLocaleString() : 'No trips'}
                </p>
              </div>

              <div className="rounded-xl border border-blue-500/30 bg-blue-950/30 px-4 py-2">
                <span className="text-[11px] font-bold text-blue-300 uppercase tracking-wider">
                  Total Travel (AA21 - AA22)
                </span>
                <p className="text-base font-bold font-mono text-blue-400">
                  {openingKm !== null && closingKm !== null
                    ? `${(closingKm - openingKm).toLocaleString()} KM`
                    : `${totalAllKm.toLocaleString()} KM`}
                </p>
              </div>

              <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 px-4 py-2">
                <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider">
                  Total Hours
                </span>
                <p className="text-base font-bold font-mono text-emerald-400">
                  {totalAllHrs.toFixed(2)} HRS
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Template Manager Modal */}
      <TemplateManagerModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        settings={settings}
        onUpdateSettings={(newSettings) => {
          onUpdateSettings?.(newSettings);
        }}
        onTemplateChanged={reloadTemplateMeta}
      />
    </div>
  );
};
