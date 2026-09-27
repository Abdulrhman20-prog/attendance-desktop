import React from 'react';
import { 
  Search, 
  Filter, 
  MapPin, 
  Clock, 
  LayoutGrid, 
  CalendarDays,
  Table,
  Layers,
  Building
} from 'lucide-react';
import type { AttendanceStatus, FilterOptions, ManagerGroup, ShiftType } from '../types/attendance';

interface FilterToolbarProps {
  filters: FilterOptions;
  onFilterChange: (newFilters: FilterOptions) => void;
  managers: ManagerGroup[];
  regions: string[];
  branchCodes: string[];
  availableDays: number[];
  viewMode: 'matrix' | 'tree' | 'table';
  onViewModeChange: (mode: 'matrix' | 'tree' | 'table') => void;
  onDayChange: (dayNumber: number) => void;
}

export const FilterToolbar: React.FC<FilterToolbarProps> = ({
  filters,
  onFilterChange,
  managers,
  regions,
  branchCodes,
  availableDays,
  viewMode,
  onViewModeChange,
  onDayChange
}) => {
  const statusList: { id: AttendanceStatus | 'all'; label: string; countColor?: string }[] = [
    { id: 'all', label: 'كافة الحالات' },
    { id: 'present', label: 'في الموعد (onTime)' },
    { id: 'late', label: 'تأخير (DELAY)' },
    { id: 'absent', label: 'غياب (ABS)' },
    { id: 'overtime', label: 'إضافي (OverTime)' },
    { id: 'leave', label: 'إجازة سنوية (AL)' },
    { id: 'sick', label: 'إجازة مرضية (SICK)' },
    { id: 'off', label: 'راحة أسبوعية (OFF)' },
  ];

  return (
    <div className="glass-card" style={{ padding: '16px 20px', marginBottom: '20px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        
        {/* Row 1: Search + Day Selector + View Mode Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          
          {/* Search Box */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'var(--bg-card-subtle)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '8px 14px',
            flex: '1 1 280px',
            maxWidth: '380px'
          }}>
            <Search size={18} color="var(--text-dim)" />
            <input
              type="text"
              placeholder="ابحث بالاسم، الرقم الوظيفي (PF)، أو كود الفرع..."
              value={filters.searchQuery}
              onChange={(e) => onFilterChange({ ...filters, searchQuery: e.target.value })}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-main)',
                fontFamily: 'var(--font-arabic)',
                fontSize: '0.88rem',
                outline: 'none',
                width: '100%'
              }}
            />
          </div>

          {/* Day Selector */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--bg-card-subtle)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '6px 12px'
          }}>
            <CalendarDays size={16} color="var(--primary)" />
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>يوم الرصد:</span>
            <select
              value={filters.activeDay}
              onChange={(e) => {
                const day = parseInt(e.target.value, 10);
                onFilterChange({ ...filters, activeDay: day });
                onDayChange(day);
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--primary)',
                fontFamily: 'var(--font-arabic)',
                fontSize: '0.85rem',
                fontWeight: 700,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="0" style={{ background: '#111827', color: '#fff' }}>
                مصفوفة كامل الفترة (الأيام 1-{availableDays.length || 14})
              </option>
              {availableDays.map(dayNum => (
                <option key={dayNum} value={dayNum} style={{ background: '#111827', color: '#fff' }}>
                  اليوم {dayNum}
                </option>
              ))}
            </select>
          </div>

          {/* View Mode Toggle Buttons */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            background: 'var(--bg-card-subtle)',
            padding: '4px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)'
          }}>
            <button
              onClick={() => onViewModeChange('matrix')}
              title="مصفوفة الأيام (مثل ملف الإكسل تماماً)"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                background: viewMode === 'matrix' ? 'var(--primary)' : 'transparent',
                color: viewMode === 'matrix' ? '#ffffff' : 'var(--text-muted)',
                fontWeight: viewMode === 'matrix' ? 700 : 500,
                fontSize: '0.82rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <Table size={15} />
              <span>مصفوفة الأيام</span>
            </button>

            <button
              onClick={() => onViewModeChange('tree')}
              title="شجرة المشرفين والمناطق"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                background: viewMode === 'tree' ? 'var(--primary)' : 'transparent',
                color: viewMode === 'tree' ? '#ffffff' : 'var(--text-muted)',
                fontWeight: viewMode === 'tree' ? 700 : 500,
                fontSize: '0.82rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <Layers size={15} />
              <span>شجرة المشرفين</span>
            </button>

            <button
              onClick={() => onViewModeChange('table')}
              title="الجدول اليومي التفصيلي"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                background: viewMode === 'table' ? 'var(--primary)' : 'transparent',
                color: viewMode === 'table' ? '#ffffff' : 'var(--text-muted)',
                fontWeight: viewMode === 'table' ? 700 : 500,
                fontSize: '0.82rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <LayoutGrid size={15} />
              <span>الجدول اليومي</span>
            </button>
          </div>

        </div>

        {/* Row 2: Secondary Dropdowns: Manager + Region + Shift */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          
          {/* Manager Filter */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'var(--bg-card-subtle)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '6px 12px'
          }}>
            <Filter size={14} color="var(--text-dim)" />
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>المشرف:</span>
            <select
              value={filters.selectedManager}
              onChange={(e) => onFilterChange({ ...filters, selectedManager: e.target.value })}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-main)',
                fontFamily: 'var(--font-arabic)',
                fontSize: '0.83rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="all" style={{ background: '#111827' }}>كافة المشرفين والمدراء ({managers.length})</option>
              {managers.map(m => (
                <option key={m.managerName} value={m.managerName} style={{ background: '#111827' }}>
                  {m.managerName} ({m.totalCount} موظف)
                </option>
              ))}
            </select>
          </div>

          {/* Region Filter */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'var(--bg-card-subtle)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '6px 12px'
          }}>
            <MapPin size={14} color="var(--text-dim)" />
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>المنطقة:</span>
            <select
              value={filters.selectedRegion}
              onChange={(e) => onFilterChange({ ...filters, selectedRegion: e.target.value })}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-main)',
                fontFamily: 'var(--font-arabic)',
                fontSize: '0.83rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="all" style={{ background: '#111827' }}>كافة المناطق ({regions.length})</option>
              {regions.map(reg => (
                <option key={reg} value={reg} style={{ background: '#111827' }}>
                  {reg}
                </option>
              ))}
            </select>
          </div>

          {/* Branch Code Filter */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'var(--bg-card-subtle)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '6px 12px'
          }}>
            <Building size={14} color="var(--text-dim)" />
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>كود الفرع:</span>
            <select
              value={filters.selectedBranchCode}
              onChange={(e) => onFilterChange({ ...filters, selectedBranchCode: e.target.value })}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-main)',
                fontFamily: 'var(--font-arabic)',
                fontSize: '0.83rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="all" style={{ background: '#111827' }}>كافة الفروع ({branchCodes.length})</option>
              {branchCodes.map(code => (
                <option key={code} value={code} style={{ background: '#111827' }}>
                  {code}
                </option>
              ))}
            </select>
          </div>

          {/* Shift Filter */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'var(--bg-card-subtle)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '6px 12px'
          }}>
            <Clock size={14} color="var(--text-dim)" />
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>الوردية:</span>
            <select
              value={filters.selectedShift}
              onChange={(e) => onFilterChange({ ...filters, selectedShift: e.target.value as ShiftType | 'all' })}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-main)',
                fontFamily: 'var(--font-arabic)',
                fontSize: '0.83rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="all" style={{ background: '#111827' }}>الجميع (AM & PM)</option>
              <option value="AM" style={{ background: '#111827' }}>صباحي (AM)</option>
              <option value="PM" style={{ background: '#111827' }}>مسائي (PM)</option>
            </select>
          </div>

        </div>

        {/* Row 3: Status Quick Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', whiteSpace: 'nowrap', marginLeft: '4px' }}>
            تصفية الحالة:
          </span>
          {statusList.map(item => {
            const isSelected = filters.selectedStatus === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onFilterChange({ ...filters, selectedStatus: item.id })}
                style={{
                  padding: '5px 12px',
                  borderRadius: '20px',
                  border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                  background: isSelected ? 'rgba(59, 130, 246, 0.2)' : 'var(--bg-card-subtle)',
                  color: isSelected ? 'var(--primary)' : 'var(--text-muted)',
                  fontSize: '0.78rem',
                  fontWeight: isSelected ? 700 : 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>

      </div>
    </div>
  );
};
