import * as XLSX from 'xlsx';
import type { 
  AttendanceRecord, 
  AttendanceStatus, 
  DailyReport, 
  ManagerGroup, 
  ParseResult, 
  ShiftType 
} from '../types/attendance';
import { 
  SAFARI_DEFAULT_RECORDS, 
  SAFARI_DEFAULT_BRANCH_MAP, 
  SAFARI_DEFAULT_EMP_MAP 
} from './safariInitialData';

// Helper to normalize text for matching headers
function normalizeHeader(str: string): string {
  return str
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[\s_\-]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه');
}

/**
 * Parse cell status text like "PM : onTime", "AM : DELAY", "OFF : OverTime", "AL", "SICK"
 */
export function parseSafariCellStatus(rawVal: any): {
  status: AttendanceStatus;
  shift: ShiftType;
  rawText: string;
  isOvertime: boolean;
} {
  const str = (rawVal || '').toString().trim();
  if (!str || str === '0' || str === '-') {
    return {
      status: 'off',
      shift: 'none',
      rawText: 'OFF',
      isOvertime: false
    };
  }

  let shift: ShiftType = 'none';
  if (str.toUpperCase().includes('AM')) shift = 'AM';
  else if (str.toUpperCase().includes('PM')) shift = 'PM';

  const upper = str.toUpperCase();
  let isOvertime = upper.includes('OVERTIME') || upper.includes('OVER TIME');
  let status: AttendanceStatus = 'present';

  if (upper.includes('SICK')) {
    status = 'sick';
  } else if (upper.includes('AL') || upper.includes('LEAVE')) {
    status = isOvertime ? 'overtime' : 'leave';
  } else if (upper.includes('ABS')) {
    status = 'absent';
  } else if (upper.includes('DELAY') || upper.includes('LATE')) {
    status = 'late';
  } else if (upper.includes('OVERTIME') || upper.includes('OVER TIME')) {
    status = 'overtime';
  } else if (upper.includes('ONTIME') || upper.includes('ON TIME')) {
    status = 'present';
  } else if (upper === 'OFF' || upper.startsWith('OFF')) {
    status = isOvertime ? 'overtime' : 'off';
  } else if (upper.includes('HOLIDAY')) {
    status = 'off';
  }

  return {
    status,
    shift,
    rawText: str,
    isOvertime
  };
}

/**
 * Recalculate employee record for a specific active day (1..N) or full period (0)
 */
export function setRecordActiveDay(record: AttendanceRecord, dayNumber: number): AttendanceRecord {
  if (dayNumber === 0) {
    // Full period summary mode: determine dominant status or overtime
    const dayVals = Object.values(record.days);
    const hasOvertime = dayVals.some(d => d.isOvertime || d.status === 'overtime');
    const absentDays = dayVals.filter(d => d.status === 'absent').length;
    const lateDays = dayVals.filter(d => d.status === 'late').length;
    const sickDays = dayVals.filter(d => d.status === 'sick').length;
    const leaveDays = dayVals.filter(d => d.status === 'leave').length;
    const presentDays = dayVals.filter(d => d.status === 'present').length;
    
    let domStatus: AttendanceStatus = 'present';
    if (absentDays > 2) domStatus = 'absent';
    else if (lateDays > 2) domStatus = 'late';
    else if (sickDays > 0) domStatus = 'sick';
    else if (leaveDays > 0) domStatus = 'leave';
    else if (hasOvertime) domStatus = 'overtime';

    const parts: string[] = [];
    if (presentDays > 0) parts.push(`حضور: ${presentDays}`);
    if (lateDays > 0) parts.push(`تأخير: ${lateDays}`);
    if (absentDays > 0) parts.push(`غياب: ${absentDays}`);
    if (hasOvertime) parts.push(`إضافي: ${dayVals.filter(d => d.isOvertime || d.status === 'overtime').length}`);
    if (leaveDays > 0) parts.push(`سنوية: ${leaveDays}`);
    if (sickDays > 0) parts.push(`مرضية: ${sickDays}`);

    return {
      ...record,
      activeDayNumber: 0,
      date: 'كامل الفترة (مصفوفة الأيام)',
      status: domStatus,
      rawStatus: parts.join(' | ') || `حضور: ${presentDays}`
    };
  }

  const d = record.days[dayNumber];
  if (!d) {
    return {
      ...record,
      activeDayNumber: dayNumber,
      date: `اليوم ${dayNumber}`
    };
  }

  return {
    ...record,
    activeDayNumber: dayNumber,
    date: `اليوم ${dayNumber}`,
    status: d.status,
    shift: d.shift,
    rawStatus: d.rawText,
    lateMinutes: d.status === 'late' ? 30 : 0
  };
}

/**
 * Group and aggregate records by Manager for a given day or period
 */
export function groupRecordsByManager(records: AttendanceRecord[], activeDayNumber: number = 1): ManagerGroup[] {
  const groups: Record<string, {
    region: string;
    department: string;
    branchCodes: Set<string>;
    employees: AttendanceRecord[];
    presentCount: number;
    lateCount: number;
    absentCount: number;
    overtimeCount: number;
    leaveCount: number;
    annualLeaveCount: number;
    sickCount: number;
    offCount: number;
    amCount: number;
    pmCount: number;
    totalDelayMinutes: number;
  }> = {};

  records.forEach(emp => {
    const mgr = emp.managerName || 'إدارة عامة / غير معين';
    if (!groups[mgr]) {
      groups[mgr] = {
        region: emp.region || 'عام / غير محدد',
        department: emp.department || emp.region || 'عام',
        branchCodes: new Set<string>(),
        employees: [],
        presentCount: 0,
        lateCount: 0,
        absentCount: 0,
        overtimeCount: 0,
        leaveCount: 0,
        annualLeaveCount: 0,
        sickCount: 0,
        offCount: 0,
        amCount: 0,
        pmCount: 0,
        totalDelayMinutes: 0
      };
    }

    if (emp.branchCode) {
      groups[mgr].branchCodes.add(emp.branchCode);
    }
    groups[mgr].employees.push(emp);

    if (activeDayNumber === 0) {
      // Aggregate across all days in matrix (matching Excel Dashboard formulas)
      Object.values(emp.days).forEach(d => {
        if (d.status === 'present') groups[mgr].presentCount++;
        else if (d.status === 'late') {
          groups[mgr].lateCount++;
          groups[mgr].totalDelayMinutes += 30;
        } else if (d.status === 'absent') groups[mgr].absentCount++;
        else if (d.status === 'overtime' || d.isOvertime) groups[mgr].overtimeCount++;
        else if (d.status === 'sick') {
          groups[mgr].sickCount++;
          groups[mgr].leaveCount++;
        } else if (d.status === 'leave') {
          groups[mgr].annualLeaveCount++;
          groups[mgr].leaveCount++;
        } else if (d.status === 'off') groups[mgr].offCount++;

        if (d.shift === 'AM') groups[mgr].amCount++;
        else if (d.shift === 'PM') groups[mgr].pmCount++;
      });
    } else {
      // Specific day
      const dayData = emp.days[activeDayNumber] || {
        status: emp.status,
        shift: emp.shift,
        isOvertime: false
      };

      if (dayData.status === 'present') groups[mgr].presentCount++;
      else if (dayData.status === 'late') {
        groups[mgr].lateCount++;
        groups[mgr].totalDelayMinutes += (emp.lateMinutes || 30);
      } else if (dayData.status === 'absent') groups[mgr].absentCount++;
      else if (dayData.status === 'overtime' || dayData.isOvertime) groups[mgr].overtimeCount++;
      else if (dayData.status === 'sick') {
        groups[mgr].sickCount++;
        groups[mgr].leaveCount++;
      } else if (dayData.status === 'leave') {
        groups[mgr].annualLeaveCount++;
        groups[mgr].leaveCount++;
      } else if (dayData.status === 'off') groups[mgr].offCount++;

      if (dayData.shift === 'AM') groups[mgr].amCount++;
      else if (dayData.shift === 'PM') groups[mgr].pmCount++;
    }
  });

  return Object.entries(groups).map(([managerName, g]) => {
    const totalWorking = g.presentCount + g.lateCount + g.absentCount;
    const attendanceRate = totalWorking > 0 
      ? Math.round(((g.presentCount + g.lateCount) / totalWorking) * 100) 
      : 100;

    return {
      managerName,
      region: g.region,
      department: g.department,
      totalCount: g.employees.length,
      branchCodes: Array.from(g.branchCodes),
      presentCount: g.presentCount,
      lateCount: g.lateCount,
      absentCount: g.absentCount,
      overtimeCount: g.overtimeCount,
      leaveCount: g.leaveCount,
      annualLeaveCount: g.annualLeaveCount,
      sickCount: g.sickCount,
      offCount: g.offCount,
      attendanceRate,
      totalDelayMinutes: g.totalDelayMinutes,
      amCount: g.amCount,
      pmCount: g.pmCount,
      employees: g.employees
    };
  }).sort((a, b) => {
    if (a.managerName.includes('غير معين')) return 1;
    if (b.managerName.includes('غير معين')) return -1;
    return b.totalCount - a.totalCount;
  });
}

/**
 * Build a complete DailyReport from records and selected active day
 */
export function buildSafariDailyReport(
  records: AttendanceRecord[],
  fileName: string = 'SAfari.xlsx',
  activeDayNumber: number = 1
): DailyReport {
  // Determine available day numbers
  const daySet = new Set<number>();
  records.forEach(r => {
    Object.keys(r.days).forEach(d => daySet.add(Number(d)));
  });
  const availableDayNumbers = Array.from(daySet).sort((a, b) => a - b);
  const totalDays = availableDayNumbers.length || 26;

  // Update records for the active day
  const updatedRecords = records.map(r => setRecordActiveDay(r, activeDayNumber));

  // Compute managers
  const managers = groupRecordsByManager(updatedRecords, activeDayNumber);

  // Global sums
  let presentCount = 0;
  let lateCount = 0;
  let absentCount = 0;
  let overtimeCount = 0;
  let leaveCount = 0;
  let annualLeaveCount = 0;
  let sickCount = 0;
  let offCount = 0;
  let amCount = 0;
  let pmCount = 0;
  let totalDelayMinutes = 0;
  let unlinkedCount = 0;

  updatedRecords.forEach(r => {
    if (r.isUnlinked || r.managerName.includes('غير معين') || r.managerName.includes('غير محدد') || r.branchCode === 'SAF-42' || r.branchCode === 'غير محدد') {
      unlinkedCount++;
    }
  });

  managers.forEach(m => {
    presentCount += m.presentCount;
    lateCount += m.lateCount;
    absentCount += m.absentCount;
    overtimeCount += m.overtimeCount;
    leaveCount += m.leaveCount;
    annualLeaveCount += (m.annualLeaveCount || 0);
    sickCount += (m.sickCount || 0);
    offCount += m.offCount;
    amCount += m.amCount;
    pmCount += m.pmCount;
    totalDelayMinutes += m.totalDelayMinutes;
  });

  const totalWorking = presentCount + lateCount + absentCount;
  const overallAttendanceRate = totalWorking > 0 
    ? Math.round(((presentCount + lateCount) / totalWorking) * 100) 
    : 100;

  const regions = Array.from(new Set(records.map(r => r.region).filter(Boolean)));
  const branchCodes = Array.from(new Set(records.map(r => r.branchCode).filter(Boolean)));

  const dateLabel = activeDayNumber === 0 
    ? 'كامل الفترة (مصفوفة الأيام)' 
    : `اليوم ${activeDayNumber}`;

  return {
    id: `report-${activeDayNumber}-${Date.now()}`,
    date: dateLabel,
    activeDayNumber,
    totalDays,
    availableDayNumbers,
    fileName,
    uploadTimestamp: Date.now(),
    totalEmployees: records.length,
    totalManagers: managers.length,
    unlinkedCount,
    regions,
    branchCodes,
    presentCount,
    lateCount,
    absentCount,
    overtimeCount,
    leaveCount,
    annualLeaveCount,
    sickCount,
    offCount,
    amCount,
    pmCount,
    overallAttendanceRate,
    totalDelayMinutes,
    records: updatedRecords,
    managers
  };
}

/**
 * Main parser function to process Excel Buffer or ArrayBuffer
 * Automatically links every employee to their direct manager based on Branch and Region from Safari
 */
export function parseExcelAttendance(fileData: ArrayBuffer | Uint8Array, fileName: string): ParseResult {
  const warnings: string[] = [];

  try {
    const workbook = XLSX.read(fileData, { type: 'array', cellDates: true });
    
    // 1. Build branch map: start with default master mapping and override if sheet exists
    const branchMap: Record<string, { region: string; manager: string }> = { ...SAFARI_DEFAULT_BRANCH_MAP };
    if (workbook.SheetNames.includes('Branches')) {
      const bRows = XLSX.utils.sheet_to_json<any[]>(workbook.Sheets['Branches'], { header: 1, defval: '' });
      for (let i = 1; i < bRows.length; i++) {
        const [bReg, bCode, bMgr] = bRows[i];
        if (bCode) {
          const codeKey = String(bCode).trim().toUpperCase();
          branchMap[codeKey] = {
            region: bReg ? String(bReg).trim() : '',
            manager: bMgr ? String(bMgr).trim() : ''
          };
        }
      }
    }

    // 2. Build employee map: start with default master employee mapping and override if sheet exists
    const empMap: Record<string, { name: string; region: string; branchCode: string; manager: string }> = { ...SAFARI_DEFAULT_EMP_MAP };
    if (workbook.SheetNames.includes('Employee_Map')) {
      const eRows = XLSX.utils.sheet_to_json<any[]>(workbook.Sheets['Employee_Map'], { header: 1, defval: '' });
      for (let i = 1; i < eRows.length; i++) {
        const [eName, ePF, eBranch, eCode, eMgr] = eRows[i];
        if (ePF) {
          const pfKey = String(Math.floor(Number(ePF)) || ePF).trim();
          empMap[pfKey] = {
            name: eName ? String(eName).trim() : '',
            region: eBranch ? String(eBranch).trim() : '',
            branchCode: eCode ? String(eCode).trim().toUpperCase() : '',
            manager: eMgr ? String(eMgr).trim() : ''
          };
        }
      }
    }

    // 3. Find attendance sheet (Raw_Attendance, Attendance, or first sheet with day numbers)
    let attSheetName = workbook.SheetNames.find(s => {
      const norm = s.trim().toLowerCase();
      return norm === 'raw_attendance' || norm === 'attendance' || norm.includes('حضور') || norm.includes('raw_att');
    });

    if (!attSheetName) {
      for (const sName of workbook.SheetNames) {
        const testRows = XLSX.utils.sheet_to_json<any[]>(workbook.Sheets[sName], { header: 1, defval: '' });
        if (testRows.length > 1) {
          const header = testRows[0] || [];
          const hasDayCols = header.some((h: any) => typeof h === 'number' || (typeof h === 'string' && /^\d+$/.test(h.trim())));
          if (hasDayCols) {
            attSheetName = sName;
            break;
          }
        }
      }
    }

    if (!attSheetName) {
      attSheetName = workbook.SheetNames[0];
    }

    const attRows = XLSX.utils.sheet_to_json<any[]>(workbook.Sheets[attSheetName], { header: 1, defval: '' });
    if (!attRows || attRows.length < 2) {
      return {
        success: false,
        fileName,
        date: 'اليوم 1',
        activeDayNumber: 1,
        totalDays: 1,
        availableDayNumbers: [1],
        records: [],
        managers: [],
        totalRecords: 0,
        errors: ['صفحة الحضور في الملف فارغة أو لا تحتوي على سجلات كافية.'],
        warnings
      };
    }

    const headerRow = attRows[0] || [];

    // Find day columns (1..31)
    const dayColumns: { colIndex: number; dayNumber: number }[] = [];
    for (let c = 0; c < headerRow.length; c++) {
      const h = headerRow[c];
      if (typeof h === 'number' || (typeof h === 'string' && /^\d+$/.test(h.toString().trim()))) {
        const dayNum = parseInt(h.toString().trim(), 10);
        if (dayNum >= 1 && dayNum <= 31) {
          dayColumns.push({ colIndex: c, dayNumber: dayNum });
        }
      }
    }

    // If day columns found -> process multi-day matrix
    if (dayColumns.length > 0) {
      dayColumns.sort((a, b) => a.dayNumber - b.dayNumber);

      const nameColIdx = headerRow.findIndex((h: any) => normalizeHeader(h || '').includes('name') || normalizeHeader(h || '').includes('اسم'));
      const pfColIdx = headerRow.findIndex((h: any) => normalizeHeader(h || '').includes('pf') || normalizeHeader(h || '').includes('رقم'));
      const regColIdx = headerRow.findIndex((h: any) => normalizeHeader(h || '').includes('region') || normalizeHeader(h || '').includes('منطق') || normalizeHeader(h || '') === 'r');
      const codeColIdx = headerRow.findIndex((h: any) => normalizeHeader(h || '').includes('code') || normalizeHeader(h || '').includes('كود') || normalizeHeader(h || '').includes('فرع'));
      const mgrColIdx = headerRow.findIndex((h: any) => normalizeHeader(h || '').includes('manager') || normalizeHeader(h || '').includes('مدير') || normalizeHeader(h || '').includes('مشرف'));

      const recordsMap = new Map<string, AttendanceRecord>();

      for (let r = 1; r < attRows.length; r++) {
        const row = attRows[r];
        if (!row || !row[nameColIdx >= 0 ? nameColIdx : 0]) continue;

        const empName = String(row[nameColIdx >= 0 ? nameColIdx : 0]).trim();
        const rawPf = row[pfColIdx >= 0 ? pfColIdx : 1];
        const pf = rawPf ? String(Math.floor(Number(rawPf)) || rawPf).trim() : `EMP-${r}`;
        const pfAttendance = row[2] ? String(Math.floor(Number(row[2])) || row[2]).trim() : pf;
        let region = regColIdx >= 0 && row[regColIdx] ? String(row[regColIdx]).trim() : (row[3] ? String(row[3]).trim() : '');
        let code = codeColIdx >= 0 && row[codeColIdx] ? String(row[codeColIdx]).trim().toUpperCase() : (row[4] ? String(row[4]).trim().toUpperCase() : '');
        let manager = mgrColIdx >= 0 && row[mgrColIdx] ? String(row[mgrColIdx]).trim() : '';

        // Cross-reference with master maps
        if (pf && empMap[pf]) {
          if (!manager && empMap[pf].manager) manager = empMap[pf].manager;
          if (!region && empMap[pf].region) region = empMap[pf].region;
          if (!code && empMap[pf].branchCode) code = empMap[pf].branchCode;
        }
        if (code && branchMap[code]) {
          if (!manager && branchMap[code].manager) manager = branchMap[code].manager;
          if (!region && branchMap[code].region) region = branchMap[code].region;
        }

        // Normalize region label
        let normRegion = 'الوسطى (Central)';
        const rLower = (region || '').toLowerCase();
        if (rLower.includes('central') || rLower.includes('وسط')) normRegion = 'الوسطى (Central)';
        else if (rLower.includes('east') || rLower.includes('شرق')) normRegion = 'الشرقية (Eastern)';
        else if (rLower.includes('west') || rLower.includes('غرب')) normRegion = 'الغربية (Western)';
        else if (rLower.includes('north') || rLower.includes('شمال')) normRegion = 'الشمالية (Northern)';
        else if (rLower.includes('south') || rLower.includes('جنوب')) normRegion = 'الجنوبية (Southern)';
        else if (region) normRegion = region;
        else normRegion = 'إدارة عامة / غير محدد';

        const isUnlinked = !manager || manager === 'إدارة عامة / غير معين' || manager === '0' || !code || code === '42' || code === 'SAF-42' || code === 'غير محدد';
        const finalManager = manager && manager !== '0' ? manager : 'إدارة عامة / غير معين';
        const finalCode = code && code !== '42' ? code : (code === '42' ? 'SAF-42' : 'غير محدد');

        const days: Record<number, any> = {};
        for (const { colIndex, dayNumber } of dayColumns) {
          const val = row[colIndex];
          const parsed = parseSafariCellStatus(val);
          days[dayNumber] = {
            dayNumber,
            dateStr: `اليوم ${dayNumber}`,
            rawText: parsed.rawText,
            status: parsed.status,
            shift: parsed.shift,
            isOvertime: parsed.isOvertime
          };
        }

        const day1 = days[dayColumns[0].dayNumber] || { status: 'present', shift: 'AM', rawText: 'AM : onTime' };

        recordsMap.set(pf, {
          id: `safari-emp-${pf}`,
          employeeId: pf,
          employeeName: empName,
          pfAttendance: pfAttendance || pf,
          region: normRegion,
          branchCode: finalCode,
          managerName: finalManager,
          department: normRegion,
          date: `اليوم ${dayColumns[0].dayNumber}`,
          activeDayNumber: dayColumns[0].dayNumber,
          status: day1.status,
          shift: day1.shift,
          rawStatus: day1.rawText,
          lateMinutes: day1.status === 'late' ? 30 : 0,
          isUnlinked,
          days
        });
      }

      // Check if absence sheet exists and overlay days
      const absSheetName = workbook.SheetNames.find(s => {
        const norm = s.trim().toLowerCase();
        return norm === 'raw_absence' || norm === 'الغياب' || norm.includes('غياب');
      });
      if (absSheetName) {
        const absRows = XLSX.utils.sheet_to_json<any[]>(workbook.Sheets[absSheetName], { header: 1, defval: '' });
        if (absRows.length > 1) {
          const absHeader = absRows[0] || [];
          const absDayCols: { colIndex: number; dayNumber: number }[] = [];
          for (let c = 0; c < absHeader.length; c++) {
            const h = absHeader[c];
            if (typeof h === 'number' || (typeof h === 'string' && /^\d+$/.test(h.toString().trim()))) {
              const dNum = parseInt(h.toString().trim(), 10);
              if (dNum >= 1 && dNum <= 31) absDayCols.push({ colIndex: c, dayNumber: dNum });
            }
          }

          for (let r = 1; r < absRows.length; r++) {
            const row = absRows[r];
            if (!row || !row[1]) continue;
            const pf = String(Math.floor(Number(row[1])) || row[1]).trim();
            const rec = recordsMap.get(pf);
            if (rec) {
              for (const { colIndex, dayNumber } of absDayCols) {
                const val = row[colIndex];
                if (val && val !== '0' && val !== '-') {
                  const parsed = parseSafariCellStatus(val);
                  rec.days[dayNumber] = {
                    dayNumber,
                    dateStr: `اليوم ${dayNumber}`,
                    rawText: parsed.rawText,
                    status: parsed.status,
                    shift: parsed.shift,
                    isOvertime: parsed.isOvertime
                  };
                }
              }
            }
          }
        }
      }

      const records = Array.from(recordsMap.values());
      const availableDayNumbers = dayColumns.map(d => d.dayNumber);
      const managers = groupRecordsByManager(records, 1);

      return {
        success: true,
        fileName,
        date: 'اليوم 1',
        activeDayNumber: 1,
        totalDays: availableDayNumbers.length,
        availableDayNumbers,
        records,
        managers,
        totalRecords: records.length,
        errors: [],
        warnings
      };
    }

    // Fallback: Standard single-sheet flat format
    const worksheet = workbook.Sheets[attSheetName];
    const rawData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

    if (rawData.length === 0) {
      return {
        success: false,
        fileName,
        date: 'اليوم 1',
        activeDayNumber: 1,
        totalDays: 1,
        availableDayNumbers: [1],
        records: [],
        managers: [],
        totalRecords: 0,
        errors: ['صفحة الإكسل فارغة ولا تحتوي على سجلات موظفين.'],
        warnings: []
      };
    }

    const headers = Object.keys(rawData[0]);
    let colEmpName = headers.find(h => normalizeHeader(h).includes('اسم') || normalizeHeader(h).includes('name'));
    let colEmpId = headers.find(h => normalizeHeader(h).includes('رقم') || normalizeHeader(h).includes('id') || normalizeHeader(h).includes('pf'));
    let colManager = headers.find(h => normalizeHeader(h).includes('مدير') || normalizeHeader(h).includes('manager'));
    let colDept = headers.find(h => normalizeHeader(h).includes('قسم') || normalizeHeader(h).includes('منطقة') || normalizeHeader(h).includes('region'));
    let colStatus = headers.find(h => normalizeHeader(h).includes('حالة') || normalizeHeader(h).includes('status'));

    if (!colEmpName) colEmpName = headers[0];

    const records: AttendanceRecord[] = rawData.map((row, idx) => {
      const empName = (row[colEmpName!] || `موظف ${idx + 1}`).toString().trim();
      const empId = colEmpId && row[colEmpId] ? row[colEmpId].toString().trim() : `${80000000 + idx}`;
      let managerName = colManager && row[colManager] ? row[colManager].toString().trim() : '';
      let region = colDept && row[colDept] ? row[colDept].toString().trim() : '';
      const rawStatusStr = colStatus && row[colStatus] ? row[colStatus].toString().trim() : 'AM : onTime';
      const parsed = parseSafariCellStatus(rawStatusStr);

      if (!managerName && empMap[empId]) managerName = empMap[empId].manager;
      if (!region && empMap[empId]) region = empMap[empId].region;

      const days: Record<number, any> = {
        1: {
          dayNumber: 1,
          dateStr: 'اليوم 1',
          rawText: parsed.rawText,
          status: parsed.status,
          shift: parsed.shift,
          isOvertime: parsed.isOvertime
        }
      };

      return {
        id: `flat-emp-${idx}`,
        employeeId: empId,
        employeeName: empName,
        pfAttendance: empId,
        region: region || 'الوسطى (Central)',
        branchCode: 'SAF001',
        managerName: managerName || 'إدارة عامة / غير معين',
        department: region || 'الوسطى (Central)',
        date: 'اليوم 1',
        activeDayNumber: 1,
        status: parsed.status,
        shift: parsed.shift,
        rawStatus: parsed.rawText,
        lateMinutes: parsed.status === 'late' ? 30 : 0,
        isUnlinked: !managerName,
        days
      };
    });

    const managers = groupRecordsByManager(records, 1);

    return {
      success: true,
      fileName,
      date: 'اليوم 1',
      activeDayNumber: 1,
      totalDays: 1,
      availableDayNumbers: [1],
      records,
      managers,
      totalRecords: records.length,
      errors: [],
      warnings
    };
  } catch (err: any) {
    return {
      success: false,
      fileName,
      date: 'اليوم 1',
      activeDayNumber: 1,
      totalDays: 1,
      availableDayNumbers: [1],
      records: [],
      managers: [],
      totalRecords: 0,
      errors: [`فشل في قراءة ملف الإكسل: ${err?.message || 'خطأ غير معروف'}`],
      warnings
    };
  }
}

/**
 * Export attendance data back to a Safari-formatted Excel workbook
 */
export function exportSafariWorkbook(report: DailyReport): void {
  const wb = XLSX.utils.book_new();

  // 1. Raw_Attendance Sheet
  const attHeader = ['Name', 'PFNumber', 'PFAttendance', 'R', 'Code'];
  for (const dayNum of report.availableDayNumbers) {
    attHeader.push(dayNum.toString());
  }
  attHeader.push('Manager');

  const attData: any[][] = [attHeader];
  report.records.forEach(emp => {
    const row: any[] = [
      emp.employeeName,
      Number(emp.employeeId) || emp.employeeId,
      Number(emp.pfAttendance || emp.employeeId) || emp.pfAttendance || emp.employeeId,
      emp.region,
      emp.branchCode
    ];

    for (const dayNum of report.availableDayNumbers) {
      const d = emp.days[dayNum];
      row.push(d ? d.rawText : '-');
    }

    row.push(emp.managerName);
    attData.push(row);
  });

  const attSheet = XLSX.utils.aoa_to_sheet(attData);
  XLSX.utils.book_append_sheet(wb, attSheet, 'Raw_Attendance');

  // 2. Managers Summary Sheet
  const mgrHeader = ['اسم المشرف / المدير', 'المنطقة', 'إجمالي الفريق', 'في الموعد (On Time)', 'متأخر (Delay)', 'غائب (Absent)', 'إضافي (OverTime)', 'إجازات (Leave)', 'نسبة الالتزام %'];
  const mgrData: any[][] = [mgrHeader];
  report.managers.forEach(m => {
    mgrData.push([
      m.managerName,
      m.region,
      m.totalCount,
      m.presentCount,
      m.lateCount,
      m.absentCount,
      m.overtimeCount,
      m.leaveCount,
      `${m.attendanceRate}%`
    ]);
  });
  const mgrSheet = XLSX.utils.aoa_to_sheet(mgrData);
  XLSX.utils.book_append_sheet(wb, mgrSheet, 'Managers_Summary');

  // Write file
  XLSX.writeFile(wb, `تقرير_سفاري_${report.date.replace(/[\s:]+/g, '_')}.xlsx`);
}

/**
 * Return default pre-loaded Safari Report using SAFARI_DEFAULT_RECORDS
 */
export function getDefaultSafariReport(activeDayNumber: number = 1): DailyReport {
  return buildSafariDailyReport(SAFARI_DEFAULT_RECORDS, 'SAfari.xlsx', activeDayNumber);
}
