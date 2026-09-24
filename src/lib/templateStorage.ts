import ExcelJS from 'exceljs';
import { CellMappingConfig, CustomExcelTemplate, UserSettings } from '../types';

export const DEFAULT_CELL_MAPPING: CellMappingConfig = {
  sheetName: 'HR-018 Timesheet',
  nameCell: 'B1',
  regionCell: 'K1',
  weekEndingCell: 'W1',
  vehicleRegoCell: '',
  formTitleCell: 'A2',
  headerDayCell: 'A4',
  clientHeaderRow: 2,
  jobNumberHeaderRow: 3,
  subHeaderRow: 4,
  dayRows: [5, 7, 9, 11, 13, 15, 17],
  dayDateOffset: 1,
  adminHrsCol: 'B',
  adminKmCol: 'C',
  clientColPairs: [
    ['D', 'E'],
    ['F', 'G'],
    ['H', 'I'],
    ['J', 'K'],
    ['L', 'M'],
    ['N', 'O'],
    ['P', 'Q'],
    ['R', 'S'],
    ['T', 'U'],
  ],
  privateKmCol: 'AA',
  totalsRow: 19,
  closingKmCell: 'AA21',
  openingKmCell: 'AA22',
  totalDistanceCell: 'AA23',
};

const DB_NAME = 'mileage_logbook_db_v1';
const STORE_NAME = 'excel_templates';
const KEY_NAME = 'active_custom_template';
const STORAGE_MAPPING_KEY = 'mileage_logbook_cell_mapping_v1';
const STORAGE_FALLBACK_META_KEY = 'mileage_logbook_template_meta_v1';
const STORAGE_FALLBACK_DATA_KEY = 'mileage_logbook_template_data_v1';

// Open IndexedDB
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB not supported'));
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Convert ArrayBuffer to Base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Convert Base64 to ArrayBuffer
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// In-memory cache for ultra-fast access
let cachedTemplate: { metadata: CustomExcelTemplate; buffer: ArrayBuffer } | null = null;

export async function saveCustomExcelTemplate(
  file: File
): Promise<{ metadata: CustomExcelTemplate; buffer: ArrayBuffer }> {
  const buffer = await file.arrayBuffer();

  // Validate with ExcelJS and detect sheets
  const testWb = new ExcelJS.Workbook();
  try {
    await testWb.xlsx.load(buffer);
  } catch (err) {
    throw new Error('Selected file is not a valid Microsoft Excel (.xlsx) spreadsheet.');
  }

  const detectedSheetNames = testWb.worksheets.map((ws) => ws.name);
  if (detectedSheetNames.length === 0) {
    throw new Error('Spreadsheet does not contain any valid worksheets.');
  }

  const metadata: CustomExcelTemplate = {
    filename: file.name,
    fileSize: file.size,
    uploadedAt: new Date().toISOString(),
    detectedSheetNames,
  };

  cachedTemplate = { metadata, buffer };

  // Try storing in IndexedDB
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put({ metadata, buffer }, KEY_NAME);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (idbErr) {
    console.warn('IndexedDB save failed, falling back to localStorage:', idbErr);
    try {
      localStorage.setItem(STORAGE_FALLBACK_META_KEY, JSON.stringify(metadata));
      const b64 = arrayBufferToBase64(buffer);
      localStorage.setItem(STORAGE_FALLBACK_DATA_KEY, b64);
    } catch (lsErr) {
      console.error('LocalStorage template save error (file might be too large):', lsErr);
    }
  }

  return { metadata, buffer };
}

export async function getCustomExcelTemplate(): Promise<{
  metadata: CustomExcelTemplate;
  buffer: ArrayBuffer;
} | null> {
  if (cachedTemplate) {
    return cachedTemplate;
  }

  // Try IndexedDB first
  try {
    const db = await openDB();
    const result = await new Promise<{ metadata: CustomExcelTemplate; buffer: ArrayBuffer } | null>(
      (resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(KEY_NAME);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      }
    );

    if (result && result.buffer) {
      cachedTemplate = result;
      return result;
    }
  } catch (idbErr) {
    console.warn('IndexedDB read failed, trying localStorage fallback:', idbErr);
  }

  // Fallback to localStorage
  try {
    const metaRaw = localStorage.getItem(STORAGE_FALLBACK_META_KEY);
    const dataRaw = localStorage.getItem(STORAGE_FALLBACK_DATA_KEY);
    if (metaRaw && dataRaw) {
      const metadata = JSON.parse(metaRaw) as CustomExcelTemplate;
      const buffer = base64ToArrayBuffer(dataRaw);
      cachedTemplate = { metadata, buffer };
      return cachedTemplate;
    }
  } catch (lsErr) {
    console.error('Failed reading fallback from localStorage:', lsErr);
  }

  return null;
}

export async function deleteCustomExcelTemplate(): Promise<void> {
  cachedTemplate = null;

  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(KEY_NAME);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IndexedDB delete error:', err);
  }

  try {
    localStorage.removeItem(STORAGE_FALLBACK_META_KEY);
    localStorage.removeItem(STORAGE_FALLBACK_DATA_KEY);
  } catch (err) {
    console.error('LocalStorage delete error:', err);
  }
}

// Cell Mapping Config Persist
export function loadCellMapping(): CellMappingConfig {
  try {
    const raw = localStorage.getItem(STORAGE_MAPPING_KEY);
    if (!raw) return DEFAULT_CELL_MAPPING;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_CELL_MAPPING, ...parsed };
  } catch (err) {
    console.error('Failed to load cell mapping:', err);
    return DEFAULT_CELL_MAPPING;
  }
}

export function saveCellMapping(mapping: CellMappingConfig): void {
  try {
    localStorage.setItem(STORAGE_MAPPING_KEY, JSON.stringify(mapping));
  } catch (err) {
    console.error('Failed to save cell mapping:', err);
  }
}

export function resetCellMapping(): CellMappingConfig {
  saveCellMapping(DEFAULT_CELL_MAPPING);
  return DEFAULT_CELL_MAPPING;
}

// Generate Blank Clean Master Template (.xlsx) for user to download or use
export async function generateBlankMasterTemplate(
  mapping: CellMappingConfig = DEFAULT_CELL_MAPPING,
  settings?: UserSettings
): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'HR-018 Mileage & Time Master Template';
  wb.created = new Date();

  const ws = wb.addWorksheet(mapping.sheetName || 'HR-018 Timesheet', {
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 1 },
  });

  // Set widths
  ws.columns = [
    { key: 'A', width: 14 },
    { key: 'B', width: 10 },
    { key: 'C', width: 10 },
    { key: 'D', width: 12 },
    { key: 'E', width: 10 },
    { key: 'F', width: 12 },
    { key: 'G', width: 10 },
    { key: 'H', width: 12 },
    { key: 'I', width: 10 },
    { key: 'J', width: 12 },
    { key: 'K', width: 10 },
    { key: 'L', width: 12 },
    { key: 'M', width: 10 },
    { key: 'N', width: 12 },
    { key: 'O', width: 10 },
    { key: 'P', width: 12 },
    { key: 'Q', width: 10 },
    { key: 'R', width: 12 },
    { key: 'S', width: 10 },
    { key: 'T', width: 12 },
    { key: 'U', width: 10 },
    { key: 'V', width: 7 },
    { key: 'W', width: 13 },
    { key: 'X', width: 8 },
    { key: 'Y', width: 12 },
    { key: 'Z', width: 6 },
    { key: 'AA', width: 15 },
  ];

  const headerFill: ExcelJS.FillPattern = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' },
  };
  const subHeaderFill: ExcelJS.FillPattern = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF334155' },
  };
  const adminColFill: ExcelJS.FillPattern = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF1F5F9' },
  };
  const borderThin: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  };

  // Header row 1
  ws.getCell('A1').value = 'NAME:';
  ws.getCell('A1').font = { bold: true, size: 10, color: { argb: 'FF475569' } };
  ws.getCell(mapping.nameCell).value = settings?.driverName || '[Driver Name]';
  ws.getCell(mapping.nameCell).font = { bold: true, size: 11 };

  ws.getCell('J1').value = 'REGION:';
  ws.getCell('J1').font = { bold: true, size: 10, color: { argb: 'FF475569' } };
  ws.getCell(mapping.regionCell).value = settings?.region || '[Depot / Region]';
  ws.getCell(mapping.regionCell).font = { bold: true, size: 11 };

  ws.getCell('V1').value = 'WEEK ENDING:';
  ws.getCell('V1').font = { bold: true, size: 10, color: { argb: 'FF475569' } };
  ws.getCell(mapping.weekEndingCell).value = '[YYYY-MM-DD]';
  ws.getCell(mapping.weekEndingCell).font = { bold: true, size: 11 };

  // Form title banner
  if (mapping.formTitleCell) {
    ws.getCell(mapping.formTitleCell).value = 'HR-018 WEEKLY TIMESHEET & VEHICLE LOG';
    ws.getCell(mapping.formTitleCell).font = { bold: true, size: 12, color: { argb: 'FF0F172A' } };
  }

  // Column Headers
  ws.getCell(mapping.headerDayCell).value = 'DAY / DATE';
  ws.getCell(mapping.headerDayCell).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  ws.getCell(mapping.headerDayCell).fill = headerFill;
  ws.getCell(mapping.headerDayCell).alignment = { vertical: 'middle', horizontal: 'center' };

  // Admin column headers (Column 0)
  ws.getCell(`${mapping.adminHrsCol}${mapping.clientHeaderRow}`).value = 'Admin';
  ws.getCell(`${mapping.adminHrsCol}${mapping.clientHeaderRow}`).font = { bold: true, size: 10 };
  ws.getCell(`${mapping.adminHrsCol}${mapping.jobNumberHeaderRow}`).value = 'Shop / Office';
  ws.getCell(`${mapping.adminHrsCol}${mapping.jobNumberHeaderRow}`).font = { italic: true, size: 9, color: { argb: 'FF64748B' } };
  
  ws.getCell(`${mapping.adminHrsCol}${mapping.subHeaderRow}`).value = 'HRS';
  ws.getCell(`${mapping.adminHrsCol}${mapping.subHeaderRow}`).font = { bold: true, size: 9, color: { argb: 'FFFFFFFF' } };
  ws.getCell(`${mapping.adminHrsCol}${mapping.subHeaderRow}`).fill = subHeaderFill;
  ws.getCell(`${mapping.adminHrsCol}${mapping.subHeaderRow}`).alignment = { horizontal: 'center' };

  ws.getCell(`${mapping.adminKmCol}${mapping.subHeaderRow}`).value = 'KM';
  ws.getCell(`${mapping.adminKmCol}${mapping.subHeaderRow}`).font = { bold: true, size: 9, color: { argb: 'FFFFFFFF' } };
  ws.getCell(`${mapping.adminKmCol}${mapping.subHeaderRow}`).fill = subHeaderFill;
  ws.getCell(`${mapping.adminKmCol}${mapping.subHeaderRow}`).alignment = { horizontal: 'center' };

  // Client column pairs (Columns 1 to 9)
  mapping.clientColPairs.forEach(([hrsCol, kmCol], idx) => {
    const clientCell = ws.getCell(`${hrsCol}${mapping.clientHeaderRow}`);
    clientCell.value = `Client ${idx + 1}`;
    clientCell.font = { bold: true, size: 10 };

    const jobCell = ws.getCell(`${hrsCol}${mapping.jobNumberHeaderRow}`);
    jobCell.value = `Job #${idx + 1}`;
    jobCell.font = { italic: true, size: 9, color: { argb: 'FF64748B' } };

    const hrsSub = ws.getCell(`${hrsCol}${mapping.subHeaderRow}`);
    hrsSub.value = 'HRS';
    hrsSub.font = { bold: true, size: 9, color: { argb: 'FFFFFFFF' } };
    hrsSub.fill = subHeaderFill;
    hrsSub.alignment = { horizontal: 'center' };

    const kmSub = ws.getCell(`${kmCol}${mapping.subHeaderRow}`);
    kmSub.value = 'KM';
    kmSub.font = { bold: true, size: 9, color: { argb: 'FFFFFFFF' } };
    kmSub.fill = subHeaderFill;
    kmSub.alignment = { horizontal: 'center' };
  });

  // Private KM header
  const pvtHeader = ws.getCell(`${mapping.privateKmCol}${mapping.subHeaderRow}`);
  pvtHeader.value = 'PRIVATE KM';
  pvtHeader.font = { bold: true, size: 9, color: { argb: 'FFFFFFFF' } };
  pvtHeader.fill = headerFill;
  pvtHeader.alignment = { horizontal: 'center' };

  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Grid rows
  mapping.dayRows.forEach((row, i) => {
    const dayCell = ws.getCell(`A${row}`);
    dayCell.value = dayNames[i];
    dayCell.font = { bold: true, size: 10 };

    if (mapping.dayDateOffset > 0) {
      const dateCell = ws.getCell(`A${row + mapping.dayDateOffset}`);
      dateCell.value = '[Date]';
      dateCell.font = { size: 9, color: { argb: 'FF64748B' } };
    }

    // Border and background setup
    // Admin
    const aHrs = ws.getCell(`${mapping.adminHrsCol}${row}`);
    const aKm = ws.getCell(`${mapping.adminKmCol}${row}`);
    aHrs.border = borderThin;
    aKm.border = borderThin;
    aHrs.fill = adminColFill;
    aKm.fill = adminColFill;

    // Client columns
    mapping.clientColPairs.forEach(([hrsCol, kmCol]) => {
      const cHrs = ws.getCell(`${hrsCol}${row}`);
      const cKm = ws.getCell(`${kmCol}${row}`);
      cHrs.border = borderThin;
      cKm.border = borderThin;
    });

    // Private
    const pvt = ws.getCell(`${mapping.privateKmCol}${row}`);
    pvt.border = borderThin;
  });

  // Totals row with Excel formulas
  const totRow = mapping.totalsRow;
  ws.getCell(`A${totRow}`).value = 'TOTALS:';
  ws.getCell(`A${totRow}`).font = { bold: true, size: 11 };

  const rowsList = mapping.dayRows.join(',');

  // Admin totals formula
  const adminHrsTot = ws.getCell(`${mapping.adminHrsCol}${totRow}`);
  adminHrsTot.value = { formula: `SUM(${mapping.dayRows.map((r) => `${mapping.adminHrsCol}${r}`).join(',')})` };
  adminHrsTot.font = { bold: true };
  adminHrsTot.numFmt = '0.00';
  adminHrsTot.border = { top: { style: 'thin' }, bottom: { style: 'double' } };

  const adminKmTot = ws.getCell(`${mapping.adminKmCol}${totRow}`);
  adminKmTot.value = { formula: `SUM(${mapping.dayRows.map((r) => `${mapping.adminKmCol}${r}`).join(',')})` };
  adminKmTot.font = { bold: true };
  adminKmTot.numFmt = '#,##0';
  adminKmTot.border = { top: { style: 'thin' }, bottom: { style: 'double' } };

  // Clients totals formulas
  mapping.clientColPairs.forEach(([hrsCol, kmCol]) => {
    const hTot = ws.getCell(`${hrsCol}${totRow}`);
    hTot.value = { formula: `SUM(${mapping.dayRows.map((r) => `${hrsCol}${r}`).join(',')})` };
    hTot.font = { bold: true };
    hTot.numFmt = '0.00';
    hTot.border = { top: { style: 'thin' }, bottom: { style: 'double' } };

    const kTot = ws.getCell(`${kmCol}${totRow}`);
    kTot.value = { formula: `SUM(${mapping.dayRows.map((r) => `${kmCol}${r}`).join(',')})` };
    kTot.font = { bold: true };
    kTot.numFmt = '#,##0';
    kTot.border = { top: { style: 'thin' }, bottom: { style: 'double' } };
  });

  // Private totals formula
  const pvtTot = ws.getCell(`${mapping.privateKmCol}${totRow}`);
  pvtTot.value = { formula: `SUM(${mapping.dayRows.map((r) => `${mapping.privateKmCol}${r}`).join(',')})` };
  pvtTot.font = { bold: true };
  pvtTot.numFmt = '#,##0';
  pvtTot.border = { top: { style: 'thin' }, bottom: { style: 'double' } };

  // Odometer reconciliation block
  ws.getCell('Y21').value = 'CLOSING KM:';
  ws.getCell('Y21').font = { bold: true, size: 10 };
  ws.getCell(mapping.closingKmCell).value = settings?.currentOdometer || 0;
  ws.getCell(mapping.closingKmCell).font = { bold: true, size: 11 };
  ws.getCell(mapping.closingKmCell).border = borderThin;
  ws.getCell(mapping.closingKmCell).numFmt = '#,##0';

  ws.getCell('Y22').value = 'OPENING KM:';
  ws.getCell('Y22').font = { bold: true, size: 10 };
  ws.getCell(mapping.openingKmCell).value = (settings?.currentOdometer || 0) - 500;
  ws.getCell(mapping.openingKmCell).font = { bold: true, size: 11 };
  ws.getCell(mapping.openingKmCell).border = borderThin;
  ws.getCell(mapping.openingKmCell).numFmt = '#,##0';

  if (mapping.totalDistanceCell) {
    ws.getCell('Y23').value = 'TOTAL DISTANCE:';
    ws.getCell('Y23').font = { bold: true, size: 10 };
    ws.getCell(mapping.totalDistanceCell).value = {
      formula: `${mapping.closingKmCell}-${mapping.openingKmCell}`,
    };
    ws.getCell(mapping.totalDistanceCell).font = { bold: true, size: 11, color: { argb: 'FF16A34A' } };
    ws.getCell(mapping.totalDistanceCell).numFmt = '#,##0';
    ws.getCell(mapping.totalDistanceCell).border = { bottom: { style: 'double' } };
  }

  return await wb.xlsx.writeBuffer();
}
