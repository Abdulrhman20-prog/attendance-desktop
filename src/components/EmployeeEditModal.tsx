import React, { useState } from 'react';
import type { AttendanceRecord, AttendanceStatus, ShiftType } from '../types/attendance';
import { X, Save } from 'lucide-react';

interface EmployeeEditModalProps {
  employee: AttendanceRecord | null;
  onClose: () => void;
  onSave: (recordId: string, updates: Partial<AttendanceRecord>) => void;
  availableManagers: string[];
}

export const EmployeeEditModal: React.FC<EmployeeEditModalProps> = ({
  employee,
  onClose,
  onSave,
  availableManagers
}) => {
  if (!employee) return null;

  const [status, setStatus] = useState<AttendanceStatus>(employee.status);
  const [shift, setShift] = useState<ShiftType>(employee.shift || 'none');
  const [managerName, setManagerName] = useState(employee.managerName);
  const [branchCode, setBranchCode] = useState(employee.branchCode);
  const [region, setRegion] = useState(employee.region);
  const [lateMinutes, setLateMinutes] = useState(employee.lateMinutes || 0);
  const [notes, setNotes] = useState(employee.notes || '');

  const standardRegions = [
    'الوسطى (Central)',
    'الشرقية (Eastern)',
    'الغربية (Western)',
    'الشمالية (Northern)',
    'الجنوبية (Southern)',
    'إدارة عامة / غير محدد'
  ];

  const standardManagers = [
    'Zayed Al Subaie',
    'Musab Hakami',
    'Bandar Garziz',
    'Mohammed Gobran Abdali',
    'Othman Al Sagri',
    'Mohammed Al - Gahtani',
    'Abdul Rahman Mohsen Al Enzi',
    'إدارة عامة / غير معين'
  ];

  const allManagers = Array.from(new Set([...standardManagers, ...availableManagers]));

  const handleStatusChange = (newStatus: AttendanceStatus) => {
    setStatus(newStatus);
    if (newStatus === 'late' && lateMinutes === 0) {
      setLateMinutes(30);
    } else if (newStatus !== 'late') {
      setLateMinutes(0);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Construct auto rawStatus text matching Safari format
    const shiftPrefix = shift !== 'none' ? `${shift} : ` : '';
    let rawStatus = employee.rawStatus;
    if (status === 'present') rawStatus = `${shiftPrefix}onTime`;
    else if (status === 'late') rawStatus = `${shiftPrefix}DELAY`;
    else if (status === 'absent') rawStatus = `${shiftPrefix}ABS`;
    else if (status === 'overtime') rawStatus = 'OFF : OverTime';
    else if (status === 'leave') rawStatus = 'AL';
    else if (status === 'sick') rawStatus = 'SICK';
    else if (status === 'off') rawStatus = 'OFF';

    onSave(employee.id, {
      status,
      shift,
      managerName,
      branchCode,
      region,
      rawStatus,
      lateMinutes,
      notes: notes.trim() || undefined
    });

    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: '560px',
          padding: '28px',
          position: 'relative',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-main)', fontWeight: 700 }}>
              تعديل سجل حضور الموظف
            </h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {employee.employeeName} — الرقم الوظيفي: {employee.employeeId}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: 'none',
              borderRadius: '8px',
              padding: '8px',
              cursor: 'pointer',
              color: 'var(--text-muted)'
            }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Row: Shift & Status */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>
                الوردية (Shift):
              </label>
              <select
                value={shift}
                onChange={(e) => setShift(e.target.value as ShiftType)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'var(--bg-card-subtle)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-main)',
                  fontFamily: 'var(--font-arabic)',
                  fontSize: '0.88rem',
                  outline: 'none'
                }}
              >
                <option value="AM" style={{ background: '#111827' }}>صباحي (AM)</option>
                <option value="PM" style={{ background: '#111827' }}>مسائي (PM)</option>
                <option value="none" style={{ background: '#111827' }}>غير محدد</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>
                حالة الرصد (Status):
              </label>
              <select
                value={status}
                onChange={(e) => handleStatusChange(e.target.value as AttendanceStatus)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'var(--bg-card-subtle)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-main)',
                  fontFamily: 'var(--font-arabic)',
                  fontSize: '0.88rem',
                  outline: 'none'
                }}
              >
                <option value="present" style={{ background: '#111827' }}>في الموعد (onTime)</option>
                <option value="late" style={{ background: '#111827' }}>تأخير (DELAY)</option>
                <option value="absent" style={{ background: '#111827' }}>غياب (ABS)</option>
                <option value="overtime" style={{ background: '#111827' }}>عمل إضافي (OverTime)</option>
                <option value="leave" style={{ background: '#111827' }}>إجازة سنوية (AL)</option>
                <option value="sick" style={{ background: '#111827' }}>إجازة مرضية (SICK)</option>
                <option value="off" style={{ background: '#111827' }}>راحة أسبوعية (OFF)</option>
              </select>
            </div>
          </div>

          {/* Row: Manager & Region */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>
                المشرف / المدير المباشر:
              </label>
              <select
                value={managerName}
                onChange={(e) => setManagerName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'var(--bg-card-subtle)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-main)',
                  fontFamily: 'var(--font-arabic)',
                  fontSize: '0.88rem',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                {allManagers.map(mgr => (
                  <option key={mgr} value={mgr} style={{ background: '#111827' }}>
                    {mgr}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>
                المنطقة:
              </label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'var(--bg-card-subtle)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-main)',
                  fontFamily: 'var(--font-arabic)',
                  fontSize: '0.88rem',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                {standardRegions.map(reg => (
                  <option key={reg} value={reg} style={{ background: '#111827' }}>
                    {reg}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row: Branch Code */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>
              كود الفرع / الموقع:
            </label>
            <input
              type="text"
              value={branchCode}
              onChange={(e) => setBranchCode(e.target.value.toUpperCase())}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'var(--bg-card-subtle)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-main)',
                fontFamily: 'monospace',
                fontSize: '0.88rem',
                outline: 'none'
              }}
            />
          </div>

          {/* Delay Minutes (conditional) */}
          {status === 'late' && (
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', color: '#f59e0b', marginBottom: '6px', fontWeight: 600 }}>
                دقائق التأخير:
              </label>
              <input
                type="number"
                min="1"
                max="480"
                value={lateMinutes}
                onChange={(e) => setLateMinutes(parseInt(e.target.value, 10) || 0)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'var(--bg-card-subtle)',
                  border: '1px solid rgba(245, 158, 11, 0.4)',
                  borderRadius: 'var(--radius-md)',
                  color: '#f59e0b',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  outline: 'none'
                }}
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>
              ملاحظات أو بيان العذر:
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="اكتب أي بيان أو توضيح خاص بحالة الموظف..."
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'var(--bg-card-subtle)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-main)',
                fontFamily: 'var(--font-arabic)',
                fontSize: '0.85rem',
                outline: 'none',
                resize: 'none'
              }}
            />
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 18px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                background: 'transparent',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontFamily: 'var(--font-arabic)',
                fontSize: '0.88rem'
              }}
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 22px',
                fontSize: '0.88rem',
                fontWeight: 700
              }}
            >
              <Save size={16} />
              <span>حفظ التعديلات</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
