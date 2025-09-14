# Internationalization (i18n) Plan

## Overview
The family tree application supports English and Urdu languages with proper RTL (Right-to-Left) layout support for Urdu. This document outlines the complete i18n implementation strategy.

## Supported Languages

### Primary Languages
- **English (en)**: Default language, LTR layout
- **Urdu (ur)**: RTL layout with Arabic numerals support

### Future Considerations
- Arabic (ar)
- Hindi (hi)
- Persian/Farsi (fa)

## Technical Implementation

### Backend (Laravel)

#### Language Configuration
```php
// config/app.php
'locale' => 'en',
'fallback_locale' => 'en',
'available_locales' => ['en', 'ur'],

// config/translatable.php
'locales' => [
    'en' => [
        'name' => 'English',
        'script' => 'Latn',
        'dir' => 'ltr',
        'flag' => '🇺🇸',
    ],
    'ur' => [
        'name' => 'اردو',
        'script' => 'Arab',
        'dir' => 'rtl',
        'flag' => '🇵🇰',
    ],
],
```

#### Middleware for Locale Detection
```php
// app/Http/Middleware/SetLocale.php
class SetLocale
{
    public function handle(Request $request, Closure $next)
    {
        $locale = $this->getLocale($request);
        
        if (in_array($locale, config('app.available_locales'))) {
            App::setLocale($locale);
        }

        return $next($request);
    }

    private function getLocale(Request $request): string
    {
        // 1. Check URL parameter
        if ($request->has('lang')) {
            return $request->get('lang');
        }

        // 2. Check user preference (if authenticated)
        if ($request->user()) {
            return $request->user()->preferred_language ?? 'en';
        }

        // 3. Check Accept-Language header
        $preferredLanguage = $request->getPreferredLanguage(config('app.available_locales'));
        if ($preferredLanguage) {
            return $preferredLanguage;
        }

        // 4. Fall back to default
        return config('app.locale');
    }
}
```

#### Translation Files Structure
```
lang/
├── en/
│   ├── auth.php
│   ├── validation.php
│   ├── pagination.php
│   ├── passwords.php
│   ├── common.php
│   ├── trees.php
│   ├── people.php
│   ├── relationships.php
│   └── errors.php
└── ur/
    ├── auth.php
    ├── validation.php
    ├── pagination.php
    ├── passwords.php
    ├── common.php
    ├── trees.php
    ├── people.php
    ├── relationships.php
    └── errors.php
```

#### Sample Translation Files
```php
// lang/en/common.php
return [
    'actions' => [
        'save' => 'Save',
        'cancel' => 'Cancel',
        'delete' => 'Delete',
        'edit' => 'Edit',
        'create' => 'Create',
        'update' => 'Update',
        'search' => 'Search',
        'export' => 'Export',
        'import' => 'Import',
        'print' => 'Print',
        'share' => 'Share',
    ],
    'status' => [
        'loading' => 'Loading...',
        'saving' => 'Saving...',
        'saved' => 'Saved successfully',
        'error' => 'An error occurred',
        'success' => 'Operation completed successfully',
    ],
    'navigation' => [
        'dashboard' => 'Dashboard',
        'trees' => 'Family Trees',
        'people' => 'People',
        'settings' => 'Settings',
        'profile' => 'Profile',
        'logout' => 'Logout',
    ],
];

// lang/ur/common.php
return [
    'actions' => [
        'save' => 'محفوظ کریں',
        'cancel' => 'منسوخ کریں',
        'delete' => 'ڈیلیٹ کریں',
        'edit' => 'تبدیلی کریں',
        'create' => 'بنائیں',
        'update' => 'اپ ڈیٹ کریں',
        'search' => 'تلاش کریں',
        'export' => 'ایکسپورٹ کریں',
        'import' => 'امپورٹ کریں',
        'print' => 'پرنٹ کریں',
        'share' => 'شیئر کریں',
    ],
    'status' => [
        'loading' => 'لوڈ ہو رہا ہے...',
        'saving' => 'محفوظ ہو رہا ہے...',
        'saved' => 'کامیابی سے محفوظ ہو گیا',
        'error' => 'خرابی ہوئی',
        'success' => 'کامیابی سے مکمل ہوا',
    ],
    'navigation' => [
        'dashboard' => 'ڈیش بورڈ',
        'trees' => 'خاندانی درخت',
        'people' => 'لوگ',
        'settings' => 'ترتیبات',
        'profile' => 'پروفائل',
        'logout' => 'لاگ آؤٹ',
    ],
];

// lang/en/people.php
return [
    'fields' => [
        'first_name' => 'First Name',
        'last_name' => 'Last Name',
        'maiden_name' => 'Maiden Name',
        'nickname' => 'Nickname',
        'gender' => 'Gender',
        'birth_date' => 'Birth Date',
        'death_date' => 'Death Date',
        'birth_place' => 'Birth Place',
        'death_place' => 'Death Place',
        'notes' => 'Notes',
        'photo' => 'Photo',
    ],
    'gender' => [
        'M' => 'Male',
        'F' => 'Female',
        'O' => 'Other',
    ],
    'relationships' => [
        'father' => 'Father',
        'mother' => 'Mother',
        'son' => 'Son',
        'daughter' => 'Daughter',
        'brother' => 'Brother',
        'sister' => 'Sister',
        'husband' => 'Husband',
        'wife' => 'Wife',
        'spouse' => 'Spouse',
    ],
    'actions' => [
        'add_parent' => 'Add Parent',
        'add_child' => 'Add Child',
        'add_sibling' => 'Add Sibling',
        'add_spouse' => 'Add Spouse',
        'view_details' => 'View Details',
        'edit_person' => 'Edit Person',
        'delete_person' => 'Delete Person',
    ],
];

// lang/ur/people.php
return [
    'fields' => [
        'first_name' => 'پہلا نام',
        'last_name' => 'آخری نام',
        'maiden_name' => 'کنواری نام',
        'nickname' => 'پیار کا نام',
        'gender' => 'جنس',
        'birth_date' => 'پیدائش کی تاریخ',
        'death_date' => 'وفات کی تاریخ',
        'birth_place' => 'پیدائش کی جگہ',
        'death_place' => 'وفات کی جگہ',
        'notes' => 'نوٹس',
        'photo' => 'تصویر',
    ],
    'gender' => [
        'M' => 'مرد',
        'F' => 'عورت',
        'O' => 'دیگر',
    ],
    'relationships' => [
        'father' => 'والد',
        'mother' => 'والدہ',
        'son' => 'بیٹا',
        'daughter' => 'بیٹی',
        'brother' => 'بھائی',
        'sister' => 'بہن',
        'husband' => 'شوہر',
        'wife' => 'بیوی',
        'spouse' => 'شریک حیات',
    ],
    'actions' => [
        'add_parent' => 'والدین شامل کریں',
        'add_child' => 'بچہ شامل کریں',
        'add_sibling' => 'بہن بھائی شامل کریں',
        'add_spouse' => 'شریک حیات شامل کریں',
        'view_details' => 'تفصیلات دیکھیں',
        'edit_person' => 'شخص میں تبدیلی کریں',
        'delete_person' => 'شخص کو ڈیلیٹ کریں',
    ],
];
```

### Frontend (React)

#### i18next Configuration
```typescript
// src/i18n/index.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enCommon from './locales/en/common.json';
import enAuth from './locales/en/auth.json';
import enTrees from './locales/en/trees.json';
import enPeople from './locales/en/people.json';

import urCommon from './locales/ur/common.json';
import urAuth from './locales/ur/auth.json';
import urTrees from './locales/ur/trees.json';
import urPeople from './locales/ur/people.json';

const resources = {
  en: {
    common: enCommon,
    auth: enAuth,
    trees: enTrees,
    people: enPeople,
  },
  ur: {
    common: urCommon,
    auth: urAuth,
    trees: urTrees,
    people: urPeople,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'common',
    
    interpolation: {
      escapeValue: false,
    },
    
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
    
    react: {
      useSuspense: false,
    },
  });

export default i18n;
```

#### Translation Hook
```typescript
// hooks/useTranslation.ts
import { useTranslation as useI18nTranslation } from 'react-i18next';
import { useCallback } from 'react';

export const useTranslation = (namespace?: string) => {
  const { t: i18nT, i18n } = useI18nTranslation(namespace);
  
  const t = useCallback((key: string, options?: any) => {
    return i18nT(key, options);
  }, [i18nT]);

  const changeLanguage = useCallback(async (lng: string) => {
    await i18n.changeLanguage(lng);
    
    // Update user preference in backend
    if (auth.user) {
      try {
        await userService.updatePreferences({ preferred_language: lng });
      } catch (error) {
        console.error('Failed to update language preference:', error);
      }
    }
    
    // Update document direction and font
    updateDocumentLanguage(lng);
  }, [i18n]);

  return {
    t,
    changeLanguage,
    currentLanguage: i18n.language,
    isRTL: i18n.dir() === 'rtl',
  };
};

// Update document language attributes
const updateDocumentLanguage = (language: string) => {
  const isRTL = ['ur', 'ar', 'fa'].includes(language);
  
  document.documentElement.lang = language;
  document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
  
  // Update body class for CSS targeting
  document.body.classList.toggle('rtl', isRTL);
  document.body.classList.toggle('ltr', !isRTL);
  
  // Load appropriate font
  if (language === 'ur') {
    loadUrduFont();
  }
};

const loadUrduFont = () => {
  const link = document.createElement('link');
  link.href = '/fonts/noto-naskh-arabic/noto-naskh-arabic.css';
  link.rel = 'stylesheet';
  document.head.appendChild(link);
};
```

#### Language Selector Component
```typescript
// components/LanguageSelector.tsx
interface LanguageSelectorProps {
  className?: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ className }) => {
  const { currentLanguage, changeLanguage } = useTranslation();
  
  const languages = [
    { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
    { code: 'ur', name: 'Urdu', nativeName: 'اردو', flag: '🇵🇰' },
  ];

  return (
    <div className={`relative ${className}`}>
      <Menu>
        <Menu.Button className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900">
          <span>{languages.find(lang => lang.code === currentLanguage)?.flag}</span>
          <span>{languages.find(lang => lang.code === currentLanguage)?.nativeName}</span>
          <ChevronDownIcon className="h-4 w-4" />
        </Menu.Button>
        
        <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          {languages.map((language) => (
            <Menu.Item key={language.code}>
              {({ active }) => (
                <button
                  onClick={() => changeLanguage(language.code)}
                  className={`${
                    active ? 'bg-gray-100' : ''
                  } ${
                    currentLanguage === language.code ? 'font-semibold' : ''
                  } flex w-full items-center px-4 py-2 text-sm text-gray-700`}
                >
                  <span className="mr-2">{language.flag}</span>
                  <div className="text-left">
                    <div>{language.nativeName}</div>
                    <div className="text-xs text-gray-500">{language.name}</div>
                  </div>
                </button>
              )}
            </Menu.Item>
          ))}
        </Menu.Items>
      </Menu>
    </div>
  );
};
```

## RTL Layout Support

### CSS Configuration
```css
/* styles/rtl.css */

/* Base RTL support */
[dir="rtl"] {
  text-align: right;
}

[dir="ltr"] {
  text-align: left;
}

/* Padding and margin adjustments */
[dir="rtl"] .ml-4 { @apply mr-4 ml-0; }
[dir="rtl"] .mr-4 { @apply ml-4 mr-0; }
[dir="rtl"] .pl-4 { @apply pr-4 pl-0; }
[dir="rtl"] .pr-4 { @apply pl-4 pr-0; }

/* Border radius adjustments */
[dir="rtl"] .rounded-l { @apply rounded-r rounded-l-none; }
[dir="rtl"] .rounded-r { @apply rounded-l rounded-r-none; }

/* Transform adjustments for icons */
[dir="rtl"] .transform-flip {
  transform: scaleX(-1);
}

/* Family tree specific RTL adjustments */
[dir="rtl"] .family-tree-node {
  text-align: right;
}

[dir="rtl"] .family-tree-edge {
  /* Flip edge directions for RTL */
}

/* Form field adjustments */
[dir="rtl"] .form-input {
  text-align: right;
}

[dir="rtl"] .form-select {
  background-position: left 0.5rem center;
}

/* Navigation adjustments */
[dir="rtl"] .breadcrumb-separator {
  transform: scaleX(-1);
}
```

### Tailwind RTL Plugin
```javascript
// tailwind-rtl.plugin.js
const plugin = require('tailwindcss/plugin');

module.exports = plugin(function({ addUtilities, addVariant }) {
  // Add RTL/LTR variants
  addVariant('rtl', '[dir="rtl"] &');
  addVariant('ltr', '[dir="ltr"] &');
  
  // Add logical properties
  addUtilities({
    '.ms-auto': {
      'margin-inline-start': 'auto',
    },
    '.me-auto': {
      'margin-inline-end': 'auto',
    },
    '.ps-4': {
      'padding-inline-start': '1rem',
    },
    '.pe-4': {
      'padding-inline-end': '1rem',
    },
  });
});
```

### Family Tree RTL Adjustments
```typescript
// utils/rtlHelpers.ts
export const getFlippedPosition = (x: number, containerWidth: number, isRTL: boolean) => {
  return isRTL ? containerWidth - x : x;
};

export const getTextAnchor = (isRTL: boolean, position: 'start' | 'middle' | 'end' = 'start') => {
  if (position === 'middle') return 'middle';
  if (isRTL) {
    return position === 'start' ? 'end' : 'start';
  }
  return position;
};

export const getFlowDirection = (isRTL: boolean) => {
  return isRTL ? 'row-reverse' : 'row';
};

// components/FamilyTreeChart.tsx adjustments
const renderPersonCard = (person: Person, position: Position) => {
  const { isRTL } = useTranslation();
  const flippedX = getFlippedPosition(position.x, chartWidth, isRTL);
  
  return (
    <g transform={`translate(${flippedX}, ${position.y})`}>
      <text
        x={isRTL ? 110 : 10}
        y="25"
        textAnchor={getTextAnchor(isRTL)}
        className="person-name"
      >
        {person.first_name} {person.last_name}
      </text>
    </g>
  );
};
```

## Date and Number Formatting

### Date Formatting
```typescript
// utils/dateFormatting.ts
import { format, parseISO } from 'date-fns';
import { enUS, ar } from 'date-fns/locale';

const locales = {
  en: enUS,
  ur: ar, // Using Arabic locale for Urdu dates
};

export const formatDate = (dateString: string, language: string = 'en') => {
  if (!dateString) return '';
  
  const date = parseISO(dateString);
  const locale = locales[language as keyof typeof locales] || locales.en;
  
  // Different formats for different languages
  const formats = {
    en: 'MMM dd, yyyy',
    ur: 'dd MMM yyyy',
  };
  
  const formatString = formats[language as keyof typeof formats] || formats.en;
  
  return format(date, formatString, { locale });
};

export const formatDateLong = (dateString: string, language: string = 'en') => {
  if (!dateString) return '';
  
  const date = parseISO(dateString);
  const locale = locales[language as keyof typeof locales] || locales.en;
  
  const formats = {
    en: 'EEEE, MMMM dd, yyyy',
    ur: 'EEEE، dd MMMM yyyy',
  };
  
  const formatString = formats[language as keyof typeof formats] || formats.en;
  
  return format(date, formatString, { locale });
};
```

### Number Formatting
```typescript
// utils/numberFormatting.ts
export const formatNumber = (number: number, language: string = 'en') => {
  const locales = {
    en: 'en-US',
    ur: 'ur-PK',
  };
  
  const locale = locales[language as keyof typeof locales] || locales.en;
  
  return new Intl.NumberFormat(locale).format(number);
};

export const convertNumerals = (text: string, language: string = 'en') => {
  if (language !== 'ur') return text;
  
  const englishNumerals = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  const urduNumerals = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  
  let result = text;
  
  englishNumerals.forEach((englishNum, index) => {
    const regex = new RegExp(englishNum, 'g');
    result = result.replace(regex, urduNumerals[index]);
  });
  
  return result;
};
```

## Font Management

### Urdu Font Loading
```css
/* fonts/noto-naskh-arabic.css */
@font-face {
  font-family: 'Noto Naskh Arabic';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('./noto-naskh-arabic-400.woff2') format('woff2'),
       url('./noto-naskh-arabic-400.woff') format('woff');
}

@font-face {
  font-family: 'Noto Naskh Arabic';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url('./noto-naskh-arabic-700.woff2') format('woff2'),
       url('./noto-naskh-arabic-700.woff') format('woff');
}

/* Apply Urdu font when language is set to Urdu */
[lang="ur"], [lang="ur"] * {
  font-family: 'Noto Naskh Arabic', serif;
}

/* Ensure English text within Urdu content uses English font */
[lang="ur"] .latin-text {
  font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}
```

## Print Localization

### Print Styles for RTL
```css
/* styles/print.css */
@media print {
  [dir="rtl"] .family-tree {
    direction: rtl;
  }
  
  [dir="rtl"] .tree-title {
    text-align: right;
  }
  
  [dir="rtl"] .legend {
    float: left;
  }
  
  [lang="ur"] {
    font-family: 'Noto Naskh Arabic', serif;
    font-size: 12pt;
    line-height: 1.6;
  }
  
  /* Ensure proper font loading for print */
  @page {
    font-family: 'Noto Naskh Arabic', serif;
  }
}
```

## Testing i18n

### Translation Testing
```typescript
// tests/i18n.test.ts
import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../src/i18n';

describe('Internationalization', () => {
  test('displays English text by default', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <LoginPage />
      </I18nextProvider>
    );
    
    expect(screen.getByText('Login')).toBeInTheDocument();
  });
  
  test('displays Urdu text when language is changed', async () => {
    await i18n.changeLanguage('ur');
    
    render(
      <I18nextProvider i18n={i18n}>
        <LoginPage />
      </I18nextProvider>
    );
    
    expect(screen.getByText('لاگ ان')).toBeInTheDocument();
  });
  
  test('applies RTL direction for Urdu', async () => {
    await i18n.changeLanguage('ur');
    
    render(
      <I18nextProvider i18n={i18n}>
        <div data-testid="container">
          <PersonForm />
        </div>
      </I18nextProvider>
    );
    
    const container = screen.getByTestId('container');
    expect(document.documentElement.dir).toBe('rtl');
  });
});
```

## Implementation Checklist

### Backend
- [ ] Configure Laravel localization
- [ ] Create translation files for both languages
- [ ] Implement locale detection middleware
- [ ] Add user language preference storage
- [ ] Test API responses in both languages

### Frontend
- [ ] Setup i18next with React
- [ ] Create translation files structure
- [ ] Implement language switcher component
- [ ] Add RTL CSS support
- [ ] Configure font loading for Urdu
- [ ] Test component rendering in both languages
- [ ] Implement date/number formatting
- [ ] Test print layouts for both languages

### Quality Assurance
- [ ] Translation accuracy review by native speakers
- [ ] RTL layout testing on various screen sizes
- [ ] Print testing for both languages
- [ ] Font rendering testing across browsers
- [ ] Performance testing with font loading
- [ ] Accessibility testing for RTL layouts

This comprehensive i18n plan ensures proper multilingual support with excellent user experience for both English and Urdu users.