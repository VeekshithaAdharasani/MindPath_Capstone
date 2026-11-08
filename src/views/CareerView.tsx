import {
  ArrowRight,
  Award,
  BookOpen,
  Briefcase,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Cpu,
  FlaskConical,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  Stethoscope,
  TrendingUp,
  Zap,
} from 'lucide-react';
import React, { useCallback, useEffect, useId, useState } from 'react';
import { CareerPathPlan, generateCareerPath } from '../lib/services/enzonic-ai';
import { CareerMatch, NavTab, UserProfile } from '../types/index.ts';

interface CareerViewProps {
  onOpenWhatIf: () => void;
  onOpenCompanion: () => void;
  onNavigate: (tab: NavTab) => void;
  user?: UserProfile;
}

export const CareerView: React.FC<CareerViewProps> = ({
  onOpenWhatIf,
  onOpenCompanion: _onOpenCompanion,
  onNavigate: _onNavigate,
  user,
}) => {
  const [activeCategory, setActiveCategory] = useState<'All' | 'Tech' | 'Science' | 'Medicine' | 'Business' | 'Arts'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [careers, setCareers] = useState<CareerMatch[]>([]);
  const [loadingCareers, setLoadingCareers] = useState(true);
  const [careerError, setCareerError] = useState<string | null>(null);

  // Custom AI Roadmap Generation State
  const defaultGoal = user?.careerInterest || 'AI Systems Engineer';
  const [customGoal, setCustomGoal] = useState(defaultGoal);
  const [activePlan, setActivePlan] = useState<CareerPathPlan | null>(null);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [expandedLevel, setExpandedLevel] = useState<number | null>(0);
  const customGoalInputId = useId();

  // Load Live AI-Generated Careers on demand
  const fetchLiveCareers = useCallback(async (cat: string, query?: string) => {
    setLoadingCareers(true);
    setCareerError(null);

    try {
      const studentInterest = query || user?.careerInterest || 'Artificial Intelligence & Computer Science';
      const params = new URLSearchParams({
        category: cat,
        interest: studentInterest,
      });

      const res = await fetch(`/api/career/explore?${params.toString()}`);
      if (!res.ok) {
        throw new Error(await res.text());
      }

      const data = await res.json();
      if (Array.isArray(data.careers) && data.careers.length > 0) {
        setCareers(data.careers);
      } else {
        setCareers([]);
      }
    } catch (err: any) {
      console.error('Failed to fetch live AI careers:', err);
      setCareerError(err?.message || 'Unable to connect to live AI career service. Please retry.');
      setCareers([]);
    } finally {
      setLoadingCareers(false);
    }
  }, [user?.careerInterest]);

  // Load on mount and when category changes
  useEffect(() => {
    fetchLiveCareers(activeCategory);
  }, [activeCategory, fetchLiveCareers]);

  // Generate 6-Level Career Roadmap via Live AI
  const handleGenerateRoadmap = useCallback(async (goalToGenerate?: string) => {
    const targetGoal = (goalToGenerate || customGoal || 'AI Systems Engineer').trim();
    if (!targetGoal) return;

    setGeneratingPlan(true);
    setPlanError(null);

    try {
      const plan = await generateCareerPath(targetGoal);
      if (plan && Array.isArray(plan.milestones) && plan.milestones.length > 0) {
        setActivePlan(plan);
        setExpandedLevel(0);
      } else {
        throw new Error('AI returned an unexpected format. Please retry.');
      }
    } catch (err: any) {
      console.error('Failed to generate career roadmap:', err);
      setPlanError(err?.message || 'Could not generate live roadmap.');
    } finally {
      setGeneratingPlan(false);
    }
  }, [customGoal]);

  const iconMap: Record<string, React.ElementType> = {
    Tech: Cpu,
    Science: FlaskConical,
    Medicine: Stethoscope,
    Business: Briefcase,
    Arts: Sparkles,
  };

  const filtered = careers.filter(
    (item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.requiredSkills.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1520px] mx-auto animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="relative rounded-3xl overflow-hidden min-h-[220px] sm:min-h-[250px] w-full border border-white/10 shadow-2xl bg-[#10132b] flex items-center group select-none">
        <img
          src="/assets/extracted/career_banner.svg"
          alt="Career Explorer Visual Artwork"
          draggable={false}
          onDragStart={(e) => e.preventDefault()}
          className="absolute inset-0 w-full h-full object-cover object-right pointer-events-none select-none transition-transform duration-700 group-hover:scale-102"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0c0e1a]/95 via-[#0c0e1a]/80 to-transparent pointer-events-none" />
        <div className="relative z-10 p-6 sm:p-8 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-[11px] font-bold tracking-wide uppercase mb-3">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>100% Live Frontier AI Career Engine</span>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-tight">
            Discover Verified High-Growth Careers
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
            All salary benchmarks, required skill stacks, and progression milestones are dynamically evaluated by frontier AI models in real time.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              onClick={onOpenWhatIf}
              className="px-5 py-2.5 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-xs font-bold text-white shadow-lg shadow-purple-500/30 flex items-center gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Zap className="w-4 h-4 text-amber-300" />
              <span>Simulate What-If Fit</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleGenerateRoadmap(defaultGoal)}
              className="px-5 py-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-200 transition-all cursor-pointer flex items-center gap-2"
            >
              <BookOpen className="w-4 h-4 text-cyan-400" />
              <span>Generate AI Blueprint</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Your Top Matches (4 cols) */}
        <div className="lg:col-span-4 rounded-3xl bg-[#14172f] border border-white/10 p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-400" />
                  Live AI Top Matches
                </h2>
                <p className="text-[10px] text-slate-400 mt-0.5">Dynamically synthesized for your profile</p>
              </div>
              <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                Live AI
              </span>
            </div>

            {loadingCareers ? (
              <div className="space-y-3">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="p-3.5 rounded-2xl bg-[#181d3d] border border-white/5 animate-pulse flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/5" />
                    <div className="flex-1 space-y-1.5">
                      <div className="w-3/4 h-3 rounded bg-white/10" />
                      <div className="w-1/2 h-2 rounded bg-white/5" />
                    </div>
                  </div>
                ))}
                <div className="text-center py-2 text-[11px] text-slate-400 flex items-center justify-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
                  <span>Generating AI matches...</span>
                </div>
              </div>
            ) : careers.length > 0 ? (
              <div className="space-y-3">
                {careers.slice(0, 3).map((m, idx) => {
                  const Icon = iconMap[m.category] || Cpu;
                  return (
                    <div
                      key={m.id || idx}
                      className="p-3.5 rounded-2xl bg-[#181d3d] border border-white/5 flex items-center justify-between hover:border-indigo-500/30 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-slate-400 w-4 text-center">
                          {idx + 1}
                        </span>
                        <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          <Icon className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white line-clamp-1">{m.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-emerald-400 font-semibold">{m.matchScore}% Fit</span>
                            <span className="text-[10px] text-slate-400">•</span>
                            <span className="text-[10px] text-indigo-300 font-medium">{m.salary}</span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleGenerateRoadmap(m.title)}
                        className="px-2.5 py-1 rounded-full bg-indigo-600/30 hover:bg-indigo-600/50 text-[10px] font-bold text-indigo-300 transition-colors cursor-pointer shrink-0"
                        title="Generate complete 6-level AI curriculum"
                      >
                        Plan →
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 text-center text-xs text-slate-400">
                <p>No careers available at the moment.</p>
                <button
                  onClick={() => fetchLiveCareers(activeCategory)}
                  className="mt-2 px-3 py-1 text-[11px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center justify-center gap-1 mx-auto cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Retry AI Generation</span>
                </button>
              </div>
            )}
          </div>

          {/* Quick AI Target Roadmap Form */}
          <div className="mt-5 pt-4 border-t border-white/10">
            <label htmlFor={customGoalInputId} className="text-xs font-bold text-white mb-2 flex items-center gap-1.5 block">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Target Any Dream Career</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                id={customGoalInputId}
                type="text"
                value={customGoal}
                onChange={(e) => setCustomGoal(e.target.value)}
                placeholder="e.g. AI Systems Engineer, Quant..."
                className="flex-1 bg-[#181d3d] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500/50"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleGenerateRoadmap(customGoal);
                }}
              />
              <button
                type="button"
                onClick={() => handleGenerateRoadmap(customGoal)}
                disabled={generatingPlan || !customGoal.trim()}
                className="px-3 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-xs font-bold text-white shadow-md transition-all disabled:opacity-50 cursor-pointer shrink-0"
              >
                {generatingPlan ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Map'}
              </button>
            </div>
          </div>
        </div>

        {/* Explore Careers (8 cols) */}
        <div className="lg:col-span-8 rounded-3xl bg-[#14172f] border border-white/10 p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-sm font-bold text-white">Live AI Career Catalog</h2>
                <p className="text-[10px] text-slate-400 mt-0.5">Real-time compensation benchmarks & industry skill gaps</p>
              </div>

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
                placeholder="Filter by title or skills (e.g. Python, PyTorch, Docker)..."
                className="w-full bg-[#181d3d] border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500/50"
              />
            </div>

            {/* Career Cards Area */}
            {loadingCareers ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <div key={n} className="rounded-2xl bg-[#181d3d] border border-white/10 p-3.5 space-y-3 animate-pulse">
                    <div className="flex justify-between items-center">
                      <div className="w-8 h-8 rounded-xl bg-white/5" />
                      <div className="w-16 h-4 rounded-full bg-white/5" />
                    </div>
                    <div className="w-3/4 h-3.5 rounded bg-white/10" />
                    <div className="w-1/2 h-2.5 rounded bg-white/5" />
                    <div className="w-full h-8 rounded bg-white/5" />
                  </div>
                ))}
              </div>
            ) : careerError ? (
              <div className="p-8 text-center space-y-3">
                <p className="text-rose-400 text-xs">{careerError}</p>
                <button
                  onClick={() => fetchLiveCareers(activeCategory)}
                  className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white transition-all cursor-pointer"
                >
                  Regenerate from AI
                </button>
              </div>
            ) : filtered.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {filtered.map((item, idx) => {
                  const Icon = iconMap[item.category] || Cpu;
                  return (
                    <div
                      key={item.id || idx}
                      className="rounded-2xl bg-[#181d3d] border border-white/10 p-3.5 flex flex-col justify-between hover:border-purple-500/40 transition-all group shadow-sm"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center group-hover:scale-105 transition-transform">
                            <Icon className="w-4 h-4" />
                          </div>
                          <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                            {item.matchScore}% Match
                          </span>
                        </div>
                        <p className="text-xs font-bold text-white mb-0.5">{item.title}</p>
                        <p className="text-[11px] font-semibold text-indigo-300">{item.salary}</p>
                        <p className="text-[10px] text-emerald-400 mb-2 flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          <span>{item.scope}</span>
                        </p>
                        <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">{item.description}</p>

                        <div className="mt-2.5 flex flex-wrap gap-1">
                          {item.requiredSkills.slice(0, 3).map((sk, sIdx) => (
                            <span key={sIdx} className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-slate-300 border border-white/5">
                              {sk}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="mt-3.5 pt-2.5 border-t border-white/5 flex items-center gap-2">
                        <button
                          onClick={onOpenWhatIf}
                          className="flex-1 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-semibold text-slate-200 transition-colors cursor-pointer text-center"
                        >
                          Simulate Fit
                        </button>
                        <button
                          onClick={() => handleGenerateRoadmap(item.title)}
                          className="py-1.5 px-2.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-[10px] font-bold text-indigo-300 transition-colors cursor-pointer"
                          title="Generate full 6-level AI curriculum roadmap"
                        >
                          Roadmap
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <p className="text-slate-400 text-sm">No careers found matching &ldquo;{searchQuery}&rdquo;</p>
                <button
                  onClick={() => { setSearchQuery(''); setActiveCategory('All'); }}
                  className="mt-2 text-xs text-indigo-400 hover:underline cursor-pointer"
                >
                  Reset filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Roadmap Visualizer (when generated or generating) */}
      {(generatingPlan || activePlan || planError) && (
        <div className="rounded-3xl bg-[#14172f] border border-cyan-500/30 p-6 shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-white/10">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[11px] font-bold uppercase mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>6-Level Career Blueprint</span>
              </div>
              <h2 className="text-lg font-bold text-white">
                {activePlan?.career || customGoal}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Comprehensive step-by-step learning progression crafted by MindPath Frontier AI
              </p>
            </div>

            {activePlan && (
              <button
                onClick={() => handleGenerateRoadmap(activePlan.career)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Regenerate Plan</span>
              </button>
            )}
          </div>

          {generatingPlan && (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
              <p className="text-sm font-semibold text-white">Synthesizing personalized 6-level curriculum...</p>
              <p className="text-xs text-slate-400 max-w-md">
                Analyzing industry standards, prerequisite math foundations, and portfolio project milestones.
              </p>
            </div>
          )}

          {planError && !generatingPlan && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
              <span>{planError}</span>
              <button
                onClick={() => handleGenerateRoadmap()}
                className="px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 font-bold cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {activePlan && !generatingPlan && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {activePlan.milestones.map((m, idx) => {
                  const isExpanded = expandedLevel === idx;
                  return (
                    <div
                      key={idx}
                      className={`rounded-2xl border transition-all ${
                        isExpanded
                          ? 'bg-[#181d3d] border-cyan-500/50 shadow-md shadow-cyan-500/10'
                          : 'bg-[#12152e] border-white/5 hover:border-white/15'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setExpandedLevel(isExpanded ? null : idx)}
                        className="w-full p-4 flex items-center justify-between text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 border border-cyan-500/30 text-cyan-300 font-bold text-xs flex items-center justify-center">
                            {idx + 1}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white line-clamp-1">{m.title}</p>
                            <p className="text-[10px] text-cyan-400 font-medium">
                              {m.estimatedWeeks ? `~${m.estimatedWeeks} Weeks` : 'Self-Paced'} • {m.topics.length} Key Topics
                            </p>
                          </div>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                      </button>

                      {isExpanded && (
                        <div className="px-4 pb-4 pt-1 border-t border-white/5">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                            Curated Milestones & Deliverables:
                          </p>
                          <ul className="space-y-1.5">
                            {m.topics.map((topic, tIdx) => (
                              <li key={tIdx} className="text-xs text-slate-200 flex items-start gap-2">
                                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                                <span>{topic}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Identified Gaps */}
              {activePlan.gaps && activePlan.gaps.length > 0 && (
                <div className="mt-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                  <p className="text-xs font-bold text-amber-300 flex items-center gap-1.5 mb-2">
                    <TrendingUp className="w-4 h-4" />
                    <span>Key Growth Gaps & Competitive Edge Factors:</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {activePlan.gaps.map((gap, gIdx) => (
                      <span key={gIdx} className="text-xs px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-200">
                        {gap}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* What-If Analysis Strip Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-purple-900/40 via-indigo-900/40 to-[#14172f] border border-purple-500/30 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-amber-400 font-bold">✨</span>
            <h2 className="text-base font-bold text-white">Interactive Scenario & What-If Modeling</h2>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Simulate how different target career choices, study hours, and exam timelines change your placement readiness.
          </p>
        </div>

        <button
          onClick={onOpenWhatIf}
          className="px-6 py-2.5 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 text-xs font-bold text-white shadow-lg shadow-purple-500/30 transition-all cursor-pointer whitespace-nowrap"
        >
          Simulate Fit →
        </button>
      </div>
    </div>
  );
};
