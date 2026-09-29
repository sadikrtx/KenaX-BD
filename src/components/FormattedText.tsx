import React from 'react';
import { HighlightIcon } from './HighlightIcon';

interface FormattedTextProps {
  content?: string;
  fallback?: string;
  className?: string;
}

// Icon helper mapping to determine icon name and color
function getIconMeta(tag: string): { icon: string; color: string } | null {
  const clean = tag.toLowerCase().replace(/[\[\]]/g, '').trim();
  if (['check', 'check-circle', 'check_circle', 'verify', 'verified'].includes(clean)) return { icon: 'check-circle', color: 'emerald' };
  if (['truck', 'delivery', 'shipping'].includes(clean)) return { icon: 'truck', color: 'sky' };
  if (['shield', 'shield-check', 'warranty', 'guarantee', 'security'].includes(clean)) return { icon: 'shield-check', color: 'indigo' };
  if (['star', 'rating', 'quality'].includes(clean)) return { icon: 'star', color: 'amber' };
  if (['zap', 'fast', 'express'].includes(clean)) return { icon: 'zap', color: 'amber' };
  if (['heart', 'love', 'favorite'].includes(clean)) return { icon: 'heart', color: 'rose' };
  if (['flame', 'fire', 'hot', 'trending'].includes(clean)) return { icon: 'flame', color: 'amber' };
  if (['award', 'original', 'authentic', 'top'].includes(clean)) return { icon: 'award', color: 'purple' };
  if (['gift', 'offer', 'bonus'].includes(clean)) return { icon: 'gift', color: 'rose' };
  if (['tag', 'price', 'badge'].includes(clean)) return { icon: 'tag', color: 'sky' };
  if (['package', 'stock', 'box'].includes(clean)) return { icon: 'package-check', color: 'indigo' };
  if (['clock', 'time', '24/7'].includes(clean)) return { icon: 'clock', color: 'sky' };
  if (['sparkles', 'sparkle', 'magic', 'new'].includes(clean)) return { icon: 'sparkles', color: 'amber' };
  if (['headphones', 'support', 'help'].includes(clean)) return { icon: 'headphones', color: 'emerald' };
  if (['discount', 'percent'].includes(clean)) return { icon: 'badge-percent', color: 'rose' };
  if (['refresh', 'return'].includes(clean)) return { icon: 'refresh-cw', color: 'sky' };
  return null;
}

/**
 * Parses inline formatting:
 * **bold** or __bold__ or <b>bold</b> or <strong>bold</strong> -> <strong>
 * *italic* or _italic_ or <i>italic</i> or <em>italic</em> -> <em>
 * ~~strike~~ -> <del>
 * `code` -> <code>
 * [check], [truck], [shield], [star], etc. -> <HighlightIcon />
 */
function parseInline(text: string): React.ReactNode[] {
  if (!text) return [];

  // Match **bold**, __bold__, <b>bold</b>, <strong>bold</strong>, ~~strike~~, `code`, *italic*, _italic_, <i>italic</i>, <em>italic</em>, [icon-tag]
  const regex = /(\*\*[^*]+\*\*|__[^_]+__|<b>.*?<\/b>|<strong>.*?<\/strong>|~~[^~]+~~|`[^`]+`|\*[^*]+\*|_[^_]+_|<i>.*?<\/i>|<em>.*?<\/em>|\[[a-zA-Z0-9_\-]+\])/gi;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    const token = match[0];
    const key = `${match.index}-${token}`;
    const tokenLower = token.toLowerCase();

    if (
      (token.startsWith('**') && token.endsWith('**')) ||
      (token.startsWith('__') && token.endsWith('__')) ||
      (tokenLower.startsWith('<b>') && tokenLower.endsWith('</b>')) ||
      (tokenLower.startsWith('<strong>') && tokenLower.endsWith('</strong>'))
    ) {
      let innerText = token;
      if (token.startsWith('**') || token.startsWith('__')) {
        innerText = token.slice(2, -2);
      } else if (tokenLower.startsWith('<b>')) {
        innerText = token.slice(3, -4);
      } else if (tokenLower.startsWith('<strong>')) {
        innerText = token.slice(8, -9);
      }
      parts.push(
        <strong key={key} className="font-extrabold text-slate-900">
          {innerText}
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
      (token.startsWith('_') && token.endsWith('_')) ||
      (tokenLower.startsWith('<i>') && tokenLower.endsWith('</i>')) ||
      (tokenLower.startsWith('<em>') && tokenLower.endsWith('</em>'))
    ) {
      let innerText = token;
      if (token.startsWith('*') || token.startsWith('_')) {
        innerText = token.slice(1, -1);
      } else if (tokenLower.startsWith('<i>')) {
        innerText = token.slice(3, -4);
      } else if (tokenLower.startsWith('<em>')) {
        innerText = token.slice(4, -5);
      }
      parts.push(
        <em key={key} className="italic text-slate-800">
          {innerText}
        </em>
      );
    } else if (token.startsWith('[') && token.endsWith(']')) {
      const meta = getIconMeta(token);
      if (meta) {
        parts.push(
          <HighlightIcon
            key={key}
            icon={meta.icon}
            iconColor={meta.color}
            className="w-4 h-4 inline-block align-text-bottom mr-1 shrink-0"
          />
        );
      } else {
        parts.push(token);
      }
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
