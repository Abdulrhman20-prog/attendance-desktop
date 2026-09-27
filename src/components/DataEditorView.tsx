import React, { useState, useMemo } from 'react';
import type { AttendanceRecord } from '../types/attendance';
import { 
  Search, 
  UserPlus, 
  Save, 
  AlertTriangle, 
  CheckCircle2, 
  Edit2, 
  Trash2, 
  Filter, 
  MapPin, 
  Download,
  RefreshCw,
  X
} from 'lucide-react';
import { exportSafariWorkbook } from '../services/excelEngine';
import type { DailyReport } from '../types/attendance';

interface DataEditorViewProps {
  report: DailyReport;
  records: AttendanceRecord[];
  availableManagers: string[];
  regions?: string[];
  onBatchSave: (updates: Record<string, Partial<AttendanceRecord>>) => void;
  onAddEmployee: (emp: {
    employeeName: string;
    employeeId: string;
    region: string;
    branchCode: string;
    managerName: string;
  }) => void;
  onDeleteEmployee: (employeeId: string) => void;
  onEditEmployeeDetails: (employee: AttendanceRecord) => void;
}

export const DataEditorView: React.FC<DataEditorViewProps> = ({
  report,
  records,
  availableManagers,
  regions,
  onBatchSave,
  onAddEmployee,
  onDeleteEmployee,
  onEditEmployeeDetails
}) => {
  // Local pending modifications: employeeId -> updates
  const [pendingUpdates, setPendingUpdates] = useState<Record<string, Partial<AttendanceRecord>>>({});
  const [filterMode, setFilterMode] = useState<'all' | 'unlinked'>('all');
  const [selectedMgr, setSelectedMgr] = useState<string>('all');
  const [selectedReg, setSelectedReg] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // New employee form state
  const [newEmp, setNewEmp] = useState({
    employeeName: '',
    employeeId: '',
    region: 'الوسطى (Central)',
    branchCode: 'SAF001C',
    managerName: availableManagers[0] || 'Zayed Al Subaie'
  });

  const standardManagers = useMemo(() => {
    const defaultList = [
      'Zayed Al Subaie',
      'Musab Hakami',
      'Bandar Garziz',
      'Mohammed Gobran Abdali',
      'Othman Al Sagri',
      'Mohammed Al - Gahtani',
      'Abdul Rahman Mohsen Al Enzi'
    ];
    const set = new Set([...defaultList, ...availableManagers.filter(m => !m.includes('غير معين') && !m.includes('غير محدد'))]);
    return Array.from(set);
  }, [availableManagers]);

  const standardRegions = useMemo(() => {
    const defaultList = [
      'الوسطى (Central)',
      'الشرقية (Eastern)',
      'الغربية (Western)',
      'الشمالية (Northern)',
      'الجنوبية (Southern)'
    ];
    return Array.from(new Set([...defaultList, ...(regions || []).filter(Boolean)]));
  }, [regions]);

  // Helper to get current display value considering pending changes
  const getFieldVal = <K extends keyof AttendanceRecord>(emp: AttendanceRecord, field: K): AttendanceRecord[K] => {
    const patch = pendingUpdates[emp.employeeId] || pendingUpdates[emp.id];
    if (patch && patch[field] !== undefined) {
      return patch[field] as AttendanceRecord[K];
    }
    return emp[field];
  };

  const handleFieldChange = (emp: AttendanceRecord, field: keyof AttendanceRecord, val: any) => {
    setPendingUpdates(prev => {
      const empKey = emp.employeeId;
      const currentPatch = prev[empKey] || {};
      const updatedPatch = { ...currentPatch, [field]: val };

      // Check if unlinked state should be resolved
      const newMgr = field === 'managerName' ? val : (updatedPatch.managerName || emp.managerName);
      const newCode = field === 'branchCode' ? val : (updatedPatch.branchCode || emp.branchCode);
      const isStillUnlinked = !newMgr || newMgr.includes('غير معين') || newMgr.includes('غير محدد') || !newCode || newCode === 'SAF-42' || newCode === 'غير محدد';
      updatedPatch.isUnlinked = isStillUnlinked;

      return {
        ...prev,
        [empKey]: updatedPatch
      };
    });
  };

  const hasUnsavedChanges = Object.keys(pendingUpdates).length > 0;

  const handleSaveAll = () => {
    if (!hasUnsavedChanges) return;
    onBatchSave(pendingUpdates);
    setPendingUpdates({});
    setSaveSuccessMsg('تم حفظ كافة التعديلات وربط الموظفين بنجاح وتحديث كافة التقارير!');
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  const handleResetChanges = () => {
    setPendingUpdates({});
  };

  const handleCreateEmployeeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmp.employeeName.trim() || !newEmp.employeeId.trim()) {
      alert('يرجى ملء اسم الموظف والرقم الوظيفي');
      return;
    }
    onAddEmployee(newEmp);
    setIsAddModalOpen(false);
    setNewEmp({
      employeeName: '',
      employeeId: '',
      region: 'الوسطى (Central)',
      branchCode: 'SAF001C',
      managerName: standardManagers[0] || 'Zayed Al Subaie'
    });
    setSaveSuccessMsg('تمت إضافة الموظف الجديد وربطه بنجاح!');
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  // Filter records
  const filteredList = useMemo(() => {
    return records.filter(emp => {
      const curMgr = getFieldVal(emp, 'managerName');
      const curReg = getFieldVal(emp, 'region');
      const curCode = getFieldVal(emp, 'branchCode');
      const curUnlinked = getFieldVal(emp, 'isUnlinked');

      if (filterMode === 'unlinked' && !curUnlinked) return false;
      if (selectedMgr !== 'all' && curMgr !== selectedMgr) return false;
      if (selectedReg !== 'all' && !curReg.includes(selectedReg)) return false;

      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesName = emp.employeeName.toLowerCase().includes(q);
        const matchesPF = emp.employeeId.toLowerCase().includes(q);
        const matchesCode = (curCode || '').toLowerCase().includes(q);
        if (!matchesName && !matchesPF && !matchesCode) return false;
      }

      return true;
    });
  }, [records, pendingUpdates, filterMode, selectedMgr, selectedReg, search]);

  const unlinkedCount = useMemo(() => {
    return records.filter(emp => getFieldVal(emp, 'isUnlinked')).length;
  }, [records, pendingUpdates]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Top Banner / Stats & Actions */}
      <div className="glass-card" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>قائمة إدارة وتعديل البيانات والربط الإداري</span>
              <span style={{ fontSize: '0.82rem', padding: '3px 10px', borderRadius: '20px', background: 'rgba(59, 130, 246, 0.15)', color: 'var(--primary)', fontWeight: 700 }}>
                {records.length} موظف مسجل
              </span>
            </h2>
            <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--text-muted)' }}>
              تتيح لك هذه القائمة تعديل بيانات أي موظف، ربطه بالفرع والمدير المباشر فوراً، وتحديث البيانات لجميع شاشات النظام.
            </p>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {hasUnsavedChanges && (
              <>
                <button
                  onClick={handleResetChanges}
                  className="btn"
                  style={{
                    background: 'rgba(239, 68, 68, 0.15)',
                    color: '#ef4444',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    padding: '8px 16px',
                    fontSize: '0.85rem'
                  }}
                >
                  <RefreshCw size={15} />
                  <span>إلغاء التغييرات ({Object.keys(pendingUpdates).length})</span>
                </button>

                <button
                  onClick={handleSaveAll}
                  className="btn btn-primary"
                  style={{
                    background: '#10b981',
                    borderColor: '#059669',
                    padding: '8px 20px',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)'
                  }}
                >
                  <Save size={16} />
                  <span>حفظ التعديلات ({Object.keys(pendingUpdates).length})</span>
                </button>
              </>
            )}

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="btn btn-primary"
              style={{ padding: '8px 18px', fontSize: '0.85rem' }}
            >
              <UserPlus size={16} />
              <span>إضافة موظف جديد</span>
            </button>

            <button
              onClick={() => exportSafariWorkbook(report)}
              className="btn btn-secondary"
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            >
              <Download size={15} />
              <span>تصدير إكسل محدث</span>
            </button>
          </div>

        </div>

        {/* Success toast banner */}
        {saveSuccessMsg && (
          <div style={{
            marginTop: '16px',
            padding: '12px 18px',
            borderRadius: '8px',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#10b981',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.9rem',
            fontWeight: 600
          }}>
            <CheckCircle2 size={18} />
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        {/* Unlinked Alert Warning if unlinked exist */}
        {unlinkedCount > 0 && (
          <div style={{
            marginTop: '16px',
            padding: '12px 18px',
            borderRadius: '8px',
            background: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertTriangle size={20} color="#f59e0b" />
              <div>
                <strong style={{ color: '#f59e0b', fontSize: '0.92rem' }}>
                  يوجد {unlinkedCount} موظف بحاجة إلى تعيين الفرع أو المدير المباشر:
                </strong>
                <span style={{ fontSize: '0.83rem', color: 'var(--text-muted)', marginRight: '6px' }}>
                  يمكنك ربطهم فوراً باختيار المدير والفرع من القائمة المنسدلة في الجدول أدناه ثم الضغط على حفظ.
                </span>
              </div>
            </div>

            <button
              onClick={() => setFilterMode(filterMode === 'unlinked' ? 'all' : 'unlinked')}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                background: filterMode === 'unlinked' ? '#f59e0b' : 'rgba(245, 158, 11, 0.2)',
                color: filterMode === 'unlinked' ? '#000000' : '#f59e0b',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer'
              }}
            >
              {filterMode === 'unlinked' ? 'إظهار كافة الكوادر' : `فلترة غير المربوطين فقط (${unlinkedCount})`}
            </button>
          </div>
        )}
      </div>

      {/* Filter and Search Toolbar */}
      <div className="glass-card" style={{ padding: '14px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          
          {/* Search Box */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'var(--bg-card-subtle)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '7px 14px',
            flex: '1 1 280px',
            maxWidth: '360px'
          }}>
            <Search size={16} color="var(--text-dim)" />
            <input
              type="text"
              placeholder="بحث بالاسم، الرقم الوظيفي، أو كود الفرع..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-main)',
                fontFamily: 'var(--font-arabic)',
                fontSize: '0.86rem',
                outline: 'none',
                width: '100%'
              }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: 0 }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Quick Filter Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={() => setFilterMode('all')}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                background: filterMode === 'all' ? 'var(--primary)' : 'var(--bg-card-subtle)',
                color: filterMode === 'all' ? '#fff' : 'var(--text-muted)',
                fontWeight: filterMode === 'all' ? 700 : 500,
                fontSize: '0.82rem',
                cursor: 'pointer'
              }}
            >
              الجميع ({records.length})
            </button>

            <button
              onClick={() => setFilterMode('unlinked')}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                background: filterMode === 'unlinked' ? '#ef4444' : 'var(--bg-card-subtle)',
                color: filterMode === 'unlinked' ? '#fff' : (unlinkedCount > 0 ? '#f59e0b' : 'var(--text-muted)'),
                fontWeight: filterMode === 'unlinked' ? 700 : 500,
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <span>غير المربوطين</span>
              <span style={{
                background: filterMode === 'unlinked' ? 'rgba(0,0,0,0.3)' : 'rgba(239,68,68,0.2)',
                padding: '1px 6px',
                borderRadius: '10px',
                fontSize: '0.74rem'
              }}>
                {unlinkedCount}
              </span>
            </button>
          </div>

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
              value={selectedMgr}
              onChange={(e) => setSelectedMgr(e.target.value)}
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
              <option value="all" style={{ background: '#111827' }}>كافة المشرفين</option>
              {standardManagers.map(m => (
                <option key={m} value={m} style={{ background: '#111827' }}>
                  {m}
                </option>
              ))}
              <option value="إدارة عامة / غير معين" style={{ background: '#111827' }}>إدارة عامة / غير معين</option>
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
              value={selectedReg}
              onChange={(e) => setSelectedReg(e.target.value)}
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
              <option value="all" style={{ background: '#111827' }}>كافة المناطق</option>
              {standardRegions.map(reg => (
                <option key={reg} value={reg} style={{ background: '#111827' }}>
                  {reg}
                </option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* Main Data Editor Table */}
      <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
            <thead>
              <tr style={{
                background: 'var(--bg-card-subtle)',
                borderBottom: '1px solid var(--border-subtle)',
                color: 'var(--text-muted)',
                fontSize: '0.82rem',
                fontWeight: 700
              }}>
                <th style={{ padding: '14px 16px', width: '90px' }}>حالة الربط</th>
                <th style={{ padding: '14px 16px', width: '120px' }}>الرقم الوظيفي</th>
                <th style={{ padding: '14px 16px', minWidth: '200px' }}>اسم الموظف</th>
                <th style={{ padding: '14px 16px', minWidth: '170px' }}>المنطقة</th>
                <th style={{ padding: '14px 16px', minWidth: '140px' }}>كود الفرع</th>
                <th style={{ padding: '14px 16px', minWidth: '220px' }}>المدير / المشرف المباشر</th>
                <th style={{ padding: '14px 16px', minWidth: '220px' }}>سجل الأيام (1-26)</th>
                <th style={{ padding: '14px 16px', width: '110px', textAlign: 'center' }}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.map((emp, index) => {
                const curMgr = getFieldVal(emp, 'managerName');
                const curReg = getFieldVal(emp, 'region');
                const curCode = getFieldVal(emp, 'branchCode');
                const curUnlinked = getFieldVal(emp, 'isUnlinked');
                const hasPending = !!pendingUpdates[emp.employeeId] || !!pendingUpdates[emp.id];

                // Summary of days
                const daysList = Object.values(emp.days);
                const onTimeCount = daysList.filter(d => d.status === 'present').length;
                const delayCount = daysList.filter(d => d.status === 'late').length;
                const absCount = daysList.filter(d => d.status === 'absent').length;
                const alCount = daysList.filter(d => d.status === 'leave').length;
                const sickCount = daysList.filter(d => d.status === 'sick').length;
                const otCount = daysList.filter(d => d.status === 'overtime' || d.isOvertime).length;

                return (
                  <tr
                    key={emp.id || emp.employeeId}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      background: hasPending 
                        ? 'rgba(59, 130, 246, 0.08)' 
                        : (curUnlinked ? 'rgba(245, 158, 11, 0.04)' : (index % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.015)')),
                      transition: 'background 0.15s ease'
                    }}
                  >
                    {/* Link Status */}
                    <td style={{ padding: '12px 16px' }}>
                      {curUnlinked ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          background: 'rgba(239, 68, 68, 0.15)',
                          color: '#ef4444',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          fontSize: '0.74rem',
                          fontWeight: 700
                        }}>
                          غير مربوط
                        </span>
                      ) : (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          background: 'rgba(16, 185, 129, 0.15)',
                          color: '#10b981',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                          fontSize: '0.74rem',
                          fontWeight: 700
                        }}>
                          مرتبط
                        </span>
                      )}
                    </td>

                    {/* PF Number */}
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-main)', fontSize: '0.88rem' }}>
                      {emp.employeeId}
                    </td>

                    {/* Name */}
                    <td style={{ padding: '12px 16px' }}>
                      <input
                        type="text"
                        value={getFieldVal(emp, 'employeeName')}
                        onChange={(e) => handleFieldChange(emp, 'employeeName', e.target.value)}
                        style={{
                          width: '100%',
                          background: 'transparent',
                          border: '1px solid transparent',
                          borderRadius: '4px',
                          padding: '4px 6px',
                          color: 'var(--text-main)',
                          fontFamily: 'var(--font-arabic)',
                          fontSize: '0.88rem',
                          fontWeight: 600,
                          outline: 'none'
                        }}
                        onFocus={(e) => { e.target.style.borderColor = 'var(--primary)'; e.target.style.background = 'var(--bg-card)'; }}
                        onBlur={(e) => { e.target.style.borderColor = 'transparent'; e.target.style.background = 'transparent'; }}
                      />
                    </td>

                    {/* Region */}
                    <td style={{ padding: '12px 16px' }}>
                      <select
                        value={curReg}
                        onChange={(e) => handleFieldChange(emp, 'region', e.target.value)}
                        style={{
                          width: '100%',
                          background: 'var(--bg-card-subtle)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '6px',
                          padding: '5px 8px',
                          color: 'var(--text-main)',
                          fontFamily: 'var(--font-arabic)',
                          fontSize: '0.83rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          outline: 'none'
                        }}
                      >
                        {standardRegions.map(reg => (
                          <option key={reg} value={reg} style={{ background: '#111827' }}>
                            {reg}
                          </option>
                        ))}
                        <option value="إدارة عامة / غير محدد" style={{ background: '#111827' }}>إدارة عامة / غير محدد</option>
                      </select>
                    </td>

                    {/* Branch Code */}
                    <td style={{ padding: '12px 16px' }}>
                      <input
                        type="text"
                        value={curCode}
                        onChange={(e) => handleFieldChange(emp, 'branchCode', e.target.value.toUpperCase())}
                        placeholder="كود الفرع..."
                        style={{
                          width: '100%',
                          background: 'var(--bg-card-subtle)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '6px',
                          padding: '5px 8px',
                          color: 'var(--text-main)',
                          fontFamily: 'monospace',
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          outline: 'none'
                        }}
                      />
                    </td>

                    {/* Manager Name Dropdown */}
                    <td style={{ padding: '12px 16px' }}>
                      <select
                        value={curMgr}
                        onChange={(e) => handleFieldChange(emp, 'managerName', e.target.value)}
                        style={{
                          width: '100%',
                          background: curUnlinked ? 'rgba(245, 158, 11, 0.12)' : 'var(--bg-card-subtle)',
                          border: curUnlinked ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid var(--border-subtle)',
                          borderRadius: '6px',
                          padding: '5px 8px',
                          color: curUnlinked ? '#f59e0b' : 'var(--primary)',
                          fontFamily: 'var(--font-arabic)',
                          fontSize: '0.84rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          outline: 'none'
                        }}
                      >
                        <option value="إدارة عامة / غير معين" style={{ background: '#111827', color: '#f59e0b' }}>
                          ⚠️ إدارة عامة / غير معين
                        </option>
                        {standardManagers.map(m => (
                          <option key={m} value={m} style={{ background: '#111827', color: '#fff' }}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Quick Stats Summary */}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                        {onTimeCount > 0 && (
                          <span title="حضور بالموعد" style={{ padding: '2px 5px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontSize: '0.7rem', fontWeight: 700 }}>
                            {onTimeCount} في الموعد
                          </span>
                        )}
                        {delayCount > 0 && (
                          <span title="تأخير" style={{ padding: '2px 5px', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', fontSize: '0.7rem', fontWeight: 700 }}>
                            {delayCount} تأخير
                          </span>
                        )}
                        {absCount > 0 && (
                          <span title="غياب" style={{ padding: '2px 5px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', fontSize: '0.7rem', fontWeight: 700 }}>
                            {absCount} غياب
                          </span>
                        )}
                        {alCount > 0 && (
                          <span title="إجازة سنوية" style={{ padding: '2px 5px', borderRadius: '4px', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', fontSize: '0.7rem', fontWeight: 700 }}>
                            {alCount} سنوية
                          </span>
                        )}
                        {sickCount > 0 && (
                          <span title="إجازة مرضية" style={{ padding: '2px 5px', borderRadius: '4px', background: 'rgba(20, 184, 166, 0.15)', color: '#2dd4bf', fontSize: '0.7rem', fontWeight: 700 }}>
                            {sickCount} مرضي
                          </span>
                        )}
                        {otCount > 0 && (
                          <span title="إضافي" style={{ padding: '2px 5px', borderRadius: '4px', background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', fontSize: '0.7rem', fontWeight: 700 }}>
                            {otCount} إضافي
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <button
                          onClick={() => onEditEmployeeDetails(emp)}
                          title="تعديل تفصيلي لسجل الحضور"
                          style={{
                            background: 'rgba(59, 130, 246, 0.12)',
                            color: 'var(--primary)',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <Edit2 size={14} />
                        </button>

                        <button
                          onClick={() => {
                            if (confirm(`هل أنت متأكد من حذف الموظف ${emp.employeeName} (${emp.employeeId})؟`)) {
                              onDeleteEmployee(emp.employeeId);
                            }
                          }}
                          title="حذف الموظف"
                          style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            color: '#ef4444',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredList.length === 0 && (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              لا توجد نتائج مطابقة لشروط البحث والفلترة.
            </div>
          )}
        </div>
      </div>

      {/* Add Employee Modal */}
      {isAddModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '520px', padding: '24px', background: 'var(--bg-card)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserPlus size={20} color="var(--primary)" />
                <span>إضافة موظف جديد وتعيينه</span>
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateEmployeeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.83rem', color: 'var(--text-muted)', marginBottom: '5px' }}>اسم الموظف الثلاثي:</label>
                <input
                  type="text"
                  required
                  value={newEmp.employeeName}
                  onChange={(e) => setNewEmp({ ...newEmp, employeeName: e.target.value })}
                  placeholder="مثال: أحمد عبد الله الغامدي"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    background: 'var(--bg-card-subtle)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-main)',
                    fontFamily: 'var(--font-arabic)',
                    fontSize: '0.88rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.83rem', color: 'var(--text-muted)', marginBottom: '5px' }}>الرقم الوظيفي (PF):</label>
                  <input
                    type="text"
                    required
                    value={newEmp.employeeId}
                    onChange={(e) => setNewEmp({ ...newEmp, employeeId: e.target.value })}
                    placeholder="مثال: 80130999"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      background: 'var(--bg-card-subtle)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-main)',
                      fontFamily: 'monospace',
                      fontSize: '0.88rem',
                      outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.83rem', color: 'var(--text-muted)', marginBottom: '5px' }}>كود الفرع / الموقع:</label>
                  <input
                    type="text"
                    required
                    value={newEmp.branchCode}
                    onChange={(e) => setNewEmp({ ...newEmp, branchCode: e.target.value.toUpperCase() })}
                    placeholder="مثال: SAF005C"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      background: 'var(--bg-card-subtle)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-main)',
                      fontFamily: 'monospace',
                      fontSize: '0.88rem',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.83rem', color: 'var(--text-muted)', marginBottom: '5px' }}>المنطقة:</label>
                  <select
                    value={newEmp.region}
                    onChange={(e) => setNewEmp({ ...newEmp, region: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      background: 'var(--bg-card-subtle)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-main)',
                      fontFamily: 'var(--font-arabic)',
                      fontSize: '0.85rem',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {standardRegions.map(r => (
                      <option key={r} value={r} style={{ background: '#111827' }}>{r}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.83rem', color: 'var(--text-muted)', marginBottom: '5px' }}>المدير المشرف المباشر:</label>
                  <select
                    value={newEmp.managerName}
                    onChange={(e) => setNewEmp({ ...newEmp, managerName: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      background: 'var(--bg-card-subtle)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-main)',
                      fontFamily: 'var(--font-arabic)',
                      fontSize: '0.85rem',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {standardManagers.map(m => (
                      <option key={m} value={m} style={{ background: '#111827' }}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="btn btn-secondary"
                  style={{ padding: '8px 16px' }}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: '8px 20px', fontWeight: 700 }}
                >
                  إضافة وحفظ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
