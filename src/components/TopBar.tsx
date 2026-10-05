import React from 'react';
import { Camera, Maximize2, Minimize2, UserPlus, Settings } from 'lucide-react';

export type NavTab = 'kiosk' | 'desk' | 'students' | 'reports' | 'settings';

interface TopBarProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onOpenEnrollModal: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentTab,
  onTabChange,
  onOpenEnrollModal,
  isFullscreen,
  onToggleFullscreen,
}) => {
  return (
    <header className="no-print flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
      {/* Zone 1: Single text element wordmark */}
      <button
        onClick={() => onTabChange('kiosk')}
        className="text-lg font-bold tracking-tight text-slate-100 font-display hover:text-cyan-400 transition-colors cursor-pointer text-left"
      >
        KHIT SmartFRS
      </button>

      {/* Zone 2: 4-5 clean text navigation links */}
      <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-400">
        <button
          onClick={() => onTabChange('kiosk')}
          className={`hover:text-slate-100 transition-colors whitespace-nowrap ${
            currentTab === 'kiosk' ? 'text-cyan-400 font-semibold border-b-2 border-cyan-400 pb-0.5' : ''
          }`}
        >
          Live Kiosk
        </button>
        <button
          onClick={() => onTabChange('desk')}
          className={`hover:text-slate-100 transition-colors whitespace-nowrap ${
            currentTab === 'desk' ? 'text-cyan-400 font-semibold border-b-2 border-cyan-400 pb-0.5' : ''
          }`}
        >
          Daily Desk
        </button>
        <button
          onClick={() => onTabChange('students')}
          className={`hover:text-slate-100 transition-colors whitespace-nowrap ${
            currentTab === 'students' ? 'text-cyan-400 font-semibold border-b-2 border-cyan-400 pb-0.5' : ''
          }`}
        >
          Students Registry
        </button>
        <button
          onClick={() => onTabChange('reports')}
          className={`hover:text-slate-100 transition-colors whitespace-nowrap ${
            currentTab === 'reports' ? 'text-cyan-400 font-semibold border-b-2 border-cyan-400 pb-0.5' : ''
          }`}
        >
          Reports &amp; Analytics
        </button>
        <button
          onClick={() => onTabChange('settings')}
          className={`hover:text-slate-100 transition-colors whitespace-nowrap ${
            currentTab === 'settings' ? 'text-cyan-400 font-semibold border-b-2 border-cyan-400 pb-0.5' : ''
          }`}
        >
          Kiosk Config
        </button>
      </nav>

      {/* Zone 3: 1-2 primary actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenEnrollModal}
          className="px-3.5 py-1.5 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 shadow-sm"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Enroll Student</span>
        </button>

        <button
          onClick={onToggleFullscreen}
          className="p-2 text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 rounded-lg transition-colors"
          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Kiosk Mode'}
        >
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>
      </div>
    </header>
  );
};
