import {
  ArrowRight,
  BarChart3,
  Bell,
  Brain,
  Check,
  Compass,
  Eye,
  EyeOff,
  Flame,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Trophy,
  User,
  Wand2,
  X,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { MindPathCubeLogo } from '../components/brand/MindPathCubeLogo.tsx';
import { UserProfile } from '../types/index.ts';

interface LandingPageViewProps {
  onAuthenticated: (user: UserProfile, isNewRegistration?: boolean) => void;
  onExploreDemo?: () => void;
}

export const LandingPageView: React.FC<LandingPageViewProps> = ({
  onAuthenticated,
  onExploreDemo,
}) => {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'register' | 'login'>('register');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [educationLevel, setEducationLevel] = useState('College Undergrad');
  const [careerInterest, setCareerInterest] = useState('AI & Data Science');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeNav, setActiveNav] = useState<'home' | 'features' | 'how-it-works' | 'reviews'>('home');

  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'features') {
        setActiveNav('features');
        document.getElementById('features-section')?.scrollIntoView({ behavior: 'smooth' });
      } else if (hash === 'how-it-works') {
        setActiveNav('how-it-works');
        document.getElementById('how-it-works-section')?.scrollIntoView({ behavior: 'smooth' });
      } else if (hash === 'reviews') {
        setActiveNav('reviews');
        document.getElementById('testimonial-section')?.scrollIntoView({ behavior: 'smooth' });
      } else if (hash === 'home') {
        setActiveNav('home');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const handleNavClick = (tab: 'home' | 'features' | 'how-it-works' | 'reviews', sectionId: string) => {
    setActiveNav(tab);
    if (tab === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      window.history.pushState(null, '', '#home');
    } else {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        window.history.pushState(null, '', `#${tab}`);
      }
    }
  };

  const handleOpenAuth = (mode: 'register' | 'login' = 'register') => {
    setAuthMode(mode);
    setError(null);
    setIsAuthOpen(true);
  };

  const handleSubmitAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (authMode === 'register') {
      if (!name.trim() || !email.trim()) {
        setError('Please provide your name and email address.');
        return;
      }
      if (!password || password.length < 6) {
        setError('Password must be at least 6 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match. Please re-enter.');
        return;
      }
    }

    if (authMode === 'login') {
      if (!email.trim() || !password) {
        setError('Please enter your email and password to sign in.');
        return;
      }
    }

    setLoading(true);

    try {
      const endpoint = authMode === 'register' ? '/api/user/create' : '/api/user/login';
      const body = authMode === 'register'
        ? {
            name: name.trim(),
            email: email.trim(),
            password,
            educationLevel,
            careerInterest,
          }
        : {
            email: email.trim(),
            password,
          };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Authentication failed. Please verify your details.');
      }

      onAuthenticated(data.user, authMode === 'register');
    } catch (err: any) {
      setError(err?.message || 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between relative overflow-x-hidden select-none font-sans bg-[#070914] text-slate-100">
      {/* Background Subtle Tech Ambient Grid & Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[550px] bg-gradient-to-b from-purple-600/15 via-indigo-600/10 to-transparent blur-[140px] pointer-events-none rounded-full" />
      <div className="absolute top-[25%] right-[-10%] w-[600px] h-[600px] rounded-full blur-[180px] pointer-events-none bg-cyan-600/10" />
      <div className="absolute bottom-[10%] left-[-10%] w-[600px] h-[600px] rounded-full blur-[180px] pointer-events-none bg-purple-700/10" />

      {/* ========================================================= */}
      {/* 1. TOP HEADER & HERO CONTAINER (PROFESSIONAL BACKGROUND)   */}
      {/* ========================================================= */}
      <div
        id="hero-section"
        className="relative w-full overflow-hidden bg-cover bg-no-repeat"
        style={{
          backgroundImage: `url('/assets/landing_hero_bg.jpg?v=pro')`,
          backgroundPosition: 'right 28% top',
          backgroundSize: 'cover',
        }}
      >
        {/* Left Dark Gradient Overlay for Maximum Text Readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#070914] via-[#070914]/90 lg:via-[#070914]/75 to-transparent pointer-events-none lg:w-3/5" />
        {/* Deep, seamless bottom fade dissolving the image into pure #070914 with zero cut line */}
        <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-[#070914] via-[#070914] via-40% to-transparent pointer-events-none" />

        {/* 1. TOP NAVIGATION BAR */}
        <header className="px-6 py-5 max-w-7xl mx-auto w-full flex items-center justify-between relative z-20">
          {/* Brand Logo: 3D Isometric Cube + Brand Typography */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => handleNavClick('home', 'hero-section')}>
            <MindPathCubeLogo size="md" pulse={true} />
            <div className="flex flex-col leading-tight">
              <span className="text-lg font-black tracking-tight flex items-center gap-1 text-white">
                MindPath
              </span>
              <span className="text-[11px] text-cyan-400 font-semibold tracking-wide">
                Your AI Companion
              </span>
            </div>
          </div>

          {/* Middle Navigation Bar Pill */}
          <nav className="hidden md:flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#0d1026]/85 border border-white/10 backdrop-blur-xl shadow-xl shadow-black/40">
            <button
              onClick={() => handleNavClick('home', 'hero-section')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                activeNav === 'home'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              Home
            </button>
            <button
              onClick={() => handleNavClick('features', 'features-section')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                activeNav === 'features'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              Features
            </button>
            <button
              onClick={() => handleNavClick('how-it-works', 'how-it-works-section')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                activeNav === 'how-it-works'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              How It Works
            </button>
            <button
              onClick={() => handleNavClick('reviews', 'testimonial-section')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                activeNav === 'reviews'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              Reviews
            </button>
            <button
              onClick={() => handleOpenAuth('register')}
              className="px-3.5 py-1.5 rounded-full text-xs font-bold text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Career Explorer</span>
            </button>
          </nav>

          {/* Right Action Button */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => handleOpenAuth('login')}
              className="text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer hidden sm:block"
            >
              Sign In
            </button>
            <button
              onClick={() => handleOpenAuth('register')}
              className="px-5 py-2 rounded-full bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-xs font-bold text-white shadow-lg shadow-purple-600/30 flex items-center gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* 2. HERO CONTENT */}
        <section className="relative px-6 pt-6 pb-20 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center z-10 min-h-[660px] lg:min-h-[740px]">
          {/* Left Column: Headline, Description & CTAs (5-6 cols) */}
          <div className="lg:col-span-6 xl:col-span-5 space-y-6 max-w-lg lg:max-w-[460px]">
            {/* Pill Badge with Live Status */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-purple-950/70 border border-purple-500/40 text-purple-200 shadow-[0_0_20px_rgba(168,85,247,0.25)] backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Personalized AI Learning Companion</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-4xl lg:text-[46px] font-black tracking-tight leading-[1.12] text-white">
              Your Personal Guide <br />
              to a{' '}
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                  Brighter Future
                </span>
                <svg
                  className="absolute -bottom-2 left-0 w-full h-3 text-cyan-400"
                  viewBox="0 0 260 12"
                  fill="none"
                >
                  <path
                    d="M2 9C70 2 190 2 258 9"
                    stroke="currentColor"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </h1>

            {/* Description Subtitle */}
            <p className="text-sm leading-relaxed text-slate-300">
              Explore high-growth careers, generate tailored study roadmaps, and master difficult subjects with your 24/7 AI companion — engineered for academic excellence and rapid career growth.
            </p>

            {/* Call to Action */}
            <div className="flex flex-wrap items-center gap-3.5 pt-2">
              <button
                onClick={() => handleOpenAuth('register')}
                className="px-7 py-3 rounded-full bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-sm font-bold text-white shadow-xl shadow-purple-600/40 flex items-center gap-2.5 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <span>Start Your Journey</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleNavClick('features', 'features-section')}
                className="px-5 py-3 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 text-sm font-semibold text-slate-200 hover:text-white transition-all cursor-pointer backdrop-blur-sm"
              >
                Explore Features
              </button>
            </div>
          </div>

          {/* Right Column: Clean Spacer allowing the professional background photography & skyline to shine */}
          <div className="hidden lg:block lg:col-span-6 xl:col-span-7 min-h-[500px] pointer-events-none" />
        </section>
      </div>

      {/* Middle Section Nav Tabs Bridge (Eliminating any abrupt cut & providing instant navigation) */}
      <div className="relative -mt-7 mb-10 flex justify-center px-4 z-20">
        <div className="inline-flex items-center gap-1.5 p-1.5 rounded-2xl bg-[#0d1129]/95 border border-white/15 backdrop-blur-2xl shadow-2xl shadow-black/80">
          <button
            onClick={() => handleNavClick('features', 'features-section')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeNav === 'features'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/40'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Features</span>
          </button>
          <button
            onClick={() => handleNavClick('how-it-works', 'how-it-works-section')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeNav === 'how-it-works'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/40'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Compass className="w-3.5 h-3.5 text-purple-400" />
            <span>How It Works</span>
          </button>
          <button
            onClick={() => handleNavClick('reviews', 'testimonial-section')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeNav === 'reviews'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/40'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Student Stories</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. MIDDLE HORIZONTAL FEATURES DOCK (6 ITEMS - BENTO)      */}
      {/* ========================================================= */}
      <section id="features-section" className="px-6 py-10 max-w-7xl mx-auto w-full z-10">
        <div className="text-center max-w-2xl mx-auto mb-8 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 border border-cyan-500/25">
            <Sparkles className="w-3 h-3" />
            <span>Built For Student Success</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Everything You Need to Master Your Path
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Powered by state-of-the-art AI models customized for Indian curricula, entrance exams, and global engineering careers.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Feature 1 */}
          <div className="p-6 rounded-3xl bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/10 hover:border-purple-500/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-purple-500/10 group">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/15 text-purple-400 border border-purple-500/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Brain className="w-6 h-6" />
            </div>
            <div className="flex items-center justify-between mb-1.5">
              <h3 className="text-base font-bold text-white">AI Career Guidance</h3>
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full">Explore</span>
            </div>
            <p className="text-xs leading-relaxed text-slate-300">
              Discover verified high-growth career options aligned with your unique strengths, passions, and salary benchmarks.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="p-6 rounded-3xl bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/10 hover:border-cyan-500/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-cyan-500/10 group">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Target className="w-6 h-6" />
            </div>
            <div className="flex items-center justify-between mb-1.5">
              <h3 className="text-base font-bold text-white">Personalized Learning</h3>
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full">Adaptive</span>
            </div>
            <p className="text-xs leading-relaxed text-slate-300">
              Receive step-by-step custom study schedules and curated learning materials tailored to your syllabus and target score.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="p-6 rounded-3xl bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/10 hover:border-indigo-500/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/10 group">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div className="flex items-center justify-between mb-1.5">
              <h3 className="text-base font-bold text-white">Track Your Progress</h3>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">Real-Time</span>
            </div>
            <p className="text-xs leading-relaxed text-slate-300">
              Live concept mastery percentages, time investment charts, and predictive test readiness scores updated automatically.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="p-6 rounded-3xl bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/10 hover:border-rose-500/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-rose-500/10 group">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Bell className="w-6 h-6" />
            </div>
            <div className="flex items-center justify-between mb-1.5">
              <h3 className="text-base font-bold text-white">Smart Reminders</h3>
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full">Automated</span>
            </div>
            <p className="text-xs leading-relaxed text-slate-300">
              Proactive nudges for upcoming review intervals, exam deadlines, and daily targets so you stay consistent without burnout.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="p-6 rounded-3xl bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/10 hover:border-amber-500/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-500/10 group">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Trophy className="w-6 h-6" />
            </div>
            <div className="flex items-center justify-between mb-1.5">
              <h3 className="text-base font-bold text-white">AI Quizzes &amp; Tests</h3>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">Evaluated</span>
            </div>
            <p className="text-xs leading-relaxed text-slate-300">
              Infinite topic-wise quizzes with detailed solution breakdowns and instant diagnostic feedback on your weak spots.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="p-6 rounded-3xl bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/10 hover:border-emerald-500/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-500/10 group">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Flame className="w-6 h-6" />
            </div>
            <div className="flex items-center justify-between mb-1.5">
              <h3 className="text-base font-bold text-white">Gamified Streaks</h3>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">Motivation</span>
            </div>
            <p className="text-xs leading-relaxed text-slate-300">
              Maintain daily study streaks, unlock prestigious milestones, and stay inspired with personalized companion coaching.
            </p>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 4. HOW IT WORKS & TESTIMONIAL SECTION                     */}
      {/* ========================================================= */}
      <section id="how-it-works-section" className="px-6 py-10 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch z-10">
        {/* Left: How It Works? 3 Steps Pipeline (7 cols) */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider text-purple-400 bg-purple-500/10 border border-purple-500/25 mb-2">
              <Compass className="w-3 h-3" />
              <span>Step-by-Step Pipeline</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              How MindPath Works
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              From day one to career mastery in three seamless steps:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 items-stretch relative">
            {/* Step 1 */}
            <div className="p-5 rounded-3xl bg-white/[0.04] border border-white/10 flex flex-col justify-between relative space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black font-mono text-cyan-400">01</span>
                <div className="w-9 h-9 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Tell Us Your Target</h4>
                <p className="text-xs leading-relaxed text-slate-400 mt-1">
                  Share your current grade, exam focus, and dream career interest.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-5 rounded-3xl bg-white/[0.04] border border-white/10 flex flex-col justify-between relative space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black font-mono text-purple-400">02</span>
                <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center">
                  <Wand2 className="w-4 h-4" />
                </div>
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Get Custom Blueprint</h4>
                <p className="text-xs leading-relaxed text-slate-400 mt-1">
                  MindPath constructs your personalized study roadmap and daily goals.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-5 rounded-3xl bg-white/[0.04] border border-white/10 flex flex-col justify-between relative space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black font-mono text-amber-400">03</span>
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
                  <Trophy className="w-4 h-4" />
                </div>
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Learn &amp; Accelerate</h4>
                <p className="text-xs leading-relaxed text-slate-400 mt-1">
                  Practice with quizzes, measure mastery, and hit your target score.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={() => handleOpenAuth('register')}
              className="px-7 py-3 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-xs font-bold text-white shadow-lg shadow-purple-600/30 flex items-center gap-2 cursor-pointer transition-transform hover:scale-105"
            >
              <span>Get Started Now</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right: High-Credibility Verified Student Spotlight (5 cols) */}
        <div
          id="testimonial-section"
          className="lg:col-span-5 rounded-3xl p-6 sm:p-7 backdrop-blur-xl shadow-2xl relative overflow-hidden flex flex-col justify-between bg-gradient-to-b from-[#0f1433]/90 to-[#0a0d24]/90 border border-white/15"
        >
          {/* Subtle Accent Glow */}
          <div className="absolute top-0 right-0 w-44 h-44 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

          <div className="space-y-4 relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-amber-400 text-xs">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                ))}
              </div>
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                <Check className="w-3 h-3" />
                <span>VERIFIED STUDENT</span>
              </div>
            </div>

            <p className="text-xs sm:text-sm leading-relaxed text-slate-200">
              "MindPath completely transformed my preparation strategy. The AI diagnostic identified exactly why my calculus intuition was stumbling, and within 3 weeks my mock scores jumped from 71% to 94%."
            </p>

            {/* Metric Callouts */}
            <div className="grid grid-cols-3 gap-2 pt-2">
              <div className="p-2.5 rounded-2xl bg-white/[0.04] border border-white/10 text-center">
                <div className="text-sm font-black text-emerald-400">+38%</div>
                <div className="text-[10px] text-slate-400">Score Boost</div>
              </div>
              <div className="p-2.5 rounded-2xl bg-white/[0.04] border border-white/10 text-center">
                <div className="text-sm font-black text-amber-400">14 Days</div>
                <div className="text-[10px] text-slate-400">Study Streak</div>
              </div>
              <div className="p-2.5 rounded-2xl bg-white/[0.04] border border-white/10 text-center">
                <div className="text-sm font-black text-cyan-400">Top 1%</div>
                <div className="text-[10px] text-slate-400">Class Rank</div>
              </div>
            </div>
          </div>

          <div className="pt-6 flex items-center justify-between border-t border-white/10 mt-6 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-purple-500 to-cyan-400 p-0.5 shadow-md">
                <div className="w-full h-full rounded-full bg-[#0c1026] flex items-center justify-center text-white font-extrabold text-sm">
                  AM
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-white flex items-center gap-1.5">
                  Arjun Mehta
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                </p>
                <p className="text-[11px] text-slate-400">
                  Class 12 CBSE • Target: B.Tech CSE
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-mono text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-lg border border-purple-500/20">
                IIT-JEE / CBSE
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 5. FOOTER                                                 */}
      {/* ========================================================= */}
      <footer className="px-6 py-6 max-w-7xl mx-auto w-full border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 z-10">
        <div className="flex items-center gap-2">
          <MindPathCubeLogo size="xs" pulse={false} />
          <span>© 2026 MindPath AI Companion. All rights reserved.</span>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-slate-400">
          <button onClick={() => handleOpenAuth('login')} className="hover:text-purple-600 transition-colors cursor-pointer">
            Sign In
          </button>
          <span>•</span>
          <button onClick={() => handleOpenAuth('register')} className="hover:text-purple-600 transition-colors cursor-pointer">
            Create Account
          </button>
        </div>
      </footer>

      {/* ========================================================= */}
      {/* 6. AUTH MODAL (Sign In / Register)                        */}
      {/* ========================================================= */}
      {isAuthOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-[#0e122b] border border-white/15 p-6 sm:p-8 shadow-2xl relative animate-in zoom-in-95 duration-200">
            {/* Close Button */}
            <button
              onClick={() => setIsAuthOpen(false)}
              className="absolute top-5 right-5 p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3 mb-6">
              <MindPathCubeLogo size="md" pulse={true} />
              <div>
                <h3 className="text-base font-bold text-white">
                  {authMode === 'register' ? 'Join MindPath' : 'Welcome Back'}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {authMode === 'register' ? 'Start your personalized journey today' : 'Continue your learning streak'}
                </p>
              </div>
            </div>

            {/* Tab Switcher */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-[#14172f] rounded-xl border border-white/10 mb-5">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('register');
                  setError(null);
                }}
                className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  authMode === 'register'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Create Account
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setError(null);
                }}
                className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  authMode === 'login'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Sign In
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
                {error}
              </div>
            )}

            {/* Auth Form */}
            <form onSubmit={handleSubmitAuth} className="space-y-3.5">
              {authMode === 'register' && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Full Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Alex Kumar"
                      required
                      className="w-full bg-[#080a18] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@example.com"
                    required
                    className="w-full bg-[#080a18] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    required
                    className="w-full bg-[#080a18] border border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-500 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {authMode === 'register' && (
                <>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Confirm Password</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        required
                        className="w-full bg-[#080a18] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">Education Level</label>
                      <select
                        value={educationLevel}
                        onChange={(e) => setEducationLevel(e.target.value)}
                        className="w-full bg-[#080a18] border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                      >
                        <option value="Class 10">Class 10</option>
                        <option value="Class 11">Class 11</option>
                        <option value="Class 12">Class 12</option>
                        <option value="College Undergrad">College Undergrad</option>
                        <option value="Graduate / Professional">Graduate / Professional</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">Career Goal</label>
                      <select
                        value={careerInterest}
                        onChange={(e) => setCareerInterest(e.target.value)}
                        className="w-full bg-[#080a18] border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                      >
                        <option value="AI & Data Science">AI &amp; Data Science</option>
                        <option value="Full Stack Development">Full Stack Development</option>
                        <option value="Cloud Architecture">Cloud Architecture</option>
                        <option value="Cybersecurity">Cybersecurity</option>
                        <option value="Medical & Healthcare">Medical &amp; Healthcare</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-xs font-bold text-white shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
              >
                <span>{loading ? 'Authenticating...' : authMode === 'register' ? 'Create Account & Enter' : 'Sign In to MindPath'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};