import { Award, Clock, Flame, TrendingUp, Trophy } from 'lucide-react';
import React, { useState } from 'react';

interface ProgressViewProps {
  overallProgress: number;
  streakDays: number;
  totalStudyHours: number;
  goalsCompleted?: number;
}

export const ProgressView: React.FC<ProgressViewProps> = ({
  overallProgress,
  streakDays,
  totalStudyHours,
  goalsCompleted = 0,
}) => {
  const [timeFilter, setTimeFilter] = useState<'1M' | '3M' | '6M' | '1Y'>('1M');

  const skills = [
    { name: 'Python', percent: overallProgress > 0 ? 90 : 0, color: 'from-blue-500 to-indigo-500' },
    { name: 'Data Science', percent: overallProgress > 0 ? 75 : 0, color: 'from-cyan-500 to-blue-500' },
    { name: 'Math', percent: overallProgress > 0 ? 80 : 0, color: 'from-emerald-500 to-cyan-500' },
    { name: 'Logic', percent: overallProgress > 0 ? 70 : 0, color: 'from-purple-500 to-pink-500' },
    { name: 'Communication', percent: overallProgress > 0 ? 85 : 0, color: 'from-purple-500 to-indigo-500' },
  ];

  const badges = [
    { title: 'Python Starter', desc: overallProgress > 0 ? 'Modules in progress' : '0/10 modules completed', icon: '🐍' },
    { title: 'Consistency Streak', desc: `${streakDays}/7 Days towards milestone`, icon: '🔥' },
    { title: 'Math Practice', desc: overallProgress > 0 ? 'Quiz attempted' : 'Take first trigonometry test', icon: '📐' },
    { title: 'First Project', desc: overallProgress > 0 ? 'Project active' : 'Choose a career to begin', icon: '🚀' },
  ];

  return (
    <div className="p-6 space-y-6 max-w-[1520px] mx-auto animate-in fade-in duration-300">
      {/* Header with Time Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Your Progress</h1>
          <p className="text-xs text-slate-400">Track your learning journey and achievements</p>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-[#14172f] rounded-xl border border-white/10">
          {(['1M', '3M', '6M', '1Y'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setTimeFilter(filter)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                timeFilter === filter
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Ring Progress */}
        <div className="rounded-3xl bg-[#14172f] border border-white/10 p-5 shadow-xl flex items-center gap-4">
          <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" stroke="#1c2146" strokeWidth="8" fill="transparent" />
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="#10b981"
                strokeWidth="8"
                strokeDasharray="251.2"
                strokeDashoffset={251.2 * (1 - overallProgress / 100)}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            <span className="absolute text-xs font-bold text-white">{overallProgress}%</span>
          </div>
          <div>
            <p className="text-xs font-bold text-white">Overall Progress</p>
            <p className="text-[10px] text-emerald-400 font-medium">On track for goals</p>
          </div>
        </div>

        {/* Metric 2: Goals */}
        <div className="rounded-3xl bg-[#14172f] border border-white/10 p-5 shadow-xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-extrabold text-white">{goalsCompleted}</p>
            <p className="text-xs text-slate-400 font-medium">Goals Completed</p>
          </div>
        </div>

        {/* Metric 3: Streak */}
        <div className="rounded-3xl bg-[#14172f] border border-white/10 p-5 shadow-xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-extrabold text-white">{streakDays}</p>
            <p className="text-xs text-slate-400 font-medium">Day Streak</p>
          </div>
        </div>

        {/* Metric 4: Hours */}
        <div className="rounded-3xl bg-[#14172f] border border-white/10 p-5 shadow-xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-extrabold text-white">{totalStudyHours}h</p>
            <p className="text-xs text-slate-400 font-medium">Total Study Time</p>
          </div>
        </div>
      </div>

      {/* Main Grid: Progress Overview Chart (7 cols) & Skill Breakdown (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Progress Overview Chart (7 cols) */}
        <div className="lg:col-span-7 rounded-3xl bg-[#14172f] border border-white/10 p-6 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-white">Progress Overview</h2>
            <span className="text-xs font-bold text-emerald-400">
              {overallProgress > 0 ? `+${overallProgress}% Growth` : '-- Growth'}
            </span>
          </div>

          {overallProgress > 0 ? (
            <div className="py-2">
              <div className="h-48 w-full relative">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 450 140">
                  <defs>
                    <linearGradient id="curveGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#a855f7" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#a855f7" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M 10 120 Q 100 110, 180 80 T 320 45 T 440 25 L 440 140 L 10 140 Z"
                    fill="url(#curveGlow)"
                  />
                  <path
                    d="M 10 120 Q 100 110, 180 80 T 320 45 T 440 25"
                    fill="none"
                    stroke="#c084fc"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 px-2 mt-2 font-medium">
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
                <span>Sun</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center my-auto flex-1">
              <TrendingUp className="w-8 h-8 text-slate-600 mb-2" />
              <p className="text-xs font-semibold text-slate-300">Progress Calibration Ready</p>
              <p className="text-[10px] text-slate-500 mt-1 max-w-[240px]">
                Complete daily study sessions and verified quizzes to generate your learning progression curve.
              </p>
            </div>
          )}
        </div>

        {/* Skill Breakdown (5 cols) */}
        <div className="lg:col-span-5 rounded-3xl bg-[#14172f] border border-white/10 p-6 shadow-xl flex flex-col justify-between">
          <h2 className="text-sm font-bold text-white mb-4">Skill Breakdown</h2>

          <div className="space-y-4 flex-1">
            {skills.map((s, idx) => (
              <div key={idx}>
                <div className="flex justify-between text-xs mb-1 font-medium">
                  <span className="text-slate-200">{s.name}</span>
                  <span className="text-slate-400 font-mono">{s.percent}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${s.color}`}
                    style={{ width: `${s.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Achievements Badges */}
      <div className="rounded-3xl bg-[#14172f] border border-white/10 p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            <h2 className="text-sm font-bold text-white">Achievements & Badges (12 Unlocked)</h2>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {badges.map((b, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-[#181d3d] border border-white/5 flex items-center gap-3"
            >
              <span className="text-2xl">{b.icon}</span>
              <div>
                <p className="text-xs font-bold text-white">{b.title}</p>
                <p className="text-[10px] text-slate-400">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
