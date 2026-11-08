import { ArrowRight, Briefcase, Cpu, Database, Search, Shield, Sparkles, Stethoscope } from 'lucide-react';
import React, { useState } from 'react';
import { NavTab } from '../types/index.ts';

interface CareerViewProps {
  onOpenWhatIf: () => void;
  onOpenCompanion: () => void;
  onNavigate: (tab: NavTab) => void;
}

export const CareerView: React.FC<CareerViewProps> = ({
  onOpenWhatIf,
  onOpenCompanion,
  onNavigate,
}) => {
  const [activeCategory, setActiveCategory] = useState<'All' | 'Tech' | 'Science' | 'Medicine' | 'Business' | 'Arts'>('Tech');
  const [searchQuery, setSearchQuery] = useState('');

  const topMatches = [
    { rank: 1, title: 'Data Scientist', match: 98, icon: Database, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    { rank: 2, title: 'Software Developer', match: 95, icon: Cpu, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { rank: 3, title: 'AI Engineer', match: 93, icon: Sparkles, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  ];

  const exploreList = [
    {
      title: 'Data Scientist',
      salary: '₹8L - ₹25L',
      growth: 'High Growth',
      icon: Database,
      category: 'Tech',
      desc: 'Analyze complex data patterns and build predictive intelligence systems.',
    },
    {
      title: 'AI Engineer',
      salary: '₹10L - ₹40L',
      growth: 'Excellent Scope',
      icon: Cpu,
      category: 'Tech',
      desc: 'Architect neural networks, large language models, and agentic workflows.',
    },
    {
      title: 'Cyber Security',
      salary: '₹6L - ₹20L',
      growth: 'Growing Demand',
      icon: Shield,
      category: 'Tech',
      desc: 'Protect cloud infrastructures and cryptographic network assets.',
    },
    {
      title: 'Biomedical Researcher',
      salary: '₹9L - ₹22L',
      growth: 'High Demand',
      icon: Stethoscope,
      category: 'Medicine',
      desc: 'Bridge computer science with genetics and medical device algorithms.',
    },
    {
      title: 'Fintech Analyst',
      salary: '₹12L - ₹30L',
      growth: 'Top Tier',
      icon: Briefcase,
      category: 'Business',
      desc: 'Quantitative modeling, algorithmic trading, and risk prediction.',
    },
  ];

  const filtered = exploreList.filter(
    (item) =>
      (activeCategory === 'All' || item.category === activeCategory) &&
      item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 max-w-[1520px] mx-auto animate-in fade-in duration-300">
      {/* Top Banner - 4K HD Widescreen with Crisp Native Typography */}
      <div 
        onDragStart={(e) => e.preventDefault()}
        className="relative rounded-3xl overflow-hidden min-h-[200px] sm:min-h-[220px] lg:min-h-[240px] w-full border border-white/10 shadow-2xl bg-[#10132b] flex items-center group select-none"
      >
        {/* 4K Background Artwork - Non-draggable Textless High-Tech Cityscape */}
        <img
          src="/assets/extracted/career_banner.svg"
          alt="Career Explorer Visual Artwork"
          draggable={false}
          onDragStart={(e) => e.preventDefault()}
          className="absolute inset-0 w-full h-full object-cover object-right pointer-events-none select-none transition-transform duration-700 group-hover:scale-102"
        />
        {/* Directional Gradient for contrast */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0c0e1a]/95 via-[#0c0e1a]/75 to-transparent pointer-events-none" />

        {/* Crisp Native Typography & Interactive CTA */}
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

      {/* Main Grid: Your Top Matches (4 cols) & Explore Careers (8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Your Top Matches (4 cols) */}
        <div className="lg:col-span-4 rounded-3xl bg-[#14172f] border border-white/10 p-5 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-white">Your Top Matches</h2>
            <span className="text-[10px] text-slate-500">Based on Skills</span>
          </div>

          <div className="space-y-3 flex-1">
            {topMatches.map((m) => {
              const Icon = m.icon;
              return (
                <div
                  key={m.rank}
                  className="p-3.5 rounded-2xl bg-[#181d3d] border border-white/5 flex items-center justify-between hover:border-indigo-500/30 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-400 w-4 text-center">
                      {m.rank}
                    </span>
                    <div className={`w-8 h-8 rounded-xl ${m.bg} ${m.color} flex items-center justify-center shrink-0`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">{m.title}</p>
                      <p className="text-[10px] text-emerald-400 font-semibold">{m.match}% Match</p>
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
          </div>
        </div>

        {/* Explore Careers (8 cols) */}
        <div className="lg:col-span-8 rounded-3xl bg-[#14172f] border border-white/10 p-5 shadow-xl flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <h2 className="text-sm font-bold text-white">Explore Careers</h2>

            {/* Category filter pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
              {(['Tech', 'Science', 'Medicine', 'Business', 'Arts'] as const).map((cat) => (
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

          {/* Search box inside card */}
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
            {filtered.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className="rounded-2xl bg-[#181d3d] border border-white/10 p-3 flex flex-col justify-between hover:border-purple-500/40 transition-all group"
                >
                  <div>
                    <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                      <Icon className="w-4 h-4" />
                    </div>
                    <p className="text-xs font-bold text-white mb-0.5">{item.title}</p>
                    <p className="text-[11px] font-semibold text-indigo-300">{item.salary}</p>
                    <p className="text-[10px] text-emerald-400 mb-2">{item.growth}</p>
                    <p className="text-[10px] text-slate-400 line-clamp-2">{item.desc}</p>
                  </div>

                  <button
                    onClick={onOpenWhatIf}
                    className="mt-3 w-full py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-semibold text-slate-200 transition-colors cursor-pointer"
                  >
                    Simulate Fit →
                  </button>
                </div>
              );
            })}
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
