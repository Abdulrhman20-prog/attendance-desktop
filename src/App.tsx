import React, { useState, useEffect } from 'react';
import type { AttendanceRecord, DailyReport, FilterOptions } from './types/attendance';
import { 
  initializeSafariData, 
  saveCurrentReport, 
  switchReportActiveDay, 
  updateEmployeeDayStatus,
  resetToOriginalSafariData
} from './services/storageService';
import { Header } from './components/Header';
import { KPICards } from './components/KPICards';
import { FilterToolbar } from './components/FilterToolbar';
import { TimesheetMatrixView } from './components/TimesheetMatrixView';
import { ManagerHierarchyView } from './components/ManagerHierarchyView';
import { FlatTableView } from './components/FlatTableView';
import { ExcelUploadModal } from './components/ExcelUploadModal';
import { EmployeeEditModal } from './components/EmployeeEditModal';
import { AlertCircle } from 'lucide-react';

export const App: React.FC = () => {
  const [currentReport, setCurrentReport] = useState<DailyReport | null>(null);
  
  const [filters, setFilters] = useState<FilterOptions>({
    searchQuery: '',
    selectedManager: 'all',
    selectedRegion: 'all',
    selectedBranchCode: 'all',
    selectedShift: 'all',
    selectedStatus: 'all',
    activeDay: 0, // 0 = Full Period (مصفوفة الأيام)
    sortBy: 'name',
    sortOrder: 'asc'
  });

  const [viewMode, setViewMode] = useState<'matrix' | 'tree' | 'table'>('matrix');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<AttendanceRecord | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Initialize data on mount
  useEffect(() => {
    const report = initializeSafariData();
    // Default to matrix (full period = 0)
    const periodReport = switchReportActiveDay(report, 0);
    setCurrentReport(periodReport);
  }, []);

  // Sync theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleDayChange = (dayNumber: number) => {
    if (!currentReport) return;
    const updated = switchReportActiveDay(currentReport, dayNumber);
    setCurrentReport(updated);
  };

  const handleResetToRealSafari = () => {
    const fresh = resetToOriginalSafariData(filters.activeDay);
    setCurrentReport(fresh);
  };

  const handleReportImported = (newReport: DailyReport) => {
    saveCurrentReport(newReport);
    setCurrentReport(newReport);
    setFilters(prev => ({
      ...prev,
      activeDay: newReport.activeDayNumber
    }));
  };

  const handleSaveEmployeeEdit = (recordId: string, updates: Partial<AttendanceRecord>) => {
    if (!currentReport) return;
    const updated = updateEmployeeDayStatus(currentReport, recordId, updates);
    setCurrentReport(updated);
  };

  return (
    <div style={{ minHeight: '100vh', padding: '24px', maxWidth: '1680px', margin: '0 auto' }}>
      
      {/* Header */}
      <Header
        currentReport={currentReport}
        onOpenUploadModal={() => setIsUploadModalOpen(true)}
        onResetToRealSafari={handleResetToRealSafari}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Main Content */}
      {currentReport ? (
        <main>
          {/* Top KPI Metric Cards */}
          <KPICards report={currentReport} />

          {/* Search, Filter, Day Selector and View Toggle Toolbar */}
          <FilterToolbar
            filters={filters}
            onFilterChange={setFilters}
            managers={currentReport.managers}
            regions={currentReport.regions}
            branchCodes={currentReport.branchCodes}
            availableDays={currentReport.availableDayNumbers}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onDayChange={handleDayChange}
          />

          {/* Dynamic View: Timesheet Matrix | Hierarchy Tree | Flat Daily Table */}
          {viewMode === 'matrix' && (
            <TimesheetMatrixView
              records={currentReport.records}
              filters={filters}
              availableDays={currentReport.availableDayNumbers}
              onEditEmployee={setEditingEmployee}
            />
          )}

          {viewMode === 'tree' && (
            <ManagerHierarchyView
              managers={currentReport.managers}
              filters={filters}
              onEditEmployee={setEditingEmployee}
            />
          )}

          {viewMode === 'table' && (
            <FlatTableView
              records={currentReport.records}
              filters={filters}
              onEditEmployee={setEditingEmployee}
            />
          )}
        </main>
      ) : (
        /* Empty State */
        <div className="glass-card" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <AlertCircle size={48} color="var(--primary)" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '1.3rem', color: 'var(--text-main)', marginBottom: '8px' }}>
            لا يوجد تقرير حضور محدد
          </h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '20px', maxWidth: '500px', margin: '0 auto 20px' }}>
            قم برفع تقرير إكسل اليومي لبدء مراقبة حضور وغياب الموظفين.
          </p>
          <button
            onClick={handleResetToRealSafari}
            className="btn btn-primary"
            style={{ padding: '10px 24px' }}
          >
            تحميل بيانات ملف سفاري (SAfari.xlsx)
          </button>
        </div>
      )}

      {/* Modals */}
      <ExcelUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onReportLoaded={handleReportImported}
      />

      <EmployeeEditModal
        employee={editingEmployee}
        onClose={() => setEditingEmployee(null)}
        onSave={handleSaveEmployeeEdit}
        availableManagers={currentReport?.managers.map(m => m.managerName) || []}
      />

    </div>
  );
};

export default App;
