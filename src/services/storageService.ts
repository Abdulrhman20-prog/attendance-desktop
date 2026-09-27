import type { AttendanceRecord, DailyReport } from '../types/attendance';
import { getDefaultSafariReport, buildSafariDailyReport } from './excelEngine';

const STORAGE_REPORT_KEY = 'safari_attendance_current_report';
const ACTIVE_DAY_KEY = 'safari_attendance_active_day';

export function getStoredReport(): DailyReport | null {
  try {
    const raw = localStorage.getItem(STORAGE_REPORT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveCurrentReport(report: DailyReport): void {
  try {
    localStorage.setItem(STORAGE_REPORT_KEY, JSON.stringify(report));
    localStorage.setItem(ACTIVE_DAY_KEY, String(report.activeDayNumber));
  } catch (err) {
    console.error('Failed to save report to storage:', err);
  }
}

export function getStoredActiveDay(): number {
  try {
    const val = localStorage.getItem(ACTIVE_DAY_KEY);
    return val !== null ? parseInt(val, 10) : 1;
  } catch {
    return 1;
  }
}

/**
 * Initialize storage with default real Safari dataset
 */
export function initializeSafariData(): DailyReport {
  const existing = getStoredReport();
  // Auto-upgrade if previous cached report had fewer days or fewer records
  if (
    existing && 
    existing.records && 
    existing.records.length >= 310 && 
    (existing.availableDayNumbers?.length || 0) >= 26
  ) {
    return existing;
  }

  const defaultReport = getDefaultSafariReport(0);
  saveCurrentReport(defaultReport);
  return defaultReport;
}

/**
 * Reset data back to original real SAfari.xlsx dataset
 */
export function resetToOriginalSafariData(dayNumber: number = 0): DailyReport {
  localStorage.removeItem(STORAGE_REPORT_KEY);
  const freshReport = getDefaultSafariReport(dayNumber);
  saveCurrentReport(freshReport);
  return freshReport;
}

/**
 * Switch the active day (0 = all period matrix, 1..26 = day number)
 */
export function switchReportActiveDay(report: DailyReport, dayNumber: number): DailyReport {
  const updatedReport = buildSafariDailyReport(report.records, report.fileName, dayNumber);
  saveCurrentReport(updatedReport);
  return updatedReport;
}

/**
 * Update a specific employee's status or details
 */
export function updateEmployeeDayStatus(
  currentReport: DailyReport,
  employeeId: string,
  updates: Partial<AttendanceRecord>
): DailyReport {
  const records = currentReport.records.map(emp => {
    if (emp.employeeId === employeeId || emp.id === employeeId) {
      const updated = { ...emp, ...updates };

      // Re-evaluate unlinked flag if manager or branch changed
      if (updates.managerName || updates.branchCode) {
        const mgr = updated.managerName;
        const code = updated.branchCode;
        updated.isUnlinked = !mgr || mgr.includes('غير معين') || mgr.includes('غير محدد') || mgr === '0' || !code || code === 'SAF-42' || code === 'غير محدد';
      }

      // Also update day record if active day is 1..N and status was provided
      if (currentReport.activeDayNumber > 0 && updates.status) {
        const dayNum = currentReport.activeDayNumber;
        const currentDay = updated.days[dayNum] || { dayNumber: dayNum };
        const shift = updates.shift || currentDay.shift || 'none';
        const shiftPrefix = shift !== 'none' ? `${shift} : ` : '';
        let rawText = updates.rawStatus;
        if (!rawText) {
          if (updates.status === 'present') rawText = `${shiftPrefix}onTime`;
          else if (updates.status === 'late') rawText = `${shiftPrefix}DELAY`;
          else if (updates.status === 'absent') rawText = `${shiftPrefix}ABS`;
          else if (updates.status === 'overtime') rawText = 'OFF : OverTime';
          else if (updates.status === 'leave') rawText = 'AL';
          else if (updates.status === 'sick') rawText = 'SICK';
          else if (updates.status === 'off') rawText = 'OFF';
          else rawText = updates.status;
        }

        updated.days = {
          ...updated.days,
          [dayNum]: {
            dayNumber: dayNum,
            dateStr: `اليوم ${dayNum}`,
            rawText: rawText || 'AM : onTime',
            status: updates.status,
            shift,
            isOvertime: updates.status === 'overtime'
          }
        };
      }
      return updated;
    }
    return emp;
  });

  const updatedReport = buildSafariDailyReport(
    records,
    currentReport.fileName,
    currentReport.activeDayNumber
  );
  saveCurrentReport(updatedReport);
  return updatedReport;
}

/**
 * Batch update multiple employees at once (for Data Editor view)
 */
export function batchUpdateEmployees(
  currentReport: DailyReport,
  employeeUpdates: Record<string, Partial<AttendanceRecord>>
): DailyReport {
  const records = currentReport.records.map(emp => {
    const patch = employeeUpdates[emp.employeeId] || employeeUpdates[emp.id];
    if (!patch) return emp;

    const updated = { ...emp, ...patch };
    const mgr = updated.managerName;
    const code = updated.branchCode;
    updated.isUnlinked = !mgr || mgr.includes('غير معين') || mgr.includes('غير محدد') || mgr === '0' || !code || code === 'SAF-42' || code === 'غير محدد';
    return updated;
  });

  const updatedReport = buildSafariDailyReport(
    records,
    currentReport.fileName,
    currentReport.activeDayNumber
  );
  saveCurrentReport(updatedReport);
  return updatedReport;
}

/**
 * Add a new employee to report
 */
export function addNewEmployeeToReport(
  currentReport: DailyReport,
  newEmp: {
    employeeName: string;
    employeeId: string;
    region: string;
    branchCode: string;
    managerName: string;
  }
): DailyReport {
  const dayDays: Record<number, any> = {};
  const totalDays = currentReport.totalDays || 26;
  for (let d = 1; d <= totalDays; d++) {
    dayDays[d] = {
      dayNumber: d,
      dateStr: `اليوم ${d}`,
      rawText: 'AM : onTime',
      status: 'present',
      shift: 'AM',
      isOvertime: false
    };
  }

  const mgr = newEmp.managerName;
  const code = newEmp.branchCode;
  const isUnlinked = !mgr || mgr.includes('غير معين') || mgr.includes('غير محدد') || mgr === '0' || !code || code === 'SAF-42' || code === 'غير محدد';

  const newRecord: AttendanceRecord = {
    id: `safari-emp-${newEmp.employeeId}`,
    employeeId: newEmp.employeeId,
    employeeName: newEmp.employeeName,
    pfAttendance: newEmp.employeeId,
    region: newEmp.region || 'الوسطى (Central)',
    branchCode: newEmp.branchCode || 'غير محدد',
    managerName: newEmp.managerName || 'إدارة عامة / غير معين',
    department: newEmp.region || 'الوسطى (Central)',
    date: 'اليوم 1',
    activeDayNumber: 1,
    status: 'present',
    shift: 'AM',
    rawStatus: 'AM : onTime',
    lateMinutes: 0,
    isUnlinked,
    days: dayDays
  };

  const records = [newRecord, ...currentReport.records];
  const updatedReport = buildSafariDailyReport(
    records,
    currentReport.fileName,
    currentReport.activeDayNumber
  );
  saveCurrentReport(updatedReport);
  return updatedReport;
}

/**
 * Delete an employee from report
 */
export function deleteEmployeeFromReport(
  currentReport: DailyReport,
  employeeId: string
): DailyReport {
  const records = currentReport.records.filter(
    emp => emp.employeeId !== employeeId && emp.id !== employeeId
  );
  const updatedReport = buildSafariDailyReport(
    records,
    currentReport.fileName,
    currentReport.activeDayNumber
  );
  saveCurrentReport(updatedReport);
  return updatedReport;
}
