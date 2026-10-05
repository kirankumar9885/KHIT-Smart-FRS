import React, { useState } from 'react';
import {
  FileText,
  Download,
  Printer,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  BarChart3,
  Calendar,
  Send,
  Building,
  HelpCircle,
} from 'lucide-react';
import { Student, AttendanceRecord, Department } from '../types';

interface AttendanceReportsProps {
  students: Student[];
  records: AttendanceRecord[];
}

export const AttendanceReports: React.FC<AttendanceReportsProps> = ({
  students,
  records,
}) => {
  const [reportType, setReportType] = useState<'daily' | 'defaulters' | 'departments'>('daily');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiReportData, setAiReportData] = useState<{
    executiveSummary?: string;
    keyObservations?: string[];
    defaulterInterventionPlan?: string;
    departmentPerformanceRanking?: string;
  } | null>(null);

  const [selectedNoticeStudent, setSelectedNoticeStudent] = useState<Student | null>(null);
  const [noticeDispatchedMsg, setNoticeDispatchedMsg] = useState<string | null>(null);

  // Defaulters calculation (< 75%)
  const defaulters = students.filter(s => s.attendancePercentage < 75.0);

  // Department statistics
  const departments: Department[] = ['CSE', 'AI&DS', 'ECE', 'IT', 'MECH', 'CIVIL'];
  const departmentStats = departments.map(dept => {
    const deptStudents = students.filter(s => s.department === dept);
    const count = deptStudents.length;
    const avgPercentage =
      count > 0
        ? deptStudents.reduce((acc, s) => acc + s.attendancePercentage, 0) / count
        : 0;
    const presentToday = records.filter(
      r => r.department === dept && (r.status === 'present' || r.status === 'late')
    ).length;

    return {
      department: dept,
      studentCount: count,
      avgPercentage: Number(avgPercentage.toFixed(1)),
      presentToday,
      todayRate: count > 0 ? Number(((presentToday / count) * 100).toFixed(1)) : 0,
    };
  });

  // Export to CSV Function
  const exportToCSV = () => {
    const headers = [
      'Roll Number',
      'Student Name',
      'Department',
      'Year',
      'Section',
      'Date',
      'Check-In Time',
      'Status',
      'Verification Method',
      'Confidence %',
      'Kiosk Location',
    ];

    const rows = students.map(student => {
      const rec = records.find(r => r.studentId === student.id || r.rollNumber === student.rollNumber);
      return [
        student.rollNumber,
        `"${student.fullName}"`,
        student.department,
        student.year,
        student.section,
        rec ? rec.date : selectedDate,
        rec ? rec.checkInTime : 'N/A',
        rec ? rec.status.toUpperCase() : 'ABSENT',
        rec ? rec.verificationMethod : 'N/A',
        rec ? rec.confidenceScore : 'N/A',
        rec ? `"${rec.kioskLocation}"` : 'N/A',
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `KHIT_Attendance_Report_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Generate AI Executive Attendance Report via Backend Gemini
  const handleGenerateAiReport = async () => {
    setIsGeneratingAi(true);
    try {
      const res = await fetch('/api/attendance/ai-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summaryData: {
            date: selectedDate,
            totalStudents: students.length,
            recordsLogged: records.length,
          },
          defaultersCount: defaulters.length,
          totalStudents: students.length,
          departmentStats,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setAiReportData(data);
      }
    } catch (e) {
      console.error('Failed to generate AI report:', e);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Print Report Handler
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Report Controls & Actions */}
      <div className="no-print p-4 bg-slate-900/80 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setReportType('daily')}
            className={`px-3.5 py-1.5 font-medium rounded-lg transition-colors ${
              reportType === 'daily'
                ? 'bg-slate-800 text-cyan-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Daily Register
          </button>
          <button
            onClick={() => setReportType('defaulters')}
            className={`px-3.5 py-1.5 font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
              reportType === 'defaulters'
                ? 'bg-slate-800 text-rose-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Defaulters (&lt;75%)</span>
            {defaulters.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-rose-950 text-rose-300 border border-rose-800 text-[10px] flex items-center justify-center font-mono">
                {defaulters.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setReportType('departments')}
            className={`px-3.5 py-1.5 font-medium rounded-lg transition-colors ${
              reportType === 'departments'
                ? 'bg-slate-800 text-cyan-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Branch Analytics
          </button>
        </div>

        {/* Date Selector & Primary Actions */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs text-slate-300">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="bg-transparent text-slate-200 outline-none font-mono text-xs"
            />
          </div>

          <button
            onClick={exportToCSV}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>

          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Sheet
          </button>

          <button
            onClick={handleGenerateAiReport}
            disabled={isGeneratingAi}
            className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-medium rounded-xl transition-all flex items-center gap-1.5 shadow-md disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {isGeneratingAi ? 'Analyzing...' : 'AI Insights'}
          </button>
        </div>
      </div>

      {/* AI Insights Card (if generated) */}
      {aiReportData && (
        <div className="no-print p-5 bg-gradient-to-r from-slate-900 via-cyan-950/20 to-slate-900 rounded-2xl border border-cyan-500/30 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h4 className="text-sm font-semibold text-cyan-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              Executive Academic Attendance Assessment
            </h4>
            <span className="text-[11px] text-slate-400 font-mono">Gemini 3.8 Flash Analysis</span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">{aiReportData.executiveSummary}</p>

          {aiReportData.keyObservations && aiReportData.keyObservations.length > 0 && (
            <div className="space-y-1">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                Key Observations:
              </div>
              <ul className="text-xs text-slate-300 space-y-1 pl-4 list-disc marker:text-cyan-400">
                {aiReportData.keyObservations.map((obs, idx) => (
                  <li key={idx}>{obs}</li>
                ))}
              </ul>
            </div>
          )}

          {aiReportData.defaulterInterventionPlan && (
            <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 text-xs">
              <span className="font-semibold text-amber-400 block mb-1">
                Intervention Strategy:
              </span>
              <span className="text-slate-300">{aiReportData.defaulterInterventionPlan}</span>
            </div>
          )}
        </div>
      )}

      {/* Official Institutional Report Container (Optimized for Web & Print) */}
      <div className="print-page bg-slate-900/90 rounded-2xl border border-slate-800 p-6 md:p-8 space-y-6">
        {/* Printable Letterhead Header */}
        <div className="border-b border-slate-700/80 pb-6 text-center space-y-1.5">
          <div className="text-xs font-semibold text-cyan-400 uppercase tracking-widest">
            KALLAM HARANADHAREDDY INSTITUTE OF TECHNOLOGY (AUTONOMOUS)
          </div>
          <h2 className="text-xl md:text-2xl font-black text-slate-100 font-display">
            SMART FACIAL RECOGNITION ATTENDANCE REGISTER
          </h2>
          <div className="text-xs text-slate-400">
            NH-5, Chowdavaram, Guntur, Andhra Pradesh - 522019 · Affiliated to JNTUK Kakinada
          </div>
          <div className="text-xs text-slate-400 font-mono pt-2 flex items-center justify-center gap-4">
            <span>Date: <strong>{selectedDate}</strong></span>
            <span>·</span>
            <span>Session: <strong>Morning General &amp; Laboratory</strong></span>
            <span>·</span>
            <span>FRS Kiosk: <strong>Automated Biometric Core</strong></span>
          </div>
        </div>

        {/* View 1: Daily Master Register */}
        {reportType === 'daily' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Showing complete roster verification status for {selectedDate}</span>
              <span className="font-mono">
                {records.length} / {students.length} Marked (
                {students.length > 0
                  ? ((records.length / students.length) * 100).toFixed(1)
                  : '0'}
                %)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950 border-y border-slate-700 font-semibold text-slate-400">
                    <th className="py-2.5 px-3">S.No</th>
                    <th className="py-2.5 px-3">Roll Number</th>
                    <th className="py-2.5 px-3">Student Name</th>
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3">Class</th>
                    <th className="py-2.5 px-3">Check-In</th>
                    <th className="py-2.5 px-3">Verification Mode</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {students.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500">
                        No students enrolled yet. Register your students to generate daily attendance sheets.
                      </td>
                    </tr>
                  ) : (
                    students.map((student, idx) => {
                    const record = records.find(
                      r => r.studentId === student.id || r.rollNumber === student.rollNumber
                    );
                    const status = record ? record.status : 'absent';

                    return (
                      <tr key={student.id} className="hover:bg-slate-850/40">
                        <td className="py-2.5 px-3 font-mono text-slate-500">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-mono font-medium text-slate-200">
                          {student.rollNumber}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-100">
                          {student.fullName}
                        </td>
                        <td className="py-2.5 px-3 text-cyan-400 font-semibold">
                          {student.department}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400">
                          Yr {student.year}-Sem {student.semester} ({student.section})
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-300">
                          {record ? record.checkInTime : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400">
                          {record ? (
                            <span>
                              {record.verificationMethod === 'frs_webcam'
                                ? `FRS Biometric (${record.confidenceScore}%)`
                                : 'Manual Faculty Override'}
                            </span>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-medium">
                          {status === 'present' && (
                            <span className="text-emerald-400">Present</span>
                          )}
                          {status === 'late' && (
                            <span className="text-amber-400">Late Arrival</span>
                          )}
                          {status === 'absent' && (
                            <span className="text-rose-400">Absent</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* View 2: Defaulters List (< 75%) */}
        {reportType === 'defaulters' && (
          <div className="space-y-4">
            <div className="p-4 bg-rose-950/30 border border-rose-800/40 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5 text-rose-300">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>
                  University Regulation 75% Mandatory Attendance Compliance Alert: Students listed below
                  are currently ineligible for semester-end external examinations without condonation approval.
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950 border-y border-slate-700 font-semibold text-slate-400">
                    <th className="py-2.5 px-3">Roll Number</th>
                    <th className="py-2.5 px-3">Student Name</th>
                    <th className="py-2.5 px-3">Dept & Class</th>
                    <th className="py-2.5 px-3">Total Classes</th>
                    <th className="py-2.5 px-3">Attended</th>
                    <th className="py-2.5 px-3">Absent Days</th>
                    <th className="py-2.5 px-3">Aggregate %</th>
                    <th className="py-2.5 px-3">Shortage</th>
                    <th className="py-2.5 px-3 no-print text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {defaulters.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-emerald-400 font-medium">
                        All students currently meet or exceed the mandatory 75% attendance threshold!
                      </td>
                    </tr>
                  ) : (
                    defaulters.map(student => {
                      const shortage = (75.0 - student.attendancePercentage).toFixed(1);
                      return (
                        <tr key={student.id} className="hover:bg-slate-850/40">
                          <td className="py-2.5 px-3 font-mono font-medium text-slate-200">
                            {student.rollNumber}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-100">
                            {student.fullName}
                          </td>
                          <td className="py-2.5 px-3 text-slate-400">
                            {student.department} · Sem {student.semester}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-300">
                            {student.totalWorkingDays}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-emerald-400">
                            {student.daysPresent}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-rose-400">
                            {student.daysAbsent}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-rose-400">
                            {student.attendancePercentage.toFixed(1)}%
                          </td>
                          <td className="py-2.5 px-3 font-mono text-amber-400">
                            -{shortage}%
                          </td>
                          <td className="py-2.5 px-3 no-print text-right">
                            <button
                              onClick={() => setSelectedNoticeStudent(student)}
                              className="px-2.5 py-1 bg-rose-950/60 hover:bg-rose-900 border border-rose-700/60 text-rose-200 text-[11px] rounded-lg transition-colors"
                            >
                              Notice Letter
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
        )}

        {/* View 3: Department Breakdown */}
        {reportType === 'departments' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {departmentStats.map(stat => (
                <div
                  key={stat.department}
                  className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-base font-bold text-slate-100 font-display">
                      {stat.department}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {stat.studentCount} Students
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-400">Semester Average</span>
                      <span className="text-cyan-400 font-bold">{stat.avgPercentage}%</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-cyan-500 h-full rounded-full"
                        style={{ width: `${stat.avgPercentage}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
                    <span>Present Today:</span>
                    <span className="text-emerald-400 font-medium">
                      {stat.presentToday} / {stat.studentCount} ({stat.todayRate}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Official Faculty & Institutional Sign-off Grid */}
        <div className="pt-10 border-t border-slate-800 grid grid-cols-3 gap-6 text-center text-xs text-slate-400 font-mono">
          <div className="space-y-6">
            <div className="h-10 border-b border-dashed border-slate-700"></div>
            <div>Prepared by: Faculty In-Charge</div>
          </div>
          <div className="space-y-6">
            <div className="h-10 border-b border-dashed border-slate-700"></div>
            <div>Verified: Head of Department (HOD)</div>
          </div>
          <div className="space-y-6">
            <div className="h-10 border-b border-dashed border-slate-700"></div>
            <div>Approved: Principal / Dean Academic</div>
          </div>
        </div>
      </div>

      {/* Official Defaulter Warning Letter Modal */}
      {selectedNoticeStudent && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <FileText className="w-4 h-4 text-rose-400" />
                University Defaulter Condonation Notice
              </h3>
              <button
                onClick={() => setSelectedNoticeStudent(null)}
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="p-4 bg-white text-slate-900 rounded-xl text-xs space-y-3 font-serif leading-relaxed">
              <div className="text-center font-bold text-sm tracking-wide border-b pb-2">
                KALLAM HARANADHAREDDY INSTITUTE OF TECHNOLOGY
              </div>
              <div className="flex justify-between text-[11px] font-mono text-slate-600">
                <span>Ref: KHIT/ACAD/2026/ATT-DEF</span>
                <span>Date: {selectedDate}</span>
              </div>
              <p>
                To Parent / Guardian of <strong>{selectedNoticeStudent.fullName}</strong> (Roll No:{' '}
                <strong>{selectedNoticeStudent.rollNumber}</strong>, Department of{' '}
                {selectedNoticeStudent.department}):
              </p>
              <p>
                This is to officially inform you that as of {selectedDate}, your ward has recorded an aggregate
                attendance of{' '}
                <strong className="text-rose-600">
                  {selectedNoticeStudent.attendancePercentage.toFixed(1)}%
                </strong>
                , which falls below the mandatory <strong>75.0%</strong> criteria prescribed by the University.
              </p>
              <p>
                Failure to improve attendance in the remaining classes will result in detention from appearing
                in the upcoming semester-end University Examinations. Please meet the Head of Department on or
                before Friday.
              </p>
              <div className="pt-4 flex justify-between text-[11px] font-sans font-semibold">
                <span>Academic Dean</span>
                <span>Principal</span>
              </div>
            </div>

            {noticeDispatchedMsg && (
              <div className="p-3 bg-emerald-950/70 border border-emerald-800 text-emerald-300 rounded-xl text-xs flex items-center justify-between">
                <span>{noticeDispatchedMsg}</span>
                <button onClick={() => setNoticeDispatchedMsg(null)} className="text-slate-400 hover:text-slate-200">
                  ✕
                </button>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setSelectedNoticeStudent(null);
                  setNoticeDispatchedMsg(null);
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setNoticeDispatchedMsg(`Condonation notice dispatched to ${selectedNoticeStudent.email} and parent SMS contact.`);
                  setTimeout(() => {
                    setSelectedNoticeStudent(null);
                    setNoticeDispatchedMsg(null);
                  }, 2500);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium rounded-xl transition-colors flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                Dispatch to Email &amp; SMS
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
