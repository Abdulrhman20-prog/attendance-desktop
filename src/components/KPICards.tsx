import React from 'react';
import { 
  Users, 
  UserCheck, 
  Clock, 
  UserX, 
  Zap, 
  Building2, 
  Coffee,
  Sun,
  Moon
} from 'lucide-react';
import type { DailyReport } from '../types/attendance';

interface KPICardsProps {
  report: DailyReport;
}

export const KPICards: React.FC<KPICardsProps> = ({ report }) => {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
      gap: '16px',
      marginBottom: '24px'
    }}>
      
      {/* 1. Total Employees & Managers */}
      <div className="glass-card" style={{ padding: '18px 20px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>إجمالي الفريق والكوادر</span>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'rgba(99, 102, 241, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#818cf8'
          }}>
            <Users size={20} />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)' }}>
            {report.totalEmployees}
          </span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>موظف مسجل</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
          <Building2 size={13} color="var(--primary)" />
          <span>موزعون على <strong>{report.totalManagers}</strong> من المشرفين في <strong>{report.regions.length}</strong> مناطق</span>
        </div>
      </div>

      {/* 2. On Time (في الموعد) */}
      <div className="glass-card" style={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>في الموعد (On Time)</span>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'rgba(16, 185, 129, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#10b981'
          }}>
            <UserCheck size={20} />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <span style={{ fontSize: '2rem', fontWeight: 800, color: '#10b981' }}>
            {report.presentCount}
          </span>
          <span style={{ fontSize: '0.82rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
            نسبة الالتزام {report.overallAttendanceRate}%
          </span>
        </div>
        <div style={{
          width: '100%',
          height: '5px',
          background: 'rgba(255, 255, 255, 0.08)',
          borderRadius: '4px',
          marginTop: '12px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${report.overallAttendanceRate}%`,
            height: '100%',
            background: '#10b981',
            borderRadius: '4px'
          }} />
        </div>
      </div>

      {/* 3. Delay (تأخير) */}
      <div className="glass-card" style={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>حالات التأخير (Delay)</span>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'rgba(245, 158, 11, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#f59e0b'
          }}>
            <Clock size={20} />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <span style={{ fontSize: '2rem', fontWeight: 800, color: '#f59e0b' }}>
            {report.lateCount}
          </span>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>حالة رصد</span>
        </div>
        <div style={{ marginTop: '8px', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
          يشمل الورديات الصباحية والمسائية
        </div>
      </div>

      {/* 4. Absent (غياب) */}
      <div className="glass-card" style={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>حالات الغياب (Absent)</span>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'rgba(239, 68, 68, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ef4444'
          }}>
            <UserX size={20} />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <span style={{ fontSize: '2rem', fontWeight: 800, color: '#ef4444' }}>
            {report.absentCount}
          </span>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>غياب مسجل</span>
        </div>
        <div style={{ marginTop: '8px', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
          مطابق لعمود الغياب في لوحة Dashboard
        </div>
      </div>

      {/* 5. OverTime (عمل إضافي) */}
      <div className="glass-card" style={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>العمل الإضافي (OverTime)</span>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'rgba(168, 85, 247, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#c084fc'
          }}>
            <Zap size={20} />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <span style={{ fontSize: '2rem', fontWeight: 800, color: '#c084fc' }}>
            {report.overtimeCount}
          </span>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>حالة إضافي</span>
        </div>
        <div style={{ marginTop: '8px', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
          إضافي الراحة الأسبوعية وأيام العمل
        </div>
      </div>

      {/* 6. Leaves & OFF */}
      <div className="glass-card" style={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>الإجازات وأيام الراحة</span>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'rgba(59, 130, 246, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#60a5fa'
          }}>
            <Coffee size={20} />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px' }}>
          <div>
            <span style={{ fontSize: '1.6rem', fontWeight: 800, color: '#60a5fa' }}>
              {report.leaveCount}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginRight: '4px' }}>إجازة (AL/مرضي)</span>
          </div>
          <div>
            <span style={{ fontSize: '1.6rem', fontWeight: 800, color: '#94a3b8' }}>
              {report.offCount}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginRight: '4px' }}>راحة (OFF)</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Sun size={12} color="#f59e0b" /> صباحي: <strong>{report.amCount}</strong>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Moon size={12} color="#818cf8" /> مسائي: <strong>{report.pmCount}</strong>
          </span>
        </div>
      </div>

    </div>
  );
};
