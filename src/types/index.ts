export type Department = 'CSE' | 'AI&DS' | 'ECE' | 'IT' | 'MECH' | 'CIVIL';

export type AttendanceStatus = 'present' | 'late' | 'absent' | 'excused';

export interface Student {
  id: string;
  rollNumber: string;
  fullName: string;
  email: string;
  phone: string;
  department: Department;
  year: number; // 1, 2, 3, 4
  semester: number; // 1-8
  section: string; // 'A', 'B', 'C'
  photoUrl: string;
  enrolledDate: string;
  status: 'active' | 'inactive';
  // Attendance history aggregate stats
  totalWorkingDays: number;
  daysPresent: number;
  daysLate: number;
  daysAbsent: number;
  attendancePercentage: number;
  faceEmbedding?: number[]; // Local geometric embedding vector
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  rollNumber: string;
  studentName: string;
  department: Department;
  year: number;
  section: string;
  date: string; // YYYY-MM-DD
  checkInTime: string; // HH:MM:SS AM/PM
  checkOutTime?: string;
  status: AttendanceStatus;
  verificationMethod: 'frs_webcam' | 'manual_override';
  confidenceScore: number; // 0-100
  livenessVerified: boolean;
  kioskLocation: string;
  snapshotUrl?: string;
  notes?: string;
}

export interface KioskSettings {
  autoCapture: boolean;
  confidenceThreshold: number; // e.g. 75%
  enableLivenessCheck: boolean;
  kioskLocation: string;
  soundFeedback: boolean;
  cooldownSeconds: number; // delay to prevent duplicate rapid scans
  selectedPeriod: string; // "Daily General", "Period 1: 09:00-10:00", etc.
}

export interface DailyAttendanceStats {
  date: string;
  totalEnrolled: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  attendanceRate: number; // percentage
  onTimeRate: number;
}
