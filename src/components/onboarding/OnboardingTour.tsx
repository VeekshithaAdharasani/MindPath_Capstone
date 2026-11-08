import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Compass,
  GraduationCap,
  HelpCircle,
  Home,
  TrendingUp,
  X,
} from 'lucide-react';
import React, { useState } from 'react';
import { NavTab } from '../../types/index.ts';
import { AILogo } from '../brand/AILogo.tsx';
import { BrandLogo } from '../brand/BrandLogo.tsx';

interface OnboardingTourProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: NavTab) => void;
  userName: string;
}

interface TourStep {
  tab: NavTab;
  badge: string;
  title: string;
  headline: string;
  description: string;
  features: string[];
  icon: React.ReactNode;
  accent: string;
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({
  isOpen,
  onClose,
  onNavigate,
  userName,
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const displayName = userName ? userName.split(' ')[0] : 'Learner';

  const steps: TourStep[] = [
    {
      tab: 'home',
      badge: 'Welcome to MindPath',
      title: `Welcome aboard, ${displayName}!`,
      headline: 'Your Unified Academic & Career Growth Platform',
      description:
        'MindPath brings together real-time AI mentorship, verified progress tracking, curriculum roadmaps, and industry career intelligence into a single personalized workspace.',
      features: [
        'Personalized to your education level and career ambitions',
        'Directly synced with MindPath Cloud Workspace',
        'Authentic analytics directly derived from your actual study habits',
      ],
      icon: <BrandLogo size="lg" showText={false} />,
      accent: 'from-purple-600 to-indigo-600',
    },
    {
      tab: 'home',
      badge: 'Home Dashboard',
      title: 'Home: Daily Command Center',
      headline: 'Study Streak Heatmap & Daily Milestones',
      description:
        'This is where you start every study session. Track your unbroken consecutive daily study streak, check off today\'s scheduled tasks, and monitor your radial progress ring.',
      features: [
        'Study Consistency Heatmap: Visual 16-week matrix recording daily focus time',
        'Radial Progress Ring: Real-time completion rate derived from your tasks',
        'Upcoming Tasks: Quick toggle checkboxes for your daily study commitments',
      ],
      icon: <Home className="w-6 h-6 text-indigo-400" />,
      accent: 'from-indigo-600 to-cyan-500',
    },
    {
      tab: 'career',
      badge: 'Career Explorer',
      title: 'Career Explorer: Discover Your Future',
      headline: 'Market Trends, Skill Mappings & Salary Data',
      description:
        'This is where you explore high-growth careers. Compare market roles like AI & Data Scientist, Software Developer, and Medical Specialist with live salary benchmarks and required skill trees.',
      features: [
        'Interactive Career Matching: See skill fit scores based on your strengths',
        'What-If Career Simulator: Test how new skills and certifications unlock higher salaries',
        'Curated pathways with specific high-impact learning milestones',
      ],
      icon: <Compass className="w-6 h-6 text-cyan-400" />,
      accent: 'from-cyan-600 to-blue-600',
    },
    {
      tab: 'learning',
      badge: 'Learning Hub',
      title: 'Learning Hub: Curated Courses',
      headline: 'Beginner-to-Advanced Structured Curriculum',
      description:
        'This is where you build genuine expertise. Browse top-rated courses spanning Python, Data Science, Machine Learning, and Career Readiness with estimated completion times.',
      features: [
        'Category Filtering: Instantly switch between AI, Development, and Career courses',
        'Interactive Course Viewer: Review syllabus, module breakdowns, and instructor ratings',
        'Streak extender: 30 minutes of daily learning keeps your flame burning',
      ],
      icon: <GraduationCap className="w-6 h-6 text-emerald-400" />,
      accent: 'from-emerald-600 to-teal-600',
    },
    {
      tab: 'quizzes',
      badge: 'Quizzes & Tests',
      title: 'Quizzes & Tests: Prove Your Mastery',
      headline: 'Timed Subject Challenges & Verified Scorecards',
      description:
        'This is where you test your knowledge. Take timed mock exams in Mathematics & Calculus, Advanced Physics, and Logical Reasoning with instant answer validation.',
      features: [
        'Real-time timer & question navigation bar',
        'Instant step-by-step mathematical explanations upon submission',
        'Verified scoring: Your best and average test scores automatically update your profile',
      ],
      icon: <HelpCircle className="w-6 h-6 text-purple-400" />,
      accent: 'from-purple-600 to-pink-600',
    },
    {
      tab: 'home',
      badge: 'MindPath Companion',
      title: 'MindPath AI: 24/7 Intelligent Mentor',
      headline: 'Powered by MindPath AI Companion with Live Tools',
      description:
        'This is your personal AI companion. Accessible anytime via the floating button or top navigation. Ask questions, clarify mathematical derivations, or plan your daily schedule.',
      features: [
        'Live Web Search: Up-to-the-minute 2026 exam news, industry trends, and salary intel',
        'Zero-Eval Math Engine: Precise step-by-step algebraic and calculus evaluations',
        'Knowledge Base Tool: Companion reads your live active tasks and streak to give contextual advice',
      ],
      icon: <AILogo size="lg" pulse={true} />,
      accent: 'from-emerald-500 via-cyan-500 to-purple-600',
    },
    {
      tab: 'reports',
      badge: 'Progress & Reports',
      title: 'Progress & Reports: Verified Analytics',
      headline: 'Track Long-Term Growth & Export PDF Recaps',
      description:
        'This is where your achievements are documented. Review your performance summary across subjects, examine milestone completions, and download verified progress reports.',
      features: [
        'Subject breakdown bars for Math, Science, Programming, and General',
        'One-click Printable / PDF Monthly Progress Report for mentors or parents',
        'Milestone badges unlocked automatically as you hit study targets',
      ],
      icon: <TrendingUp className="w-6 h-6 text-amber-400" />,
      accent: 'from-amber-600 to-orange-600',
    },
  ];

  const step = steps[currentStep];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      const nextIndex = currentStep + 1;
      setCurrentStep(nextIndex);
      onNavigate(steps[nextIndex].tab);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      const prevIndex = currentStep - 1;
      setCurrentStep(prevIndex);
      onNavigate(steps[prevIndex].tab);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('mindpath_onboarding_completed', 'true');
    onClose();
    onNavigate('home');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in select-none">
      <div className="w-full max-w-xl bg-[#111428] border border-white/20 rounded-3xl shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-200">
        {/* Top glowing ambient gradient bar */}
        <div className={`h-1.5 w-full bg-gradient-to-r ${step.accent} transition-all duration-300`} />

        {/* Modal Header */}
        <div className="p-5 sm:p-6 pb-2 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${step.accent} p-[1.5px] shadow-lg shrink-0`}>
              <div className="w-full h-full bg-[#0c0e1a] rounded-[14px] flex items-center justify-center">
                {step.icon}
              </div>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/15 border border-indigo-500/30 px-2.5 py-0.5 rounded-full inline-block mb-1">
                {step.badge} • Step {currentStep + 1} of {steps.length}
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight leading-snug">
                {step.title}
              </h2>
            </div>
          </div>

          <button
            onClick={handleComplete}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Skip walkthrough"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="px-5 sm:px-6 py-4 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-indigo-200">
              {step.headline}
            </h3>
            <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
              {step.description}
            </p>
          </div>

          {/* Key Features Callout Box */}
          <div className="p-3.5 rounded-2xl bg-[#181d3d] border border-white/10 space-y-2">
            <p className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">
              Key Capabilities:
            </p>
            {step.features.map((feat, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs text-slate-200 leading-normal">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{feat}</span>
              </div>
            ))}
          </div>

          {/* Progress Indicator Dots */}
          <div className="flex items-center justify-center gap-1.5 pt-2">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  setCurrentStep(i);
                  onNavigate(steps[i].tab);
                }}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  i === currentStep
                    ? 'w-7 bg-indigo-500'
                    : i < currentStep
                    ? 'w-2 bg-indigo-400/60'
                    : 'w-2 bg-white/20'
                }`}
                aria-label={`Go to step ${i + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 sm:p-5 bg-[#0e1124] border-t border-white/10 flex items-center justify-between gap-3">
          <button
            onClick={handleComplete}
            className="text-xs text-slate-400 hover:text-slate-200 transition-colors font-semibold px-3 py-2 cursor-pointer"
          >
            Skip Tour
          </button>

          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                onClick={handlePrev}
                className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            )}

            <button
              onClick={handleNext}
              className={`px-5 py-2 rounded-xl bg-gradient-to-r ${step.accent} hover:brightness-110 text-xs font-bold text-white shadow-lg flex items-center gap-1.5 transition-all cursor-pointer`}
            >
              <span>{currentStep === steps.length - 1 ? 'Start Learning Now!' : `Next: ${steps[currentStep + 1]?.badge}`}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

