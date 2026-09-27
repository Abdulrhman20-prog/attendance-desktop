import React, { useState, useMemo } from 'react';
import type { AttendanceRecord, AttendanceStatus, FilterOptions } from '../types/attendance';
import { Edit3, ArrowUpDown } from 'lucide-react';

interface FlatTableViewProps {
  records: AttendanceRecord[];
  filters: FilterOptions;
  onEditEmployee: (employee: AttendanceRecord) => void;
}

export const FlatTableView: React.FC<FlatTableViewProps> = ({
  records,
  filters,
  onEditEmployee
}) => {
  const [sortField, setSortField] = useState<'name' | 'id' | 'manager' | 'code' | 'region' | 'status'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const filteredRecords = useMemo(() => {
    return records.filter(emp => {
      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase().trim();
        const matchesName = emp.employeeName.toLowerCase().includes(q);
        const matchesPF = emp.employeeId.toLowerCase().includes(q);
        const matchesCode = emp.branchCode.toLowerCase().includes(q);
        if (!matchesName && !matchesPF && !matchesCode) return false;
      }

      if (filters.selectedManager !== 'all' && emp.managerName !== filters.selectedManager) return false;
      if (filters.selectedRegion !== 'all' && !emp.region.includes(filters.selectedRegion)) return false;
      if (filters.selectedBranchCode !== 'all' && emp.branchCode !== filters.selectedBranchCode) return false;
      if (filters.selectedShift !== 'all' && emp.shift !== filters.selectedShift) return false;
      if (filters.selectedStatus !== 'all' && emp.status !== filters.selectedStatus) return false;

      return true;
    }).sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') cmp = a.employeeName.localeCompare(b.employeeName, 'ar');
      else if (sortField === 'id') cmp = a.employeeId.localeCompare(b.employeeId);
      else if (sortField === 'manager') cmp = a.managerName.localeCompare(b.managerName, 'ar');
      else if (sortField === 'code') cmp = a.branchCode.localeCompare(b.branchCode);
      else if (sortField === 'region') cmp = a.region.localeCompare(b.region, 'ar');
      else if (sortField === 'status') cmp = a.status.localeCompare(b.status);

      return sortOrder === 'asc' ? cmp : -cmp;
    });
  }, [records, filters, sortField, sortOrder]);

  const renderStatus = (status: AttendanceStatus, rawText?: string) => {
    const text = rawText || status;
    const isOvertime = status === 'overtime' || (rawText && rawText.toUpperCase().includes('OVERTIME'));

    if (isOvertime) {
      return (
        <span style={{
          padding: '3px 8px',
          borderRadius: '6px',
          background: 'rgba(168, 85, 247, 0.15)',
          color: '#c084fc',
          border: '1px solid rgba(168, 85, 247, 0.3)',
          fontSize: '0.75rem',
          fontWeight: 700
        }}>
          {text}
        </span>
      );
    }

    switch (status) {
      case 'present':
        return (
          <span style={{
            padding: '3px 8px',
            borderRadius: '6px',
            background: 'rgba(16, 185, 129, 0.15)',
            color: '#10b981',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            fontSize: '0.75rem',
            fontWeight: 700
          }}>
            {text}
          </span>
        );
      case 'late':
        return (
          <span style={{
            padding: '3px 8px',
            borderRadius: '6px',
            background: 'rgba(245, 158, 11, 0.15)',
            color: '#f59e0b',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            fontSize: '0.75rem',
            fontWeight: 700
          }}>
            {text}
          </span>
        );
      case 'absent':
        return (
          <span style={{
            padding: '3px 8px',
            borderRadius: '6px',
            background: 'rgba(239, 68, 68, 0.15)',
            color: '#ef4444',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            fontSize: '0.75rem',
            fontWeight: 700
          }}>
            {text}
          </span>
        );
      case 'leave':
      case 'sick':
        return (
          <span style={{
            padding: '3px 8px',
            borderRadius: '6px',
            background: 'rgba(59, 130, 246, 0.15)',
            color: '#60a5fa',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            fontSize: '0.75rem',
            fontWeight: 700
          }}>
            {text}
          </span>
        );
      case 'off':
        return (
          <span style={{
            padding: '3px 8px',
            borderRadius: '6px',
            background: 'rgba(100, 116, 139, 0.15)',
            color: '#94a3b8',
            border: '1px solid rgba(100, 116, 139, 0.3)',
            fontSize: '0.75rem',
            fontWeight: 700
          }}>
            {text}
          </span>
        );
      default:
        return (
          <span style={{
            padding: '3px 8px',
            borderRadius: '6px',
            background: 'rgba(255, 255, 255, 0.08)',
            color: 'var(--text-muted)',
            fontSize: '0.75rem'
          }}>
            {text}
          </span>
        );
    }
  };

  return (
    <div className="glass-card" style={{ padding: '0', overflow: 'hidden', marginBottom: '30px' }}>
      <div style={{
        padding: '14px 20px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(255, 255, 255, 0.02)'
      }}>
        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          إجمالي السجلات المعروضة: <strong>{filteredRecords.length}</strong> من أصل {records.length}
        </div>
      </div>

      <div style={{ overflowX: 'auto', maxHeight: '720px' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          textAlign: 'right',
          fontSize: '0.84rem',
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
              <th
                onClick={() => handleSort('name')}
                style={{ padding: '12px 14px', minWidth: '180px', color: 'var(--text-main)', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>اسم الموظف</span>
                  <ArrowUpDown size={13} color="var(--text-dim)" />
                </div>
              </th>
              <th
                onClick={() => handleSort('id')}
                style={{ padding: '12px 12px', minWidth: '100px', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>الرقم الوظيفي (PF)</span>
                  <ArrowUpDown size={13} color="var(--text-dim)" />
                </div>
              </th>
              <th
                onClick={() => handleSort('code')}
                style={{ padding: '12px 10px', minWidth: '85px', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>كود الفرع</span>
                  <ArrowUpDown size={13} color="var(--text-dim)" />
                </div>
              </th>
              <th
                onClick={() => handleSort('region')}
                style={{ padding: '12px 12px', minWidth: '120px', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>المنطقة</span>
                  <ArrowUpDown size={13} color="var(--text-dim)" />
                </div>
              </th>
              <th
                onClick={() => handleSort('manager')}
                style={{ padding: '12px 14px', minWidth: '160px', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>المشرف المباشر</span>
                  <ArrowUpDown size={13} color="var(--text-dim)" />
                </div>
              </th>
              <th style={{ padding: '12px 10px', minWidth: '85px', color: 'var(--text-muted)' }}>الوردية</th>
              <th
                onClick={() => handleSort('status')}
                style={{ padding: '12px 12px', minWidth: '130px', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>حالة الرصد</span>
                  <ArrowUpDown size={13} color="var(--text-dim)" />
                </div>
              </th>
              <th style={{ padding: '12px 14px', textAlign: 'center', minWidth: '70px', color: 'var(--text-muted)' }}>إجراء</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: '50px 20px', textAlign: 'center', color: 'var(--text-dim)' }}>
                  لا توجد نتائج مطابقة لشروط البحث.
                </td>
              </tr>
            ) : (
              filteredRecords.map((emp, idx) => (
                <tr
                  key={emp.id}
                  style={{
                    borderBottom: '1px solid var(--border-subtle)',
                    transition: 'background 0.15s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <td style={{ padding: '12px 14px', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                    {idx + 1}
                  </td>
                  <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-main)' }}>
                    {emp.employeeName}
                  </td>
                  <td style={{ padding: '12px 12px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                    {emp.employeeId}
                  </td>
                  <td style={{ padding: '12px 10px' }}>
                    <span style={{
                      padding: '2px 6px',
                      background: 'rgba(255, 255, 255, 0.06)',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      color: 'var(--primary)'
                    }}>
                      {emp.branchCode}
                    </span>
                  </td>
                  <td style={{ padding: '12px 12px', color: 'var(--text-muted)' }}>
                    {emp.region}
                  </td>
                  <td style={{ padding: '12px 14px', color: 'var(--text-main)', fontWeight: 500 }}>
                    {emp.managerName}
                  </td>
                  <td style={{ padding: '12px 10px' }}>
                    <span style={{
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      background: emp.shift === 'AM' ? 'rgba(245, 158, 11, 0.12)' : emp.shift === 'PM' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                      color: emp.shift === 'AM' ? '#f59e0b' : emp.shift === 'PM' ? '#818cf8' : 'var(--text-dim)'
                    }}>
                      {emp.shift === 'AM' ? 'صباحي AM' : emp.shift === 'PM' ? 'مسائي PM' : 'عادي'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 12px' }}>
                    {renderStatus(emp.status, emp.rawStatus)}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                    <button
                      onClick={() => onEditEmployee(emp)}
                      title="تعديل سجل الموظف"
                      style={{
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '6px 10px',
                        cursor: 'pointer',
                        color: 'var(--text-muted)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Edit3 size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
