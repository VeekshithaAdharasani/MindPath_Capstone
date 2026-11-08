import { ArrowRight, Compass, Eye, EyeOff, Flame, HelpCircle, Lock, Mail, ShieldCheck, User, X } from 'lucide-react';
import React, { useState } from 'react';
import { AILogo } from '../components/brand/AILogo.tsx';
import { BrandLogo } from '../components/brand/BrandLogo.tsx';
import { FeatureShowcaseSlider } from '../components/home/FeatureShowcaseSlider.tsx';
import { UserProfile } from '../types/index.ts';

interface AuthViewProps {
  onAuthenticated: (user: UserProfile, isNewRegistration?: boolean) => void;
  onClose?: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onAuthenticated, onClose }) => {
  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [educationLevel, setEducationLevel] = useState('College Undergrad');
  const [careerInterest, setCareerInterest] = useState('AI & Data Science');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'register') {
      if (!name.trim() || !email.trim()) {
        setError('Please provide your name and email address.');
        return;
      }
      if (!password || password.length < 6) {
        setError('Password must be at least 6 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match. Please re-enter.');
        return;
      }
    }

    if (mode === 'login') {
      if (!email.trim()) {
        setError('Please enter your email address to sign in.');
        return;
      }
      if (!password) {
        setError('Please enter your password to sign in.');
        return;
      }
    }

    setLoading(true);

    try {
      const endpoint = mode === 'register' ? '/api/user/create' : '/api/user/login';
      const body = mode === 'register'
        ? {
            name: name.trim(),
            email: email.trim(),
            password,
            educationLevel,
            careerInterest,
          }
        : { 
            email: email.trim(),
            password,
          };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Authentication failed. Please verify your details.');
      }

      onAuthenticated(data.user, mode === 'register');
    } catch (err: any) {
      setError(err?.message || 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

  const _featurePills = [
    {
      title: 'MindPath AI Companion',
      desc: 'Real-time 2026 web search, math reasoning & customized roadmaps',
      icon: <AILogo size="sm" pulse={false} />,
      color: 'from-emerald-500/20 to-cyan-500/20 border-cyan-500/30 text-cyan-300',
    },
    {
      title: 'Daily Consistency Heatmap',
      desc: 'Build habits and milestone badges with visual streak tracking',
      icon: <Flame className="w-4 h-4 text-amber-400" />,
      color: 'from-amber-500/20 to-rose-500/20 border-amber-500/30 text-amber-300',
    },
    {
      title: 'Career & Industry Explorer',
      desc: 'Interactive role comparisons, verified salary data, and target skills',
      icon: <Compass className="w-4 h-4 text-indigo-400" />,
      color: 'from-indigo-500/20 to-purple-500/20 border-indigo-500/30 text-indigo-300',
    },
    {
      title: 'Adaptive Quizzes & Mock Tests',
      desc: 'Timed subject challenges with instant explanations and scorecards',
      icon: <HelpCircle className="w-4 h-4 text-purple-400" />,
      color: 'from-purple-500/20 to-pink-500/20 border-purple-500/30 text-purple-300',
    },
  ];

  return (
    <div className="min-h-screen bg-[#080a14] text-slate-100 flex flex-col justify-between relative overflow-hidden select-none">
      {/* Background Neon Aura Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[550px] h-[550px] bg-purple-600/15 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute top-[40%] right-[30%] w-[350px] h-[350px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Top Header */}
      <header className="px-6 py-5 max-w-7xl mx-auto w-full flex items-center justify-between relative z-10">
        <BrandLogo size="lg" showText={true} />
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            MindPath Cloud Sync
          </span>
          {onClose && (
            <button
              onClick={onClose}
              type="button"
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer border border-white/10 flex items-center gap-1.5 text-xs font-bold"
            >
              <X className="w-4 h-4 text-slate-400" />
              <span className="hidden sm:inline">Back to Home</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 flex-1 flex items-center relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center w-full">
          {/* Left Column: Interactive 5-Slide Animated Showcase */}
          <div className="lg:col-span-6 space-y-5">
            <FeatureShowcaseSlider />
          </div>

          {/* Right Column: Auth Form Card */}
          <div className="lg:col-span-6 flex justify-center">
            <div className="w-full max-w-md bg-[#12152d]/90 border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative">
              {/* Outer glow aura */}
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-cyan-500/20 rounded-3xl blur-xl pointer-events-none -z-10" />

              {/* Mode Switcher Tabs */}
              <div className="flex items-center p-1 bg-[#181d3d] rounded-2xl border border-white/10 mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setError(null);
                  }}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    mode === 'register'
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Create Account
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                  }}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    mode === 'login'
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Sign In
                </button>
              </div>

              {/* Form Title & Subtitle */}
              <div className="mb-5">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  {mode === 'register' ? 'Get Started with MindPath' : 'Welcome Back'}
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  {mode === 'register'
                    ? 'Create your free account to track your study streaks and learning roadmap.'
                    : 'Enter your registered email address to access your personal dashboard.'}
                </p>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Authentication Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'register' && (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter your full name"
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-[#181d3d] border border-white/10 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="student@example.com"
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-[#181d3d] border border-white/10 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Password Field (Required for both Register and Sign In) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[11px] font-semibold text-slate-300">
                      Password
                    </label>
                    {mode === 'register' && (
                      <span className="text-[10px] text-slate-400">Min. 6 characters</span>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={mode === 'register' ? 'Create a secure password' : 'Enter your password'}
                      className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-[#181d3d] border border-white/10 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-white transition-colors cursor-pointer"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password (Register only) */}
                {mode === 'register' && (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter your password"
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-[#181d3d] border border-white/10 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>
                  </div>
                )}

                {mode === 'register' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
                        Education Level
                      </label>
                      <select
                        value={educationLevel}
                        onChange={(e) => setEducationLevel(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl bg-[#181d3d] border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
                      >
                        <option value="Class 10">Class 10</option>
                        <option value="Class 11">Class 11</option>
                        <option value="Class 12">Class 12</option>
                        <option value="College Undergrad">College Undergrad</option>
                        <option value="Graduate / Post-Grad">Graduate / Post-Grad</option>
                        <option value="Working Professional">Working Professional</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
                        Career Interest
                      </label>
                      <select
                        value={careerInterest}
                        onChange={(e) => setCareerInterest(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl bg-[#181d3d] border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
                      >
                        <option value="AI & Data Science">AI & Data Science</option>
                        <option value="Computer Science">Computer Science</option>
                        <option value="Software Engineering">Software Engineering</option>
                        <option value="Medicine & Healthcare">Medicine & Healthcare</option>
                        <option value="Business & Finance">Business & Finance</option>
                        <option value="General Science">General Science</option>
                      </select>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-xs font-bold text-white shadow-xl shadow-purple-500/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer disabled:opacity-50 mt-2"
                >
                  {loading ? (
                    <span>Creating your secure workspace...</span>
                  ) : mode === 'register' ? (
                    <>
                      <span>Create Account & Start Learning</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      <span>Sign In to Your Workspace</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Privacy & Security Footnote */}
              <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Scoped user isolation</span>
                </span>
                <span>End-to-End Encrypted</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 border-t border-white/5 max-w-7xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-2 relative z-10">
        <p>© 2026 MindPath AI. Empowering lifelong learning and career trajectories.</p>
        <div className="flex items-center gap-4">
          <span>MindPath Cloud Engine</span>
          <span>MindPath Encrypted Vault</span>
          <span>MindPath Neural Core</span>
        </div>
      </footer>
    </div>
  );
};

