import {
  ArrowRight,
  Sparkles,
  Star,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { CoursePlayerModal } from '../components/learning/CoursePlayerModal.tsx';
import { Course, productionCourses } from '../data/coursesData.ts';
import { NavTab, UserProfile } from '../types/index.ts';

interface LearningViewProps {
  user?: UserProfile;
  onNavigate: (tab: NavTab) => void;
  onOpenCompanion: (initialQuery?: string) => void;
  streakDays?: number;
}

export const LearningView: React.FC<LearningViewProps> = ({
  user,
  onNavigate,
  onOpenCompanion,
  streakDays = 0,
}) => {
  const [activeTab, setActiveTab] = useState<string>('My Track');
  const [activeCoursePlayer, setActiveCoursePlayer] = useState<Course | null>(null);

  // Load real lesson progress from localStorage
  const [completedLessons, setCompletedLessons] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mindpath_completed_lessons');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return [];
  });

  const handleToggleLessonComplete = (_courseId: string, lessonId: string) => {
    setCompletedLessons((prev) => {
      const exists = prev.includes(lessonId);
      const updated = exists ? prev.filter((id) => id !== lessonId) : [...prev, lessonId];
      if (typeof window !== 'undefined') {
        localStorage.setItem('mindpath_completed_lessons', JSON.stringify(updated));
      }
      return updated;
    });
  };

  const filteredCourses = useMemo(() => {
    if (activeTab === 'My Track') {
      const interestLower = (user?.careerInterest || '').toLowerCase();
      if (interestLower.includes('ai') || interestLower.includes('data')) {
        return productionCourses.filter(
          (c) => c.category === 'AI & Data' || c.id === 'python'
        );
      }
      if (
        interestLower.includes('software') ||
        interestLower.includes('computer') ||
        interestLower.includes('web') ||
        interestLower.includes('dev')
      ) {
        return productionCourses.filter(
          (c) => c.category === 'Development' || c.id === 'cyber' || c.id === 'cloud'
        );
      }
      if (interestLower.includes('medic') || interestLower.includes('health')) {
        return productionCourses.filter((c) => c.id === 'skills' || c.id === 'python');
      }
      return productionCourses.filter((c) => c.category === 'AI & Data');
    }
    if (activeTab === 'All Courses') return productionCourses;
    return productionCourses.filter((c) => c.category === activeTab);
  }, [activeTab, user?.careerInterest]);

  // Active highlighted course (Python) with live calculated progress
  const featuredCourse = productionCourses.find((c) => c.id === 'python') || productionCourses[0];
  const featuredLessons = featuredCourse.modules.flatMap((m) => m.lessons);
  const featuredCompletedCount = featuredLessons.filter((l) => completedLessons.includes(l.id)).length;
  const featuredProgressPct = featuredLessons.length > 0
    ? Math.round((featuredCompletedCount / featuredLessons.length) * 100)
    : 0;

  const trackLabel = user?.careerInterest ? `My Track (${user.careerInterest})` : 'My Track';
  const tabs = [
    { id: 'My Track', label: trackLabel },
    { id: 'All Courses', label: 'All Courses' },
    { id: 'AI & Data', label: 'AI & Data' },
    { id: 'Development', label: 'Development' },
    { id: 'Career', label: 'Career' },
  ];

  return (
    <div className="p-6 space-y-6 max-w-[1520px] mx-auto animate-in fade-in duration-300">
      {/* Header & Sub-Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-[11px] font-bold tracking-wide uppercase mb-1">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Interactive Learning Hub</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Courses &amp; Skill Mastery</h1>
          <p className="text-xs text-slate-400 mt-0.5">High-impact technical courses designed for student career breakthroughs.</p>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-[#14172f] rounded-xl border border-white/10 overflow-x-auto max-w-full">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Row: Active Next Topic (8 cols) & Daily Learning Goal (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Next Topic: Python Programming - Cinematic 16:9 Banner Card */}
        <div 
          onDragStart={(e) => e.preventDefault()}
          className="lg:col-span-8 relative rounded-3xl overflow-hidden min-h-[220px] sm:min-h-[240px] border border-white/10 shadow-2xl bg-[#0f122c] flex items-center group select-none"
        >
          {/* 4K Visual Vector Artwork */}
          <img
            src="/assets/extracted/course_python.svg"
            alt="Python Programming"
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
            className="absolute inset-0 w-full h-full object-cover object-right pointer-events-none select-none transition-transform duration-700 group-hover:scale-103"
          />
          {/* Directional Gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0c0e1a]/95 via-[#0c0e1a]/80 to-transparent pointer-events-none" />

          <div className="relative z-10 p-6 sm:p-8 max-w-lg">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-bold uppercase tracking-wider mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span>{featuredProgressPct > 0 ? 'Current Course In Progress' : 'Featured Course'}</span>
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white">{featuredCourse.title}</h2>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              {featuredProgressPct > 0
                ? `${featuredCompletedCount} of ${featuredLessons.length} Lessons Finished • Keep going to complete the module!`
                : `${featuredCourse.subtitle} • Complete lessons & earn skill badges`}
            </p>

            {/* Dynamic Real Progress bar */}
            <div className="mt-4 flex items-center gap-3">
              <div className="w-48 sm:w-64 h-2.5 bg-white/10 rounded-full overflow-hidden p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-indigo-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(featuredProgressPct, 4)}%` }}
                />
              </div>
              <span className="text-xs font-bold text-amber-300">{featuredProgressPct}% Complete</span>
            </div>

            <div className="mt-5 flex items-center gap-3">
              <button
                onClick={() => setActiveCoursePlayer(featuredCourse)}
                className="px-6 py-2.5 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 text-xs font-bold text-white flex items-center gap-2 shadow-lg shadow-purple-500/30 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <span>{featuredProgressPct > 0 ? 'Continue Learning' : 'Start Course'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => onOpenCompanion(`I am looking at ${featuredCourse.title}. Can you explain how this course helps my career and test my knowledge?`)}
                className="px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/15 text-xs font-bold text-slate-200 transition-colors cursor-pointer"
              >
                Ask AI Doubt
              </button>
            </div>
          </div>
        </div>

        {/* Daily Learning Goal (4 cols) - 4K HD with Crisp Native Typography */}
        <div 
          onDragStart={(e) => e.preventDefault()}
          className="lg:col-span-4 relative rounded-3xl overflow-hidden min-h-[220px] sm:min-h-[240px] w-full border border-white/10 shadow-2xl bg-[#0f132e] flex items-center group select-none"
        >
          <img
            src="/assets/extracted/learning_banner.svg"
            alt="Learning Goal Visual Artwork"
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
            className="absolute inset-0 w-full h-full object-cover object-right pointer-events-none select-none transition-transform duration-700 group-hover:scale-103"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0c0e1a]/95 via-[#0c0e1a]/75 to-transparent pointer-events-none" />

          <div className="relative z-10 p-6">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold mb-2">
              ⚡ Daily Study Goal
            </span>
            <h3 className="text-base sm:text-lg font-bold text-white">
              {completedLessons.length > 0 ? 'Daily momentum active!' : 'Complete 30 mins today!'}
            </h3>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              {streakDays > 0
                ? `You've completed ${completedLessons.length} interactive lessons! Continue learning to extend your ${streakDays}-day streak.`
                : 'Study for 30 minutes today to initiate your daily learning streak.'}
            </p>
            <button
              onClick={() => setActiveCoursePlayer(featuredCourse)}
              className="mt-4 px-5 py-2.5 rounded-full bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-xs font-bold text-white shadow-md flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <span>Keep Going</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Explore Courses Grid */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white">All Production Courses</h2>
            <span className="px-2 py-0.5 rounded-full bg-white/10 text-slate-400 text-[10px] font-semibold">
              {filteredCourses.length} Courses
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCourses.map((c) => {
            const courseLessons = c.modules.flatMap((m) => m.lessons);
            const finishedLessons = courseLessons.filter((l) => completedLessons.includes(l.id)).length;
            const pct = courseLessons.length > 0 ? Math.round((finishedLessons / courseLessons.length) * 100) : 0;

            return (
              <div
                key={c.id}
                className="rounded-3xl bg-[#14172f] border border-white/10 overflow-hidden flex flex-col justify-between hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/10 transition-all group select-none"
              >
                <div>
                  {/* 16:9 Cinematic Course Image */}
                  <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#0d1024]">
                    <img
                      src={c.image}
                      alt={c.title}
                      draggable={false}
                      onDragStart={(e) => e.preventDefault()}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 pointer-events-none select-none"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#14172f] via-transparent to-transparent pointer-events-none" />
                    
                    {/* Tag Pill */}
                    <div className="absolute top-3 left-3">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border backdrop-blur-md shadow-sm ${c.tagColor}`}>
                        {c.tag}
                      </span>
                    </div>

                    <div className="absolute bottom-2.5 right-3 text-[10px] font-semibold text-slate-300 bg-black/50 px-2 py-0.5 rounded-md backdrop-blur-xs">
                      {c.duration}
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-5">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
                      <span className="font-semibold text-indigo-400">{c.level}</span>
                      <div className="flex items-center gap-1 text-amber-400 font-bold">
                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                        <span>{c.rating}</span>
                        <span className="text-slate-500 text-[10px]">({c.reviews})</span>
                      </div>
                    </div>

                    <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors leading-snug">
                      {c.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {c.subtitle}
                    </p>

                    {pct > 0 && (
                      <div className="mt-3 flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-400 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-emerald-400">{pct}%</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer */}
                <div className="px-5 pb-5 pt-3 border-t border-white/5 flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-medium">
                    {courseLessons.length} {courseLessons.length === 1 ? 'Lesson' : 'Lessons'}
                  </span>
                  <button
                    onClick={() => setActiveCoursePlayer(c)}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600/30 to-indigo-600/30 hover:from-purple-600 hover:to-indigo-600 text-xs font-bold text-indigo-200 hover:text-white transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
                  >
                    <span>{pct > 0 ? 'Continue' : 'Start Course'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive Full Course Player Modal */}
      {activeCoursePlayer && (
        <CoursePlayerModal
          course={activeCoursePlayer}
          isOpen={true}
          onClose={() => setActiveCoursePlayer(null)}
          onOpenCompanion={onOpenCompanion}
          completedLessonIds={completedLessons}
          onToggleLessonComplete={handleToggleLessonComplete}
        />
      )}
    </div>
  );
};
