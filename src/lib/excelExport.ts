import ExcelJS from 'exceljs';
import { Trip, WorkSession, UserSettings, CellMappingConfig } from '../types';
import { weekRange, computeWeeklyTimesheet, computeMonthlySarsSummary } from './timesheetLogic';
import { DEFAULT_CELL_MAPPING, generateBlankMasterTemplate } from './templateStorage';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export interface ExcelExportResult {
  buffer: ArrayBuffer;
  filename: string;
  overflowCount: number;
  templateUsed: 'custom' | 'standard';
  sheetNameUsed: string;
}

export async function generateTimesheetExcel(
  allTrips: Trip[],
  allSessions: WorkSession[],
  weekAnchorDate: string,
  settings: UserSettings,
  customTemplateBuffer?: ArrayBuffer | null,
  customMapping?: CellMappingConfig
): Promise<ExcelExportResult> {
  const weekDays = weekRange(weekAnchorDate);
  const calculation = computeWeeklyTimesheet(allTrips, allSessions, weekDays);
  const { columns, daily, openingKm, closingKm, overflowClients } = calculation;
  const mapping: CellMappingConfig = customMapping || settings.cellMapping || DEFAULT_CELL_MAPPING;

  const wb = new ExcelJS.Workbook();
  let ws: ExcelJS.Worksheet;
  let templateUsed: 'custom' | 'standard' = 'standard';

  if (customTemplateBuffer && customTemplateBuffer.byteLength > 0) {
    // Populate into the uploaded user's exact spreadsheet template
    try {
      await wb.xlsx.load(customTemplateBuffer);
      templateUsed = 'custom';

      // Find worksheet
      let targetWs: ExcelJS.Worksheet | undefined;
      if (mapping.sheetName) {
        targetWs = wb.getWorksheet(mapping.sheetName);
        if (!targetWs) {
          // Case-insensitive search
          targetWs = wb.worksheets.find(
            (w) => w.name.trim().toLowerCase() === mapping.sheetName.trim().toLowerCase()
          );
        }
      }
      if (!targetWs) {
        targetWs = wb.worksheets[0];
      }
      ws = targetWs;
    } catch (err) {
      console.warn('Failed to load custom template buffer, falling back to standard template:', err);
      // Fallback to building standard workbook below
      const fallbackBuffer = await generateBlankMasterTemplate(mapping, settings);
      await wb.xlsx.load(fallbackBuffer);
      ws = wb.worksheets[0];
      templateUsed = 'standard';
    }
  } else {
    // Built-in pristine HR-018 comprehensive template
    const standardBuffer = await generateBlankMasterTemplate(mapping, settings);
    await wb.xlsx.load(standardBuffer);
    ws = wb.worksheets[0];
    templateUsed = 'standard';
  }

  // Set Core Metadata in target cells
  if (mapping.nameCell) {
    ws.getCell(mapping.nameCell).value = settings.driverName || 'Driver';
  }
  if (mapping.regionCell) {
    ws.getCell(mapping.regionCell).value = settings.region || 'Default Depot';
  }
  if (mapping.weekEndingCell) {
    const weDate = new Date(`${weekDays[6]}T00:00:00Z`);
    ws.getCell(mapping.weekEndingCell).value = weDate;
    ws.getCell(mapping.weekEndingCell).numFmt = 'yyyy-mm-dd';
  }
  if (mapping.vehicleRegoCell && settings.vehicleRego) {
    ws.getCell(mapping.vehicleRegoCell).value = settings.vehicleRego;
  }

  // Populate Column Headers (Client Names & Job Numbers)
  // Column 0 is Admin
  const adminCol = columns[0];
  if (mapping.adminHrsCol) {
    if (mapping.clientHeaderRow) {
      ws.getCell(`${mapping.adminHrsCol}${mapping.clientHeaderRow}`).value = 'Admin';
    }
    if (mapping.jobNumberHeaderRow) {
      ws.getCell(`${mapping.adminHrsCol}${mapping.jobNumberHeaderRow}`).value = 'Shop / Office';
    }
  }

  // Columns 1 to 9 (Client columns)
  mapping.clientColPairs.forEach(([hrsCol, _kmCol], idx) => {
    const colData = columns[idx + 1]; // +1 because index 0 is admin
    if (mapping.clientHeaderRow) {
      const cCell = ws.getCell(`${hrsCol}${mapping.clientHeaderRow}`);
      cCell.value = colData ? colData.client : '';
    }
    if (mapping.jobNumberHeaderRow) {
      const jCell = ws.getCell(`${hrsCol}${mapping.jobNumberHeaderRow}`);
      jCell.value = colData?.jobNumber ? colData.jobNumber : '';
    }
  });

  // Populate Day Rows (Monday through Sunday)
  weekDays.forEach((day, i) => {
    const row = mapping.dayRows[i];
    if (!row) return;

    const dayData = daily[day] || { cols: [], pvte: 0 };

    // Date sub-row if offset exists
    if (mapping.dayDateOffset > 0) {
      const dateCell = ws.getCell(`A${row + mapping.dayDateOffset}`);
      dateCell.value = new Date(`${day}T00:00:00Z`);
      dateCell.numFmt = 'dd-mmm';
    }

    // Admin Column (Column index 0 in calculation)
    const adminData = dayData.cols[0] || { hrs: 0, km: 0 };
    if (mapping.adminHrsCol) {
      const c = ws.getCell(`${mapping.adminHrsCol}${row}`);
      c.value = adminData.hrs > 0 ? Math.round(adminData.hrs * 4) / 4 : null;
      c.numFmt = '0.00';
    }
    if (mapping.adminKmCol) {
      const c = ws.getCell(`${mapping.adminKmCol}${row}`);
      c.value = adminData.km > 0 ? Math.round(adminData.km) : null;
      c.numFmt = '#,##0';
    }

    // Client Columns (Indices 1..9 in calculation)
    mapping.clientColPairs.forEach(([hrsCol, kmCol], cIdx) => {
      const clientData = dayData.cols[cIdx + 1] || { hrs: 0, km: 0 };
      const cellHrs = ws.getCell(`${hrsCol}${row}`);
      const cellKm = ws.getCell(`${kmCol}${row}`);

      cellHrs.value = clientData.hrs > 0 ? Math.round(clientData.hrs * 4) / 4 : null;
      cellHrs.numFmt = '0.00';

      cellKm.value = clientData.km > 0 ? Math.round(clientData.km) : null;
      cellKm.numFmt = '#,##0';
    });

    // Private KM Column
    if (mapping.privateKmCol) {
      const pvtCell = ws.getCell(`${mapping.privateKmCol}${row}`);
      pvtCell.value = dayData.pvte > 0 ? Math.round(dayData.pvte) : null;
      pvtCell.numFmt = '#,##0';
    }
  });

  // Odometer reconciliation block
  if (mapping.closingKmCell) {
    const closingCell = ws.getCell(mapping.closingKmCell);
    closingCell.value = closingKm != null ? closingKm : null;
    closingCell.numFmt = '#,##0';
  }

  if (mapping.openingKmCell) {
    const openingCell = ws.getCell(mapping.openingKmCell);
    openingCell.value = openingKm != null ? openingKm : null;
    openingCell.numFmt = '#,##0';
  }

  if (mapping.totalDistanceCell) {
    const totalDistCell = ws.getCell(mapping.totalDistanceCell);
    // If it doesn't already have an Excel formula, give it one
    if (!totalDistCell.formula) {
      totalDistCell.value = {
        formula: `${mapping.closingKmCell}-${mapping.openingKmCell}`,
      };
    }
    totalDistCell.numFmt = '#,##0';
  }

  const buffer = await wb.xlsx.writeBuffer();
  const safeDriver = (settings.driverName || 'Driver').replace(/\s+/g, '_');
  const filename = `HR-018_Timesheet_WE_${weekDays[6]}_${safeDriver}.xlsx`;

  return {
    buffer,
    filename,
    overflowCount: overflowClients.length,
    templateUsed,
    sheetNameUsed: ws.name,
  };
}

// Generate CSV export for all trips and sessions
export function generateTripsCSV(trips: Trip[]): string {
  const headers = [
    'Trip ID',
    'Date',
    'Time Out',
    'Time In',
    'Category',
    'Business Type',
    'Client',
    'Job Number',
    'Odometer Out',
    'Odometer In',
    'Distance (KM)',
    'Has Splits',
    'Splits Details',
    'Notes',
    'Vehicle',
  ];

  const rows = trips.map((t) => {
    const dist = Math.max(0, (t.mileageIn || 0) - (t.mileageOut || 0));
    const splitsText = t.splits?.map((s) => `${s.client}:${s.jobNumber}=${s.amount}km`).join('; ') || '';
    return [
      `"${t.id}"`,
      `"${t.date}"`,
      `"${t.timeOut || ''}"`,
      `"${t.timeIn || ''}"`,
      `"${t.category}"`,
      `"${t.businessType || ''}"`,
      `"${(t.client || '').replace(/"/g, '""')}"`,
      `"${(t.jobNumber || '').replace(/"/g, '""')}"`,
      t.mileageOut ?? '',
      t.mileageIn ?? '',
      dist,
      t.splits && t.splits.length > 0 ? 'YES' : 'NO',
      `"${splitsText.replace(/"/g, '""')}"`,
      `"${(t.notes || '').replace(/"/g, '""')}"`,
      `"${(t.vehicle || '').replace(/"/g, '""')}"`,
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

export function generateSessionsCSV(sessions: WorkSession[]): string {
  const headers = [
    'Session ID',
    'On Date',
    'On Time',
    'Off Date',
    'Off Time',
    'Category',
    'Business Type',
    'Client',
    'Job Number',
    'Duration (HRS)',
    'Has Splits',
    'Splits Details',
    'Notes',
    'Status',
  ];

  const rows = sessions.map((s) => {
    const a = new Date(`${s.onDate}T${s.onTime || '00:00'}`);
    const b = new Date(`${s.offDate}T${s.offTime || '00:00'}`);
    const hrs = s.offTime ? Math.max(0, (b.getTime() - a.getTime()) / 3600000) : 0;
    const splitsText = s.splits?.map((sp) => `${sp.client}:${sp.jobNumber}=${sp.amount}h`).join('; ') || '';

    return [
      `"${s.id}"`,
      `"${s.onDate}"`,
      `"${s.onTime || ''}"`,
      `"${s.offDate || ''}"`,
      `"${s.offTime || ''}"`,
      `"${s.category}"`,
      `"${s.businessType || ''}"`,
      `"${(s.client || '').replace(/"/g, '""')}"`,
      `"${(s.jobNumber || '').replace(/"/g, '""')}"`,
      hrs.toFixed(2),
      s.splits && s.splits.length > 0 ? 'YES' : 'NO',
      `"${splitsText.replace(/"/g, '""')}"`,
      `"${(s.notes || '').replace(/"/g, '""')}"`,
      `"${s.status}"`,
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

// Generate SARS-compliant monthly travel logbook spreadsheet (.xlsx)
export async function generateSarsMonthlyExcel(
  allTrips: Trip[],
  monthStr: string,
  settings: UserSettings
): Promise<{ buffer: ArrayBuffer; filename: string }> {
  const summary = computeMonthlySarsSummary(allTrips, monthStr);

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Mileage & Time Logbook - SARS Engine';
  wb.created = new Date();

  const ws = wb.addWorksheet('SARS Vehicle Logbook', {
    pageSetup: {
      orientation: 'landscape',
      paperSize: 9, // A4
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
    },
  });

  // Color constants
  const NAVY = '1E3A8A';
  const LIGHT_BLUE = 'EFF6FF';
  const GRAY_BORDER = 'D1D5DB';
  const DARK_TEXT = '111827';
  const EMERALD = '047857';

  // Set Column widths
  ws.columns = [
    { width: 13 }, // A: Date
    { width: 14 }, // B: Opening KM
    { width: 14 }, // C: Closing KM
    { width: 13 }, // D: Total KM
    { width: 14 }, // E: Business KM
    { width: 14 }, // F: Private KM
    { width: 22 }, // G: Origin (From)
    { width: 22 }, // H: Destination (To)
    { width: 20 }, // I: Client / Job Ref
    { width: 34 }, // J: Specific Business Reason
  ];

  // 1. Header Banner
  ws.mergeCells('A1:J1');
  const titleCell = ws.getCell('A1');
  titleCell.value = 'SOUTH AFRICAN REVENUE SERVICE (SARS) - TRAVEL LOGBOOK';
  titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${NAVY}` } };
  ws.getRow(1).height = 30;

  ws.mergeCells('A2:J2');
  const subCell = ws.getCell('A2');
  subCell.value = `Monthly Travel Record for Section 8(1)(b) Travel Allowance / Tax Deduction • Period: ${summary.monthLabel}`;
  subCell.font = { name: 'Calibri', size: 11, italic: true, color: { argb: 'FFFFFFFF' } };
  subCell.alignment = { horizontal: 'center', vertical: 'middle' };
  subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
  ws.getRow(2).height = 20;

  // 2. Taxpayer & Vehicle Metadata Card
  ws.mergeCells('A4:E4');
  ws.getCell('A4').value = '1. TAXPAYER / EMPLOYEE PARTICULARS';
  ws.getCell('A4').font = { bold: true, size: 10, color: { argb: `FF${NAVY}` } };

  ws.mergeCells('F4:J4');
  ws.getCell('F4').value = '2. VEHICLE PARTICULARS';
  ws.getCell('F4').font = { bold: true, size: 10, color: { argb: `FF${NAVY}` } };

  const metaRows = [
    {
      c1: 'Full Name:',
      v1: settings.driverName || '',
      c2: 'Make & Model:',
      v2: settings.vehicleName || '',
    },
    {
      c1: 'ID / Passport No:',
      v1: settings.idNumber || '',
      c2: 'Registration No:',
      v2: settings.vehicleRego || '',
    },
    {
      c1: 'Tax Reference No:',
      v1: settings.taxReferenceNo || '',
      c2: 'Cost Price / Value (ZAR):',
      v2: settings.vehicleCostPrice ? `R ${settings.vehicleCostPrice.toLocaleString()}` : '',
    },
    {
      c1: 'Employer / Business:',
      v1: settings.employerName || settings.region || '',
      c2: 'Log Period / Month:',
      v2: `${summary.monthLabel} (${summary.monthStr})`,
    },
  ];

  metaRows.forEach((r, idx) => {
    const rowNum = 5 + idx;
    ws.getCell(`A${rowNum}`).value = r.c1;
    ws.getCell(`A${rowNum}`).font = { bold: true, size: 9, color: { argb: 'FF475569' } };
    ws.getCell(`B${rowNum}`).value = r.v1;
    ws.getCell(`B${rowNum}`).font = { size: 9, bold: true };
    ws.mergeCells(`B${rowNum}:E${rowNum}`);

    ws.getCell(`F${rowNum}`).value = r.c2;
    ws.getCell(`F${rowNum}`).font = { bold: true, size: 9, color: { argb: 'FF475569' } };
    ws.getCell(`G${rowNum}`).value = r.v2;
    ws.getCell(`G${rowNum}`).font = { size: 9, bold: true };
    ws.mergeCells(`G${rowNum}:J${rowNum}`);
    ws.getRow(rowNum).height = 18;
  });

  // 3. Monthly Summary Statistics Box
  const sumHRow = 10;
  ws.getRow(sumHRow).height = 22;
  const summaryHeaders = [
    { cell: 'A10:B10', label: 'OPENING ODOMETER (KM)' },
    { cell: 'C10:D10', label: 'CLOSING ODOMETER (KM)' },
    { cell: 'E10:F10', label: 'TOTAL DISTANCE (KM)' },
    { cell: 'G10:H10', label: 'BUSINESS DISTANCE (KM)' },
    { cell: 'I10', label: 'PRIVATE (KM)' },
    { cell: 'J10', label: 'BUSINESS TRAVEL %' },
  ];

  summaryHeaders.forEach((sh) => {
    if (sh.cell.includes(':')) ws.mergeCells(sh.cell);
    const c = ws.getCell(sh.cell.split(':')[0]);
    c.value = sh.label;
    c.font = { bold: true, size: 8.5, color: { argb: 'FFFFFFFF' } };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${NAVY}` } };
  });

  const sumVRow = 11;
  ws.getRow(sumVRow).height = 24;
  ws.mergeCells('A11:B11');
  ws.getCell('A11').value = summary.openingKm !== null ? summary.openingKm : 0;
  ws.getCell('A11').numFmt = '#,##0';

  ws.mergeCells('C11:D11');
  ws.getCell('C11').value = summary.closingKm !== null ? summary.closingKm : 0;
  ws.getCell('C11').numFmt = '#,##0';

  ws.mergeCells('E11:F11');
  ws.getCell('E11').value = summary.totalRecordedKm;
  ws.getCell('E11').numFmt = '#,##0';

  ws.mergeCells('G11:H11');
  ws.getCell('G11').value = summary.totalBusinessKm;
  ws.getCell('G11').numFmt = '#,##0';
  ws.getCell('G11').font = { bold: true, color: { argb: `FF${EMERALD}` } };

  ws.getCell('I11').value = summary.totalPrivateKm;
  ws.getCell('I11').numFmt = '#,##0';

  ws.getCell('J11').value = summary.totalRecordedKm > 0 ? summary.totalBusinessKm / summary.totalRecordedKm : 0;
  ws.getCell('J11').numFmt = '0.0%';
  ws.getCell('J11').font = { bold: true, size: 11, color: { argb: `FF${NAVY}` } };

  ['A11', 'C11', 'E11', 'G11', 'I11', 'J11'].forEach((ref) => {
    const c = ws.getCell(ref);
    c.alignment = { horizontal: 'center', vertical: 'middle' };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${LIGHT_BLUE}` } };
  });

  // 4. Trip Sheet Header Table
  const tableHeaderRow = 13;
  ws.getRow(tableHeaderRow).height = 24;
  const cols = [
    'Date',
    'Opening KM',
    'Closing KM',
    'Total KM',
    'Business KM',
    'Private KM',
    'Departure (From)',
    'Destination (To)',
    'Client / Project Ref',
    'Specific Business Reason',
  ];

  cols.forEach((colName, cIdx) => {
    const cell = ws.getRow(tableHeaderRow).getCell(cIdx + 1);
    cell.value = colName;
    cell.font = { bold: true, size: 9, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
    cell.border = {
      top: { style: 'thin', color: { argb: `FF${GRAY_BORDER}` } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: `FF${GRAY_BORDER}` } },
      right: { style: 'thin', color: { argb: `FF${GRAY_BORDER}` } },
    };
  });

  // 5. Populate Data Rows
  let currentRow = 14;
  summary.trips.forEach((t) => {
    const r = ws.getRow(currentRow);
    r.height = 20;

    r.getCell(1).value = t.date;
    r.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

    r.getCell(2).value = t.mileageOut;
    r.getCell(2).numFmt = '#,##0';
    r.getCell(2).alignment = { horizontal: 'right', vertical: 'middle' };

    r.getCell(3).value = t.mileageIn;
    r.getCell(3).numFmt = '#,##0';
    r.getCell(3).alignment = { horizontal: 'right', vertical: 'middle' };

    // Total KM Formula: =C{r}-B{r}
    r.getCell(4).value = { formula: `C${currentRow}-B${currentRow}`, result: t.totalKm };
    r.getCell(4).numFmt = '#,##0';
    r.getCell(4).alignment = { horizontal: 'right', vertical: 'middle' };

    // Business KM
    r.getCell(5).value = t.businessKm;
    r.getCell(5).numFmt = '#,##0';
    r.getCell(5).alignment = { horizontal: 'right', vertical: 'middle' };
    if (t.businessKm > 0) {
      r.getCell(5).font = { color: { argb: `FF${EMERALD}` }, bold: true };
    }

    // Private KM
    r.getCell(6).value = t.privateKm;
    r.getCell(6).numFmt = '#,##0';
    r.getCell(6).alignment = { horizontal: 'right', vertical: 'middle' };

    r.getCell(7).value = t.origin;
    r.getCell(7).alignment = { horizontal: 'left', vertical: 'middle' };

    r.getCell(8).value = t.destination;
    r.getCell(8).alignment = { horizontal: 'left', vertical: 'middle' };

    r.getCell(9).value = t.client !== '-' ? `${t.client} (${t.jobNumber})` : '-';
    r.getCell(9).alignment = { horizontal: 'left', vertical: 'middle' };

    r.getCell(10).value = t.reason;
    r.getCell(10).alignment = { horizontal: 'left', vertical: 'middle' };

    // Zebra striping
    const isEven = (currentRow - 14) % 2 === 0;
    const bg = isEven ? 'FFFFFFFF' : 'FFF8FAFC';
    for (let c = 1; c <= 10; c++) {
      const cell = r.getCell(c);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      cell.border = {
        top: { style: 'thin', color: { argb: `FF${GRAY_BORDER}` } },
        bottom: { style: 'thin', color: { argb: `FF${GRAY_BORDER}` } },
        left: { style: 'thin', color: { argb: `FF${GRAY_BORDER}` } },
        right: { style: 'thin', color: { argb: `FF${GRAY_BORDER}` } },
      };
      if (c !== 5) {
        cell.font = { name: 'Calibri', size: 9 };
      }
    }

    currentRow++;
  });

  // Fallback empty row if no trips
  if (summary.trips.length === 0) {
    const r = ws.getRow(currentRow);
    ws.mergeCells(`A${currentRow}:J${currentRow}`);
    r.getCell(1).value = 'No vehicle travel logged for this month.';
    r.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    r.getCell(1).font = { italic: true, color: { argb: 'FF94A3B8' } };
    currentRow++;
  }

  // 6. Totals Row
  const totalsRow = currentRow;
  ws.getRow(totalsRow).height = 24;
  ws.getCell(`A${totalsRow}`).value = 'MONTHLY TOTALS';
  ws.mergeCells(`A${totalsRow}:C${totalsRow}`);
  ws.getCell(`A${totalsRow}`).font = { bold: true, size: 9.5, color: { argb: 'FFFFFFFF' } };
  ws.getCell(`A${totalsRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getCell(`A${totalsRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };

  // Total KM Formula
  ws.getCell(`D${totalsRow}`).value = {
    formula: `SUM(D14:D${totalsRow - 1})`,
    result: summary.totalRecordedKm,
  };
  ws.getCell(`D${totalsRow}`).numFmt = '#,##0';
  ws.getCell(`D${totalsRow}`).font = { bold: true };
  ws.getCell(`D${totalsRow}`).alignment = { horizontal: 'right', vertical: 'middle' };

  // Business KM Formula
  ws.getCell(`E${totalsRow}`).value = {
    formula: `SUM(E14:E${totalsRow - 1})`,
    result: summary.totalBusinessKm,
  };
  ws.getCell(`E${totalsRow}`).numFmt = '#,##0';
  ws.getCell(`E${totalsRow}`).font = { bold: true, color: { argb: `FF${EMERALD}` } };
  ws.getCell(`E${totalsRow}`).alignment = { horizontal: 'right', vertical: 'middle' };

  // Private KM Formula
  ws.getCell(`F${totalsRow}`).value = {
    formula: `SUM(F14:F${totalsRow - 1})`,
    result: summary.totalPrivateKm,
  };
  ws.getCell(`F${totalsRow}`).numFmt = '#,##0';
  ws.getCell(`F${totalsRow}`).font = { bold: true };
  ws.getCell(`F${totalsRow}`).alignment = { horizontal: 'right', vertical: 'middle' };

  ws.mergeCells(`G${totalsRow}:J${totalsRow}`);
  ws.getCell(`G${totalsRow}`).value = `Business Proportion: ${summary.businessPercentage.toFixed(1)}% of recorded travel`;
  ws.getCell(`G${totalsRow}`).font = { italic: true, bold: true, size: 9, color: { argb: `FF${NAVY}` } };
  ws.getCell(`G${totalsRow}`).alignment = { horizontal: 'center', vertical: 'middle' };

  for (let c = 1; c <= 10; c++) {
    const cell = ws.getRow(totalsRow).getCell(c);
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF0F172A' } },
      bottom: { style: 'double', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: `FF${GRAY_BORDER}` } },
      right: { style: 'thin', color: { argb: `FF${GRAY_BORDER}` } },
    };
    if (c >= 4 && c <= 6) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${LIGHT_BLUE}` } };
    }
  }

  // 7. Statutory Declaration Block
  const declStart = totalsRow + 2;
  ws.mergeCells(`A${declStart}:J${declStart}`);
  const declHeader = ws.getCell(`A${declStart}`);
  declHeader.value = 'TAXPAYER / EMPLOYEE STATUTORY DECLARATION';
  declHeader.font = { bold: true, size: 10, color: { argb: `FF${NAVY}` } };

  ws.mergeCells(`A${declStart + 1}:J${declStart + 2}`);
  const declBody = ws.getCell(`A${declStart + 1}`);
  declBody.value =
    'I declare that the information provided in this logbook is a true, accurate, and complete record of all business and private travel undertaken during the period stated. All odometer readings are correct, and all business kilometres recorded were incurred in the production of taxable income in accordance with SARS Section 8(1)(b) regulations.';
  declBody.font = { size: 9, italic: true };
  declBody.alignment = { wrapText: true, vertical: 'top' };

  // Signatures
  const sigRow = declStart + 4;
  ws.mergeCells(`A${sigRow}:C${sigRow}`);
  ws.getCell(`A${sigRow}`).value = 'Taxpayer Signature: ________________________________';
  ws.getCell(`A${sigRow}`).font = { size: 9, bold: true };

  ws.mergeCells(`D${sigRow}:F${sigRow}`);
  ws.getCell(`D${sigRow}`).value = 'Date: ________________________';
  ws.getCell(`D${sigRow}`).font = { size: 9, bold: true };

  ws.mergeCells(`G${sigRow}:J${sigRow}`);
  ws.getCell(`G${sigRow}`).value = 'Employer / Manager Verification: ________________________________';
  ws.getCell(`G${sigRow}`).font = { size: 9, bold: true };

  const buffer = await wb.xlsx.writeBuffer();
  const filename = `SARS_Logbook_${monthStr}_${(settings.driverName || 'Taxpayer').replace(/\s+/g, '_')}.xlsx`;

  return { buffer, filename };
}

// Generate SARS-compliant monthly CSV
export function generateSarsMonthlyCSV(
  allTrips: Trip[],
  monthStr: string,
  settings: UserSettings
): string {
  const summary = computeMonthlySarsSummary(allTrips, monthStr);

  const headers = [
    'Date',
    'Opening KM',
    'Closing KM',
    'Total KM',
    'Business KM',
    'Private KM',
    'Departure (From)',
    'Destination (To)',
    'Client / Project',
    'Job Number',
    'Specific Business Reason',
  ];

  const rows = summary.trips.map((t: any) =>
    [
      `"${t.date}"`,
      t.mileageOut,
      t.mileageIn,
      t.totalKm,
      t.businessKm,
      t.privateKm,
      `"${(t.origin || '').replace(/"/g, '""')}"`,
      `"${(t.destination || '').replace(/"/g, '""')}"`,
      `"${(t.client || '').replace(/"/g, '""')}"`,
      `"${(t.jobNumber || '').replace(/"/g, '""')}"`,
      `"${(t.reason || '').replace(/"/g, '""')}"`,
    ].join(',')
  );

  const metaHeader = [
    `# SARS VEHICLE TRAVEL LOGBOOK - ${summary.monthLabel}`,
    `# Taxpayer: ${settings.driverName || ''} | ID: ${settings.idNumber || ''} | Tax Ref: ${settings.taxReferenceNo || ''}`,
    `# Vehicle: ${settings.vehicleName || ''} (${settings.vehicleRego || ''})`,
    `# Total KM: ${summary.totalRecordedKm} | Business KM: ${summary.totalBusinessKm} (${summary.businessPercentage.toFixed(1)}%) | Private KM: ${summary.totalPrivateKm}`,
    '',
  ].join('\n');

  return metaHeader + [headers.join(','), ...rows].join('\n');
}
