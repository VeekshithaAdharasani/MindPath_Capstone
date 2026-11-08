import {
  AlertTriangle,
  Bell,
  Check,
  Database,
  Download,
  Eye,
  EyeOff,
  Info,
  Key,
  LogOut,
  RefreshCw,
  Shield,
  ShieldCheck,
  Smartphone,
  Upload,
  User,
} from 'lucide-react';
import React, { useState } from 'react';
import { UserProfile } from '../types/index.ts';

interface SettingsViewProps {
  user: UserProfile;
  onUpdateProfile: (updated: Partial<UserProfile>) => Promise<boolean>;
  onSignOut?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  user,
  onUpdateProfile,
  onSignOut,
}) => {
  const [activeTab, setActiveTab] = useState<'Profile Settings' | 'Learning Preferences' | 'Notifications' | 'Privacy & Security' | 'Data Sync' | 'About'>('Profile Settings');

  // Form states
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [educationLevel, setEducationLevel] = useState(user.educationLevel);
  const [careerInterest, setCareerInterest] = useState(user.careerInterest);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Learning preferences
  const [dailyTargetMin, setDailyTargetMin] = useState(30);
  const [pace, setPace] = useState('Moderate');

  // Notifications
  const [notifTasks, setNotifTasks] = useState(true);
  const [notifQuizzes, setNotifQuizzes] = useState(true);
  const [notifCheckins, setNotifCheckins] = useState(true);

  // Privacy & Security states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [changingPass, setChangingPass] = useState(false);
  const [passError, setPassError] = useState<string | null>(null);
  const [passSuccess, setPassSuccess] = useState(false);

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [aiMemoryEnabled, setAiMemoryEnabled] = useState(true);
  const [analyticsSharing, setAnalyticsSharing] = useState(true);
  const [recruiterVisibility, setRecruiterVisibility] = useState(false);
  const [downloadingData, setDownloadingData] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const ok = await onUpdateProfile({
      name,
      email,
      educationLevel,
      careerInterest,
      avatarUrl,
    });
    setSaving(false);
    if (ok) {
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    }
  };

  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setUploadingImage(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'x-user-id': user.id || 'anonymous_user',
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Failed to upload image');
      }

      setAvatarUrl(data.url);
      await onUpdateProfile({ avatarUrl: data.url });
    } catch (err: any) {
      setUploadError(err.message || 'Error uploading image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError(null);
    setPassSuccess(false);

    if (!currentPassword) {
      setPassError('Please enter your current password.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setPassError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassError('New passwords do not match. Please verify.');
      return;
    }

    setChangingPass(true);
    try {
      const res = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Failed to update password');
      }

      setPassSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPassSuccess(false), 4000);
    } catch (err: any) {
      setPassError(err.message || 'Error updating password');
    } finally {
      setChangingPass(false);
    }
  };

  const handleDownloadData = async () => {
    setDownloadingData(true);
    try {
      const res = await fetch('/api/user/export-data', {
        headers: { 'x-user-id': user.id },
      });
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mindpath-student-export-${user.id || 'data'}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setDownloadingData(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
          <span>Settings</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Customize your experience, manage account security, and configure learning preferences
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Navigation Sidebar */}
        <div className="space-y-1 bg-[#10142e] p-2 rounded-2xl border border-white/5 h-fit">
          <button
            onClick={() => setActiveTab('Profile Settings')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
              activeTab === 'Profile Settings'
                ? 'bg-purple-600 text-white font-semibold shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <User className="w-4 h-4 shrink-0" />
            <span>Profile Settings</span>
          </button>

          <button
            onClick={() => setActiveTab('Learning Preferences')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
              activeTab === 'Learning Preferences'
                ? 'bg-purple-600 text-white font-semibold shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <RefreshCw className="w-4 h-4 shrink-0" />
            <span>Learning Preferences</span>
          </button>

          <button
            onClick={() => setActiveTab('Notifications')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
              activeTab === 'Notifications'
                ? 'bg-purple-600 text-white font-semibold shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Bell className="w-4 h-4 shrink-0" />
            <span>Notifications</span>
          </button>

          <button
            onClick={() => setActiveTab('Privacy & Security')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
              activeTab === 'Privacy & Security'
                ? 'bg-purple-600 text-white font-semibold shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Shield className="w-4 h-4 shrink-0" />
            <span>Privacy &amp; Security</span>
          </button>

          <button
            onClick={() => setActiveTab('Data Sync')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
              activeTab === 'Data Sync'
                ? 'bg-purple-600 text-white font-semibold shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Database className="w-4 h-4 shrink-0" />
            <span>Data Sync</span>
          </button>

          <button
            onClick={() => setActiveTab('About')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
              activeTab === 'About'
                ? 'bg-purple-600 text-white font-semibold shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Info className="w-4 h-4 shrink-0" />
            <span>About</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="md:col-span-3 bg-[#10142e] p-6 rounded-2xl border border-white/5">
          {activeTab === 'Profile Settings' && (
            <div className="space-y-6">
              <h2 className="text-sm font-bold text-white mb-4">Profile Information</h2>

              <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#181d3d] border border-white/5">
                <div className="relative group">
                  <img
                    src={avatarUrl}
                    alt={name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-indigo-500/50 shadow-md bg-[#0c0e1a]"
                  />
                  {uploadingImage && (
                    <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent animate-spin rounded-full" />
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-xs font-bold text-white">{name}</h3>
                  <p className="text-[11px] text-slate-400 mb-2">{email}</p>
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-[10px] text-indigo-300 font-semibold transition-all">
                    <Upload className="w-3 h-3" />
                    <span>{uploadingImage ? 'Uploading...' : 'Change Profile Picture'}</span>
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/webp"
                      className="hidden"
                      onChange={handleImageFileChange}
                      disabled={uploadingImage}
                    />
                  </label>
                  {uploadError && (
                    <p className="text-[10px] text-rose-400 mt-1 font-medium">{uploadError}</p>
                  )}
                </div>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1.5">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full bg-[#181d3d] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1.5">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-[#181d3d] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1.5">
                    Educational Level
                  </label>
                  <select
                    value={educationLevel}
                    onChange={(e) => setEducationLevel(e.target.value)}
                    className="w-full bg-[#181d3d] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none cursor-pointer"
                  >
                    <option value="Class 10">Class 10</option>
                    <option value="Class 11">Class 11</option>
                    <option value="Class 12">Class 12</option>
                    <option value="Undergraduate B.Tech">Undergraduate B.Tech</option>
                    <option value="Graduate M.Tech">Graduate M.Tech</option>
                    <option value="Working Professional">Working Professional</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1.5">
                    Career Interest
                  </label>
                  <select
                    value={careerInterest}
                    onChange={(e) => setCareerInterest(e.target.value)}
                    className="w-full bg-[#181d3d] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none cursor-pointer"
                  >
                    <option value="Computer Science">Computer Science</option>
                    <option value="AI & Machine Learning">AI & Machine Learning</option>
                    <option value="Data Science">Data Science</option>
                    <option value="Medical & Bio-Computing">Medical & Bio-Computing</option>
                    <option value="Software Engineering">Software Engineering</option>
                  </select>
                </div>

                <div className="pt-3 flex items-center justify-between">
                  {savedSuccess ? (
                    <span className="text-xs text-emerald-400 flex items-center gap-1.5 font-medium">
                      <Check className="w-4 h-4" />
                      <span>Changes saved successfully!</span>
                    </span>
                  ) : (
                    <span />
                  )}

                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 text-xs font-bold text-white shadow-lg shadow-purple-500/20 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>

              {/* Account Session / Sign Out Section */}
              <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-white">Account Session</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {user.id ? `Signed in as ${user.email || user.name}` : 'Currently exploring as guest learner'}
                  </p>
                </div>
                {onSignOut && (
                  <button
                    type="button"
                    onClick={onSignOut}
                    className="px-4 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 hover:text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {activeTab === 'Learning Preferences' && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-white mb-4">Learning Preferences</h2>
              <div>
                <label className="text-xs text-slate-300 block mb-1">
                  Daily Study Goal: <span className="font-bold text-cyan-400">{dailyTargetMin} minutes</span>
                </label>
                <input
                  type="range"
                  min="15"
                  max="120"
                  step="5"
                  value={dailyTargetMin}
                  onChange={(e) => setDailyTargetMin(Number(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">Pace</label>
                <select
                  value={pace}
                  onChange={(e) => setPace(e.target.value)}
                  className="w-full bg-[#181d3d] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option>Relaxed (1-2 topics/week)</option>
                  <option>Moderate (3-4 topics/week)</option>
                  <option>Intensive Sprint (Daily topics & tests)</option>
                </select>
              </div>
            </div>
          )}

          {activeTab === 'Notifications' && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-white mb-4">Notification Alerts</h2>
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#181d3d]">
                <div>
                  <p className="text-xs font-bold text-white">Daily Tasks & Assignment Reminders</p>
                  <p className="text-[10px] text-slate-400">Receive alerts before due times</p>
                </div>
                <input
                  type="checkbox"
                  checked={notifTasks}
                  onChange={() => setNotifTasks(!notifTasks)}
                  className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-[#181d3d]">
                <div>
                  <p className="text-xs font-bold text-white">Weekly Quizzes & Mock Exams</p>
                  <p className="text-[10px] text-slate-400">Scheduled test announcements</p>
                </div>
                <input
                  type="checkbox"
                  checked={notifQuizzes}
                  onChange={() => setNotifQuizzes(!notifQuizzes)}
                  className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-[#181d3d]">
                <div>
                  <p className="text-xs font-bold text-white">Proactive AI Companion Check-ins</p>
                  <p className="text-[10px] text-slate-400">Encouragement when streak is active</p>
                </div>
                <input
                  type="checkbox"
                  checked={notifCheckins}
                  onChange={() => setNotifCheckins(!notifCheckins)}
                  className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                />
              </div>
            </div>
          )}

          {activeTab === 'Privacy & Security' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-sm font-bold text-white">Privacy &amp; Security Settings</h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Manage your credentials, authentication security, AI data retention, and student privacy controls.
                </p>
              </div>

              {/* 1. Change Password Section */}
              <div className="p-4 rounded-2xl bg-[#181d3d] border border-white/10 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-white border-b border-white/5 pb-2.5">
                  <Key className="w-4 h-4 text-purple-400" />
                  <span>Update Account Password</span>
                </div>

                <form onSubmit={handleChangePassword} className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-300 font-medium block mb-1">
                      Current Password
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrentPass ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-[#11142c] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 pr-9"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPass(!showCurrentPass)}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white cursor-pointer"
                      >
                        {showCurrentPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-300 font-medium block mb-1">
                        New Password (min 6 chars)
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPass ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-[#11142c] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 pr-9"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPass(!showNewPass)}
                          className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white cursor-pointer"
                        >
                          {showNewPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-slate-300 font-medium block mb-1">
                        Confirm New Password
                      </label>
                      <input
                        type={showNewPass ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-[#11142c] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>

                  {passError && (
                    <p className="text-[11px] text-rose-400 flex items-center gap-1.5 font-medium">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>{passError}</span>
                    </p>
                  )}

                  {passSuccess && (
                    <p className="text-[11px] text-emerald-400 flex items-center gap-1.5 font-medium">
                      <Check className="w-3.5 h-3.5 shrink-0" />
                      <span>Password changed successfully and encrypted with scrypt!</span>
                    </p>
                  )}

                  <div className="pt-1 flex justify-end">
                    <button
                      type="submit"
                      disabled={changingPass}
                      className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 text-xs font-bold text-white shadow-md disabled:opacity-50 transition-all cursor-pointer"
                    >
                      {changingPass ? 'Updating...' : 'Change Password'}
                    </button>
                  </div>
                </form>
              </div>

              {/* 2. Two-Factor Authentication & Account Shield */}
              <div className="p-4 rounded-2xl bg-[#181d3d] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-cyan-400" />
                    <div>
                      <p className="text-xs font-bold text-white">Two-Factor Authentication (2FA)</p>
                      <p className="text-[10px] text-slate-400">
                        Add an extra layer of security when signing in to your MindPath account
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      twoFactorEnabled ? 'bg-cyan-500' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        twoFactorEnabled ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* 3. Active Sessions */}
              <div className="p-4 rounded-2xl bg-[#181d3d] border border-white/10 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-white border-b border-white/5 pb-2">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span>Active Sessions</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <div>
                      <p className="font-semibold text-white">Current Browser Session</p>
                      <p className="text-[10px] text-slate-400 font-mono">Windows 11 • Active Now</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    This Device
                  </span>
                </div>
              </div>

              {/* 4. AI Companion & Learning Data Privacy */}
              <div className="p-4 rounded-2xl bg-[#181d3d] border border-white/10 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-white border-b border-white/5 pb-2">
                  <Shield className="w-4 h-4 text-indigo-400" />
                  <span>AI Learning Memory &amp; Privacy Controls</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div>
                    <p className="font-semibold text-white">AI Learning Memory Retention</p>
                    <p className="text-[10px] text-slate-400">
                      Allows MindPath Companion to remember your study habits and previous doubts across sessions
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={aiMemoryEnabled}
                    onChange={() => setAiMemoryEnabled(!aiMemoryEnabled)}
                    className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-white/5">
                  <div>
                    <p className="font-semibold text-white">Anonymized Academic Analytics</p>
                    <p className="text-[10px] text-slate-400">
                      Helps benchmark curriculum pace without sharing your personal identity
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={analyticsSharing}
                    onChange={() => setAnalyticsSharing(!analyticsSharing)}
                    className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-white/5">
                  <div>
                    <p className="font-semibold text-white">Verified Recruiter Visibility</p>
                    <p className="text-[10px] text-slate-400">
                      Allow vetted tech recruiters to view your verified quiz badges and career milestones
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={recruiterVisibility}
                    onChange={() => setRecruiterVisibility(!recruiterVisibility)}
                    className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                  />
                </div>
              </div>

              {/* 5. Export Personal Data */}
              <div className="p-4 rounded-2xl bg-[#181d3d] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-bold text-white">Export Learning Records</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Download a full JSON archive containing your milestones, tasks, and quiz assessments.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadData}
                  disabled={downloadingData}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-slate-200 hover:text-white text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-sm shrink-0"
                >
                  <Download className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{downloadingData ? 'Exporting...' : 'Export JSON Data'}</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'Data Sync' && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-white mb-4">MindPath Cloud Infrastructure Status</h2>
              <div className="p-4 rounded-2xl bg-[#181d3d] border border-emerald-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400">● MindPath Cloud Database</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full">
                    Connected
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 font-mono">
                  Endpoint: cloud-db.mindpath.ai
                </p>
                <p className="text-[10px] text-slate-400">
                  Real-time sync for tasks, milestones, quiz attempts, and student profile.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#181d3d] border border-cyan-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-400">● MindPath Secure Asset Vault</span>
                  <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full">
                    Active
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 font-mono">
                  Endpoint: vault.mindpath.ai
                </p>
                <p className="text-[10px] text-slate-400">
                  Encrypted storage for avatars, documents, and verified study certificates.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#181d3d] border border-purple-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-400">● MindPath AI Intelligence Engine</span>
                  <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">
                    Active • High Throughput
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 font-mono">
                  Engine: MindPath-Ultra-550B Live Neural Core
                </p>
                <p className="text-[10px] text-slate-400">
                  Real-time academic analysis, 2026 web intelligence, and personalized mentoring.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'About' && (
            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <h2 className="text-sm font-bold text-white mb-2">About MindPath AI Companion</h2>
              <p>
                MindPath is an intelligent, student-centered companion system designed to understand individual journeys, guide academic learning, explore career possibilities, and continuously adapt roadmaps.
              </p>
              <p>
                Designed according to the Personalized AI Companion blueprint featuring Coordinator, Memory, Scenario, Decision, Planning, Learning, and Quiz agents.
              </p>
              <div className="p-3 rounded-xl bg-[#181d3d] border border-white/10 mt-3 text-[11px] text-slate-400">
                Version 1.0.0 • MindPath Academic & Career Platform • All Rights Reserved
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
