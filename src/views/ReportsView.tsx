import { ArrowRight, CheckCircle2, Download, Trophy } from 'lucide-react';
import React, { useState } from 'react';
import { NavTab, TaskItem, UserProfile } from '../types/index.ts';

interface ReportsViewProps {
  onNavigate: (tab: NavTab) => void;
  user?: UserProfile;
  tasks?: TaskItem[];
  testsCount?: number;
  bestScore?: number;
  avgScore?: number;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  onNavigate,
  user,
  tasks = [],
  testsCount = 0,
  bestScore = 0,
  avgScore = 0,
}) => {
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const completedTasks = tasks.filter((t) => t.completed === 1).length;
  const totalTasks = tasks.length;
  const hasData = testsCount > 0 || totalTasks > 0;
  const safeBestScore = Math.min(100, Math.max(0, bestScore));
  const safeAvgScore = Math.min(100, Math.max(0, avgScore));
  const totalScorePct = testsCount > 0 ? safeAvgScore : (totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0);
  const displayName = user?.name ? user.name.split(' ')[0] : 'Student';

  const handleDownload = () => {
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
    window.print();
  };

  return (
    <div className="p-6 space-y-6 max-w-[1520px] mx-auto animate-in fade-in duration-300 print:bg-white print:text-black">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight print:text-black">
            Monthly Progress Recap & Reports
          </h1>
          <p className="text-xs text-slate-400 print:text-gray-600">
            Detailed insights about your learning performance, milestones, and verified test history
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 px-3 py-1.5 rounded-xl bg-[#14172f] border border-white/10">
            Cloud Sync Active
          </span>
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 text-xs font-bold text-white shadow-lg shadow-purple-500/20 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{downloadSuccess ? 'Downloaded!' : 'Download Report'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Performance Summary (6 cols) & Subject Performance (6 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Performance Summary (6 cols) */}
        <div className="lg:col-span-6 rounded-3xl bg-[#14172f] border border-white/10 p-6 shadow-xl flex flex-col justify-between">
          <h2 className="text-sm font-bold text-white mb-4">Performance Summary</h2>

          <div className="flex items-center gap-8 my-auto">
            {/* Real Ring */}
            <div className="relative w-32 h-32 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" stroke="#1c2146" strokeWidth="8" fill="transparent" />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="#38bdf8"
                  strokeWidth="8"
                  strokeDasharray="251.2"
                  strokeDashoffset={251.2 * (1 - (totalScorePct / 100))}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-extrabold text-white">
                  {hasData ? `${totalScorePct}%` : '--'}
                </span>
                <span className="text-[9px] text-slate-400 uppercase font-semibold">Total Score</span>
              </div>
            </div>

            {/* Checklist stats */}
            <div className="space-y-3 flex-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Goals Achieved</span>
                </span>
                <span className="font-bold text-white">{completedTasks} / {totalTasks}</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Topics Completed</span>
                </span>
                <span className="font-bold text-white">{completedTasks} / {totalTasks}</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Quizzes Taken</span>
                </span>
                <span className="font-bold text-white">{testsCount}</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Avg. Quiz Score</span>
                </span>
                <span className="font-bold text-white">
                  {testsCount > 0 ? `${avgScore}%` : '--'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Subject Performance Bar Chart (6 cols) */}
        <div className="lg:col-span-6 rounded-3xl bg-[#14172f] border border-white/10 p-6 shadow-xl flex flex-col justify-between">
          <h2 className="text-sm font-bold text-white mb-4">Subject Performance</h2>

          {testsCount > 0 ? (
            <div className="h-44 flex items-end justify-around gap-4 px-4 pb-2 border-b border-white/5 my-auto overflow-hidden">
              <div className="flex flex-col items-center gap-2 flex-1 h-full justify-end">
                <span className="text-xs font-bold text-purple-400">{safeBestScore}%</span>
                <div
                  className="w-full bg-purple-500 rounded-t-xl transition-all duration-500"
                  style={{ height: `${Math.max(12, Math.min(110, Math.round((safeBestScore / 100) * 110)))}px` }}
                />
                <span className="text-[11px] text-slate-300 font-medium">Math</span>
              </div>
              <div className="flex flex-col items-center gap-2 flex-1 h-full justify-end">
                <span className="text-xs font-bold text-cyan-400">{safeAvgScore}%</span>
                <div
                  className="w-full bg-cyan-500 rounded-t-xl transition-all duration-500"
                  style={{ height: `${Math.max(12, Math.min(110, Math.round((safeAvgScore / 100) * 110)))}px` }}
                />
                <span className="text-[11px] text-slate-300 font-medium">Science</span>
              </div>
              <div className="flex flex-col items-center gap-2 flex-1 h-full justify-end">
                <span className="text-xs font-bold text-emerald-400">{safeBestScore}%</span>
                <div
                  className="w-full bg-emerald-500 rounded-t-xl transition-all duration-500"
                  style={{ height: `${Math.max(12, Math.min(110, Math.round((safeBestScore / 100) * 110)))}px` }}
                />
                <span className="text-[11px] text-slate-300 font-medium">Programming</span>
              </div>
              <div className="flex flex-col items-center gap-2 flex-1 h-full justify-end">
                <span className="text-xs font-bold text-amber-400">{safeAvgScore}%</span>
                <div
                  className="w-full bg-amber-500 rounded-t-xl transition-all duration-500"
                  style={{ height: `${Math.max(12, Math.min(110, Math.round((safeAvgScore / 100) * 110)))}px` }}
                />
                <span className="text-[11px] text-slate-300 font-medium">General</span>
              </div>
            </div>
          ) : (
            <div className="h-44 flex flex-col items-center justify-center p-4 text-center my-auto">
              <Trophy className="w-8 h-8 text-slate-600 mb-2" />
              <p className="text-xs font-semibold text-slate-300">No tests taken yet</p>
              <p className="text-[10px] text-slate-500 mt-1 max-w-[240px]">
                Complete your first quiz to generate live performance statistics and subject analytics.
              </p>
              <button
                onClick={() => onNavigate('quizzes')}
                className="mt-3 px-3 py-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 text-[11px] font-semibold border border-purple-500/30 transition-all cursor-pointer"
              >
                Start a Quiz Now
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row: Key Insights & Suggested Focus */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-6 rounded-3xl bg-[#14172f] border border-white/10 p-6 shadow-xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white">Welcome, {displayName}!</h3>
            <p className="text-xs text-slate-300 mt-1">
              {hasData 
                ? `You have completed ${completedTasks} goals and ${testsCount} tests. Keep advancing towards your ${user?.careerInterest || 'learning'} ambitions!`
                : `Your verified progress account is active. Choose your study goals and complete quizzes to track your live learning journey.`}
            </p>
          </div>
        </div>

        <div className="lg:col-span-6 rounded-3xl bg-[#14172f] border border-white/10 p-6 shadow-xl flex items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider">
              Suggested Next Step
            </span>
            <p className="text-xs font-bold text-white mt-1">
              Explore tailored learning pathways and interactive mock assessments.
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Target career: <span className="text-indigo-300 font-semibold">{user?.careerInterest || 'AI & Computer Science'}</span>
            </p>
          </div>

          <button
            onClick={() => onNavigate('learning')}
            className="px-3.5 py-2 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-xs font-semibold text-indigo-200 flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
          >
            <span>Learn Now</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
