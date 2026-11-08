import { ArrowRight, CheckCircle2, History, PlusCircle, RefreshCw, Sparkles, Trophy } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { QuizTest, UserProfile } from '../types/index.ts';

interface QuizAttempt {
  id: string;
  quiz_title: string;
  category: string;
  score: number;
  total_questions: number;
  weak_topics: string;
  completed_at: number;
}

interface QuizViewProps {
  user?: UserProfile;
  onStartQuiz: (quiz: QuizTest) => void;
  bestScore: number;
  averageScore: number;
  testsTaken: number;
}

export const QuizView: React.FC<QuizViewProps> = ({
  user,
  onStartQuiz,
  bestScore,
  averageScore,
  testsTaken,
}) => {
  const [activeTab, setActiveTab] = useState<string>('My Track');
  const [quizzes, setQuizzes] = useState<QuizTest[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingCustom, setGeneratingCustom] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load persistent quizzes and past attempts from Turso DB
  const loadQuizzesAndAttempts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch saved quizzes and past attempts in parallel
      const headers = user?.id ? { 'x-user-id': user.id } : {};
      const [quizzesRes, attemptsRes] = await Promise.all([
        fetch('/api/quizzes', { headers }).catch(() => null),
        fetch('/api/quizzes/attempts', { headers }).catch(() => null),
      ]);

      let savedQuizzes: QuizTest[] = [];
      if (quizzesRes?.ok) {
        const qData = await quizzesRes.json();
        if (Array.isArray(qData.quizzes) && qData.quizzes.length > 0) {
          savedQuizzes = qData.quizzes.map((q: any) => ({
            id: q.id,
            title: q.title,
            category: (q.category || 'Subject Tests') as any,
            questionsCount: Array.isArray(q.questions) ? q.questions.length : 5,
            durationMinutes: q.durationMinutes || 10,
            iconBg: 'bg-purple-500/20 text-purple-400',
            image: '/assets/extracted/quiz_default.svg',
            questions: q.questions || [],
          }));
        }
      }

      if (attemptsRes?.ok) {
        const aData = await attemptsRes.json();
        if (Array.isArray(aData)) {
          setAttempts(aData);
        }
      }

      // If no quizzes exist yet in Turso DB for this user, generate initial diagnostic quizzes
      if (savedQuizzes.length === 0) {
        const interest = user?.careerInterest || 'Artificial Intelligence, Mathematics, Data Structures';
        const topics = interest.split(',').map((t) => t.trim()).filter(Boolean);
        const targetTopics = topics.length > 0 ? topics.slice(0, 2) : ['Artificial Intelligence', 'Mathematics'];

        const generatedList: QuizTest[] = [];
        for (const topic of targetTopics) {
          try {
            const genRes = await fetch('/api/quiz/generate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...(user?.id ? { 'x-user-id': user.id } : {}) },
              body: JSON.stringify({ topic, level: 'intermediate', numQuestions: 5 }),
            });
            if (genRes.ok) {
              const resData = await genRes.json();
              if (resData.quiz && Array.isArray(resData.quiz.questions)) {
                generatedList.push({
                  id: resData.quiz.id || `quiz_${Date.now()}`,
                  title: resData.quiz.title || `${topic} Assessment`,
                  category: 'Subject Tests',
                  questionsCount: resData.quiz.questions.length,
                  durationMinutes: Math.max(resData.quiz.questions.length * 2, 10),
                  iconBg: 'bg-purple-500/20 text-purple-400',
                  image: '/assets/extracted/quiz_default.svg',
                  questions: resData.quiz.questions,
                });
              }
            }
          } catch (gErr) {
            console.warn('Initial quiz generation notice:', gErr);
          }
        }
        setQuizzes(generatedList);
      } else {
        setQuizzes(savedQuizzes);
      }
    } catch (err: any) {
      console.error('Failed to load quizzes:', err);
      setError(err?.message || 'Failed to load quizzes from database');
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.careerInterest]);

  useEffect(() => {
    loadQuizzesAndAttempts();
  }, [loadQuizzesAndAttempts]);

  // Generate on-demand new quiz without overwriting past quizzes
  const handleGenerateNewQuiz = async () => {
    setGeneratingCustom(true);
    try {
      const topic = user?.careerInterest ? user.careerInterest.split(',')[0].trim() : 'Computer Science & AI';
      const genRes = await fetch('/api/quiz/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(user?.id ? { 'x-user-id': user.id } : {}) },
        body: JSON.stringify({ topic, level: 'intermediate', numQuestions: 5 }),
      });
      if (genRes.ok) {
        const resData = await genRes.json();
        if (resData.quiz && Array.isArray(resData.quiz.questions)) {
          const newQuiz: QuizTest = {
            id: resData.quiz.id || `quiz_${Date.now()}`,
            title: resData.quiz.title || `${topic} Diagnostic Quiz`,
            category: 'Subject Tests',
            questionsCount: resData.quiz.questions.length,
            durationMinutes: Math.max(resData.quiz.questions.length * 2, 10),
            iconBg: 'bg-purple-500/20 text-purple-400',
            image: '/assets/extracted/quiz_default.svg',
            questions: resData.quiz.questions,
          };
          setQuizzes((prev) => [newQuiz, ...prev]);
          setActiveTab('Subject Tests');
        }
      }
    } catch (err: any) {
      console.error('Generate quiz error:', err);
    } finally {
      setGeneratingCustom(false);
    }
  };

  const filteredQuizzes = useMemo(() => {
    if (activeTab === 'Previous Tests') return [];
    if (activeTab === 'All Tests') return quizzes;
    if (activeTab === 'My Track') {
      const interestLower = (user?.careerInterest || '').toLowerCase();
      return quizzes.filter((q) => {
        const t = q.title.toLowerCase();
        return (
          t.includes('ai') ||
          t.includes('data') ||
          t.includes('math') ||
          t.includes('science') ||
          interestLower.includes(t) ||
          q.category === 'Subject Tests'
        );
      });
    }
    return quizzes.filter((q) => q.category === activeTab);
  }, [activeTab, user?.careerInterest, quizzes]);

  const effectiveTestsTaken = Math.max(testsTaken, attempts.length);
  const effectiveBestScore = attempts.length > 0
    ? Math.max(...attempts.map((a) => Number(a.score) || 0), bestScore || 0)
    : (bestScore || 0);
  const effectiveAvgScore = attempts.length > 0
    ? Math.round(attempts.reduce((sum, a) => sum + (Number(a.score) || 0), 0) / attempts.length)
    : (averageScore || 0);

  const trackLabel = user?.careerInterest ? `My Track (${user.careerInterest.split(',')[0].trim()})` : 'My Track';
  const tabs = [
    { id: 'My Track', label: trackLabel },
    { id: 'All Tests', label: 'All Tests' },
    { id: 'Subject Tests', label: 'Subject Tests' },
    { id: 'Mock Exams', label: 'Mock Exams' },
    { id: 'Previous Tests', label: `Previous Tests (${attempts.length})` },
  ];

  return (
    <div className="p-6 space-y-6 max-w-[1520px] mx-auto animate-in fade-in duration-300">
      {/* Header with Trophy Score & Generate Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-[11px] font-bold tracking-wide uppercase mb-1">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>AI Assessments & Skill Validation</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Quizzes & Tests</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            100% persistent in Turso Cloud DB — review past scores or challenge yourself
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleGenerateNewQuiz}
            disabled={generatingCustom}
            className="px-4 py-2 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 text-xs font-bold text-white shadow-lg shadow-purple-500/25 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all hover:scale-105 active:scale-95"
          >
            {generatingCustom ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <PlusCircle className="w-3.5 h-3.5" />
            )}
            <span>{generatingCustom ? 'Generating AI Quiz...' : '+ Generate AI Diagnostic'}</span>
          </button>

          <div className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-[#14172f] border border-amber-500/30">
            <Trophy className="w-5 h-5 text-amber-400" />
            <div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase">Your Best Score</p>
              <p className="text-sm font-extrabold text-white">
                {effectiveTestsTaken > 0 ? `${effectiveBestScore}%` : '--'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-4 border-purple-500/30 border-t-purple-500 animate-spin" />
            <p className="text-sm text-slate-400">Loading your persistent quizzes from database...</p>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      {!loading && (
        <>
          <div className="flex items-center gap-1.5 p-1 bg-[#14172f] rounded-xl border border-white/10 w-fit overflow-x-auto max-w-full">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Previous Tests Tab View */}
          {activeTab === 'Previous Tests' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <History className="w-4 h-4 text-purple-400" />
                  <span>Completed Quiz Attempts History ({attempts.length})</span>
                </h2>
              </div>

              {attempts.length === 0 ? (
                <div className="p-12 text-center rounded-3xl bg-[#14172f] border border-white/10 space-y-3">
                  <Trophy className="w-8 h-8 text-slate-500 mx-auto" />
                  <p className="text-xs text-slate-300">You haven't completed any tests yet.</p>
                  <button
                    onClick={() => setActiveTab('My Track')}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white cursor-pointer"
                  >
                    Take Your First Quiz →
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {attempts.map((att) => (
                    <div
                      key={att.id}
                      className="p-5 rounded-3xl bg-[#14172f] border border-white/10 flex flex-col justify-between hover:border-purple-500/40 transition-all shadow-md"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/5 border border-white/10 text-slate-300">
                            {att.category || 'Assessment'}
                          </span>
                          <span className={`px-2.5 py-1 rounded-full text-xs font-black border ${
                            att.score >= 80
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : att.score >= 60
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          }`}>
                            {att.score}% Score
                          </span>
                        </div>

                        <h3 className="text-sm font-bold text-white leading-snug">{att.quiz_title}</h3>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Completed on {new Date(att.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>

                        {att.weak_topics && (
                          <div className="mt-3 p-2.5 rounded-xl bg-white/5 border border-white/5">
                            <p className="text-[10px] text-amber-300 font-bold uppercase">Topics to Review:</p>
                            <p className="text-[11px] text-slate-300 mt-0.5">{att.weak_topics}</p>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
                        <span>{att.total_questions || 5} Questions</span>
                        <span className="text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Verified</span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Ready for a Challenge Hero Banner */}
              <div className="relative rounded-3xl overflow-hidden min-h-[200px] sm:min-h-[220px] w-full border border-white/10 shadow-2xl bg-[#11142e] flex items-center group select-none">
                <img
                  src="/assets/extracted/quiz_banner.svg"
                  alt="Quiz Challenge Visual Artwork"
                  draggable={false}
                  onDragStart={(e) => e.preventDefault()}
                  className="absolute inset-0 w-full h-full object-cover object-right pointer-events-none select-none transition-transform duration-700 group-hover:scale-102"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#0c0e1a]/95 via-[#0c0e1a]/75 to-transparent pointer-events-none" />
                <div className="relative z-10 p-6 sm:p-8 max-w-lg">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[10px] font-bold mb-2.5">
                    <Trophy className="w-3.5 h-3.5 text-amber-400" />
                    <span>Interactive Knowledge Challenge</span>
                  </span>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-white">Ready for a challenge?</h2>
                  <p className="text-xs sm:text-sm text-slate-300 mt-1.5 leading-relaxed">
                    Take subject quizzes and timed mock tests to check your understanding and earn score badges.
                  </p>
                  <button
                    onClick={() => filteredQuizzes[0] && onStartQuiz(filteredQuizzes[0])}
                    className="mt-4 px-6 py-2.5 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 text-xs sm:text-sm font-bold text-white shadow-lg shadow-purple-500/30 flex items-center gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                  >
                    <span>Start a Quiz</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Available Tests Grid */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-white">Available Tests ({filteredQuizzes.length})</h2>
                  <button
                    onClick={handleGenerateNewQuiz}
                    disabled={generatingCustom}
                    className="text-xs text-indigo-400 font-semibold cursor-pointer hover:underline flex items-center gap-1"
                  >
                    <span>+ New Diagnostic</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {error ? (
                    <div className="col-span-full p-8 rounded-3xl bg-[#14172f] border border-white/10 text-center space-y-3">
                      <p className="text-xs text-rose-400">{error}</p>
                      <button
                        onClick={loadQuizzesAndAttempts}
                        className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Retry Loading</span>
                      </button>
                    </div>
                  ) : filteredQuizzes.length > 0 ? (
                    filteredQuizzes.map((q) => {
                      const pastAttempt = attempts.find(
                        (a) => a.quiz_title.toLowerCase().trim() === q.title.toLowerCase().trim()
                      );
                      const isCompleted = !!pastAttempt;

                      return (
                        <div
                          key={q.id}
                          className="rounded-3xl bg-[#14172f] border border-white/10 overflow-hidden flex flex-col justify-between hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-500/10 transition-all group select-none"
                        >
                          <div>
                            {q.image && (
                              <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#0d1024]">
                                <img
                                  src={q.image}
                                  alt={q.title}
                                  draggable={false}
                                  onDragStart={(e) => e.preventDefault()}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 pointer-events-none select-none"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#14172f] via-transparent to-transparent pointer-events-none" />
                                <div className="absolute top-3 left-3 flex items-center gap-2">
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 backdrop-blur-md">
                                    {q.category}
                                  </span>
                                </div>
                                {isCompleted && (
                                  <div className="absolute top-3 right-3">
                                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 backdrop-blur-md flex items-center gap-1 shadow-sm">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                      <span>Completed • {pastAttempt.score}%</span>
                                    </span>
                                  </div>
                                )}
                                <div className="absolute bottom-2.5 right-3 text-[10px] font-semibold text-slate-300 bg-black/50 px-2 py-0.5 rounded-md backdrop-blur-xs">
                                  {q.durationMinutes} min
                                </div>
                              </div>
                            )}
                            <div className="p-5">
                              <h3 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors leading-snug">
                                {q.title}
                              </h3>
                              <p className="text-xs text-slate-400 mt-1">
                                {q.questionsCount} Live AI Formulated Questions • Timed Diagnostic
                              </p>
                              {isCompleted && (
                                <p className="text-[11px] text-emerald-400/90 font-medium mt-2 flex items-center gap-1">
                                  <span>Latest Score: {pastAttempt.score}%</span>
                                  {pastAttempt.score >= 80 && <span>🌟 Excellent</span>}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="px-5 pb-5 pt-2 border-t border-white/5 flex items-center justify-between">
                            <span className="text-xs text-slate-400 font-medium">
                              {isCompleted ? 'Completed' : 'Timed Challenge'}
                            </span>
                            <button
                              onClick={() => onStartQuiz(q)}
                              className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-md cursor-pointer flex items-center gap-1.5 ${
                                isCompleted
                                  ? 'bg-white/10 hover:bg-white/15 border border-white/15 hover:border-purple-400/50'
                                  : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500'
                              }`}
                            >
                              <span>{isCompleted ? 'Retake Quiz' : 'Start Test'}</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="col-span-full p-8 text-center text-xs text-slate-400">
                      <p>No tests found for this tab.</p>
                      <button
                        onClick={handleGenerateNewQuiz}
                        className="mt-2 text-indigo-400 hover:underline cursor-pointer"
                      >
                        Generate AI Diagnostic Test
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Your Performance Strip */}
              <div className="rounded-3xl bg-[#14172f] border border-white/10 p-6 shadow-xl">
                <h2 className="text-sm font-bold text-white mb-4">Your Performance</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-[#181d3d] border border-white/5 flex items-center gap-4">
                    <span className="text-2xl font-extrabold text-emerald-400">
                      {effectiveTestsTaken > 0 ? `${effectiveBestScore}%` : '--'}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-white">Best Score</p>
                      <p className="text-[10px] text-slate-400">
                        {effectiveTestsTaken > 0 ? 'Highest achieved test score' : 'No tests taken yet'}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#181d3d] border border-white/5 flex items-center gap-4">
                    <span className="text-2xl font-extrabold text-indigo-400">
                      {effectiveTestsTaken > 0 ? `${effectiveAvgScore}%` : '--'}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-white">Average Score</p>
                      <p className="text-[10px] text-slate-400">
                        {effectiveTestsTaken > 0 ? 'Consistent performance' : 'Take tests to track accuracy'}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#181d3d] border border-white/5 flex items-center gap-4">
                    <span className="text-2xl font-extrabold text-purple-400">{effectiveTestsTaken}</span>
                    <div>
                      <p className="text-xs font-bold text-white">Tests Taken</p>
                      <p className="text-[10px] text-slate-400">
                        {effectiveTestsTaken > 0 ? 'Total verified assessments' : '0 completed tests'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};