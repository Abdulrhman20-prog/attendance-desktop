export type AttendanceStatus =
  | 'present'   // حاضر في الموعد (onTime)
  | 'late'      // متأخر (DELAY)
  | 'absent'    // غائب (ABS)
  | 'leave'     // إجازة سنوية (AL)
  | 'sick'      // إجازة مرضية (SICK)
  | 'off'       // راحة أسبوعية (OFF)
  | 'overtime'  // عمل إضافي (OverTime)
  | 'remote'    // عن بعد
  | 'excused';  // استئذان / عذر

export type ShiftType = 'AM' | 'PM' | 'none';

export interface DayStatus {
  dayNumber: number; // 1, 2, 3 ... 14 ... 31
  dateStr?: string;  // e.g. "اليوم 1" or "2026-09-01"
  rawText: string;   // e.g. "AM : onTime", "PM : DELAY", "OFF", "AL"
  status: AttendanceStatus;
  shift: ShiftType;
  isOvertime?: boolean;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;      // PF Number (الرقم الوظيفي)
  employeeName: string;    // اسم الموظف
  pfAttendance?: string;   // رقم البصمة
  region: string;          // المنطقة (Central, Eastern, Western, Northern, Southern)
  branchCode: string;      // كود الفرع / الموقع (SAF005C, SAF013C...)
  managerName: string;     // المدير المشرف (Zayed Al Subaie, Musab Hakami...)
  department: string;      // القسم أو الإدارة (Region / Branch)
  date: string;            // اليوم النشط الحالي (e.g. Day-1 or YYYY-MM-DD)
  activeDayNumber?: number; // رقم اليوم الحالي المحدد
  status: AttendanceStatus;// حالة اليوم النشط
  shift: ShiftType;        // وردية اليوم النشط (AM/PM)
  rawStatus?: string;      // النص الأصلي في الإكسل (e.g. "PM : onTime")
  checkIn?: string;        // HH:mm
  checkOut?: string;       // HH:mm
  lateMinutes: number;     // دقائق التأخير
  notes?: string;          // ملاحظات
  days: Record<number, DayStatus>; // مصفوفة جميع الأيام (1..14..31)
}

export interface ManagerGroup {
  managerName: string;
  region: string;
  department: string;
  totalCount: number;
  branchCodes: string[];
  // Stats for the active day / period
  presentCount: number;  // On Time
  lateCount: number;     // Delay
  absentCount: number;   // Absent
  overtimeCount: number; // OverTime
  leaveCount: number;    // Leave (AL + Sick)
  offCount: number;      // OFF
  attendanceRate: number;// 0 - 100%
  totalDelayMinutes: number;
  amCount: number;
  pmCount: number;
  employees: AttendanceRecord[];
}

export interface DailyReport {
  id: string;
  date: string;               // e.g. "اليوم 1" or "2026-09-15"
  activeDayNumber: number;    // 0 = all days/period, 1..14 = specific day
  totalDays: number;          // total days found in matrix (e.g. 14)
  availableDayNumbers: number[]; // [1, 2, 3, ... 14]
  fileName: string;
  uploadTimestamp: number;
  totalEmployees: number;
  totalManagers: number;
  regions: string[];
  branchCodes: string[];
  // Aggregate stats
  presentCount: number;       // On Time
  lateCount: number;          // Delay
  absentCount: number;        // Absent
  overtimeCount: number;      // OverTime
  leaveCount: number;         // Leave (AL + Sick)
  offCount: number;           // OFF
  amCount: number;
  pmCount: number;
  overallAttendanceRate: number; // 0 - 100%
  totalDelayMinutes: number;
  records: AttendanceRecord[];
  managers: ManagerGroup[];
}

export interface ParseResult {
  success: boolean;
  fileName: string;
  date: string;
  activeDayNumber: number;
  totalDays: number;
  availableDayNumbers: number[];
  records: AttendanceRecord[];
  managers: ManagerGroup[];
  totalRecords: number;
  errors: string[];
  warnings: string[];
}

export interface FilterOptions {
  searchQuery: string;
  selectedManager: string;    // 'all' or specific manager
  selectedRegion: string;     // 'all' or specific region (Central, Eastern, Western, Northern, Southern)
  selectedBranchCode: string; // 'all' or specific branch code
  selectedShift: ShiftType | 'all'; // 'all', 'AM', 'PM'
  selectedStatus: AttendanceStatus | 'all';
  activeDay: number;          // 0 = Full Period (مصفوفة الأيام), 1..14 = specific day
  sortBy: 'name' | 'id' | 'code' | 'region' | 'status';
  sortOrder: 'asc' | 'desc';
}
