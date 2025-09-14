import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { router } from './router';
import './i18n'; // Initialize i18n

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

function App() {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
    
    // Set initial document direction based on saved language
    const savedLang = localStorage.getItem('i18nextLng') || 'en';
    document.documentElement.dir = savedLang === 'ur' ? 'rtl' : 'ltr';
    document.documentElement.lang = savedLang;
  }, [checkAuth]);

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
        }}
      />
    </QueryClientProvider>
  );
}

export default App;
