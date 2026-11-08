import { AlertCircle, Bell, CheckCircle2, LogOut, Menu, Search, Sparkles, User } from 'lucide-react';
import React, { useState } from 'react';
import { NavTab, UserProfile } from '../../types/index.ts';
import { AILogo } from '../brand/AILogo.tsx';
import { BrandLogo } from '../brand/BrandLogo.tsx';

interface NavbarProps {
  user: UserProfile;
  onOpenCommand: () => void;
  onOpenCompanion: () => void;
  setActiveTab: (tab: NavTab) => void;
  onToggleMobileMenu?: () => void;
  onOpenCreateAccount?: () => void;
  onOpenAuth?: () => void;
  onOpenOnboardingTour?: () => void;
  onSignOut?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onOpenCommand,
  onOpenCompanion,
  setActiveTab,
  onToggleMobileMenu,
  onOpenCreateAccount,
  onOpenAuth,
  onOpenOnboardingTour,
  onSignOut,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    title: string;
    desc: string;
    time: string;
    unread: boolean;
  }>>([]);

  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <header className="h-16 border-b border-white/5 bg-[#0b0e1b] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40">
      {/* Brand & Companion Kicker */}
      <div className="flex items-center gap-3">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <button
          onClick={() => setActiveTab('home')}
          className="text-left cursor-pointer focus:outline-none"
        >
          <BrandLogo size="md" showText={true} />
        </button>
      </div>

      {/* Center Search Bar */}
      <div className="hidden sm:flex flex-1 max-w-xl mx-4 sm:mx-8">
        <button
          onClick={onOpenCommand}
          className="w-full flex items-center justify-between px-4 py-2 bg-[#14172f] hover:bg-[#1a1e3b] border border-white/10 rounded-full text-xs text-slate-400 transition-all cursor-pointer shadow-inner"
        >
          <div className="flex items-center gap-2.5">
            <Search className="w-4 h-4 text-slate-400" />
            <span>Search anything... (courses, careers, topics)</span>
          </div>
          <kbd className="px-2 py-0.5 rounded bg-[#1f244a] text-[10px] text-slate-300 font-mono border border-white/10">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-4">
        {/* Ask Companion Trigger */}
        <button
          onClick={() => onOpenCompanion()}
          className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-purple-600/20 via-indigo-600/20 to-cyan-500/20 border border-purple-500/30 text-xs font-semibold text-purple-200 hover:border-purple-400 hover:bg-purple-600/30 transition-all shadow-sm cursor-pointer"
        >
          <AILogo size="sm" pulse={true} />
          <span>Ask Companion</span>
        </button>

        {/* Sign In / Register Button (when not logged in) */}
        {!user.id && (
          <button
            onClick={onOpenAuth || onOpenCreateAccount}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white text-xs font-bold shadow-md shadow-purple-600/30 transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            <User className="w-3.5 h-3.5" />
            <span>Sign In / Register</span>
          </button>
        )}

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowProfileMenu(false);
            }}
            className="w-9 h-9 rounded-xl bg-[#14172f] hover:bg-[#1a1e3b] border border-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-colors relative cursor-pointer"
            aria-label="View notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-[9px] font-bold text-white flex items-center justify-center ring-2 ring-[#0c0e1a]">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-[#14172f] border border-white/15 rounded-2xl shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-2 border-b border-white/10 px-1">
                <span className="text-xs font-semibold text-white">Notifications</span>
                {notifications.length > 0 && (
                  <button
                    onClick={() => setNotifications(prev => prev.map(n => ({ ...n, unread: false })))}
                    className="text-[10px] text-indigo-400 cursor-pointer hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              {notifications.length === 0 ? (
                <div className="py-7 px-4 text-center">
                  <Bell className="w-7 h-7 text-slate-500 mx-auto mb-2 opacity-50" />
                  <p className="text-xs font-semibold text-slate-300">No new notifications</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">You're all caught up with your study targets!</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5 max-h-72 overflow-y-auto mt-1">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`py-2.5 px-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer ${
                        n.unread ? 'bg-indigo-950/20' : ''
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {n.unread ? (
                          <AlertCircle className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <div className="flex items-center justify-between w-full">
                            <p className="text-xs font-medium text-slate-200">{n.title}</p>
                            <span className="text-[10px] text-slate-500">{n.time}</span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">{n.desc}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* User Profile */}
        <div className="relative">
          <button
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
              setShowNotifications(false);
            }}
            className="flex items-center gap-2.5 cursor-pointer focus:outline-none"
          >
            <div className="relative">
              <img
                src={user.avatarUrl || '/assets/extracted/default_avatar.svg'}
                alt={user.name || 'User Avatar'}
                draggable={false}
                onDragStart={(e) => e.preventDefault()}
                className="w-9 h-9 rounded-full object-cover ring-2 ring-indigo-500/50 select-none pointer-events-none"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/assets/extracted/default_avatar.svg';
                }}
              />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#0c0e1a]" />
            </div>
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-[#14172f] border border-white/15 rounded-2xl shadow-2xl p-3 z-50">
              <div className="pb-2.5 border-b border-white/10 px-1">
                <p className="text-xs font-semibold text-white">{user.name || 'New Learner'}</p>
                <p className="text-[11px] text-slate-400 truncate">{user.email || 'Create account to get started'}</p>
                <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-emerald-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span>{user.streakDays || 0} Day Study Streak</span>
                </div>
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    setActiveTab('settings');
                    setShowProfileMenu(false);
                  }}
                  className="w-full text-left px-2 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                >
                  Profile & Settings
                </button>
                <button
                  onClick={() => {
                    setActiveTab('progress');
                    setShowProfileMenu(false);
                  }}
                  className="w-full text-left px-2 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                >
                  My Growth & Badges
                </button>
                <button
                  onClick={() => {
                    if (onOpenOnboardingTour) onOpenOnboardingTour();
                    setShowProfileMenu(false);
                  }}
                  className="w-full text-left px-2 py-1.5 text-xs text-cyan-300 hover:text-white hover:bg-cyan-600/20 rounded-lg transition-colors cursor-pointer flex items-center justify-between"
                >
                  <span>Guided Platform Tour</span>
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                </button>
                <div className="my-1 border-t border-white/10" />
                {user.id ? (
                  <button
                    onClick={() => {
                      if (onSignOut) onSignOut();
                      setShowProfileMenu(false);
                    }}
                    className="w-full text-left px-2 py-1.5 text-xs text-rose-300 hover:text-white hover:bg-rose-600/20 rounded-lg transition-colors cursor-pointer flex items-center justify-between"
                  >
                    <span>Sign Out</span>
                    <LogOut className="w-3.5 h-3.5 text-rose-400" />
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      if (onOpenAuth || onOpenCreateAccount) {
                        (onOpenAuth || onOpenCreateAccount)!();
                      }
                      setShowProfileMenu(false);
                    }}
                    className="w-full text-left px-2 py-1.5 text-xs text-indigo-300 hover:text-white hover:bg-indigo-600/20 rounded-lg transition-colors cursor-pointer flex items-center justify-between"
                  >
                    <span>Sign In / Register</span>
                    <User className="w-3.5 h-3.5 text-indigo-400" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
