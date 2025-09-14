# Family Tree Builder API Documentation

## Base URL
```
http://localhost:8010/api
```

## Authentication
All API endpoints (except registration and login) require a Bearer token in the Authorization header:
```
Authorization: Bearer {token}
```

## Response Format
All API responses follow this structure:
```json
{
  "data": {}, // or []
  "message": "Success message",
  "status": "success"
}
```

Error responses:
```json
{
  "message": "Error description",
  "errors": {
    "field": ["Validation error message"]
  }
}
```

## Authentication Endpoints

### Register User
```http
POST /auth/register
```

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "password_confirmation": "password123"
}
```

**Response:**
```json
{
  "data": {
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "preferred_language": "en",
      "timezone": "UTC",
      "date_format": "Y-m-d",
      "created_at": "2025-09-13T10:30:00.000000Z",
      "updated_at": "2025-09-13T10:30:00.000000Z"
    },
    "token": "1|eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9..."
  }
}
```

### Login User
```http
POST /auth/login
```

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "data": {
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "preferred_language": "en",
      "timezone": "UTC",
      "date_format": "Y-m-d",
      "created_at": "2025-09-13T10:30:00.000000Z",
      "updated_at": "2025-09-13T10:30:00.000000Z"
    },
    "token": "2|eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9..."
  }
}
```

### Get Current User
```http
GET /auth/user
```

**Response:**
```json
{
  "data": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "preferred_language": "en",
    "timezone": "UTC",
    "date_format": "Y-m-d",
    "created_at": "2025-09-13T10:30:00.000000Z",
    "updated_at": "2025-09-13T10:30:00.000000Z"
  }
}
```

### Logout User
```http
POST /auth/logout
```

**Response:**
```json
{
  "message": "Successfully logged out"
}
```

### Refresh Token
```http
POST /auth/refresh
```

**Response:**
```json
{
  "data": {
    "token": "3|eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9..."
  }
}
```

## Family Tree Endpoints

### List Family Trees
```http
GET /trees
```

**Response:**
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Smith Family Tree",
      "description": "Our family history dating back to 1800s",
      "created_at": "2025-09-13T10:30:00.000000Z",
      "updated_at": "2025-09-13T10:30:00.000000Z",
      "people_count": 15
    }
  ]
}
```

### Create Family Tree
```http
POST /trees
```

**Request Body:**
```json
{
  "name": "Johnson Family Tree",
  "description": "Family history and genealogy"
}
```

**Response:**
```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "name": "Johnson Family Tree",
    "description": "Family history and genealogy",
    "user_id": 1,
    "created_at": "2025-09-13T10:35:00.000000Z",
    "updated_at": "2025-09-13T10:35:00.000000Z"
  }
}
```

### Get Family Tree
```http
GET /trees/{tree_id}
```

**Response:**
```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Smith Family Tree",
    "description": "Our family history dating back to 1800s",
    "user_id": 1,
    "created_at": "2025-09-13T10:30:00.000000Z",
    "updated_at": "2025-09-13T10:30:00.000000Z",
    "people": [
      {
        "id": "person-uuid-1",
        "first_name": "John",
        "last_name": "Smith",
        "gender": "male",
        "birth_date": "1980-05-15",
        "birth_place": "New York, USA"
      }
    ]
  }
}
```

### Update Family Tree
```http
PUT /trees/{tree_id}
```

**Request Body:**
```json
{
  "name": "Updated Tree Name",
  "description": "Updated description"
}
```

### Delete Family Tree
```http
DELETE /trees/{tree_id}
```

**Response:**
```json
{
  "message": "Family tree deleted successfully"
}
```

### Export Family Tree
```http
GET /trees/{tree_id}/export
```

**Response:**
```json
{
  "data": {
    "tree": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Smith Family Tree",
      "description": "Our family history dating back to 1800s"
    },
    "people": [...],
    "relationships": [...],
    "exported_at": "2025-09-13T10:45:00.000000Z"
  }
}
```

### Get Tree Visualization Data
```http
GET /trees/{tree_id}/visualization
```

**Response:**
```json
{
  "data": {
    "nodes": [
      {
        "id": "person-uuid-1",
        "name": "John Smith",
        "gender": "male",
        "birth_year": 1980,
        "generation": 0,
        "x": 100,
        "y": 200
      }
    ],
    "edges": [
      {
        "from": "person-uuid-1",
        "to": "person-uuid-2",
        "relationship": "parent-child"
      }
    ]
  }
}
```

## People Management Endpoints

### List People in Tree
```http
GET /trees/{tree_id}/people
```

**Response:**
```json
{
  "data": [
    {
      "id": "person-uuid-1",
      "first_name": "John",
      "middle_name": "William",
      "last_name": "Smith",
      "maiden_name": null,
      "gender": "male",
      "birth_date": "1980-05-15",
      "birth_place": "New York, USA",
      "death_date": null,
      "death_place": null,
      "is_living": true,
      "occupation": "Engineer",
      "notes": "Family patriarch",
      "created_at": "2025-09-13T10:30:00.000000Z",
      "updated_at": "2025-09-13T10:30:00.000000Z"
    }
  ]
}
```

### Add Person to Tree
```http
POST /trees/{tree_id}/people
```

**Request Body:**
```json
{
  "first_name": "Jane",
  "middle_name": "Elizabeth",
  "last_name": "Smith",
  "maiden_name": "Johnson",
  "gender": "female",
  "birth_date": "1982-03-20",
  "birth_place": "Boston, USA",
  "death_date": null,
  "death_place": null,
  "is_living": true,
  "occupation": "Doctor",
  "notes": "Married to John Smith"
}
```

**Response:**
```json
{
  "data": {
    "id": "person-uuid-2",
    "first_name": "Jane",
    "middle_name": "Elizabeth",
    "last_name": "Smith",
    "maiden_name": "Johnson",
    "gender": "female",
    "birth_date": "1982-03-20",
    "birth_place": "Boston, USA",
    "death_date": null,
    "death_place": null,
    "is_living": true,
    "occupation": "Doctor",
    "notes": "Married to John Smith",
    "family_tree_id": "550e8400-e29b-41d4-a716-446655440000",
    "created_at": "2025-09-13T10:40:00.000000Z",
    "updated_at": "2025-09-13T10:40:00.000000Z"
  }
}
```

### Get Person Details
```http
GET /trees/{tree_id}/people/{person_id}
```

**Response:**
```json
{
  "data": {
    "id": "person-uuid-1",
    "first_name": "John",
    "middle_name": "William",
    "last_name": "Smith",
    "maiden_name": null,
    "gender": "male",
    "birth_date": "1980-05-15",
    "birth_place": "New York, USA",
    "death_date": null,
    "death_place": null,
    "is_living": true,
    "occupation": "Engineer",
    "notes": "Family patriarch",
    "relationships": {
      "parents": [],
      "children": [
        {
          "id": "person-uuid-3",
          "name": "Michael Smith",
          "birth_date": "2010-07-10"
        }
      ],
      "spouses": [
        {
          "id": "person-uuid-2",
          "name": "Jane Smith",
          "birth_date": "1982-03-20"
        }
      ]
    },
    "created_at": "2025-09-13T10:30:00.000000Z",
    "updated_at": "2025-09-13T10:30:00.000000Z"
  }
}
```

### Update Person
```http
PUT /trees/{tree_id}/people/{person_id}
```

**Request Body:**
```json
{
  "first_name": "John",
  "middle_name": "William",
  "last_name": "Smith",
  "occupation": "Senior Engineer",
  "notes": "Updated information"
}
```

### Delete Person
```http
DELETE /trees/{tree_id}/people/{person_id}
```

**Response:**
```json
{
  "message": "Person removed from family tree successfully"
}
```

### Add Child Relationship
```http
POST /trees/{tree_id}/people/{person_id}/add-child
```

**Request Body:**
```json
{
  "child_id": "person-uuid-3"
}
```

**Response:**
```json
{
  "message": "Child relationship added successfully",
  "data": {
    "parent_id": "person-uuid-1",
    "child_id": "person-uuid-3",
    "relationship_type": "parent-child"
  }
}
```

### Add Parent Relationship
```http
POST /trees/{tree_id}/people/{person_id}/add-parent
```

**Request Body:**
```json
{
  "parent_id": "person-uuid-1"
}
```

**Response:**
```json
{
  "message": "Parent relationship added successfully",
  "data": {
    "parent_id": "person-uuid-1",
    "child_id": "person-uuid-2",
    "relationship_type": "parent-child"
  }
}
```

## Error Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 422 | Validation Error |
| 500 | Internal Server Error |

## Validation Rules

### User Registration
- `name`: required, string, max:255
- `email`: required, email, unique:users
- `password`: required, string, min:8, confirmed

### Family Tree
- `name`: required, string, max:255
- `description`: nullable, string, max:1000

### Person
- `first_name`: required, string, max:255
- `middle_name`: nullable, string, max:255
- `last_name`: required, string, max:255
- `maiden_name`: nullable, string, max:255
- `gender`: required, in:male,female,other
- `birth_date`: nullable, date
- `birth_place`: nullable, string, max:255
- `death_date`: nullable, date, after_or_equal:birth_date
- `death_place`: nullable, string, max:255
- `is_living`: boolean
- `occupation`: nullable, string, max:255
- `notes`: nullable, string, max:2000

## Rate Limiting
- Authentication endpoints: 5 requests per minute
- Other endpoints: 60 requests per minute

## CORS
The API supports CORS for the frontend application running on `http://localhost:3002`.