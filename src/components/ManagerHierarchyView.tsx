import React, { useState, useMemo } from 'react';
import type { AttendanceRecord, AttendanceStatus, FilterOptions, ManagerGroup } from '../types/attendance';
import { 
  ChevronDown, 
  ChevronRight, 
  Edit3,
  Building
} from 'lucide-react';

interface ManagerHierarchyViewProps {
  managers: ManagerGroup[];
  filters: FilterOptions;
  onEditEmployee: (employee: AttendanceRecord) => void;
}

export const ManagerHierarchyView: React.FC<ManagerHierarchyViewProps> = ({
  managers,
  filters,
  onEditEmployee
}) => {
  const [expandedManagers, setExpandedManagers] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    managers.forEach(m => { init[m.managerName] = true; });
    return init;
  });

  const toggleExpand = (mgr: string) => {
    setExpandedManagers(prev => ({
      ...prev,
      [mgr]: !prev[mgr]
    }));
  };

  const getStatusBadge = (status: AttendanceStatus, rawText?: string) => {
    const label = rawText || status;
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
          {label}
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
            {label}
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
            {label}
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
            {label}
          </span>
        );
      case 'leave':
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
            {label}
          </span>
        );
      case 'sick':
        return (
          <span style={{
            padding: '3px 8px',
            borderRadius: '6px',
            background: 'rgba(20, 184, 166, 0.15)',
            color: '#2dd4bf',
            border: '1px solid rgba(20, 184, 166, 0.3)',
            fontSize: '0.75rem',
            fontWeight: 700
          }}>
            {label}
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
            {label}
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
            {label}
          </span>
        );
    }
  };

  // Filter manager groups
  const filteredManagers = useMemo(() => {
    return managers.filter(m => {
      if (filters.selectedManager !== 'all' && m.managerName !== filters.selectedManager) return false;
      if (filters.selectedRegion !== 'all' && !m.region.includes(filters.selectedRegion)) return false;
      return true;
    }).map(m => {
      const filteredEmployees = m.employees.filter(emp => {
        if (filters.searchQuery) {
          const q = filters.searchQuery.toLowerCase().trim();
          const matchesName = emp.employeeName.toLowerCase().includes(q);
          const matchesPF = emp.employeeId.toLowerCase().includes(q);
          const matchesCode = emp.branchCode.toLowerCase().includes(q);
          if (!matchesName && !matchesPF && !matchesCode) return false;
        }
        if (filters.selectedRegion !== 'all' && !emp.region.includes(filters.selectedRegion)) return false;
        if (filters.selectedBranchCode !== 'all' && emp.branchCode !== filters.selectedBranchCode) return false;
        if (filters.selectedShift !== 'all' && emp.shift !== filters.selectedShift) return false;
        if (filters.selectedStatus !== 'all') {
          if (filters.activeDay === 0) {
            const hasStatusInDays = Object.values(emp.days).some(d => d.status === filters.selectedStatus);
            if (!hasStatusInDays) return false;
          } else {
            if (emp.status !== filters.selectedStatus) return false;
          }
        }
        if (filters.showOnlyUnlinked && !emp.isUnlinked) return false;
        return true;
      });

      return {
        ...m,
        filteredEmployees
      };
    }).filter(m => m.filteredEmployees.length > 0 || (filters.searchQuery === '' && filters.selectedStatus === 'all'));
  }, [managers, filters]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '30px' }}>
      {filteredManagers.length === 0 ? (
        <div className="glass-card" style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-dim)' }}>
          لا يوجد مشرفون أو موظفون مطابقون لشروط الفلترة المحددة.
        </div>
      ) : (
        filteredManagers.map(mgr => {
          const isExpanded = !!expandedManagers[mgr.managerName];
          const hasFiltered = mgr.filteredEmployees.length !== mgr.totalCount;

          return (
            <div
              key={mgr.managerName}
              className="glass-card"
              style={{
                overflow: 'hidden',
                border: '1px solid var(--border-subtle)',
                transition: 'border-color 0.2s ease'
              }}
            >
              {/* Manager Card Header / Summary Row */}
              <div
                onClick={() => toggleExpand(mgr.managerName)}
                style={{
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                  cursor: 'pointer',
                  background: isExpanded ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
                  borderBottom: isExpanded ? '1px solid var(--border-subtle)' : 'none'
                }}
              >
                {/* Left side: Icon + Manager Name + Region + Branches */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: 'rgba(59, 130, 246, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--primary)'
                  }}>
                    {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-main)', fontWeight: 700 }}>
                        {mgr.managerName}
                      </h3>
                      <span style={{
                        padding: '2px 8px',
                        background: 'rgba(255, 255, 255, 0.06)',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)'
                      }}>
                        {mgr.region}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Building size={12} />
                        فروع: {mgr.branchCodes.slice(0, 5).join('، ')}{mgr.branchCodes.length > 5 ? '...' : ''} ({mgr.branchCodes.length} كود)
                      </span>
                      <span>•</span>
                      <span>إجمالي الفريق: <strong>{mgr.totalCount}</strong> موظف</span>
                      {hasFiltered && (
                        <span style={{ color: 'var(--primary)' }}>
                          (المعروض: {mgr.filteredEmployees.length})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right side: Manager KPIs (Matching Dashboard Sheet formulas) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  {/* On Time */}
                  <div style={{
                    background: 'rgba(16, 185, 129, 0.1)',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    textAlign: 'center',
                    border: '1px solid rgba(16, 185, 129, 0.2)'
                  }}>
                    <div style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 600 }}>On Time</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#10b981' }}>{mgr.presentCount}</div>
                  </div>

                  {/* Delay */}
                  <div style={{
                    background: 'rgba(245, 158, 11, 0.1)',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    textAlign: 'center',
                    border: '1px solid rgba(245, 158, 11, 0.2)'
                  }}>
                    <div style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: 600 }}>Delay</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f59e0b' }}>{mgr.lateCount}</div>
                  </div>

                  {/* Absent */}
                  <div style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    textAlign: 'center',
                    border: '1px solid rgba(239, 68, 68, 0.2)'
                  }}>
                    <div style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 600 }}>Absent</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ef4444' }}>{mgr.absentCount}</div>
                  </div>

                  {/* OverTime */}
                  <div style={{
                    background: 'rgba(168, 85, 247, 0.1)',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    textAlign: 'center',
                    border: '1px solid rgba(168, 85, 247, 0.2)'
                  }}>
                    <div style={{ fontSize: '0.7rem', color: '#c084fc', fontWeight: 600 }}>OverTime</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#c084fc' }}>{mgr.overtimeCount}</div>
                  </div>

                  {/* Rate */}
                  <div style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    textAlign: 'center',
                    background: 'var(--bg-card-subtle)',
                    border: '1px solid var(--border-subtle)'
                  }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>الالتزام</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>
                      {mgr.attendanceRate}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Expandable Employee Sub-Table */}
              {isExpanded && (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    textAlign: 'right',
                    fontSize: '0.82rem',
                    direction: 'rtl'
                  }}>
                    <thead>
                      <tr style={{ background: 'rgba(255, 255, 255, 0.01)', borderBottom: '1px solid var(--border-subtle)' }}>
                        <th style={{ padding: '10px 14px', width: '35px', color: 'var(--text-dim)' }}>#</th>
                        <th style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>اسم الموظف</th>
                        <th style={{ padding: '10px 10px', color: 'var(--text-muted)' }}>الرقم الوظيفي (PF)</th>
                        <th style={{ padding: '10px 10px', color: 'var(--text-muted)' }}>كود الفرع</th>
                        <th style={{ padding: '10px 10px', color: 'var(--text-muted)' }}>الوردية</th>
                        <th style={{ padding: '10px 10px', color: 'var(--text-muted)' }}>حالة الرصد</th>
                        <th style={{ padding: '10px 10px', color: 'var(--text-muted)' }}>دقائق التأخير</th>
                        <th style={{ padding: '10px 14px', textAlign: 'center', color: 'var(--text-muted)' }}>إجراء</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mgr.filteredEmployees.length === 0 ? (
                        <tr>
                          <td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-dim)' }}>
                            لا يوجد موظفون مطابقون لشروط الفلترة تحت هذا المشرف.
                          </td>
                        </tr>
                      ) : (
                        mgr.filteredEmployees.map((emp, eIdx) => (
                          <tr
                            key={emp.id}
                            style={{
                              borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                              transition: 'background 0.15s ease'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                          >
                            <td style={{ padding: '10px 14px', color: 'var(--text-dim)', fontSize: '0.78rem' }}>
                              {eIdx + 1}
                            </td>
                            <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-main)' }}>
                              {emp.employeeName}
                            </td>
                            <td style={{ padding: '10px 10px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                              {emp.employeeId}
                            </td>
                            <td style={{ padding: '10px 10px' }}>
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
                            <td style={{ padding: '10px 10px' }}>
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
                            <td style={{ padding: '10px 10px' }}>
                              {getStatusBadge(emp.status, emp.rawStatus)}
                            </td>
                            <td style={{ padding: '10px 10px', color: emp.lateMinutes > 0 ? '#f59e0b' : 'var(--text-dim)' }}>
                              {emp.lateMinutes > 0 ? `${emp.lateMinutes} دقيقة` : '-'}
                            </td>
                            <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                              <button
                                onClick={() => onEditEmployee(emp)}
                                title="تعديل سجل الموظف"
                                style={{
                                  background: 'rgba(255, 255, 255, 0.06)',
                                  border: 'none',
                                  borderRadius: '6px',
                                  padding: '5px 8px',
                                  cursor: 'pointer',
                                  color: 'var(--text-muted)'
                                }}
                              >
                                <Edit3 size={13} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};
