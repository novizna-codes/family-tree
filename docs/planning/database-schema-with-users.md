# Database Schema Design with User Separation

## Overview
This schema supports multi-user family tree management with complete data isolation between users. Each user can create multiple family trees and manage their relationships independently.

## Core Tables

### 1. Users Table (Laravel Default Enhanced)

```sql
CREATE TABLE users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    email_verified_at TIMESTAMP NULL,
    password VARCHAR(255) NOT NULL,
    remember_token VARCHAR(100) NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    
    -- Additional fields for family tree app
    preferred_language ENUM('en', 'ur') DEFAULT 'en',
    timezone VARCHAR(50) DEFAULT 'UTC',
    date_format VARCHAR(20) DEFAULT 'Y-m-d',
    
    INDEX idx_email (email),
    INDEX idx_created_at (created_at)
);
```

### 2. Family Trees Table

```sql
CREATE TABLE family_trees (
    id CHAR(36) PRIMARY KEY, -- UUID
    user_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    root_person_id CHAR(36) NULL, -- UUID, set after first person is created
    
    -- Tree settings stored as JSON
    settings JSON NULL DEFAULT '{}',
    
    -- Metadata
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    deleted_at TIMESTAMP NULL, -- Soft delete
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at),
    INDEX idx_deleted_at (deleted_at)
);
```

### 3. People Table

```sql
CREATE TABLE people (
    id CHAR(36) PRIMARY KEY, -- UUID
    family_tree_id CHAR(36) NOT NULL,
    
    -- Basic information
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NULL,
    maiden_name VARCHAR(255) NULL,
    nickname VARCHAR(255) NULL,
    
    -- Demographics
    gender ENUM('M', 'F', 'O') NULL, -- Male, Female, Other
    
    -- Dates (stored as DATE for easy querying)
    birth_date DATE NULL,
    death_date DATE NULL,
    
    -- Places (for future expansion)
    birth_place VARCHAR(500) NULL,
    death_place VARCHAR(500) NULL,
    
    -- Relationships (denormalized for performance)
    father_id CHAR(36) NULL,
    mother_id CHAR(36) NULL,
    
    -- Additional information
    notes TEXT NULL,
    photo_path VARCHAR(500) NULL,
    
    -- Metadata
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    deleted_at TIMESTAMP NULL, -- Soft delete
    
    FOREIGN KEY (family_tree_id) REFERENCES family_trees(id) ON DELETE CASCADE,
    FOREIGN KEY (father_id) REFERENCES people(id) ON DELETE SET NULL,
    FOREIGN KEY (mother_id) REFERENCES people(id) ON DELETE SET NULL,
    
    -- Composite indexes for common queries
    INDEX idx_family_tree_id (family_tree_id),
    INDEX idx_father_id (father_id),
    INDEX idx_mother_id (mother_id),
    INDEX idx_name (first_name, last_name),
    INDEX idx_birth_date (birth_date),
    INDEX idx_deleted_at (deleted_at),
    
    -- Full text search index
    FULLTEXT idx_search (first_name, last_name, maiden_name, nickname, notes)
);
```

### 4. Relationships Table

```sql
CREATE TABLE relationships (
    id CHAR(36) PRIMARY KEY, -- UUID
    family_tree_id CHAR(36) NOT NULL,
    
    -- The two people in the relationship
    person1_id CHAR(36) NOT NULL,
    person2_id CHAR(36) NOT NULL,
    
    -- Type of relationship
    relationship_type ENUM('spouse', 'partner', 'divorced', 'separated') NOT NULL,
    
    -- Dates for the relationship
    start_date DATE NULL, -- Marriage/partnership date
    end_date DATE NULL,   -- Divorce/separation date
    
    -- Additional information
    marriage_place VARCHAR(500) NULL,
    notes TEXT NULL,
    
    -- Metadata
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    deleted_at TIMESTAMP NULL, -- Soft delete
    
    FOREIGN KEY (family_tree_id) REFERENCES family_trees(id) ON DELETE CASCADE,
    FOREIGN KEY (person1_id) REFERENCES people(id) ON DELETE CASCADE,
    FOREIGN KEY (person2_id) REFERENCES people(id) ON DELETE CASCADE,
    
    INDEX idx_family_tree_id (family_tree_id),
    INDEX idx_person1_id (person1_id),
    INDEX idx_person2_id (person2_id),
    INDEX idx_relationship_type (relationship_type),
    INDEX idx_deleted_at (deleted_at),
    
    -- Ensure no duplicate relationships
    UNIQUE KEY unique_relationship (person1_id, person2_id, relationship_type, deleted_at)
);
```

### 5. Tree Settings Table (Optional - can be JSON in family_trees)

```sql
CREATE TABLE tree_settings (
    id CHAR(36) PRIMARY KEY, -- UUID
    family_tree_id CHAR(36) NOT NULL UNIQUE,
    
    -- Current view settings
    focus_person_id CHAR(36) NULL,
    zoom_level DECIMAL(3,2) DEFAULT 1.00,
    pan_x INT DEFAULT 0,
    pan_y INT DEFAULT 0,
    
    -- Display preferences
    show_birth_dates BOOLEAN DEFAULT TRUE,
    show_death_dates BOOLEAN DEFAULT TRUE,
    show_marriage_dates BOOLEAN DEFAULT FALSE,
    show_photos BOOLEAN DEFAULT TRUE,
    
    -- Layout preferences
    layout_direction ENUM('vertical', 'horizontal') DEFAULT 'vertical',
    generation_spacing INT DEFAULT 150,
    sibling_spacing INT DEFAULT 100,
    
    -- Collapsed generations (stored as JSON array)
    collapsed_generations JSON NULL DEFAULT '[]',
    
    -- Metadata
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    
    FOREIGN KEY (family_tree_id) REFERENCES family_trees(id) ON DELETE CASCADE,
    FOREIGN KEY (focus_person_id) REFERENCES people(id) ON DELETE SET NULL,
    
    INDEX idx_family_tree_id (family_tree_id)
);
```

### 6. Activity Log Table (for undo/redo)

```sql
CREATE TABLE activity_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    family_tree_id CHAR(36) NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    
    -- Action details
    action_type ENUM('create', 'update', 'delete', 'restore') NOT NULL,
    entity_type ENUM('person', 'relationship', 'tree') NOT NULL,
    entity_id CHAR(36) NOT NULL,
    
    -- Data for undo/redo
    old_data JSON NULL,
    new_data JSON NULL,
    
    -- Metadata
    created_at TIMESTAMP NULL,
    
    FOREIGN KEY (family_tree_id) REFERENCES family_trees(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    INDEX idx_family_tree_id (family_tree_id),
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at),
    INDEX idx_entity (entity_type, entity_id)
);
```

### 7. Shared Trees Table (for sharing functionality)

```sql
CREATE TABLE shared_trees (
    id CHAR(36) PRIMARY KEY, -- UUID
    family_tree_id CHAR(36) NOT NULL,
    shared_by_user_id BIGINT UNSIGNED NOT NULL,
    shared_with_email VARCHAR(255) NULL, -- If sharing with non-user
    shared_with_user_id BIGINT UNSIGNED NULL, -- If sharing with existing user
    
    -- Permissions
    permission_level ENUM('view', 'edit', 'admin') DEFAULT 'view',
    
    -- Share settings
    share_token VARCHAR(100) UNIQUE NULL, -- For public links
    expires_at TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    
    FOREIGN KEY (family_tree_id) REFERENCES family_trees(id) ON DELETE CASCADE,
    FOREIGN KEY (shared_by_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (shared_with_user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    INDEX idx_family_tree_id (family_tree_id),
    INDEX idx_shared_by_user_id (shared_by_user_id),
    INDEX idx_shared_with_user_id (shared_with_user_id),
    INDEX idx_share_token (share_token),
    INDEX idx_expires_at (expires_at)
);
```

## Data Integrity Rules

### Constraints and Triggers

1. **Parent-Child Relationships**
   - A person cannot be their own parent
   - A person cannot have more than 2 biological parents
   - Circular relationships are prevented

2. **Spouse Relationships**
   - Relationships are mutual (if A is spouse of B, then B is spouse of A)
   - A person cannot be in a relationship with themselves

3. **Data Isolation**
   - All operations must include family_tree_id or user_id filtering
   - Users can only access their own trees unless explicitly shared

### Example Constraints (MySQL)

```sql
-- Prevent self-parenting
ALTER TABLE people ADD CONSTRAINT chk_not_own_father 
CHECK (id != father_id);

ALTER TABLE people ADD CONSTRAINT chk_not_own_mother 
CHECK (id != mother_id);

-- Prevent self-relationships
ALTER TABLE relationships ADD CONSTRAINT chk_not_self_relationship 
CHECK (person1_id != person2_id);
```

## Indexes for Performance

### Query Patterns and Indexes

1. **Finding all people in a tree**: `idx_family_tree_id`
2. **Finding children of a person**: `idx_father_id`, `idx_mother_id`
3. **Searching by name**: `idx_name`, `idx_search` (fulltext)
4. **Finding spouses**: `idx_person1_id`, `idx_person2_id`
5. **User's trees**: `idx_user_id`
6. **Soft delete queries**: `idx_deleted_at`

## JSON Schema for Settings

### Family Tree Settings
```json
{
  "focus_person_id": "uuid",
  "display": {
    "show_birth_dates": true,
    "show_death_dates": true,
    "show_marriage_dates": false,
    "show_photos": true,
    "theme": "default"
  },
  "layout": {
    "direction": "vertical",
    "generation_spacing": 150,
    "sibling_spacing": 100,
    "auto_layout": true
  },
  "collapsed_generations": [-2, 3],
  "print": {
    "paper_size": "A4",
    "orientation": "portrait",
    "include_legend": true
  }
}
```

## Migration Order

1. `create_users_table` (Laravel default)
2. `create_family_trees_table`
3. `create_people_table`
4. `create_relationships_table`
5. `create_tree_settings_table`
6. `create_activity_logs_table`
7. `create_shared_trees_table`
8. `add_foreign_key_constraints`
9. `add_indexes`
10. `add_fulltext_indexes`

## Seeder Data

### Demo Family Tree
Create a sample family tree for testing:
- 3 generations
- Multiple marriages
- Siblings with different parents
- Various relationship types

This schema provides a robust foundation for the family tree application with proper user isolation, performance optimization, and extensibility for future features.