# FRONTEND_DIRECTION.md

# LATO Frontend Development Direction

## Goal

Build a production-style MVP frontend for LATO.

LATO is a self-assessment platform where:

* Visitors discover assessments
* Visitors can take assessments without login
* Users register/login to view reports
* Mentors create and manage assessments
* Admins manage the platform

Priority:

Working product flow first.

Beautiful UI second.

---

# Tech Stack

Framework:

Next.js App Router

Language:

TypeScript

Styling:

Tailwind CSS

Components:

shadcn/ui

Backend:

Hono.js REST API

Authentication:

JWT Bearer Token

---

# Frontend Architecture Rule

All features MUST follow:

Page

↓

Component

↓

API Service

↓

Backend API

Example:

Login Page

↓

LoginForm Component

↓

auth.api.ts

↓

POST /api/auth/login

Pages must NOT directly call fetch().

---

# Folder Structure

Use:

src/

├── app/

├── components/

├── services/

├── hooks/

├── types/

└── lib/

---

# App Directory

Responsible only for:

* Routing
* Page composition

Do not place large business logic here.

Example:

app/

├── page.tsx

├── login/

│   └── page.tsx

├── register/

│   └── page.tsx

├── assessments/

│   └── [id]/

│       └── page.tsx

├── dashboard/

│   └── page.tsx

├── mentor/

│   ├── assessments/

│   └── results/

└── admin/

```
├── users/

├── assessments/

└── content/
```

---

# Components Structure

components/

auth/

* LoginForm.tsx
* RegisterForm.tsx

assessment/

* AssessmentCard.tsx
* QuestionCard.tsx
* AssessmentForm.tsx
* ReportView.tsx

dashboard/

* Sidebar.tsx
* DashboardLayout.tsx
* StatCard.tsx

mentor/

* AssessmentEditor.tsx
* QuestionEditor.tsx
* ResultsTable.tsx

admin/

* UserTable.tsx
* ContentEditor.tsx

common/

* Loading.tsx
* ErrorMessage.tsx

---

# Services Layer

ONLY location allowed to call fetch.

services/

auth.api.ts

assessment.api.ts

mentor.api.ts

admin.api.ts

blog.api.ts

contact.api.ts

Example:

Component

calls:

authApi.login()

NOT:

fetch("/api/login")

---

# API Client Rules

All requests use centralized API client.

Handle:

* base URL
* JSON parsing
* JWT injection
* errors

Example flow:

apiClient

↓

attach Authorization header

↓

send request

↓

return response.data

---

# Authentication Flow

Visitors can access:

* Landing page
* Assessment list
* Assessment questions

WITHOUT login.

Login required for:

* Viewing final report
* Dashboard access

Flow:

Visitor opens assessment

↓

Answers questions

↓

Submit

↓

Backend returns attempt_id

↓

Store attempt_id temporarily

↓

Redirect login/register

↓

Authenticate

↓

Claim attempt

↓

Show report

---

# Token Storage

MVP:

Store JWT in localStorage.

Store:

token

user data

---

# Role Based Routing

After login:

USER:

redirect:

/dashboard

Can:

* view reports
* view history

MENTOR:

redirect:

/mentor

Can:

* create assessment
* edit assessment
* add questions
* view results

ADMIN:

redirect:

/admin

Can:

* manage users
* manage assessments
* manage content
* view statistics

---

# Public Pages

## Landing Page (/)

Purpose:

Introduce LATO.

Contains:

* Hero section
* Assessment list
* Blog/content
* Call to action
* Contact section

---

## Assessment Page

Route:

/assessments/[id]

Flow:

1. Load questions

2. User selects answers

3. Submit

4. Redirect to login if needed

5. Show report after authentication

UI:

Use step/question style.

Example:

Question 3 / 10

[Choice A]

[Choice B]

[Choice C]

---

# User Dashboard

Route:

/dashboard

Features:

* Previous assessments
* Reports

Keep simple for MVP.

---

# Mentor Dashboard

Route:

/mentor

Features:

## Assessment Management

Mentor can:

* Create assessment
* Edit assessment
* Delete assessment
* Publish/unpublish

Fields:

title

description

price

score thresholds

---

## Question Management

Support only:

Multiple Choice

Mentor inputs:

Question text

Choices:

* answer text
* score

---

## Results

Show:

* participant
* score
* created date

---

# Admin Dashboard

Route:

/admin

Features:

## Overview

Show:

* total users
* assessments
* attempts
* revenue

---

## User Management

Admin can:

change role:

USER

MENTOR

ADMIN

---

## Assessment Management

Admin can:

* view all assessments
* moderate assessments
* update status
* manage price
* delete assessment

---

## Content Management

Admin can:

Create/edit/delete:

* blogs
* landing content

---

# UI Direction

Style:

Modern SaaS platform

Reference feeling:

* clean dashboard
* lots of spacing
* card based
* simple navigation

Use:

shadcn:

* Button
* Card
* Table
* Dialog
* Input
* Form
* Badge

Avoid:

* complex animation
* unnecessary effects
* custom CSS

---

# State Management

Allowed:

useState

useEffect

React Context (auth only)

Do NOT add:

Redux

Zustand

React Query

---

# Error Handling

Every page handles:

Loading state

Empty state

Error state

Example:

"No assessments available yet"

---

# Development Order

Follow this exact order:

1. API service layer

2. Authentication UI

Login

Register

3. Public assessment flow

Landing

Take test

Submit

4. User report flow

5. Mentor dashboard

6. Admin dashboard

7. UI polish

---

# AI Coding Rules

DO NOT:

* Modify backend
* Change API contract
* Add unnecessary libraries
* Add features outside MVP
* Create huge components
* Put API calls inside pages

ALWAYS:

* Create reusable components
* Keep files small
* Follow existing architecture
* Build one feature at a time

Final priority:

Working product > Beautiful UI
