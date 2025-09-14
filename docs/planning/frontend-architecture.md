# Frontend Architecture Design

## Overview
React 18+ application with TypeScript, using Vite for build tooling. The architecture follows a component-based structure with clear separation of concerns.

## Project Structure

```
resources/js/
├── app.tsx                     # Main application entry point
├── router.tsx                  # React Router configuration
├── components/                 # Reusable UI components
│   ├── ui/                    # Basic UI components (buttons, inputs, etc.)
│   ├── layout/                # Layout components (header, sidebar, etc.)
│   ├── forms/                 # Form components
│   └── charts/                # Family tree visualization components
├── pages/                     # Page components (routes)
│   ├── auth/                  # Authentication pages
│   ├── dashboard/             # Dashboard page
│   ├── trees/                 # Family tree management pages
│   └── people/                # Person management pages
├── hooks/                     # Custom React hooks
├── services/                  # API service layer
├── store/                     # State management (Zustand)
├── types/                     # TypeScript type definitions
├── utils/                     # Utility functions
├── constants/                 # Application constants
├── locales/                   # Internationalization files
├── assets/                    # Static assets (images, fonts)
└── styles/                    # Global styles and Tailwind config
```

## Technology Stack

### Core
- **React 18+** with TypeScript
- **Vite** for build tooling and development server
- **React Router 6** for client-side routing
- **Tailwind CSS** for styling

### State Management
- **Zustand** for global state management
- **React Query (TanStack Query)** for server state and caching
- **React Hook Form** for form state management

### UI Components
- **Headless UI** for accessible component primitives
- **Heroicons** for iconography
- **React Hot Toast** for notifications

### Visualization
- **D3.js** for SVG-based family tree rendering
- **React-D3-Tree** (optional) for tree layouts
- **html2canvas** + **jsPDF** for PDF generation

### Internationalization
- **react-i18next** for i18n support
- **date-fns** for locale-aware date formatting

### Development
- **ESLint** + **Prettier** for code quality
- **Vitest** for unit testing
- **React Testing Library** for component testing

## Component Architecture

### 1. UI Components (`components/ui/`)

Basic reusable components following design system principles.

```typescript
// components/ui/Button.tsx
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  children,
  onClick,
}) => {
  // Implementation
};
```

### 2. Layout Components (`components/layout/`)

```typescript
// components/layout/AppLayout.tsx
interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <Sidebar />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

// components/layout/Header.tsx
export const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  
  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Logo />
            <Navigation />
          </div>
          <div className="flex items-center space-x-4">
            <LanguageSelector />
            <UserMenu user={user} onLogout={logout} />
          </div>
        </div>
      </div>
    </header>
  );
};
```

### 3. Family Tree Components (`components/charts/`)

```typescript
// components/charts/FamilyTreeChart.tsx
interface FamilyTreeChartProps {
  treeId: string;
  focusPersonId?: string;
  onPersonClick?: (personId: string) => void;
  onAddRelationship?: (personId: string, type: RelationshipType) => void;
}

export const FamilyTreeChart: React.FC<FamilyTreeChartProps> = ({
  treeId,
  focusPersonId,
  onPersonClick,
  onAddRelationship,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const { data: treeData, isLoading } = useTreeVisualization(treeId, focusPersonId);
  
  useEffect(() => {
    if (treeData && svgRef.current) {
      renderFamilyTree(svgRef.current, treeData, {
        onPersonClick,
        onAddRelationship,
      });
    }
  }, [treeData, onPersonClick, onAddRelationship]);

  if (isLoading) {
    return <TreeSkeleton />;
  }

  return (
    <div className="family-tree-container">
      <TreeControls />
      <svg
        ref={svgRef}
        className="family-tree-svg"
        width="100%"
        height="600"
      />
    </div>
  );
};

// components/charts/PersonCard.tsx
interface PersonCardProps {
  person: Person;
  position: { x: number; y: number };
  onEdit?: () => void;
  onAddParent?: () => void;
  onAddChild?: () => void;
  onAddSpouse?: () => void;
  onAddSibling?: () => void;
}

export const PersonCard: React.FC<PersonCardProps> = ({
  person,
  position,
  onEdit,
  onAddParent,
  onAddChild,
  onAddSpouse,
  onAddSibling,
}) => {
  const [showActions, setShowActions] = useState(false);
  const { t } = useTranslation();

  return (
    <g
      transform={`translate(${position.x}, ${position.y})`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <rect
        className="person-card"
        width="120"
        height="80"
        rx="8"
        fill="white"
        stroke="#e5e7eb"
        strokeWidth="1"
      />
      
      {person.photo_path && (
        <image
          href={person.photo_path}
          x="10"
          y="10"
          width="32"
          height="32"
          clipPath="circle(16px)"
        />
      )}
      
      <text x="50" y="25" className="person-name">
        {person.first_name} {person.last_name}
      </text>
      
      {person.birth_date && (
        <text x="50" y="40" className="person-dates">
          {formatDate(person.birth_date)}
        </text>
      )}
      
      {showActions && (
        <ActionMenu
          onEdit={onEdit}
          onAddParent={onAddParent}
          onAddChild={onAddChild}
          onAddSpouse={onAddSpouse}
          onAddSibling={onAddSibling}
        />
      )}
    </g>
  );
};
```

### 4. Form Components (`components/forms/`)

```typescript
// components/forms/PersonForm.tsx
interface PersonFormProps {
  person?: Person;
  onSubmit: (data: PersonFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const PersonForm: React.FC<PersonFormProps> = ({
  person,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<PersonFormData>({
    defaultValues: person ? personToFormData(person) : getDefaultPersonData(),
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
            {t('person.firstName')} *
          </label>
          <input
            {...register('firstName', { required: t('validation.required') })}
            type="text"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          />
          {errors.firstName && (
            <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
          )}
        </div>
        
        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
            {t('person.lastName')}
          </label>
          <input
            {...register('lastName')}
            type="text"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          />
        </div>
      </div>

      <GenderSelector
        value={watch('gender')}
        onChange={(value) => setValue('gender', value)}
        error={errors.gender?.message}
      />

      <DatePicker
        label={t('person.birthDate')}
        value={watch('birthDate')}
        onChange={(value) => setValue('birthDate', value)}
        error={errors.birthDate?.message}
      />

      <PhotoUpload
        value={watch('photo')}
        onChange={(value) => setValue('photo', value)}
        error={errors.photo?.message}
      />

      <div className="flex justify-end space-x-3">
        <Button variant="outline" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" loading={isLoading}>
          {person ? t('common.update') : t('common.create')}
        </Button>
      </div>
    </form>
  );
};
```

## Page Components

### 1. Authentication Pages (`pages/auth/`)

```typescript
// pages/auth/LoginPage.tsx
export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t } = useTranslation();

  const handleLogin = async (data: LoginFormData) => {
    try {
      await login(data);
      navigate('/dashboard');
    } catch (error) {
      toast.error(t('auth.loginFailed'));
    }
  };

  return (
    <AuthLayout>
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">
          {t('auth.login')}
        </h1>
        <LoginForm onSubmit={handleLogin} />
        <div className="mt-6 text-center">
          <Link to="/register" className="text-blue-600 hover:text-blue-500">
            {t('auth.noAccount')}
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
};
```

### 2. Dashboard Page (`pages/dashboard/`)

```typescript
// pages/dashboard/DashboardPage.tsx
export const DashboardPage: React.FC = () => {
  const { data: trees, isLoading } = useUserTrees();
  const { t } = useTranslation();

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {t('dashboard.title')}
          </h1>
          <Button onClick={() => navigate('/trees/new')}>
            {t('trees.create')}
          </Button>
        </div>

        {isLoading ? (
          <TreeGridSkeleton />
        ) : (
          <TreeGrid trees={trees} />
        )}
      </div>
    </AppLayout>
  );
};
```

### 3. Tree Management Pages (`pages/trees/`)

```typescript
// pages/trees/TreeViewPage.tsx
export const TreeViewPage: React.FC = () => {
  const { treeId } = useParams<{ treeId: string }>();
  const { data: tree, isLoading } = useTree(treeId!);
  const [focusPersonId, setFocusPersonId] = useState<string | undefined>();
  const [showPersonForm, setShowPersonForm] = useState(false);

  const handlePersonClick = (personId: string) => {
    setFocusPersonId(personId);
  };

  const handleAddRelationship = (personId: string, type: RelationshipType) => {
    // Open form to add relationship
  };

  if (isLoading) {
    return <TreePageSkeleton />;
  }

  return (
    <AppLayout>
      <div className="h-full flex flex-col">
        <TreeHeader tree={tree} />
        
        <div className="flex-1 flex">
          <div className="flex-1">
            <FamilyTreeChart
              treeId={treeId!}
              focusPersonId={focusPersonId}
              onPersonClick={handlePersonClick}
              onAddRelationship={handleAddRelationship}
            />
          </div>
          
          <TreeSidebar
            tree={tree}
            focusPersonId={focusPersonId}
            onFocusChange={setFocusPersonId}
          />
        </div>
        
        {showPersonForm && (
          <PersonFormModal
            onClose={() => setShowPersonForm(false)}
            onSubmit={(data) => {
              // Handle person creation
            }}
          />
        )}
      </div>
    </AppLayout>
  );
};
```

## State Management

### 1. Zustand Store Structure

```typescript
// store/authStore.ts
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem('auth_token'),
  isAuthenticated: false,
  
  login: async (credentials) => {
    const { user, token } = await authService.login(credentials);
    localStorage.setItem('auth_token', token);
    set({ user, token, isAuthenticated: true });
  },
  
  logout: () => {
    localStorage.removeItem('auth_token');
    set({ user: null, token: null, isAuthenticated: false });
  },
  
  updateUser: (updates) => {
    const currentUser = get().user;
    if (currentUser) {
      set({ user: { ...currentUser, ...updates } });
    }
  },
}));

// store/treeStore.ts
interface TreeState {
  currentTree: FamilyTree | null;
  focusPersonId: string | null;
  selectedPersonId: string | null;
  treeSettings: TreeSettings;
  setCurrentTree: (tree: FamilyTree) => void;
  setFocusPerson: (personId: string) => void;
  setSelectedPerson: (personId: string) => void;
  updateTreeSettings: (settings: Partial<TreeSettings>) => void;
}

export const useTreeStore = create<TreeState>((set) => ({
  currentTree: null,
  focusPersonId: null,
  selectedPersonId: null,
  treeSettings: getDefaultTreeSettings(),
  
  setCurrentTree: (tree) => set({ currentTree: tree }),
  setFocusPerson: (personId) => set({ focusPersonId: personId }),
  setSelectedPerson: (personId) => set({ selectedPersonId: personId }),
  updateTreeSettings: (settings) =>
    set((state) => ({
      treeSettings: { ...state.treeSettings, ...settings },
    })),
}));
```

### 2. React Query Hooks

```typescript
// hooks/useAuth.ts
export const useAuth = () => {
  const authStore = useAuthStore();
  
  return {
    ...authStore,
    isLoading: false, // Add loading state if needed
  };
};

// hooks/useTrees.ts
export const useUserTrees = () => {
  return useQuery({
    queryKey: ['trees'],
    queryFn: () => treeService.getUserTrees(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useTree = (treeId: string) => {
  return useQuery({
    queryKey: ['trees', treeId],
    queryFn: () => treeService.getTree(treeId),
    enabled: !!treeId,
  });
};

export const useTreePeople = (treeId: string) => {
  return useQuery({
    queryKey: ['trees', treeId, 'people'],
    queryFn: () => personService.getTreePeople(treeId),
    enabled: !!treeId,
  });
};

export const useCreatePerson = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: personService.createPerson,
    onSuccess: (newPerson) => {
      // Update the cache
      queryClient.invalidateQueries({ queryKey: ['trees', newPerson.family_tree_id, 'people'] });
      queryClient.invalidateQueries({ queryKey: ['trees', newPerson.family_tree_id, 'visualization'] });
    },
  });
};
```

## Services Layer

```typescript
// services/api.ts
class ApiService {
  private baseURL = import.meta.env.VITE_API_URL || '/api';
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Network error' }));
      throw new Error(error.message || 'Request failed');
    }

    const data = await response.json();
    return data.data || data;
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const apiService = new ApiService();

// services/treeService.ts
export const treeService = {
  getUserTrees: (): Promise<FamilyTree[]> =>
    apiService.get('/trees'),

  getTree: (treeId: string): Promise<FamilyTree> =>
    apiService.get(`/trees/${treeId}`),

  createTree: (data: CreateTreeData): Promise<FamilyTree> =>
    apiService.post('/trees', data),

  updateTree: (treeId: string, data: UpdateTreeData): Promise<FamilyTree> =>
    apiService.put(`/trees/${treeId}`, data),

  deleteTree: (treeId: string): Promise<void> =>
    apiService.delete(`/trees/${treeId}`),

  getTreeVisualization: (treeId: string, focusPersonId?: string): Promise<TreeVisualizationData> =>
    apiService.get(`/trees/${treeId}/visualization${focusPersonId ? `?focus_person_id=${focusPersonId}` : ''}`),

  exportTree: (treeId: string, format: 'json' | 'gedcom' = 'json'): Promise<Blob> =>
    apiService.get(`/trees/${treeId}/export?format=${format}`),

  importTree: (data: ImportTreeData): Promise<{ tree_id: string }> =>
    apiService.post('/trees/import', data),
};
```

## TypeScript Types

```typescript
// types/user.ts
export interface User {
  id: number;
  name: string;
  email: string;
  email_verified_at: string | null;
  preferred_language: 'en' | 'ur';
  timezone: string;
  date_format: string;
  created_at: string;
  updated_at: string;
}

// types/tree.ts
export interface FamilyTree {
  id: string;
  user_id: number;
  name: string;
  description: string | null;
  root_person_id: string | null;
  settings: TreeSettings;
  people_count?: number;
  created_at: string;
  updated_at: string;
}

export interface TreeSettings {
  focus_person_id?: string;
  display: {
    show_birth_dates: boolean;
    show_death_dates: boolean;
    show_marriage_dates: boolean;
    show_photos: boolean;
    theme: string;
  };
  layout: {
    direction: 'vertical' | 'horizontal';
    generation_spacing: number;
    sibling_spacing: number;
    auto_layout: boolean;
  };
  collapsed_generations: number[];
  print: {
    paper_size: 'A4' | 'A3' | 'A2' | 'A1';
    orientation: 'portrait' | 'landscape';
    include_legend: boolean;
  };
}

// types/person.ts
export interface Person {
  id: string;
  family_tree_id: string;
  first_name: string;
  last_name: string | null;
  maiden_name: string | null;
  nickname: string | null;
  gender: 'M' | 'F' | 'O' | null;
  birth_date: string | null;
  death_date: string | null;
  birth_place: string | null;
  death_place: string | null;
  father_id: string | null;
  mother_id: string | null;
  photo_path: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  
  // Computed properties
  full_name?: string;
  age?: number;
  is_living?: boolean;
  
  // Related data (when included)
  father?: Person;
  mother?: Person;
  children?: Person[];
  spouses?: PersonSpouse[];
  siblings?: Person[];
}

export interface PersonSpouse {
  id: string;
  first_name: string;
  last_name: string;
  relationship: {
    id: string;
    type: 'spouse' | 'partner' | 'divorced' | 'separated';
    start_date: string | null;
    end_date: string | null;
  };
}

// types/relationship.ts
export interface Relationship {
  id: string;
  family_tree_id: string;
  person1_id: string;
  person2_id: string;
  relationship_type: 'spouse' | 'partner' | 'divorced' | 'separated';
  start_date: string | null;
  end_date: string | null;
  marriage_place: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// types/forms.ts
export interface PersonFormData {
  firstName: string;
  lastName: string;
  maidenName?: string;
  nickname?: string;
  gender?: 'M' | 'F' | 'O';
  birthDate?: string;
  deathDate?: string;
  birthPlace?: string;
  deathPlace?: string;
  notes?: string;
  photo?: File | string;
}

export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  passwordConfirmation: string;
  preferredLanguage?: 'en' | 'ur';
}
```

## Internationalization Setup

```typescript
// locales/en.json
{
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "create": "Create",
    "update": "Update",
    "loading": "Loading...",
    "search": "Search",
    "export": "Export",
    "import": "Import",
    "print": "Print"
  },
  "auth": {
    "login": "Login",
    "register": "Register",
    "logout": "Logout",
    "email": "Email",
    "password": "Password",
    "confirmPassword": "Confirm Password",
    "name": "Full Name",
    "loginFailed": "Login failed. Please check your credentials.",
    "noAccount": "Don't have an account? Register here"
  },
  "trees": {
    "myTrees": "My Family Trees",
    "create": "Create New Tree",
    "name": "Tree Name",
    "description": "Description",
    "noTrees": "You haven't created any family trees yet."
  },
  "person": {
    "firstName": "First Name",
    "lastName": "Last Name",
    "maidenName": "Maiden Name",
    "nickname": "Nickname",
    "gender": "Gender",
    "birthDate": "Birth Date",
    "deathDate": "Death Date",
    "birthPlace": "Birth Place",
    "deathPlace": "Death Place",
    "notes": "Notes",
    "photo": "Photo",
    "addParent": "Add Parent",
    "addChild": "Add Child",
    "addSibling": "Add Sibling",
    "addSpouse": "Add Spouse"
  },
  "validation": {
    "required": "This field is required",
    "email": "Please enter a valid email address",
    "minLength": "Must be at least {{count}} characters",
    "maxLength": "Must be no more than {{count}} characters"
  }
}

// locales/ur.json (RTL support)
{
  "common": {
    "save": "محفوظ کریں",
    "cancel": "منسوخ کریں",
    "delete": "ڈیلیٹ کریں",
    "edit": "تبدیلی کریں",
    "create": "بنائیں",
    "update": "اپ ڈیٹ کریں",
    "loading": "لوڈ ہو رہا ہے...",
    "search": "تلاش کریں",
    "export": "ایکسپورٹ",
    "import": "امپورٹ",
    "print": "پرنٹ کریں"
  },
  // ... rest of Urdu translations
}
```

This architecture provides a solid foundation for building a scalable, maintainable family tree application with modern React patterns and best practices.