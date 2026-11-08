import { Bell, Clock, Plus, Trash2, X } from 'lucide-react';
import React, { useState } from 'react';
import { ReminderItem } from '../types/index.ts';

interface RemindersViewProps {
  reminders: ReminderItem[];
  onToggleReminder: (id: string, current: number) => void;
  onAddReminder: (title: string, timeText: string, category: string) => void;
  onDeleteReminder: (id: string) => void;
}

export const RemindersView: React.FC<RemindersViewProps> = ({
  reminders,
  onToggleReminder,
  onAddReminder,
  onDeleteReminder,
}) => {
  const [activeCategory, setActiveCategory] = useState<'All' | 'Tasks' | 'Exams' | 'Learning'>('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState('');
  const [timeText, setTimeText] = useState('');
  const [category, setCategory] = useState('Tasks');

  const filtered = reminders.filter(
    (r) => activeCategory === 'All' || r.category === activeCategory
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !timeText.trim()) return;
    onAddReminder(title, timeText, category);
    setTitle('');
    setTimeText('');
    setShowAddModal(false);
  };

  return (
    <div className="p-6 space-y-6 max-w-[1520px] mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Reminders</h1>
          <p className="text-xs text-slate-400">Stay on track with your goals</p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 text-xs font-bold text-white shadow-lg shadow-purple-500/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Reminder</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-[#14172f] rounded-xl border border-white/10 w-fit">
        {(['All', 'Tasks', 'Exams', 'Learning'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveCategory(tab)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeCategory === tab
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Reminders List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-[#14172f] border border-white/10">
            <Bell className="w-8 h-8 text-slate-500 mx-auto mb-2" />
            <p className="text-xs text-slate-400">No reminders found in this category.</p>
          </div>
        ) : (
          filtered.map((r) => {
            const isEnabled = r.enabled === 1;
            return (
              <div
                key={r.id}
                className="rounded-2xl bg-[#14172f] border border-white/10 p-4 flex items-center justify-between hover:border-indigo-500/30 transition-all shadow-md group"
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isEnabled
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-white/5 text-slate-500'
                    }`}
                  >
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-white">{r.title}</p>
                      <span className="px-2 py-0.5 rounded-full bg-white/5 text-[9px] text-slate-400 font-medium">
                        {r.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>{r.time_text}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Alarm Enabled Switch */}
                  <button
                    onClick={() => onToggleReminder(r.id, r.enabled)}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer p-0.5 ${
                      isEnabled ? 'bg-indigo-600' : 'bg-[#1e2348]'
                    }`}
                    aria-label="Toggle alarm"
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white transition-transform ${
                        isEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>

                  <button
                    onClick={() => onDeleteReminder(r.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                    title="Delete reminder"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Reminder Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-[#14172f] border border-white/15 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <h3 className="text-sm font-bold text-white">Add New Reminder</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1.5">
                  Reminder Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. GATE Mock Test Practice"
                  required
                  className="w-full bg-[#181d3d] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1.5">
                  Scheduled Time / Date
                </label>
                <input
                  type="text"
                  value={timeText}
                  onChange={(e) => setTimeText(e.target.value)}
                  placeholder="e.g. Tomorrow • 4:00 PM or Mon, 10 Mar"
                  required
                  className="w-full bg-[#181d3d] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1.5">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-[#181d3d] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none cursor-pointer"
                >
                  <option value="Tasks">Tasks</option>
                  <option value="Exams">Exams</option>
                  <option value="Learning">Learning</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-xs font-bold text-white shadow-md cursor-pointer"
                >
                  Save Reminder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
