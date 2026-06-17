# DATABASE_SCHEMA.md

# SPARTA Database Schema

Database:
PostgreSQL

ORM:
Drizzle ORM

Design goal:
Simple relational schema for MVP development.

---

# Entity Relationship Overview

USER

creates

ASSESSMENT

ASSESSMENT

contains many

QUESTIONS

QUESTION

contains many

CHOICES

USER/PUBLIC VISITOR

creates

ATTEMPT

ATTEMPT

stores

REPORT

---

# Tables

# users

Stores account information.

Roles:

* ADMIN
* MENTOR
* USER

Columns:

id

type:
uuid

constraint:
primary key

---

name

type:
varchar

---

email

type:
varchar

constraints:

unique

not null

---

password_hash

type:
text

nullable:
false

---

role

type:
enum

values:

USER

MENTOR

ADMIN

default:

USER

---

created_at

type:

timestamp

---

# assessments

Stores self-assessment tests created by mentors.

Columns:

id

type:

uuid

primary key

---

mentor_id

type:

uuid

relation:

references users.id

---

title

type:

varchar

---

description

type:

text

---

status

type:

enum

values:

DRAFT

PUBLISHED

default:

DRAFT

---

created_at

timestamp

---

updated_at

timestamp

---

# questions

Stores assessment questions.

Columns:

id

uuid

primary key

---

assessment_id

uuid

relation:

references assessments.id

---

question_text

text

---

created_at

timestamp

---

# choices

Stores multiple choice answers.

Columns:

id

uuid

primary key

---

question_id

uuid

relation:

references questions.id

---

choice_text

text

---

score

integer

Description:

Score value used for calculating assessment result.

---

# attempts

Stores submitted assessment attempts.

Important:

Login is not required to take assessment.

Columns:

id

uuid

primary key

---

assessment_id

uuid

relation:

references assessments.id

---

user_id

uuid

nullable

relation:

references users.id

---

guest_email

varchar

nullable

Description:

Used when non-registered users take assessment.

---

total_score

integer

---

created_at

timestamp

---

# reports

Stores generated assessment results.

Columns:

id

uuid

primary key

---

attempt_id

uuid

relation:

references attempts.id

---

report_type

enum

values:

FREE

PREMIUM

---

content

text

---

created_at

timestamp

---

# Relationships

users 1:N assessments

Example:

One mentor can create many assessments.

---

assessments 1:N questions

Example:

One assessment contains many questions.

---

questions 1:N choices

Example:

One question contains multiple answers.

---

assessments 1:N attempts

Example:

One assessment can be taken many times.

---

attempts 1:1 reports

Example:

One submission generates one report.

---

# MVP Notes

Do not add:

* payment table
* subscription table
* AI result table
* audit table
* logging table

These can be added after MVP completion.

Keep schema simple.
