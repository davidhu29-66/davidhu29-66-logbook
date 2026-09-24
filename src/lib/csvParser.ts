import { Trip, ActivityCategory, BusinessType } from '../types';
import { RAW_USER_CSV } from '../data/rawUserCsv';

export { RAW_USER_CSV };

// Parses a single CSV line accounting for quoted substrings
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// Normalizes time into HH:mm
function normalizeTime(val: string): string {
  if (!val) return '08:00';
  const clean = val.trim();
  const parts = clean.split(':');
  if (parts.length >= 2) {
    const h = parts[0].padStart(2, '0');
    const m = parts[1].padStart(2, '0');
    return `${h}:${m}`;
  }
  return clean;
}

export interface ParseCsvResult {
  trips: Trip[];
  skippedCount: number;
  uniqueClients: string[];
  uniqueJobNumbers: string[];
  errors: string[];
}

// Parses multi-line block format where each record spans 6 or 7 lines (e.g. copied from SARS summary or PDF table):
// Line 1: Date (YYYY-MM-DD)
// Line 2: Opening Odometer (e.g. 430 375.00)
// Line 3: Closing Odometer (e.g. 430 498.00)
// Line 4: Total KM (e.g. 123.00)
// Line 5: Business KM (e.g. 123.00)
// Line 6: Private KM (e.g. 0.00)
// Line 7: Purpose / Description (e.g. UWC Main Campus Maintenance)
function parseMultiLineBlockFormat(lines: string[]): ParseCsvResult | null {
  const cleanLines = lines.map((l) => l.trim()).filter((l) => l.length > 0);
  const dateIndices: number[] = [];

  for (let i = 0; i < cleanLines.length; i++) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleanLines[i])) {
      dateIndices.push(i);
    }
  }

  // Need at least 1 date with consecutive number lines to qualify
  if (dateIndices.length === 0) return null;

  let validBlocks = 0;
  for (const idx of dateIndices) {
    if (idx + 2 < cleanLines.length) {
      const num1 = cleanLines[idx + 1].replace(/\s+/g, '');
      const num2 = cleanLines[idx + 2].replace(/\s+/g, '');
      if (/^\d+(\.\d+)?$/.test(num1) && /^\d+(\.\d+)?$/.test(num2)) {
        validBlocks++;
      }
    }
  }

  if (validBlocks === 0) return null;

  const trips: Trip[] = [];
  const clientSet = new Set<string>();
  const jobSet = new Set<string>();
  const errors: string[] = [];

  for (let b = 0; b < dateIndices.length; b++) {
    const startIdx = dateIndices[b];
    const nextStartIdx = b + 1 < dateIndices.length ? dateIndices[b + 1] : cleanLines.length;
    const block = cleanLines.slice(startIdx, nextStartIdx);

    const date = block[0];
    const odoOut = block[1] ? parseFloat(block[1].replace(/\s+/g, '')) || 0 : 0;
    const odoIn = block[2] ? parseFloat(block[2].replace(/\s+/g, '')) || odoOut : odoOut;
    const totalKm = block[3] ? parseFloat(block[3].replace(/\s+/g, '')) || Math.max(0, odoIn - odoOut) : Math.max(0, odoIn - odoOut);
    const bizKm = block[4] ? parseFloat(block[4].replace(/\s+/g, '')) || 0 : totalKm;
    const pvtKm = block[5] ? parseFloat(block[5].replace(/\s+/g, '')) || 0 : 0;
    const description = block[6] ? block.slice(6).join(' ') : (bizKm > 0 ? 'Business travel' : 'Private personal travel');

    let category: ActivityCategory = pvtKm > 0 && bizKm === 0 ? 'private' : 'business';
    let businessType: BusinessType = 'chargeable';
    let client = '';
    let jobNumber = '';

    const lowerDesc = description.toLowerCase();
    if (lowerDesc.includes('private') || lowerDesc.includes('pvt') || (pvtKm > 0 && bizKm === 0)) {
      category = 'private';
    } else if (
      lowerDesc.includes('admin') ||
      lowerDesc.includes('reconciliation') ||
      lowerDesc.includes('home to office') ||
      lowerDesc.includes('commute')
    ) {
      businessType = 'admin';
      client = 'Admin';
      clientSet.add('Admin');
    } else if (lowerDesc.includes('uwc')) {
      client = 'UWC';
      clientSet.add('UWC');
    } else if (
      lowerDesc.includes('sbm') ||
      lowerDesc.includes('saldanha') ||
      lowerDesc.includes('langebaan') ||
      lowerDesc.includes('resort')
    ) {
      client = 'SBM';
      clientSet.add('SBM');
      jobNumber = '74125';
      jobSet.add('74125');
    } else if (
      lowerDesc.includes('sbsa') ||
      lowerDesc.includes('caledon') ||
      lowerDesc.includes('hermanus') ||
      lowerDesc.includes('lentegeur')
    ) {
      client = 'SBSA';
      clientSet.add('SBSA');
      jobNumber = '78912';
      jobSet.add('78912');
    } else if (lowerDesc.includes('tru cape') || lowerDesc.includes('tru-cape')) {
      client = 'Tru Cape';
      clientSet.add('Tru Cape');
      jobNumber = '78959';
      jobSet.add('78959');
    } else if (lowerDesc.includes('artscape')) {
      client = 'Artscape';
      clientSet.add('Artscape');
      jobNumber = '78769';
      jobSet.add('78769');
    } else if (lowerDesc.includes('eskom') || lowerDesc.includes('swellendam')) {
      client = 'Eskom';
      clientSet.add('Eskom');
    } else if (lowerDesc.includes('unisa')) {
      client = 'Unisa';
      clientSet.add('Unisa');
      jobNumber = '78957';
      jobSet.add('78957');
    }

    // Origin and Destination inference
    let origin = 'Home';
    let destination = 'Site';
    if (lowerDesc.includes('home to office')) {
      origin = 'Home';
      destination = 'Office';
    } else if (lowerDesc.includes('office to sbm')) {
      origin = 'Office';
      destination = 'SBM Langebaan Depot';
    } else if (lowerDesc.includes('sbm to home')) {
      origin = 'SBM Site';
      destination = 'Home';
    } else if (lowerDesc.includes('uwc')) {
      origin = 'Office';
      destination = 'UWC Main Campus';
    } else if (lowerDesc.includes('saldanha') || lowerDesc.includes('sbm noc')) {
      origin = 'Office';
      destination = 'SBM NOC / Saldanha';
    } else if (lowerDesc.includes('caledon') || lowerDesc.includes('lentegeur')) {
      origin = 'Lentegeur / Office';
      destination = 'SBSA Caledon';
    } else if (category === 'private') {
      origin = 'Home';
      destination = lowerDesc.includes('doctor') ? 'Doctor' : lowerDesc.includes('shop') ? 'Shops' : 'Personal';
    }

    // If day has both business and private portions (e.g. 2026-07-23 or 2026-07-31)
    if (bizKm > 0 && pvtKm > 0) {
      const midOdo = Math.round(odoOut + bizKm);
      trips.push({
        id: `import-ml-${date}-${odoOut}-biz`,
        date,
        timeOut: '08:00',
        timeIn: '16:00',
        mileageOut: odoOut,
        mileageIn: midOdo,
        category: 'business',
        businessType,
        client: client || 'Operations',
        jobNumber,
        origin,
        destination,
        notes: `${description} (${bizKm}km Business)`,
        status: 'completed',
        splits: [],
      });

      trips.push({
        id: `import-ml-${date}-${midOdo}-pvt`,
        date,
        timeOut: '16:00',
        timeIn: '17:30',
        mileageOut: midOdo,
        mileageIn: odoIn,
        category: 'private',
        businessType: 'chargeable',
        client: '',
        jobNumber: '',
        origin: destination,
        destination: 'Home',
        notes: `Private personal travel (${pvtKm}km)`,
        status: 'completed',
        splits: [],
      });
    } else {
      trips.push({
        id: `import-ml-${date}-${odoOut}`,
        date,
        timeOut: '08:00',
        timeIn: '17:00',
        mileageOut: odoOut,
        mileageIn: odoIn,
        category,
        businessType,
        client: category === 'private' ? '' : (client || 'Admin'),
        jobNumber,
        origin,
        destination,
        notes: description,
        status: 'completed',
        splits: [],
      });
    }
  }

  return {
    trips,
    skippedCount: 0,
    uniqueClients: Array.from(clientSet),
    uniqueJobNumbers: Array.from(jobSet),
    errors,
  };
}

export function parseCsvTrips(csvText: string): ParseCsvResult {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) {
    return { trips: [], skippedCount: 0, uniqueClients: [], uniqueJobNumbers: [], errors: ['CSV content is empty'] };
  }

  // First, check if this is the multi-line block format (e.g. pasted directly from PDF/table)
  const multiLineResult = parseMultiLineBlockFormat(lines);
  if (multiLineResult && multiLineResult.trips.length > 0) {
    return multiLineResult;
  }

  // Detect header indices
  const headerTokens = parseCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
  const findCol = (...names: string[]): number => {
    for (const name of names) {
      const idx = headerTokens.findIndex((h) => h.includes(name));
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const colDate = findCol('date');
  const colTimeOut = findCol('timeout', 'timefrom');
  const colFrom = findCol('startlocation', 'from', 'origin', 'startloc');
  const colOdoOut = findCol('odometerstart', 'odometerout', 'odoout', 'startkm', 'startodo');
  const colTimeIn = findCol('timein', 'timeto');
  const colTo = findCol('endlocation', 'to', 'destination', 'endloc');
  const colOdoIn = findCol('odometerend', 'odometerin', 'odoin', 'endkm', 'endodo');
  const colKm = findCol('distance', 'km');
  const colVehicle = findCol('vehicle', 'car', 'fleet');
  const colCategory = findCol('category');
  const colBizType = findCol('businesstype', 'biztype', 'type');
  const colClient = findCol('client', 'customer');
  const colPurpose = findCol('purposenotes', 'purpose', 'desc', 'description');
  const colJobNumber = findCol('jobnumber', 'jobno', 'job');
  const colNotes = findCol('sitenotes', 'notes', 'comments');

  const trips: Trip[] = [];
  const seenKeys = new Set<string>();
  const clientSet = new Set<string>();
  const jobSet = new Set<string>();
  const errors: string[] = [];
  let skippedCount = 0;

  // Process rows starting from index 1 (or 0 if no header recognized)
  const startIndex = colDate !== -1 ? 1 : 0;

  for (let r = startIndex; r < lines.length; r++) {
    const row = parseCsvLine(lines[r]);
    if (row.length < 4) continue;

    try {
      const rawDate = colDate !== -1 ? row[colDate] : row[0];
      if (!rawDate || !/^\d{4}-\d{2}-\d{2}$/.test(rawDate.trim())) {
        // Skip malformed date
        continue;
      }
      const date = rawDate.trim();

      const timeOut = normalizeTime(colTimeOut !== -1 ? row[colTimeOut] : '08:00');
      const origin = (colFrom !== -1 ? row[colFrom] : row[2]) || 'Home';
      const odoOut = Number((colOdoOut !== -1 ? row[colOdoOut] : row[3]).replace(/[^0-9.]/g, '')) || 0;

      const timeIn = normalizeTime(colTimeIn !== -1 ? row[colTimeIn] : '09:00');
      const destination = (colTo !== -1 ? row[colTo] : row[5]) || 'Site';
      const odoIn = Number((colOdoIn !== -1 ? row[colOdoIn] : row[6]).replace(/[^0-9.]/g, '')) || odoOut;

      const declaredKm = colKm !== -1 ? Number(row[colKm].replace(/[^0-9.]/g, '')) : 0;
      const calcDistance = Math.max(0, odoIn - odoOut);
      const totalKm = declaredKm > 0 ? declaredKm : calcDistance;

      const rawCategory = (colCategory !== -1 ? row[colCategory] : '').toLowerCase();
      const isPrivate = rawCategory.includes('priv');
      const category: ActivityCategory = isPrivate ? 'private' : 'business';

      const rawPurpose = (colPurpose !== -1 ? row[colPurpose] : '').trim();
      const rawJob = (colJobNumber !== -1 ? row[colJobNumber] : '').trim();
      const rawSiteNotes = (colNotes !== -1 ? row[colNotes] : '').trim();

      // Client inference
      const rawClient = (colClient !== -1 ? row[colClient] : '').trim();
      let client = rawClient;
      if (category === 'private') {
        client = '';
      } else if (!client || client.toLowerCase() === 'admin') {
        const fullContext = `${origin} ${destination} ${rawPurpose} ${rawSiteNotes}`;
        if (/\b(?:SBM|Saldanha)\b/i.test(fullContext)) client = 'SBM';
        else if (/\b(?:UWC)\b/i.test(fullContext)) client = 'Uwc';
        else if (/\b(?:SBSA)\b/i.test(fullContext)) client = 'SBSA';
        else if (/\b(?:Artscape)\b/i.test(fullContext)) client = 'Artscape';
        else if (/\b(?:CCPOA)\b/i.test(fullContext)) client = 'CCPOA';
        else if (/\b(?:Eskom)\b/i.test(fullContext)) client = 'Eskom';
        else if (/\b(?:Unisa)\b/i.test(fullContext)) client = 'Unisa';
        else if (/\b(?:Tru Cape|Tru-Cape)\b/i.test(fullContext)) client = 'Tru Cape';
        else if (/\b(?:Lentegeur)\b/i.test(fullContext)) client = 'Lentegeur Hospital';
        else if (/\b(?:Mitchells Plain)\b/i.test(fullContext)) client = 'Mitchells Plain Hospital';
        else if (/\b(?:SAAO)\b/i.test(fullContext)) client = 'SAAO';
        else if (/\b(?:FNB)\b/i.test(fullContext)) client = 'FNB';
        else if (/\b(?:VCam)\b/i.test(fullContext)) client = 'VCam';
        else if (category === 'business') client = 'Admin';
      }

      const rawBizType = (colBizType !== -1 ? row[colBizType] : '').toLowerCase();
      let businessType: BusinessType = 'chargeable';
      if (category === 'private') {
        businessType = 'admin';
      } else if (rawCategory.includes('admin') || rawBizType.includes('admin') || client.toLowerCase() === 'admin' || !client) {
        businessType = 'admin';
      } else {
        businessType = 'chargeable';
      }

      // Extract clean job number
      let jobNumber = rawJob;
      if (!jobNumber && rawPurpose) {
        const jnMatch = rawPurpose.match(/(?:J\/N|J\/n|Job|JN|Job No)[:\s]*([A-Za-z0-9_-]+)/i);
        if (jnMatch) jobNumber = jnMatch[1];
      }

      // Combine notes
      const notesParts = [rawPurpose, rawSiteNotes].filter(Boolean);
      const notes = notesParts.join(' • ');

      // Vehicle
      const rawVehicle = colVehicle !== -1 ? row[colVehicle] : '';
      const vehicle = rawVehicle.toLowerCase().includes('ryan') ? "Ryan's Van" : 'Toyota Hilux 4x4';

      // Deduplication check: same date, timeOut, odoOut, odoIn, destination
      const dedupKey = `${date}_${timeOut}_${odoOut}_${odoIn}_${destination.toLowerCase()}`;
      if (seenKeys.has(dedupKey)) {
        skippedCount++;
        continue;
      }
      seenKeys.add(dedupKey);

      if (client && client.toLowerCase() !== 'admin') {
        clientSet.add(client);
      }
      if (jobNumber && jobNumber.length > 2) {
        jobSet.add(jobNumber);
      }

      const trip: Trip = {
        id: `trip-csv-${date}-${r}-${Math.random().toString(36).substring(2, 6)}`,
        date,
        timeOut,
        timeIn,
        mileageOut: odoOut,
        mileageIn: odoIn > odoOut ? odoIn : odoOut + totalKm,
        category,
        businessType,
        client,
        jobNumber,
        origin,
        destination,
        notes: notes || undefined,
        vehicle,
        status: 'completed',
      };

      trips.push(trip);
    } catch (e: any) {
      errors.push(`Row ${r}: ${e.message}`);
    }
  }

  // Sort chronologically by date then timeOut
  trips.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.timeOut.localeCompare(b.timeOut);
  });

  return {
    trips,
    skippedCount,
    uniqueClients: Array.from(clientSet).sort(),
    uniqueJobNumbers: Array.from(jobSet).sort(),
    errors,
  };
}

export function getDefaultUserTrips(): Trip[] {
  const result = parseCsvTrips(RAW_USER_CSV);
  return result.trips;
}
