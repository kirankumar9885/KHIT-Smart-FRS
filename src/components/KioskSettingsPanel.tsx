import React from 'react';
import { Sliders, ShieldCheck, MapPin, Volume2, Clock, CheckCircle } from 'lucide-react';
import { KioskSettings } from '../types';

interface KioskSettingsPanelProps {
  settings: KioskSettings;
  onUpdateSettings: (settings: KioskSettings) => void;
  totalStudentsCount: number;
  totalRecordsCount: number;
  onClearAllData: () => void;
}

export const KioskSettingsPanel: React.FC<KioskSettingsPanelProps> = ({
  settings,
  onUpdateSettings,
  totalStudentsCount,
  totalRecordsCount,
  onClearAllData,
}) => {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="p-6 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-6">
        <div className="border-b border-slate-800 pb-4">
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            FRS Biometric Kiosk Configuration
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Configure facial recognition thresholds, liveness challenges, and campus deployment locations.
          </p>
        </div>

        <div className="space-y-5 text-xs">
          {/* Location Setting */}
          <div>
            <label className="block text-slate-300 font-medium mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-cyan-400" />
              Kiosk Installation Location
            </label>
            <input
              type="text"
              value={settings.kioskLocation}
              onChange={e => onUpdateSettings({ ...settings, kioskLocation: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-cyan-500"
              placeholder="e.g. Main Academic Block - Gate 1, CSE Seminar Hall"
            />
          </div>

          {/* Active Period */}
          <div>
            <label className="block text-slate-300 font-medium mb-1.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              Academic Attendance Session
            </label>
            <select
              value={settings.selectedPeriod}
              onChange={e => onUpdateSettings({ ...settings, selectedPeriod: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-cyan-500"
            >
              <option value="Morning General Entry (08:30 - 09:30 AM)">
                Morning General Entry (08:30 - 09:30 AM)
              </option>
              <option value="Period 1: Mathematics & Computing (09:30 - 10:30 AM)">
                Period 1: Mathematics &amp; Computing (09:30 - 10:30 AM)
              </option>
              <option value="Period 2: Data Structures & Algorithms (10:30 - 11:30 AM)">
                Period 2: Data Structures &amp; Algorithms (10:30 - 11:30 AM)
              </option>
              <option value="Afternoon Laboratory Session (01:30 - 04:30 PM)">
                Afternoon Laboratory Session (01:30 - 04:30 PM)
              </option>
            </select>
          </div>

          {/* Confidence Threshold Slider */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-slate-300 font-medium">Biometric Match Confidence Threshold</label>
              <span className="font-mono text-cyan-400 font-bold">{settings.confidenceThreshold}%</span>
            </div>
            <input
              type="range"
              min="60"
              max="98"
              step="1"
              value={settings.confidenceThreshold}
              onChange={e =>
                onUpdateSettings({ ...settings, confidenceThreshold: Number(e.target.value) })
              }
              className="w-full accent-cyan-500 bg-slate-950 rounded-lg cursor-pointer"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Minimum similarity score required to mark attendance automatically. Recommended: 80%+.
            </p>
          </div>

          {/* Cooldown Delays */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-slate-300 font-medium">Scan Cooldown Delay</label>
              <span className="font-mono text-cyan-400 font-bold">{settings.cooldownSeconds}s</span>
            </div>
            <input
              type="range"
              min="2"
              max="15"
              step="1"
              value={settings.cooldownSeconds}
              onChange={e =>
                onUpdateSettings({ ...settings, cooldownSeconds: Number(e.target.value) })
              }
              className="w-full accent-cyan-500 bg-slate-950 rounded-lg cursor-pointer"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Prevents duplicate consecutive scans of the same student standing in queue.
            </p>
          </div>

          {/* Toggle Switches */}
          <div className="pt-2 border-t border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium text-slate-200 block">Auto Check-In on Face Lock</span>
                <span className="text-[11px] text-slate-500">
                  Automatically marks attendance after holding face in oval for 1 second.
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.autoCapture}
                onChange={e => onUpdateSettings({ ...settings, autoCapture: e.target.checked })}
                className="w-4 h-4 accent-cyan-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium text-slate-200 block">Liveness &amp; Anti-Spoofing</span>
                <span className="text-[11px] text-slate-500">
                  Rejects printed photos and smartphone screen replay attacks.
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.enableLivenessCheck}
                onChange={e =>
                  onUpdateSettings({ ...settings, enableLivenessCheck: e.target.checked })
                }
                className="w-4 h-4 accent-cyan-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium text-slate-200 block">Audio Feedback Chimes</span>
                <span className="text-[11px] text-slate-500">
                  Plays affirmative sound on check-in and alert buzz on unknown/spoof face.
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.soundFeedback}
                onChange={e =>
                  onUpdateSettings({ ...settings, soundFeedback: e.target.checked })
                }
                className="w-4 h-4 accent-cyan-500 cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Database Management & Clean Reset Card */}
      <div className="p-6 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-4">
        <div>
          <h4 className="text-sm font-bold text-slate-200">Database &amp; Storage Maintenance</h4>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage biometric templates, campus rosters, and active attendance logs.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 p-3 bg-slate-950 rounded-xl border border-slate-850 text-xs font-mono">
          <div>
            <span className="text-slate-500 block text-[10px] uppercase">Enrolled Students</span>
            <span className="text-slate-200 font-bold text-base">{totalStudentsCount}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase">Logged Attendance</span>
            <span className="text-slate-200 font-bold text-base">{totalRecordsCount}</span>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-between">
          <div className="text-xs text-slate-400 max-w-sm">
            Erase all registered students and attendance logs to start fresh with a clean database.
          </div>
          <button
            type="button"
            onClick={onClearAllData}
            className="px-4 py-2 bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-200 text-xs font-semibold rounded-xl transition-colors whitespace-nowrap"
          >
            Clear All Data
          </button>
        </div>
      </div>
    </div>
  );
};
