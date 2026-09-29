import React, { createContext, useContext, useState, ReactNode } from 'react';

export type Language = 'bn' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (bn: string, en: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'bn',
  setLanguage: () => {},
  toggleLanguage: () => {},
  t: (bn) => bn,
});

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('kenax_language') || localStorage.getItem('reseller_dashboard_language');
      if (saved === 'en' || saved === 'bn') return saved;
    } catch {}
    return 'bn'; // Default to pure Bangla
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('kenax_language', lang);
      localStorage.setItem('reseller_dashboard_language', lang);
    } catch {}
  };

  const toggleLanguage = () => {
    const next = language === 'bn' ? 'en' : 'bn';
    setLanguage(next);
  };

  const t = (bn: string, en: string): string => {
    return language === 'bn' ? bn : en;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
