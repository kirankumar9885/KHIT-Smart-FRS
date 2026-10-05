/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { TopBar, NavTab } from './components/TopBar';
import { KioskCamera } from './components/KioskCamera';
import { LiveAttendanceDesk } from './components/LiveAttendanceDesk';
import { StudentRegistry } from './components/StudentRegistry';
import { AttendanceReports } from './components/AttendanceReports';
import { KioskSettingsPanel } from './components/KioskSettingsPanel';
import { ConfirmModal } from './components/ConfirmModal';
import { INITIAL_STUDENTS, INITIAL_TODAY_ATTENDANCE } from './data/initialStudents';
import { Student, AttendanceRecord, KioskSettings, AttendanceStatus } from './types';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('kiosk');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [openEnrollOnMount, setOpenEnrollOnMount] = useState(false);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const [toastNotification, setToastNotification] = useState<string | null>(null);

  // Auto-dismiss toast
  useEffect(() => {
    if (toastNotification) {
      const timer = setTimeout(() => {
        setToastNotification(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toastNotification]);

  // Persistent Students State - Initialized clean and empty for new data
  const [students, setStudents] = useState<Student[]>(() => {
    try {
      const saved = localStorage.getItem('khit_frs_students_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });

  // Persistent Attendance Records State - Initialized clean and empty
  const [records, setRecords] = useState<AttendanceRecord[]>(() => {
    try {
      const saved = localStorage.getItem('khit_frs_records_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });

  // Persistent Kiosk Settings State
  const [kioskSettings, setKioskSettings] = useState<KioskSettings>(() => {
    try {
      const saved = localStorage.getItem('khit_frs_settings_v2');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      autoCapture: true,
      confidenceThreshold: 80,
      enableLivenessCheck: true,
      kioskLocation: 'Main Academic Block - Gate 1',
      soundFeedback: true,
      cooldownSeconds: 4,
      selectedPeriod: 'Morning General Entry (08:30 - 09:30 AM)',
    };
  });

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem('khit_frs_students_v2', JSON.stringify(students));
    } catch (e) {}
  }, [students]);

  useEffect(() => {
    try {
      localStorage.setItem('khit_frs_records_v2', JSON.stringify(records));
    } catch (e) {}
  }, [records]);

  useEffect(() => {
    try {
      localStorage.setItem('khit_frs_settings_v2', JSON.stringify(kioskSettings));
    } catch (e) {}
  }, [kioskSettings]);

  // Clean all records & students
  const handlePromptClearAllData = () => {
    setIsConfirmingClear(true);
  };

  const handleExecuteClearAllData = () => {
    setStudents([]);
    setRecords([]);
    try {
      localStorage.removeItem('khit_frs_students_v2');
      localStorage.removeItem('khit_frs_records_v2');
      localStorage.removeItem('khit_frs_students');
      localStorage.removeItem('khit_frs_records');
    } catch (e) {}
    setIsConfirmingClear(false);
    setToastNotification('All student roster and attendance records have been cleared successfully.');
  };

  // Record Attendance Handler
  const handleRecordAttendance = (
    newRecordData: Omit<AttendanceRecord, 'id'>
  ): { success: boolean; message: string; record?: AttendanceRecord } => {
    const today = new Date().toISOString().split('T')[0];

    // Check if student already checked in today
    const existing = records.find(
      r => r.rollNumber === newRecordData.rollNumber && r.date === today
    );

    if (existing) {
      return {
        success: false,
        message: `Student ${newRecordData.studentName} is already checked in for today at ${existing.checkInTime}.`,
      };
    }

    const newRecord: AttendanceRecord = {
      ...newRecordData,
      id: `rec-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    };

    setRecords(prev => [newRecord, ...prev]);

    // Update student's cumulative statistics
    setStudents(prev =>
      prev.map(s => {
        if (s.rollNumber === newRecord.rollNumber) {
          const totalDays = s.totalWorkingDays + 1;
          const daysPresent = newRecord.status === 'present' ? s.daysPresent + 1 : s.daysPresent;
          const daysLate = newRecord.status === 'late' ? s.daysLate + 1 : s.daysLate;
          const newPercentage = Number((((daysPresent + daysLate) / totalDays) * 100).toFixed(1));

          return {
            ...s,
            totalWorkingDays: totalDays,
            daysPresent,
            daysLate,
            attendancePercentage: newPercentage,
          };
        }
        return s;
      })
    );

    return {
      success: true,
      message: `Verified and marked ${newRecord.status.toUpperCase()}`,
      record: newRecord,
    };
  };

  // Manual Attendance Override Handler
  const handleManualMark = (student: Student, status: AttendanceStatus, note: string) => {
    const today = new Date().toISOString().split('T')[0];
    const nowTime = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });

    // Check if record exists
    const existingIndex = records.findIndex(
      r => r.studentId === student.id && r.date === today
    );

    if (existingIndex >= 0) {
      // Update existing record
      const updated = [...records];
      updated[existingIndex] = {
        ...updated[existingIndex],
        status,
        verificationMethod: 'manual_override',
        notes: note,
      };
      setRecords(updated);
    } else {
      // Add new record
      const newRec: AttendanceRecord = {
        id: `rec-manual-${Date.now()}`,
        studentId: student.id,
        rollNumber: student.rollNumber,
        studentName: student.fullName,
        department: student.department,
        year: student.year,
        section: student.section,
        date: today,
        checkInTime: nowTime,
        status,
        verificationMethod: 'manual_override',
        confidenceScore: 100,
        livenessVerified: true,
        kioskLocation: `${kioskSettings.kioskLocation} (Faculty Manual Override)`,
        notes: note,
      };
      setRecords(prev => [newRec, ...prev]);
    }
    setToastNotification(`Manual override: ${student.fullName} marked as ${status.toUpperCase()}`);
  };

  // Check-Out Handler
  const handleCheckOut = (recordId: string) => {
    const nowTime = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });

    setRecords(prev =>
      prev.map(r => (r.id === recordId ? { ...r, checkOutTime: nowTime } : r))
    );
    setToastNotification('Check-out timestamp recorded.');
  };

  // Student Add / Delete Handlers (Without native confirm)
  const handleAddStudent = (newStudent: Student) => {
    setStudents(prev => [newStudent, ...prev]);
    setToastNotification(`Student ${newStudent.fullName} (${newStudent.rollNumber}) enrolled successfully.`);
  };

  const handleDeleteStudent = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    setStudents(prev => prev.filter(s => s.id !== studentId));
    setRecords(prev => prev.filter(r => r.studentId !== studentId));
    if (student) {
      setToastNotification(`Student ${student.fullName} (${student.rollNumber}) deleted.`);
    }
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Today's records for Kiosk feed
  const todayStr = new Date().toISOString().split('T')[0];
  const todayRecords = records.filter(r => r.date === todayStr);

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans">
      {/* Top Bar Navigation */}
      <TopBar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        onOpenEnrollModal={() => {
          setCurrentTab('students');
          setOpenEnrollOnMount(true);
        }}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentTab === 'kiosk' && (
          <div className="space-y-6">
            <div className="no-print flex items-center justify-between pb-2 border-b border-slate-800">
              <div>
                <h1 className="text-xl md:text-2xl font-bold font-display text-slate-100">
                  Campus Biometric Check-In Kiosk
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Automated webcam facial recognition entry terminal · Real-time identity matching and anti-spoofing
                </p>
              </div>

              <div className="hidden sm:flex items-center gap-3 text-xs font-mono text-slate-400">
                <span>Location: <strong className="text-slate-200">{kioskSettings.kioskLocation}</strong></span>
                <span>·</span>
                <span>Session: <strong className="text-cyan-400">{kioskSettings.selectedPeriod.split('(')[0]}</strong></span>
              </div>
            </div>

            <KioskCamera
              students={students}
              settings={kioskSettings}
              onUpdateSettings={setKioskSettings}
              onRecordAttendance={handleRecordAttendance}
              recentRecords={todayRecords}
              onNavigateToEnroll={() => {
                setCurrentTab('students');
                setOpenEnrollOnMount(true);
              }}
            />
          </div>
        )}

        {currentTab === 'desk' && (
          <div className="space-y-6">
            <div className="no-print pb-2 border-b border-slate-800">
              <h1 className="text-xl md:text-2xl font-bold font-display text-slate-100">
                Daily Attendance Register
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time check-in log, punctual arrival status, and manual faculty overrides
              </p>
            </div>

            <LiveAttendanceDesk
              students={students}
              records={records}
              onManualMark={handleManualMark}
              onCheckOut={handleCheckOut}
              onNavigateToEnroll={() => {
                setCurrentTab('students');
                setOpenEnrollOnMount(true);
              }}
            />
          </div>
        )}

        {currentTab === 'students' && (
          <div className="space-y-6">
            <div className="no-print pb-2 border-b border-slate-800">
              <h1 className="text-xl md:text-2xl font-bold font-display text-slate-100">
                Student Biometric Registry
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Enrolled campus candidates, facial biometric references, and semester attendance metrics
              </p>
            </div>

            <StudentRegistry
              students={students}
              onAddStudent={handleAddStudent}
              onDeleteStudent={handleDeleteStudent}
              openEnrollModalTrigger={openEnrollOnMount}
              onResetModalTrigger={() => setOpenEnrollOnMount(false)}
            />
          </div>
        )}

        {currentTab === 'reports' && (
          <div className="space-y-6">
            <div className="no-print pb-2 border-b border-slate-800">
              <h1 className="text-xl md:text-2xl font-bold font-display text-slate-100">
                Institutional Reports &amp; Analytics
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Daily master sheets, mandatory 75% defaulters warning lists, CSV exports, and AI attendance audits
              </p>
            </div>

            <AttendanceReports students={students} records={records} />
          </div>
        )}

        {currentTab === 'settings' && (
          <div className="space-y-6">
            <div className="no-print pb-2 border-b border-slate-800">
              <h1 className="text-xl md:text-2xl font-bold font-display text-slate-100">
                Kiosk &amp; Biometric Settings
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Tune facial recognition thresholds, liveness challenges, and hardware feeds
              </p>
            </div>

            <KioskSettingsPanel
              settings={kioskSettings}
              onUpdateSettings={setKioskSettings}
              totalStudentsCount={students.length}
              totalRecordsCount={records.length}
              onClearAllData={handlePromptClearAllData}
            />
          </div>
        )}
      </main>

      {/* Floating System Toast Notification */}
      {toastNotification && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-slate-700 text-slate-100 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-xs animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastNotification}</span>
          <button
            onClick={() => setToastNotification(null)}
            className="text-slate-400 hover:text-slate-200 ml-2"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Confirmation Modal for Clear All Data */}
      <ConfirmModal
        isOpen={isConfirmingClear}
        title="Clear All Database Records"
        message="Are you sure you want to erase all enrolled student profiles and historical attendance logs? This action will reset your database to 0 records so you can start completely fresh."
        confirmLabel="Yes, Clear Everything"
        cancelLabel="Cancel"
        isDestructive={true}
        onConfirm={handleExecuteClearAllData}
        onCancel={() => setIsConfirmingClear(false)}
      />

      {/* Quiet Footer */}
      <footer className="no-print border-t border-slate-800/80 bg-slate-950/60 py-4 px-6 text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <span>KHIT SmartFRS Biometric System</span>
            <span className="mx-2">·</span>
            <span>Kallam Haranadhareddy Institute of Technology</span>
          </div>
          <div className="flex items-center gap-3 font-mono text-[11px] text-slate-400">
            <span>Server: Operational</span>
            <span>·</span>
            <span>Vision Core: Gemini 3.8 Multi-modal &amp; Client Canvas</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
