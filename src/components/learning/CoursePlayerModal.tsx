import {
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  Check,
  CheckCircle2,
  Clock,
  Code2,
  Copy,
  Sparkles,
  X,
} from 'lucide-react';
import React, { useState } from 'react';
import { Course, Lesson } from '../../data/coursesData.ts';
import { MarkdownMessage } from '../companion/MarkdownMessage.tsx';

interface CoursePlayerModalProps {
  course: Course;
  isOpen: boolean;
  onClose: () => void;
  onOpenCompanion: (initialMessage?: string) => void;
  completedLessonIds: string[];
  onToggleLessonComplete: (courseId: string, lessonId: string) => void;
}

export const CoursePlayerModal: React.FC<CoursePlayerModalProps> = ({
  course,
  isOpen,
  onClose,
  onOpenCompanion,
  completedLessonIds,
  onToggleLessonComplete,
}) => {
  const allLessons: Lesson[] = course.modules.flatMap((m) => m.lessons);
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [copiedCode, setCopiedCode] = useState(false);

  if (!isOpen) return null;

  const currentLesson = allLessons[currentLessonIndex] || allLessons[0];
  const isCompleted = completedLessonIds.includes(currentLesson.id);
  const totalLessons = allLessons.length;
  const completedCount = allLessons.filter((l) => completedLessonIds.includes(l.id)).length;
  const progressPct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  const handleCopyCode = () => {
    if (currentLesson.codeSnippet) {
      navigator.clipboard.writeText(currentLesson.codeSnippet);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleNextLesson = () => {
    if (currentLessonIndex < totalLessons - 1) {
      setCurrentLessonIndex((prev) => prev + 1);
    }
  };

  const handlePrevLesson = () => {
    if (currentLessonIndex > 0) {
      setCurrentLessonIndex((prev) => prev - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in select-none">
      <div className="w-full max-w-5xl h-[92vh] bg-[#0c0e1e] border border-white/15 rounded-3xl overflow-hidden shadow-2xl flex flex-col relative animate-in zoom-in-95 duration-200">
        {/* Top Navbar */}
        <header className="px-5 py-4 border-b border-white/10 bg-[#11142e] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-extrabold text-white leading-tight">{course.title}</h2>
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-[10px] font-bold">
                  {course.level}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Lesson {currentLessonIndex + 1} of {totalLessons} • {progressPct}% Completed
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Progress Bar in Header */}
            <div className="hidden md:flex items-center gap-2">
              <div className="w-32 h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 rounded-full transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="text-xs font-bold text-cyan-300">{progressPct}%</span>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
              aria-label="Close Course Player"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Content Body: Sidebar + Main Lesson Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Syllabus Navigation Sidebar */}
          <aside className="w-72 lg:w-80 border-r border-white/10 bg-[#0a0d1b] p-3 overflow-y-auto hidden sm:block shrink-0 space-y-3">
            <div className="px-2 py-1 flex items-center justify-between text-xs text-slate-400 font-semibold uppercase tracking-wider">
              <span>Syllabus Modules</span>
              <span className="text-[10px] text-emerald-400 font-bold">{completedCount}/{totalLessons} Done</span>
            </div>

            {course.modules.map((mod) => (
              <div key={mod.id} className="space-y-1">
                <p className="text-[11px] font-extrabold text-slate-300 px-2 py-1 bg-white/5 rounded-lg">
                  {mod.title}
                </p>
                <div className="space-y-0.5 pl-1">
                  {mod.lessons.map((les) => {
                    const active = les.id === currentLesson.id;
                    const done = completedLessonIds.includes(les.id);
                    const globalIdx = allLessons.findIndex((l) => l.id === les.id);
                    return (
                      <button
                        key={les.id}
                        onClick={() => setCurrentLessonIndex(globalIdx)}
                        className={`w-full text-left p-2.5 rounded-xl text-xs transition-all flex items-center justify-between cursor-pointer ${
                          active
                            ? 'bg-gradient-to-r from-purple-600/30 to-indigo-600/30 border border-purple-500/40 text-white font-bold'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          {done ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border border-slate-600 shrink-0" />
                          )}
                          <span className="truncate">{les.title}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 shrink-0 ml-1">{les.duration}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </aside>

          {/* Main Lesson Content Area */}
          <main className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-6 bg-[#0c0e1e]">
            {/* Lesson Title Strip */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-[10px] font-bold uppercase tracking-wider mb-2">
                  <Clock className="w-3 h-3 text-cyan-400" />
                  <span>Estimated: {currentLesson.duration}</span>
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {currentLesson.title}
                </h1>
                <p className="text-xs text-slate-400 mt-1">{currentLesson.summary}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onToggleLessonComplete(course.id, currentLesson.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    isCompleted
                      ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30'
                      : 'bg-white/10 hover:bg-white/15 text-white border border-white/10'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{isCompleted ? 'Completed ✓' : 'Mark Lesson Complete'}</span>
                </button>

                <button
                  onClick={() => {
                    onClose();
                    onOpenCompanion(`I am currently studying lesson "${currentLesson.title}" in the ${course.title} course. Can you explain key concepts, provide practice questions, and answer my doubts on this topic?`);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600/30 to-indigo-600/30 hover:from-purple-600/50 border border-purple-500/40 text-purple-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
                  title="Ask AI Companion about this lesson"
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Ask AI Tutor</span>
                </button>
              </div>
            </div>

            {/* Markdown Lesson Content */}
            <div className="rounded-2xl border border-white/10 bg-[#090c1c] p-6 shadow-inner">
              <MarkdownMessage content={currentLesson.content} />
            </div>

            {/* Interactive Code Playground / Snippet */}
            {currentLesson.codeSnippet && (
              <div className="rounded-2xl border border-white/15 bg-[#090b17] overflow-hidden shadow-xl">
                <div className="px-4 py-2.5 bg-[#12152d] border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-bold text-slate-200 font-mono">Example Implementation</span>
                  </div>
                  <button
                    onClick={handleCopyCode}
                    className="p-1.5 px-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copiedCode ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-4 overflow-x-auto text-xs font-mono text-cyan-300/90 bg-[#090b17] leading-relaxed">
                  <code>{currentLesson.codeSnippet}</code>
                </pre>
              </div>
            )}

            {/* Key Takeaway Callout Box */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-900/30 via-indigo-900/20 to-cyan-900/20 border border-indigo-500/30 flex items-start gap-3">
              <Award className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-extrabold text-white">Key Takeaway</h4>
                <p className="text-xs text-slate-300 mt-0.5">{currentLesson.keyTakeaway}</p>
              </div>
            </div>

            {/* Bottom Lesson Navigation */}
            <div className="pt-6 border-t border-white/10 flex items-center justify-between">
              <button
                onClick={handlePrevLesson}
                disabled={currentLessonIndex === 0}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Previous Lesson</span>
              </button>

              <button
                onClick={handleNextLesson}
                disabled={currentLessonIndex === totalLessons - 1}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 text-xs font-bold text-white shadow-lg shadow-purple-500/25 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>Next Lesson</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

