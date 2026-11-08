import { AlertTriangle, CheckCircle, Compass, RefreshCw, Sparkles, X } from 'lucide-react';
import React, { useState } from 'react';
import { UserProfile, WhatIfResult } from '../../types/index.ts';

interface WhatIfModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCompanion: () => void;
  user?: UserProfile;
}

export const WhatIfModal: React.FC<WhatIfModalProps> = ({
  isOpen,
  onClose,
  onOpenCompanion,
  user,
}) => {
  const [selectedScenario, setSelectedScenario] = useState('AI & Machine Learning Engineer');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<WhatIfResult | null>(null);

  if (!isOpen) return null;

  const scenarios = [
    'AI & Machine Learning Engineer',
    'Full-Stack Software Engineer',
    'AI Research Scientist (Higher Studies)',
    '1-Year Accelerated Placement Sprint',
    'AI Startup Entrepreneurship',
    'Cyber Security & Cloud Architect',
  ];

  const handleSimulate = async (scenario: string) => {
    setSelectedScenario(scenario);
    setLoading(true);
    try {
      const res = await fetch('/api/ai/what-if', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pathName: scenario, userProfile: user }),
      });
      const data = await res.json();
      setResult(data);
    } catch (e) {
      console.error('What-if error:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-[#14172f] border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-[#181d3d] to-[#121630] border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 p-[1.5px] flex items-center justify-center">
              <div className="w-full h-full bg-[#14172f] rounded-[14px] flex items-center justify-center">
                <Compass className="w-5 h-5 text-cyan-300" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">What-If Future Simulation</h2>
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-semibold border border-indigo-500/30">
                  Scenario Engine
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Explore how different choices reshape your skills, roadmap, and outcomes
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Pick Scenario */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-2">
              Select a Future Career or Timeline Scenario:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {scenarios.map((sc, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSimulate(sc)}
                  className={`p-3 rounded-xl border text-xs font-medium text-left transition-all cursor-pointer ${
                    selectedScenario === sc
                      ? 'bg-gradient-to-r from-purple-600/30 to-indigo-600/30 border-purple-500 text-white shadow-md'
                      : 'bg-[#181d3d] border-white/10 hover:border-white/20 text-slate-300'
                  }`}
                >
                  <p className="truncate">{sc}</p>
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center">
              <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto mb-3" />
              <p className="text-sm font-semibold text-white">
                Simulating future trajectory...
              </p>
              <p className="text-xs text-slate-400">
                Analyzing knowledge graph, skill gaps, and salary outcomes with MindPath AI
              </p>
            </div>
          ) : result ? (
            <div className="space-y-5 animate-in fade-in duration-300">
              {/* Top KPI strip */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-[#181d3d] border border-white/10">
                  <span className="text-[10px] text-slate-400 font-medium">Profile Fit</span>
                  <p className="text-xl font-bold text-emerald-400 mt-0.5">
                    {result.matchScore}% Match
                  </p>
                  <span className="text-[10px] text-slate-500">Based on Python & Math</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#181d3d] border border-white/10">
                  <span className="text-[10px] text-slate-400 font-medium">Estimated Time</span>
                  <p className="text-xl font-bold text-indigo-300 mt-0.5">
                    {result.estimatedTimeToReady}
                  </p>
                  <span className="text-[10px] text-slate-500">To placement ready</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#181d3d] border border-white/10">
                  <span className="text-[10px] text-slate-400 font-medium">Projected CTC</span>
                  <p className="text-xl font-bold text-amber-300 mt-0.5">
                    {result.salaryProjection}
                  </p>
                  <span className="text-[10px] text-slate-500">Top-tier market scope</span>
                </div>
              </div>

              {/* Advantages vs Tradeoffs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-[#181d3d]/80 border border-emerald-500/20">
                  <div className="flex items-center gap-2 mb-2.5 text-xs font-semibold text-emerald-400">
                    <CheckCircle className="w-4 h-4" />
                    <span>Key Advantages</span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {result.keyAdvantages.map((adv, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-emerald-400">•</span>
                        <span>{adv}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 rounded-2xl bg-[#181d3d]/80 border border-amber-500/20">
                  <div className="flex items-center gap-2 mb-2.5 text-xs font-semibold text-amber-400">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Trade-offs & Challenges</span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {result.tradeoffsAndRisks.map((risk, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-amber-400">•</span>
                        <span>{risk}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Recommended First Step & Curated Roadmap */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/40 to-indigo-950/40 border border-indigo-500/30">
                <div className="flex items-center gap-2 mb-2 text-xs font-bold text-cyan-300">
                  <Sparkles className="w-4 h-4" />
                  <span>Recommended Action Step</span>
                </div>
                <p className="text-xs text-slate-200 mb-3">
                  {result.recommendedFirstStep}
                </p>

                <p className="text-[11px] font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                  Adaptive Roadmap Stages:
                </p>
                <div className="space-y-1.5">
                  {result.curatedRoadmap.map((step, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2.5 p-2 rounded-lg bg-black/20 text-xs text-slate-300"
                    >
                      <span className="w-5 h-5 rounded-md bg-indigo-500/20 text-indigo-300 text-[10px] font-mono flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-10 text-center">
              <button
                onClick={() => handleSimulate(selectedScenario)}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-xs font-bold text-white shadow-lg shadow-purple-500/20 transition-all cursor-pointer"
              >
                Run Simulation for {selectedScenario}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#181d3d] border-t border-white/10 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Simulations evaluate possibilities without locking your roadmap.
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                onClose();
                onOpenCompanion();
              }}
              className="px-4 py-2 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-xs font-semibold text-indigo-300 transition-colors cursor-pointer"
            >
              Discuss With AI Companion
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#14172f] hover:bg-white/10 text-xs font-medium text-slate-300 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
