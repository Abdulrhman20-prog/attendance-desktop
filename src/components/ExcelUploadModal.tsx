import React, { useState, useRef } from 'react';
import type { DailyReport, ParseResult } from '../types/attendance';
import { parseExcelAttendance, buildSafariDailyReport } from '../services/excelEngine';
import { resetToOriginalSafariData } from '../services/storageService';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  RotateCcw,
  Users,
  Building,
  CalendarDays
} from 'lucide-react';

interface ExcelUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReportLoaded: (report: DailyReport) => void;
}

export const ExcelUploadModal: React.FC<ExcelUploadModalProps> = ({
  isOpen,
  onClose,
  onReportLoaded
}) => {
  if (!isOpen) return null;

  const [dragActive, setDragActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (file: File) => {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      setErrorMessage('يرجى اختيار ملف إكسل بصيغة .xlsx أو .xls');
      return;
    }
    setErrorMessage(null);
    processFile(file);
  };

  const processFile = async (file: File) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const buffer = await file.arrayBuffer();
      const res = parseExcelAttendance(buffer, file.name);

      if (!res.success) {
        setErrorMessage(res.errors[0] || 'تعذر معالجة ملف الإكسل.');
        setParseResult(null);
      } else {
        setParseResult(res);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'حدث خطأ غير متوقع أثناء قراءة الملف.');
      setParseResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmImport = () => {
    if (!parseResult) return;
    const report = buildSafariDailyReport(
      parseResult.records,
      parseResult.fileName,
      parseResult.activeDayNumber || 1
    );
    onReportLoaded(report);
    onClose();
  };

  const handleResetToRealSafari = () => {
    setIsLoading(true);
    setTimeout(() => {
      const fresh = resetToOriginalSafariData(1);
      onReportLoaded(fresh);
      setIsLoading(false);
      onClose();
    }, 200);
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
          maxWidth: '640px',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(59, 130, 246, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary)'
            }}>
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-main)', fontWeight: 700 }}>
                رفع واستيراد تقرير الإكسل
              </h3>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                يدعم كلياً ملف سفاري (SAfari.xlsx) وشيتات الحضور والمصفوفات اليومية
              </span>
            </div>
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

        {/* 1-Click Action to reload real SAfari.xlsx data */}
        <div style={{
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          borderRadius: 'var(--radius-md)',
          padding: '14px 18px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div>
            <div style={{ fontWeight: 700, color: '#10b981', fontSize: '0.92rem' }}>
              البيانات الرسمية لملف سفاري (SAfari.xlsx)
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              يتضمن 310 موظف، 7 مدراء، 5 مناطق، و 14 يوم حضور فعلي
            </div>
          </div>
          <button
            onClick={handleResetToRealSafari}
            disabled={isLoading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              background: '#10b981',
              border: 'none',
              borderRadius: '6px',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
            }}
          >
            <RotateCcw size={14} />
            <span>تحميل بيانات SAfari.xlsx الأصلية</span>
          </button>
        </div>

        {/* Drag and Drop Zone */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: dragActive ? '2px dashed var(--primary)' : '2px dashed var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '36px 20px',
            textAlign: 'center',
            cursor: 'pointer',
            background: dragActive ? 'rgba(59, 130, 246, 0.08)' : 'var(--bg-card-subtle)',
            transition: 'all 0.2s ease',
            marginBottom: '16px'
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />

          <UploadCloud size={44} color="var(--primary)" style={{ margin: '0 auto 12px' }} />
          <h4 style={{ margin: '0 0 6px', color: 'var(--text-main)', fontSize: '1rem' }}>
            اسحب وأفلت ملف الإكسل هنا، أو انقر للاستعراض
          </h4>
          <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-dim)' }}>
            يدعم ملفات SAfari.xlsx متعددة الصفحات (Raw_Attendance، Dashboard، إلخ)
          </p>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 16px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-md)',
            color: '#ef4444',
            fontSize: '0.85rem',
            marginBottom: '16px'
          }}>
            <AlertCircle size={18} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Success Preview */}
        {parseResult && (
          <div style={{
            background: 'var(--bg-card-subtle)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            marginBottom: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontWeight: 700, marginBottom: '12px' }}>
              <CheckCircle2 size={18} />
              <span>تم فحص وتحليل الملف بنجاح!</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', textAlign: 'center' }}>
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px', borderRadius: '8px' }}>
                <Users size={16} color="var(--primary)" style={{ margin: '0 auto 4px' }} />
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>الموظفون</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  {parseResult.totalRecords}
                </div>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px', borderRadius: '8px' }}>
                <Building size={16} color="#818cf8" style={{ margin: '0 auto 4px' }} />
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>المشرفون</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#818cf8' }}>
                  {parseResult.managers.length}
                </div>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px', borderRadius: '8px' }}>
                <CalendarDays size={16} color="#f59e0b" style={{ margin: '0 auto 4px' }} />
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>أيام الرصد</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f59e0b' }}>
                  {parseResult.totalDays} يوم
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
          <button
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
          
          {parseResult && (
            <button
              onClick={handleConfirmImport}
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
              <CheckCircle2 size={16} />
              <span>تأكيد اعتماد واستيراد التقرير</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
