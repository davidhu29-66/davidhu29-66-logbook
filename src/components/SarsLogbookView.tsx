import React, { useState } from 'react';
import { Trip, UserSettings } from '../types';
import {
  currentMonthAnchor,
  shiftMonth,
  computeMonthlySarsSummary,
} from '../lib/timesheetLogic';
import { generateSarsMonthlyExcel, generateSarsMonthlyCSV } from '../lib/excelExport';
import {
  FileCheck,
  Printer,
  Download,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  Car,
  User,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Building,
  Info,
} from 'lucide-react';

interface SarsLogbookViewProps {
  trips: Trip[];
  settings: UserSettings;
  onOpenSettings?: () => void;
}

export const SarsLogbookView: React.FC<SarsLogbookViewProps> = ({
  trips,
  settings,
  onOpenSettings,
}) => {
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthAnchor());
  const [isExporting, setIsExporting] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'business' | 'private'>('all');

  const summary = computeMonthlySarsSummary(trips, selectedMonth);

  const handleShiftMonth = (delta: number) => {
    setSelectedMonth((prev) => shiftMonth(prev, delta));
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadExcel = async () => {
    try {
      setIsExporting(true);
      setExportNotice(null);
      const { buffer, filename } = await generateSarsMonthlyExcel(trips, selectedMonth, settings);

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

      setExportNotice(`Generated SARS Logbook: ${filename}`);
      setTimeout(() => setExportNotice(null), 5000);
    } catch (err: any) {
      console.error('Failed to generate SARS Excel:', err);
      setExportNotice('Failed to generate Excel file. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadCSV = () => {
    const csv = generateSarsMonthlyCSV(trips, selectedMonth, settings);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SARS_Logbook_${selectedMonth}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Filtered trips for on-screen viewing (print view shows all trips)
  const displayTrips = summary.trips.filter((t) => {
    if (filterMode === 'business') return t.category === 'business';
    if (filterMode === 'private') return t.category === 'private';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Actions Bar (Hidden during print) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-emerald-400" />
              Monthly Trip Sheet & SARS Logbook
            </h2>
            <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-300 uppercase">
              SARS Section 8(1)(b)
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Official vehicle logbook for travel allowances, fringe benefits, and tax audit compliance
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Month Selector Controls */}
          <div className="flex items-center rounded-xl border border-slate-800 bg-slate-900/80 p-1">
            <button
              type="button"
              onClick={() => handleShiftMonth(-1)}
              className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setSelectedMonth(currentMonthAnchor())}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                selectedMonth === currentMonthAnchor()
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              This Month
            </button>

            <button
              type="button"
              onClick={() => handleShiftMonth(1)}
              className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => e.target.value && setSelectedMonth(e.target.value)}
              className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Primary Action Buttons */}
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-lg hover:bg-blue-500 transition-all hover:scale-105"
            title="Print clean A4/Letter monthly logbook or Save as PDF"
          >
            <Printer className="w-4 h-4" />
            <span>Print Logbook</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadExcel}
            disabled={isExporting}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-md hover:bg-emerald-500 transition-all hover:scale-105 disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExporting ? 'Generating...' : 'Export Excel (.xlsx)'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadCSV}
            className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
          >
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Export notification toast */}
      {exportNotice && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-3 text-xs text-emerald-300 print:hidden">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{exportNotice}</span>
        </div>
      )}

      {/* PRINT-ONLY OFFICIAL HEADER */}
      <div className="hidden print:block border-b-2 border-black pb-4 mb-4 text-black">
        <div className="text-center">
          <h1 className="text-xl font-bold uppercase tracking-wider">
            South African Revenue Service (SARS) — Vehicle Travel Logbook
          </h1>
          <p className="text-xs text-gray-700 italic mt-0.5">
            Prescribed Monthly Logbook for Section 8(1)(b) Income Tax Act • Travel Allowance & Fringe Benefit Claim
          </p>
          <p className="text-sm font-bold mt-1">
            LOG PERIOD: {summary.monthLabel.toUpperCase()}
          </p>
        </div>
      </div>

      {/* Taxpayer & Vehicle Metadata Card */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 print:border-black print:bg-white print:p-2 print:text-black">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3 mb-3 print:border-black print:pb-2 print:mb-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 print:hidden" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 print:text-black">
              1. Taxpayer & Vehicle Particulars
            </h3>
          </div>
          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="text-[11px] text-blue-400 hover:text-blue-300 underline print:hidden self-start sm:self-auto"
            >
              Update SARS Tax / Vehicle Credentials
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 print:text-gray-600 block">
              Taxpayer Full Name
            </span>
            <span className="font-bold text-slate-100 print:text-black text-sm">
              {settings.driverName || 'Not configured'}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 print:text-gray-600 block">
              ID / Passport Number
            </span>
            <span className="font-mono font-bold text-slate-200 print:text-black">
              {settings.idNumber || '8804125089083'}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 print:text-gray-600 block">
              SARS Tax Reference No
            </span>
            <span className="font-mono font-bold text-blue-400 print:text-black">
              {settings.taxReferenceNo || '9482716304'}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 print:text-gray-600 block">
              Employer / Business
            </span>
            <span className="font-bold text-slate-200 print:text-black">
              {settings.employerName || settings.region || 'Field Operations'}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 print:text-gray-600 block">
              Vehicle Make & Model
            </span>
            <span className="font-bold text-slate-200 print:text-black">
              {settings.vehicleName || 'Toyota Hilux 4x4'}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 print:text-gray-600 block">
              Vehicle Registration No
            </span>
            <span className="font-mono font-bold text-slate-200 print:text-black">
              {settings.vehicleRego || 'ABC-492'}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 print:text-gray-600 block">
              Vehicle Cost / Value
            </span>
            <span className="font-mono text-slate-300 print:text-black">
              {settings.vehicleCostPrice
                ? `R ${settings.vehicleCostPrice.toLocaleString()}`
                : 'R 385,000'}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 print:text-gray-600 block">
              Period / Month
            </span>
            <span className="font-bold text-emerald-400 print:text-black">
              {summary.monthLabel}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Monthly Summary Key Metrics (SARS Official Totals) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 print:grid-cols-6 print:gap-1.5 print:text-black">
        {/* Opening KM */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3 print:border-black print:bg-white print:p-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 print:text-gray-600">
            Opening Odo (KM)
          </span>
          <p className="text-lg font-bold font-mono text-slate-100 print:text-black mt-1">
            {summary.openingKm !== null ? summary.openingKm.toLocaleString() : '-'}
          </p>
          <span className="text-[10px] text-slate-500 print:text-gray-500">1st trip reading</span>
        </div>

        {/* Closing KM */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3 print:border-black print:bg-white print:p-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 print:text-gray-600">
            Closing Odo (KM)
          </span>
          <p className="text-lg font-bold font-mono text-slate-100 print:text-black mt-1">
            {summary.closingKm !== null ? summary.closingKm.toLocaleString() : '-'}
          </p>
          <span className="text-[10px] text-slate-500 print:text-gray-500">End of month</span>
        </div>

        {/* Total Travel */}
        <div className="rounded-xl border border-blue-500/30 bg-blue-950/30 p-3 print:border-black print:bg-white print:p-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300 print:text-black">
            Total Distance
          </span>
          <p className="text-lg font-bold font-mono text-blue-400 print:text-black mt-1">
            {summary.totalRecordedKm.toLocaleString()} KM
          </p>
          <span className="text-[10px] text-blue-300/70 print:text-gray-500">
            {summary.tripCount} trips logged
          </span>
        </div>

        {/* Business Travel */}
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-3 print:border-black print:bg-white print:p-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 print:text-black">
            Business Travel
          </span>
          <p className="text-lg font-bold font-mono text-emerald-400 print:text-black mt-1">
            {summary.totalBusinessKm.toLocaleString()} KM
          </p>
          <span className="text-[10px] text-emerald-400/80 print:text-gray-500">
            Tax deductible
          </span>
        </div>

        {/* Private Travel */}
        <div className="rounded-xl border border-rose-500/30 bg-rose-950/30 p-3 print:border-black print:bg-white print:p-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-300 print:text-black">
            Private Travel
          </span>
          <p className="text-lg font-bold font-mono text-rose-400 print:text-black mt-1">
            {summary.totalPrivateKm.toLocaleString()} KM
          </p>
          <span className="text-[10px] text-rose-300/70 print:text-gray-500">
            Commute / Personal
          </span>
        </div>

        {/* Business Percentage */}
        <div className="rounded-xl border border-purple-500/30 bg-purple-950/30 p-3 print:border-black print:bg-white print:p-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300 print:text-black">
            Business %
          </span>
          <p className="text-lg font-bold font-mono text-purple-300 print:text-black mt-1">
            {summary.businessPercentage.toFixed(1)}%
          </p>
          <div className="w-full bg-purple-950 rounded-full h-1.5 mt-1 print:hidden">
            <div
              className="bg-purple-400 h-1.5 rounded-full"
              style={{ width: `${Math.min(100, summary.businessPercentage)}%` }}
            />
          </div>
          <span className="hidden print:inline text-[10px] text-gray-500">Claim ratio</span>
        </div>
      </div>

      {/* SARS Compliance & Continuity Checker Notice (Screen only) */}
      <div className="print:hidden">
        {summary.gapCount > 0 ? (
          <div className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-950/30 p-3.5 text-xs text-amber-200">
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
            <div>
              <p className="font-bold text-amber-300">
                Notice: {summary.gapCount} Odometer Continuity Gap(s) Detected ({summary.totalGapKm} unlogged KM)
              </p>
              <p className="text-[11px] text-amber-200/90 mt-0.5">
                SARS auditors verify that the opening odometer of each trip matches the closing odometer of the previous trip. Gaps represent unlogged driving (e.g. personal weekend trips). Gaps are highlighted in the table below.
              </p>
            </div>
          </div>
        ) : summary.tripCount > 0 ? (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/20 px-3.5 py-2 text-xs text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>Continuous Odometer Log:</strong> Perfect odometer continuity across all trips for {summary.monthLabel}. Zero unexplained mileage gaps.
            </span>
          </div>
        ) : null}
      </div>

      {/* Filter Tabs for Screen Viewing */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/60 p-1 text-xs">
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1 font-semibold rounded-lg transition-colors ${
              filterMode === 'all'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Trips ({summary.trips.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('business')}
            className={`px-3 py-1 font-semibold rounded-lg transition-colors ${
              filterMode === 'business'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Business Travel ({summary.trips.filter((t) => t.category === 'business').length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('private')}
            className={`px-3 py-1 font-semibold rounded-lg transition-colors ${
              filterMode === 'private'
                ? 'bg-rose-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Private Travel ({summary.trips.filter((t) => t.category === 'private').length})
          </button>
        </div>

        <span className="text-xs text-slate-400 hidden sm:inline">
          Showing {displayTrips.length} entries for {summary.monthLabel}
        </span>
      </div>

      {/* 3. Detailed Monthly Trip Log Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 shadow-xl overflow-hidden print:border-black print:bg-white print:shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs print:text-[10px]">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950 text-slate-300 print:border-black print:bg-gray-100 print:text-black">
                <th className="p-2.5 font-bold border-r border-slate-800 print:border-black text-center whitespace-nowrap">
                  Date
                </th>
                <th className="p-2.5 font-bold border-r border-slate-800 print:border-black text-right whitespace-nowrap">
                  Opening KM
                </th>
                <th className="p-2.5 font-bold border-r border-slate-800 print:border-black text-right whitespace-nowrap">
                  Closing KM
                </th>
                <th className="p-2.5 font-bold border-r border-slate-800 print:border-black text-right whitespace-nowrap">
                  Total KM
                </th>
                <th className="p-2.5 font-bold border-r border-slate-800 print:border-black text-right text-emerald-400 print:text-black whitespace-nowrap">
                  Business KM
                </th>
                <th className="p-2.5 font-bold border-r border-slate-800 print:border-black text-right text-rose-400 print:text-black whitespace-nowrap">
                  Private KM
                </th>
                <th className="p-2.5 font-bold border-r border-slate-800 print:border-black min-w-[120px]">
                  From (Departure)
                </th>
                <th className="p-2.5 font-bold border-r border-slate-800 print:border-black min-w-[120px]">
                  To (Destination)
                </th>
                <th className="p-2.5 font-bold border-r border-slate-800 print:border-black min-w-[110px]">
                  Client / Job Ref
                </th>
                <th className="p-2.5 font-bold min-w-[160px]">
                  Reason / Purpose of Business Travel
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/80 font-mono print:divide-black">
              {displayTrips.map((t) => (
                <React.Fragment key={t.id}>
                  {/* Warning banner row if there was an odometer continuity gap before this trip */}
                  {t.hasOdometerGap && (
                    <tr className="bg-amber-950/20 text-amber-300 text-[10px] print:bg-gray-50 print:text-black">
                      <td colSpan={10} className="px-3 py-1 font-sans italic border-b border-amber-900/30 print:border-black">
                        ⚠ Unlogged Distance Gap: +{t.gapKm} KM between trips (personal/unlogged travel)
                      </td>
                    </tr>
                  )}

                  <tr className="hover:bg-slate-800/30 transition-colors print:hover:bg-transparent">
                    {/* Date */}
                    <td className="p-2.5 text-center text-slate-200 border-r border-slate-800 print:border-black print:text-black whitespace-nowrap font-sans font-medium">
                      {t.date}
                    </td>

                    {/* Opening KM */}
                    <td className="p-2.5 text-right text-slate-300 border-r border-slate-800 print:border-black print:text-black whitespace-nowrap">
                      {t.mileageOut.toLocaleString()}
                    </td>

                    {/* Closing KM */}
                    <td className="p-2.5 text-right text-slate-300 border-r border-slate-800 print:border-black print:text-black whitespace-nowrap">
                      {t.mileageIn.toLocaleString()}
                    </td>

                    {/* Total KM */}
                    <td className="p-2.5 text-right font-bold text-slate-100 border-r border-slate-800 print:border-black print:text-black whitespace-nowrap">
                      {t.totalKm.toLocaleString()}
                    </td>

                    {/* Business KM */}
                    <td className="p-2.5 text-right font-bold text-emerald-400 border-r border-slate-800 print:border-black print:text-black whitespace-nowrap">
                      {t.businessKm > 0 ? t.businessKm.toLocaleString() : '-'}
                    </td>

                    {/* Private KM */}
                    <td className="p-2.5 text-right font-medium text-rose-400 border-r border-slate-800 print:border-black print:text-black whitespace-nowrap">
                      {t.privateKm > 0 ? t.privateKm.toLocaleString() : '-'}
                    </td>

                    {/* Origin */}
                    <td className="p-2.5 font-sans text-slate-300 border-r border-slate-800 print:border-black print:text-black">
                      {t.origin}
                    </td>

                    {/* Destination */}
                    <td className="p-2.5 font-sans text-slate-200 border-r border-slate-800 print:border-black print:text-black font-medium">
                      {t.destination}
                    </td>

                    {/* Client & Job */}
                    <td className="p-2.5 font-sans text-slate-300 border-r border-slate-800 print:border-black print:text-black">
                      {t.category === 'private' ? (
                        <span className="text-rose-400/80 print:text-black">Private</span>
                      ) : (
                        <div>
                          <span className="font-semibold text-slate-100 print:text-black">{t.client}</span>
                          {t.jobNumber !== '-' && (
                            <span className="text-[10px] text-slate-500 print:text-gray-600 block">
                              {t.jobNumber}
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Business Reason */}
                    <td className="p-2.5 font-sans text-slate-200 print:text-black">
                      {t.reason}
                    </td>
                  </tr>
                </React.Fragment>
              ))}

              {displayTrips.length === 0 && (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400 font-sans italic">
                    No trips recorded for {summary.monthLabel}.
                  </td>
                </tr>
              )}
            </tbody>

            {/* Monthly Totals Row */}
            <tfoot className="border-t-2 border-slate-700 bg-slate-950 font-mono font-bold text-slate-100 print:border-black print:bg-gray-100 print:text-black">
              <tr>
                <td className="p-3 text-center border-r border-slate-800 print:border-black uppercase font-sans text-xs">
                  TOTALS
                </td>
                <td className="p-3 text-right border-r border-slate-800 print:border-black text-slate-400 print:text-black">
                  {summary.openingKm !== null ? summary.openingKm.toLocaleString() : '-'}
                </td>
                <td className="p-3 text-right border-r border-slate-800 print:border-black text-slate-400 print:text-black">
                  {summary.closingKm !== null ? summary.closingKm.toLocaleString() : '-'}
                </td>
                <td className="p-3 text-right border-r border-slate-800 print:border-black text-blue-400 print:text-black">
                  {summary.totalRecordedKm.toLocaleString()} KM
                </td>
                <td className="p-3 text-right border-r border-slate-800 print:border-black text-emerald-400 print:text-black">
                  {summary.totalBusinessKm.toLocaleString()} KM
                </td>
                <td className="p-3 text-right border-r border-slate-800 print:border-black text-rose-400 print:text-black">
                  {summary.totalPrivateKm.toLocaleString()} KM
                </td>
                <td colSpan={4} className="p-3 font-sans text-slate-300 print:text-black text-xs">
                  Business Travel Ratio: <strong className="text-emerald-400 print:text-black">{summary.businessPercentage.toFixed(1)}%</strong> of total recorded travel
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 4. Statutory Taxpayer Declaration Card (Compliant with SARS requirements) */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4 print:border-black print:bg-white print:p-3 print:text-black print:break-inside-avoid">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 print:text-black flex items-center gap-2 border-b border-slate-800 pb-2 print:border-black">
          <ShieldCheck className="w-4 h-4 text-emerald-400 print:hidden" />
          Taxpayer Statutory Declaration (SARS Section 8(1)(b))
        </h3>

        <p className="text-xs text-slate-300 print:text-gray-800 italic leading-relaxed">
          "I, the undersigned taxpayer, hereby certify that the information provided in this logbook is a true, accurate, and complete record of all business and private travel undertaken during the period stated. All odometer readings are correct, and all business kilometres recorded were incurred in the production of taxable income in accordance with South African Revenue Service (SARS) regulations."
        </p>

        <div className="pt-6 grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs text-slate-200 print:text-black">
          <div className="border-t border-slate-700 print:border-black pt-2">
            <span className="block text-[10px] text-slate-400 print:text-gray-600 uppercase font-semibold">
              Taxpayer Signature
            </span>
            <p className="font-bold font-mono mt-1 text-sm">
              {settings.driverName || 'David Hu'}
            </p>
          </div>

          <div className="border-t border-slate-700 print:border-black pt-2">
            <span className="block text-[10px] text-slate-400 print:text-gray-600 uppercase font-semibold">
              Date Signed
            </span>
            <p className="font-mono mt-1 text-sm">
              {new Date().toISOString().slice(0, 10)}
            </p>
          </div>

          <div className="border-t border-slate-700 print:border-black pt-2">
            <span className="block text-[10px] text-slate-400 print:text-gray-600 uppercase font-semibold">
              Employer / Depot Manager Countersign
            </span>
            <p className="font-mono mt-1 text-sm text-slate-400 print:text-black">
              _________________________________
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
