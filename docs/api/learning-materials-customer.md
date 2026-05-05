# Learning Materials Customer API

This document describes the customer-facing API endpoints for the Awareness Lab learning materials feature.

## Overview

The Learning Materials Customer API allows authenticated customers to:
- Browse published learning modules
- View module details with progress tracking
- Track their progress through learning materials

## Authentication

All endpoints require a valid customer session. The API validates the session using the existing authentication middleware.

## Endpoints

### GET /api/v1/learning-modules

Retrieves a list of published learning modules available to customers.

**Query Parameters:**
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Number of modules per page (default: 20, max: 50)
- `category` (optional): Filter modules by category

**Response:**
```json
{
  "success": true,
  "data": {
    "modules": [
      {
        "id": "uuid",
        "title": "Module Title",
        "description": "Module description",
        "category": "category-name",
        "orderIndex": 1,
        "isPublished": true,
        "createdAt": "2023-01-01T00:00:00.000Z",
        "updatedAt": "2023-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "hasMore": false
    }
  },
  "message": "Published learning modules retrieved successfully"
}
```

### GET /api/v1/learning-modules/:id

Retrieves a specific learning module with its materials and user progress.

**Parameters:**
- `id`: Module UUID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Module Title",
    "description": "Module description",
    "category": "category-name",
    "materials": [
      {
        "id": "uuid",
        "title": "Material Title",
        "description": "Material description",
        "materialType": "video",
        "materialData": {
          "url": "https://example.com/video",
          "duration": 300
        },
        "orderIndex": 1
      }
    ],
    "userProgress": {
      "moduleId": "uuid",
      "totalMaterials": 5,
      "completedMaterials": 2,
      "completionPercentage": 40,
      "lastAccessed": "2023-01-01T00:00:00.000Z",
      "isModuleCompleted": false
    }
  },
  "message": "Learning module retrieved successfully"
}
```

**Note:** This endpoint automatically tracks module access when called.

### POST /api/v1/learning-modules/:id/progress

Updates progress for a specific material within a module.

**Parameters:**
- `id`: Module UUID

**Request Body:**
```json
{
  "materialId": "uuid",
  "action": "access" | "complete"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "progress-uuid",
    "userId": "user-uuid",
    "moduleId": "module-uuid",
    "materialId": "material-uuid",
    "isCompleted": true,
    "completedAt": "2023-01-01T00:00:00.000Z",
    "lastAccessed": "2023-01-01T00:00:00.000Z"
  },
  "message": "Material marked as completed"
}
```

## Progress Tracking

The API automatically tracks user progress through learning materials:

- **Access Tracking**: When a user views a module or material, the system records the access time
- **Completion Tracking**: Users can mark materials as completed, which updates their progress
- **Progress Calculation**: The system calculates completion percentages based on completed vs. total materials

## Error Handling

All endpoints follow the standard error response format:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "timestamp": "2023-01-01T00:00:00.000Z",
  "requestId": "correlation-id"
}
```

Common error codes:
- `AUTHENTICATION_REQUIRED`: User session is invalid or missing
- `MODULE_NOT_FOUND`: Requested module does not exist
- `MODULE_NOT_PUBLISHED`: Module exists but is not published
- `MATERIAL_NOT_FOUND`: Requested material does not exist
- `INVALID_MODULE_ID`: Module ID format is invalid
- `INVALID_ACTION`: Progress action is not valid

## Implementation Details

The customer API endpoints are implemented in:
- **Routes**: `src/app/(backend)/api/v1/learning-modules/`
- **Controller**: `src/lib/controllers/awareness-lab/learning-materials.controller.ts`
- **Service**: `src/lib/services/awareness-lab/learning.service.ts`
- **Repository**: `src/lib/database/repositories/learning-repository.ts`

The implementation follows the existing application patterns for:
- Authentication and session management
- Error handling and response formatting
- Database transactions and data validation
- Logging and correlation tracking