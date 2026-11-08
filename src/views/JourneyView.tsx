import { ArrowRight, Flame, Star, Target, TrendingUp, Trophy } from 'lucide-react';
import React, { useState } from 'react';
import { NavTab } from '../types/index.ts';

interface JourneyViewProps {
  onNavigate: (tab: NavTab) => void;
  onOpenCompanion: () => void;
  streakDays?: number;
  goalsCompleted?: number;
  overallProgress?: number;
}

export const JourneyView: React.FC<JourneyViewProps> = ({
  onNavigate,
  onOpenCompanion,
  streakDays = 0,
  goalsCompleted = 0,
  overallProgress = 0,
}) => {
  const [timeRange, setTimeRange] = useState('Last 6 Months');

  return (
    <div className="p-6 space-y-6 max-w-[1520px] mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">My Journey</h1>
        <p className="text-xs text-slate-400">Track your complete journey and milestones</p>
      </div>

      {/* Top 3 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="rounded-3xl bg-[#14172f] border border-white/10 p-5 shadow-xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-extrabold text-white">{goalsCompleted}</p>
            <p className="text-xs text-slate-400 font-medium">Goals Achieved</p>
          </div>
        </div>

        <div className="rounded-3xl bg-[#14172f] border border-white/10 p-5 shadow-xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
            <Star className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-extrabold text-white">{overallProgress}%</p>
            <p className="text-xs text-slate-400 font-medium">Overall Progress</p>
          </div>
        </div>

        <div className="rounded-3xl bg-[#14172f] border border-white/10 p-5 shadow-xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-extrabold text-white">{streakDays}</p>
            <p className="text-xs text-slate-400 font-medium">Day Streak</p>
          </div>
        </div>
      </div>

      {/* Main Grid: Journey Timeline (Left) & Your Growth (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Journey Timeline (6 cols) */}
        <div className="lg:col-span-6 rounded-3xl bg-[#14172f] border border-white/10 p-6 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-purple-400" />
              <h2 className="text-sm font-bold text-white">Journey Timeline</h2>
            </div>
          </div>

          <div className="relative pl-6 space-y-6 flex-1">
            {/* Vertical glowing path */}
            <div className="absolute left-2.5 top-3 bottom-4 w-0.5 bg-gradient-to-b from-emerald-500 via-indigo-500 to-amber-500" />

            {/* Node 1 */}
            <div className="relative flex items-center gap-4">
              <span className="absolute -left-6 top-1.5 w-4 h-4 rounded-full bg-emerald-400 ring-4 ring-emerald-500/20" />
              <div className="flex-1 p-3.5 rounded-2xl bg-[#181d3d] border border-white/5">
                <p className="text-xs font-bold text-white">Account Created</p>
                <p className="text-[11px] text-slate-400">Ready to embark on your learning journey</p>
              </div>
            </div>

            {/* Node 2 */}
            <div className="relative flex items-center gap-4">
              <span className="absolute -left-6 top-1.5 w-4 h-4 rounded-full bg-cyan-400 ring-4 ring-cyan-500/20" />
              <div className="flex-1 p-3.5 rounded-2xl bg-[#181d3d] border border-white/5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-white">Choose Career Goal</p>
                  <p className="text-[11px] text-slate-400">Explore market trends & high-growth roles</p>
                </div>
                <button
                  onClick={() => onNavigate('career')}
                  className="px-2.5 py-1 rounded-full bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-[10px] font-bold text-indigo-300 flex items-center gap-1 transition-all cursor-pointer"
                >
                  <span>Explore</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Node 3 */}
            <div className="relative flex items-center gap-4">
              <span className="absolute -left-6 top-1.5 w-4 h-4 rounded-full bg-purple-500 ring-4 ring-purple-500/20 flex items-center justify-center text-[10px] font-bold text-white">
                3
              </span>
              <div className="flex-1 p-3.5 rounded-2xl bg-[#181d3d] border border-white/5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-white">Complete First Quiz</p>
                  <p className="text-[11px] text-slate-400">Verify your subject skills with mock tests</p>
                </div>
                <button
                  onClick={() => onNavigate('quizzes')}
                  className="px-2.5 py-1 rounded-full bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-[10px] font-bold text-purple-300 flex items-center gap-1 transition-all cursor-pointer"
                >
                  <span>Quiz</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Node 4 (Current Goal) */}
            <div className="relative flex items-center gap-4">
              <span className="absolute -left-6 top-1.5 w-4 h-4 rounded-full bg-amber-400 ring-4 ring-amber-500/20" />
              <div className="flex-1 p-3.5 rounded-2xl bg-[#181d3d] border border-amber-500/30 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-semibold text-amber-300 uppercase tracking-wider">
                    Target Milestone
                  </span>
                  <p className="text-xs font-bold text-white">7-Day Consistency Badge</p>
                </div>
                <span className="text-[11px] text-amber-400 font-bold">{streakDays} / 7 Days</span>
              </div>
            </div>
          </div>
        </div>

        {/* Your Growth (6 cols) */}
        <div className="lg:col-span-6 rounded-3xl bg-[#14172f] border border-white/10 p-6 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-white">Your Growth</h2>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="bg-[#181d3d] border border-white/10 text-xs text-slate-300 rounded-xl px-3 py-1 focus:outline-none cursor-pointer"
            >
              <option>Last 6 Months</option>
              <option>Last 3 Months</option>
              <option>This Year</option>
            </select>
          </div>

          {/* Growth Area Chart */}
          {overallProgress > 0 ? (
            <>
              <div className="py-4">
                <div className="h-44 w-full relative">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 400 120">
                    <defs>
                      <linearGradient id="growthGlow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#818cf8" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#818cf8" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M 10 110 Q 80 100, 150 75 T 280 40 T 390 15 L 390 120 L 10 120 Z"
                      fill="url(#growthGlow)"
                    />
                    <path
                      d="M 10 110 Q 80 100, 150 75 T 280 40 T 390 15"
                      fill="none"
                      stroke="#818cf8"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 px-2 mt-2 font-medium">
                  <span>Month 1</span>
                  <span>Month 2</span>
                  <span>Month 3</span>
                  <span>Month 4</span>
                  <span>Month 5</span>
                  <span>Current</span>
                </div>
              </div>

              {/* Key Insights Strip */}
              <div className="pt-4 border-t border-white/5">
                <p className="text-xs font-semibold text-slate-300 mb-2">Key Insights</p>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">↑ {overallProgress}%</span>
                    <span className="text-slate-300">Goal Completion Rate</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-indigo-400 font-bold">{streakDays}d</span>
                    <span className="text-slate-300">Active Consistency Streak</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center my-auto flex-1">
              <TrendingUp className="w-8 h-8 text-slate-600 mb-2" />
              <p className="text-xs font-semibold text-slate-300">Growth Tracking Initialized</p>
              <p className="text-[10px] text-slate-500 mt-1 max-w-[220px]">
                Your performance growth curve will automatically calibrate as you complete daily goals and quizzes.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
