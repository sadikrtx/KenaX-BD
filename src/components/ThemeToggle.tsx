import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

interface ThemeToggleProps {
  variant?: 'compact' | 'expanded' | 'mobile';
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  variant = 'compact',
  className = '',
}) => {
  const { theme, toggleTheme, isDark } = useTheme();
  const { t, language } = useLanguage();

  const isBn = language === 'bn';

  if (variant === 'mobile') {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={`p-2 rounded-xl border transition-all cursor-pointer shrink-0 flex items-center justify-center select-none active:scale-95 ${
          isDark
            ? 'bg-slate-900 text-amber-300 border-slate-700 shadow-xs hover:bg-slate-800'
            : 'bg-slate-100 text-indigo-600 border-slate-200 hover:bg-slate-200'
        } ${className}`}
        aria-label={isDark ? (isBn ? 'ডে মোড চালু করুন' : 'Switch to Day Mode') : (isBn ? 'নাইট মোড চালু করুন' : 'Switch to Night Mode')}
        title={isDark ? (isBn ? 'ডে মোড চালু করুন' : 'Switch to Day Mode') : (isBn ? 'নাইট মোড চালু করুন' : 'Switch to Night Mode')}
      >
        {isDark ? (
          <Sun className="w-4 h-4 text-amber-400 fill-amber-400/20" />
        ) : (
          <Moon className="w-4 h-4 text-indigo-600 fill-indigo-600/20" />
        )}
      </button>
    );
  }

  if (variant === 'expanded') {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={`p-2 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-center select-none active:scale-95 ${
          isDark
            ? 'bg-slate-900 hover:bg-slate-800 text-amber-300 border-slate-700/80 shadow-xs'
            : 'bg-slate-100 hover:bg-slate-200 text-indigo-600 border-slate-200 shadow-2xs'
        } ${className}`}
        aria-label={isDark ? (isBn ? 'ডে মোডে পরিবর্তন করুন' : 'Switch to Day Mode') : (isBn ? 'নাইট মোডে পরিবর্তন করুন' : 'Switch to Night Mode')}
        title={isDark ? (isBn ? 'ডে মোডে পরিবর্তন করুন' : 'Switch to Day Mode') : (isBn ? 'নাইট মোডে পরিবর্তন করুন' : 'Switch to Night Mode')}
      >
        {isDark ? (
          <Sun className="w-4 h-4 text-amber-400 fill-amber-400/20 transition-transform hover:rotate-45" />
        ) : (
          <Moon className="w-4 h-4 text-indigo-600 fill-indigo-600/20 transition-transform hover:-rotate-12" />
        )}
      </button>
    );
  }

  // Compact variant for Header & Toolbars (Icon only, no text)
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`group p-2 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-center select-none active:scale-95 ${
        isDark
          ? 'bg-slate-900 hover:bg-slate-800 text-amber-300 border-slate-700/80 shadow-xs'
          : 'bg-slate-100 hover:bg-slate-200 text-indigo-600 border-slate-200 shadow-2xs'
      } ${className}`}
      aria-label={isDark ? (isBn ? 'ডে মোডে পরিবর্তন করুন' : 'Switch to Day Mode') : (isBn ? 'নাইট মোডে পরিবর্তন করুন' : 'Switch to Night Mode')}
      title={isDark ? (isBn ? 'ডে মোডে পরিবর্তন করুন' : 'Switch to Day Mode') : (isBn ? 'নাইট মোডে পরিবর্তন করুন' : 'Switch to Night Mode')}
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-amber-400 fill-amber-400/20 transition-transform group-hover:rotate-45" />
      ) : (
        <Moon className="w-4 h-4 text-indigo-600 fill-indigo-600/20 transition-transform group-hover:-rotate-12" />
      )}
    </button>
  );
};
