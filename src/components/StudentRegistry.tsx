import React, { useState, useRef, useEffect } from 'react';
import {
  UserPlus,
  Search,
  Camera,
  Upload,
  AlertTriangle,
  CheckCircle,
  Mail,
  Phone,
  Trash2,
  RefreshCw,
  Sliders,
} from 'lucide-react';
import { Student, Department } from '../types';
import { ConfirmModal } from './ConfirmModal';

interface StudentRegistryProps {
  students: Student[];
  onAddStudent: (student: Student) => void;
  onDeleteStudent: (studentId: string) => void;
  openEnrollModalTrigger?: boolean;
  onResetModalTrigger?: () => void;
  initialPhotoUrl?: string | null;
  onClearInitialPhoto?: () => void;
  onLoadSampleStudents?: () => void;
}

export const StudentRegistry: React.FC<StudentRegistryProps> = ({
  students,
  onAddStudent,
  onDeleteStudent,
  openEnrollModalTrigger,
  onResetModalTrigger,
  initialPhotoUrl,
  onClearInitialPhoto,
  onLoadSampleStudents,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (openEnrollModalTrigger) {
      setIsModalOpen(true);
      setPhotoUrl(initialPhotoUrl || '');
      setFormError(null);
      if (onResetModalTrigger) onResetModalTrigger();
      if (onClearInitialPhoto) onClearInitialPhoto();
    }
  }, [openEnrollModalTrigger, initialPhotoUrl, onResetModalTrigger, onClearInitialPhoto]);

  // New Student Form State
  const [rollNumber, setRollNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState<Department>('CSE');
  const [year, setYear] = useState<number>(3);
  const [semester, setSemester] = useState<number>(5);
  const [section, setSection] = useState<string>('A');
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [isWebcamActive, setIsWebcamActive] = useState(false);

  const videoEnrollRef = useRef<HTMLVideoElement | null>(null);
  const streamEnrollRef = useRef<MediaStream | null>(null);

  const departments: Department[] = ['CSE', 'AI&DS', 'ECE', 'IT', 'MECH', 'CIVIL'];

  const filteredStudents = students.filter(s => {
    const matchesSearch =
      s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.rollNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = selectedDept === 'ALL' || s.department === selectedDept;
    return matchesSearch && matchesDept;
  });

  // Start webcam for enrollment photo capture with multi-tier fallback
  const startEnrollWebcam = async () => {
    try {
      setIsWebcamActive(true);
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false,
        });
      } catch (err1) {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamEnrollRef.current = stream;
      // Allow DOM to render the video element if needed
      setTimeout(() => {
        if (videoEnrollRef.current) {
          videoEnrollRef.current.srcObject = stream;
          videoEnrollRef.current.onloadedmetadata = () => {
            videoEnrollRef.current?.play().catch(() => {});
          };
        }
      }, 50);
    } catch (e: any) {
      console.warn('Enrollment webcam failed:', e);
      setFormError('Camera access could not be established. You can upload a photo portrait file instead.');
      setIsWebcamActive(false);
    }
  };

  const stopEnrollWebcam = () => {
    if (streamEnrollRef.current) {
      streamEnrollRef.current.getTracks().forEach(t => t.stop());
      streamEnrollRef.current = null;
    }
    setIsWebcamActive(false);
  };

  const captureEnrollSnapshot = () => {
    if (videoEnrollRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 400;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoEnrollRef.current, 0, 0, 400, 400);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setPhotoUrl(dataUrl);
        setFormError(null);
        stopEnrollWebcam();
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = event => {
        setPhotoUrl(event.target?.result as string);
        setFormError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitEnrollment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rollNumber || !fullName || !photoUrl) {
      setFormError('Please fill out all required fields and provide a face portrait (webcam snap or photo upload).');
      return;
    }

    const newStudent: Student = {
      id: `std-${rollNumber.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
      rollNumber: rollNumber.trim().toUpperCase(),
      fullName: fullName.trim(),
      email: email.trim() || `${rollNumber.toLowerCase()}@khitguntur.ac.in`,
      phone: phone.trim() || '+91 98480 00000',
      department,
      year: Number(year),
      semester: Number(semester),
      section,
      photoUrl,
      enrolledDate: new Date().toISOString().split('T')[0],
      status: 'active',
      totalWorkingDays: 78,
      daysPresent: 72,
      daysLate: 2,
      daysAbsent: 4,
      attendancePercentage: 92.3,
    };

    onAddStudent(newStudent);
    stopEnrollWebcam();
    setIsModalOpen(false);
    setFormError(null);
    // Reset form
    setRollNumber('');
    setFullName('');
    setEmail('');
    setPhone('');
    setPhotoUrl('');
  };

  return (
    <div className="space-y-6">
      {/* Registry Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-900/70 rounded-2xl border border-slate-800">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search enrolled students by roll no, name, email..."
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Dept Filter */}
        <div className="flex items-center gap-1 overflow-x-auto p-1 bg-slate-950 rounded-xl border border-slate-800">
          <button
            onClick={() => setSelectedDept('ALL')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
              selectedDept === 'ALL'
                ? 'bg-slate-800 text-cyan-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Branches
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

        {/* Action Button */}
        <button
          onClick={() => {
            setIsModalOpen(true);
            setPhotoUrl('');
          }}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium rounded-xl transition-colors flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          Enroll New Student
        </button>
      </div>

      {/* Student Cards Grid or Empty State */}
      {filteredStudents.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/60 rounded-2xl border border-dashed border-slate-800 space-y-4">
          <div className="w-16 h-16 rounded-full bg-slate-800/80 mx-auto flex items-center justify-center text-cyan-400">
            <UserPlus className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-100">
              {students.length === 0 ? 'Student Registry is Empty' : 'No Students Match Filter'}
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
              {students.length === 0
                ? 'All previous data has been cleared. You can now enroll your own students by snapping a webcam portrait or uploading photos.'
                : 'Try adjusting your search query or department filter.'}
            </p>
          </div>
          {students.length === 0 && (
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(true);
                  setPhotoUrl('');
                }}
                className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-xl transition-colors inline-flex items-center gap-2 shadow-sm"
              >
                <UserPlus className="w-4 h-4" />
                Enroll Your First Student
              </button>
              {onLoadSampleStudents && (
                <button
                  type="button"
                  onClick={onLoadSampleStudents}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-medium rounded-xl border border-slate-700 transition-colors"
                >
                  Load Demo Sample Students
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStudents.map(student => {
            const isDefaulter = student.attendancePercentage < 75.0;

            return (
              <div
                key={student.id}
                className="bg-slate-900/80 rounded-2xl border border-slate-800 p-5 hover:border-slate-700 transition-all flex flex-col justify-between"
              >
              <div>
                <div className="flex items-start gap-4 mb-4">
                  <div className="relative">
                    <img
                      src={student.photoUrl}
                      alt={student.fullName}
                      referrerPolicy="no-referrer"
                      className="w-16 h-16 rounded-xl object-cover border border-slate-700 shadow-md"
                    />
                    <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-900"></span>
                  </div>

                  <div className="flex-1 overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-semibold text-cyan-400">
                        {student.rollNumber}
                      </span>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          setStudentToDelete(student);
                        }}
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                        title="Delete student from registry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <h4 className="font-bold text-slate-100 text-sm truncate mt-0.5">
                      {student.fullName}
                    </h4>

                    <div className="text-xs text-slate-400 mt-0.5">
                      {student.department} · Yr {student.year}-Sem {student.semester} ({student.section})
                    </div>
                  </div>
                </div>

                {/* Aggregate Attendance Stats */}
                <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800/80 mb-3 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400">Aggregate Attendance</span>
                    <span
                      className={`font-bold ${
                        isDefaulter ? 'text-rose-400' : 'text-emerald-400'
                      }`}
                    >
                      {student.attendancePercentage.toFixed(1)}%
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        isDefaulter ? 'bg-rose-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, student.attendancePercentage)}%` }}
                    ></div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                    <span>
                      Present: <strong className="text-slate-300">{student.daysPresent}</strong>
                    </span>
                    <span>
                      Late: <strong className="text-slate-300">{student.daysLate}</strong>
                    </span>
                    <span>
                      Absent: <strong className="text-slate-300">{student.daysAbsent}</strong>
                    </span>
                  </div>
                </div>

                {/* Warning flag if below university 75% mandate */}
                {isDefaulter && (
                  <div className="flex items-center gap-1.5 p-2 bg-rose-950/40 border border-rose-800/50 rounded-lg text-[11px] text-rose-300 mb-3">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                    <span>Attendance Shortage (&lt;75% Defaulter)</span>
                  </div>
                )}
              </div>

              {/* Student Metadata Contact */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <span className="truncate max-w-[170px]">{student.email}</span>
                <span className="font-mono text-slate-500">Active</span>
              </div>
            </div>
          );
        })}
      </div>
    )}

      {/* Enrollment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-cyan-400" />
                Biometric Student Enrollment
              </h3>
              <button
                onClick={() => {
                  stopEnrollWebcam();
                  setIsModalOpen(false);
                }}
                className="text-slate-400 hover:text-slate-200 text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitEnrollment} className="space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-rose-950/70 border border-rose-850 rounded-xl text-rose-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Face Photo Capture / Preview Area */}
              <div>
                <label className="block text-slate-300 mb-2 font-medium">
                  Facial Reference Portrait (for Biometric Template Extraction) *
                </label>
                <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-slate-950 rounded-xl border border-slate-800">
                  <div className="w-28 h-28 rounded-xl overflow-hidden bg-slate-900 border-2 border-dashed border-slate-700 flex items-center justify-center relative shrink-0">
                    {photoUrl ? (
                      <img
                        src={photoUrl}
                        alt="Captured face preview"
                        className="w-full h-full object-cover"
                      />
                    ) : isWebcamActive ? (
                      <video
                        ref={videoEnrollRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover mirror-mode"
                        style={{ transform: 'scaleX(-1)' }}
                      />
                    ) : (
                      <div className="text-center p-2 text-slate-500 text-[11px]">
                        <Camera className="w-6 h-6 mx-auto mb-1 text-slate-600" />
                        No Photo
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-2 w-full">
                    {isWebcamActive ? (
                      <button
                        type="button"
                        onClick={captureEnrollSnapshot}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors"
                      >
                        Snap Reference Face
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={startEnrollWebcam}
                        className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium border border-slate-700 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        Capture from Webcam
                      </button>
                    )}

                    <label className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium border border-slate-700 cursor-pointer flex items-center justify-center gap-1.5 transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      Upload Portrait File
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>

                    {photoUrl && (
                      <div className="text-[11px] text-emerald-400 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Biometric face template ready
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Form Input Fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">University Roll Number *</label>
                  <input
                    type="text"
                    required
                    value={rollNumber}
                    onChange={e => setRollNumber(e.target.value)}
                    placeholder="e.g. 238X1A0505"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 uppercase font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Full Student Name *</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="e.g. Rohith Kumar M."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Department</label>
                  <select
                    value={department}
                    onChange={e => setDepartment(e.target.value as Department)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 outline-none focus:border-cyan-500"
                  >
                    {departments.map(d => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Year / Sem</label>
                  <select
                    value={`${year}-${semester}`}
                    onChange={e => {
                      const [y, s] = e.target.value.split('-');
                      setYear(Number(y));
                      setSemester(Number(s));
                    }}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 outline-none focus:border-cyan-500"
                  >
                    <option value="1-1">Yr 1 - Sem 1</option>
                    <option value="1-2">Yr 1 - Sem 2</option>
                    <option value="2-3">Yr 2 - Sem 3</option>
                    <option value="2-4">Yr 2 - Sem 4</option>
                    <option value="3-5">Yr 3 - Sem 5</option>
                    <option value="3-6">Yr 3 - Sem 6</option>
                    <option value="4-7">Yr 4 - Sem 7</option>
                    <option value="4-8">Yr 4 - Sem 8</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Section</label>
                  <select
                    value={section}
                    onChange={e => setSection(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 outline-none focus:border-cyan-500"
                  >
                    <option value="A">Section A</option>
                    <option value="B">Section B</option>
                    <option value="C">Section C</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">College Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="student@khitguntur.ac.in"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Contact Phone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    stopEnrollWebcam();
                    setIsModalOpen(false);
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!photoUrl}
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-medium rounded-xl transition-colors"
                >
                  Save & Enroll Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Student Deletion */}
      <ConfirmModal
        isOpen={!!studentToDelete}
        title="Delete Student from Registry"
        message={`Are you sure you want to remove ${studentToDelete?.fullName} (${studentToDelete?.rollNumber}) from the biometric registry? This will permanently delete their facial template and attendance logs.`}
        confirmLabel="Yes, Delete Student"
        cancelLabel="Cancel"
        isDestructive={true}
        onConfirm={() => {
          if (studentToDelete) {
            onDeleteStudent(studentToDelete.id);
            setStudentToDelete(null);
          }
        }}
        onCancel={() => setStudentToDelete(null)}
      />
    </div>
  );
};
