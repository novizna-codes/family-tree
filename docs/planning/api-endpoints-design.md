# API Endpoints Design

## Base URL
- Development: `http://localhost:8000/api`
- Production: `https://yourdomain.com/api`

## Authentication
All endpoints except registration and login require authentication using Laravel Sanctum tokens.

### Headers
```
Authorization: Bearer {token}
Content-Type: application/json
Accept: application/json
```

## Response Format

### Success Response
```json
{
  "success": true,
  "data": {}, // Response data
  "message": "Operation completed successfully",
  "meta": {} // Pagination, timestamps, etc.
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "errors": {}, // Validation errors
  "code": "ERROR_CODE"
}
```

## Authentication Endpoints

### Register User
```
POST /api/auth/register
```

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password",
  "password_confirmation": "password",
  "preferred_language": "en" // optional, defaults to 'en'
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "preferred_language": "en",
      "email_verified_at": null,
      "created_at": "2023-01-01T00:00:00.000000Z",
      "updated_at": "2023-01-01T00:00:00.000000Z"
    },
    "token": "1|abcdef123456..."
  },
  "message": "User registered successfully"
}
```

### Login User
```
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "preferred_language": "en"
    },
    "token": "1|abcdef123456..."
  },
  "message": "Login successful"
}
```

### Logout User
```
POST /api/auth/logout
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### Get Current User
```
GET /api/auth/user
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "preferred_language": "en",
    "timezone": "UTC",
    "date_format": "Y-m-d"
  }
}
```

## Family Tree Endpoints

### List User's Trees
```
GET /api/trees
```

**Query Parameters:**
- `page` (integer): Page number for pagination
- `per_page` (integer): Items per page (max 50)
- `search` (string): Search by tree name

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "name": "Smith Family Tree",
      "description": "Paternal side of the family",
      "root_person_id": "123e4567-e89b-12d3-a456-426614174001",
      "people_count": 25,
      "created_at": "2023-01-01T00:00:00.000000Z",
      "updated_at": "2023-01-01T00:00:00.000000Z"
    }
  ],
  "meta": {
    "current_page": 1,
    "total": 1,
    "per_page": 15
  }
}
```

### Create Family Tree
```
POST /api/trees
```

**Request Body:**
```json
{
  "name": "Johnson Family Tree",
  "description": "Maternal side of the family" // optional
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174002",
    "name": "Johnson Family Tree",
    "description": "Maternal side of the family",
    "root_person_id": null,
    "settings": {},
    "created_at": "2023-01-01T00:00:00.000000Z",
    "updated_at": "2023-01-01T00:00:00.000000Z"
  },
  "message": "Family tree created successfully"
}
```

### Get Family Tree
```
GET /api/trees/{tree_id}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Smith Family Tree",
    "description": "Paternal side of the family",
    "root_person_id": "123e4567-e89b-12d3-a456-426614174001",
    "settings": {
      "focus_person_id": "123e4567-e89b-12d3-a456-426614174001",
      "collapsed_generations": []
    },
    "people_count": 25,
    "created_at": "2023-01-01T00:00:00.000000Z",
    "updated_at": "2023-01-01T00:00:00.000000Z"
  }
}
```

### Update Family Tree
```
PUT /api/trees/{tree_id}
```

**Request Body:**
```json
{
  "name": "Updated Tree Name",
  "description": "Updated description",
  "settings": {
    "focus_person_id": "123e4567-e89b-12d3-a456-426614174001",
    "collapsed_generations": [-1, 2]
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Updated Tree Name",
    "description": "Updated description",
    "root_person_id": "123e4567-e89b-12d3-a456-426614174001",
    "settings": {
      "focus_person_id": "123e4567-e89b-12d3-a456-426614174001",
      "collapsed_generations": [-1, 2]
    }
  },
  "message": "Family tree updated successfully"
}
```

### Delete Family Tree
```
DELETE /api/trees/{tree_id}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Family tree deleted successfully"
}
```

## People Endpoints

### List People in Tree
```
GET /api/trees/{tree_id}/people
```

**Query Parameters:**
- `page` (integer): Page number
- `per_page` (integer): Items per page (max 100)
- `search` (string): Search by name
- `generation` (integer): Filter by generation relative to root
- `include_deleted` (boolean): Include soft-deleted people

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174001",
      "first_name": "John",
      "last_name": "Smith",
      "maiden_name": null,
      "nickname": "Johnny",
      "gender": "M",
      "birth_date": "1980-01-01",
      "death_date": null,
      "birth_place": "New York, NY",
      "death_place": null,
      "father_id": "123e4567-e89b-12d3-a456-426614174003",
      "mother_id": "123e4567-e89b-12d3-a456-426614174004",
      "photo_path": "/photos/john-smith.jpg",
      "notes": "Software engineer",
      "created_at": "2023-01-01T00:00:00.000000Z",
      "updated_at": "2023-01-01T00:00:00.000000Z",
      "relationships": [
        {
          "id": "123e4567-e89b-12d3-a456-426614174005",
          "person_id": "123e4567-e89b-12d3-a456-426614174006",
          "relationship_type": "spouse",
          "start_date": "2005-06-15",
          "end_date": null
        }
      ],
      "children": [
        {
          "id": "123e4567-e89b-12d3-a456-426614174007",
          "first_name": "Alice",
          "last_name": "Smith"
        }
      ]
    }
  ],
  "meta": {
    "current_page": 1,
    "total": 25,
    "per_page": 50
  }
}
```

### Create Person
```
POST /api/trees/{tree_id}/people
```

**Request Body:**
```json
{
  "first_name": "Jane",
  "last_name": "Doe",
  "maiden_name": "Johnson", // optional
  "nickname": "Janie", // optional
  "gender": "F", // optional: M, F, O
  "birth_date": "1985-03-15", // optional: YYYY-MM-DD
  "death_date": null, // optional: YYYY-MM-DD
  "birth_place": "Los Angeles, CA", // optional
  "death_place": null, // optional
  "father_id": null, // optional: UUID
  "mother_id": null, // optional: UUID
  "notes": "Teacher at local school", // optional
  "photo": "base64_encoded_image" // optional
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174008",
    "family_tree_id": "123e4567-e89b-12d3-a456-426614174000",
    "first_name": "Jane",
    "last_name": "Doe",
    "maiden_name": "Johnson",
    "nickname": "Janie",
    "gender": "F",
    "birth_date": "1985-03-15",
    "death_date": null,
    "birth_place": "Los Angeles, CA",
    "death_place": null,
    "father_id": null,
    "mother_id": null,
    "photo_path": "/photos/jane-doe.jpg",
    "notes": "Teacher at local school",
    "created_at": "2023-01-01T00:00:00.000000Z",
    "updated_at": "2023-01-01T00:00:00.000000Z"
  },
  "message": "Person created successfully"
}
```

### Get Person Details
```
GET /api/people/{person_id}
```

**Query Parameters:**
- `include` (string): Comma-separated list of relationships to include
  - `children`: Include children
  - `parents`: Include father and mother
  - `spouses`: Include spouse relationships
  - `siblings`: Include siblings

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174001",
    "family_tree_id": "123e4567-e89b-12d3-a456-426614174000",
    "first_name": "John",
    "last_name": "Smith",
    "full_name": "John Smith",
    "gender": "M",
    "birth_date": "1980-01-01",
    "age": 43,
    "is_living": true,
    "father": {
      "id": "123e4567-e89b-12d3-a456-426614174003",
      "first_name": "Robert",
      "last_name": "Smith"
    },
    "mother": {
      "id": "123e4567-e89b-12d3-a456-426614174004",
      "first_name": "Mary",
      "last_name": "Smith"
    },
    "spouses": [
      {
        "id": "123e4567-e89b-12d3-a456-426614174006",
        "first_name": "Sarah",
        "last_name": "Smith",
        "relationship": {
          "type": "spouse",
          "start_date": "2005-06-15",
          "end_date": null
        }
      }
    ],
    "children": [
      {
        "id": "123e4567-e89b-12d3-a456-426614174007",
        "first_name": "Alice",
        "last_name": "Smith",
        "birth_date": "2008-04-20"
      }
    ],
    "siblings": [
      {
        "id": "123e4567-e89b-12d3-a456-426614174009",
        "first_name": "Michael",
        "last_name": "Smith",
        "birth_date": "1982-08-10"
      }
    ]
  }
}
```

### Update Person
```
PUT /api/people/{person_id}
```

**Request Body:** (Same as create, all fields optional)
```json
{
  "first_name": "John",
  "notes": "Updated notes about John"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    // Updated person data
  },
  "message": "Person updated successfully"
}
```

### Delete Person
```
DELETE /api/people/{person_id}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Person deleted successfully"
}
```

## Relationship Endpoints

### Add Relationship
```
POST /api/people/{person_id}/relationships
```

**Request Body:**
```json
{
  "related_person_id": "123e4567-e89b-12d3-a456-426614174006",
  "relationship_type": "spouse", // spouse, partner, divorced, separated
  "start_date": "2005-06-15", // optional
  "end_date": null, // optional
  "marriage_place": "Las Vegas, NV", // optional
  "notes": "Married at Elvis Chapel" // optional
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174010",
    "family_tree_id": "123e4567-e89b-12d3-a456-426614174000",
    "person1_id": "123e4567-e89b-12d3-a456-426614174001",
    "person2_id": "123e4567-e89b-12d3-a456-426614174006",
    "relationship_type": "spouse",
    "start_date": "2005-06-15",
    "end_date": null,
    "marriage_place": "Las Vegas, NV",
    "notes": "Married at Elvis Chapel"
  },
  "message": "Relationship created successfully"
}
```

### Update Relationship
```
PUT /api/relationships/{relationship_id}
```

**Request Body:**
```json
{
  "relationship_type": "divorced",
  "end_date": "2020-12-31"
}
```

### Delete Relationship
```
DELETE /api/relationships/{relationship_id}
```

## Family Relationship Helper Endpoints

### Add Parent
```
POST /api/people/{person_id}/parents
```

**Request Body:**
```json
{
  "parent_type": "father", // father or mother
  "first_name": "Robert",
  "last_name": "Smith",
  "gender": "M",
  "birth_date": "1955-01-01" // optional
}
```

### Add Child
```
POST /api/people/{person_id}/children
```

**Request Body:**
```json
{
  "first_name": "Alice",
  "last_name": "Smith",
  "gender": "F",
  "birth_date": "2008-04-20",
  "other_parent_id": "123e4567-e89b-12d3-a456-426614174006" // optional
}
```

### Add Sibling
```
POST /api/people/{person_id}/siblings
```

**Request Body:**
```json
{
  "first_name": "Michael",
  "last_name": "Smith",
  "gender": "M",
  "birth_date": "1982-08-10"
  // Automatically inherits parents from the person
}
```

### Add Spouse
```
POST /api/people/{person_id}/spouses
```

**Request Body:**
```json
{
  "first_name": "Sarah",
  "last_name": "Johnson",
  "maiden_name": "Johnson",
  "gender": "F",
  "marriage_date": "2005-06-15"
}
```

## Tree Visualization Endpoint

### Get Tree Data
```
GET /api/trees/{tree_id}/visualization
```

**Query Parameters:**
- `focus_person_id` (UUID): Center the tree on this person
- `generations_up` (integer): How many generations above focus (default: 2)
- `generations_down` (integer): How many generations below focus (default: 2)
- `include_spouses` (boolean): Include spouse relationships (default: true)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "focus_person_id": "123e4567-e89b-12d3-a456-426614174001",
    "nodes": [
      {
        "id": "123e4567-e89b-12d3-a456-426614174001",
        "first_name": "John",
        "last_name": "Smith",
        "gender": "M",
        "birth_date": "1980-01-01",
        "death_date": null,
        "photo_path": "/photos/john-smith.jpg",
        "generation": 0,
        "position": {
          "x": 0,
          "y": 0
        }
      }
    ],
    "edges": [
      {
        "id": "edge_1",
        "source": "123e4567-e89b-12d3-a456-426614174003",
        "target": "123e4567-e89b-12d3-a456-426614174001",
        "type": "parent-child",
        "parent_type": "father"
      }
    ],
    "layout": {
      "width": 1200,
      "height": 800,
      "generation_height": 150,
      "node_width": 120,
      "node_height": 80
    }
  }
}
```

## Export/Import Endpoints

### Export Tree
```
GET /api/trees/{tree_id}/export
```

**Query Parameters:**
- `format` (string): `json` or `gedcom` (default: json)
- `include_photos` (boolean): Include base64 encoded photos

**Response (200):**
```json
{
  "success": true,
  "data": {
    "format": "family_tree_json_v1",
    "exported_at": "2023-01-01T00:00:00.000000Z",
    "tree": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "name": "Smith Family Tree",
      "description": "Paternal side of the family"
    },
    "people": [
      // All people data
    ],
    "relationships": [
      // All relationship data
    ]
  }
}
```

### Import Tree
```
POST /api/trees/import
```

**Request Body:**
```json
{
  "name": "Imported Tree Name", // optional, will use exported name if not provided
  "data": {
    // Exported tree data
  },
  "merge_strategy": "create_new" // create_new, merge_existing, replace_existing
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "tree_id": "123e4567-e89b-12d3-a456-426614174011",
    "imported_people": 25,
    "imported_relationships": 15,
    "conflicts": []
  },
  "message": "Tree imported successfully"
}
```

## Search Endpoints

### Global Search
```
GET /api/search
```

**Query Parameters:**
- `q` (string): Search query
- `type` (string): `people`, `trees`, or `all` (default: all)
- `tree_id` (UUID): Limit search to specific tree

**Response (200):**
```json
{
  "success": true,
  "data": {
    "people": [
      {
        "id": "123e4567-e89b-12d3-a456-426614174001",
        "first_name": "John",
        "last_name": "Smith",
        "tree_name": "Smith Family Tree",
        "tree_id": "123e4567-e89b-12d3-a456-426614174000"
      }
    ],
    "trees": [
      {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "name": "Smith Family Tree",
        "description": "Paternal side of the family"
      }
    ]
  }
}
```

## Error Codes

- `AUTH_REQUIRED`: Authentication required
- `UNAUTHORIZED`: Not authorized to access resource
- `VALIDATION_ERROR`: Input validation failed
- `NOT_FOUND`: Resource not found
- `DUPLICATE_RELATIONSHIP`: Relationship already exists
- `CIRCULAR_RELATIONSHIP`: Would create circular family relationship
- `MAX_PARENTS_EXCEEDED`: Person already has maximum number of parents
- `TREE_LIMIT_EXCEEDED`: User has reached maximum number of trees
- `EXPORT_FAILED`: Tree export failed
- `IMPORT_FAILED`: Tree import failed

## Rate Limiting

- Authentication endpoints: 5 requests per minute
- CRUD operations: 60 requests per minute
- Search endpoints: 30 requests per minute
- Export/Import: 10 requests per hour

## Pagination

All list endpoints support pagination:
- `page`: Current page number (default: 1)
- `per_page`: Items per page (default: 15, max: 100)

Response includes `meta` object with pagination info:
```json
{
  "meta": {
    "current_page": 1,
    "last_page": 3,
    "per_page": 15,
    "total": 42,
    "from": 1,
    "to": 15
  }
}
```