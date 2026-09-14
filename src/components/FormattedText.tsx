import React from 'react';

interface FormattedTextProps {
  content?: string;
  fallback?: string;
  className?: string;
}

/**
 * Parses inline formatting:
 * **bold** or __bold__ -> <strong>
 * *italic* or _italic_ -> <em>
 * ~~strike~~ -> <del>
 * `code` -> <code>
 */
function parseInline(text: string): React.ReactNode[] {
  if (!text) return [];

  // Match **bold**, __bold__, ~~strike~~, `code`, *italic*, _italic_
  const regex = /(\*\*[^*]+\*\*|__[^_]+__|~~[^~]+~~|`[^`]+`|\*[^*]+\*|_[^_]+_)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    const token = match[0];
    const key = `${match.index}-${token}`;

    if (
      (token.startsWith('**') && token.endsWith('**')) ||
      (token.startsWith('__') && token.endsWith('__'))
    ) {
      parts.push(
        <strong key={key} className="font-extrabold text-slate-900">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('~~') && token.endsWith('~~')) {
      parts.push(
        <del key={key} className="line-through text-slate-400">
          {token.slice(2, -2)}
        </del>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code
          key={key}
          className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-sky-700 font-mono text-[0.9em]"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (
      (token.startsWith('*') && token.endsWith('*')) ||
      (token.startsWith('_') && token.endsWith('_'))
    ) {
      parts.push(
        <em key={key} className="italic text-slate-800">
          {token.slice(1, -1)}
        </em>
      );
    } else {
      parts.push(token);
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts;
}

export const FormattedText: React.FC<FormattedTextProps> = ({
  content,
  fallback,
  className = '',
}) => {
  const rawText = content && content.trim() ? content : fallback || '';

  if (!rawText) return null;

  const lines = rawText.split('\n');

  return (
    <div className={`space-y-1.5 leading-relaxed text-slate-700 ${className}`}>
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        // Empty line -> spacing
        if (!trimmed) {
          return <div key={idx} className="h-1.5" />;
        }

        // Heading 1: # Title
        if (line.startsWith('# ')) {
          return (
            <h3
              key={idx}
              className="text-base sm:text-lg font-black text-slate-900 mt-3 mb-1 pt-1 border-b border-slate-100 flex items-center gap-1.5"
            >
              {parseInline(line.slice(2))}
            </h3>
          );
        }

        // Heading 2: ## Title
        if (line.startsWith('## ')) {
          return (
            <h4
              key={idx}
              className="text-sm sm:text-base font-bold text-slate-900 mt-2.5 mb-1 flex items-center gap-1.5"
            >
              {parseInline(line.slice(3))}
            </h4>
          );
        }

        // Heading 3: ### Title
        if (line.startsWith('### ')) {
          return (
            <h5
              key={idx}
              className="text-xs sm:text-sm font-semibold text-slate-800 mt-2 mb-0.5"
            >
              {parseInline(line.slice(4))}
            </h5>
          );
        }

        // Bullet point: - Item, * Item, • Item
        if (
          trimmed.startsWith('- ') ||
          trimmed.startsWith('* ') ||
          trimmed.startsWith('• ')
        ) {
          const bulletContent = trimmed.replace(/^[-*•]\s*/, '');
          return (
            <div key={idx} className="flex items-start gap-2 my-0.5 pl-1">
              <span className="text-sky-600 font-bold shrink-0 select-none text-sm leading-snug">
                •
              </span>
              <div className="flex-1 text-slate-700 leading-relaxed">
                {parseInline(bulletContent)}
              </div>
            </div>
          );
        }

        // Numbered list: 1. Item, 2. Item
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start gap-2 my-0.5 pl-1">
              <span className="text-sky-600 font-bold shrink-0 select-none text-xs leading-snug font-mono">
                {numMatch[1]}.
              </span>
              <div className="flex-1 text-slate-700 leading-relaxed">
                {parseInline(numMatch[2])}
              </div>
            </div>
          );
        }

        // Blockquote / Notice: > Note
        if (trimmed.startsWith('> ')) {
          return (
            <blockquote
              key={idx}
              className="border-l-3 border-sky-500 bg-sky-50/70 pl-3 py-1.5 my-1 text-xs text-sky-950 rounded-r-lg font-medium"
            >
              {parseInline(trimmed.slice(2))}
            </blockquote>
          );
        }

        // Normal paragraph line
        return (
          <p key={idx} className="my-0.5">
            {parseInline(line)}
          </p>
        );
      })}
    </div>
  );
};
