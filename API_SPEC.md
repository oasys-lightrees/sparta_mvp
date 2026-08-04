# API_SPEC.md

# LATO API Specification

Backend Framework:
Hono.js

API Style:
REST API

Response Format:
JSON

Authentication:
JWT Bearer Token

---

# General Rules

Protected routes require:

Authorization Header:

Bearer {token}

Response format:

Success:

{
"success": true,
"data": {}
}

Error:

{
"success": false,
"message": "Error message"
}

---

# Authentication API

## Register User

Endpoint:

POST /api/auth/register

Access:

Public

Request:

{
"name": "John Doe",
"email": "[john@email.com](mailto:john@email.com)",
"password": "password123"
}

Process:

* Hash password
* Create user
* Default role USER

Response:

{
"success": true,
"data": {
"id": "uuid",
"email": "[john@email.com](mailto:john@email.com)",
"role": "USER"
}
}

---

# Login

Endpoint:

POST /api/auth/login

Access:

Public

Request:

{
"email": "[john@email.com](mailto:john@email.com)",
"password": "password123"
}

Process:

* Verify email
* Compare hashed password
* Generate JWT

Response:

{
"success": true,

"data": {

```
"token": "jwt-token",

"user": {

  "id": "uuid",

  "email": "john@email.com",

  "role": "USER"

}
```

}

}

---

# Current User

Endpoint:

GET /api/auth/me

Access:

Authenticated

Response:

{
"id":"uuid",
"email":"[john@email.com](mailto:john@email.com)",
"role":"USER"
}

---

# Admin API

# Get All Users

Endpoint:

GET /api/admin/users

Access:

ADMIN

Response:

[
{
"id":"uuid",
"email":"[user@email.com](mailto:user@email.com)",
"role":"USER"
}
]

---

# Change User Role

Endpoint:

PATCH /api/admin/users/:id/role

Access:

ADMIN

Request:

{
"role":"MENTOR"
}

Allowed roles:

USER

MENTOR

ADMIN

Response:

{
"success":true
}

---

# Get Dashboard Statistics

Endpoint:

GET /api/admin/stats

Access:

ADMIN

Response:

{
"totalUsers":100,

"totalAssessments":20,

"totalAttempts":500
}

---

# Assessment API

# Get Published Assessments

Endpoint:

GET /api/assessments

Access:

Public

Response:

[
{
"id":"uuid",

"title":"Leadership Test",

"description":"Test description"
}
]

---

# Get Assessment Detail

Endpoint:

GET /api/assessments/:id

Access:

Public

Response:

{
"id":"uuid",

"title":"Leadership Test",

"questions":[

{

"id":"uuid",

"question":"Question text",

"choices":[

```
{

 "id":"uuid",

 "text":"Answer"

}
```

]

}

]
}

Important:

Do not expose choice score to public users.

---

# Create Assessment

Endpoint:

POST /api/assessments

Access:

MENTOR

Request:

{
"title":"Leadership Test",

"description":"description"
}

Response:

{
"id":"uuid",

"status":"DRAFT"
}

---

# Update Assessment

Endpoint:

PATCH /api/assessments/:id

Access:

MENTOR owner only

Request:

{
"title":"New title",

"description":"new description"
}

---

# Delete Assessment

Endpoint:

DELETE /api/assessments/:id

Access:

MENTOR owner only

---

# Publish Assessment

Endpoint:

PATCH /api/assessments/:id/publish

Access:

MENTOR owner only

Process:

Change status:

DRAFT

↓

PUBLISHED

---

# Question API

# Add Question

Endpoint:

POST /api/assessments/:id/questions

Access:

MENTOR

Request:

{
"question_text":"Your question?",

"choices":[

{
"choice_text":"Answer A",
"score":5
},

{
"choice_text":"Answer B",
"score":0
}

]
}

Process:

* Create question
* Create choices

---

# Submit Assessment

Endpoint:

POST /api/assessments/:id/submit

Access:

Public

Request:

{
"guest_email":"[guest@email.com](mailto:guest@email.com)",

"answers":[

{
"question_id":"uuid",

"choice_id":"uuid"

}

]
}

Process:

1. Retrieve choice scores

2. Calculate total score

3. Generate report

4. Save attempt

Response:

{
"score":80,

"report":{

"type":"FREE",

"content":"Strong result"

}

}

---

# Mentor Dashboard API

# Get My Assessments

Endpoint:

GET /api/mentor/assessments

Access:

MENTOR

Response:

[
{
"id":"uuid",

"title":"Assessment",

"totalAttempts":20,

"status":"PUBLISHED"

}
]

---

# Get Assessment Results

Endpoint:

GET /api/mentor/assessments/:id/results

Access:

MENTOR owner

Response:

[
{
"email":"[guest@email.com](mailto:guest@email.com)",

"score":80,

"created_at":"date"
}
]

---

# MVP Restrictions

Do not implement:

* Payment API
* AI API
* Email API
* Notification API

Implement after core system works.
