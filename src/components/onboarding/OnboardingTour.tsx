import confetti from 'canvas-confetti';
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  CheckCircle2,
  Compass,
  GraduationCap,
  Loader2,
  MapPin,
  Sparkles,
  Upload,
  User,
  X,
} from 'lucide-react';
import React, { useRef, useState } from 'react';
import { NavTab, UserProfile } from '../../types/index.ts';
import { AILogo } from '../brand/AILogo.tsx';

interface OnboardingTourProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: NavTab) => void;
  userName?: string;
  userId?: string;
  isCompulsory?: boolean;
  initialAvatar?: string;
  initialLocation?: string;
  onProfileUpdated?: (updated: UserProfile) => void;
}

const PRESET_AVATARS = [
  { id: 'alex', label: 'Alex (Tech)', url: '/assets/extracted/alex_avatar.png' },
  { id: 'arjun', label: 'Arjun (AI)', url: '/assets/extracted/arjun_avatar.png' },
  { id: 'student1', label: 'Student', url: '/assets/extracted/student1.png' },
  { id: 'rohan', label: 'Rohan', url: '/assets/extracted/student_rohan.svg' },
  { id: 'sneha', label: 'Sneha', url: '/assets/extracted/student_sneha.svg' },
  { id: 'default', label: 'Cyberpunk', url: '/assets/extracted/default_avatar.svg' },
];

const POPULAR_LOCATIONS = [
  'Bengaluru, India',
  'New Delhi, India',
  'Mumbai, India',
  'Hyderabad, India',
  'San Francisco, USA',
  'London, UK',
  'Singapore',
];

export const OnboardingTour: React.FC<OnboardingTourProps> = ({
  isOpen,
  onClose,
  onNavigate,
  userName = '',
  userId,
  isCompulsory = false,
  initialAvatar,
  initialLocation,
  onProfileUpdated,
}) => {
  const [step, setStep] = useState(1);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatar || PRESET_AVATARS[0].url);
  const [location, setLocation] = useState(initialLocation || '');
  const [bio, setBio] = useState('');
  const [careerInterest, setCareerInterest] = useState('AI & Systems Engineering');
  const [educationLevel, setEducationLevel] = useState('College Undergrad');
  const [targetExam, setTargetExam] = useState('GATE 2026 / FAANG Placements');
  const [loading, setLoading] = useState(false);
  const [generationPhase, setGenerationPhase] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const displayName = userName ? userName.split(' ')[0] : 'Learner';

  const careerSuggestions = [
    'AI & Systems Engineering',
    'GATE CSE 2026',
    'Full-Stack Web Dev',
    'Cybersecurity Analyst',
    'Data Scientist',
    'Quantitative Developer',
    'Cloud Architecture',
    'Robotics & Embedded AI',
  ];

  const educationSuggestions = [
    'College Undergrad',
    'B.Tech / B.E. (CS/IT)',
    'Class 12 CBSE / State',
    'Class 11 Science',
    'Graduate / Working Professional',
    'Self-Taught Developer',
  ];

  const examSuggestions = [
    'GATE CSE 2026',
    'FAANG / MAANG Placements',
    'JEE Advanced',
    'AWS Solutions Architect',
    'UPSC CSE',
    'GRE / TOEFL Grad School',
  ];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, JPG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 256;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setAvatarUrl(dataUrl);
          setError(null);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleAutoDetectLocation = () => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) {
        const parts = tz.split('/');
        const city = parts[parts.length - 1].replace(/_/g, ' ');
        const region = parts[0];
        setLocation(`${city}, ${region}`);
        return;
      }
    } catch {}
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation(`Lat ${pos.coords.latitude.toFixed(1)}°, Lon ${pos.coords.longitude.toFixed(1)}°`);
        },
        () => {
          setLocation('Global Learner');
        }
      );
    }
  };

  const handleCompleteOnboarding = async () => {
    setLoading(true);
    setError(null);
    setGenerationPhase('Analyzing career requirements & 2026 industry demand...');

    const timer1 = setTimeout(() => {
      setGenerationPhase('Synthesizing 6-level personalized career curriculum...');
    }, 1200);

    const timer2 = setTimeout(() => {
      setGenerationPhase('Formulating initial diagnostic assessment & Turso DB tasks...');
    }, 2400);

    try {
      const res = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId || '',
        },
        body: JSON.stringify({
          educationLevel: educationLevel.trim(),
          careerInterest: careerInterest.trim(),
          targetExam: targetExam.trim(),
          location: location.trim(),
          bio: bio.trim(),
          avatarUrl: avatarUrl.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Failed to initialize customized career roadmap.');
      }

      confetti({ particleCount: 140, spread: 85, origin: { y: 0.6 } });

      if (userId) {
        localStorage.setItem(`mindpath_onboarding_completed_${userId}`, 'true');
      }
      localStorage.setItem('mindpath_onboarding_completed', 'true');

      if (onProfileUpdated && data.user) {
        onProfileUpdated(data.user);
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('mindpath:refresh-data'));
      }

      onClose();
      onNavigate('home');
    } catch (err: any) {
      console.error('Onboarding setup error:', err);
      setError(err?.message || 'Could not complete AI onboarding. Please retry.');
    } finally {
      clearTimeout(timer1);
      clearTimeout(timer2);
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        // Prevent dismissal if compulsory
        if (isCompulsory) e.stopPropagation();
      }}
    >
      <div
        className="w-full max-w-xl bg-[#0c0e1e] border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl relative animate-in zoom-in-95 duration-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow Accent Header */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-cyan-400 to-indigo-500" />

        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
          <div className="flex items-center gap-2.5">
            <AILogo size="sm" pulse={true} />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-extrabold text-white">MindPath AI Setup</h2>
                {isCompulsory && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    Compulsory
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400">Step {step} of 4 • Personalized Student Profile</p>
            </div>
          </div>
          {/* Only render close button if not compulsory */}
          {!isCompulsory && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
              aria-label="Close setup"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 1: Profile Photo, Location & Bio                    */}
        {/* ======================================================== */}
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-[10px] font-bold uppercase tracking-wider">
              <User className="w-3.5 h-3.5 text-purple-400" />
              <span>Step 1: Your Profile & Identity</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Welcome, {displayName}! Personalize your profile
            </h1>
            <p className="text-xs text-slate-300 leading-relaxed">
              Upload your photo, set your location, and let your AI companion tailor your learning journey.
            </p>

            {/* Avatar Section */}
            <div className="p-4 rounded-2xl bg-[#14172f] border border-white/10 space-y-3">
              <div className="flex items-center gap-4">
                <div className="relative group shrink-0">
                  <img
                    src={avatarUrl}
                    alt="Profile Avatar"
                    className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl object-cover border-2 border-purple-500/50 shadow-lg shadow-purple-500/20 bg-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 p-1.5 rounded-xl bg-purple-600 text-white shadow hover:bg-purple-500 cursor-pointer transition-transform hover:scale-110"
                    title="Upload custom photo"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-white">Profile Avatar</span>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-400 hover:text-purple-300 cursor-pointer"
                    >
                      <Upload className="w-3 h-3" />
                      <span>Upload Device Photo</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 mb-2">Or choose a preset avatar:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_AVATARS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setAvatarUrl(preset.url)}
                        className={`relative p-0.5 rounded-xl transition-all cursor-pointer ${
                          avatarUrl === preset.url
                            ? 'ring-2 ring-purple-400 scale-105'
                            : 'opacity-70 hover:opacity-100 hover:scale-105'
                        }`}
                        title={preset.label}
                      >
                        <img
                          src={preset.url}
                          alt={preset.label}
                          className="w-7 h-7 rounded-lg object-cover bg-slate-800"
                        />
                        {avatarUrl === preset.url && (
                          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-purple-500 flex items-center justify-center text-white">
                            <Check className="w-2 h-2" />
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Location Section */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Your Location (City, Country)</span>
                </label>
                <button
                  type="button"
                  onClick={handleAutoDetectLocation}
                  className="text-[10px] font-semibold text-cyan-400 hover:text-cyan-300 cursor-pointer"
                >
                  ⚡ Auto-Detect
                </button>
              </div>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Bengaluru, India or San Francisco, USA"
                className="w-full px-4 py-2.5 rounded-2xl bg-[#14172f] border border-white/15 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-colors shadow-inner"
              />
              <div className="flex flex-wrap gap-1 mt-2">
                {POPULAR_LOCATIONS.map((loc) => (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => setLocation(loc)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-colors cursor-pointer ${
                      location === loc
                        ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-400/50'
                        : 'bg-white/5 hover:bg-white/10 text-slate-400 border border-white/10'
                    }`}
                  >
                    {loc}
                  </button>
                ))}
              </div>
            </div>

            {/* Bio Section */}
            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1.5">
                Learning Motto or Short Bio (Optional)
              </label>
              <input
                type="text"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="e.g. Aspiring AI engineer aiming for top tier research & FAANG"
                className="w-full px-4 py-2.5 rounded-2xl bg-[#14172f] border border-white/15 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-purple-500 transition-colors shadow-inner"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-6 py-2.5 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 text-xs font-bold text-white shadow-lg shadow-purple-500/30 flex items-center gap-2 cursor-pointer transition-all hover:scale-105 active:scale-95"
              >
                <span>Continue to Goals</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 2: Dream Career Goal                                */}
        {/* ======================================================== */}
        {step === 2 && (
          <div className="space-y-4 animate-in fade-in">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-[10px] font-bold uppercase tracking-wider">
              <Compass className="w-3.5 h-3.5 text-purple-400" />
              <span>Step 2: Your North Star</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              What is your primary career track?
            </h1>
            <p className="text-xs text-slate-300 leading-relaxed">
              MindPath AI dynamically constructs a verified 6-level career roadmap, active study tasks, and diagnostic quizzes tailored to this exact specialty.
            </p>

            <div className="pt-2">
              <label className="block text-xs font-bold text-slate-200 mb-1.5">
                Target Role, Career Track, or Domain
              </label>
              <input
                type="text"
                value={careerInterest}
                onChange={(e) => setCareerInterest(e.target.value)}
                placeholder="e.g. AI Systems Engineer, GATE CSE 2026, Full-Stack Dev..."
                className="w-full px-4 py-3 rounded-2xl bg-[#14172f] border border-white/15 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-purple-500 transition-colors shadow-inner"
              />
            </div>

            <div>
              <p className="text-[11px] text-slate-400 mb-2 font-medium">Quick suggestions (click to select):</p>
              <div className="flex flex-wrap gap-1.5">
                {careerSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setCareerInterest(suggestion)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all cursor-pointer ${
                      careerInterest === suggestion
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20 border border-purple-400'
                        : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                    }`}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                disabled={!careerInterest.trim()}
                className="px-6 py-2.5 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 text-xs font-bold text-white shadow-lg shadow-purple-500/30 flex items-center gap-2 cursor-pointer transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 3: Education Background & Target Exam               */}
        {/* ======================================================== */}
        {step === 3 && (
          <div className="space-y-4 animate-in fade-in">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-[10px] font-bold uppercase tracking-wider">
              <GraduationCap className="w-3.5 h-3.5 text-cyan-400" />
              <span>Step 3: Background & Milestone Exam</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Tell us your background & target exam
            </h1>
            <p className="text-xs text-slate-300 leading-relaxed">
              We personalize your difficulty curves, lecture pacing, and academic calculator recommendations to your exact baseline.
            </p>

            <div className="pt-2">
              <label className="block text-xs font-bold text-slate-200 mb-1.5">
                Current Education or Level
              </label>
              <input
                type="text"
                value={educationLevel}
                onChange={(e) => setEducationLevel(e.target.value)}
                placeholder="e.g. B.Tech 3rd Year, Class 12 CBSE, Working Professional..."
                className="w-full px-4 py-3 rounded-2xl bg-[#14172f] border border-white/15 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-colors shadow-inner"
              />
            </div>

            <div>
              <p className="text-[11px] text-slate-400 mb-2 font-medium">Quick suggestions:</p>
              <div className="flex flex-wrap gap-1.5">
                {educationSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setEducationLevel(suggestion)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all cursor-pointer ${
                      educationLevel === suggestion
                        ? 'bg-cyan-600 text-white shadow-md shadow-cyan-500/20 border border-cyan-400'
                        : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                    }`}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <label className="block text-xs font-bold text-slate-200 mb-1.5">
                Target Exam or Career Milestone (Optional)
              </label>
              <input
                type="text"
                value={targetExam}
                onChange={(e) => setTargetExam(e.target.value)}
                placeholder="e.g. GATE 2026, FAANG Placements, JEE Advanced..."
                className="w-full px-4 py-3 rounded-2xl bg-[#14172f] border border-white/15 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-colors shadow-inner"
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {examSuggestions.map((exam) => (
                  <button
                    key={exam}
                    type="button"
                    onClick={() => setTargetExam(exam)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-colors cursor-pointer ${
                      targetExam === exam
                        ? 'bg-amber-500/30 text-amber-200 border border-amber-400/50'
                        : 'bg-white/5 hover:bg-white/10 text-slate-400 border border-white/10'
                    }`}
                  >
                    {exam}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={() => setStep(4)}
                disabled={!educationLevel.trim()}
                className="px-6 py-2.5 rounded-full bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 text-xs font-bold text-white shadow-lg shadow-cyan-500/30 flex items-center gap-2 cursor-pointer transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
              >
                <span>Review & Launch</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 4: Review & Generate MindPath                       */}
        {/* ======================================================== */}
        {step === 4 && (
          <div className="space-y-4 animate-in fade-in">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Step 4: Launch Workspace</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Ready to generate your custom workspace
            </h1>

            <div className="p-4 rounded-2xl bg-[#14172f] border border-white/10 space-y-2.5">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-white/5">
                <span className="text-slate-400">Profile:</span>
                <div className="flex items-center gap-2">
                  <img
                    src={avatarUrl}
                    alt="Selected Avatar"
                    className="w-5 h-5 rounded-full object-cover"
                  />
                  <span className="font-bold text-white">{displayName}</span>
                  {location && <span className="text-slate-400">({location})</span>}
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Target Career:</span>
                <span className="font-bold text-purple-300">{careerInterest}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Education Level:</span>
                <span className="font-bold text-cyan-300">{educationLevel}</span>
              </div>
              {targetExam && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Target Exam:</span>
                  <span className="font-bold text-amber-300">{targetExam}</span>
                </div>
              )}
              {bio && (
                <div className="flex items-center justify-between text-xs pt-1 border-t border-white/5">
                  <span className="text-slate-400">Motto:</span>
                  <span className="italic text-slate-300 text-[11px] truncate max-w-[260px]">{bio}</span>
                </div>
              )}
            </div>

            {loading ? (
              <div className="py-6 text-center space-y-3">
                <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto" />
                <p className="text-xs font-bold text-white animate-pulse">{generationPhase}</p>
                <div className="w-48 h-1.5 bg-white/10 rounded-full mx-auto overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 rounded-full animate-pulse w-3/4" />
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-[11px] text-slate-400">
                <div className="flex items-center gap-2 text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Generates complete 6-level interactive curriculum</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Creates persistent diagnostic quiz in Turso Cloud DB</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Schedules active daily study tasks & milestone goals</span>
                </div>
              </div>
            )}

            <div className="pt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(3)}
                disabled={loading}
                className="px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={handleCompleteOnboarding}
                disabled={loading}
                className="px-8 py-3 rounded-full bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 text-xs font-black text-white shadow-xl shadow-purple-500/30 flex items-center gap-2 cursor-pointer transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
              >
                <span>{loading ? 'Activating AI...' : 'Generate My MindPath 🚀'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
