# PROJECT_REQUIREMENT.md

# SPARTA — Self Assessment Platform

## Project Goal

Build a web application platform that allows mentors/coaches to create and publish self-assessment tests.

Users can take available assessments, receive generated reports, and optionally unlock premium reports.

The goal is to build a minimum usable product (MVP) within 5 days.

Priority:

1. Working product
2. Complete user flow
3. Simple maintainable code

Do not prioritize:

* Complex architecture
* Microservices
* Advanced reliability engineering
* Premature optimization

---

# Tech Stack

## Frontend

Framework:

* Next.js (App Router)
* TypeScript

Styling:

* Tailwind CSS
* shadcn/ui components

## Backend

Framework:

* Hono.js
* TypeScript

Architecture:

* Routes
* Services
* Database layer

## Database

Database:

* PostgreSQL

ORM:

* Drizzle ORM

## Deployment

* Docker
* Docker Compose
* AWS EC2

---

# User Roles

The system supports 3 roles:

## USER

Description:
Normal users who take assessment tests.

Permissions:

* Register directly
* Login
* View published assessments
* Take assessment tests
* Receive free assessment report

---

## MENTOR

Description:
Users who create assessment content.

Mentor access is granted by Admin.

Mentors cannot directly register as mentor.

Permissions:

* Create assessment
* Edit assessment
* Delete assessment
* Publish/unpublish assessment
* Add questions
* Add answer choices
* Assign score values
* View assessment submissions

---

## ADMIN

Description:
System administrator.

Permissions:

* View users
* Change user roles
* Manage platform data
* View basic statistics

---

# Core Features

## Authentication

Required:

* Email/password authentication
* Password hashing
* JWT authentication
* Role-based authorization

Optional:

* Email verification

---

# Assessment Management

Mentor can create assessments.

Assessment contains:

* Title
* Description
* Multiple questions

Question type:

MVP only supports:

* Multiple choice questions

Each answer choice contains:

* Answer text
* Score value

Assessment status:

* Draft
* Published

---

# Assessment Flow

User flow:

1. User opens landing page

2. Select assessment

3. Answer questions

4. Submit assessment

5. System calculates score

6. User receives report

Login is NOT required to take assessment.

---

# Report System

MVP:

Report is generated using score ranges.

Example:

Low score:
"Needs improvement"

Medium score:
"Average"

High score:
"Strong"

Future improvement:

Replace rule-based report generation with LLM.

---

# Dashboard

## Admin Dashboard

Features:

* User management
* Change user role
* View total users
* View total assessments
* View assessment usage

---

## Mentor Dashboard

Features:

* Assessment CRUD
* Question management
* View assessment results

---

# Future Features (Only After MVP Completion)

Do not implement unless core system is complete.

* Payment gateway
* Email verification
* FastAPI AI service
* LLM report generation
* Microservices
* Advanced logging
* Redis
* Queue system
* Advanced AWS architecture
