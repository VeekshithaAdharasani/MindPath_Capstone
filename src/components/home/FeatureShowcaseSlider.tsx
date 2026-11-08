import { ChevronLeft, ChevronRight, Pause, Play, Sparkles } from 'lucide-react';
import React, { useEffect, useState } from 'react';

export interface FeatureSlide {
  id: string;
  badge: string;
  title: string;
  tagline: string;
  description: string;
  image: string;
  accent: string;
}

export const featureSlides: FeatureSlide[] = [
  {
    id: 'dashboard',
    badge: '1 OF 5 • COMMAND CENTER',
    title: 'Daily Consistency Heatmap & Focus Tracking',
    tagline: 'Build unbroken study habits with visual streak tracking & progress rings',
    description: 'Monitor your study momentum across a 16-week matrix, check off daily targets, and unlock milestone badges.',
    image: '/assets/slides/slide1_dashboard.svg',
    accent: 'from-purple-500/20 to-indigo-500/20 border-indigo-500/40 text-indigo-300',
  },
  {
    id: 'companion',
    badge: '2 OF 5 • AI COMPANION',
    title: '24/7 AI Companion & Live Web Intelligence',
    tagline: 'Real-time 2026 exam trends, syllabus updates & math evaluations',
    description: 'Converse with your personalized mentor. Get live citations, step-by-step calculus derivations, and tailored roadmaps.',
    image: '/assets/slides/slide2_ai_chat.svg',
    accent: 'from-cyan-500/20 to-blue-500/20 border-cyan-500/40 text-cyan-300',
  },
  {
    id: 'career',
    badge: '3 OF 5 • CAREER EXPLORER',
    title: 'Interactive Career Match & What-If Simulator',
    tagline: 'Discover high-growth tech roles & model salary trajectories',
    description: 'Compare AI Engineer, Data Scientist, and Cyber Security paths with verified CTC benchmarks and simulate skill outcomes.',
    image: '/assets/slides/slide3_career_explorer.svg',
    accent: 'from-purple-500/20 to-pink-500/20 border-purple-500/40 text-purple-300',
  },
  {
    id: 'quizzes',
    badge: '4 OF 5 • ADAPTIVE QUIZZES',
    title: 'Timed Subject Challenges & Verified Scores',
    tagline: 'Test your mastery with instant step-by-step explanations',
    description: 'Timed mock assessments in Calculus, Physics, and Algorithmic Logic with instant explanations and score verification.',
    image: '/assets/slides/slide4_quizzes.svg',
    accent: 'from-amber-500/20 to-emerald-500/20 border-emerald-500/40 text-emerald-300',
  },
  {
    id: 'learning',
    badge: '5 OF 5 • LEARNING HUB',
    title: 'Curated Technical Curriculum & Skill Roadmaps',
    tagline: 'Beginner-to-advanced courses with streak bonus extenders',
    description: 'Master Python, Machine Learning, and Cloud Architecture with structured modules, rating breakdowns, and 30-min goals.',
    image: '/assets/slides/slide5_learning_hub.svg',
    accent: 'from-indigo-500/20 to-cyan-500/20 border-indigo-500/40 text-indigo-300',
  },
];

interface FeatureShowcaseSliderProps {
  compact?: boolean;
}

export const FeatureShowcaseSlider: React.FC<FeatureShowcaseSliderProps> = ({ compact = false }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % featureSlides.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [isPaused]);

  const handlePrevSlide = () => {
    setCurrentSlide((prev) => (prev === 0 ? featureSlides.length - 1 : prev - 1));
  };

  const handleNextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % featureSlides.length);
  };

  const active = featureSlides[currentSlide];

  return (
    <div className="space-y-4">
      {/* Top Header Row with Controls */}
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-bold">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Platform Showcase • How It Works</span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1.5 bg-[#12152e] border border-white/10 px-2 py-1 rounded-full">
          <button
            type="button"
            onClick={() => setIsPaused(!isPaused)}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title={isPaused ? 'Resume auto-play' : 'Pause auto-play'}
          >
            {isPaused ? <Play className="w-3 h-3 text-emerald-400" /> : <Pause className="w-3 h-3 text-slate-300" />}
          </button>
          <span className="text-[10px] text-slate-400 font-bold px-1">
            {currentSlide + 1} / {featureSlides.length}
          </span>
          <button
            type="button"
            onClick={handlePrevSlide}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Previous feature"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleNextSlide}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Next feature"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Slide Card */}
      <div
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        className="relative rounded-3xl overflow-hidden bg-[#10132b]/90 border border-white/15 shadow-2xl p-4 sm:p-5 group transition-all"
      >
        {/* Outer glow */}
        <div className="absolute -inset-1 bg-gradient-to-r from-purple-600/20 via-indigo-600/20 to-cyan-500/20 rounded-3xl blur-xl pointer-events-none -z-10" />

        {/* Badge & Tooltip */}
        <div className="flex items-center justify-between mb-3">
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border bg-gradient-to-r ${active.accent}`}>
            {active.badge}
          </span>
          <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
            Hover to pause inspection
          </span>
        </div>

        {/* Slide Artwork Preview (Non-Draggable, 4K High-Res SVG) */}
        <div className="relative rounded-2xl overflow-hidden aspect-[16/10] w-full border border-white/10 shadow-inner bg-[#090b17] flex items-center justify-center select-none">
          <img
            key={active.id}
            src={active.image}
            alt={active.title}
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
            className="w-full h-full object-cover select-none pointer-events-none animate-in fade-in zoom-in-95 duration-500"
          />
        </div>

        {/* Text Details */}
        <div className="mt-4 space-y-1.5">
          <h3 className="text-sm sm:text-base font-extrabold text-white tracking-tight flex items-center gap-2">
            <span>{active.title}</span>
          </h3>
          <p className="text-xs text-indigo-300 font-semibold">
            {active.tagline}
          </p>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            {active.description}
          </p>
        </div>

        {/* Dot Pagination */}
        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {featureSlides.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setCurrentSlide(idx)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  currentSlide === idx
                    ? 'w-8 bg-gradient-to-r from-purple-500 to-cyan-400 shadow-sm shadow-cyan-400/50'
                    : 'w-2 bg-slate-700 hover:bg-slate-500'
                }`}
                title={`Jump to ${s.title}`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2 text-[10px] text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Interactive Feature Demo</span>
          </div>
        </div>
      </div>
    </div>
  );
};

