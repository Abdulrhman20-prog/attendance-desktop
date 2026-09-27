import React from 'react';
import { 
  FileSpreadsheet, 
  Upload, 
  FileDown, 
  Sun, 
  Moon,
  RotateCcw,
  Layers
} from 'lucide-react';
import type { DailyReport } from '../types/attendance';
import { exportSafariWorkbook } from '../services/excelEngine';

interface HeaderProps {
  currentReport: DailyReport | null;
  onOpenUploadModal: () => void;
  onResetToRealSafari: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentReport,
  onOpenUploadModal,
  onResetToRealSafari,
  theme,
  onToggleTheme,
}) => {
  const handleExport = () => {
    if (currentReport) {
      exportSafariWorkbook(currentReport);
    }
  };

  return (
    <header className="glass-card" style={{ padding: '16px 24px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        
        {/* Brand & Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #10b981 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)'
          }}>
            <Layers size={26} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em', margin: 0 }}>
                نظام متابعة الحضور والانصراف (سفاري SAfari)
              </h1>
              <span style={{ 
                fontSize: '0.75rem', 
                fontWeight: 700, 
                padding: '2px 8px', 
                borderRadius: '6px', 
                background: 'rgba(16, 185, 129, 0.15)', 
                color: '#10b981',
                border: '1px solid rgba(16, 185, 129, 0.3)'
              }}>
                مطابق لملف SAfari.xlsx
              </span>
            </div>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
              متابعة الفروع والمشرفين ومصفوفات الورديات والأيام (AM / PM)
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          
          {/* Active File / Period Indicator */}
          {currentReport && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              background: 'var(--bg-card-subtle)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.82rem',
              color: 'var(--text-muted)'
            }}>
              <FileSpreadsheet size={15} color="var(--primary)" />
              <span>الملف النشط: <strong>{currentReport.fileName}</strong></span>
              <span style={{
                marginRight: '6px',
                padding: '1px 6px',
                background: 'rgba(59, 130, 246, 0.15)',
                color: 'var(--primary)',
                borderRadius: '4px',
                fontWeight: 700,
                fontSize: '0.75rem'
              }}>
                {currentReport.date}
              </span>
            </div>
          )}

          {/* Export Button */}
          {currentReport && (
            <button
              onClick={handleExport}
              title="تصدير مصفوفة الحضور إلى ملف إكسل متطابق"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-card-subtle)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-main)',
                fontSize: '0.84rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
            >
              <FileDown size={15} color="var(--primary)" />
              <span>تصدير إكسل</span>
            </button>
          )}

          {/* Upload New Excel Button */}
          <button
            onClick={onOpenUploadModal}
            className="btn btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              fontSize: '0.84rem',
              fontWeight: 700
            }}
          >
            <Upload size={15} />
            <span>رفع ملف إكسل</span>
          </button>

          {/* Quick Reload Safari Data Button */}
          <button
            onClick={onResetToRealSafari}
            title="إعادة تحميل بيانات SAfari.xlsx الأصلية"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: 'var(--radius-md)',
              color: '#10b981',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <RotateCcw size={14} />
            <span>استعادة الأصل</span>
          </button>

          {/* Theme Toggle Button */}
          <button
            onClick={onToggleTheme}
            title={theme === 'dark' ? 'التحويل إلى الوضع المضيء' : 'التحويل إلى الوضع الداكن'}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '38px',
              height: '38px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-card-subtle)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-main)',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {theme === 'dark' ? <Sun size={18} color="#f59e0b" /> : <Moon size={18} color="#6366f1" />}
          </button>

        </div>

      </div>
    </header>
  );
};
