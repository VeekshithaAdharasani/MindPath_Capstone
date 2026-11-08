import { useCallback, useState } from 'react';

export interface ChatMsg {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface WebCitation {
  title: string;
  url: string;
  snippet: string;
  source?: 'web' | 'academic';
}

export interface ChatAttachment {
  name: string;
  type: string;
  size: number;
  dataUrl: string;
}

export interface ToolEvent {
  type:
    | 'web_search'
    | 'academic'
    | 'database'
    | 'task_created'
    | 'task_deleted'
    | 'reminder_created'
    | 'reminder_deleted'
    | 'skill_gap'
    | 'interview_sim'
    | 'resume_review'
    | 'diagram_gen'
    | 'file_attached'
    | 'image_attached'
    | 'quiz_created'
    | 'course_created';
  query?: string;
  citations?: WebCitation[];
  title?: string;
  time?: string;
}

export function useEnzonicChat() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(
    async ({
      userId,
      messages,
      enableWebSearch = true,
      attachments,
      onDelta,
      onToolEvent,
      onDone,
      onError,
    }: {
      userId?: string;
      messages: ChatMsg[];
      enableWebSearch?: boolean;
      attachments?: ChatAttachment[];
      onDelta: (delta: string) => void;
      onToolEvent?: (toolEvent: ToolEvent) => void;
      onDone: (full: string) => void;
      onError?: (err: Error) => void;
    }) => {
      setLoading(true);
      setError(null);

      const executeRequest = async (isRetry = false): Promise<void> => {
        try {
          const res = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-user-id': userId || '',
            },
            body: JSON.stringify({
              userId,
              messages,
              stream: true,
              temperature: 0.3,
              reasoningEffort: 'medium',
              enableWebSearch,
              attachments,
            }),
          });

          if (!res.ok) {
            throw new Error(await res.text());
          }

          let full = '';
          const reader = res.body!.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              // Ignore SSE keep-alive comments like ": keepalive"
              if (!trimmed.startsWith('data:')) continue;
              const data = trimmed.slice(5).trim();
              if (data === '[DONE]') {
                onDone(full);
                return;
              }
              try {
                const parsed = JSON.parse(data);
                if (parsed.error) {
                  throw new Error(parsed.error);
                }
                if (parsed.toolEvent && onToolEvent) {
                  onToolEvent(parsed.toolEvent);
                }
                if (parsed.delta) {
                  full += parsed.delta;
                  onDelta(parsed.delta);
                }
              } catch (err: any) {
                if (err.message && !err.message.includes('JSON')) {
                  throw err;
                }
              }
            }
          }

          if (buffer.trim().startsWith('data:')) {
            const data = buffer.trim().slice(5).trim();
            if (data !== '[DONE]') {
              try {
                const parsed = JSON.parse(data);
                if (parsed.error) {
                  throw new Error(parsed.error);
                }
                if (parsed.toolEvent && onToolEvent) {
                  onToolEvent(parsed.toolEvent);
                }
                if (parsed.delta) {
                  full += parsed.delta;
                  onDelta(parsed.delta);
                }
              } catch (err: any) {
                if (err.message && !err.message.includes('JSON')) {
                  throw err;
                }
              }
            }
          }
          onDone(full);
        } catch (e: any) {
          if (!isRetry) {
            // Attempt 1 automatic silent retry on network drops
            await new Promise((r) => setTimeout(r, 600));
            return executeRequest(true);
          }
          const err = e instanceof Error ? e : new Error(String(e));
          setError(err.message);
          if (onError) onError(err);
        }
      };

      try {
        await executeRequest(false);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { send, loading, error };
}
