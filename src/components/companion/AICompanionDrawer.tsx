import {
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  FileText,
  Globe,
  History,
  MessageSquare,
  Paperclip,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  User,
  X,
  Zap,
} from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChatAttachment, ChatMsg, ToolEvent, useEnzonicChat, WebCitation } from '../../hooks/useEnzonicChat.ts';
import { UserProfile } from '../../types/index.ts';
import { AILogo } from '../brand/AILogo.tsx';
import { MarkdownMessage } from './MarkdownMessage.tsx';

export interface LocalAttachment extends ChatAttachment {
  id: string;
  url?: string;
  key?: string;
  uploading?: boolean;
}

export interface ExtendedChatMsg extends ChatMsg {
  attachments?: LocalAttachment[];
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ExtendedChatMsg[];
  citations?: Record<number, WebCitation[]>;
}

interface AICompanionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  initialQuery?: string;
  onClearInitialQuery?: () => void;
}

export const AICompanionDrawer: React.FC<AICompanionDrawerProps> = ({
  isOpen,
  onClose,
  user,
  initialQuery,
  onClearInitialQuery,
}) => {
  const userKey = user?.id || 'learner';
  const sessionsStorageKey = `mindpath_chat_sessions_${userKey}`;
  const activeSessionKey = `mindpath_active_session_id_${userKey}`;

  const displayName = user?.name ? user.name.split(' ')[0] : 'there';

  const createDefaultMessage = useCallback((): ExtendedChatMsg[] => [
    {
      role: 'assistant',
      content: `Hello ${displayName}! 👋 I'm MindPath, your personalized AI companion with **Live Web Search**, **Academic Tools**, and **Image/File Multimodal Analysis** enabled.\n\nI can directly add study tasks, schedule reminders, evaluate code screenshots, analyze skill gaps, simulate technical interviews, or solve complex mathematics. How can I assist you today?`,
    },
  ], [displayName]);

  // Load chat sessions from localStorage
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(sessionsStorageKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch {}
      }
    }
    const initialId = `session_${Date.now()}`;
    return [
      {
        id: initialId,
        title: 'Current Conversation',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: createDefaultMessage(),
        citations: {},
      },
    ];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const savedActive = localStorage.getItem(activeSessionKey);
      if (savedActive) return savedActive;
    }
    return sessions[0]?.id || `session_${Date.now()}`;
  });

  const [showHistory, setShowHistory] = useState(false);

  // Get active session
  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];
  const messages = activeSession?.messages || createDefaultMessage();
  const messageCitations = activeSession?.citations || {};

  // Load chat sessions from Turso DB on mount or when user changes
  useEffect(() => {
    let isMounted = true;
    const fetchDBSessions = async () => {
      try {
        const res = await fetch(`/api/chat/sessions?userId=${encodeURIComponent(userKey)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.ok && Array.isArray(data.sessions) && data.sessions.length > 0) {
            if (!isMounted) return;
            setSessions(data.sessions);
            if (typeof window !== 'undefined') {
              localStorage.setItem(sessionsStorageKey, JSON.stringify(data.sessions));
            }
            if (!data.sessions.some((s: ChatSession) => s.id === activeSessionId)) {
              setActiveSessionId(data.sessions[0].id);
              if (typeof window !== 'undefined') {
                localStorage.setItem(activeSessionKey, data.sessions[0].id);
              }
            }
          }
        }
      } catch (err) {
        console.warn('Notice: loading chat sessions from DB:', err);
      }
    };

    fetchDBSessions();
    return () => {
      isMounted = false;
    };
  }, [userKey, sessionsStorageKey, activeSessionKey, activeSessionId]);

  // Save sessions to localStorage & sync to Turso DB
  const persistSessions = useCallback((updated: ChatSession[], newActiveId?: string) => {
    setSessions(updated);
    const targetId = newActiveId || activeSessionId;
    if (newActiveId) setActiveSessionId(newActiveId);
    if (typeof window !== 'undefined') {
      localStorage.setItem(sessionsStorageKey, JSON.stringify(updated));
      if (newActiveId) {
        localStorage.setItem(activeSessionKey, newActiveId);
      }
    }

    // Sync session to Turso DB in background
    const sessionToSync = updated.find((s) => s.id === targetId) || updated[0];
    if (sessionToSync) {
      fetch('/api/chat/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userKey,
          session: sessionToSync,
        }),
      }).catch((err) => console.warn('Chat DB sync notice:', err));
    }
  }, [sessionsStorageKey, activeSessionKey, userKey, activeSessionId]);

  // Update messages in the active session
  const updateActiveSessionMessages = useCallback((
    newMessages: ExtendedChatMsg[],
    newCitations?: Record<number, WebCitation[]>,
    newTitle?: string
  ) => {
    const updated = sessions.map((sess) => {
      if (sess.id === activeSession?.id) {
        return {
          ...sess,
          title: newTitle || sess.title,
          updatedAt: Date.now(),
          messages: newMessages,
          citations: newCitations !== undefined ? newCitations : sess.citations,
        };
      }
      return sess;
    });
    persistSessions(updated);
  }, [sessions, activeSession?.id, persistSessions]);

  // Switch to a conversation
  const handleSelectSession = (id: string) => {
    setActiveSessionId(id);
    if (typeof window !== 'undefined') {
      localStorage.setItem(activeSessionKey, id);
    }
    setShowHistory(false);
  };

  // Create a brand new conversation
  const handleNewConversation = () => {
    const newId = `session_${Date.now()}`;
    const newSession: ChatSession = {
      id: newId,
      title: 'New Conversation',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: createDefaultMessage(),
      citations: {},
    };
    persistSessions([newSession, ...sessions], newId);
    setShowHistory(false);
  };

  // Delete a specific conversation session from state and Turso DB
  const handleDeleteSession = (idToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const remaining = sessions.filter((s) => s.id !== idToDelete);
    fetch(`/api/chat/sessions/${encodeURIComponent(idToDelete)}`, {
      method: 'DELETE',
    }).catch((err) => console.warn('Failed to delete chat session from DB:', err));

    if (remaining.length === 0) {
      handleNewConversation();
      return;
    }
    const nextActive = activeSessionId === idToDelete ? remaining[0].id : activeSessionId;
    persistSessions(remaining, nextActive);
  };

  // Clear all sessions from state and Turso DB
  const handleClearAllHistory = () => {
    fetch(`/api/chat/sessions?userId=${encodeURIComponent(userKey)}`, {
      method: 'DELETE',
    }).catch((err) => console.warn('Failed to clear chat sessions from DB:', err));

    const newId = `session_${Date.now()}`;
    const cleanSession: ChatSession = {
      id: newId,
      title: 'New Conversation',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: createDefaultMessage(),
      citations: {},
    };
    persistSessions([cleanSession], newId);
    setShowHistory(false);
  };

  const [input, setInput] = useState('');
  const [streamingDelta, setStreamingDelta] = useState('');
  const [webSearchEnabled, setWebSearchEnabled] = useState(true);
  const [attachments, setAttachments] = useState<LocalAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTool, setActiveTool] = useState<{
    name: string;
    detail: string;
    citations?: WebCitation[];
  } | null>(null);

  const { send, loading } = useEnzonicChat();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const capsScrollRef = useRef<HTMLDivElement>(null);

  const scrollCapabilities = (direction: 'left' | 'right') => {
    if (capsScrollRef.current) {
      const scrollAmount = direction === 'left' ? -220 : 220;
      capsScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleSendMessage = useCallback((textToSend?: unknown) => {
    const raw = typeof textToSend === 'string' ? textToSend : input;
    const text = typeof raw === 'string' ? raw.trim() : '';
    if ((!text && attachments.length === 0) || loading) return;

    const messageAttachments = [...attachments];
    const userMsg: ExtendedChatMsg = {
      role: 'user',
      content: text || (messageAttachments.length > 0 ? 'Please inspect and analyze the attached files/images.' : ''),
      attachments: messageAttachments.length > 0 ? messageAttachments : undefined,
    };

    const updatedMessages: ExtendedChatMsg[] = [...messages, userMsg];
    
    // Auto-derive a smart session title from the first prompt
    let titleToSet: string | undefined;
    if (activeSession && (activeSession.title === 'Current Conversation' || activeSession.title === 'New Conversation')) {
      titleToSet = text.slice(0, 36) + (text.length > 36 ? '...' : '');
    }

    updateActiveSessionMessages(updatedMessages, messageCitations, titleToSet);

    setInput('');
    setAttachments([]);
    setStreamingDelta('');
    setActiveTool(null);

    const systemPrompt: ChatMsg = {
      role: 'system',
      content: `You are MindPath, an intelligent, empathetic, and knowledgeable AI Companion and career mentor for student ${user.name}.
Student details:
- Current Education Level: ${user.educationLevel}
- Target Interest: ${user.careerInterest}
- Current Streak: ${user.streakDays} days
- Study Hours: ${user.totalStudyHours}h
CRITICAL INSTRUCTIONS:
- You must always write complete, helpful, structured answers directly to the student in clean markdown (with headings, bold terms, bullet lists, and tables when comparing data).
- NEVER output raw tool syntax, function calls, or tokens such as <|tool_calls_section_begin|>, <|tool_call_begin|>, or functions.<name>.
- All searches, calculations, and database records are handled and supplied to you. Synthesize them into an authoritative, direct response.`,
    };

    send({
      userId: user.id,
      messages: [systemPrompt, ...updatedMessages.map((m) => ({ role: m.role, content: m.content }))],
      enableWebSearch: webSearchEnabled,
      attachments: messageAttachments.map((a) => ({
        name: a.name,
        type: a.type,
        size: a.size,
        dataUrl: a.dataUrl,
      })),
      onToolEvent: (event: ToolEvent) => {
        let name = 'Smart Research';
        let detail = `Analyzing live data for "${event.query || ''}"...`;

        if (event.type === 'academic') {
          name = 'Academic Solver';
          detail = `Academic Calculator: Evaluating expression...`;
        } else if (event.type === 'database') {
          name = 'Knowledge Base';
          detail = `Querying student milestones, tasks, and study records...`;
        } else if (event.type === 'task_created') {
          name = 'Task Manager';
          detail = `Committed task "${event.title}" directly to Turso DB!`;
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('mindpath:refresh-data'));
          }
        } else if (event.type === 'reminder_created') {
          name = 'Reminder System';
          detail = `Scheduled reminder "${event.title}" (${event.time}) in Turso DB!`;
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('mindpath:refresh-data'));
          }
        } else if (event.type === 'quiz_created') {
          name = 'Interactive Quiz Architect';
          detail = `Generated practice quiz: "${event.title}"!`;
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('mindpath:refresh-data'));
          }
        } else if (event.type === 'course_created') {
          name = 'Course Curriculum Architect';
          detail = `Created structured curriculum: "${event.title}"!`;
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('mindpath:refresh-data'));
          }
        } else if (event.type === 'skill_gap') {
          name = 'Skill Gap Analyzer';
          detail = `Benchmarking student skills vs 2026 industry demand...`;
        } else if (event.type === 'interview_sim') {
          name = 'Mock Interview Simulator';
          detail = `Preparing live assessment questions & evaluation rubric...`;
        } else if (event.type === 'resume_review') {
          name = 'ATS Project Reviewer';
          detail = `Analyzing action verbs, metric quantification & ATS score...`;
        } else if (event.type === 'diagram_gen') {
          name = 'Diagram Architecture Generator';
          detail = `Synthesizing clean Mermaid architecture flowchart...`;
        } else if (event.type === 'image_attached') {
          name = 'Visual Vision Engine';
          detail = `Performing multimodal visual inspection on attached image...`;
        } else if (event.type === 'file_attached') {
          name = 'File Code Inspector';
          detail = `Analyzing attached code file buffer...`;
        }

        setActiveTool({
          name,
          detail,
        });
      },
      onDelta: (delta) => {
        // Filter out any internal model tokens from being streamed to UI
        const cleanDelta = delta
          .replace(/<\|tool_calls_section_begin\|>[\s\S]*?<\|tool_calls_section_end\|>/gi, '')
          .replace(/<\|tool_call_begin\|>[\s\S]*?<\|tool_call_end\|>/gi, '')
          .replace(/functions\.[a-zA-Z0-9_-]+:?\d*<\|tool_call_argument_begin\|>[\s\S]*?<\|tool_call_end\|>/gi, '')
          .replace(/<\|[^>]*\|>/g, '');
        if (cleanDelta) {
          setStreamingDelta((prev) => prev + cleanDelta);
        }
      },
      onDone: (full) => {
        const cleanFull = full
          .replace(/<\|tool_calls_section_begin\|>[\s\S]*?<\|tool_calls_section_end\|>/gi, '')
          .replace(/<\|tool_call_begin\|>[\s\S]*?<\|tool_call_end\|>/gi, '')
          .replace(/Tool:\s*[a-zA-Z0-9_-]+\s*\n*Parameters:\s*\{[\s\S]*?\}/gi, '')
          .replace(/functions\.[a-zA-Z0-9_-]+:?\d*<\|tool_call_argument_begin\|>[\s\S]*?<\|tool_call_end\|>/gi, '')
          .replace(/<\|[^>]*\|>/g, '')
          .trim();

        const finalMessages: ExtendedChatMsg[] = [...updatedMessages, { role: 'assistant', content: cleanFull }];
        updateActiveSessionMessages(finalMessages);
        setStreamingDelta('');
        setActiveTool(null);
      },
      onError: (err) => {
        const fallbackMsg: ExtendedChatMsg = {
          role: 'assistant',
          content: `I encountered a momentary connection hiccup (${err.message || 'network timeout'}). Your conversation is fully preserved! Please retry or continue asking your question.`,
        };
        updateActiveSessionMessages([...updatedMessages, fallbackMsg]);
        setStreamingDelta('');
        setActiveTool(null);
      },
    });
  }, [input, attachments, loading, messages, user, send, webSearchEnabled, activeSession, messageCitations, updateActiveSessionMessages]);

  // Handle incoming initialQuery from other views (e.g. Learning Hub "Ask AI Doubt")
  useEffect(() => {
    if (isOpen && initialQuery) {
      handleSendMessage(initialQuery);
      if (onClearInitialQuery) onClearInitialQuery();
    }
  }, [isOpen, initialQuery, onClearInitialQuery, handleSendMessage]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: Scroll into view on new message chunks
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, streamingDelta]);

  const quickPrompts = [
    'Add task: Master Python Generators & List Comprehensions',
    'Remind me to study Machine Learning today at 6:00 PM',
    'What are the latest 2026 AI Engineer salaries & hiring trends?',
    'Analyze my skill gap for an AI/ML Engineer role',
    'Mock interview me on Transformer Architecture',
    'Draw an architecture flowchart of modern ML training pipelines',
    'Solve equation: e^(i*pi) + 1 = 0 step by step',
  ];

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    setIsUploading(true);

    for (const file of fileList) {
      if (file.size > 10 * 1024 * 1024) {
        alert(`File "${file.name}" exceeds 10MB limit.`);
        continue;
      }

      try {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const tempId = `att_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const localAtt: LocalAttachment = {
          id: tempId,
          name: file.name,
          type: file.type || 'application/octet-stream',
          size: file.size,
          dataUrl,
          uploading: true,
        };

        setAttachments((prev) => [...prev, localAtt]);

        // Upload to Cloudflare R2 and persist record in Turso DB uploaded_files
        const res = await fetch('/api/storage/upload-chat-file', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            base64Data: dataUrl,
            contentType: file.type || 'application/octet-stream',
            userId: userKey,
            sessionId: activeSessionId,
          }),
        });

        if (res.ok) {
          const resData = await res.json();
          if (resData.ok && resData.file) {
            setAttachments((prev) =>
              prev.map((a) =>
                a.id === tempId
                  ? {
                      ...a,
                      id: resData.file.id,
                      url: resData.file.url,
                      key: resData.file.key,
                      uploading: false,
                    }
                  : a
              )
            );
          } else {
            setAttachments((prev) =>
              prev.map((a) => (a.id === tempId ? { ...a, uploading: false } : a))
            );
          }
        } else {
          setAttachments((prev) =>
            prev.map((a) => (a.id === tempId ? { ...a, uploading: false } : a))
          );
        }
      } catch (err) {
        console.warn('Attachment upload notice:', err);
      }
    }

    setIsUploading(false);
    e.target.value = '';
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div
      className={`fixed inset-0 z-50 transition-opacity duration-300 ${
        isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* Background Dim Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
        onClick={onClose}
      />

      {/* Main Slide-out Panel */}
      <div
        className={`absolute inset-y-0 right-0 w-full sm:w-[540px] bg-[#111428] border-l border-white/10 shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          multiple
          accept="image/*,.txt,.py,.js,.ts,.tsx,.json,.csv,.md,.sql"
          className="hidden"
        />

        {/* Drawer Header */}
        <div className="p-4 border-b border-white/10 bg-[#151936] relative z-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AILogo size="md" pulse={true} />
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-white">MindPath Companion</h2>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>MindPath AI Live</span>
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">
                  Autonomous mentor, task scheduler &amp; multimodal tutor
                </p>
              </div>
            </div>

            {/* Header Action Buttons */}
            <div className="flex items-center gap-1.5">
              {/* History Toggle Button */}
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer border ${
                  showHistory
                    ? 'bg-purple-600 border-purple-500 text-white shadow-md'
                    : 'bg-white/5 border-white/10 text-slate-300 hover:text-white hover:bg-white/10'
                }`}
                title="Chat History"
              >
                <History className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">History</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/10 text-cyan-300 font-bold ml-0.5">
                  {sessions.length}
                </span>
              </button>

              {/* New Conversation Button */}
              <button
                type="button"
                onClick={handleNewConversation}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Start New Conversation"
              >
                <Plus className="w-4 h-4" />
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                title="Close Drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Sliding History Sidebar Overlay */}
        {showHistory && (
          <div className="absolute inset-y-[73px] inset-x-0 bg-[#0d1024]/95 backdrop-blur-xl z-30 p-4 flex flex-col justify-between border-b border-white/10 animate-in fade-in slide-in-from-top-4 duration-200">
            <div className="space-y-3 overflow-y-auto">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div className="flex items-center gap-2 text-xs font-bold text-white">
                  <Clock className="w-4 h-4 text-purple-400" />
                  <span>Saved Conversations ({sessions.length})</span>
                </div>
                <button
                  type="button"
                  onClick={handleNewConversation}
                  className="px-3 py-1 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 text-xs font-bold text-white shadow flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Chat</span>
                </button>
              </div>

              <div className="space-y-1.5 pt-1">
                {sessions.map((sess) => {
                  const isActive = sess.id === activeSession?.id;
                  const dateStr = new Date(sess.updatedAt).toLocaleDateString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <div
                      key={sess.id}
                      onClick={() => handleSelectSession(sess.id)}
                      className={`group flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                        isActive
                          ? 'bg-purple-600/25 border-purple-500/50 text-white shadow-sm'
                          : 'bg-[#141836] hover:bg-[#1a2048] border-white/5 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <MessageSquare className={`w-4 h-4 shrink-0 ${isActive ? 'text-cyan-400' : 'text-purple-400/60'}`} />
                        <div className="truncate">
                          <p className="text-xs font-bold truncate max-w-[340px] text-white">
                            {sess.title}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {dateStr} • {sess.messages.length} messages
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => handleDeleteSession(sess.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-all cursor-pointer"
                        title="Delete chat"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 flex items-center justify-between">
              <button
                type="button"
                onClick={handleClearAllHistory}
                className="text-xs text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-1.5 cursor-pointer font-medium"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All Chat History</span>
              </button>
              <button
                type="button"
                onClick={() => setShowHistory(false)}
                className="px-4 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
              >
                Close History
              </button>
            </div>
          </div>
        )}

        {/* Chat Messages Log Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((m, idx) => {
            const citations = messageCitations[idx];
            return (
              <div
                key={idx}
                className={`flex items-start gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    m.role === 'user'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-purple-950/60 text-purple-300 border border-purple-500/40 shadow-sm shadow-purple-500/20'
                  }`}
                >
                  {m.role === 'user' ? (
                    user.avatarUrl ? (
                      <img src={user.avatarUrl} alt="User" className="w-7 h-7 rounded-lg object-cover" />
                    ) : (
                      <User className="w-3.5 h-3.5" />
                    )
                  ) : (
                    <AILogo size="xs" pulse={false} className="w-4 h-4" />
                  )}
                </div>

                <div
                  className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs shadow-sm ${
                    m.role === 'user'
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-tr-none'
                      : 'bg-[#181d3d] text-slate-200 rounded-tl-none border border-white/5'
                  }`}
                >
                  {/* Attachments preview if user uploaded any */}
                  {m.attachments && m.attachments.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {m.attachments.map((att, aIdx) => {
                        const isImg = (att.type?.startsWith('image/')) || (att.url && /\.(jpeg|jpg|png|webp|gif)$/i.test(att.url));
                        const src = att.url || att.dataUrl;
                        return (
                          <a
                            key={aIdx}
                            href={src}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 p-1 rounded-lg bg-black/40 hover:bg-black/60 border border-white/10 hover:border-cyan-500/40 text-[10px] transition-colors group/att"
                            title={`Open ${att.name || 'attachment'}`}
                          >
                            {isImg && src ? (
                              <img
                                src={src}
                                alt={att.name}
                                className="w-5 h-5 object-cover rounded"
                              />
                            ) : (
                              <FileText className="w-3 h-3 text-cyan-300" />
                            )}
                            <span className="truncate max-w-[140px] font-mono text-slate-300 group-hover/att:text-white">
                              {att.name}
                            </span>
                            <ExternalLink className="w-2.5 h-2.5 text-slate-400 group-hover/att:text-cyan-300" />
                          </a>
                        );
                      })}
                    </div>
                  )}

                  {m.role === 'user' ? (
                    <div className="whitespace-pre-wrap">{m.content}</div>
                  ) : (
                    <div>
                      <MarkdownMessage content={m.content} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Live Active Tool Feedback Indicator */}
          {activeTool && (
            <div className="flex items-center gap-2 pl-9 py-1 text-xs text-cyan-300 animate-in fade-in">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping shrink-0" />
              <Zap className="w-3.5 h-3.5 text-cyan-400 animate-pulse shrink-0" />
              <span className="text-[11px] font-medium text-cyan-200">{activeTool.detail}</span>
            </div>
          )}

          {/* Streaming message chunk with live markdown parsing */}
          {streamingDelta && (
            <div className="flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-purple-950/60 text-purple-300 border border-purple-500/40 shadow-sm shadow-purple-500/20 flex items-center justify-center shrink-0">
                <AILogo size="xs" pulse={true} className="w-4 h-4 animate-pulse" />
              </div>
              <div className="max-w-[88%] rounded-2xl rounded-tl-none px-3.5 py-2.5 text-xs bg-[#181d3d] text-slate-200 border border-white/5 shadow-sm">
                <MarkdownMessage content={streamingDelta} isStreaming={true} />
              </div>
            </div>
          )}

          {loading && !streamingDelta && (
            <div className="flex items-center gap-2 text-xs text-purple-300 pl-9">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-400" />
              <span className="animate-pulse">
                {activeTool ? activeTool.detail : 'MindPath AI is analyzing and composing solution...'}
              </span>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Suggested Quick Prompts with PC Smooth Horizontal Scrolling & Arrows */}
        <div className="px-3 py-2 bg-[#0d1022] border-t border-white/5 relative group/caps">
          <div className="flex items-center justify-between mb-1.5 text-[10px] text-slate-400 font-medium">
            <span>AI Agent Capabilities:</span>
            <span className="text-cyan-400 font-normal">Tasks • Reminders • Code • Vision</span>
          </div>

          <div className="relative flex items-center">
            {/* Left Scroll Button for PC */}
            <button
              type="button"
              onClick={() => scrollCapabilities('left')}
              className="hidden sm:flex absolute left-0 z-10 w-6 h-6 items-center justify-center rounded-full bg-[#181d3d] hover:bg-purple-600 border border-white/20 text-white shadow-md cursor-pointer transition-all -ml-1"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            {/* Scrollable Container with onWheel mouse translation */}
            <div
              ref={capsScrollRef}
              onWheel={(e) => {
                if (e.deltaY !== 0) {
                  e.currentTarget.scrollLeft += e.deltaY;
                }
              }}
              className="flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-white/20 hover:scrollbar-thumb-purple-500/50 scrollbar-track-transparent scroll-smooth px-1"
            >
              {quickPrompts.map((qp, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(qp)}
                  disabled={loading}
                  className="px-2.5 py-1 rounded-full bg-[#181d3d] hover:bg-indigo-600/40 border border-white/10 text-[10px] text-slate-300 hover:text-white whitespace-nowrap transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {qp}
                </button>
              ))}
            </div>

            {/* Right Scroll Button for PC */}
            <button
              type="button"
              onClick={() => scrollCapabilities('right')}
              className="hidden sm:flex absolute right-0 z-10 w-6 h-6 items-center justify-center rounded-full bg-[#181d3d] hover:bg-purple-600 border border-white/20 text-white shadow-md cursor-pointer transition-all -mr-1"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Selected Attachments Preview Strip */}
        {attachments.length > 0 && (
          <div className="px-3 py-2 bg-[#121634] border-t border-white/10 flex items-center gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-white/20">
            {attachments.map((att) => {
              const isImg = (att.type?.startsWith('image/')) || (att.url && /\.(jpeg|jpg|png|webp|gif)$/i.test(att.url));
              const displaySrc = att.url || att.dataUrl;
              return (
                <div
                  key={att.id}
                  className="relative group shrink-0 flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-[#1c224a] border border-purple-500/30 text-xs text-white"
                >
                  {att.uploading ? (
                    <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />
                  ) : isImg && displaySrc ? (
                    <img src={displaySrc} alt={att.name} className="w-6 h-6 object-cover rounded" />
                  ) : (
                    <FileText className="w-4 h-4 text-purple-400 shrink-0" />
                  )}
                  <div className="flex flex-col">
                    <span className="truncate max-w-[120px] text-[11px] font-medium">{att.name}</span>
                    {att.uploading ? (
                      <span className="text-[9px] text-cyan-300 animate-pulse font-mono">Syncing to R2...</span>
                    ) : (
                      <span className="text-[9px] text-emerald-400 font-mono">Cloud synced</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAttachment(att.id)}
                    className="p-0.5 rounded-full hover:bg-white/20 text-slate-400 hover:text-white transition-colors cursor-pointer ml-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Input Form with Attachment & Vision Upload */}
        <div className="p-3 bg-[#151936] border-t border-white/10">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            {/* Attachment Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-purple-300 transition-colors cursor-pointer shrink-0"
              title="Attach Images (Vision) or Code Files (.py, .ts, .txt, .json)"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Main Text Input */}
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything, add task, solve math, or upload screenshots..."
              className="flex-1 bg-[#181d3d] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 transition-colors"
            />

            {/* Live Web Search Toggle Pill */}
            <button
              type="button"
              onClick={() => setWebSearchEnabled(!webSearchEnabled)}
              className={`p-2 rounded-xl border transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
                webSearchEnabled
                  ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300 shadow-sm'
                  : 'bg-white/5 border-white/10 text-slate-500 hover:text-slate-300'
              }`}
              title={webSearchEnabled ? 'Live Web Search: Active (Searches real-time web when required)' : 'Live Web Search: Inactive'}
            >
              <Globe className="w-4 h-4" />
            </button>

            {/* Send Button */}
            <button
              type="submit"
              disabled={(!input.trim() && attachments.length === 0) || loading || isUploading}
              className="p-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 text-white shadow-lg shadow-purple-500/30 disabled:opacity-50 transition-all cursor-pointer shrink-0"
              title={isUploading ? 'Uploading attachments to Cloud...' : 'Send Message'}
            >
              {isUploading ? (
                <RefreshCw className="w-4 h-4 animate-spin text-cyan-300" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
