// Runtime configuration utility
// This will read from the globally injected ENV object at runtime

interface Config {
  API_URL: string;
  APP_NAME: string;
}

interface WindowWithEnv extends Window {
  ENV?: {
    VITE_API_URL?: string;
    VITE_APP_NAME?: string;
  };
}

const getConfig = (): Config => {
  // Check if we're in build time (Vite) or runtime (browser)
  if (typeof window !== 'undefined' && (window as WindowWithEnv).ENV) {
    // Runtime: use injected config
    const env = (window as WindowWithEnv).ENV!;
    return {
      API_URL: env.VITE_API_URL || 'http://localhost:8000',
      APP_NAME: env.VITE_APP_NAME || 'Family Tree Builder'
    };
  } else {
    // Build time or fallback: use import.meta.env
    return {
      API_URL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
      APP_NAME: import.meta.env.VITE_APP_NAME || 'Family Tree Builder'
    };
  }
};

export const config = getConfig();