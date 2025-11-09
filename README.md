# UniStay Website

A web-based platform that connects **students (tenants)** with **landlords**, enabling property listings, search, booking, payments, messaging, and reviews.

> This README is a developer-friendly quickstart. For detailed Business Rules and User Guide, see the `/docs` folder (or the PDFs you shared).

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Roles & Permissions](#roles--permissions)
- [Business Rules (Summary)](#business-rules-summary)
- [Domain Model (ERD)](#domain-model-erd)
- [Tech Stack](#tech-stack)
- [Getting Started (Local)](#getting-started-local)
- [Environment Variables](#environment-variables)
- [Database & Seed Data](#database--seed-data)
- [Running the App](#running-the-app)
- [Test Accounts](#test-accounts)
- [Core Screens / Flows](#core-screens--flows)
- [Security & Compliance](#security--compliance)
- [Logging & Reports](#logging--reports)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)
- [Credits](#credits)

---

## Overview

**UniStay** is a property rental platform focused on student accommodation. It supports:
- Tenant discovery and booking of rooms
- Landlord property onboarding and booking approvals
- Payment of a **30% deposit** to secure bookings
- Messaging between tenants and landlords
- Post-stay reviews and ratings

---

## Key Features

- **Authentication & Roles**: Email verification, account lockouts after repeated failures.
- **Property Management**: Create, edit, publish/unpublish properties, with images and availability.
- **Search & Filters**: City/title search, price and room-type filters.
- **Bookings**: Tenant requests, landlord approval/rejection, status transitions.
- **Payments**: Link payments to approved bookings; update booking status to **Paid** when confirmed.
- **Messaging**: Protected in-app messaging for negotiations and updates.
- **Reviews**: Tenants can review after a completed stay; moderation pipeline.
- **Admin**: View & moderate content, activity logs, analytics.

---

## Roles & Permissions

- **Tenant**: Search, book available properties, pay deposits, message, write reviews.
- **Landlord**: Add/manage properties, approve/reject bookings, manage availability, message tenants.
- **Admin**: Moderate content, view logs & reports, access analytics (no property/booking creation).

---

## Business Rules (Summary)

- Unique email for each account; email verification required.
- Landlords can list multiple properties but cannot book their own listings.
- Tenants can only book **Available** properties; duplicates (same tenant & property) are blocked.
- Booking status flow: `Available → Pending Approval → Approved/Rejected → Paid (after deposit)`.
- Payments are one-per-booking; on success, mark booking **Paid** and issue receipt.
- Account lock after several failed logins; session timeouts for inactivity.
- All critical actions (bookings, payments) are logged with timestamp & user ID.
- Automated email alerts for key events (approvals, payments, password reset).
- Reviews are allowed post-stay and are moderated before publishing.
- Compliance: Users must accept ToS/Privacy; listings must meet local rental & safety laws.

> See the Business Rules PDF for the authoritative source.

---

## Domain Model (ERD)

Core entities typically include:
- **User** (Tenant, Landlord, Admin)
- **Property** (images, amenities, rooms, status)
- **Booking** (dates, status, tenant, landlord/property link)
- **Payment** (method, amount, timestamp, booking link)
- **Message** (sender, recipient/thread, body, created_at)
- **Review** (rating, comment, booking/property, moderation)

> See the ERD/User Guide for the detailed relationships and status definitions.

---

## Tech Stack

- **Backend**: PHP 8.x (LAMP) *or equivalent server-side framework*
- **Database**: MySQL 8.x
- **Web Server**: Apache (XAMPP/MAMP/WAMP) for local dev
- **Frontend**: HTML/CSS/JS (vanilla or framework of your choice)
- **Email**: SMTP (e.g., Mailtrap for local dev)
- **Payments**: Pluggable gateway (stubbed or sandbox in dev)

> If your implementation differs (e.g., Laravel/Symfony or another stack), adjust steps accordingly.

---

## Getting Started (Local)

### Option A — XAMPP (PHP + MySQL)

1. Install **XAMPP** and start **Apache** and **MySQL**.
2. Clone or copy the project into:  
   - **Windows**: `C:\\xampp\\htdocs\\unistay`  
   - **macOS**: `/Applications/XAMPP/htdocs/unistay`
3. Create a database called `unistay` in **phpMyAdmin**.
4. Configure your DB credentials in `.env` or a config file (see below).
5. Import schema (`/database/schema.sql`) and seed data (`/database/seed.sql`) if available.
6. Visit **http://localhost/unistay**.

### Option B — PHP Built-in Server (if framework supports it)

```bash
php -S localhost:8000 -t public
```

Then open `http://localhost:8000`.

---

## Environment Variables

Create a `.env` file (or edit your config):

```
APP_ENV=local
APP_DEBUG=true
APP_URL=http://localhost/unistay

DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=unistay
DB_USERNAME=root
DB_PASSWORD=

MAIL_HOST=smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USERNAME=your_user
MAIL_PASSWORD=your_pass
MAIL_FROM_ADDRESS=no-reply@unistay.local
MAIL_FROM_NAME="UniStay"

PAYMENT_GATEWAY=mock
PAYMENT_PUBLIC_KEY=pk_test_xxx
PAYMENT_SECRET_KEY=sk_test_xxx
```

> For production, disable debug, use strong passwords, and rotate keys.

---

## Database & Seed Data

- **Schema**: `/database/schema.sql` (tables for users, properties, rooms, bookings, payments, messages, reviews)
- **Seed**: `/database/seed.sql` (optional test users, sample properties, demo bookings)

If you don’t have SQL files yet, export from your current DB or generate via migrations.

---

## Running the App

- **Local**: `http://localhost/unistay`
- **Login/Registration**: Email verification required.
- **Account Lock**: After repeated failed logins, an account is temporarily locked.
- **Deposits**: Tenants pay **30%** deposit on approved bookings.

---

## Test Accounts

> Replace with real seeded users if you have them.

- **Tenant**
  - Email: `tenant@example.com`
  - Password: `Tenant!234`
- **Landlord**
  - Email: `landlord@example.com`
  - Password: `Landlord!234`
- **Admin**
  - Email: `admin@example.com`
  - Password: `Admin!234`

---

## Core Screens / Flows

- **Home** → **Register/Login**
- **Tenant**: Properties → Property Details → Book Now → Confirm & Pay Deposit → My Bookings → Review
- **Landlord**: Dashboard → Add Property → Booking Requests (Approve/Reject) → My Properties
- **All**: Messages → Notifications
- **Admin**: Moderation → Activity Logs → Analytics

---

## Security & Compliance

- Passwords & sensitive fields encrypted at rest.
- Server-side validation for all forms; reject empty/invalid data.
- Sessions expire after inactivity; CSRF protection where applicable.
- Listings must follow local housing, zoning, and safety regulations.
- Terms of Service & Privacy Policy acceptance recorded.

---

## Logging & Reports

- All booking/payment actions are logged with timestamps & user IDs.
- Monthly reports for user activity, bookings, and payments.
- Admin analytics for property performance (views, bookings, feedback).

---

## Project Structure

```
unistay/
├─ public/                 # Public web root (index.php, assets)
├─ app/                    # Application code (controllers, models, services)
├─ resources/              # Views/templates, emails
├─ database/
│  ├─ schema.sql           # DB schema
│  ├─ seed.sql             # Seed data
├─ storage/                # Logs, uploads
├─ config/                 # App & environment config
├─ docs/                   # Business Rules, User Guide, ERD
└─ README.md
```

> Adjust to match your framework (e.g., Laravel: `app/`, `routes/`, `resources/`, etc.).

---

## Contributing

1. Create a feature branch: `git checkout -b feature/awesome`
2. Commit your changes: `git commit -m "feat: add awesome thing"`
3. Push the branch: `git push origin feature/awesome`
4. Open a pull request and request a review.

Coding standards: keep controllers thin, validate inputs, add tests for business rules, and avoid duplicating logic.

---

## License

This project is for educational purposes under your course submission. Add an explicit license if you plan to open-source it.

---

## Credits

- **Team WO2** — UniStay Website
- Project supervisors and course: PRT372S
- Documentation: Business Rules, User Guide, ERD PDFs.
