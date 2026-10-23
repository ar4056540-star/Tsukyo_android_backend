/**
 * VYBE Android Native Bridge Interface
 * Connects the React application seamlessly with Android Native capabilities
 * when running inside the VYBE Android APK.
 */

declare global {
  interface Window {
    VybeNativeBridge?: {
      postMessage?: (action: string, payload?: string) => void;
      hapticFeedback?: (type: 'light' | 'medium' | 'heavy' | 'success' | 'error') => void;
      share?: (title: string, text: string, url: string) => void;
      showToast?: (message: string) => void;
      setModalState?: (isOpen: boolean) => void;
      getDeviceInfo?: () => string;
      downloadMedia?: (url: string, filename: string, mimeType: string) => void;
    };
    VybeAndroid?: any;
  }
}

export const isAndroidApp = (): boolean => {
  return typeof window !== 'undefined' && (!!window.VybeNativeBridge || !!window.VybeAndroid || navigator.userAgent.includes('VYBE_Android'));
};

export const triggerHaptic = (type: 'light' | 'medium' | 'heavy' | 'success' | 'error' = 'light') => {
  try {
    if (window.VybeNativeBridge?.hapticFeedback) {
      window.VybeNativeBridge.hapticFeedback(type);
      return;
    }
    // Fallback to Web Vibration API if available
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      switch (type) {
        case 'light':
          navigator.vibrate(10);
          break;
        case 'medium':
          navigator.vibrate(20);
          break;
        case 'heavy':
          navigator.vibrate(40);
          break;
        case 'success':
          navigator.vibrate([15, 30, 15]);
          break;
        case 'error':
          navigator.vibrate([30, 50, 30]);
          break;
      }
    }
  } catch (_) {
    // Ignore unsupported vibrations
  }
};

export const notifyNativeModalState = (isOpen: boolean) => {
  try {
    if (window.VybeNativeBridge?.setModalState) {
      window.VybeNativeBridge.setModalState(isOpen);
    }
  } catch (_) {
    // Ignore
  }
};

export const nativeShare = async (title: string, text: string, url: string): Promise<boolean> => {
  try {
    if (window.VybeNativeBridge?.share) {
      window.VybeNativeBridge.share(title, text, url);
      return true;
    }
    if (navigator.share) {
      await navigator.share({ title, text, url });
      return true;
    }
  } catch (_) {
    // Fallback to clipboard handled in UI
  }
  return false;
};

export const showNativeToast = (message: string) => {
  try {
    if (window.VybeNativeBridge?.showToast) {
      window.VybeNativeBridge.showToast(message);
    }
  } catch (_) {
    // Ignore
  }
};
