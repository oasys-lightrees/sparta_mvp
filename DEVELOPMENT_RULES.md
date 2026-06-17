# DEVELOPMENT_RULES.md

# SPARTA Development Rules

These rules must be followed during development.

The main priority is building a working MVP within 5 days.

---

# Core Philosophy

Build simple, maintainable, production-like code.

Priorities:

1. Working feature
2. Clear code structure
3. Easy debugging
4. Fast iteration

Avoid premature optimization.

---

# AI Coding Assistant Rules

When generating code:

DO:

* Follow the existing project architecture
* Modify only files related to the requested feature
* Keep solutions simple
* Explain major architectural changes before applying them
* Reuse existing utilities/services/components
* Maintain consistent naming conventions

DO NOT:

* Rewrite the entire project
* Add unnecessary abstractions
* Add new libraries without approval
* Change folder structure without approval
* Implement features that were not requested
* Create complex enterprise patterns
* Add premature optimization

---

# Architecture Rules

The application follows a simple layered architecture.

Frontend:

Next.js
→ Components
→ API Services
→ Backend API

Backend:

Routes
→ Services
→ Database

Example:

Request:

User clicks button

Flow:

Next.js Component

↓

Frontend API function

↓

Hono Route

↓

Service Function

↓

Drizzle Query

↓

PostgreSQL

---

# Backend Rules

Framework:

Hono.js + TypeScript

Folder responsibility:

routes/

Purpose:

Handle HTTP communication only.

Allowed:

* Request validation
* Calling services
* Returning responses

Not allowed:

* Database queries
* Business logic

Example:

GOOD:

route receives request

calls:

assessmentService.create()

BAD:

route directly inserts database records

---

services/

Purpose:

Contain business logic.

Allowed:

* Validation logic
* Calculations
* Calling database layer

Examples:

* Calculate assessment score
* Check permissions
* Process submissions

---

db/

Purpose:

Database communication.

Contains:

* Drizzle schema
* Database connection

---

# Authentication Rules

Authentication uses:

* Email
* Password
* JWT

Password:

Must always be hashed.

Never store plain text passwords.

Authorization:

Use role checking:

USER

MENTOR

ADMIN

---

# Frontend Rules

Framework:

Next.js App Router

Use:

* Functional components
* TypeScript
* Tailwind CSS

Prefer:

Small reusable components.

Example:

components/

Button.tsx

AssessmentCard.tsx

DashboardLayout.tsx

Avoid:

Huge page.tsx files containing everything.

---

# State Management Rules

For MVP:

Use:

* useState
* useEffect
* props

Do NOT add:

* Redux
* Zustand
* Complex global state

Unless absolutely required.

---

# Styling Rules

Use:

* Tailwind CSS
* shadcn/ui

Do not create complex custom CSS.

Prioritize:

* Usability
* Clean layout
* Speed

---

# Database Rules

Database:

PostgreSQL

ORM:

Drizzle

Rules:

* Keep schema simple
* Use relationships properly
* Avoid unnecessary tables

Use migrations.

Do not manually edit production database.

---

# Error Handling Rules

MVP error handling:

Required:

* Clear error messages
* Proper HTTP status codes

Examples:

400:
Invalid request

401:
Not authenticated

403:
Permission denied

404:
Not found

500:
Unexpected server error

Avoid:

Complex custom exception hierarchy.

---

# API Rules

Follow REST style.

Examples:

Authentication:

POST /auth/register

POST /auth/login

Assessments:

GET /assessments

POST /assessments

PATCH /assessments/:id

DELETE /assessments/:id

---

# Git Rules

Commit after every working feature.

Examples:

Good commits:

"add authentication"

"add assessment CRUD"

"add user dashboard"

Do not commit broken code.

---

# Testing Rules

Before moving to next feature:

Check:

1. Backend endpoint works
2. Frontend calls API successfully
3. Data persists in PostgreSQL

---

# MVP Scope Control

Implement first:

1. Authentication
2. User roles
3. Assessment CRUD
4. Assessment submission
5. Report generation
6. Basic dashboards
7. Deployment

Only after all above work:

Consider:

* AI integration
* Payment
* Email
* Redis
* Queues
* Advanced AWS setup

---

# Final Rule

Do not build the perfect system.

Build the simplest system that solves the problem.

Shipping the MVP is the priority.
