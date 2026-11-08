import {
  Bell,
  Compass,
  FileSpreadsheet,
  GraduationCap,
  HelpCircle,
  Home,
  Milestone,
  Settings,
  TrendingUp,
} from 'lucide-react';
import React from 'react';
import { NavTab } from '../../types/index.ts';

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  onOpenCompanion: (query?: string) => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  onOpenCompanion,
  isMobileOpen,
  onCloseMobile,
}) => {
  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'journey', label: 'My Journey', icon: Milestone },
    { id: 'career', label: 'Career Explorer', icon: Compass },
    { id: 'learning', label: 'Learning Hub', icon: GraduationCap },
    { id: 'quizzes', label: 'Quizzes & Tests', icon: HelpCircle },
    { id: 'progress', label: 'Progress', icon: TrendingUp },
    { id: 'reminders', label: 'Reminders', icon: Bell },
    { id: 'reports', label: 'Reports', icon: FileSpreadsheet },
    { id: 'settings', label: 'Settings', icon: Settings },
  ] as const;

  const content = (
    <aside className="w-60 min-h-[calc(100vh-4rem)] bg-[#0b0e1b] border-r border-white/5 flex flex-col justify-between p-3 shrink-0">
      {/* Navigation items list */}
      <nav className="space-y-1.5 pt-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as NavTab)}
              className={`w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-purple-600/90 to-indigo-600/90 text-white shadow-lg shadow-purple-500/20 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 transition-colors ${
                  isActive ? 'text-white' : 'text-slate-400'
                }`}
              />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Dream Big Mountain Card - 4K HD Visual */}
      <div 
        onDragStart={(e) => e.preventDefault()}
        className="mt-4 pt-1 select-none"
      >
        <button
          onClick={() => onOpenCompanion()}
          onDragStart={(e) => e.preventDefault()}
          className="w-full relative rounded-2xl overflow-hidden border border-white/10 shadow-lg group hover:border-purple-500/40 transition-all text-left cursor-pointer focus:outline-none aspect-[3/4] bg-[#0c0e1a] block select-none"
          title="Dream Big! Click to talk with MindPath Companion"
        >
          <img
            src="/assets/extracted/dream_big.png"
            alt="Dream Big! We're here to help you achieve it."
            draggable={false}
            loading="eager"
            decoding="async"
            onDragStart={(e) => e.preventDefault()}
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/assets/extracted/dream_big.svg';
            }}
            className="w-full h-full object-cover rounded-2xl pointer-events-none select-none group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0c0e1a]/40 to-transparent pointer-events-none" />
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <div className="hidden md:block shrink-0">
        {content}
      </div>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex animate-in fade-in">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs"
            onClick={onCloseMobile}
          />
          <div className="relative z-10 w-64 bg-[#0b0e1b] h-full shadow-2xl flex flex-col">
            {content}
          </div>
        </div>
      )}
    </>
  );
};
