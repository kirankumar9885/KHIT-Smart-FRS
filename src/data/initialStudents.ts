import { Student, AttendanceRecord } from '../types';
import ananyaImg from '../assets/images/student_portrait_ananya_1791191930106.jpg';
import rahulImg from '../assets/images/student_portrait_rahul_1791191942557.jpg';
import snehaImg from '../assets/images/student_portrait_sneha_1791191953615.jpg';
import vikramImg from '../assets/images/student_portrait_vikram_1791191964095.jpg';

export const INITIAL_STUDENTS: Student[] = [];

export const INITIAL_TODAY_ATTENDANCE: AttendanceRecord[] = [];

export const SAMPLE_STUDENTS: Student[] = [
  {
    id: 'std-238x1a0501',
    rollNumber: '238X1A0501',
    fullName: 'Ananya Sharma',
    email: '238x1a0501@khitguntur.ac.in',
    phone: '+91 98481 12345',
    department: 'CSE',
    year: 3,
    semester: 5,
    section: 'A',
    photoUrl: ananyaImg,
    enrolledDate: '2024-08-10',
    status: 'active',
    totalWorkingDays: 82,
    daysPresent: 78,
    daysLate: 3,
    daysAbsent: 1,
    attendancePercentage: 98.7,
  },
  {
    id: 'std-238x1a0542',
    rollNumber: '238X1A0542',
    fullName: 'Rahul Varma',
    email: '238x1a0542@khitguntur.ac.in',
    phone: '+91 98482 23456',
    department: 'CSE',
    year: 3,
    semester: 5,
    section: 'B',
    photoUrl: rahulImg,
    enrolledDate: '2024-08-10',
    status: 'active',
    totalWorkingDays: 82,
    daysPresent: 75,
    daysLate: 5,
    daysAbsent: 2,
    attendancePercentage: 97.5,
  },
  {
    id: 'std-238x1a4512',
    rollNumber: '238X1A4512',
    fullName: 'Sneha Reddy',
    email: '238x1a4512@khitguntur.ac.in',
    phone: '+91 98483 34567',
    department: 'AI&DS',
    year: 3,
    semester: 5,
    section: 'A',
    photoUrl: snehaImg,
    enrolledDate: '2024-08-12',
    status: 'active',
    totalWorkingDays: 82,
    daysPresent: 79,
    daysLate: 1,
    daysAbsent: 2,
    attendancePercentage: 97.5,
  },
  {
    id: 'std-238x1a0429',
    rollNumber: '238X1A0429',
    fullName: 'Vikram Chowdary',
    email: '238x1a0429@khitguntur.ac.in',
    phone: '+91 98484 45678',
    department: 'ECE',
    year: 2,
    semester: 3,
    section: 'B',
    photoUrl: vikramImg,
    enrolledDate: '2024-08-15',
    status: 'active',
    totalWorkingDays: 82,
    daysPresent: 56,
    daysLate: 4,
    daysAbsent: 22,
    attendancePercentage: 73.1, // Defaulter (< 75%)
  },
];
