import confetti from 'canvas-confetti';
import { AlertCircle, ArrowRight, Award, CheckCircle2, Clock, RotateCcw, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { QuizTest } from '../../types/index.ts';

interface QuizModalProps {
  quiz: QuizTest | null;
  isOpen: boolean;
  onClose: () => void;
  onQuizCompleted: (score: number, total: number, weakAreas: string[]) => void;
}

export const QuizModal: React.FC<QuizModalProps> = ({
  quiz,
  isOpen,
  onClose,
  onQuizCompleted,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(600);
  const [answers, setAnswers] = useState<{ selected: number; correct: boolean }[]>([]);

  useEffect(() => {
    if (isOpen && quiz) {
      setCurrentIndex(0);
      setSelectedOption(null);
      setShowAnswer(false);
      setScore(0);
      setIsFinished(false);
      setAnswers([]);
      setSecondsRemaining(quiz.durationMinutes * 60);
    }
  }, [isOpen, quiz]);

  useEffect(() => {
    if (!isOpen || isFinished || secondsRemaining <= 0) return;
    const interval = setInterval(() => {
      setSecondsRemaining((s) => {
        if (s <= 1) {
          setIsFinished(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, isFinished, secondsRemaining]);

  if (!isOpen || !quiz) return null;

  const currentQ = quiz.questions[currentIndex];

  const handleSelectOption = (idx: number) => {
    if (showAnswer) return;
    setSelectedOption(idx);
  };

  const handleConfirmAnswer = () => {
    if (selectedOption === null) return;
    const isCorrect = selectedOption === currentQ.correctIndex;
    const newScore = isCorrect ? score + 1 : score;
    setScore(newScore);
    setShowAnswer(true);
    setAnswers([...answers, { selected: selectedOption, correct: isCorrect }]);
  };

  const handleNext = async () => {
    if (currentIndex + 1 < quiz.questions.length) {
      setCurrentIndex(currentIndex + 1);
      setSelectedOption(null);
      setShowAnswer(false);
    } else {
      setIsFinished(true);
      const finalScore = score;
      const total = quiz.questions.length;
      const pct = (finalScore / total) * 100;
      if (pct >= 70) {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      }

      // Persist to Turso
      try {
        await fetch('/api/quizzes/attempt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quizTitle: quiz.title,
            category: quiz.category,
            score: finalScore,
            totalQuestions: total,
            weakTopics: pct < 75 ? [quiz.title] : [],
          }),
        });
        onQuizCompleted(finalScore, total, pct < 75 ? [quiz.title] : []);
      } catch (e) {
        console.error('Quiz attempt save error:', e);
      }
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-[#14172f] border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-[#181d3d] border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold">
              ?
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">{quiz.title}</h2>
              <p className="text-[11px] text-slate-400">
                {quiz.category} • {quiz.questions.length} Questions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-[#10132a] rounded-full border border-white/10 text-xs font-mono text-cyan-300">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>{formatTime(secondsRemaining)}</span>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {!isFinished ? (
            <div>
              {/* Progress bar */}
              <div className="mb-4">
                <div className="flex justify-between text-xs text-slate-400 mb-1.5 font-medium">
                  <span>
                    Question {currentIndex + 1} of {quiz.questions.length}
                  </span>
                  <span>Score: {score}</span>
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-300"
                    style={{
                      width: `${((currentIndex + 1) / quiz.questions.length) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {/* Question Text */}
              <h3 className="text-base font-semibold text-white mb-4 leading-relaxed">
                {currentQ.question}
              </h3>

              {/* Options */}
              <div className="space-y-2.5 mb-6">
                {currentQ.options.map((opt, idx) => {
                  let optStyle = 'bg-[#181d3d] border-white/10 hover:border-white/20 text-slate-200';
                  if (selectedOption === idx) {
                    optStyle = 'bg-indigo-600/30 border-indigo-500 text-white shadow-sm';
                  }
                  if (showAnswer) {
                    if (idx === currentQ.correctIndex) {
                      optStyle = 'bg-emerald-950/40 border-emerald-500 text-emerald-200';
                    } else if (selectedOption === idx) {
                      optStyle = 'bg-rose-950/40 border-rose-500 text-rose-200';
                    }
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelectOption(idx)}
                      disabled={showAnswer}
                      className={`w-full p-3.5 rounded-xl border text-xs font-medium text-left flex items-center justify-between transition-all cursor-pointer ${optStyle}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center font-mono text-[11px] shrink-0">
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span>{opt}</span>
                      </div>
                      {showAnswer && idx === currentQ.correctIndex && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      )}
                      {showAnswer && selectedOption === idx && idx !== currentQ.correctIndex && (
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Explanation note when answer revealed */}
              {showAnswer && (
                <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-500/30 text-xs text-indigo-200 mb-4 animate-in fade-in">
                  <p className="font-semibold mb-0.5">Explanation:</p>
                  <p>{currentQ.explanation}</p>
                </div>
              )}
            </div>
          ) : (
            /* Results Screen */
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-400 to-amber-600 p-1 mx-auto mb-4 flex items-center justify-center shadow-lg shadow-amber-500/20">
                <div className="w-full h-full bg-[#14172f] rounded-full flex items-center justify-center">
                  <Award className="w-8 h-8 text-amber-400" />
                </div>
              </div>

              <h3 className="text-xl font-bold text-white mb-1">Assessment Completed!</h3>
              <p className="text-xs text-slate-400 mb-6">
                Your performance has been recorded to your learning profile.
              </p>

              <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto mb-6">
                <div className="p-3 rounded-2xl bg-[#181d3d] border border-white/10">
                  <p className="text-lg font-bold text-indigo-400">
                    {Math.round((score / quiz.questions.length) * 100)}%
                  </p>
                  <p className="text-[10px] text-slate-400">Accuracy</p>
                </div>
                <div className="p-3 rounded-2xl bg-[#181d3d] border border-white/10">
                  <p className="text-lg font-bold text-emerald-400">
                    {score}/{quiz.questions.length}
                  </p>
                  <p className="text-[10px] text-slate-400">Correct</p>
                </div>
                <div className="p-3 rounded-2xl bg-[#181d3d] border border-white/10">
                  <p className="text-lg font-bold text-purple-400">
                    {formatTime((quiz.durationMinutes * 60) - secondsRemaining)}
                  </p>
                  <p className="text-[10px] text-slate-400">Time Spent</p>
                </div>
              </div>

              <p className="text-xs text-slate-300 max-w-md mx-auto mb-6">
                {score / quiz.questions.length >= 0.8
                  ? 'Outstanding work! You demonstrated strong mastery of the core concepts.'
                  : 'Good effort! Your AI Companion has identified a few topics for focused revision.'}
              </p>
            </div>
          )}
        </div>

        {/* Footer controls */}
        <div className="p-4 bg-[#181d3d] border-t border-white/10 flex items-center justify-between">
          {!isFinished ? (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Quit Quiz
              </button>

              {!showAnswer ? (
                <button
                  onClick={handleConfirmAnswer}
                  disabled={selectedOption === null}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-white transition-colors shadow-md cursor-pointer"
                >
                  Confirm Answer
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-xs font-semibold text-white transition-all shadow-md cursor-pointer"
                >
                  <span>
                    {currentIndex + 1 < quiz.questions.length
                      ? 'Next Question'
                      : 'View Results'}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </>
          ) : (
            <div className="w-full flex items-center justify-center gap-3">
              <button
                onClick={() => {
                  setCurrentIndex(0);
                  setSelectedOption(null);
                  setShowAnswer(false);
                  setScore(0);
                  setIsFinished(false);
                  setSecondsRemaining(quiz.durationMinutes * 60);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#14172f] border border-white/15 text-xs text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retake Assessment</span>
              </button>
              <button
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-xs font-semibold text-white hover:from-purple-500 hover:to-indigo-500 transition-all shadow-md cursor-pointer"
              >
                Return to Quizzes
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
