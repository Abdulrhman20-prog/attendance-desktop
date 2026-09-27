import React, { useState, useMemo } from 'react';
import type { AttendanceRecord, FilterOptions } from '../types/attendance';
import { Calendar, Edit3 } from 'lucide-react';

interface TimesheetMatrixViewProps {
  records: AttendanceRecord[];
  filters: FilterOptions;
  availableDays: number[];
  onEditEmployee: (employee: AttendanceRecord) => void;
}

export const TimesheetMatrixView: React.FC<TimesheetMatrixViewProps> = ({
  records,
  filters,
  availableDays,
  onEditEmployee
}) => {
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);

  // Apply filters
  const filteredRecords = useMemo(() => {
    return records.filter(emp => {
      // Search
      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase().trim();
        const matchesName = emp.employeeName.toLowerCase().includes(q);
        const matchesPF = emp.employeeId.toLowerCase().includes(q);
        const matchesCode = emp.branchCode.toLowerCase().includes(q);
        if (!matchesName && !matchesPF && !matchesCode) return false;
      }

      // Manager filter
      if (filters.selectedManager !== 'all') {
        if (emp.managerName !== filters.selectedManager) return false;
      }

      // Region filter
      if (filters.selectedRegion !== 'all') {
        if (!emp.region.includes(filters.selectedRegion)) return false;
      }

      // Branch Code filter
      if (filters.selectedBranchCode !== 'all') {
        if (emp.branchCode !== filters.selectedBranchCode) return false;
      }

      // Shift filter
      if (filters.selectedShift !== 'all') {
        if (emp.shift !== filters.selectedShift) return false;
      }

      // Status filter
      if (filters.selectedStatus !== 'all') {
        if (filters.activeDay === 0) {
          // In full period matrix view: match if employee has this status on ANY day!
          const hasStatusInDays = Object.values(emp.days).some(d => d.status === filters.selectedStatus);
          if (!hasStatusInDays) return false;
        } else {
          if (emp.status !== filters.selectedStatus) return false;
        }
      }

      // Unlinked filter
      if (filters.showOnlyUnlinked && !emp.isUnlinked) return false;

      return true;
    });
  }, [records, filters]);

  // Helper to render day cell badge
  const renderDayBadge = (rawText: string) => {
    const text = (rawText || '').trim();
    if (!text || text === '-' || text === '0') {
      return <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>-</span>;
    }

    const upper = text.toUpperCase();

    let bg = 'rgba(255, 255, 255, 0.05)';
    let color = 'var(--text-muted)';
    let border = '1px solid rgba(255, 255, 255, 0.1)';

    if (upper.includes('ONTIME') || upper.includes('ON TIME')) {
      bg = 'rgba(16, 185, 129, 0.15)';
      color = '#10b981';
      border = '1px solid rgba(16, 185, 129, 0.3)';
    } else if (upper.includes('DELAY') || upper.includes('LATE')) {
      bg = 'rgba(245, 158, 11, 0.15)';
      color = '#f59e0b';
      border = '1px solid rgba(245, 158, 11, 0.3)';
    } else if (upper.includes('ABS')) {
      bg = 'rgba(239, 68, 68, 0.15)';
      color = '#ef4444';
      border = '1px solid rgba(239, 68, 68, 0.3)';
    } else if (upper.includes('OVERTIME')) {
      bg = 'rgba(168, 85, 247, 0.18)';
      color = '#c084fc';
      border = '1px solid rgba(168, 85, 247, 0.35)';
    } else if (upper.includes('AL') || upper.includes('LEAVE')) {
      bg = 'rgba(59, 130, 246, 0.15)';
      color = '#60a5fa';
      border = '1px solid rgba(59, 130, 246, 0.3)';
    } else if (upper.includes('SICK')) {
      bg = 'rgba(20, 184, 166, 0.15)';
      color = '#2dd4bf';
      border = '1px solid rgba(20, 184, 166, 0.3)';
    } else if (upper === 'OFF') {
      bg = 'rgba(100, 116, 139, 0.12)';
      color = '#94a3b8';
      border = '1px solid rgba(100, 116, 139, 0.2)';
    }

    return (
      <span
        title={text}
        style={{
          display: 'inline-block',
          padding: '3px 6px',
          borderRadius: '6px',
          fontSize: '0.72rem',
          fontWeight: 700,
          background: bg,
          color,
          border,
          whiteSpace: 'nowrap',
          letterSpacing: '-0.2px'
        }}
      >
        {text}
      </span>
    );
  };

  return (
    <div className="glass-card" style={{ padding: '0', overflow: 'hidden', marginBottom: '30px' }}>
      
      {/* Top Bar info */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        background: 'rgba(255, 255, 255, 0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'rgba(59, 130, 246, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#60a5fa'
          }}>
            <Calendar size={18} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-main)', fontWeight: 700 }}>
              مصفوفة الأيام التشغيلية (مطابقة لملف SAfari.xlsx)
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
              عرض شامل لحالات الحضور والورديات للأيام ({availableDays.join('، ')}) لجميع الموظفين
            </span>
          </div>
        </div>

        {/* Badges legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '0.75rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10b981' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
            حاضر (onTime)
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#f59e0b' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} />
            تأخير (DELAY)
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#ef4444' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
            غياب (ABS)
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#c084fc' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#c084fc' }} />
            إضافي (OverTime)
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#60a5fa' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#60a5fa' }} />
            إجازة (AL/SICK)
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#94a3b8' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#94a3b8' }} />
            راحة (OFF)
          </span>
          <span style={{
            background: 'var(--bg-card-subtle)',
            padding: '2px 8px',
            borderRadius: '12px',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-muted)'
          }}>
            المطابق للفلتر: <strong>{filteredRecords.length}</strong> من أصل {records.length}
          </span>
        </div>
      </div>

      {/* Matrix Table Container */}
      <div style={{ overflowX: 'auto', maxHeight: '720px' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          textAlign: 'right',
          fontSize: '0.82rem',
          direction: 'rtl'
        }}>
          <thead>
            <tr style={{
              background: 'var(--bg-card)',
              position: 'sticky',
              top: 0,
              zIndex: 10,
              borderBottom: '2px solid var(--border-subtle)'
            }}>
              <th style={{ padding: '12px 14px', width: '40px', color: 'var(--text-muted)' }}>#</th>
              <th style={{ padding: '12px 14px', minWidth: '180px', color: 'var(--text-main)', fontWeight: 700 }}>اسم الموظف</th>
              <th style={{ padding: '12px 10px', minWidth: '95px', color: 'var(--text-muted)' }}>الرقم الوظيفي</th>
              <th style={{ padding: '12px 10px', minWidth: '85px', color: 'var(--text-muted)' }}>كود الفرع</th>
              <th style={{ padding: '12px 12px', minWidth: '110px', color: 'var(--text-muted)' }}>المنطقة</th>
              <th style={{ padding: '12px 12px', minWidth: '140px', color: 'var(--text-muted)' }}>المشرف المباشر</th>
              
              {/* Day Headers */}
              {availableDays.map(dayNum => (
                <th
                  key={dayNum}
                  style={{
                    padding: '10px 8px',
                    textAlign: 'center',
                    minWidth: '90px',
                    color: 'var(--primary)',
                    fontWeight: 700,
                    borderLeft: '1px solid rgba(255, 255, 255, 0.05)',
                    background: 'rgba(59, 130, 246, 0.03)'
                  }}
                >
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>اليوم</div>
                  <div style={{ fontSize: '0.95rem' }}>{dayNum}</div>
                </th>
              ))}

              <th style={{ padding: '12px 10px', minWidth: '50px', textAlign: 'center', color: '#10b981', background: 'rgba(16, 185, 129, 0.04)' }}>حضور</th>
              <th style={{ padding: '12px 10px', minWidth: '50px', textAlign: 'center', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.04)' }}>تأخير</th>
              <th style={{ padding: '12px 10px', minWidth: '50px', textAlign: 'center', color: '#ef4444', background: 'rgba(239, 68, 68, 0.04)' }}>غياب</th>
              <th style={{ padding: '12px 10px', minWidth: '50px', textAlign: 'center', color: '#c084fc', background: 'rgba(168, 85, 247, 0.04)' }}>إضافي</th>
              <th style={{ padding: '12px 12px', minWidth: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>إجراء</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={7 + availableDays.length + 5} style={{ padding: '50px 20px', textAlign: 'center', color: 'var(--text-dim)' }}>
                  لا توجد نتائج مطابقة لشروط البحث والفلترة المحددة.
                </td>
              </tr>
            ) : (
              filteredRecords.map((emp, idx) => {
                const isHovered = hoveredRowId === emp.id;
                
                // Calculate quick metrics for this employee across all days
                let pCount = 0;
                let lCount = 0;
                let aCount = 0;
                let otCount = 0;

                Object.values(emp.days).forEach(d => {
                  if (d.status === 'present') pCount++;
                  else if (d.status === 'late') lCount++;
                  else if (d.status === 'absent') aCount++;
                  if (d.status === 'overtime' || d.isOvertime) otCount++;
                });

                return (
                  <tr
                    key={emp.id}
                    onMouseEnter={() => setHoveredRowId(emp.id)}
                    onMouseLeave={() => setHoveredRowId(null)}
                    style={{
                      background: isHovered ? 'rgba(255, 255, 255, 0.04)' : 'transparent',
                      borderBottom: '1px solid var(--border-subtle)',
                      transition: 'background 0.15s ease'
                    }}
                  >
                    {/* Index */}
                    <td style={{ padding: '10px 14px', color: 'var(--text-dim)', fontSize: '0.78rem' }}>
                      {idx + 1}
                    </td>

                    {/* Employee Name */}
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '6px',
                          background: 'rgba(99, 102, 241, 0.15)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#818cf8',
                          fontSize: '0.75rem',
                          fontWeight: 700
                        }}>
                          {emp.employeeName.charAt(0)}
                        </div>
                        <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                          {emp.employeeName}
                        </span>
                      </div>
                    </td>

                    {/* PF Number */}
                    <td style={{ padding: '10px 10px', color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                      {emp.employeeId}
                    </td>

                    {/* Branch Code */}
                    <td style={{ padding: '10px 10px' }}>
                      <span style={{
                        padding: '2px 6px',
                        background: 'rgba(255, 255, 255, 0.06)',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: 'var(--primary)'
                      }}>
                        {emp.branchCode}
                      </span>
                    </td>

                    {/* Region */}
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {emp.region}
                    </td>

                    {/* Manager Name */}
                    <td style={{ padding: '10px 12px', color: 'var(--text-main)', fontSize: '0.82rem', fontWeight: 500 }}>
                      {emp.managerName}
                    </td>

                    {/* Day Cells */}
                    {availableDays.map(dayNum => {
                      const dayData = emp.days[dayNum];
                      return (
                        <td
                          key={dayNum}
                          style={{
                            padding: '6px 4px',
                            textAlign: 'center',
                            borderLeft: '1px solid rgba(255, 255, 255, 0.03)'
                          }}
                        >
                          {dayData ? renderDayBadge(dayData.rawText) : '-'}
                        </td>
                      );
                    })}

                    {/* Quick Totals */}
                    <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: '#10b981', background: 'rgba(16, 185, 129, 0.02)' }}>
                      {pCount}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: '#f59e0b', background: 'rgba(245, 158, 11, 0.02)' }}>
                      {lCount}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: '#ef4444', background: 'rgba(239, 68, 68, 0.02)' }}>
                      {aCount}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: '#c084fc', background: 'rgba(168, 85, 247, 0.02)' }}>
                      {otCount}
                    </td>

                    {/* Action */}
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      <button
                        onClick={() => onEditEmployee(emp)}
                        title="تعديل سجل الموظف"
                        style={{
                          background: 'rgba(255, 255, 255, 0.06)',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '5px 8px',
                          cursor: 'pointer',
                          color: 'var(--text-muted)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = 'var(--primary)';
                          e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = 'var(--text-muted)';
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                        }}
                      >
                        <Edit3 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
