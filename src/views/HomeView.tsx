import {
  ArrowRight,
  Award,
  BookOpen,
  Calendar,
  CalendarDays,
  CheckCircle2,
  Flame,
  HelpCircle,
  Info,
  MessageSquare,
  Play,
  Plus,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  Trophy,
  X,
  Zap,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { MilestoneItem, NavTab, TaskItem, UserProfile } from '../types/index.ts';

interface HomeViewProps {
  streakDays?: number;
  userName?: string;
  user?: UserProfile;
  tasks: TaskItem[];
  milestones: MilestoneItem[];
  testsCount?: number;
  bestScore?: number;
  avgScore?: number;
  onToggleTask: (id: string, current: number) => void;
  onAddTask?: (title: string, duration?: string, category?: string) => void;
  onDeleteTask?: (id: string) => void;
  onNavigate: (tab: NavTab) => void;
  onOpenCompanion: () => void;
  onStartQuiz: (quizId: string) => void;
}

interface HeatmapDay {
  date: string;
  formattedDate: string;
  dayOfWeek: number; // 0 = Mon, 6 = Sun
  minutes: number;
  level: 0 | 1 | 2 | 3 | 4;
  isStreak: boolean;
  isToday: boolean;
  topic?: string;
}

export const HomeView: React.FC<HomeViewProps> = ({
  streakDays = 0,
  userName = 'Student',
  user,
  tasks = [],
  milestones = [],
  testsCount = 0,
  bestScore = 0,
  avgScore = 0,
  onToggleTask,
  onAddTask,
  onDeleteTask,
  onNavigate,
  onOpenCompanion,
  onStartQuiz,
}) => {
  const [hoveredDay, setHoveredDay] = useState<HeatmapDay | null>(null);
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDuration, setNewTaskDuration] = useState('Today • 30 min');
  const [newTaskCategory, setNewTaskCategory] = useState('Tasks');

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    if (onAddTask) {
      onAddTask(newTaskTitle.trim(), newTaskDuration, newTaskCategory);
    }
    setNewTaskTitle('');
    setIsAddTaskModalOpen(false);
  };

  const completedTasks = tasks.filter((t) => t.completed === 1).length;
  const totalTasks = tasks.length;
  const overallPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Calculate Streak Milestone target & progress
  const { nextMilestone, milestoneProgress, remainingDays } = useMemo(() => {
    let target = 50;
    if (streakDays < 7) target = 7;
    else if (streakDays < 14) target = 14;
    else if (streakDays < 30) target = 30;
    else if (streakDays < 50) target = 50;
    else if (streakDays < 75) target = 75;
    else if (streakDays < 100) target = 100;
    else target = Math.ceil((streakDays + 1) / 50) * 50;

    const progress = Math.min(100, Math.round((streakDays / target) * 100));
    const remaining = Math.max(0, target - streakDays);
    return { nextMilestone: target, milestoneProgress: progress, remainingDays: remaining };
  }, [streakDays]);

  // Generate 16 weeks of study heatmap history aligned with streakDays
  const { weeks, monthLabels, totalStudyDays, totalMinutesStudied } = useMemo(() => {
    const totalWeeks = 16;
    const totalDays = totalWeeks * 7;
    const days: HeatmapDay[] = [];
    const today = new Date();

    let studyDaysCount = 0;
    let minutesCount = 0;

    for (let i = totalDays - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);

      const isStreakDay = streakDays > 0 && i < streakDays;
      const isToday = i === 0;

      let level: 0 | 1 | 2 | 3 | 4 = 0;
      let minutes = 0;

      if (isStreakDay) {
        studyDaysCount++;
        level = isToday ? 2 : 1;
        minutes = 30;
      } else {
        level = 0;
        minutes = 0;
      }

      minutesCount += minutes;
      const dayOfWeek = (d.getDay() + 6) % 7; // Convert Sunday=0 to Monday=0

      days.push({
        date: d.toISOString().split('T')[0],
        formattedDate: d.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          weekday: 'short',
        }),
        dayOfWeek,
        minutes,
        level,
        isStreak: isStreakDay,
        isToday,
      });
    }

    // Group into weeks of 7 days
    const weekGroups: HeatmapDay[][] = [];
    for (let w = 0; w < totalWeeks; w++) {
      weekGroups.push(days.slice(w * 7, (w + 1) * 7));
    }

    // Compute month label placements across columns
    const labels: { name: string; colIndex: number }[] = [];
    let lastMonth = '';
    weekGroups.forEach((wk, colIdx) => {
      const firstDayDate = new Date(wk[0].date);
      const mName = firstDayDate.toLocaleDateString('en-US', { month: 'short' });
      if (mName !== lastMonth) {
        labels.push({ name: mName, colIndex: colIdx });
        lastMonth = mName;
      }
    });

    return {
      weeks: weekGroups,
      monthLabels: labels,
      totalStudyDays: studyDaysCount,
      totalMinutesStudied: minutesCount,
    };
  }, [streakDays]);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1520px] mx-auto animate-in fade-in duration-300">
      {/* ============================================================== */}
      {/* Top Row: Hero Banner (Left 8 cols) & Your Progress (Right 4 cols) */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Hero Banner (8 cols) - 4K HD Widescreen with Crisp Native Typography */}
        <div 
          onDragStart={(e) => e.preventDefault()}
          className="lg:col-span-8 relative rounded-3xl overflow-hidden min-h-[220px] sm:min-h-[240px] lg:min-h-[260px] w-full border border-white/10 shadow-2xl bg-[#0f122c] flex items-center group select-none"
        >
          {/* 4K Background Artwork - Non-draggable */}
          <img
            src="/assets/extracted/hero_banner.png"
            alt="MindPath Hero Artwork"
            draggable={false}
            loading="eager"
            decoding="async"
            onDragStart={(e) => e.preventDefault()}
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/assets/extracted/hero_banner.svg';
            }}
            className="absolute inset-0 w-full h-full object-cover object-right pointer-events-none select-none transition-transform duration-700 group-hover:scale-102"
          />
          {/* Contrast Gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0c0e1a]/95 via-[#0c0e1a]/75 to-transparent pointer-events-none" />

          {/* Crisp Native Typography & Interactive CTA */}
          <div className="relative z-10 p-6 sm:p-8 max-w-lg">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-[11px] font-bold mb-2.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Personalized AI Learning & Career Companion</span>
            </span>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight leading-tight">
              Hello {userName.split(' ')[0]}! Let's make your future brighter together.
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
              Explore careers, learn new skills, track your {streakDays}-day study streak, and achieve your goals with MindPath AI.
            </p>
            <button
              onClick={() => onNavigate('career')}
              className="mt-4 px-6 py-2.5 rounded-full bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-xs sm:text-sm font-bold text-white shadow-xl shadow-purple-500/25 flex items-center gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <span>Explore Your Career Paths</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Your Progress Card (4 cols) */}
        <div className="lg:col-span-4 rounded-3xl bg-[#14172f] border border-white/10 p-5 sm:p-6 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white">Your Progress</h2>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold flex items-center gap-1">
                <Flame className="w-3 h-3 text-amber-400 fill-amber-400" />
                <span>{streakDays}d Streak</span>
              </span>
            </div>
            <button
              onClick={() => onNavigate('progress')}
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium transition-colors cursor-pointer"
            >
              <span>View Details</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="my-4 flex items-center gap-5 sm:gap-6">
            {/* Radial Progress Ring */}
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="#1c2146"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="url(#progressGradient)"
                  strokeWidth="8"
                  strokeDasharray="251.2"
                  strokeDashoffset={251.2 * (1 - (overallPct / 100))}
                  strokeLinecap="round"
                  fill="transparent"
                />
                <defs>
                  <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="100%" stopColor="#10b981" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-xl sm:text-2xl font-extrabold text-white">
                  {overallPct}%
                </span>
                <span className="text-[8px] sm:text-[9px] text-slate-400 uppercase tracking-wider font-semibold">
                  Overall
                </span>
              </div>
            </div>

            {/* Metrics Breakdown */}
            <div className="space-y-2.5 sm:space-y-3 flex-1 min-w-0">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                  <BookOpen className="w-3.5 h-3.5" />
                </div>
                <div className="truncate">
                  <p className="text-xs font-bold text-white">
                    {completedTasks} / {totalTasks}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">Tasks Completed</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <div className="truncate">
                  <p className="text-xs font-bold text-white">
                    {testsCount > 0 ? `${testsCount}` : '0'}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">Tests Taken</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                  <Trophy className="w-3.5 h-3.5" />
                </div>
                <div className="truncate">
                  <p className="text-xs font-bold text-white">
                    {testsCount > 0 ? `${bestScore}%` : '--'}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">Best Score</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* FEATURED: Study Streak Calendar Heatmap & Milestone Progress Ring */}
      {/* ============================================================== */}
      <div className="rounded-3xl bg-[#14172f] border border-white/10 p-5 sm:p-6 shadow-xl relative overflow-hidden">
        {/* Glow backdrop accent */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-amber-500/10 via-purple-600/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        {/* Card Header with Stats */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-white/5 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 p-[1.5px] shadow-lg shadow-amber-500/20">
              <div className="w-full h-full bg-[#111428] rounded-[14px] flex items-center justify-center">
                <Flame className="w-5 h-5 text-amber-400 fill-amber-400 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white">
                  Study Streak & Consistency Heatmap
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-rose-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                  🔥 Active
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                You've maintained daily study consistency for{' '}
                <span className="text-amber-300 font-bold">{streakDays} consecutive days</span>!
              </p>
            </div>
          </div>

          {/* Quick Badges / Pill stats */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <div className="px-3 py-1.5 rounded-xl bg-[#181d3d] border border-white/5 flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-slate-300 text-[11px]">Best:</span>
              <span className="text-white font-bold">{streakDays} {streakDays === 1 ? 'Day' : 'Days'}</span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-[#181d3d] border border-white/5 flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-slate-300 text-[11px]">Streak Freeze:</span>
              <span className="text-slate-400 font-medium">0 Available</span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-[#181d3d] border border-white/5 flex items-center gap-2">
              <Award className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-slate-300 text-[11px]">Next Badge:</span>
              <span className="text-purple-300 font-bold">{nextMilestone} Days</span>
            </div>
          </div>
        </div>

        {/* Main Content: Progress Ring (Left) + Interactive Heatmap (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center pt-5 relative z-10">
          {/* Milestone Progress Ring (3 cols) */}
          <div className="lg:col-span-3 flex flex-col items-center justify-center p-4 rounded-2xl bg-[#181d3d]/70 border border-white/5 text-center">
            {/* Visual Progress Ring */}
            <div className="relative w-32 h-32 flex items-center justify-center my-1">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {/* Background Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  stroke="#1c2146"
                  strokeWidth="7"
                  fill="transparent"
                />
                {/* Milestone Progress Stroke */}
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  stroke="url(#streakRingGradient)"
                  strokeWidth="7"
                  strokeDasharray="263.89"
                  strokeDashoffset={263.89 * (1 - milestoneProgress / 100)}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-700 ease-out"
                />
                <defs>
                  <linearGradient id="streakRingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f59e0b" />
                    <stop offset="50%" stopColor="#f43f5e" />
                    <stop offset="100%" stopColor="#a855f7" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Inside Center content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <Flame className="w-5 h-5 text-amber-400 fill-amber-400 mb-0.5 animate-bounce" />
                <span className="text-2xl font-black text-white leading-none tracking-tight">
                  {streakDays}
                </span>
                <span className="text-[9px] text-amber-300 uppercase tracking-wider font-extrabold mt-0.5">
                  Day Streak
                </span>
              </div>
            </div>

            {/* Target Milestone Pill */}
            <div className="mt-2 text-center">
              <div className="text-[11px] font-bold text-white flex items-center justify-center gap-1">
                <span>Milestone:</span>
                <span className="text-amber-400">{nextMilestone} Days</span>
                <span className="text-slate-400 font-normal">({milestoneProgress}%)</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {remainingDays > 0 ? (
                  <>
                    Only <span className="text-emerald-400 font-bold">{remainingDays} more days</span> to unlock Gold Badge!
                  </>
                ) : (
                  <span className="text-emerald-400 font-bold">Milestone unlocked! 🎉</span>
                )}
              </p>
            </div>
          </div>

          {/* Visual Calendar Heatmap (9 cols) */}
          <div className="lg:col-span-9 flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5 text-indigo-400" />
                <span>Last 16 Weeks Activity</span>
              </span>
              <span className="text-[11px] text-slate-400">
                <span className="text-emerald-400 font-bold">{totalStudyDays} days</span> active •{' '}
                <span className="text-indigo-300 font-bold">
                  {Math.round(totalMinutesStudied / 60)}h {totalMinutesStudied % 60}m
                </span>{' '}
                studied
              </span>
            </div>

            {/* Heatmap Grid Container - Scrollable on mobile */}
            <div className="overflow-x-auto pb-2 pt-1 no-scrollbar px-1">
              <div className="min-w-[620px] p-1.5">
                {/* Month header labels */}
                <div className="grid grid-cols-16 gap-1.5 mb-1.5 pl-6 text-[10px] text-slate-500 font-medium">
                  {weeks.map((_, colIdx) => {
                    const match = monthLabels.find((m) => m.colIndex === colIdx);
                    return (
                      <span key={colIdx} className="truncate">
                        {match ? match.name : ''}
                      </span>
                    );
                  })}
                </div>

                {/* Day rows (Mon to Sun) */}
                <div className="flex gap-2 pr-1.5">
                  {/* Day of week abbreviations */}
                  <div className="flex flex-col justify-between text-[9px] text-slate-500 font-medium py-0.5 h-[126px] select-none shrink-0 w-5">
                    <span>Mon</span>
                    <span>Wed</span>
                    <span>Fri</span>
                    <span>Sun</span>
                  </div>

                  {/* 16 columns of weeks */}
                  <div className="grid grid-cols-16 gap-1.5 flex-1 pr-1">
                    {weeks.map((week, wIdx) => (
                      <div key={wIdx} className="flex flex-col gap-1.5">
                        {week.map((day) => {
                          // Cell styling based on activity level & streak
                          let cellBg = 'bg-[#181d3d]/90 hover:border-slate-500';
                          if (day.level === 1) {
                            cellBg = 'bg-indigo-950/70 border-indigo-700/30 text-indigo-400 hover:border-indigo-400';
                          } else if (day.level === 2) {
                            cellBg = 'bg-indigo-600/70 border-indigo-400/40 text-indigo-200 hover:border-indigo-300';
                          } else if (day.level === 3) {
                            cellBg = 'bg-purple-600/80 border-purple-400/50 text-purple-100 hover:border-purple-300';
                          } else if (day.level === 4) {
                            cellBg = 'bg-gradient-to-tr from-amber-400 to-rose-500 border-amber-300/60 shadow-sm shadow-amber-500/30 text-white hover:brightness-110';
                          }

                          return (
                            <div
                              key={day.date}
                              onMouseEnter={() => setHoveredDay(day)}
                              onMouseLeave={() => setHoveredDay(null)}
                              onClick={() => setHoveredDay(day)}
                              className={`w-full aspect-square rounded-md border border-white/5 transition-all duration-150 cursor-pointer relative ${cellBg} ${
                                day.isToday ? 'ring-2 ring-amber-400 ring-offset-1 ring-offset-[#14172f] z-10 shadow-sm shadow-amber-400/40' : ''
                              }`}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Hover Tooltip display & Legend footer */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-2 border-t border-white/5 text-[11px]">
              {/* Dynamic info pill on hover */}
              <div className="min-h-[22px] flex items-center">
                {hoveredDay ? (
                  <div className="flex items-center gap-2 animate-in fade-in duration-150">
                    <span className="font-bold text-white">{hoveredDay.formattedDate}:</span>
                    {hoveredDay.minutes > 0 ? (
                      <span className="text-amber-300 font-semibold">
                        {hoveredDay.minutes} min studied
                        {hoveredDay.topic && (
                          <span className="text-slate-400 font-normal"> • {hoveredDay.topic}</span>
                        )}
                      </span>
                    ) : (
                      <span className="text-slate-500">Rest day</span>
                    )}
                    {hoveredDay.isStreak && (
                      <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] font-bold">
                        Streak Day 🔥
                      </span>
                    )}
                    {hoveredDay.isToday && (
                      <span className="px-1.5 py-0.2 rounded bg-indigo-500/30 text-indigo-300 text-[9px] font-bold">
                        Today ⚡
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-slate-500" />
                    <span>Hover or tap any date to inspect daily study record and topic</span>
                  </span>
                )}
              </div>

              {/* Heatmap Legend */}
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 shrink-0 self-end sm:self-auto">
                <span>Less</span>
                <span className="w-2.5 h-2.5 rounded-xs bg-[#181d3d] border border-white/10" />
                <span className="w-2.5 h-2.5 rounded-xs bg-indigo-950/70 border border-indigo-700/30" />
                <span className="w-2.5 h-2.5 rounded-xs bg-indigo-600/70 border border-indigo-400/40" />
                <span className="w-2.5 h-2.5 rounded-xs bg-purple-600/80 border border-purple-400/50" />
                <span className="w-2.5 h-2.5 rounded-xs bg-gradient-to-tr from-amber-400 to-rose-500 border border-amber-300" />
                <span>More</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* Middle Row: Roadmap (4 cols), Explore Careers (5 cols), Tasks (3 cols) */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 items-stretch">
        {/* Your Personalized Roadmap (4 cols) */}
        <div className="lg:col-span-4 rounded-3xl bg-[#14172f] border border-white/10 p-5 shadow-xl flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-bold text-white">Your Personalized Roadmap</h2>
          </div>

          {milestones && milestones.length > 0 ? (
            <div className="relative pl-6 space-y-4 flex-1">
              <div className="absolute left-2.5 top-2 bottom-3 w-0.5 bg-indigo-500/30" />
              {milestones.map((m, idx) => (
                <div key={m.id || idx} className="relative flex items-center justify-between group">
                  <span className={`absolute -left-6 top-1.5 w-3.5 h-3.5 rounded-full ${m.status === 'completed' ? 'bg-emerald-500 ring-4 ring-emerald-500/20' : 'bg-purple-500 ring-4 ring-purple-500/20'}`} />
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-purple-600/30 text-purple-300 flex items-center justify-center shrink-0 border border-purple-500/40">
                      <Target className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">{m.title}</p>
                      <p className="text-[10px] text-slate-400">{m.progress !== undefined ? `${m.progress}% • ` : ''}{m.time_text} • {m.status}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-6 text-center my-auto flex-1">
              <Target className="w-8 h-8 text-slate-600 mb-2" />
              <p className="text-xs font-semibold text-slate-300">No active milestones</p>
              <p className="text-[10px] text-slate-500 mt-1 max-w-[200px]">
                Explore career paths in Career Explorer to set up your tailored learning roadmap.
              </p>
              <button
                onClick={() => onNavigate('career')}
                className="mt-3 px-3 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 text-[11px] font-semibold border border-indigo-500/30 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>Explore Careers</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Explore Career Paths (5 cols) - NO CROPPING on images */}
        <div className="lg:col-span-5 rounded-3xl bg-[#14172f] border border-white/10 p-5 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-white">Explore Career Paths</h2>
            <button
              onClick={() => onNavigate('career')}
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium transition-colors cursor-pointer"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 3 Career Cards with 16:9 4K HD aspect ratio */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Card 1: Software Developer */}
            <div className="rounded-2xl bg-[#181d3d] border border-white/10 p-2.5 flex flex-col justify-between group hover:border-indigo-500/50 transition-all select-none">
              <div className="aspect-[16/9] w-full rounded-xl overflow-hidden mb-2 bg-[#0d1024]">
                <img
                  src="/assets/extracted/card_software.png"
                  alt="Software Developer"
                  draggable={false}
                  onDragStart={(e) => e.preventDefault()}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none select-none"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
              <div>
                <p className="text-xs font-bold text-white leading-tight">Software Developer</p>
                <p className="text-[10px] text-indigo-300 font-medium mt-0.5">High Growth • ₹12L+</p>
              </div>
              <button
                onClick={() => onNavigate('career')}
                className="mt-2.5 text-[10px] text-slate-300 hover:text-white flex items-center gap-1 font-semibold cursor-pointer"
              >
                <span>Learn More</span>
                <ArrowRight className="w-3 h-3 text-indigo-400" />
              </button>
            </div>

            {/* Card 2: AI & Data Scientist */}
            <div className="rounded-2xl bg-[#181d3d] border border-white/10 p-2.5 flex flex-col justify-between group hover:border-indigo-500/50 transition-all select-none">
              <div className="aspect-[16/9] w-full rounded-xl overflow-hidden mb-2 bg-[#0d1024]">
                <img
                  src="/assets/extracted/card_ai.png"
                  alt="AI & Data Scientist"
                  draggable={false}
                  onDragStart={(e) => e.preventDefault()}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none select-none"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
              <div>
                <p className="text-xs font-bold text-white leading-tight">AI & Data Scientist</p>
                <p className="text-[10px] text-cyan-300 font-medium mt-0.5">Excellent Scope • ₹15L+</p>
              </div>
              <button
                onClick={() => onNavigate('career')}
                className="mt-2.5 text-[10px] text-slate-300 hover:text-white flex items-center gap-1 font-semibold cursor-pointer"
              >
                <span>Learn More</span>
                <ArrowRight className="w-3 h-3 text-cyan-400" />
              </button>
            </div>

            {/* Card 3: Medical Professional */}
            <div className="rounded-2xl bg-[#181d3d] border border-white/10 p-2.5 flex flex-col justify-between group hover:border-indigo-500/50 transition-all select-none">
              <div className="aspect-[16/9] w-full rounded-xl overflow-hidden mb-2 bg-[#0d1024]">
                <img
                  src="/assets/extracted/card_medical.png"
                  alt="Medical Professional"
                  draggable={false}
                  onDragStart={(e) => e.preventDefault()}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none select-none"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
              <div>
                <p className="text-xs font-bold text-white leading-tight">Medical Professional</p>
                <p className="text-[10px] text-emerald-300 font-medium mt-0.5">Respect • ₹10L+</p>
              </div>
              <button
                onClick={() => onNavigate('career')}
                className="mt-2.5 text-[10px] text-slate-300 hover:text-white flex items-center gap-1 font-semibold cursor-pointer"
              >
                <span>Learn More</span>
                <ArrowRight className="w-3 h-3 text-emerald-400" />
              </button>
            </div>
          </div>
        </div>

        {/* Upcoming Tasks (3 cols) */}
        <div className="lg:col-span-3 rounded-3xl bg-[#14172f] border border-white/10 p-5 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-400" />
              <h2 className="text-sm font-bold text-white">Upcoming Tasks</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAddTaskModalOpen(true)}
                className="text-xs text-purple-300 hover:text-purple-200 flex items-center gap-1 font-semibold transition-colors cursor-pointer px-2 py-0.5 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30"
                title="Add New Study Task"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Task</span>
              </button>
              <button
                onClick={() => onNavigate('reminders')}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium transition-colors cursor-pointer"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="space-y-3 flex-1 flex flex-col justify-center">
            {tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-4 text-center my-auto">
                <Calendar className="w-8 h-8 text-slate-600 mb-2" />
                <p className="text-xs font-semibold text-slate-300">No tasks for today</p>
                <p className="text-[10px] text-slate-500 mt-1 max-w-[180px]">Set your study targets to keep your daily momentum going</p>
                <button
                  onClick={() => setIsAddTaskModalOpen(true)}
                  className="mt-3 px-3 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 text-[11px] font-semibold border border-indigo-500/30 transition-all cursor-pointer flex items-center gap-1.5 mx-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Study Task</span>
                </button>
              </div>
            ) : (
              tasks.map((task) => {
                const isChecked = task.completed === 1;
                return (
                  <div
                    key={task.id}
                    className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 group ${
                      isChecked
                        ? 'bg-emerald-950/20 border-emerald-500/40'
                        : 'bg-[#181d3d] border-white/10 hover:border-indigo-500/40'
                    }`}
                  >
                    <div
                      onClick={() => onToggleTask(task.id, task.completed)}
                      className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => onToggleTask(task.id, task.completed)}
                        className="w-4 h-4 rounded text-indigo-600 bg-[#0d1022] border-white/20 focus:ring-indigo-500 cursor-pointer shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-xs font-semibold truncate ${
                            isChecked ? 'line-through text-slate-400' : 'text-slate-100'
                          }`}
                        >
                          {task.title}
                        </p>
                        <p className="text-[10px] text-slate-400">{task.time_text || 'Today'}</p>
                      </div>
                    </div>
                    {onDeleteTask && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteTask(task.id);
                        }}
                        className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors opacity-80 hover:opacity-100 cursor-pointer shrink-0"
                        title="Delete Task"
                        aria-label="Delete Task"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* Bottom Row: Learning Insights (4 cols), Quick Actions (4 cols), Quote Card (4 cols) */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 items-stretch">
        {/* Learning Insights (4 cols) */}
        <div className="lg:col-span-4 rounded-3xl bg-[#14172f] border border-white/10 p-5 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold text-white">Learning Insights</h2>
            </div>
            <button
              onClick={() => onNavigate('reports')}
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium transition-colors cursor-pointer"
            >
              <span>View Report</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {testsCount > 0 ? (
            <>
              <div className="py-2">
                <div className="h-28 w-full relative flex flex-col items-center justify-center">
                  <span className="text-3xl font-black text-cyan-400">{avgScore}%</span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mt-1">Average Test Score</span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 px-1 mt-1 font-medium">
                  <span>Mon</span>
                  <span>Tue</span>
                  <span>Wed</span>
                  <span>Thu</span>
                  <span>Fri</span>
                  <span>Sat</span>
                  <span>Sun</span>
                </div>
              </div>

              <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                <span className="text-base font-extrabold text-emerald-400">Best: {bestScore}%</span>
                <span className="text-xs text-slate-300 font-medium">
                  {testsCount} verified assessment{testsCount === 1 ? '' : 's'}
                </span>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center p-6 text-center my-auto flex-1">
              <TrendingUp className="w-8 h-8 text-slate-600 mb-2" />
              <p className="text-xs font-semibold text-slate-300">No test data recorded</p>
              <p className="text-[10px] text-slate-500 mt-1 max-w-[200px]">
                Take practice quizzes and subject tests to unlock live performance analytics and weekly trends.
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

        {/* Quick Actions (4 cols) */}
        <div className="lg:col-span-4 rounded-3xl bg-[#14172f] border border-white/10 p-5 shadow-xl flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-amber-400 font-bold">⚡</span>
            <h2 className="text-sm font-bold text-white">Quick Actions</h2>
          </div>

          <div className="grid grid-cols-4 gap-2.5 my-auto">
            {/* Action 1: Take a Quiz */}
            <button
              onClick={() => onNavigate('quizzes')}
              className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#181d3d] hover:bg-purple-600/20 border border-white/10 hover:border-purple-500/40 transition-all cursor-pointer group text-center"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                <HelpCircle className="w-5 h-5 text-purple-400" />
              </div>
              <span className="text-[10px] font-semibold text-slate-200">Take a Quiz</span>
            </button>

            {/* Action 2: Browse Resources */}
            <button
              onClick={() => onNavigate('learning')}
              className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#181d3d] hover:bg-blue-600/20 border border-white/10 hover:border-blue-500/40 transition-all cursor-pointer group text-center"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                <Play className="w-5 h-5 text-blue-400 fill-blue-400/20" />
              </div>
              <span className="text-[10px] font-semibold text-slate-200">Browse Resources</span>
            </button>

            {/* Action 3: Set a Goal */}
            <button
              onClick={() => onNavigate('journey')}
              className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#181d3d] hover:bg-emerald-600/20 border border-white/10 hover:border-emerald-500/40 transition-all cursor-pointer group text-center"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                <Target className="w-5 h-5 text-emerald-400" />
              </div>
              <span className="text-[10px] font-semibold text-slate-200">Set a Goal</span>
            </button>

            {/* Action 4: Get Advice */}
            <button
              onClick={onOpenCompanion}
              className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#181d3d] hover:bg-amber-600/20 border border-white/10 hover:border-amber-500/40 transition-all cursor-pointer group text-center"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                <MessageSquare className="w-5 h-5 text-amber-400" />
              </div>
              <span className="text-[10px] font-semibold text-slate-200">Get Advice</span>
            </button>
          </div>
        </div>

        {/* Sunset Mountain Quote Card (4 cols) - 16:9 4K HD Art */}
        <div className="lg:col-span-4 relative rounded-3xl overflow-hidden min-h-[170px] w-full border border-white/10 shadow-2xl bg-[#141838] flex items-center group select-none">
          <img
            src="/assets/extracted/quote_card.png"
            alt="The future belongs to those who learn today"
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
            className="w-full h-full object-cover rounded-3xl pointer-events-none select-none transition-transform duration-700 group-hover:scale-105"
          />
        </div>
      </div>

      {/* Add Task Modal */}
      {isAddTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-[#14172f] border border-white/15 rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-purple-300" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Add New Study Task</h3>
                  <p className="text-[10px] text-slate-400">Save target to your real-time study plan</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddTaskModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
                  Task Title
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="e.g. Solve 5 LeetCode DP Problems or Read Chapter 3"
                  className="w-full px-3 py-2 rounded-xl bg-[#181d3d] border border-white/10 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
                    Target Time / Duration
                  </label>
                  <select
                    value={newTaskDuration}
                    onChange={(e) => setNewTaskDuration(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#181d3d] border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="Today • 15 min">Today • 15 min</option>
                    <option value="Today • 30 min">Today • 30 min</option>
                    <option value="Today • 45 min">Today • 45 min</option>
                    <option value="Today • 1 hour">Today • 1 hour</option>
                    <option value="Tomorrow • 45 min">Tomorrow • 45 min</option>
                    <option value="This Weekend">This Weekend</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
                    Category
                  </label>
                  <select
                    value={newTaskCategory}
                    onChange={(e) => setNewTaskCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#181d3d] border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="Tasks">Tasks</option>
                    <option value="Study Target">Study Target</option>
                    <option value="Exam Prep">Exam Prep</option>
                    <option value="Coding Project">Coding Project</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddTaskModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-md shadow-purple-500/25 transition-all cursor-pointer"
                >
                  Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};