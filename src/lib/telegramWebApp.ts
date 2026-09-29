/**
 * Telegram Mini App WebApp Integration Utility
 * Single authoritative source for Telegram WebApp environment detection,
 * user initialization, theme sync, haptic feedback, and native controls.
 */

export interface TelegramUser {
  id?: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

export interface TelegramWebApp {
  initData: string;
  initDataUnsafe?: {
    query_id?: string;
    user?: TelegramUser;
    auth_date?: number;
    hash?: string;
    start_param?: string;
  };
  version: string;
  platform: string;
  colorScheme: 'light' | 'dark';
  themeParams: {
    bg_color?: string;
    text_color?: string;
    hint_color?: string;
    link_color?: string;
    button_color?: string;
    button_text_color?: string;
    secondary_bg_color?: string;
  };
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  headerColor: string;
  backgroundColor: string;
  isClosingConfirmationEnabled: boolean;
  BackButton: {
    isVisible: boolean;
    show: () => void;
    hide: () => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
  };
  MainButton: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isActive: boolean;
    isProgressVisible: boolean;
    setText: (text: string) => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
    show: () => void;
    hide: () => void;
    enable: () => void;
    disable: () => void;
    showProgress: (leaveActive?: boolean) => void;
    hideProgress: () => void;
    setParams: (params: { text?: string; color?: string; text_color?: string; is_active?: boolean; is_visible?: boolean }) => void;
  };
  HapticFeedback: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
    selectionChanged: () => void;
  };
  ready: () => void;
  expand: () => void;
  close: () => void;
  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
  enableClosingConfirmation: () => void;
  disableClosingConfirmation: () => void;
  openTelegramLink: (url: string) => void;
  openLink: (url: string) => void;
  sendData: (data: string) => void;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }
}

/**
 * Returns true if running inside Telegram Mini App
 */
export function isTelegramWebApp(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(window.Telegram?.WebApp?.initData);
}

/**
 * Safely access Telegram WebApp instance
 */
export function getTelegramWebApp(): TelegramWebApp | null {
  if (typeof window === 'undefined') return null;
  return window.Telegram?.WebApp || null;
}

/**
 * Initialize Telegram WebApp view
 */
export function initTelegramWebApp() {
  const webApp = getTelegramWebApp();
  if (!webApp) return;

  try {
    webApp.ready();
    webApp.expand();
    webApp.enableClosingConfirmation();

    if (webApp.setHeaderColor) {
      webApp.setHeaderColor('#0f172a');
    }
  } catch (err) {
    console.warn('[Telegram WebApp] Initialization warning:', err);
  }
}

/**
 * Get Telegram user details from initDataUnsafe
 */
export function getTelegramUser(): TelegramUser | null {
  const webApp = getTelegramWebApp();
  return webApp?.initDataUnsafe?.user || null;
}

/**
 * Get Telegram start_param deep-link string if passed
 */
export function getTelegramStartParam(): string | null {
  const webApp = getTelegramWebApp();
  return webApp?.initDataUnsafe?.start_param || null;
}

/**
 * Trigger haptic vibration feedback for button taps and order actions
 */
export function triggerHaptic(type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'medium') {
  const webApp = getTelegramWebApp();
  if (!webApp?.HapticFeedback) return;

  try {
    if (type === 'success' || type === 'warning' || type === 'error') {
      webApp.HapticFeedback.notificationOccurred(type);
    } else {
      webApp.HapticFeedback.impactOccurred(type);
    }
  } catch {
    // Ignore non-supported devices
  }
}
