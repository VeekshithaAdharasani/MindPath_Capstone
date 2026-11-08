import {
  ArrowRight,
  BookOpen,
  Compass,
  HelpCircle,
  LayoutDashboard,
  Loader2,
  Search,
  Settings,
  X,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { NavTab } from '../../types/index.ts';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: NavTab) => void;
  onSelectAction: (action: string) => void;
}

interface CommandItem {
  id: string;
  type: 'Navigation' | 'Course' | 'Resource';
  label: string;
  subtitle?: string;
  tab?: NavTab;
  url?: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAVIGATION_ITEMS: CommandItem[] = [
  { id: 'nav-home', type: 'Navigation', label: 'Go to Home Dashboard', tab: 'home', icon: LayoutDashboard },
  { id: 'nav-journey', type: 'Navigation', label: 'Go to Learning Journey', tab: 'journey', icon: Compass },
  { id: 'nav-career', type: 'Navigation', label: 'Go to Career Explorer', tab: 'career', icon: Compass },
  { id: 'nav-learning', type: 'Navigation', label: 'Go to Learning Hub', tab: 'learning', icon: BookOpen },
  { id: 'nav-quizzes', type: 'Navigation', label: 'Go to Quizzes & Tests', tab: 'quizzes', icon: HelpCircle },
  { id: 'nav-progress', type: 'Navigation', label: 'Go to Progress & Analytics', tab: 'progress', icon: HelpCircle },
  { id: 'nav-reminders', type: 'Navigation', label: 'Go to Reminders & Schedule', tab: 'reminders', icon: HelpCircle },
  { id: 'nav-reports', type: 'Navigation', label: 'Go to Performance Reports', tab: 'reports', icon: HelpCircle },
  { id: 'nav-settings', type: 'Navigation', label: 'Go to Settings', tab: 'settings', icon: Settings },
];

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onSelectAction,
}) => {
  const [query, setQuery] = useState('');
  const [liveResults, setLiveResults] = useState<CommandItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

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

  // Dynamically fetch live courses from /api/courses when user types a query
  useEffect(() => {
    const cleanQuery = query.trim();
    if (cleanQuery.length < 2) {
      setLiveResults([]);
      setIsSearching(false);
      return;
    }

    let active = true;
    setIsSearching(true);

    const debounceTimer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/courses?q=${encodeURIComponent(cleanQuery)}&maxPerSource=3`);
        if (!res.ok) throw new Error('Search request failed');
        const data = await res.json();

        if (active && Array.isArray(data.results)) {
          const mapped: CommandItem[] = data.results.slice(0, 6).map((r: any, idx: number) => ({
            id: `course-${r.id || idx}`,
            type: (r.type === 'video' ? 'Resource' : 'Course') as 'Course' | 'Resource',
            label: r.title,
            subtitle: r.provider || r.author || r.description?.slice(0, 60),
            tab: 'learning',
            url: r.url,
            icon: BookOpen,
          }));
          setLiveResults(mapped);
        }
      } catch (err) {
        if (active) {
          setLiveResults([]);
        }
      } finally {
        if (active) setIsSearching(false);
      }
    }, 280);

    return () => {
      active = false;
      clearTimeout(debounceTimer);
    };
  }, [query]);

  const filteredNavItems = useMemo(() => {
    const cleanQuery = query.toLowerCase().trim();
    if (!cleanQuery) return NAVIGATION_ITEMS;
    return NAVIGATION_ITEMS.filter((item) =>
      item.label.toLowerCase().includes(cleanQuery)
    );
  }, [query]);

  if (!isOpen) return null;

  const allItems: CommandItem[] = [...filteredNavItems, ...liveResults];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-[#14172f] border border-white/15 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Search input */}
        <div className="flex items-center px-4 py-3.5 border-b border-white/10 gap-3">
          <Search className="w-5 h-5 text-indigo-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search views, live courses, or educational topics..."
            autoFocus
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-400 focus:outline-none"
          />
          {isSearching && <Loader2 className="w-4 h-4 text-purple-400 animate-spin shrink-0" />}
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-84 overflow-y-auto p-2 divide-y divide-white/5">
          {allItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No results found for "{query}".
            </div>
          ) : (
            allItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.tab) {
                      onNavigate(item.tab);
                    }
                    if (item.url && typeof window !== 'undefined') {
                      window.open(item.url, '_blank', 'noopener,noreferrer');
                    }
                    onSelectAction(item.label);
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left hover:bg-white/5 text-xs text-slate-200 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-300 flex items-center justify-center shrink-0">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 truncate">
                      <p className="font-medium group-hover:text-white truncate">{item.label}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-purple-400 font-semibold">{item.type}</span>
                        {item.subtitle && (
                          <span className="text-[10px] text-slate-500 truncate max-w-xs">{item.subtitle}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all shrink-0" />
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-[#0d1022] border-t border-white/5 text-[11px] text-slate-400 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] text-slate-300">⌘K</kbd>
            <span>Navigate</span>
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] text-slate-300">ESC</kbd>
            <span>Close</span>
          </span>
        </div>
      </div>
    </div>
  );
};
