import { ArrowRight, Briefcase, Cpu, FlaskConical, Search, Sparkles, Stethoscope } from 'lucide-react';
import React, { useCallback, useState } from 'react';
import { generateCareerPath } from '../lib/services/enzonic-ai';
import { CareerMatch, NavTab } from '../types/index.ts';

interface CareerViewProps {
  onOpenWhatIf: () => void;
  onOpenCompanion: () => void;
  onNavigate: (tab: NavTab) => void;
  user?: { careerInterest?: string };
}

export const CareerView: React.FC<CareerViewProps> = ({
  onOpenWhatIf,
  onOpenCompanion,
  onNavigate,
  user,
}) => {
  const [activeCategory, setActiveCategory] = useState<'All' | 'Tech' | 'Science' | 'Medicine' | 'Business' | 'Arts'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [careers, setCareers] = useState<CareerMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load careers from NVIDIA AI based on user interest
  const loadCareers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const userGoal = user?.careerInterest || 'technology career';
      const path = await generateCareerPath(userGoal);
      
      // Convert career path to career matches
      const matches: CareerMatch[] = path.milestones.map((m, i) => ({
        id: `career-${i}`,
        title: m.title,
        matchScore: Math.max(90 - i * 5, 60),
        salary: '₹8L - ₹40L',
        scope: m.estimatedWeeks > 0 ? `${m.estimatedWeeks} weeks` : 'Ongoing',
        image: '',
        category: activeCategory === 'All' ? 'Tech' : activeCategory,
        description: m.topics.join(', '),
        requiredSkills: m.topics,
      }));
      setCareers(matches);
    } catch (err: any) {
      setError(err.message || 'Failed to load careers');
      // Fallback static careers if API fails
      setCareers([
        { id: '1', title: 'Data Scientist', matchScore: 98, salary: '₹8L - ₹25L', scope: 'High Growth', image: '', category: 'Tech', description: 'Analyze complex data patterns and build predictive intelligence systems.', requiredSkills: ['Python', 'SQL', 'Machine Learning'] },
        { id: '2', title: 'AI Engineer', matchScore: 95, salary: '₹10L - ₹40L', scope: 'Excellent Scope', image: '', category: 'Tech', description: 'Architect neural networks, large language models, and agentic workflows.', requiredSkills: ['Python', 'PyTorch', 'Transformers'] },
        { id: '3', title: 'Cyber Security', matchScore: 93, salary: '₹6L - ₹20L', scope: 'Growing Demand', image: '', category: 'Tech', description: 'Protect cloud infrastructures and cryptographic network assets.', requiredSkills: ['Network Security', 'Cryptography', 'Ethical Hacking'] },
      ]);
    } finally {
      setLoading(false);
    }
  }, [user?.careerInterest, activeCategory]);

  // Load careers on mount and when user interest changes
  React.useEffect(() => {
    loadCareers();
  }, [loadCareers]);

  const iconMap: Record<string, React.ElementType> = {
    Tech: Cpu,
    Science: FlaskConical,
    Medicine: Stethoscope,
    Business: Briefcase,
    Arts: Sparkles,
  };

  const Icon = iconMap[activeCategory] || Cpu;

  const filtered = careers.filter(
    (item) =>
      (activeCategory === 'All' || item.category === activeCategory) &&
      item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 max-w-[1520px] mx-auto animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="relative rounded-3xl overflow-hidden min-h-[200px] sm:min-h-[220px] lg:min-h-[240px] w-full border border-white/10 shadow-2xl bg-[#10132b] flex items-center group select-none">
        <img
          src="/assets/extracted/career_banner.svg"
          alt="Career Explorer Visual Artwork"
          draggable={false}
          onDragStart={(e) => e.preventDefault()}
          className="absolute inset-0 w-full h-full object-cover object-right pointer-events-none select-none transition-transform duration-700 group-hover:scale-102"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0c0e1a]/95 via-[#0c0e1a]/75 to-transparent pointer-events-none" />
        <div className="relative z-10 p-6 sm:p-8 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-[11px] font-bold tracking-wide uppercase mb-3">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>AI Career Explorer</span>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-tight">
            Discover Your Perfect Career Path
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
            Explore high-growth tech & science roles, compare industry salaries, and simulate your career fit with AI scenario modeling.
          </p>
          <button
            onClick={onOpenWhatIf}
            className="mt-4 px-6 py-2.5 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-xs sm:text-sm font-bold text-white shadow-lg shadow-purple-500/30 flex items-center gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            <span>Take Career Quiz</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Your Top Matches (4 cols) */}
        <div className="lg:col-span-4 rounded-3xl bg-[#14172f] border border-white/10 p-5 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-white">Your Top Matches</h2>
            <span className="text-[10px] text-slate-500">AI Generated</span>
          </div>

          <div className="space-y-3 flex-1">
            {filtered.slice(0, 3).map((m, idx) => {
              const Icon = iconMap[m.category] || Cpu;
              return (
                <div
                  key={m.id}
                  className="p-3.5 rounded-2xl bg-[#181d3d] border border-white/5 flex items-center justify-between hover:border-indigo-500/30 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-400 w-4 text-center">
                      {idx + 1}
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">{m.title}</p>
                      <p className="text-[10px] text-emerald-400 font-semibold">{m.matchScore}% Match</p>
                    </div>
                  </div>
                  <button
                    onClick={onOpenWhatIf}
                    className="px-3 py-1 rounded-full bg-indigo-600/30 hover:bg-indigo-600/50 text-[10px] font-bold text-indigo-300 transition-colors cursor-pointer"
                  >
                    View Details →
                  </button>
                </div>
              );
            })}
            {loading && <div className="text-xs text-slate-500 animate-pulse">Loading AI recommendations...</div>}
          </div>
        </div>

        {/* Explore Careers (8 cols) */}
        <div className="lg:col-span-8 rounded-3xl bg-[#14172f] border border-white/10 p-5 shadow-xl flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <h2 className="text-sm font-bold text-white">Explore Careers</h2>

            {/* Category filter pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
              {(['All', 'Tech', 'Science', 'Medicine', 'Business', 'Arts'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
                    activeCategory === cat
                      ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                      : 'bg-[#181d3d] text-slate-400 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Search box */}
          <div className="relative mb-4">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search careers..."
              className="w-full bg-[#181d3d] border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none"
            />
          </div>

          {/* Career Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
            {filtered.length > 0 ? (
              filtered.map((item, idx) => {
                const Icon = iconMap[item.category] || Cpu;
                return (
                  <div
                    key={item.id}
                    className="rounded-2xl bg-[#181d3d] border border-white/10 p-3 flex flex-col justify-between hover:border-purple-500/40 transition-all group"
                  >
                    <div>
                      <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                        <Icon className="w-4 h-4" />
                      </div>
                      <p className="text-xs font-bold text-white mb-0.5">{item.title}</p>
                      <p className="text-[11px] font-semibold text-indigo-300">{item.salary}</p>
                      <p className="text-[10px] text-emerald-400 mb-2">{item.scope}</p>
                      <p className="text-[10px] text-slate-400 line-clamp-2">{item.description}</p>
                    </div>
                    <button
                      onClick={onOpenWhatIf}
                      className="mt-3 w-full py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-semibold text-slate-200 transition-colors cursor-pointer"
                    >
                      Simulate Fit →
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-slate-400 text-sm">No careers found. Try a different search.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* What-If Analysis Strip Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-purple-900/40 via-indigo-900/40 to-[#14172f] border border-purple-500/30 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-amber-400 font-bold">✨</span>
            <h2 className="text-base font-bold text-white">What-If Analysis</h2>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            See how different career choices, timelines, and skills fit your profile.
          </p>
        </div>

        <button
          onClick={onOpenWhatIf}
          className="px-6 py-2.5 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 text-xs font-bold text-white shadow-lg shadow-purple-500/30 transition-all cursor-pointer whitespace-nowrap"
        >
          Try Now →
        </button>
      </div>
    </div>
  );
};