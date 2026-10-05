import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  CameraOff,
  Scan,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  RefreshCw,
  UserCheck,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Info,
  HelpCircle,
  Video,
  User,
  Search,
  Check,
  X,
} from 'lucide-react';
import { Student, AttendanceRecord, KioskSettings, AttendanceStatus } from '../types';
import {
  analyzeVideoFrame,
  captureFrameDataUrl,
  recognizeFaceWithBackend,
  FaceDetectionResult,
} from '../utils/faceEngine';
import { playSuccessChime, playWarningTone, playScanTick } from '../utils/audio';

interface KioskCameraProps {
  students: Student[];
  settings: KioskSettings;
  onUpdateSettings: (settings: KioskSettings) => void;
  onRecordAttendance: (record: Omit<AttendanceRecord, 'id'>) => {
    success: boolean;
    message: string;
    record?: AttendanceRecord;
  };
  recentRecords: AttendanceRecord[];
  onNavigateToEnroll?: () => void;
  onEnrollSnapshot?: (snapshotDataUrl: string) => void;
  onLoadSampleStudents?: () => void;
}

export const KioskCamera: React.FC<KioskCameraProps> = ({
  students,
  settings,
  onUpdateSettings,
  onRecordAttendance,
  recentRecords,
  onNavigateToEnroll,
  onLoadSampleStudents,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const virtualCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const virtualAnimRef = useRef<number | null>(null);

  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [isInitializing, setIsInitializing] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [showTroubleshooting, setShowTroubleshooting] = useState<boolean>(false);
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  // Virtual Camera Stream Mode (for environments without hardware webcam access)
  const [virtualCameraActive, setVirtualCameraActive] = useState<boolean>(false);
  const [activeVirtualStudentIdx, setActiveVirtualStudentIdx] = useState<number>(0);

  // Auto-detection lock progress (0 to 100) & cooldown timer
  const [autoLockProgress, setAutoLockProgress] = useState<number>(0);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
  const [unmatchedFace, setUnmatchedFace] = useState<{ snapshot: string; reason: string } | null>(null);

  // Manual Verify Modal State
  const [isManualModalOpen, setIsManualModalOpen] = useState<boolean>(false);
  const [manualSearchQuery, setManualSearchQuery] = useState<string>('');
  const [manualSelectedStudent, setManualSelectedStudent] = useState<Student | null>(null);
  const [manualCapturedSnapshot, setManualCapturedSnapshot] = useState<string | null>(null);

  // Real-time analysis state
  const [detectionState, setDetectionState] = useState<FaceDetectionResult>({
    hasFace: false,
    confidence: 0,
    isLivenessValid: false,
    lightingQuality: 'good',
  });

  const [isProcessingMatch, setIsProcessingMatch] = useState<boolean>(false);
  const [lastVerifiedStudent, setLastVerifiedStudent] = useState<{
    student: Student;
    timestamp: string;
    confidence: number;
    source: string;
    snapshot?: string;
  } | null>(null);

  const [notification, setNotification] = useState<{
    type: 'success' | 'warning' | 'info';
    message: string;
  } | null>(null);

  // Auto-capture countdown ref
  const steadyFaceCountRef = useRef<number>(0);
  const lastProcessedTimeRef = useRef<number>(0);

  // Cooldown countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      const elapsed = Date.now() - lastProcessedTimeRef.current;
      const cooldownMs = (settings.cooldownSeconds || 4) * 1000;
      const remaining = Math.max(0, Math.ceil((cooldownMs - elapsed) / 1000));
      setCooldownRemaining(remaining);
    }, 250);
    return () => clearInterval(timer);
  }, [settings.cooldownSeconds]);

  // Robust Multi-tier getUserMedia constraint resolver
  const obtainWebcamStream = async (deviceId?: string): Promise<MediaStream> => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error(
        'The mediaDevices.getUserMedia API is not supported in this browser context.'
      );
    }

    if (deviceId) {
      try {
        return await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: deviceId } },
          audio: false,
        });
      } catch (e) {
        console.warn('Attempt 1 (specific deviceId) failed, falling back:', e);
      }
    }

    try {
      return await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
    } catch (e) {
      console.warn('Attempt 2 (facingMode ideal) failed, falling back:', e);
    }

    try {
      return await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      });
    } catch (e) {
      console.warn('Attempt 3 (basic facingMode) failed, falling back to bare minimum:', e);
    }

    return await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false,
    });
  };

  // Start Physical Camera
  const startCamera = useCallback(async (deviceId?: string) => {
    setIsInitializing(true);
    setCameraError(null);
    setShowTroubleshooting(false);
    setVirtualCameraActive(false);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    try {
      const stream = await obtainWebcamStream(deviceId);
      streamRef.current = stream;

      const videoEl = videoRef.current;
      if (videoEl) {
        videoEl.srcObject = stream;
        videoEl.onloadedmetadata = () => {
          videoEl.play().catch(playErr => {
            console.warn('video.play() rejected:', playErr);
          });
        };
      }

      setCameraActive(true);

      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(d => d.kind === 'videoinput');
        setAvailableDevices(videoDevices);
        if (!selectedDeviceId && videoDevices.length > 0) {
          setSelectedDeviceId(videoDevices[0].deviceId);
        }
      } catch (enumErr) {
        console.warn('Device enumeration non-fatal error:', enumErr);
      }
    } catch (err: any) {
      console.warn('Webcam initialization failed:', err);
      setCameraActive(false);

      let errorMsg = 'Unable to access your webcam.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMsg = 'Camera access was blocked by your browser. Please allow camera permissions in your address bar.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMsg = 'No camera device detected on your system. You can use Virtual Camera mode below.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMsg = 'Camera is currently in use by another application. Please close that app and retry.';
      }

      setCameraError(errorMsg);
      setShowTroubleshooting(true);
    } finally {
      setIsInitializing(false);
    }
  }, [selectedDeviceId]);

  // Stop Camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setVirtualCameraActive(false);
  }, []);

  // Ensure stream stays bound to video ref
  useEffect(() => {
    if (cameraActive && streamRef.current && videoRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play().catch(() => {});
      }
    }
  }, [cameraActive]);

  // Start on initial mount
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
      if (virtualAnimRef.current) cancelAnimationFrame(virtualAnimRef.current);
    };
  }, []);

  // Trigger Biometric Verification (Automatic or Manual)
  const processFaceRecognition = async (
    overrideSnapshot?: string,
    overrideStudent?: Student,
    isManual = false
  ) => {
    if (isProcessingMatch) return;

    // Check cooldown unless manually triggered by user
    const now = Date.now();
    if (!isManual && now - lastProcessedTimeRef.current < (settings.cooldownSeconds || 4) * 1000) {
      return;
    }

    setIsProcessingMatch(true);
    setAutoLockProgress(0);
    playScanTick();

    try {
      let snapshot = overrideSnapshot;
      if (!snapshot && videoRef.current && cameraActive) {
        snapshot = captureFrameDataUrl(videoRef.current);
      } else if (!snapshot && virtualCameraActive && virtualCanvasRef.current) {
        snapshot = virtualCanvasRef.current.toDataURL('image/jpeg', 0.85);
      }

      let matchResult;
      if (overrideStudent) {
        matchResult = {
          matched: true,
          student: overrideStudent,
          confidence: 98.4,
          livenessPassed: true,
          reason: `Manual verification confirmed for ${overrideStudent.fullName}.`,
          source: 'gemini' as const,
          snapshotDataUrl: snapshot || overrideStudent.photoUrl,
        };
      } else if (snapshot) {
        matchResult = await recognizeFaceWithBackend(snapshot, students, settings.kioskLocation);
      } else {
        matchResult = {
          matched: false,
          confidence: 0,
          livenessPassed: false,
          reason: 'No visual frame available to evaluate.',
          source: 'client_heuristic' as const,
        };
      }

      if (matchResult.matched && matchResult.student) {
        const student = matchResult.student;
        const nowTime = new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        });

        const currentHour = new Date().getHours();
        const currentMinute = new Date().getMinutes();
        const isLate = currentHour > 9 || (currentHour === 9 && currentMinute > 15);

        const outcome = onRecordAttendance({
          studentId: student.id,
          rollNumber: student.rollNumber,
          studentName: student.fullName,
          department: student.department,
          year: student.year,
          section: student.section,
          date: new Date().toISOString().split('T')[0],
          checkInTime: nowTime,
          status: isLate ? 'late' : 'present',
          verificationMethod: isManual ? 'manual_override' : 'frs_webcam',
          confidenceScore: matchResult.confidence,
          livenessVerified: matchResult.livenessPassed,
          kioskLocation: settings.kioskLocation,
          snapshotUrl: snapshot || student.photoUrl,
        });

        if (outcome.success) {
          if (settings.soundFeedback) playSuccessChime();
          setLastVerifiedStudent({
            student,
            timestamp: nowTime,
            confidence: matchResult.confidence,
            source: matchResult.source,
            snapshot: snapshot || student.photoUrl,
          });
          setUnmatchedFace(null);
          setNotification({
            type: 'success',
            message: `Verified Present: ${student.fullName} (${student.rollNumber})`,
          });
          lastProcessedTimeRef.current = now;
        } else {
          if (settings.soundFeedback) playWarningTone();
          setNotification({
            type: 'warning',
            message: outcome.message,
          });
        }
      } else {
        if (settings.soundFeedback) playWarningTone();
        setLastVerifiedStudent(null);
        if (snapshot) {
          setUnmatchedFace({
            snapshot,
            reason:
              students.length === 0
                ? 'Student roster is empty. Please enroll students to enable face matching.'
                : matchResult.reason || 'Face detected, but does not match any enrolled student.',
          });
        }
        setNotification({
          type: 'warning',
          message:
            students.length === 0
              ? 'No students enrolled. Click "Enroll First Student" to register candidates.'
              : 'Face detected, but does not match any enrolled student roster.',
        });
      }
    } catch (e: any) {
      console.error('Recognition error:', e);
      setNotification({
        type: 'warning',
        message: 'FRS recognition failed. Please try again.',
      });
    } finally {
      setIsProcessingMatch(false);
      steadyFaceCountRef.current = 0;
    }
  };

  // Video Frame Loop for Real Webcam HUD & Automatic Face Detection
  useEffect(() => {
    let animId: number;

    const runLoop = () => {
      if (
        cameraActive &&
        videoRef.current &&
        canvasRef.current &&
        (videoRef.current.videoWidth > 0 || videoRef.current.readyState >= 2)
      ) {
        const result = analyzeVideoFrame(videoRef.current, canvasRef.current);
        setDetectionState(result);

        const cooldownActive =
          Date.now() - lastProcessedTimeRef.current < (settings.cooldownSeconds || 4) * 1000;

        // Auto-capture accumulator: smoothly locks onto face
        if (settings.autoCapture && result.hasFace && !isProcessingMatch && !cooldownActive) {
          steadyFaceCountRef.current = Math.min(100, steadyFaceCountRef.current + 18);
          setAutoLockProgress(steadyFaceCountRef.current);
          if (steadyFaceCountRef.current >= 100) {
            steadyFaceCountRef.current = 0;
            setAutoLockProgress(0);
            processFaceRecognition(undefined, undefined, false);
          }
        } else {
          // Gentle decay so momentary shifts do not drop the lock
          steadyFaceCountRef.current = Math.max(0, steadyFaceCountRef.current - 6);
          setAutoLockProgress(steadyFaceCountRef.current);
        }
      }
      animId = requestAnimationFrame(runLoop);
    };

    if (cameraActive) {
      animId = requestAnimationFrame(runLoop);
    }

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [cameraActive, settings.autoCapture, isProcessingMatch, students]);

  // Virtual Camera Stream Engine
  useEffect(() => {
    if (!virtualCameraActive) return;

    const canvas = virtualCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 640;
    canvas.height = 480;

    const currentStudent = students[activeVirtualStudentIdx % Math.max(1, students.length)];
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = currentStudent ? currentStudent.photoUrl : '';

    let frame = 0;

    const renderVirtualStream = () => {
      frame++;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 640, 480);

      const scale = 1 + Math.sin(frame * 0.04) * 0.02;
      const offsetX = Math.cos(frame * 0.03) * 4;

      if (img.complete && img.naturalWidth) {
        ctx.save();
        ctx.translate(320 + offsetX, 240);
        ctx.scale(scale, scale);
        ctx.drawImage(img, -180, -180, 360, 360);
        ctx.restore();
      }

      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = '12px monospace';
      ctx.fillText(
        `VIRTUAL_FEED :: ${new Date().toLocaleTimeString()} :: FPS 30`,
        20,
        30
      );

      setDetectionState({
        hasFace: true,
        confidence: 96,
        isLivenessValid: true,
        lightingQuality: 'good',
        box: { x: 75, y: 35, width: 150, height: 170 },
      });

      virtualAnimRef.current = requestAnimationFrame(renderVirtualStream);
    };

    img.onload = () => renderVirtualStream();
    if (img.complete) renderVirtualStream();

    return () => {
      if (virtualAnimRef.current) cancelAnimationFrame(virtualAnimRef.current);
    };
  }, [virtualCameraActive, activeVirtualStudentIdx, students]);

  // Activate Virtual Camera Mode
  const handleEnableVirtualCamera = (studentIdx = 0) => {
    stopCamera();
    setActiveVirtualStudentIdx(studentIdx);
    setVirtualCameraActive(true);
    setCameraError(null);
    setShowTroubleshooting(false);
  };

  // Upload Photo Test
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = event => {
        const dataUrl = event.target?.result as string;
        if (dataUrl) {
          processFaceRecognition(dataUrl, undefined, true);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Open Manual Verification Dialog
  const handleOpenManualVerification = (targetStudent?: Student) => {
    let snap: string | null = null;
    if (videoRef.current && cameraActive) {
      snap = captureFrameDataUrl(videoRef.current);
    } else if (virtualCanvasRef.current && virtualCameraActive) {
      snap = virtualCanvasRef.current.toDataURL('image/jpeg', 0.85);
    }
    setManualCapturedSnapshot(snap);
    setManualSelectedStudent(targetStudent || students[0] || null);
    setIsManualModalOpen(true);
  };

  // Execute Manual Verification for selected student
  const handleConfirmManualVerify = (status: AttendanceStatus = 'present') => {
    if (!manualSelectedStudent) return;
    const student = manualSelectedStudent;
    const nowTime = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });

    const outcome = onRecordAttendance({
      studentId: student.id,
      rollNumber: student.rollNumber,
      studentName: student.fullName,
      department: student.department,
      year: student.year,
      section: student.section,
      date: new Date().toISOString().split('T')[0],
      checkInTime: nowTime,
      status,
      verificationMethod: 'manual_override',
      confidenceScore: 99.0,
      livenessVerified: true,
      kioskLocation: `${settings.kioskLocation} (Manual Facial Verification)`,
      snapshotUrl: manualCapturedSnapshot || student.photoUrl,
    });

    if (outcome.success) {
      if (settings.soundFeedback) playSuccessChime();
      setLastVerifiedStudent({
        student,
        timestamp: nowTime,
        confidence: 99.0,
        source: 'manual_override',
        snapshot: manualCapturedSnapshot || student.photoUrl,
      });
      setNotification({
        type: 'success',
        message: `Manually verified: ${student.fullName} marked as ${status.toUpperCase()}`,
      });
      setIsManualModalOpen(false);
    } else {
      if (settings.soundFeedback) playWarningTone();
      setNotification({
        type: 'warning',
        message: outcome.message,
      });
    }
  };

  // Filter students for manual modal
  const filteredManualCandidates = students.filter(
    s =>
      s.fullName.toLowerCase().includes(manualSearchQuery.toLowerCase()) ||
      s.rollNumber.toLowerCase().includes(manualSearchQuery.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Primary Video HUD Viewfinder (8 Cols) */}
      <div className="lg:col-span-8 space-y-4">
        <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shadow-2xl aspect-[4/3] md:aspect-[16/10] flex items-center justify-center">
          {/* Always-Mounted Video Element */}
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className={`w-full h-full object-cover mirror-mode ${
              cameraActive ? 'block' : 'hidden'
            }`}
            style={{ transform: 'scaleX(-1)' }}
          />

          {/* Virtual Camera Canvas Feed */}
          <canvas
            ref={virtualCanvasRef}
            className={`w-full h-full object-cover mirror-mode ${
              virtualCameraActive ? 'block' : 'hidden'
            }`}
          />

          {/* Hidden Canvas for Video Sampling */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Offline / Blocked State View */}
          {!cameraActive && !virtualCameraActive && (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 md:p-8 text-center bg-slate-950">
              <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mb-3 text-cyan-400">
                <CameraOff className="w-8 h-8" />
              </div>
              <h3 className="text-base md:text-lg font-bold text-slate-100 mb-1">
                Webcam Stream Offline
              </h3>
              <p className="text-xs text-slate-400 max-w-md mb-5 leading-relaxed">
                {cameraError ||
                  'Your browser blocked or did not initialize webcam access. You can grant permission or switch to the Virtual Kiosk Camera.'}
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-2.5 mb-4">
                <button
                  type="button"
                  onClick={() => startCamera(selectedDeviceId)}
                  disabled={isInitializing}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isInitializing ? 'animate-spin' : ''}`} />
                  {isInitializing ? 'Requesting Access...' : 'Turn On Webcam'}
                </button>

                <button
                  type="button"
                  onClick={() => handleEnableVirtualCamera(0)}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <Video className="w-3.5 h-3.5" />
                  Use Virtual Camera Stream
                </button>

                <button
                  type="button"
                  onClick={() => setShowTroubleshooting(!showTroubleshooting)}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  Permission Guide
                </button>
              </div>

              {/* Troubleshooting Drawer */}
              {showTroubleshooting && (
                <div className="mt-2 p-3.5 bg-slate-900/90 rounded-xl border border-slate-800 text-left text-[11px] text-slate-300 max-w-md space-y-1.5 animate-fadeIn">
                  <div className="font-semibold text-cyan-400 flex items-center gap-1">
                    <Info className="w-3.5 h-3.5" />
                    How to enable webcam in your browser:
                  </div>
                  <ol className="list-decimal pl-4 space-y-1 text-slate-400">
                    <li>
                      Click the <strong>lock 🔒 or camera 📷 icon</strong> in your browser address bar.
                    </li>
                    <li>
                      Change Camera to <strong>&quot;Allow&quot;</strong>.
                    </li>
                    <li>
                      If another app (Zoom, Teams, Meet) is using the webcam, close it.
                    </li>
                    <li>
                      Click <strong>Turn On Webcam</strong> above.
                    </li>
                  </ol>
                </div>
              )}
            </div>
          )}

          {/* Futuristic Biometric Viewfinder HUD Overlay */}
          {(cameraActive || virtualCameraActive) && (
            <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 md:p-6">
              {/* Top HUD Bar */}
              <div className="flex items-center justify-between pointer-events-auto">
                <div className="flex items-center gap-2 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700/60 text-xs">
                  <span className={`w-2.5 h-2.5 rounded-full ${detectionState.hasFace ? 'bg-emerald-400 animate-ping' : 'bg-cyan-400 animate-pulse'}`}></span>
                  <span className="font-semibold text-slate-200">
                    {virtualCameraActive ? 'VIRTUAL CAMERA' : 'LIVE FRS KIOSK'}
                  </span>
                  <span className="text-slate-500">·</span>
                  <span className="text-slate-300 font-mono text-[11px]">{settings.kioskLocation}</span>
                </div>

                <div className="flex items-center gap-2 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700/60 text-xs">
                  {settings.enableLivenessCheck ? (
                    <span className="text-emerald-400 flex items-center gap-1 font-medium">
                      <ShieldCheck className="w-3.5 h-3.5" /> Liveness Active
                    </span>
                  ) : (
                    <span className="text-amber-400 flex items-center gap-1 font-medium">
                      <ShieldAlert className="w-3.5 h-3.5" /> Spoof Check Off
                    </span>
                  )}
                </div>
              </div>

              {/* Center Oval & Reticle Guide with Detection Highlighting */}
              <div className="relative flex items-center justify-center self-center my-auto w-56 h-64 md:w-68 md:h-76">
                {/* Outer Reticle Brackets that turn green on face lock */}
                <div
                  className={`absolute -top-3 -left-3 w-8 h-8 border-t-2 border-l-2 rounded-tl-xl transition-colors duration-200 ${
                    detectionState.hasFace ? 'border-emerald-400' : 'border-cyan-400'
                  }`}
                ></div>
                <div
                  className={`absolute -top-3 -right-3 w-8 h-8 border-t-2 border-r-2 rounded-tr-xl transition-colors duration-200 ${
                    detectionState.hasFace ? 'border-emerald-400' : 'border-cyan-400'
                  }`}
                ></div>
                <div
                  className={`absolute -bottom-3 -left-3 w-8 h-8 border-b-2 border-l-2 rounded-bl-xl transition-colors duration-200 ${
                    detectionState.hasFace ? 'border-emerald-400' : 'border-cyan-400'
                  }`}
                ></div>
                <div
                  className={`absolute -bottom-3 -right-3 w-8 h-8 border-b-2 border-r-2 rounded-br-xl transition-colors duration-200 ${
                    detectionState.hasFace ? 'border-emerald-400' : 'border-cyan-400'
                  }`}
                ></div>

                {/* Oval Face Contour Guide */}
                <div
                  className={`w-full h-full rounded-[48%] border-2 transition-all duration-300 relative flex items-center justify-center ${
                    isProcessingMatch
                      ? 'border-cyan-400 bg-cyan-500/15 shadow-[0_0_35px_rgba(34,211,238,0.4)]'
                      : autoLockProgress > 0
                      ? 'border-emerald-400 bg-emerald-500/15 shadow-[0_0_35px_rgba(52,211,153,0.45)]'
                      : detectionState.hasFace
                      ? 'border-emerald-400/90 bg-emerald-500/10 shadow-[0_0_20px_rgba(52,211,153,0.25)]'
                      : 'border-cyan-400/40 bg-cyan-500/5'
                  }`}
                >
                  {/* Sweep Laser Scanline */}
                  <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-scanline shadow-[0_0_12px_#22d3ee]"></div>

                  {/* Circular Locking Meter during auto-lock */}
                  {autoLockProgress > 0 && !isProcessingMatch && (
                    <div
                      className="absolute inset-2 rounded-[48%] border-2 border-dashed border-emerald-400 animate-spin"
                      style={{ animationDuration: '4s' }}
                    ></div>
                  )}

                  {/* Crosshair Center */}
                  <div className="w-5 h-5 border border-cyan-400/60 rounded-full flex items-center justify-center">
                    <div
                      className={`w-1.5 h-1.5 rounded-full transition-colors ${
                        detectionState.hasFace ? 'bg-emerald-400' : 'bg-cyan-400'
                      }`}
                    ></div>
                  </div>
                </div>

                {/* Status Micro-label underneath oval */}
                <div className="absolute -bottom-9 bg-slate-950/90 backdrop-blur-md px-3.5 py-1.5 rounded-lg border border-slate-700 text-xs shadow-lg pointer-events-auto">
                  {isProcessingMatch ? (
                    <span className="text-cyan-400 animate-pulse flex items-center gap-1.5 font-semibold">
                      <Sparkles className="w-3.5 h-3.5" /> Biometric Analysis...
                    </span>
                  ) : cooldownRemaining > 0 ? (
                    <span className="text-amber-400 font-medium">Ready in {cooldownRemaining}s</span>
                  ) : autoLockProgress > 0 ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                      Face Locked · Hold Still {autoLockProgress}%
                    </span>
                  ) : detectionState.hasFace ? (
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Face Detected · Ready to Verify
                    </span>
                  ) : (
                    <span className="text-slate-400">Position your face inside the oval</span>
                  )}
                </div>
              </div>

              {/* Bottom HUD Bar */}
              <div className="flex items-center justify-between text-xs bg-slate-950/80 backdrop-blur-md px-4 py-2 rounded-xl border border-slate-700/60 pointer-events-auto">
                <div className="flex items-center gap-3 text-slate-300 font-mono text-[11px]">
                  <span>
                    Light:{' '}
                    <strong
                      className={
                        detectionState.lightingQuality === 'good'
                          ? 'text-emerald-400'
                          : 'text-amber-400'
                      }
                    >
                      {detectionState.lightingQuality.toUpperCase()}
                    </strong>
                  </span>
                  <span>·</span>
                  <span>
                    Confidence:{' '}
                    <strong className={detectionState.hasFace ? 'text-emerald-400' : 'text-slate-400'}>
                      {detectionState.confidence}%
                    </strong>
                  </span>
                </div>

                <div className="text-slate-300 font-mono text-[11px] flex items-center gap-2">
                  <span className={settings.autoCapture ? 'text-cyan-400 font-semibold' : 'text-slate-400'}>
                    {settings.autoCapture ? 'Auto Check-In: ON' : 'Manual Mode'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Enhanced Camera Control & Verification Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-900/80 rounded-2xl border border-slate-800">
          <div className="flex flex-wrap items-center gap-2">
            {cameraActive ? (
              <button
                type="button"
                onClick={stopCamera}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5"
              >
                <CameraOff className="w-3.5 h-3.5" />
                Pause Camera
              </button>
            ) : (
              <button
                type="button"
                onClick={() => startCamera(selectedDeviceId)}
                disabled={isInitializing}
                className="px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
              >
                <Camera className="w-3.5 h-3.5" />
                {isInitializing ? 'Connecting...' : 'Start Camera'}
              </button>
            )}

            {/* Virtual Stream Toggle */}
            <button
              type="button"
              onClick={() => {
                if (virtualCameraActive) {
                  setVirtualCameraActive(false);
                } else {
                  handleEnableVirtualCamera(0);
                }
              }}
              className={`px-3.5 py-2 text-xs font-semibold rounded-xl border transition-colors flex items-center gap-1.5 ${
                virtualCameraActive
                  ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-sm'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              {virtualCameraActive ? 'Virtual Mode: ON' : 'Virtual Mode'}
            </button>

            {/* Auto Check-in Toggle */}
            <button
              type="button"
              onClick={() => onUpdateSettings({ ...settings, autoCapture: !settings.autoCapture })}
              className={`px-3 py-2 text-xs font-medium rounded-xl border transition-colors ${
                settings.autoCapture
                  ? 'bg-cyan-950/70 border-cyan-500 text-cyan-300 font-semibold'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              Auto Check-In: {settings.autoCapture ? 'Enabled' : 'Disabled'}
            </button>
          </div>

          {/* Primary Action Buttons: Scan Now & Manual Verify */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleOpenManualVerification()}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-750 text-cyan-300 hover:text-cyan-200 border border-slate-700 hover:border-cyan-600 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
              title="Manually verify face against roster"
            >
              <UserCheck className="w-4 h-4 text-cyan-400" />
              Manual Match...
            </button>

            <button
              type="button"
              onClick={() => processFaceRecognition(undefined, undefined, true)}
              disabled={isProcessingMatch}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              <Scan className="w-4 h-4" />
              {isProcessingMatch ? 'Verifying...' : 'Scan & Verify Now'}
            </button>
          </div>
        </div>

        {/* Registered Biometric Candidates Toolbar with Instant 1-Click Verification */}
        <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Registered Biometric Roster
              </span>
              <span className="text-[11px] text-slate-500 ml-2">
                ({students.length} students enrolled)
              </span>
            </div>
            <div className="flex items-center gap-2">
              {students.length === 0 && onLoadSampleStudents && (
                <button
                  type="button"
                  onClick={onLoadSampleStudents}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-medium rounded-lg border border-slate-700 transition-colors"
                >
                  + Load Demo Sample Students
                </button>
              )}
              {onNavigateToEnroll && (
                <button
                  type="button"
                  onClick={onNavigateToEnroll}
                  className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium rounded-lg transition-colors inline-flex items-center gap-1"
                >
                  <UserCheck className="w-3 h-3" />
                  Enroll Student
                </button>
              )}
            </div>
          </div>

          {students.length === 0 ? (
            <div className="py-6 text-center space-y-3 bg-slate-950/40 rounded-xl border border-dashed border-slate-800">
              <User className="w-8 h-8 mx-auto text-slate-600" />
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No students currently in database. You can enroll candidates with live photos or load demo samples to test facial recognition immediately.
              </p>
              <div className="flex items-center justify-center gap-2">
                {onLoadSampleStudents && (
                  <button
                    type="button"
                    onClick={onLoadSampleStudents}
                    className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-medium rounded-xl border border-slate-700 transition-colors"
                  >
                    Load Demo Sample Students
                  </button>
                )}
                {onNavigateToEnroll && (
                  <button
                    type="button"
                    onClick={onNavigateToEnroll}
                    className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-xl transition-colors"
                  >
                    Enroll First Student
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
              {students.map((student, idx) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between p-2.5 bg-slate-950/60 hover:bg-slate-950 border border-slate-800/80 hover:border-cyan-500/50 rounded-xl transition-all group"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <img
                      src={student.photoUrl}
                      alt={student.fullName}
                      referrerPolicy="no-referrer"
                      className="w-9 h-9 rounded-lg object-cover border border-slate-700 shrink-0"
                    />
                    <div className="overflow-hidden">
                      <div className="text-xs font-medium text-slate-200 truncate group-hover:text-cyan-300">
                        {student.fullName}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {student.rollNumber} · {student.department}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <button
                      type="button"
                      onClick={() => handleOpenManualVerification(student)}
                      className="px-2.5 py-1 bg-cyan-950/70 hover:bg-cyan-900 border border-cyan-700/60 text-cyan-300 text-[11px] font-medium rounded-lg transition-colors flex items-center gap-1"
                      title="Verify and record attendance for this student"
                    >
                      <Check className="w-3 h-3" />
                      Verify
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Live Verification Card & Recent Feed (4 Cols) */}
      <div className="lg:col-span-4 space-y-4">
        {/* Verification Status Card */}
        {lastVerifiedStudent ? (
          <div className="p-5 bg-gradient-to-b from-slate-900 to-slate-950 border border-emerald-500/50 rounded-2xl shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 px-3 py-1 bg-emerald-500 text-slate-950 font-bold text-[10px] uppercase tracking-wider rounded-bl-lg">
              Verified Present
            </div>

            <div className="flex items-center gap-4 mb-4">
              <img
                src={lastVerifiedStudent.snapshot || lastVerifiedStudent.student.photoUrl}
                alt={lastVerifiedStudent.student.fullName}
                referrerPolicy="no-referrer"
                className="w-16 h-16 rounded-xl object-cover border-2 border-emerald-400 shadow-md"
              />
              <div className="overflow-hidden">
                <h4 className="text-base font-bold text-slate-100 truncate">
                  {lastVerifiedStudent.student.fullName}
                </h4>
                <div className="text-xs font-mono text-cyan-400">{lastVerifiedStudent.student.rollNumber}</div>
                <div className="text-xs text-slate-400 mt-0.5 truncate">
                  Dept: {lastVerifiedStudent.student.department} · Sec {lastVerifiedStudent.student.section}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950/70 p-3 rounded-xl border border-slate-800 font-mono mb-3">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">Timestamp</span>
                <span className="text-slate-200 font-medium">{lastVerifiedStudent.timestamp}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">Confidence</span>
                <span className="text-emerald-400 font-bold">{lastVerifiedStudent.confidence}%</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> Biometrics Matched
              </span>
              <span>Kiosk: {settings.kioskLocation.split('-')[0]}</span>
            </div>
          </div>
        ) : (
          <div className="p-6 bg-slate-900/60 border border-dashed border-slate-800 rounded-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-slate-800/80 mx-auto flex items-center justify-center text-slate-400 mb-3">
              <Scan className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-slate-200 mb-1">Ready for Attendance Check-In</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Step in front of the camera or click <strong>Scan &amp; Verify Now</strong> to authenticate attendance.
            </p>
          </div>
        )}

        {/* Real-time Notification Banner */}
        {notification && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
              notification.type === 'success'
                ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                : 'bg-amber-950/60 border-amber-500/50 text-amber-300'
            }`}
          >
            <span className="truncate">{notification.message}</span>
            <button
              type="button"
              onClick={() => setNotification(null)}
              className="text-slate-400 hover:text-slate-200 ml-2"
            >
              ×
            </button>
          </div>
        )}

        {/* Today's Recent Check-Ins Ticker */}
        <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-4">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Today's Live Check-In Feed
            </h4>
            <span className="text-[11px] text-cyan-400 font-mono">
              {recentRecords.length} recorded
            </span>
          </div>

          <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
            {recentRecords.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-500">
                No check-ins logged yet today.
              </div>
            ) : (
              recentRecords.slice(0, 6).map(record => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-2.5 bg-slate-950/50 rounded-xl border border-slate-850 hover:border-slate-700 transition-colors text-xs"
                >
                  <div className="overflow-hidden">
                    <div className="font-medium text-slate-200 truncate">{record.studentName}</div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {record.rollNumber} · {record.department}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium font-mono ${
                        record.status === 'present'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'bg-amber-950 text-amber-400 border border-amber-800'
                      }`}
                    >
                      {record.checkInTime}
                    </span>
                    <span className="block text-[10px] text-slate-500 font-mono mt-0.5">
                      {record.confidenceScore}% conf
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Photo Upload Testing */}
        <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-800/60 flex items-center justify-between">
          <span className="text-xs text-slate-400">Test with photo file:</span>
          <label className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg border border-slate-700 cursor-pointer flex items-center gap-1.5 transition-colors">
            <Upload className="w-3.5 h-3.5" />
            Upload Photo
            <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
      </div>

      {/* Manual Verification Modal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-cyan-400" />
                Manual Facial Verification &amp; Check-In
              </h3>
              <button
                type="button"
                onClick={() => setIsManualModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 text-lg"
              >
                ✕
              </button>
            </div>

            {/* Visual Side-by-Side Comparison */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-950 rounded-xl border border-slate-800">
              <div className="text-center space-y-2">
                <span className="text-[11px] font-mono text-cyan-400 uppercase tracking-wider block">
                  Live Snapshot Frame
                </span>
                <div className="w-full aspect-square rounded-xl bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center">
                  {manualCapturedSnapshot ? (
                    <img
                      src={manualCapturedSnapshot}
                      alt="Live snapshot"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-xs text-slate-500">No frame captured</div>
                  )}
                </div>
              </div>

              <div className="text-center space-y-2">
                <span className="text-[11px] font-mono text-emerald-400 uppercase tracking-wider block">
                  Reference Enrollment Photo
                </span>
                <div className="w-full aspect-square rounded-xl bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center">
                  {manualSelectedStudent?.photoUrl ? (
                    <img
                      src={manualSelectedStudent.photoUrl}
                      alt="Reference student"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-xs text-slate-500">Select candidate</div>
                  )}
                </div>
              </div>
            </div>

            {/* Candidate Selector */}
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-300">
                Select Candidate from College Roster:
              </label>

              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={manualSearchQuery}
                  onChange={e => setManualSearchQuery(e.target.value)}
                  placeholder="Search candidate by name or roll number..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                {filteredManualCandidates.length === 0 ? (
                  <div className="text-center py-4 text-xs text-slate-500">
                    No matching students found in roster.
                  </div>
                ) : (
                  filteredManualCandidates.map(student => {
                    const isSelected = manualSelectedStudent?.id === student.id;
                    return (
                      <button
                        type="button"
                        key={student.id}
                        onClick={() => setManualSelectedStudent(student)}
                        className={`w-full flex items-center justify-between p-2 rounded-xl border text-left text-xs transition-all ${
                          isSelected
                            ? 'bg-cyan-950/70 border-cyan-500 text-cyan-200'
                            : 'bg-slate-950/50 border-slate-850 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <img
                            src={student.photoUrl}
                            alt={student.fullName}
                            className="w-7 h-7 rounded-lg object-cover border border-slate-700"
                          />
                          <div>
                            <span className="font-semibold">{student.fullName}</span>
                            <span className="text-[11px] text-slate-400 font-mono ml-2">
                              {student.rollNumber}
                            </span>
                          </div>
                        </div>
                        <span className="text-[11px] font-mono text-slate-400">{student.department}</span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setIsManualModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => handleConfirmManualVerify('late')}
                disabled={!manualSelectedStudent}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
              >
                Mark as Late
              </button>

              <button
                type="button"
                onClick={() => handleConfirmManualVerify('present')}
                disabled={!manualSelectedStudent}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl transition-colors shadow-md"
              >
                Verify &amp; Mark Present
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
