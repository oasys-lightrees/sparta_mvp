# ARCHITECTURE.md

# LATO System Architecture

LATO is a full-stack assessment platform.

The architecture goal is:

* Simple
* Maintainable
* Fast MVP development

Avoid unnecessary complexity.

---

# High Level Architecture

User Browser

↓

Next.js Frontend

↓

Hono.js Backend API

↓

PostgreSQL Database

Optional future:

Hono.js

↓

FastAPI AI Service

↓

LLM Provider

---

# Services

## Frontend Application

Location:

frontend/

Stack:

* Next.js App Router
* TypeScript
* Tailwind CSS
* shadcn/ui

Responsibility:

* User interface
* Forms
* Dashboard pages
* API communication
* Client-side interactions

Not responsible for:

* Database access
* Business logic
* Authentication validation

---

# Backend Application

Location:

backend/

Stack:

* Hono.js
* TypeScript
* Drizzle ORM

Responsibility:

* API endpoints
* Authentication
* Authorization
* Business logic
* Database communication

---

# Frontend Structure

frontend/src/

Structure:

app/

Contains:

Pages and routing

Example:

app/

├── page.tsx

├── login/

│   └── page.tsx

├── register/

│   └── page.tsx

├── dashboard/

│   └── page.tsx

└── assessments/

```
└── [id]/

    └── page.tsx
```

---

components/

Contains reusable UI components.

Examples:

components/

├── AssessmentCard.tsx

├── Navbar.tsx

├── DashboardLayout.tsx

└── QuestionForm.tsx

---

services/

Contains API communication functions.

Example:

services/

├── auth.api.ts

├── assessment.api.ts

└── user.api.ts

Example flow:

Component

↓

service function

↓

fetch()

↓

Hono API

---

# Backend Structure

backend/src/

Structure:

src/

├── index.ts

├── routes/

├── services/

├── middleware/

├── db/

└── utils/

---

# Routes Layer

Location:

src/routes/

Purpose:

Handle HTTP communication.

Responsibilities:

* Receive request
* Validate request data
* Call service
* Return response

Example:

auth.routes.ts

assessment.routes.ts

admin.routes.ts

Routes should NOT:

* Query database directly
* Contain complex business logic

---

# Service Layer

Location:

src/services/

Purpose:

Application business logic.

Responsibilities:

* Process data
* Execute rules
* Call database

Examples:

AuthService:

* Hash password
* Verify login

AssessmentService:

* Create assessment
* Calculate result score

UserService:

* Update user roles

---

# Database Layer

Location:

src/db/

Contains:

schema.ts

Database table definitions

client.ts

Database connection

Using:

Drizzle ORM

---

# Middleware Layer

Location:

src/middleware/

Contains:

auth.middleware.ts

Responsibilities:

* Verify JWT token
* Attach user information
* Protect routes

role.middleware.ts

Responsibilities:

* Check permissions

Example:

Only ADMIN can access:

/api/admin

---

# Authentication Flow

Login:

User submits email/password

↓

Next.js sends request

↓

POST /api/auth/login

↓

Hono Auth Route

↓

Auth Service

↓

Check PostgreSQL user

↓

Generate JWT

↓

Return token

↓

Frontend stores token

---

# Assessment Creation Flow

Mentor dashboard

↓

Create assessment form

↓

POST /api/assessments

↓

Assessment route

↓

Assessment service

↓

Insert PostgreSQL record

↓

Return created assessment

---

# Assessment Submission Flow

User selects answers

↓

Submit assessment

↓

POST /api/assessments/:id/submit

↓

Retrieve answer scores

↓

Calculate total score

↓

Generate report text

↓

Save attempt

↓

Return report

---

# Authorization Rules

USER:

Can:

* Take assessment
* View own data

MENTOR:

Can:

* Manage own assessments

ADMIN:

Can:

* Manage users
* Change roles

---

# Error Handling

Use simple JSON responses.

Example:

{
"success":false,
"message":"Assessment not found"
}

Use HTTP status codes:

400 Bad Request

401 Unauthorized

403 Forbidden

404 Not Found

500 Server Error

---

# Deployment Architecture

Docker Compose:

containers:

frontend

↓

Next.js

backend

↓

Hono.js

database

↓

PostgreSQL

---

# Environment Variables

Frontend:

NEXT_PUBLIC_API_URL

Backend:

DATABASE_URL

JWT_SECRET

Database:

POSTGRES_USER

POSTGRES_PASSWORD

POSTGRES_DB

---

# Future Architecture Extensions

Only after MVP completion:

FastAPI AI Service

Purpose:

Generate AI assessment reports

Redis

Purpose:

Background processing/cache

Queue System

Purpose:

Long-running AI jobs

Do not implement these during MVP phase.

---

# Final Principle

Every feature should follow:

Frontend Component

↓

API Service

↓

Hono Route

↓

Business Service

↓

Database

Keep this flow consistent.
