import { ArrowRight, BookOpen, Compass, HelpCircle, Search, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { NavTab } from '../../types/index.ts';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: NavTab) => void;
  onSelectAction: (action: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onSelectAction,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else setQuery('');
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const items = [
    { type: 'Navigation', label: 'Go to Home Dashboard', tab: 'home', icon: ArrowRight },
    { type: 'Navigation', label: 'Go to Career Explorer', tab: 'career', icon: Compass },
    { type: 'Navigation', label: 'Go to Learning Hub', tab: 'learning', icon: BookOpen },
    { type: 'Navigation', label: 'Go to Quizzes & Tests', tab: 'quizzes', icon: HelpCircle },
    { type: 'Course', label: 'Python Programming (Beginner • 6h 30m)', tab: 'learning', icon: BookOpen },
    { type: 'Course', label: 'Machine Learning Fundamentals', tab: 'learning', icon: BookOpen },
    { type: 'Career', label: 'Explore: AI & Data Scientist (₹15L+)', tab: 'career', icon: Compass },
    { type: 'Career', label: 'Explore: Software Developer (₹12L+)', tab: 'career', icon: Compass },
    { type: 'Quiz', label: 'Start: Math Quiz (10 Questions)', tab: 'quizzes', icon: HelpCircle },
    { type: 'Quiz', label: 'Start: Science Quiz (10 Questions)', tab: 'quizzes', icon: HelpCircle },
  ];

  const filtered = items.filter((item) =>
    item.label.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-[#14172f] border border-white/15 rounded-2xl shadow-2xl overflow-hidden">
        {/* Input bar */}
        <div className="flex items-center px-4 py-3 border-b border-white/10 gap-3">
          <Search className="w-5 h-5 text-indigo-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command, course, or career to search..."
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-400 focus:outline-none"
          />
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-white/5">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No results found for "{query}".
            </div>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={idx}
                  onClick={() => {
                    if (item.tab) {
                      onNavigate(item.tab as NavTab);
                    }
                    onSelectAction(item.label);
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left hover:bg-white/5 text-xs text-slate-200 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-300 flex items-center justify-center shrink-0">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="font-medium group-hover:text-white">{item.label}</p>
                      <span className="text-[10px] text-slate-500">{item.type}</span>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-[#0d1022] border-t border-white/5 text-[11px] text-slate-500 flex items-center justify-between">
          <span>Navigate with ⌘K</span>
          <span>ESC to close</span>
        </div>
      </div>
    </div>
  );
};
