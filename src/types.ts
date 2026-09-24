export type ActivityCategory = 'business' | 'private';
export type BusinessType = 'admin' | 'chargeable';

export interface Split {
  id: string;
  businessType: BusinessType;
  client: string;
  jobNumber: string;
  amount: number; // KM for trips, HRS for sessions
  notes?: string;
}

export interface Trip {
  id: string;
  date: string; // YYYY-MM-DD
  timeOut: string; // HH:mm
  timeIn: string; // HH:mm
  mileageOut: number;
  mileageIn: number;
  category: ActivityCategory;
  businessType: BusinessType;
  client: string;
  jobNumber: string;
  splits?: Split[];
  notes?: string;
  vehicle?: string;
  origin?: string;
  destination?: string;
  status: 'completed' | 'in-progress';
  startedAt?: number; // epoch ms if in-progress
}

export interface WorkSession {
  id: string;
  onDate: string; // YYYY-MM-DD
  onTime: string; // HH:mm
  offDate?: string; // YYYY-MM-DD
  offTime?: string; // HH:mm
  category: ActivityCategory;
  businessType: BusinessType;
  client: string;
  jobNumber: string;
  splits?: Split[];
  notes?: string;
  status: 'completed' | 'active';
  startedAtTimestamp?: number; // epoch ms
}

export interface TimesheetColumn {
  type: 'admin' | 'chargeable';
  client: string;
  jobNumber: string;
  key?: string;
}

export interface DailyTimesheetData {
  cols: { hrs: number; km: number }[];
  pvte: number;
}

export interface WeeklyTimesheetCalculation {
  columns: TimesheetColumn[];
  daily: Record<string, DailyTimesheetData>;
  openingKm: number | null;
  closingKm: number | null;
  overflowClients: { client: string; jobNumber: string; key: string }[];
  weekDays: string[];
}

export interface UserSettings {
  driverName: string;
  region: string;
  vehicleRego: string;
  vehicleName: string;
  currentOdometer: number;
  clients: string[];
  jobNumbers: string[];
  sites?: string[]; // Preset / frequent work sites & destinations
  templateMode?: 'standard' | 'custom';
  cellMapping?: CellMappingConfig;
  taxReferenceNo?: string; // SARS Tax Reference Number
  idNumber?: string; // Taxpayer ID or Passport Number
  vehicleCostPrice?: number; // Vehicle purchase / retail value for SARS
  employerName?: string; // Employer / Company Name
}

export interface CellMappingConfig {
  sheetName: string; // e.g. 'HR-018 Timesheet' or auto-selected
  nameCell: string; // e.g. 'B1'
  regionCell: string; // e.g. 'K1'
  weekEndingCell: string; // e.g. 'W1'
  vehicleRegoCell?: string; // optional: e.g. 'B2'
  formTitleCell?: string; // e.g. 'A2'
  
  // Headers row
  headerDayCell: string; // e.g. 'A4'
  clientHeaderRow: number; // row where client name is populated (e.g. 2)
  jobNumberHeaderRow: number; // row where job number is populated (e.g. 3)
  subHeaderRow: number; // row where HRS and KM headers are (e.g. 4)
  
  // Day Rows: 7 rows for Monday through Sunday
  dayRows: number[]; // e.g. [5, 7, 9, 11, 13, 15, 17]
  dayDateOffset: number; // e.g. 1 if date is 1 row beneath day name, or 0 if same row
  
  // Column definitions
  adminHrsCol: string; // e.g. 'B'
  adminKmCol: string; // e.g. 'C'
  clientColPairs: [string, string][]; // e.g. [['D','E'], ['F','G'], ['H','I'], ['J','K'], ['L','M'], ['N','O'], ['P','Q'], ['R','S'], ['T','U']]
  privateKmCol: string; // e.g. 'AA'
  
  // Totals row
  totalsRow: number; // e.g. 19
  
  // Odometer reconciliation block
  closingKmCell: string; // e.g. 'AA21'
  openingKmCell: string; // e.g. 'AA22'
  totalDistanceCell?: string; // e.g. 'AA23'
}

export interface CustomExcelTemplate {
  filename: string;
  fileSize: number;
  uploadedAt: string;
  detectedSheetNames: string[];
}

export type ActionCategoryType =
  | 'charge-mileage'
  | 'admin-mileage'
  | 'pvt-mileage'
  | 'time-onsite'
  | 'admin-time'
  | 'pvt-time';
