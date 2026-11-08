import { ArrowRight, Trophy } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { generateQuiz } from '../lib/services/enzonic-ai';
import { QuizTest, UserProfile } from '../types/index.ts';

// Default fallback quizzes if AI generation fails
const defaultQuizzes: QuizTest[] = [
  {
    id: 'math',
    title: 'Mathematics & Calculus Mastery',
    category: 'Subject Tests',
    questionsCount: 10,
    durationMinutes: 15,
    iconBg: 'bg-blue-500/20 text-blue-400',
    image: '/assets/extracted/quiz_math.svg',
    questions: [
      {
        question: 'What is the derivative of f(x) = 3x^2 + 5x - 7 with respect to x?',
        options: ['6x + 5', '3x + 5', '6x^2 + 5', '6x - 7'],
        correctIndex: 0,
        explanation: 'Using the power rule: d/dx(3x^2) = 6x, and d/dx(5x) = 5.',
      },
    ],
  },
  {
    id: 'science',
    title: 'Advanced Science & Physics',
    category: 'Subject Tests',
    questionsCount: 10,
    durationMinutes: 18,
    iconBg: 'bg-emerald-500/20 text-emerald-400',
    image: '/assets/extracted/quiz_science.svg',
    questions: [
      {
        question: 'What is the primary currency of cellular chemical energy in humans?',
        options: ['DNA', 'ATP (Adenosine Triphosphate)', 'Glucose', 'Ribosome'],
        correctIndex: 1,
        explanation: 'ATP captures chemical energy obtained from the breakdown of food molecules.',
      },
    ],
  },
];

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load quizzes from user interest or generate new ones
  const loadQuizzes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const interest = user?.careerInterest || 'general technology';
      
      // Generate quizzes based on user interest using NVIDIA AI via Enzonic
      const topics = interest.split(',').map(t => t.trim()).filter(Boolean);
      const quizPromises = topics.slice(0, 3).map(async (topic) => {
        const quiz = await generateQuiz(topic, 'intermediate', 5);
        return {
          id: `ai-${topic.toLowerCase().replace(/\s+/g, '-')}`,
          title: quiz.title,
          category: 'Subject Tests' as const,
          questionsCount: quiz.questions.length,
          durationMinutes: Math.max(quiz.questions.length * 2, 10),
          iconBg: 'bg-purple-500/20 text-purple-400',
          image: '/assets/extracted/quiz_default.svg',
          questions: quiz.questions.map((q) => ({
            question: q.question,
            options: q.options,
            correctIndex: q.correctIndex,
            explanation: q.explanation,
          })),
        } as QuizTest;
      });

      const generatedQuizzes = await Promise.all(quizPromises);
      setQuizzes(generatedQuizzes.length > 0 ? generatedQuizzes : defaultQuizzes);
    } catch (err: any) {
      setError(err.message || 'Failed to load quizzes');
      setQuizzes(defaultQuizzes);
    } finally {
      setLoading(false);
    }
  }, [user?.careerInterest]);

  // Load quizzes on mount
  useEffect(() => {
    loadQuizzes();
  }, [loadQuizzes]);

  const filteredQuizzes = useMemo(() => {
    if (activeTab === 'My Track') {
      const interestLower = (user?.careerInterest || '').toLowerCase();
      if (interestLower.includes('ai') || interestLower.includes('data')) {
        return quizzes.filter((q) => q.title.toLowerCase().includes('ai') || q.title.toLowerCase().includes('data') || q.title.toLowerCase().includes('math') || q.title.toLowerCase().includes('reasoning'));
      }
      if (interestLower.includes('software') || interestLower.includes('computer') || interestLower.includes('web') || interestLower.includes('dev')) {
        return quizzes.filter((q) => q.title.toLowerCase().includes('reasoning') || q.title.toLowerCase().includes('gk') || q.title.toLowerCase().includes('math'));
      }
      if (interestLower.includes('medic') || interestLower.includes('health')) {
        return quizzes.filter((q) => q.title.toLowerCase().includes('science') || q.title.toLowerCase().includes('gk') || q.title.toLowerCase().includes('reasoning'));
      }
      return quizzes.filter((q) => q.category === 'Subject Tests' || q.id === 'reasoning');
    }
    if (activeTab === 'All Tests') return quizzes;
    return quizzes.filter((q) => q.category === activeTab);
  }, [activeTab, user?.careerInterest, quizzes]);

  const trackLabel = user?.careerInterest ? `My Track (${user.careerInterest})` : 'My Track';
  const tabs = [
    { id: 'My Track', label: trackLabel },
    { id: 'All Tests', label: 'All Tests' },
    { id: 'Subject Tests', label: 'Subject Tests' },
    { id: 'Mock Exams', label: 'Mock Exams' },
    { id: 'Previous Tests', label: 'Previous Tests' },
  ];

  return (
    <div className="p-6 space-y-6 max-w-[1520px] mx-auto animate-in fade-in duration-300">
      {/* Header with Trophy Score */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Quizzes & Tests</h1>
          <p className="text-xs text-slate-400">Test your knowledge and track your performance</p>
        </div>

        <div className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-[#14172f] border border-amber-500/30">
          <Trophy className="w-5 h-5 text-amber-400" />
          <div>
            <p className="text-[10px] text-slate-400 font-semibold uppercase">Your Score</p>
            <p className="text-sm font-extrabold text-white">
              {testsTaken > 0 ? `${bestScore}%` : '--'}
            </p>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-4 border-purple-500/30 border-t-purple-500 animate-spin" />
            <p className="text-sm text-slate-400">Generating AI quizzes...</p>
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
              <h2 className="text-sm font-bold text-white">Available Tests</h2>
              <span className="text-xs text-indigo-400 font-medium cursor-pointer hover:underline">
                View All →
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredQuizzes.map((q) => (
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
                        <div className="absolute top-3 left-3">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 backdrop-blur-md">
                            {q.category}
                          </span>
                        </div>
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
                        {q.questionsCount} Standard Verified Questions • Timed Mock
                      </p>
                    </div>
                  </div>
                  <div className="px-5 pb-5 pt-2 border-t border-white/5 flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-medium">
                      Timed Challenge
                    </span>
                    <button
                      onClick={() => onStartQuiz(q)}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 text-xs font-bold text-white transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                    >
                      <span>Start Test</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Your Performance Strip */}
          <div className="rounded-3xl bg-[#14172f] border border-white/10 p-6 shadow-xl">
            <h2 className="text-sm font-bold text-white mb-4">Your Performance</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-[#181d3d] border border-white/5 flex items-center gap-4">
                <span className="text-2xl font-extrabold text-emerald-400">
                  {testsTaken > 0 ? `${bestScore}%` : '--'}
                </span>
                <div>
                  <p className="text-xs font-bold text-white">Best Score</p>
                  <p className="text-[10px] text-slate-400">
                    {testsTaken > 0 ? 'Highest achieved test score' : 'No tests taken yet'}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#181d3d] border border-white/5 flex items-center gap-4">
                <span className="text-2xl font-extrabold text-indigo-400">
                  {testsTaken > 0 ? `${averageScore}%` : '--'}
                </span>
                <div>
                  <p className="text-xs font-bold text-white">Average Score</p>
                  <p className="text-[10px] text-slate-400">
                    {testsTaken > 0 ? 'Consistent performance' : 'Take tests to track accuracy'}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#181d3d] border border-white/5 flex items-center gap-4">
                <span className="text-2xl font-extrabold text-purple-400">{testsTaken}</span>
                <div>
                  <p className="text-xs font-bold text-white">Tests Taken</p>
                  <p className="text-[10px] text-slate-400">
                    {testsTaken > 0 ? 'Total verified assessments' : '0 completed tests'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};