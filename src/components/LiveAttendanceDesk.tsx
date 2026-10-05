import React, { useState } from 'react';
import {
  Search,
  Filter,
  UserCheck,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  PlusCircle,
  ArrowUpDown,
  Download,
  ShieldCheck,
  Edit3,
  Trash2,
} from 'lucide-react';
import { Student, AttendanceRecord, Department, AttendanceStatus } from '../types';

interface LiveAttendanceDeskProps {
  students: Student[];
  records: AttendanceRecord[];
  onManualMark: (student: Student, status: AttendanceStatus, note: string) => void;
  onCheckOut: (recordId: string) => void;
  onDeleteRecord?: (recordId: string) => void;
  onClearRecords?: () => void;
  onNavigateToEnroll?: () => void;
}

export const LiveAttendanceDesk: React.FC<LiveAttendanceDeskProps> = ({
  students,
  records,
  onManualMark,
  onCheckOut,
  onDeleteRecord,
  onClearRecords,
  onNavigateToEnroll,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [overrideModalStudent, setOverrideModalStudent] = useState<Student | null>(null);
  const [overrideStatus, setOverrideStatus] = useState<AttendanceStatus>('present');
  const [overrideNote, setOverrideNote] = useState('');

  // Combined dataset: all enrolled students with their status today
  const combinedList = students.map(student => {
    const record = records.find(r => r.studentId === student.id || r.rollNumber === student.rollNumber);
    return {
      student,
      record,
      status: (record ? record.status : 'absent') as AttendanceStatus,
    };
  });

  // Filtering
  const filtered = combinedList.filter(item => {
    const matchesSearch =
      item.student.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.student.rollNumber.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDept = selectedDept === 'ALL' || item.student.department === selectedDept;
    const matchesStatus = selectedStatus === 'ALL' || item.status === selectedStatus;

    return matchesSearch && matchesDept && matchesStatus;
  });

  // Calculate metrics
  const totalEnrolled = students.length;
  const presentCount = records.filter(r => r.status === 'present').length;
  const lateCount = records.filter(r => r.status === 'late').length;
  const absentCount = totalEnrolled - (presentCount + lateCount);
  const attendanceRate = totalEnrolled > 0 ? (((presentCount + lateCount) / totalEnrolled) * 100).toFixed(1) : '0';

  const handleSaveOverride = (e: React.FormEvent) => {
    e.preventDefault();
    if (overrideModalStudent) {
      onManualMark(overrideModalStudent, overrideStatus, overrideNote);
      setOverrideModalStudent(null);
      setOverrideNote('');
    }
  };

  const departments: Department[] = ['CSE', 'AI&DS', 'ECE', 'IT', 'MECH', 'CIVIL'];

  return (
    <div className="space-y-6">
      {/* Institutional Attendance Metrics Header */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-900/80 rounded-2xl border border-slate-800">
          <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Total Enrolled</div>
          <div className="text-2xl font-bold text-slate-100 font-mono">{totalEnrolled}</div>
          <div className="text-xs text-slate-500 mt-1">Registered Campus Students</div>
        </div>

        <div className="p-4 bg-slate-900/80 rounded-2xl border border-slate-800">
          <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Present (On-Time)</div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">{presentCount}</div>
          <div className="text-xs text-emerald-500/80 mt-1">Checked in before 09:15 AM</div>
        </div>

        <div className="p-4 bg-slate-900/80 rounded-2xl border border-slate-800">
          <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Late Arrivals</div>
          <div className="text-2xl font-bold text-amber-400 font-mono">{lateCount}</div>
          <div className="text-xs text-amber-500/80 mt-1">Logged past grace period</div>
        </div>

        <div className="p-4 bg-slate-900/80 rounded-2xl border border-slate-800">
          <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Today's Attendance</div>
          <div className="text-2xl font-bold text-cyan-400 font-mono">{attendanceRate}%</div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-cyan-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Number(attendanceRate))}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="p-4 bg-slate-900/70 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by student name or roll number (e.g. 238X1A...)"
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Department Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto p-1 bg-slate-950 rounded-xl border border-slate-800">
          <button
            onClick={() => setSelectedDept('ALL')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
              selectedDept === 'ALL'
                ? 'bg-slate-800 text-cyan-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Depts
          </button>
          {departments.map(dept => (
            <button
              key={dept}
              onClick={() => setSelectedDept(dept)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                selectedDept === dept
                  ? 'bg-slate-800 text-cyan-300 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {dept}
            </button>
          ))}
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1.5">
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="present">Present (On-Time)</option>
            <option value="late">Late Arrival</option>
            <option value="absent">Unmarked / Absent</option>
          </select>
        </div>
      </div>

      {/* High-Density Daily Attendance Grid */}
      <div className="bg-slate-900/80 rounded-2xl border border-slate-800 overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-xs text-slate-400 uppercase tracking-wider font-semibold">
                <th className="py-3.5 px-4">Student</th>
                <th className="py-3.5 px-4">Roll Number</th>
                <th className="py-3.5 px-4">Dept & Class</th>
                <th className="py-3.5 px-4">Check-In Time</th>
                <th className="py-3.5 px-4">Verification</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="text-sm font-semibold text-slate-300">
                        {students.length === 0 ? 'No Enrolled Students' : 'No Matching Records'}
                      </div>
                      <p className="text-xs text-slate-500">
                        {students.length === 0
                          ? 'All data has been cleared. Enroll students in the registry to start logging attendance.'
                          : 'Try adjusting your search query or department filters.'}
                      </p>
                      {students.length === 0 && onNavigateToEnroll && (
                        <button
                          onClick={onNavigateToEnroll}
                          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-xl transition-colors inline-flex items-center gap-1.5 shadow-sm"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          Enroll Students Now
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map(({ student, record, status }) => (
                  <tr key={student.id} className="hover:bg-slate-850/50 transition-colors">
                    {/* Student Identity */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={record?.snapshotUrl || student.photoUrl}
                          alt={student.fullName}
                          referrerPolicy="no-referrer"
                          className="w-9 h-9 rounded-lg object-cover border border-slate-700"
                        />
                        <div>
                          <div className="font-semibold text-slate-200">{student.fullName}</div>
                          <div className="text-[11px] text-slate-400">{student.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Roll Number */}
                    <td className="py-3 px-4 font-mono font-medium text-slate-300">
                      {student.rollNumber}
                    </td>

                    {/* Dept & Class */}
                    <td className="py-3 px-4 text-slate-300">
                      <span className="font-semibold text-cyan-400">{student.department}</span>
                      <span className="text-slate-500"> · </span>
                      <span>Yr {student.year}-Sem {student.semester} ({student.section})</span>
                    </td>

                    {/* Check-In Time */}
                    <td className="py-3 px-4 font-mono">
                      {record ? (
                        <div className="text-slate-200">
                          <span>{record.checkInTime}</span>
                          {record.checkOutTime && (
                            <div className="text-[10px] text-slate-500">Out: {record.checkOutTime}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>

                    {/* Verification Method & Confidence */}
                    <td className="py-3 px-4">
                      {record ? (
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-slate-300">
                            {record.verificationMethod === 'frs_webcam' ? (
                              <span className="text-emerald-400 flex items-center gap-1 text-[11px]">
                                <ShieldCheck className="w-3.5 h-3.5" /> FRS Webcam
                              </span>
                            ) : (
                              <span className="text-amber-400 flex items-center gap-1 text-[11px]">
                                <Edit3 className="w-3.5 h-3.5" /> Manual Override
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            Conf: {record.confidenceScore}% · {record.kioskLocation.split('-')[0]}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-600 text-[11px]">Pending Arrival</span>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-4">
                      {status === 'present' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-emerald-950/70 border border-emerald-700/60 text-emerald-300">
                          <CheckCircle className="w-3 h-3" /> Present
                        </span>
                      )}
                      {status === 'late' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-amber-950/70 border border-amber-700/60 text-amber-300">
                          <Clock className="w-3 h-3" /> Late
                        </span>
                      )}
                      {status === 'absent' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-rose-950/70 border border-rose-800/60 text-rose-300">
                          <XCircle className="w-3 h-3" /> Absent
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {record && !record.checkOutTime && (
                          <button
                            onClick={() => onCheckOut(record.id)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium rounded-lg border border-slate-700 transition-colors"
                          >
                            Check-Out
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setOverrideModalStudent(student);
                            setOverrideStatus(status === 'absent' ? 'present' : status);
                          }}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-cyan-950/60 hover:border-cyan-600 text-slate-300 hover:text-cyan-300 text-[11px] font-medium rounded-lg border border-slate-700 transition-colors"
                        >
                          Override
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Attendance Override Modal */}
      {overrideModalStudent && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-semibold text-slate-100">Faculty Attendance Override</h3>
              <button
                onClick={() => setOverrideModalStudent(null)}
                className="text-slate-400 hover:text-slate-200 text-lg"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800">
              <img
                src={overrideModalStudent.photoUrl}
                alt={overrideModalStudent.fullName}
                referrerPolicy="no-referrer"
                className="w-12 h-12 rounded-lg object-cover border border-slate-700"
              />
              <div>
                <div className="font-semibold text-slate-200">{overrideModalStudent.fullName}</div>
                <div className="text-xs font-mono text-cyan-400">{overrideModalStudent.rollNumber}</div>
                <div className="text-xs text-slate-400">
                  {overrideModalStudent.department} · Semester {overrideModalStudent.semester}
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveOverride} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1.5 font-medium">Attendance Status</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['present', 'late', 'absent'] as AttendanceStatus[]).map(st => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setOverrideStatus(st)}
                      className={`py-2 rounded-lg font-medium capitalize border transition-colors ${
                        overrideStatus === st
                          ? 'bg-cyan-950 border-cyan-500 text-cyan-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1.5 font-medium">
                  Reason for Manual Override / Note
                </label>
                <input
                  type="text"
                  value={overrideNote}
                  onChange={e => setOverrideNote(e.target.value)}
                  placeholder="e.g. Official Duty, Medical Slip, Biometric Sensor retry"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setOverrideModalStudent(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-xl transition-colors"
                >
                  Confirm Override
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
