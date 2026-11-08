import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownMessageProps {
  content: string;
  isStreaming?: boolean;
}

export const MarkdownMessage: React.FC<MarkdownMessageProps> = ({
  content,
  isStreaming = false,
}) => {
  return (
    <div className="markdown-content text-xs leading-relaxed text-slate-200 break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ node, ...props }) => (
            <h1 className="text-sm font-extrabold text-white mt-3 mb-1.5 pb-1 border-b border-white/10" {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="text-xs font-bold text-indigo-300 mt-2.5 mb-1 flex items-center gap-1.5" {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="text-xs font-bold text-purple-200 mt-2 mb-1" {...props} />
          ),
          h4: ({ node, ...props }) => (
            <h4 className="text-xs font-semibold text-slate-100 mt-1.5 mb-0.5" {...props} />
          ),
          p: ({ node, ...props }) => (
            <p className="mb-2 last:mb-0 text-slate-200 leading-relaxed" {...props} />
          ),
          strong: ({ node, ...props }) => (
            <strong className="font-bold text-white tracking-wide" {...props} />
          ),
          em: ({ node, ...props }) => (
            <em className="italic text-indigo-200" {...props} />
          ),
          ul: ({ node, ...props }) => (
            <ul className="list-disc pl-4 space-y-1 my-2 text-slate-200 marker:text-indigo-400" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="list-decimal pl-4 space-y-1 my-2 text-slate-200 marker:text-indigo-400 font-medium" {...props} />
          ),
          li: ({ node, ...props }) => (
            <li className="leading-relaxed pl-0.5" {...props} />
          ),
          table: ({ node, ...props }) => (
            <div className="w-full overflow-x-auto my-3 rounded-2xl border border-white/15 bg-[#090b17] shadow-xl custom-table-scrollbar p-1 pb-2">
              <table className="w-full border-collapse text-[11px] min-w-[560px] text-left" {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => (
            <thead className="bg-[#181d3d] text-indigo-200 border-b border-white/10" {...props} />
          ),
          tbody: ({ node, ...props }) => (
            <tbody className="divide-y divide-white/5" {...props} />
          ),
          tr: ({ node, ...props }) => (
            <tr className="hover:bg-white/5 transition-colors" {...props} />
          ),
          th: ({ node, ...props }) => (
            <th className="px-3 py-2 text-left font-bold text-[10px] uppercase tracking-wider text-slate-300" {...props} />
          ),
          td: ({ node, ...props }) => (
            <td className="px-3 py-2 text-slate-200 align-top leading-normal" {...props} />
          ),
          blockquote: ({ node, ...props }) => (
            <blockquote className="pl-3 py-1 my-2 border-l-2 border-indigo-400 bg-indigo-950/30 rounded-r-lg text-slate-300 italic" {...props} />
          ),
          code: ({ node, className, children, ...props }: any) => {
            const isBlock = Boolean(className) || (typeof children === 'string' && children.includes('\n'));
            if (isBlock) {
              return (
                <div className="my-2.5 rounded-xl overflow-hidden border border-white/10 bg-[#0c0e1a] shadow-inner">
                  <div className="px-3 py-1 bg-[#151936] text-[10px] text-slate-400 font-mono border-b border-white/5 flex items-center justify-between">
                    <span>code</span>
                  </div>
                  <pre className="p-3 text-cyan-300 font-mono text-[11px] overflow-x-auto leading-relaxed">
                    <code {...props}>{children}</code>
                  </pre>
                </div>
              );
            }
            return (
              <code className="px-1.5 py-0.5 rounded-md bg-[#0d1024] border border-white/10 font-mono text-[11px] text-indigo-300" {...props}>
                {children}
              </code>
            );
          },
          hr: ({ node, ...props }) => (
            <hr className="my-3 border-white/10" {...props} />
          ),
          a: ({ node, href, children, ...props }) => {
            const safeHref = href && (/^https?:\/\//i.test(href) || href.startsWith('#')) ? href : '#';
            return (
              <a
                href={safeHref}
                className="text-indigo-400 hover:text-indigo-300 underline font-medium transition-colors"
                target={safeHref.startsWith('http') ? '_blank' : undefined}
                rel="noopener noreferrer"
                {...props}
              >
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
      {isStreaming && (
        <span className="inline-block w-1.5 h-3 ml-1 bg-purple-400 animate-pulse rounded-xs align-baseline" />
      )}
    </div>
  );
};

