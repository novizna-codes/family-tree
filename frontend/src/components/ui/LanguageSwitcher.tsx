import { useTranslation } from 'react-i18next';
import { LanguageIcon } from '@heroicons/react/24/outline';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'ur' : 'en';
    i18n.changeLanguage(newLang);
    
    // Update document direction for RTL support
    document.documentElement.dir = newLang === 'ur' ? 'rtl' : 'ltr';
    document.documentElement.lang = newLang;
  };

  return (
    <button
      onClick={toggleLanguage}
      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      title={i18n.language === 'en' ? 'Switch to Urdu' : 'انگریزی میں تبدیل کریں'}
    >
      <LanguageIcon className="h-4 w-4 mr-2" />
      <span className="font-medium">
        {i18n.language === 'en' ? 'اردو' : 'EN'}
      </span>
    </button>
  );
}