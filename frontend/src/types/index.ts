// User types
export interface Role {
  id: number;
  name: string;
  guard_name: string;
  created_at: string;
  updated_at: string;
}

export interface Permission {
  id: number;
  name: string;
  guard_name: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  email_verified_at: string | null;
  roles: Role[];
  permissions?: Permission[];
  preferred_language: 'en' | 'ur';
  timezone: string;
  date_format: string;
  created_at: string;
  updated_at: string;
}

// Helper function to check if user has a role
export function userHasRole(user: User | null, roleName: string): boolean {
  return user?.roles?.some(role => role.name === roleName) ?? false;
}

// Helper function to check if user is admin
export function isAdmin(user: User | null): boolean {
  return userHasRole(user, 'admin');
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
    paper_size: 'A4' | 'A3' | 'A2' | 'A1' | 'A0';
    orientation: 'portrait' | 'landscape';
    include_legend: boolean;
    export_mode?: 'vector_pdf' | 'raster_pdf' | 'svg';
    bleed_mm?: number;
    safe_margin_mm?: number;
    crop_marks?: boolean;
    tiled?: boolean;
    tile_overlap_mm?: number;
    scale?: number;
  };
}

export interface TreeExportArtifactMetadata {
  paper_size?: string;
  orientation?: string;
  dimensions_mm?: {
    width: number;
    height: number;
  };
  bleed_mm?: number;
  safe_margin_mm?: number;
  crop_marks?: boolean;
  export_mode?: string;
  tiled?: boolean;
  tile_overlap_mm?: number;
  scale?: number;
  include_legend?: boolean;
}

export interface TreeExportArtifact {
  id: string;
  tree_id: string;
  user_id: number;
  file_name: string;
  file_path: string;
  mime_type: string;
  file_size_bytes: number;
  checksum_sha256: string | null;
  metadata: TreeExportArtifactMetadata | null;
  created_at: string;
  updated_at: string;
}

// Person types
export interface Person {
  id: string;
  family_tree_id: string | null;
  owner_user_id?: number | null;
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
  deleted_at?: string | null;
}

export interface VisualizationPerson extends Omit<Person, 'children' | 'spouses'> {
  children: VisualizationPerson[];
  spouses: VisualizationPerson[];
}

export interface PersonSpouse {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  is_deleted?: boolean;
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

export interface CopyPersonResponse {
  data: Person;
  meta: {
    copied_person_ids: string[];
    skipped_person_ids: string[];
    copied_count: number;
    created_tree_id?: string;
    created_tree_name?: string;
  };
  message?: string;
}

export interface CopyPersonRequest {
  include_descendants?: boolean;
  target_parent_id?: string;
  target_parent_role?: 'father' | 'mother';
  copy_mode?: 'clone' | 'reuse';
  create_target_tree?: boolean;
  target_tree_name?: string;
  target_tree_description?: string;
}

export interface MergePeoplePayload {
  keep_person_id: string;
  merge_person_ids: string[];
}

export interface MergePeoplePreviewPayload extends MergePeoplePayload {
  tree_id?: string;
}

export interface SearchPeopleOptions {
  treeId?: string;
  mergeableOnly?: boolean;
}

export interface MergePeopleResult {
  kept_person_id: string;
  merged_person_ids: string[];
}

export interface MergePeoplePreview {
  merge_people_count: number;
  legacy_parent_links_count: number;
  legacy_relationship_rows_count: number;
  tree_memberships_count: number;
  tree_edges_count: number;
  tree_root_refs_count: number;
  impacted_tree_ids?: string[];
  impacted_tree_count?: number;
  impacted_relationship_tree_count?: number;
  impacted_legacy_tree_count?: number;
  impacted_membership_tree_count?: number;
  impacted_edge_tree_count?: number;
  impacted_root_tree_count?: number;
  has_cross_tree_impact?: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface PaginationLink {
  url: string | null;
  label: string;
  active: boolean;
}

export interface PaginationMeta {
  current_page: number;
  from: number | null;
  last_page: number;
  links: PaginationLink[];
  path: string;
  per_page: number;
  to: number | null;
  total: number;
}

export interface PaginatedApiResponse<T> {
  data: T[];
  links: {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
  };
  meta: PaginationMeta;
}

// Admin types
export interface SystemSetting {
  id: number;
  key: string;
  value: string;
  type: 'string' | 'boolean' | 'integer' | 'float' | 'json';
  description: string;
  created_at: string;
  updated_at: string;
}

export interface AdminDashboardStats {
  total_users: number;
  total_admins: number;
  total_trees: number;
  total_persons: number;
  users_last_month: number;
  trees_last_month: number;
}

export interface AdminDashboardData {
  stats: AdminDashboardStats;
  recent_users: User[];
  recent_trees: FamilyTree[];
  user_registrations: Array<{
    date: string;
    count: number;
  }>;
}

export interface UserFormData {
  name: string;
  email: string;
  password?: string;
  role: string;
  preferred_language?: 'en' | 'ur';
  timezone?: string;
  date_format?: string;
}
