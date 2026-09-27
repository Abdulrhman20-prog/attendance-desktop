import * as XLSX from 'xlsx';
import type { 
  AttendanceRecord, 
  AttendanceStatus, 
  DailyReport, 
  ManagerGroup, 
  ParseResult, 
  ShiftType 
} from '../types/attendance';
import { SAFARI_DEFAULT_RECORDS } from './safariInitialData';

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
  if (!str || str === '0') {
    return {
      status: 'off',
      shift: 'none',
      rawText: str || '-',
      isOvertime: false
    };
  }

  let shift: ShiftType = 'none';
  if (str.toUpperCase().includes('AM')) shift = 'AM';
  else if (str.toUpperCase().includes('PM')) shift = 'PM';

  const upper = str.toUpperCase();
  let status: AttendanceStatus = 'present';
  let isOvertime = upper.includes('OVERTIME');

  if (upper.includes('ONTIME') || upper.includes('ON TIME')) {
    status = 'present';
  } else if (upper.includes('DELAY') || upper.includes('LATE')) {
    status = 'late';
  } else if (upper.includes('ABS')) {
    status = 'absent';
  } else if (upper.includes('OVERTIME')) {
    status = 'overtime';
  } else if (upper.includes('SICK')) {
    status = 'sick';
  } else if (upper.includes('AL') || upper.includes('LEAVE')) {
    status = 'leave';
  } else if (upper === 'OFF' || upper.startsWith('OFF')) {
    status = isOvertime ? 'overtime' : 'off';
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
    
    let domStatus: AttendanceStatus = 'present';
    if (absentDays > 2) domStatus = 'absent';
    else if (lateDays > 2) domStatus = 'late';
    else if (hasOvertime) domStatus = 'overtime';

    return {
      ...record,
      activeDayNumber: 0,
      date: 'كامل الفترة (مصفوفة الأيام)',
      status: domStatus,
      rawStatus: `حضور: ${dayVals.filter(d => d.status === 'present').length} | تأخير: ${lateDays} | غياب: ${absentDays}`
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
    offCount: number;
    amCount: number;
    pmCount: number;
    totalDelayMinutes: number;
  }> = {};

  records.forEach(emp => {
    const mgr = emp.managerName || 'إدارة عامة / غير محدد';
    if (!groups[mgr]) {
      groups[mgr] = {
        region: emp.region || 'عام',
        department: emp.department || emp.region || 'عام',
        branchCodes: new Set<string>(),
        employees: [],
        presentCount: 0,
        lateCount: 0,
        absentCount: 0,
        overtimeCount: 0,
        leaveCount: 0,
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
      // Aggregate across all days in matrix (matching Excel Dashboard formulas!)
      Object.values(emp.days).forEach(d => {
        if (d.status === 'present') groups[mgr].presentCount++;
        else if (d.status === 'late') {
          groups[mgr].lateCount++;
          groups[mgr].totalDelayMinutes += 30;
        } else if (d.status === 'absent') groups[mgr].absentCount++;
        else if (d.status === 'overtime' || d.isOvertime) groups[mgr].overtimeCount++;
        else if (d.status === 'leave' || d.status === 'sick') groups[mgr].leaveCount++;
        else if (d.status === 'off') groups[mgr].offCount++;

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
      else if (dayData.status === 'leave' || dayData.status === 'sick') groups[mgr].leaveCount++;
      else if (dayData.status === 'off') groups[mgr].offCount++;

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
      offCount: g.offCount,
      attendanceRate,
      totalDelayMinutes: g.totalDelayMinutes,
      amCount: g.amCount,
      pmCount: g.pmCount,
      employees: g.employees
    };
  }).sort((a, b) => b.totalCount - a.totalCount);
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
  const totalDays = availableDayNumbers.length || 14;

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
  let offCount = 0;
  let amCount = 0;
  let pmCount = 0;
  let totalDelayMinutes = 0;

  managers.forEach(m => {
    presentCount += m.presentCount;
    lateCount += m.lateCount;
    absentCount += m.absentCount;
    overtimeCount += m.overtimeCount;
    leaveCount += m.leaveCount;
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
    regions,
    branchCodes,
    presentCount,
    lateCount,
    absentCount,
    overtimeCount,
    leaveCount,
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
 * Directly handles SAfari.xlsx multi-sheet structure and matrix day columns!
 */
export function parseExcelAttendance(fileData: ArrayBuffer | Uint8Array, fileName: string): ParseResult {
  const warnings: string[] = [];

  try {
    const workbook = XLSX.read(fileData, { type: 'array', cellDates: true });
    
    // Check if this workbook has Safari sheets
    const hasRawAttendance = workbook.SheetNames.includes('Raw_Attendance');
    const hasEmployeeMap = workbook.SheetNames.includes('Employee_Map');
    const hasBranches = workbook.SheetNames.includes('Branches');

    // 1. If SAfari workbook with Raw_Attendance
    if (hasRawAttendance) {
      // Build branch map
      const branchMap: Record<string, { region: string; manager: string }> = {};
      if (hasBranches) {
        const bRows = XLSX.utils.sheet_to_json<any[]>(workbook.Sheets['Branches'], { header: 1, defval: '' });
        for (let i = 1; i < bRows.length; i++) {
          const [bReg, bCode, bMgr] = bRows[i];
          if (bCode) {
            branchMap[String(bCode).trim()] = {
              region: bReg ? String(bReg).trim() : '',
              manager: bMgr ? String(bMgr).trim() : ''
            };
          }
        }
      }

      // Build employee map
      const empMap: Record<string, { name: string; branch: string; code: string; manager: string }> = {};
      if (hasEmployeeMap) {
        const eRows = XLSX.utils.sheet_to_json<any[]>(workbook.Sheets['Employee_Map'], { header: 1, defval: '' });
        for (let i = 1; i < eRows.length; i++) {
          const [eName, ePF, eBranch, eCode, eMgr] = eRows[i];
          if (ePF) {
            empMap[String(ePF).trim()] = {
              name: eName ? String(eName).trim() : '',
              branch: eBranch ? String(eBranch).trim() : '',
              code: eCode ? String(eCode).trim() : '',
              manager: eMgr ? String(eMgr).trim() : ''
            };
          }
        }
      }

      const attRows = XLSX.utils.sheet_to_json<any[]>(workbook.Sheets['Raw_Attendance'], { header: 1, defval: '' });
      const headerRow = attRows[0] || [];

      // Find day columns (1..31)
      const dayColumns: { colIndex: number; dayNumber: number }[] = [];
      for (let c = 5; c < headerRow.length; c++) {
        const h = headerRow[c];
        if (typeof h === 'number' || (typeof h === 'string' && /^\d+$/.test(h.toString().trim()))) {
          const dayNum = parseInt(h.toString(), 10);
          if (dayNum >= 1 && dayNum <= 31) {
            dayColumns.push({ colIndex: c, dayNumber: dayNum });
          }
        }
      }

      const records: AttendanceRecord[] = [];
      for (let r = 1; r < attRows.length; r++) {
        const row = attRows[r];
        const rawName = row[0];
        if (!rawName || !rawName.toString().trim()) continue;

        const empName = rawName.toString().trim();
        const pf = row[1] ? String(row[1]).trim() : '';
        const pfAttendance = row[2] ? String(row[2]).trim() : pf;
        let region = row[3] ? String(row[3]).trim() : '';
        let code = row[4] ? String(row[4]).trim() : '';
        let manager = row[37] ? String(row[37]).trim() : '';

        // Cross-reference if needed
        if (pf && empMap[pf]) {
          if (!region && empMap[pf].branch) region = empMap[pf].branch;
          if (!code && empMap[pf].code) code = empMap[pf].code;
          if (!manager && empMap[pf].manager) manager = empMap[pf].manager;
        }
        if (code && branchMap[code]) {
          if (!region && branchMap[code].region) region = branchMap[code].region;
          if (!manager && branchMap[code].manager) manager = branchMap[code].manager;
        }

        // Normalize region label
        if (region.toLowerCase().includes('central')) region = 'الوسطى (Central)';
        else if (region.toLowerCase().includes('east')) region = 'الشرقية (Eastern)';
        else if (region.toLowerCase().includes('west')) region = 'الغربية (Western)';
        else if (region.toLowerCase().includes('north')) region = 'الشمالية (Northern)';
        else if (region.toLowerCase().includes('south')) region = 'الجنوبية (Southern)';
        else if (!region) region = 'غير محدد';

        if (!manager) manager = 'إدارة عامة / غير محدد';

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

        const day1 = days[1] || { status: 'present', shift: 'none', rawText: 'AM : onTime' };

        records.push({
          id: `safari-emp-${pf || r}`,
          employeeId: pf || `EMP-${r.toString().padStart(4, '0')}`,
          employeeName: empName,
          pfAttendance: pfAttendance || pf,
          region,
          branchCode: code || 'عام',
          managerName: manager,
          department: region,
          date: 'اليوم 1',
          activeDayNumber: 1,
          status: day1.status,
          shift: day1.shift,
          rawStatus: day1.rawText,
          lateMinutes: day1.status === 'late' ? 30 : 0,
          days
        });
      }

      const availableDayNumbers = dayColumns.map(d => d.dayNumber).sort((a, b) => a - b);
      const managers = groupRecordsByManager(records, 1);

      return {
        success: true,
        fileName,
        date: 'اليوم 1',
        activeDayNumber: 1,
        totalDays: availableDayNumbers.length || 14,
        availableDayNumbers,
        records,
        managers,
        totalRecords: records.length,
        errors: [],
        warnings
      };
    }

    // 2. Standard single-sheet fallback
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
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
      const managerName = colManager && row[colManager] ? row[colManager].toString().trim() : 'إدارة عامة';
      const region = colDept && row[colDept] ? row[colDept].toString().trim() : 'الوسطى (Central)';
      const rawStatusStr = colStatus && row[colStatus] ? row[colStatus].toString().trim() : 'AM : onTime';
      const parsed = parseSafariCellStatus(rawStatusStr);

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
        region,
        branchCode: 'SAF001',
        managerName,
        department: region,
        date: 'اليوم 1',
        activeDayNumber: 1,
        status: parsed.status,
        shift: parsed.shift,
        rawStatus: parsed.rawText,
        lateMinutes: parsed.status === 'late' ? 30 : 0,
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
