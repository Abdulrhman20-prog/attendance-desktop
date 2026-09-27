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
  if (existing && existing.records && existing.records.length > 0) {
    return existing;
  }

  const defaultReport = getDefaultSafariReport(1);
  saveCurrentReport(defaultReport);
  return defaultReport;
}

/**
 * Reset data back to original real SAfari.xlsx dataset
 */
export function resetToOriginalSafariData(dayNumber: number = 1): DailyReport {
  localStorage.removeItem(STORAGE_REPORT_KEY);
  const freshReport = getDefaultSafariReport(dayNumber);
  saveCurrentReport(freshReport);
  return freshReport;
}

/**
 * Switch the active day (0 = all period matrix, 1..14 = day number)
 */
export function switchReportActiveDay(report: DailyReport, dayNumber: number): DailyReport {
  const updatedReport = buildSafariDailyReport(report.records, report.fileName, dayNumber);
  saveCurrentReport(updatedReport);
  return updatedReport;
}

/**
 * Update a specific employee's status for a day
 */
export function updateEmployeeDayStatus(
  currentReport: DailyReport,
  employeeId: string,
  updates: Partial<AttendanceRecord>
): DailyReport {
  const records = currentReport.records.map(emp => {
    if (emp.employeeId === employeeId || emp.id === employeeId) {
      const updated = { ...emp, ...updates };
      // Also update day record if active day is 1..N
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
