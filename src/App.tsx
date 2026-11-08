/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { Navbar } from './components/layout/Navbar.tsx';
import { Sidebar } from './components/layout/Sidebar.tsx';
import { MilestoneItem, NavTab, QuizTest, ReminderItem, TaskItem, UserProfile } from './types/index.ts';
import { HomeView } from './views/HomeView.tsx';
import { LandingPageView } from './views/LandingPageView.tsx';

// Code-split dynamic views & modals for ultra-fast initial bundle loading
const LearningView = lazy(() => import('./views/LearningView.tsx').then((m) => ({ default: m.LearningView })));
const CareerView = lazy(() => import('./views/CareerView.tsx').then((m) => ({ default: m.CareerView })));
const JourneyView = lazy(() => import('./views/JourneyView.tsx').then((m) => ({ default: m.JourneyView })));
const QuizView = lazy(() => import('./views/QuizView.tsx').then((m) => ({ default: m.QuizView })));
const ProgressView = lazy(() => import('./views/ProgressView.tsx').then((m) => ({ default: m.ProgressView })));
const RemindersView = lazy(() => import('./views/RemindersView.tsx').then((m) => ({ default: m.RemindersView })));
const ReportsView = lazy(() => import('./views/ReportsView.tsx').then((m) => ({ default: m.ReportsView })));
const SettingsView = lazy(() => import('./views/SettingsView.tsx').then((m) => ({ default: m.SettingsView })));
const AuthView = lazy(() => import('./views/AuthView.tsx').then((m) => ({ default: m.AuthView })));
const AICompanionDrawer = lazy(() => import('./components/companion/AICompanionDrawer.tsx').then((m) => ({ default: m.AICompanionDrawer })));
const WhatIfModal = lazy(() => import('./components/career/WhatIfModal.tsx').then((m) => ({ default: m.WhatIfModal })));
const QuizModal = lazy(() => import('./components/quiz/QuizModal.tsx').then((m) => ({ default: m.QuizModal })));
const CommandPalette = lazy(() => import('./components/search/CommandPalette.tsx').then((m) => ({ default: m.CommandPalette })));
const OnboardingTour = lazy(() => import('./components/onboarding/OnboardingTour.tsx').then((m) => ({ default: m.OnboardingTour })));
const CreateAccountModal = lazy(() => import('./components/auth/CreateAccountModal.tsx').then((m) => ({ default: m.CreateAccountModal })));

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isCompanionOpen, setIsCompanionOpen] = useState(false);
  const [activeQuiz, setActiveQuiz] = useState<QuizTest | null>(null);
  const [isWhatIfOpen, setIsWhatIfOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isCreateAccountOpen, setIsCreateAccountOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  // User Profile
  const [user, setUser] = useState<UserProfile>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mindpath_user');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed?.id) {
            return parsed;
          }
        } catch {}
      }
    }
    return {
      id: '',
      name: '',
      email: '',
      avatarUrl: '/assets/extracted/default_avatar.svg',
      educationLevel: '',
      careerInterest: '',
      streakDays: 0,
      totalStudyHours: 0,
    };
  });

  // Tasks from Turso DB
  const [tasks, setTasks] = useState<TaskItem[]>([]);

  // Milestones from Turso DB
  const [milestones, setMilestones] = useState<MilestoneItem[]>([]);

  // Reminders from Turso DB
  const [reminders, setReminders] = useState<ReminderItem[]>([]);

  // Assessment Stats from real Turso DB
  const [bestScore, setBestScore] = useState(0);
  const [avgScore, setAvgScore] = useState(0);
  const [testsCount, setTestsCount] = useState(0);
  const [companionInitialQuery, setCompanionInitialQuery] = useState<string | undefined>(undefined);

  const handleOpenCompanion = (initialQuery?: unknown) => {
    if (typeof initialQuery === 'string' && initialQuery.trim()) {
      setCompanionInitialQuery(initialQuery.trim());
    } else {
      setCompanionInitialQuery(undefined);
    }
    setIsCompanionOpen(true);
  };

  const refreshUserData = useCallback((userId?: string) => {
    if (!userId) return;
    const userQuery = `?userId=${encodeURIComponent(userId)}`;
    fetch(`/api/user${userQuery}`)
      .then((res) => {
        if (!res.ok) throw new Error('No user found');
        return res.json();
      })
      .then((data) => {
        if (data?.name && data.id) {
          setUser(data);
          localStorage.setItem('mindpath_user', JSON.stringify(data));
          const activeId = data.id;

          fetch(`/api/tasks?userId=${activeId}`)
            .then((res) => res.json())
            .then((t) => {
              if (Array.isArray(t)) setTasks(t);
            })
            .catch(() => {});

          fetch(`/api/milestones?userId=${activeId}`)
            .then((res) => res.json())
            .then((m) => {
              if (Array.isArray(m)) setMilestones(m);
            })
            .catch(() => {});

          fetch(`/api/reminders?userId=${activeId}`)
            .then((res) => res.json())
            .then((r) => {
              if (Array.isArray(r)) setReminders(r);
            })
            .catch(() => {});

          fetch(`/api/quizzes/attempts?userId=${activeId}`)
            .then((res) => res.json())
            .then((attempts) => {
              if (Array.isArray(attempts) && attempts.length > 0) {
                const scores = attempts.map((a: any) => Math.round((a.score / a.total_questions) * 100));
                const max = Math.max(...scores);
                const sum = scores.reduce((acc: number, curr: number) => acc + curr, 0);
                setBestScore(max);
                setAvgScore(Math.round(sum / scores.length));
                setTestsCount(attempts.length);
              } else {
                setBestScore(0);
                setAvgScore(0);
                setTestsCount(0);
              }
            })
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, []);

  // Load live data from Turso backend on mount & clear mock artifacts
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mindpath_user');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed?.id) {
            setUser(parsed);
            refreshUserData(parsed.id);
            return;
          }
        } catch {}
      }
    }
  }, [refreshUserData]);

  // Real-time synchronization event listener across AI companion and UI
  useEffect(() => {
    const handleRefresh = () => {
      if (user?.id) {
        refreshUserData(user.id);
      }
    };
    window.addEventListener('mindpath:refresh-data', handleRefresh);
    return () => window.removeEventListener('mindpath:refresh-data', handleRefresh);
  }, [user?.id, refreshUserData]);

  // Handlers
  const handleAddTask = async (title: string, duration?: string, category?: string) => {
    if (!title.trim() || !user.id) return;
    const tempId = `task-${Date.now()}`;
    const effectiveDuration = duration || 'Today • 30 min';
    const effectiveCategory = category || 'Tasks';
    const newTask: TaskItem = {
      id: tempId,
      title: title.trim(),
      time_text: effectiveDuration,
      duration: effectiveDuration,
      category: effectiveCategory,
      completed: 0,
    };
    setTasks((prev) => [newTask, ...prev]);
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
        body: JSON.stringify({
          title: title.trim(),
          duration: effectiveDuration,
          category: effectiveCategory,
          userId: user.id,
        }),
      });
      const data = await res.json();
      if (data?.id) {
        setTasks((prev) => prev.map((t) => (t.id === tempId ? { ...t, id: data.id } : t)));
      }
    } catch (e) {
      console.error('Add task error:', e);
    }
  };

  const handleDeleteTask = async (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    try {
      await fetch(`/api/tasks/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { 'x-user-id': user.id },
      });
    } catch (e) {
      console.error('Delete task error:', e);
    }
  };

  const handleToggleTask = async (id: string, current: number) => {
    const nextVal = current === 1 ? 0 : 1;
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: nextVal } : t))
    );
    try {
      await fetch('/api/tasks/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
        body: JSON.stringify({ id, completed: nextVal === 1, userId: user.id }),
      });
    } catch (e) {
      console.error('Task toggle error:', e);
    }
  };

  const handleToggleReminder = async (id: string, current: number) => {
    const nextVal = current === 1 ? 0 : 1;
    setReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: nextVal } : r))
    );
    try {
      await fetch('/api/reminders/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
        body: JSON.stringify({ id, enabled: nextVal === 1, userId: user.id }),
      });
    } catch (e) {
      console.error('Reminder toggle error:', e);
    }
  };

  const handleAddReminder = async (title: string, timeText: string, category: string) => {
    const tempId = `rem-${Date.now()}`;
    const newRem: ReminderItem = {
      id: tempId,
      title,
      time_text: timeText,
      category,
      enabled: 1,
    };
    setReminders([newRem, ...reminders]);
    try {
      const res = await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
        body: JSON.stringify({ title, timeText, category, userId: user.id }),
      });
      const data = await res.json();
      if (data.id) {
        setReminders((prev) =>
          prev.map((r) => (r.id === tempId ? { ...r, id: data.id } : r))
        );
      }
    } catch (e) {
      console.error('Add reminder error:', e);
    }
  };

  const handleDeleteReminder = async (id: string) => {
    setReminders((prev) => prev.filter((r) => r.id !== id));
    try {
      await fetch(`/api/reminders/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { 'x-user-id': user.id },
      });
    } catch (e) {
      console.error('Delete reminder error:', e);
    }
  };

  const handleUpdateProfile = async (updated: Partial<UserProfile>): Promise<boolean> => {
    const merged = { ...user, ...updated };
    setUser(merged);
    try {
      const res = await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: merged.name,
          email: merged.email,
          educationLevel: merged.educationLevel,
          careerInterest: merged.careerInterest,
          avatarUrl: merged.avatarUrl,
        }),
      });
      return res.ok;
    } catch (e) {
      console.error('Update profile error:', e);
      return false;
    }
  };

  const handleQuizCompleted = (score: number, total: number) => {
    const pct = Math.round((score / total) * 100);
    if (pct > bestScore) setBestScore(pct);
    setTestsCount((c) => c + 1);
    setAvgScore((prev) => Math.round((prev * testsCount + pct) / (testsCount + 1)));
  };

  const handleSignOut = () => {
    localStorage.removeItem('mindpath_user');
    if (typeof window !== 'undefined') {
      window.sessionStorage.clear();
    }
    setUser({
      id: '',
      name: '',
      email: '',
      avatarUrl: '/assets/extracted/default_avatar.svg',
      educationLevel: '',
      careerInterest: '',
      streakDays: 0,
      totalStudyHours: 0,
    });
    setTasks([]);
    setMilestones([]);
    setReminders([]);
    setTestsCount(0);
    setBestScore(0);
    setAvgScore(0);
    setActiveTab('home');
  };

  const handleAuthenticated = (authedUser: UserProfile, isNewRegistration?: boolean) => {
    setUser(authedUser);
    localStorage.setItem('mindpath_user', JSON.stringify(authedUser));
    refreshUserData(authedUser.id);
    setIsAuthOpen(false);
    
    // Only launch onboarding for brand-new account registration if never completed
    const hasCompleted =
      localStorage.getItem(`mindpath_onboarding_completed_${authedUser.id}`) ||
      localStorage.getItem('mindpath_onboarding_completed');
    if (isNewRegistration && !hasCompleted) {
      setIsOnboardingOpen(true);
    } else {
      setIsOnboardingOpen(false);
    }
  };

  // If user is not authenticated, render the dedicated futuristic Landing Page
  if (!user.id) {
    return <LandingPageView onAuthenticated={handleAuthenticated} />;
  }

  const goalsCompleted = tasks.filter((t) => t.completed === 1).length;
  const overallProgress = tasks.length > 0 ? Math.round((goalsCompleted / tasks.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#0c0e1a] text-slate-100 flex flex-col font-sans selection:bg-purple-500/30">
      {/* Top Navbar */}
      <Navbar
        user={user}
        onOpenCommand={() => setIsCommandOpen(true)}
        onOpenCompanion={handleOpenCompanion}
        setActiveTab={setActiveTab}
        onToggleMobileMenu={() => setIsMobileNavOpen(!isMobileNavOpen)}
        onOpenCreateAccount={() => setIsAuthOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenOnboardingTour={() => setIsOnboardingOpen(true)}
        onSignOut={handleSignOut}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setActiveTab(tab);
            setIsMobileNavOpen(false);
          }}
          onOpenCompanion={handleOpenCompanion}
          isMobileOpen={isMobileNavOpen}
          onCloseMobile={() => setIsMobileNavOpen(false)}
        />

        {/* Main Content Area with Instant Suspense Transition */}
        <main className="flex-1 overflow-y-auto bg-[#0c0e1a]">
          <Suspense
            fallback={
              <div className="flex items-center justify-center min-h-[300px]">
                <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
              </div>
            }
          >
            {activeTab === 'home' && (
              <HomeView
                streakDays={user.streakDays}
                userName={user.name}
                user={user}
                tasks={tasks}
                milestones={milestones}
                testsCount={testsCount}
                bestScore={bestScore}
                avgScore={avgScore}
                onToggleTask={handleToggleTask}
                onAddTask={handleAddTask}
                onDeleteTask={handleDeleteTask}
                onNavigate={setActiveTab}
                onOpenCompanion={handleOpenCompanion}
                onStartQuiz={() => setActiveTab('quizzes')}
              />
            )}

            {activeTab === 'journey' && (
              <JourneyView
                streakDays={user.streakDays}
                goalsCompleted={goalsCompleted}
                overallProgress={overallProgress}
                onNavigate={setActiveTab}
                onOpenCompanion={handleOpenCompanion}
              />
            )}

            {activeTab === 'career' && (
              <CareerView
                onOpenWhatIf={() => setIsWhatIfOpen(true)}
                onOpenCompanion={handleOpenCompanion}
                onNavigate={setActiveTab}
              />
            )}

            {activeTab === 'learning' && (
              <LearningView
                user={user}
                streakDays={user.streakDays}
                onNavigate={setActiveTab}
                onOpenCompanion={handleOpenCompanion}
              />
            )}

            {activeTab === 'quizzes' && (
              <QuizView
                user={user}
                onStartQuiz={(q) => setActiveQuiz(q)}
                bestScore={bestScore}
                averageScore={avgScore}
                testsTaken={testsCount}
              />
            )}

            {activeTab === 'progress' && (
              <ProgressView
                overallProgress={overallProgress}
                streakDays={user.streakDays}
                totalStudyHours={user.totalStudyHours}
                goalsCompleted={goalsCompleted}
              />
            )}

            {activeTab === 'reminders' && (
              <RemindersView
                reminders={reminders}
                onToggleReminder={handleToggleReminder}
                onAddReminder={handleAddReminder}
                onDeleteReminder={handleDeleteReminder}
              />
            )}

            {activeTab === 'reports' && (
              <ReportsView
                onNavigate={setActiveTab}
                user={user}
                tasks={tasks}
                testsCount={testsCount}
                bestScore={bestScore}
                avgScore={avgScore}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsView
                user={user}
                onUpdateProfile={handleUpdateProfile}
                onSignOut={handleSignOut}
              />
            )}
          </Suspense>
        </main>
      </div>

      {/* Code-Split Lazy Overlays and Modals */}
      <Suspense fallback={null}>
        {isCommandOpen && (
          <CommandPalette
            isOpen={isCommandOpen}
            onClose={() => setIsCommandOpen(false)}
            onNavigate={setActiveTab}
            onSelectAction={() => {}}
          />
        )}

        {/* AI Companion Drawer is permanently mounted so switching views or tabs never aborts generation or clears chat */}
        <AICompanionDrawer
          isOpen={isCompanionOpen}
          onClose={() => {
            setIsCompanionOpen(false);
            setCompanionInitialQuery(undefined);
          }}
          user={user}
          initialQuery={companionInitialQuery}
          onClearInitialQuery={() => setCompanionInitialQuery(undefined)}
        />

        {activeQuiz !== null && (
          <QuizModal
            quiz={activeQuiz}
            isOpen={activeQuiz !== null}
            onClose={() => setActiveQuiz(null)}
            onQuizCompleted={handleQuizCompleted}
          />
        )}

        {isWhatIfOpen && (
          <WhatIfModal
            isOpen={isWhatIfOpen}
            onClose={() => setIsWhatIfOpen(false)}
            onOpenCompanion={handleOpenCompanion}
            user={user}
          />
        )}

        {/* Full Feature Auth Modal / Drawer */}
        {isAuthOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-6xl min-h-screen sm:min-h-0 sm:rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative bg-[#080a14]">
              <AuthView
                onAuthenticated={handleAuthenticated}
                onClose={() => setIsAuthOpen(false)}
              />
            </div>
          </div>
        )}

        {isCreateAccountOpen && (
          <CreateAccountModal
            isOpen={isCreateAccountOpen}
            onClose={() => setIsCreateAccountOpen(false)}
            onAccountCreated={(newUser) => {
              setUser(newUser);
              localStorage.setItem('mindpath_user', JSON.stringify(newUser));
              refreshUserData(newUser.id);
              setIsCreateAccountOpen(false);
              const hasCompleted = localStorage.getItem('mindpath_onboarding_completed') ||
                localStorage.getItem(`mindpath_onboarding_completed_${newUser.id}`);
              if (!hasCompleted) {
                setIsOnboardingOpen(true);
              }
            }}
          />
        )}

        {isOnboardingOpen && (
          <OnboardingTour
            isOpen={isOnboardingOpen}
            onClose={() => {
              setIsOnboardingOpen(false);
              localStorage.setItem('mindpath_onboarding_completed', 'true');
              if (user?.id) {
                localStorage.setItem(`mindpath_onboarding_completed_${user.id}`, 'true');
              }
            }}
            onNavigate={(tab) => {
              setActiveTab(tab);
              setIsOnboardingOpen(false);
              localStorage.setItem('mindpath_onboarding_completed', 'true');
              if (user?.id) {
                localStorage.setItem(`mindpath_onboarding_completed_${user.id}`, 'true');
              }
            }}
            userName={user.name}
          />
        )}
      </Suspense>
    </div>
  );
}
