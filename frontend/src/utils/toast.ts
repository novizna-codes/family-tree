import toast from 'react-hot-toast';

// Consistent toast styles for the application
export const showSuccessToast = (message: string, options?: { duration?: number }) => {
  return toast.success(message, {
    duration: options?.duration || 4000,
    style: {
      background: '#10b981',
      color: '#fff',
    },
    iconTheme: {
      primary: '#fff',
      secondary: '#10b981',
    },
  });
};

export const showErrorToast = (message: string, options?: { duration?: number }) => {
  return toast.error(message, {
    duration: options?.duration || 5000,
    style: {
      background: '#ef4444',
      color: '#fff',
    },
    iconTheme: {
      primary: '#fff',
      secondary: '#ef4444',
    },
  });
};

export const showInfoToast = (message: string, options?: { duration?: number }) => {
  return toast(message, {
    duration: options?.duration || 4000,
    style: {
      background: '#3b82f6',
      color: '#fff',
    },
    icon: 'ℹ️',
  });
};

export const showWarningToast = (message: string, options?: { duration?: number }) => {
  return toast(message, {
    duration: options?.duration || 4000,
    style: {
      background: '#f59e0b',
      color: '#fff',
    },
    icon: '⚠️',
  });
};

// Loading toast utility
export const showLoadingToast = (message: string) => {
  return toast.loading(message, {
    style: {
      background: '#6b7280',
      color: '#fff',
    },
  });
};