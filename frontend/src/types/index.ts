// User types
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

// Authentication types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  preferred_language?: 'en' | 'ur';
}

// Family Tree types
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

// Person types
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
  is_living: boolean; // Calculated field based on death_date
  father_id: string | null;
  mother_id: string | null;
  photo_path: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  
  // Calculated attributes
  full_name?: string;
  age?: number;
  
  // Related data
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

// Relationship types
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

// Form types
export interface PersonFormData {
  first_name: string;
  last_name?: string;
  maiden_name?: string;
  nickname?: string;
  gender?: 'M' | 'F' | 'O';
  birth_date?: string;
  death_date?: string;
  birth_place?: string;
  death_place?: string;
  notes?: string;
  photo_path?: string;
  is_deceased?: boolean;
}

export interface TreeFormData {
  name: string;
  description?: string;
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}