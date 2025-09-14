# Family Tree Builder — Complete Project Specification

> Goal: A web application that lets users build family trees (ancestors + descendants + siblings + spouses at any level) with user authentication, and print them as clean posters/PDFs. Data is stored securely on the server with local caching for performance.

---

## 1) Objectives & Success Criteria

**Objectives**

* Multi-user system where each user can create and manage their own family trees
* Add people anywhere in the tree: parents, children, siblings, spouses, aunts/uncles, grandparents, etc.
* Visually arrange the family tree with minimal manual work
* Print/export high‑resolution chart (A4–A1), and export/import raw data (JSON; GEDCOM optional later)
* Server-side storage with local caching for offline editing
* User authentication and data privacy

**Success criteria**

* Multiple users can register and maintain separate family trees
* A non‑technical user (your father/uncle) can add 20–200 people without help
* A full family chart prints to PDF with readable names and relationship lines on one or more pages
* All basic relations are supported with consistency enforced (no impossible links like loops as parents)
* Data syncs between devices for the same user

**Non‑goals (for v1)**

* Photos, media galleries, and documents (can be Phase 3)
* Complex genetics/adoption rules beyond basic notes
* Real-time collaboration (can be Phase 2)

---

## 2) Personas & UX Principles

**Users:**

* *Primary Editor (Father/Uncle):* Wants easy "Add parent/child/sibling/spouse" from any person
* *Family Members:* Can view shared trees (read-only or with limited edit permissions)
* *Secondary Users:* Other family members who may contribute data

**UX principles:**

* Always start from a **focus person** ("root") and grow up/down
* A prominent **+ Add** menu on each card for: Parent / Child / Sibling / Spouse
* Inline, single‑field edits (name first); advanced fields (dates, notes) in a side panel
* Auto-save with visual feedback, manual save/export button
* Urdu/English toggle; Urdu RTL layout support
* Mobile-responsive design for tablet/phone editing

---

## 3) Feature Scope

### MVP (Phase 1)

1. **User Management**
   * User registration and login
   * Password reset functionality
   * Profile management
   * Multiple family trees per user

2. **People & Relations**
   * Create/Edit/Delete person (name mandatory; optional gender, DOB/DOD, notes)
   * Add **Parent/Child/Sibling/Spouse** from any person
   * Auto‑linking: adding a child links back to parent; adding a sibling copies parents
   * Basic integrity checks (max two biological parents; prevent circular ancestry)

3. **Navigation & Layout**
   * Set **Focus (root)** to anyone
   * Collapse/expand generations
   * Pan & zoom canvas; fit‑to‑screen
   * Search family members by name

4. **Storage**
   * Server-side data storage with user isolation
   * Local IndexedDB caching for offline editing
   * Auto-sync when online
   * Import/Export **JSON** (single file)

5. **Printing/Export**
   * Print‑ready view with margins, page break guides, and PDF export
   * Paper sizes: A4, A3, A2, A1; horizontal/vertical
   * High-quality SVG to PDF conversion

6. **Internationalization**
   * English + Urdu labels; Urdu RTL support
   * Locale-specific date formats

7. **Safety**
   * Undo/redo stack; soft‑delete confirmation
   * Data validation and integrity checks

### Phase 2 (Nice‑to‑have)

* **Collaboration:** Share trees with family members (view/edit permissions)
* **Manual layout pins:** drag cards to slightly adjust positions
* **GEDCOM** import/export (read common fields)
* **Multiple trees** per user (paternal/maternal sides)
* **Relationship hints** (auto‑detect aunt/uncle, cousin labels)
* **Advanced search** by relationship, dates, location

### Phase 3 (Polish)

* **Photos/avatars** with cloud storage
* **Timeline badges** (birth/death years under names)
* **Color themes** and **legend** (paternal/maternal branches)
* **Mobile app** (React Native or PWA)
* **Real-time collaboration** with WebSockets

---

## 4) Data Model & Rules

### User
```json
{
  "id": "uuid",
  "name": "John Doe",
  "email": "john@example.com",
  "email_verified_at": "timestamp",
  "password": "hashed",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

### Family Tree
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "name": "Smith Family Tree",
  "description": "Paternal side of the family",
  "root_person_id": "uuid",
  "settings": {
    "focus_person_id": "uuid",
    "collapsed_generations": [],
    "layout_preferences": {}
  },
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

### Person
```json
{
  "id": "uuid",
  "family_tree_id": "uuid",
  "name": "Muhammad Tayyab",
  "gender": "M|F|O",
  "birth_date": "YYYY-MM-DD | null",
  "death_date": "YYYY-MM-DD | null",
  "birth_place": "string | null",
  "death_place": "string | null",
  "notes": "text | null",
  "father_id": "uuid | null",
  "mother_id": "uuid | null",
  "photo_path": "string | null",
  "created_at": "timestamp",
  "updated_at": "timestamp",
  "deleted_at": "timestamp | null"
}
```

### Relationship
```json
{
  "id": "uuid",
  "family_tree_id": "uuid",
  "person1_id": "uuid",
  "person2_id": "uuid",
  "relationship_type": "spouse|partner",
  "start_date": "YYYY-MM-DD | null",
  "end_date": "YYYY-MM-DD | null",
  "notes": "text | null",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

### Constraints

* A person may have up to **two biological parents** (father_id/mother_id)
* Additional guardians recorded via notes for now
* Adding a **sibling** copies the current person's parents
* Adding a **child** sets this person as a parent (father or mother if gender known)
* **Spouse** links are mutual via relationships table
* Deleting a person cleans up back‑references
* All data is isolated by user_id and family_tree_id

---

## 5) Layout Engine (Chart)

**Approach:**

* Use a layered tree layout (Sugiyama‑style):
  * Row 0: **focus person**
  * Rows −1, −2, …: **ancestors** (parents, grandparents)
  * Rows +1, +2, …: **descendants** (children, grandchildren)
* Within each row, order siblings by birth date (if known) or insertion order
* Draw **parent–child** links as orthogonal SVG paths
* **Spouse** shown adjacent with a connecting line; couple shares children row

**Implementation:**

* Custom SVG layout engine for Phase 1
* D3‑hierarchy or ELK integration for Phase 2 if needed
* Responsive design that works on mobile/tablet

---

## 6) Printing & Export

* **Print view** toggles to simplified style (white background, high‑contrast text, suppressed buttons)
* **Vector export** via SVG to PDF (client‑side using svg2pdf.js)
* For very large trees, enable **tiling** across multiple pages
* Page sizes preset: A4/A3/A2/A1 with mm‑accurate scaling
* **Legend** and title block (family name, date, print scale)
* Export formats: PDF, PNG, SVG, JSON data

---

## 7) Internationalization (i18n) & RTL

* Strings in `locales/` folder (`en.json`, `ur.json`)
* HTML `dir="rtl"` toggled for Urdu; auto‑flip layout paddings
* Noto Naskh Urdu webfont served locally (no external CDN)
* Date formatting per locale
* Number formatting (English/Arabic numerals)

---

## 8) Accessibility & Keyboard

* Minimum 16px text; 4.5:1 contrast ratio
* Keyboard navigation: arrows to pan, `+/-` to zoom, `Enter` to edit, `Esc` to close
* Focus rings and screen reader labels for all interactive elements
* Alt text for all images and icons
* Semantic HTML structure

---

## 9) Tech Stack

* **Backend:** Laravel 10+ with PHP 8.1+
* **Frontend:** React 18+ + TypeScript + Vite
* **Database:** MySQL 8.0+ or PostgreSQL 14+
* **State:** Zustand for React state management
* **Storage:** Server DB + IndexedDB for local caching
* **UI:** Tailwind CSS + Headless UI for components
* **Print/PDF:** SVG rendering + svg2pdf.js (client‑side conversion)
* **i18n:** react-i18next
* **API:** Laravel Sanctum for authentication
* **Testing:** PHPUnit + Pest (backend), Vitest + React Testing Library (frontend)
* **Deployment:** Docker containers, nginx, Redis for caching

**Why hybrid storage?** Privacy + performance: sensitive data on server, fast local access for editing.

---

## 10) Security & Privacy

* User authentication required for all operations
* Data isolation: users can only access their own trees
* Input validation and sanitization
* CSRF protection via Laravel Sanctum
* Rate limiting on API endpoints
* Secure file uploads for photos
* Optional tree sharing with unique tokens
* Data export compliance (GDPR-style)

---

## 11) Milestones & Timeline

**Week 1-2: Foundation**
1. Laravel project setup with authentication
2. Database migrations and models
3. Basic API endpoints for users and trees
4. React frontend scaffold with routing

**Week 3-4: Core Features**
5. Person CRUD operations with relationships
6. Basic tree visualization (SVG)
7. Add Parent/Child/Sibling/Spouse functionality
8. Local storage and sync implementation

**Week 5-6: Advanced Features**
9. Print functionality with PDF export
10. Import/Export JSON
11. Search and navigation
12. Internationalization (English/Urdu)

**Week 7-8: Polish & Testing**
13. Undo/redo functionality
14. Mobile responsiveness
15. Performance optimization
16. User acceptance testing
17. Bug fixes and final polish

---

## 12) API Endpoints

### Authentication
- `POST /api/register` - User registration
- `POST /api/login` - User login
- `POST /api/logout` - User logout
- `GET /api/user` - Get current user

### Family Trees
- `GET /api/trees` - List user's trees
- `POST /api/trees` - Create new tree
- `GET /api/trees/{id}` - Get tree details
- `PUT /api/trees/{id}` - Update tree
- `DELETE /api/trees/{id}` - Delete tree

### People
- `GET /api/trees/{tree}/people` - List people in tree
- `POST /api/trees/{tree}/people` - Add person
- `GET /api/people/{id}` - Get person details
- `PUT /api/people/{id}` - Update person
- `DELETE /api/people/{id}` - Delete person

### Relationships
- `POST /api/people/{id}/relationships` - Add relationship
- `PUT /api/relationships/{id}` - Update relationship
- `DELETE /api/relationships/{id}` - Delete relationship

### Export/Import
- `GET /api/trees/{id}/export` - Export tree as JSON
- `POST /api/trees/{id}/import` - Import tree from JSON

---

## 13) User Stories

* As a user, I can **register and login** to access my family trees
* As a user, I can **create multiple family trees** (e.g., paternal/maternal)
* As a user, I can **create a person** with name (required) and optional details
* As a user, from any person, I can **add a parent**; if two parents already exist, app asks to replace or skip
* As a user, from any person, I can **add a child**; gender sets father/mother pointer if known
* As a user, I can **add a sibling** that inherits the same parents
* As a user, I can **add a spouse** (mutual link)
* As a user, I can **set focus** to anyone; ancestors above, descendants below
* As a user, I can **search for people** by name
* As a user, I can **collapse generations** (e.g., hide beyond grandparents)
* As a user, I can **import/export JSON** to backup or transfer data
* As a user, I can **print to PDF** with selectable paper size and orientation
* As a user, I can **toggle English/Urdu** interface
* As a user, I can **undo/redo** changes
* As a user, I can **share my tree** with family members (read-only link)

---

## 14) Validation & Edge Cases

* Prevent cycles: no person can be their own ancestor/descendant
* Deleting a person removes references in spouses/parents/children
* Handle **multiple marriages**; children grouped by couple
* Unknown/partial data allowed: if birth unknown, maintain insertion order
* Concurrent editing: last-write-wins with conflict detection
* Large trees: pagination and lazy loading for performance

---

## 15) Testing Plan

**Unit Tests (Backend)**
- User authentication
- Person/relationship models
- Tree export/import logic
- Validation rules

**Unit Tests (Frontend)**
- React components
- State management
- Tree layout algorithms
- Utility functions

**Integration Tests**
- API endpoints with authentication
- Database relationships
- File upload/download

**E2E Tests**
- User registration and login flow
- Create tree with 50+ people
- Export/import round-trip
- Print PDF generation
- Mobile responsiveness

---

## 16) Performance Considerations

* Database indexing on foreign keys and search fields
* API pagination for large family lists
* Lazy loading of tree nodes
* IndexedDB caching for offline performance
* SVG optimization for large trees
* Image optimization for photos

---

## 17) Deployment Architecture

* **Web Server:** nginx
* **Application:** Laravel (PHP-FPM)
* **Database:** MySQL/PostgreSQL with read replicas
* **Cache:** Redis for sessions and API responses
* **Storage:** Local filesystem or S3 for photos
* **Monitoring:** Application logs and error tracking

---

## 18) Future Extensions

* Real-time collaboration with WebSockets
* GEDCOM import/export
* Photo management with cloud storage
* Relationship calculators (e.g., "2nd cousin once removed")
* Mobile app (React Native)
* Advanced reporting and statistics
* DNA integration (23andMe, AncestryDNA)

---

## 19) Acceptance Checklist (Go/No‑Go)

* [ ] User registration and login works securely
* [ ] Multiple users can maintain separate trees
* [ ] Add Parent/Child/Sibling/Spouse works at any level
* [ ] Search finds people by name instantly
* [ ] Focus switching is responsive; layout stays clean
* [ ] JSON export/import preserves all data
* [ ] Print to A‑series works; output is crisp at 300 DPI
* [ ] Urdu labels render RTL properly and print cleanly
* [ ] Mobile interface is usable on phones/tablets
* [ ] Data syncs between devices for same user
* [ ] Performance is acceptable with 200+ person trees

This specification provides a complete roadmap for building a robust, multi-user family tree application with modern web technologies.