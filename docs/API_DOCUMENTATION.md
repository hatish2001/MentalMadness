# MindCheck API Documentation

## Base URL
```
Production: https://api.mindcheck.com
Development: http://localhost:3000/api
```

## Authentication

MindCheck uses magic link authentication. All authenticated endpoints require a Bearer token in the Authorization header.

```
Authorization: Bearer <jwt-token>
```

## Endpoints

### Authentication

#### Request Magic Link
```
POST /auth/login
```

Request Body:
```json
{
  "email": "user@company.com"
}
```

Response:
```json
{
  "message": "If your email is registered, you will receive a login link shortly."
}
```

#### Verify Magic Link
```
POST /auth/verify
```

Request Body:
```json
{
  "token": "magic-link-token"
}
```

Response:
```json
{
  "token": "jwt-token",
  "user": {
    "id": "uuid",
    "email": "user@company.com",
    "firstName": "John",
    "lastName": "Doe",
    "isAdmin": false,
    "company": {
      "id": "uuid",
      "name": "Company Name",
      "tier": "starter"
    }
  }
}
```

### Check-ins

#### Create Check-in
```
POST /checkins
Authorization: Bearer <token>
```

Request Body:
```json
{
  "stress_level": 7,
  "stress_trigger": "workload",
  "previous_helper": "exercise",
  "stress_trigger_details": "Too many deadlines" // optional
}
```

Response:
```json
{
  "id": "uuid",
  "message": "Check-in submitted successfully",
  "intervention": {
    "id": "uuid",
    "name": "5-Minute Breathing Exercise",
    "type": "breathing",
    "content": {},
    "duration": 5
  },
  "flagged": false
}
```

#### Get Check-in History
```
GET /checkins/history?limit=30&offset=0
Authorization: Bearer <token>
```

Response:
```json
{
  "checkins": [
    {
      "id": "uuid",
      "stress_level": 7,
      "stress_trigger": "workload",
      "created_at": "2025-10-27T10:00:00Z",
      "intervention_shown": "Breathing Exercise",
      "intervention_clicked": true
    }
  ],
  "total": 150,
  "stats": {
    "averageStress": "6.5",
    "totalCheckins": 150,
    "daysTracked": 30,
    "currentStreak": 14
  }
}
```

### Interventions

#### Get Interventions
```
GET /interventions?type=breathing&personalized=true
Authorization: Bearer <token>
```

Response:
```json
{
  "interventions": [
    {
      "id": "uuid",
      "name": "Quick Breathing Exercise",
      "type": "breathing",
      "contentType": "interactive",
      "content": {},
      "duration": 5,
      "effectivenessScore": 85
    }
  ]
}
```

#### Submit Intervention Feedback
```
POST /interventions/:id/feedback
Authorization: Bearer <token>
```

Request Body:
```json
{
  "helpful": true,
  "completed": true,
  "checkinId": "uuid" // optional
}
```

### Admin Endpoints (Requires Admin Role)

#### Get Dashboard Data
```
GET /admin/dashboard?period=7
Authorization: Bearer <token>
```

Response:
```json
{
  "companyHealthScore": 75,
  "metrics": {
    "averageStressLevel": 5.2,
    "checkInCompletionRate": 78,
    "totalEmployees": 150,
    "activeEmployees": 117,
    "trend": {
      "direction": "down",
      "change": -0.5
    }
  },
  "dailyTrends": [...],
  "departmentBreakdown": [...],
  "topStressors": [...],
  "alerts": {
    "unreviewed": 3
  }
}
```

#### Get Alerts
```
GET /admin/alerts?status=unresolved&severity=high&limit=50
Authorization: Bearer <token>
```

Response:
```json
{
  "alerts": [
    {
      "id": "uuid",
      "employee": {
        "id": "uuid",
        "name": "John Doe",
        "email": "john@company.com",
        "department": "Engineering"
      },
      "flaggedAt": "2025-10-27T10:00:00Z",
      "reason": "Crisis keywords detected",
      "severity": "high",
      "triggerWords": ["stressed", "overwhelmed"],
      "status": {
        "reviewed": false,
        "resolved": false
      }
    }
  ],
  "total": 12
}
```

#### Update Alert
```
PUT /admin/alerts/:alertId
Authorization: Bearer <token>
```

Request Body:
```json
{
  "action": "Contacted employee and scheduled meeting",
  "notes": "Employee is receiving support",
  "resolved": true
}
```

#### Get Compliance Report
```
GET /admin/compliance-report?startDate=2025-10-01&endDate=2025-10-31
Authorization: Bearer <token>
```

Response:
```json
{
  "report": {
    "period": {
      "start": "2025-10-01",
      "end": "2025-10-31"
    },
    "participation": {
      "activeUsers": 117,
      "totalUsers": 150,
      "participationRate": 78,
      "overallCompletionRate": 65
    },
    "outcomes": {
      "initialAverageStress": 6.8,
      "finalAverageStress": 5.2,
      "stressReductionPercentage": 24,
      "totalCheckIns": 2340
    },
    "safety": {
      "totalAlerts": 12,
      "resolvedAlerts": 10,
      "resolutionRate": 83
    }
  }
}
```

## Error Responses

All errors follow this format:

```json
{
  "error": {
    "message": "Error description",
    "errors": [] // Optional validation errors
  }
}
```

### Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid/expired token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

## Rate Limiting

- General API: 100 requests per 15 minutes
- Auth endpoints: 5 requests per minute
- Rate limit headers included in response:
  - `X-RateLimit-Limit`
  - `X-RateLimit-Remaining`
  - `X-RateLimit-Reset`

## Data Types

### Stress Triggers
- `workload`
- `meetings`
- `team_conflict`
- `unclear_goals`
- `personal`
- `other`

### Intervention Types
- `breathing`
- `meditation`
- `activity`
- `journaling`
- `social`
- `break`

### Alert Severities
- `critical`
- `high`
- `medium`
- `low`

## Webhooks (Enterprise Tier)

Configure webhooks for real-time notifications:

```
POST /admin/webhooks
```

Events:
- `alert.created` - New crisis alert
- `alert.resolved` - Alert resolved
- `checkin.flagged` - Check-in flagged
- `report.generated` - Report ready
