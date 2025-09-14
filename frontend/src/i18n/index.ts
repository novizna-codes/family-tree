import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// English translations
const en = {
  common: {
    name: 'Name',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    login: 'Login',
    register: 'Register',
    logout: 'Logout',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    close: 'Close',
    add: 'Add',
    back: 'Back',
    next: 'Next',
    previous: 'Previous',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    male: 'Male',
    female: 'Female',
    other: 'Other',
    living: 'Living',
    deceased: 'Deceased',
    born: 'Born',
    died: 'Died',
    occupation: 'Occupation',
    notes: 'Notes',
    birthDate: 'Birth Date',
    birthPlace: 'Birth Place',
    deathDate: 'Death Date',
    deathPlace: 'Death Place'
  },
  nav: {
    dashboard: 'Dashboard',
    familyTrees: 'Family Trees',
    profile: 'Profile',
    settings: 'Settings'
  },
  auth: {
    loginTitle: 'Sign in to your account',
    registerTitle: 'Create your account',
    loginDescription: 'Welcome back! Please sign in to continue.',
    registerDescription: 'Join us to start building your family tree.',
    forgotPassword: 'Forgot your password?',
    noAccount: "Don't have an account?",
    hasAccount: 'Already have an account?',
    signUp: 'Sign up',
    signIn: 'Sign in',
    loginSuccess: 'Successfully logged in!',
    registerSuccess: 'Account created successfully!',
    logoutSuccess: 'Successfully logged out!'
  },
  dashboard: {
    title: 'Family Trees',
    subtitle: 'Manage and explore your family history',
    createTree: 'Create New Tree',
    noTrees: 'No family trees yet',
    getStarted: 'Get started by creating your first family tree.',
    peopleCount: '{{count}} people',
    createdOn: 'Created on {{date}}'
  },
  tree: {
    name: 'Tree Name',
    description: 'Description',
    createTitle: 'Create New Family Tree',
    editTitle: 'Edit Family Tree',
    deleteConfirm: 'Are you sure you want to delete this family tree?',
    addPerson: 'Add Person',
    addFirstPerson: 'Add First Person',
    noMembers: 'No family members yet',
    startBuilding: 'Start building your family tree by adding the first person.',
    listView: 'List View',
    treeView: 'Tree View',
    printExport: 'Print / Export',
    relationships: 'Relationships',
    backToDashboard: 'Back to Dashboard',
    familyMembers: 'Family Members ({{count}})',
    treeNotFound: 'Tree not found',
    treeNotFoundDesc: "The family tree you're looking for doesn't exist."
  },
  person: {
    firstName: 'First Name',
    middleName: 'Middle Name',
    lastName: 'Last Name',
    maidenName: 'Maiden Name',
    gender: 'Gender',
    fullName: 'Full Name',
    status: 'Status',
    addPerson: 'Add New Person',
    editPerson: 'Edit Person',
    personDetails: 'Person Details',
    personalInfo: 'Personal Information',
    birthInfo: 'Birth Information',
    deathInfo: 'Death Information',
    additionalInfo: 'Additional Information'
  },
  relationships: {
    title: 'Manage Relationships',
    addParent: 'Add Parent',
    addChild: 'Add Child',
    addSpouse: 'Add Spouse',
    selectPerson: 'Select {{type}}:',
    choosePerson: 'Choose a person...',
    currentRelationships: 'Current Relationships:',
    noRelationships: 'No relationships yet',
    father: 'Father',
    mother: 'Mother',
    children: 'Children',
    spouses: 'Spouses',
    comingSoon: 'Spouse relationships coming soon!',
    spouseDescription: 'This feature will allow you to link spouses and manage marriage information.',
    addSuccess: 'Relationship added successfully!',
    addError: 'Failed to add relationship'
  },
  print: {
    title: 'Print & Export Options',
    paperFormat: 'Paper Format',
    orientation: 'Orientation',
    fontSize: 'Font Size',
    includeOptions: 'Include in Export',
    detailedInfo: 'Detailed person information',
    photos: 'Photos (when available)',
    personalNotes: 'Personal notes',
    exportPreview: 'Export Preview',
    format: 'Format',
    includes: 'Includes',
    treeOnly: 'Tree visualization only',
    print: 'Print',
    downloadPDF: 'Download PDF',
    generating: 'Generating...',
    portrait: 'Portrait',
    landscape: 'Landscape',
    small: 'Small',
    medium: 'Medium',
    large: 'Large'
  }
};

// Urdu translations
const ur = {
  common: {
    name: 'نام',
    email: 'ای میل',
    password: 'پاس ورڈ',
    confirmPassword: 'پاس ورڈ تصدیق',
    login: 'لاگ ان',
    register: 'رجسٹر',
    logout: 'لاگ آؤٹ',
    save: 'محفوظ کریں',
    cancel: 'منسوخ',
    delete: 'حذف کریں',
    edit: 'ترمیم',
    close: 'بند کریں',
    add: 'شامل کریں',
    back: 'واپس',
    next: 'اگلا',
    previous: 'پچھلا',
    loading: 'لوڈ ہو رہا ہے...',
    error: 'خرابی',
    success: 'کامیابی',
    male: 'مرد',
    female: 'عورت',
    other: 'دیگر',
    living: 'زندہ',
    deceased: 'فوت شدہ',
    born: 'پیدائش',
    died: 'وفات',
    occupation: 'پیشہ',
    notes: 'نوٹس',
    birthDate: 'تاریخ پیدائش',
    birthPlace: 'جائے پیدائش',
    deathDate: 'تاریخ وفات',
    deathPlace: 'جائے وفات'
  },
  nav: {
    dashboard: 'ڈیش بورڈ',
    familyTrees: 'خاندانی شجرہ',
    profile: 'پروفائل',
    settings: 'سیٹنگز'
  },
  auth: {
    loginTitle: 'اپنے اکاؤنٹ میں سائن ان کریں',
    registerTitle: 'اپنا اکاؤنٹ بنائیں',
    loginDescription: 'خوش آمدید! جاری رکھنے کے لیے سائن ان کریں۔',
    registerDescription: 'اپنا خاندانی شجرہ بنانا شروع کرنے کے لیے ہمارے ساتھ شامل ہوں۔',
    forgotPassword: 'اپنا پاس ورڈ بھول گئے؟',
    noAccount: 'اکاؤنٹ نہیں ہے؟',
    hasAccount: 'پہلے سے اکاؤنٹ ہے؟',
    signUp: 'سائن اپ',
    signIn: 'سائن ان',
    loginSuccess: 'کامیابی سے لاگ ان ہو گئے!',
    registerSuccess: 'اکاؤنٹ کامیابی سے بن گیا!',
    logoutSuccess: 'کامیابی سے لاگ آؤٹ ہو گئے!'
  },
  dashboard: {
    title: 'خاندانی شجرے',
    subtitle: 'اپنی خاندانی تاریخ کا انتظام اور جائزہ لیں',
    createTree: 'نیا شجرہ بنائیں',
    noTrees: 'ابھی تک کوئی خاندانی شجرہ نہیں',
    getStarted: 'اپنا پہلا خاندانی شجرہ بنا کر شروعات کریں۔',
    peopleCount: '{{count}} افراد',
    createdOn: '{{date}} کو بنایا گیا'
  },
  tree: {
    name: 'شجرہ کا نام',
    description: 'تفصیل',
    createTitle: 'نیا خاندانی شجرہ بنائیں',
    editTitle: 'خاندانی شجرہ میں ترمیم',
    deleteConfirm: 'کیا آپ واقعی اس خاندانی شجرے کو حذف کرنا چاہتے ہیں؟',
    addPerson: 'فرد شامل کریں',
    addFirstPerson: 'پہلا فرد شامل کریں',
    noMembers: 'ابھی تک کوئی خاندانی ممبر نہیں',
    startBuilding: 'پہلا فرد شامل کر کے اپنا خاندانی شجرہ بنانا شروع کریں۔',
    listView: 'فہرست منظر',
    treeView: 'شجرہ منظر',
    printExport: 'پرنٹ / ایکسپورٹ',
    relationships: 'رشتے',
    backToDashboard: 'ڈیش بورڈ پر واپس',
    familyMembers: 'خاندانی ممبران ({{count}})',
    treeNotFound: 'شجرہ نہیں ملا',
    treeNotFoundDesc: 'جو خاندانی شجرہ آپ تلاش کر رہے ہیں وہ موجود نہیں۔'
  },
  person: {
    firstName: 'پہلا نام',
    middleName: 'درمیانی نام',
    lastName: 'آخری نام',
    maidenName: 'کنواری نام',
    gender: 'جنس',
    fullName: 'مکمل نام',
    status: 'حالت',
    addPerson: 'نیا فرد شامل کریں',
    editPerson: 'فرد میں ترمیم',
    personDetails: 'فرد کی تفصیلات',
    personalInfo: 'ذاتی معلومات',
    birthInfo: 'پیدائش کی معلومات',
    deathInfo: 'وفات کی معلومات',
    additionalInfo: 'اضافی معلومات'
  },
  relationships: {
    title: 'رشتوں کا انتظام',
    addParent: 'والدین شامل کریں',
    addChild: 'بچہ شامل کریں',
    addSpouse: 'شریک حیات شامل کریں',
    selectPerson: '{{type}} منتخب کریں:',
    choosePerson: 'ایک شخص کا انتخاب کریں...',
    currentRelationships: 'موجودہ رشتے:',
    noRelationships: 'ابھی تک کوئی رشتہ نہیں',
    father: 'والد',
    mother: 'والدہ',
    children: 'بچے',
    spouses: 'شریک حیات',
    comingSoon: 'شریک حیات کے رشتے جلد آرہے ہیں!',
    spouseDescription: 'یہ فیچر آپ کو شریک حیات کو جوڑنے اور شادی کی معلومات کا انتظام کرنے کی اجازت دے گا۔',
    addSuccess: 'رشتہ کامیابی سے شامل ہو گیا!',
    addError: 'رشتہ شامل کرنے میں ناکامی'
  },
  print: {
    title: 'پرنٹ اور ایکسپورٹ آپشنز',
    paperFormat: 'کاغذ کا فارمیٹ',
    orientation: 'سمت',
    fontSize: 'فونٹ سائز',
    includeOptions: 'ایکسپورٹ میں شامل کریں',
    detailedInfo: 'تفصیلی شخصی معلومات',
    photos: 'تصاویر (جب دستیاب ہوں)',
    personalNotes: 'ذاتی نوٹس',
    exportPreview: 'ایکسپورٹ پیش منظر',
    format: 'فارمیٹ',
    includes: 'شامل',
    treeOnly: 'صرف شجرہ منظر',
    print: 'پرنٹ',
    downloadPDF: 'PDF ڈاؤن لوڈ',
    generating: 'تیار ہو رہا ہے...',
    portrait: 'کھڑا',
    landscape: 'لیٹا',
    small: 'چھوٹا',
    medium: 'درمیانہ',
    large: 'بڑا'
  }
};

const resources = {
  en: { translation: en },
  ur: { translation: ur }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    debug: false,
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage']
    }
  });

export default i18n;