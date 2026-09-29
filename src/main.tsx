import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import './index.css';

// Suppress benign internal Firestore idle stream recycling messages in dev console
if (typeof window !== 'undefined') {
  const isBenignStreamLog = (args: any[]) => {
    try {
      const msg = args
        .map((a) => {
          if (a === null || a === undefined) return '';
          if (typeof a === 'string') return a;
          if (a instanceof Error) return a.message + ' ' + (a.stack || '');
          try {
            return JSON.stringify(a);
          } catch {
            return String(a);
          }
        })
        .join(' ');
      return (
        msg.includes('Disconnecting idle stream') ||
        msg.includes('Timed out waiting for new targets') ||
        msg.includes("RPC 'Listen' stream") ||
        msg.includes('GrpcConnection RPC') ||
        (msg.includes('@firebase/firestore') && msg.includes('CANCELLED'))
      );
    } catch {
      return false;
    }
  };

  const origError = console.error;
  console.error = function (...args: any[]) {
    if (isBenignStreamLog(args)) return;
    origError.apply(console, args);
  };

  const origWarn = console.warn;
  console.warn = function (...args: any[]) {
    if (isBenignStreamLog(args)) return;
    origWarn.apply(console, args);
  };

  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && isBenignStreamLog([event.reason])) {
      event.preventDefault();
    }
  });
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <ErrorBoundary>
        <ThemeProvider>
          <LanguageProvider>
            <App />
          </LanguageProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </StrictMode>
  );
}

