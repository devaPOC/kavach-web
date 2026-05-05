# Kavach Dashboard - Sitemap Documentation

> Generated: January 10, 2026

This document provides a comprehensive overview of all UI/UX pages and API routes in the Kavach Dashboard application.

---

## Table of Contents

- [UI/UX Sitemap](#uiux-sitemap)
  - [Public Pages](#public-pages)
  - [Authentication Pages](#authentication-pages)
  - [Customer Dashboard](#customer-dashboard)
  - [Admin Portal](#admin-portal)
  - [Super Admin Portal](#super-admin-portal)
  - [Expert Portal](#expert-portal)
  - [Trainer Portal](#trainer-portal)
- [Route Sitemap (API)](#route-sitemap-api)
  - [Authentication API](#authentication-api)
  - [Admin API](#admin-api)
  - [Super Admin API](#super-admin-api)
  - [Customer API](#customer-api)
  - [Expert API](#expert-api)
  - [Trainer API](#trainer-api)
  - [Shared API Routes](#shared-api-routes)
  - [System API](#system-api)

---

## UI/UX Sitemap

### Visual Hierarchy

```
🏠 Home (/)
│
├── 🔐 Authentication
│   ├── /login
│   ├── /signup
│   ├── /verify-email
│   ├── /forgot-password
│   ├── /reset-password
│   ├── /complete-profile
│   ├── /pending-approval
│   └── /account-restricted
│
├── 👤 Profile
│   └── /profile
│
├── 📊 Customer Dashboard (/dashboard)
│   ├── /dashboard (Home)
│   ├── /dashboard/awareness-lab
│   ├── /dashboard/awareness-sessions
│   ├── /dashboard/awareness-session-request
│   ├── /dashboard/requests
│   └── /dashboard/forms
│
├── 🛡️ Admin Portal (/admin)
│   ├── /admin (Home)
│   ├── /admin/login
│   ├── /admin/dashboard
│   ├── /admin/change-password
│   ├── 📚 Awareness Lab
│   │   ├── /admin/awareness-lab
│   │   ├── /admin/awareness-lab/materials
│   │   └── /admin/awareness-lab/quizzes
│   ├── 📅 Awareness Sessions
│   │   ├── /admin/awareness-sessions
│   │   └── /admin/awareness-sessions/analytics
│   ├── 🛒 Marketplace
│   │   ├── /admin/marketplace
│   │   ├── /admin/marketplace/products
│   │   ├── /admin/marketplace/products/new
│   │   ├── /admin/marketplace/products/[id]
│   │   ├── /admin/marketplace/products/[id]/edit
│   │   ├── /admin/marketplace/orders
│   │   ├── /admin/marketplace/orders/[id]
│   │   └── /admin/marketplace/users
│   ├── 🔧 Services
│   │   ├── /admin/services/requests
│   │   └── /admin/services/quotes
│   ├── 👥 Users
│   │   └── /admin/users
│   ├── 📦 Trainer Resources
│   │   └── /admin/trainer-resources
│   ├── 💰 Pricing
│   │   └── /admin/pricing
│   ├── 📁 Archive
│   │   └── /admin/archive
│   └── 🗑️ Recycle Bin
│       └── /admin/recycle-bin
│
├── 👑 Super Admin Portal (/super-admin)
│   ├── /super-admin/login
│   ├── /super-admin/dashboard
│   ├── 👤 Admins Management
│   │   └── /super-admin/admins
│   ├── 👥 Users Management
│   │   └── /super-admin/users
│   └── 🗑️ Recycle Bin
│       └── /super-admin/recycle-bin
│
├── 🎓 Expert Portal (/expert)
│   ├── /expert/dashboard
│   ├── /expert/awareness-lab
│   └── /expert/tasks
│
└── 🎤 Trainer Portal (/trainer)
    ├── /trainer/dashboard
    ├── /trainer/awareness-sessions
    ├── /trainer/resources
    └── /trainer/schedule
```

---

### Public Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | Home | Landing page / Root redirect |
| `/not-found` | 404 Page | Page not found error |
| `/forbidden` | 403 Page | Access forbidden error |

---

### Authentication Pages

| Route | Page | Description |
|-------|------|-------------|
| `/login` | Login | User login page |
| `/signup` | Sign Up | New user registration |
| `/verify-email` | Email Verification | Verify email address |
| `/forgot-password` | Forgot Password | Request password reset |
| `/reset-password` | Reset Password | Set new password |
| `/complete-profile` | Complete Profile | Finish profile setup after registration |
| `/pending-approval` | Pending Approval | Account awaiting admin approval |
| `/account-restricted` | Account Restricted | Restricted account notification |

---

### Customer Dashboard

**Base Path:** `/dashboard`

| Route | Page | Description |
|-------|------|-------------|
| `/dashboard` | Dashboard Home | Customer main dashboard |
| `/dashboard/awareness-lab` | Awareness Lab | Learning modules and materials |
| `/dashboard/awareness-sessions` | Awareness Sessions | View scheduled sessions |
| `/dashboard/awareness-session-request` | Session Request | Request new awareness session |
| `/dashboard/requests` | My Requests | View service requests |
| `/dashboard/forms` | Forms | Dynamic form renderer |
| `/profile` | Profile | User profile management |

---

### Admin Portal

**Base Path:** `/admin`

#### Main Pages

| Route | Page | Description |
|-------|------|-------------|
| `/admin` | Admin Home | Admin portal landing |
| `/admin/login` | Admin Login | Admin authentication |
| `/admin/dashboard` | Dashboard | Admin main dashboard |
| `/admin/change-password` | Change Password | Update admin password |
| `/admin/users` | Users | User management |
| `/admin/pricing` | Pricing | Pricing configuration |
| `/admin/archive` | Archive | Archived items |
| `/admin/recycle-bin` | Recycle Bin | Deleted items recovery |
| `/admin/trainer-resources` | Trainer Resources | Resources for trainers |

#### Awareness Lab

| Route | Page | Description |
|-------|------|-------------|
| `/admin/awareness-lab` | Awareness Lab | Learning content management |
| `/admin/awareness-lab/materials` | Materials | Learning materials management |
| `/admin/awareness-lab/quizzes` | Quizzes | Quiz management |

#### Awareness Sessions

| Route | Page | Description |
|-------|------|-------------|
| `/admin/awareness-sessions` | Sessions List | View all awareness sessions |
| `/admin/awareness-sessions/analytics` | Session Analytics | Session statistics & insights |

#### Marketplace

| Route | Page | Description |
|-------|------|-------------|
| `/admin/marketplace` | Marketplace Home | Marketplace overview |
| `/admin/marketplace/products` | Products List | All products |
| `/admin/marketplace/products/new` | New Product | Create new product |
| `/admin/marketplace/products/[id]` | Product Details | View product details |
| `/admin/marketplace/products/[id]/edit` | Edit Product | Modify product |
| `/admin/marketplace/orders` | Orders List | All orders |
| `/admin/marketplace/orders/[id]` | Order Details | View order details |
| `/admin/marketplace/users` | Marketplace Users | Marketplace user management |

#### Services

| Route | Page | Description |
|-------|------|-------------|
| `/admin/services/requests` | Service Requests | Customer service requests |
| `/admin/services/quotes` | Quotes | Quote management |

---

### Super Admin Portal

**Base Path:** `/super-admin`

| Route | Page | Description |
|-------|------|-------------|
| `/super-admin/login` | Super Admin Login | Super admin authentication |
| `/super-admin/dashboard` | Dashboard | Super admin main dashboard |
| `/super-admin/admins` | Admins | Admin user management |
| `/super-admin/users` | Users | All users management |
| `/super-admin/recycle-bin` | Recycle Bin | System-wide deleted items |

---

### Expert Portal

**Base Path:** `/expert`

| Route | Page | Description |
|-------|------|-------------|
| `/expert/dashboard` | Dashboard | Expert main dashboard |
| `/expert/awareness-lab` | Awareness Lab | Content creation & management |
| `/expert/tasks` | Tasks | Assigned tasks management |

---

### Trainer Portal

**Base Path:** `/trainer`

| Route | Page | Description |
|-------|------|-------------|
| `/trainer/dashboard` | Dashboard | Trainer main dashboard |
| `/trainer/awareness-sessions` | Sessions | Assigned sessions |
| `/trainer/resources` | Resources | Training resources |
| `/trainer/schedule` | Schedule | Session schedule |

---

## Route Sitemap (API)

**Base Path:** `/api/v1`

### Authentication API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/signup` | User registration |
| POST | `/api/v1/auth/login` | User login |
| POST | `/api/v1/auth/logout` | User logout |
| GET | `/api/v1/auth/me` | Get current user |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| POST | `/api/v1/auth/verify-email` | Verify email address |
| POST | `/api/v1/auth/resend-verification` | Resend verification email |
| POST | `/api/v1/auth/forgot-password` | Request password reset |
| POST | `/api/v1/auth/reset-password` | Reset password |
| POST | `/api/v1/auth/check-email` | Check if email exists |

---

### Admin API

**Base Path:** `/api/v1/admin`

#### Core Admin

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/admin/login` | Admin login |
| GET | `/api/v1/admin/me` | Get current admin |
| POST | `/api/v1/admin/change-password` | Change admin password |
| GET | `/api/v1/admin/dashboard` | Dashboard stats |

#### User Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/admin/users` | List all users |
| GET | `/api/v1/admin/users/counts` | User statistics |
| GET | `/api/v1/admin/users/[id]` | Get user details |
| PUT | `/api/v1/admin/users/[id]` | Update user |
| DELETE | `/api/v1/admin/users/[id]` | Delete user |
| POST | `/api/v1/admin/promote-trainer` | Promote user to trainer |
| POST | `/api/v1/admin/demote-trainer` | Demote trainer to user |

#### Learning Modules

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/admin/learning-modules` | List learning modules |
| POST | `/api/v1/admin/learning-modules` | Create learning module |
| GET | `/api/v1/admin/learning-modules/[id]` | Get module details |
| PUT | `/api/v1/admin/learning-modules/[id]` | Update module |
| DELETE | `/api/v1/admin/learning-modules/[id]` | Delete module |
| GET | `/api/v1/admin/learning-modules/categories` | List categories |
| GET | `/api/v1/admin/learning-modules/materials` | List materials |

#### Quizzes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/admin/quizzes` | List quizzes |
| POST | `/api/v1/admin/quizzes` | Create quiz |
| GET | `/api/v1/admin/quizzes/[id]` | Get quiz details |
| PUT | `/api/v1/admin/quizzes/[id]` | Update quiz |
| DELETE | `/api/v1/admin/quizzes/[id]` | Delete quiz |
| GET | `/api/v1/admin/quizzes/archived` | List archived quizzes |
| GET | `/api/v1/admin/quiz-templates` | Quiz templates |
| GET | `/api/v1/admin/questions` | List questions |

#### Awareness Sessions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/admin/awareness-sessions` | List sessions |
| POST | `/api/v1/admin/awareness-sessions` | Create session |
| GET | `/api/v1/admin/awareness-sessions/[id]` | Get session details |
| PUT | `/api/v1/admin/awareness-sessions/[id]` | Update session |
| DELETE | `/api/v1/admin/awareness-sessions/[id]` | Delete session |
| GET | `/api/v1/admin/awareness-sessions/analytics` | Session analytics |

#### Marketplace

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/admin/marketplace/stats` | Marketplace statistics |
| GET | `/api/v1/admin/marketplace/products` | List products |
| POST | `/api/v1/admin/marketplace/products` | Create product |
| GET | `/api/v1/admin/marketplace/products/[id]` | Get product |
| PUT | `/api/v1/admin/marketplace/products/[id]` | Update product |
| DELETE | `/api/v1/admin/marketplace/products/[id]` | Delete product |
| GET | `/api/v1/admin/marketplace/orders` | List orders |
| GET | `/api/v1/admin/marketplace/orders/[id]` | Get order details |
| PUT | `/api/v1/admin/marketplace/orders/[id]` | Update order |
| GET | `/api/v1/admin/marketplace/users` | Marketplace users |

#### Services & Quotes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/admin/service-requests` | List service requests |
| GET | `/api/v1/admin/service-types` | List service types |
| GET | `/api/v1/admin/quotes` | List quotes |
| POST | `/api/v1/admin/quotes` | Create quote |

#### Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/admin/analytics/overview` | Overview analytics |
| GET | `/api/v1/admin/analytics/demographics` | Demographics data |
| GET | `/api/v1/admin/analytics/quizzes` | Quiz analytics |
| GET | `/api/v1/admin/analytics/export` | Export analytics data |

#### Resources & Tasks

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/admin/resources` | List resources |
| POST | `/api/v1/admin/resources` | Create resource |
| GET | `/api/v1/admin/tasks` | List tasks |
| POST | `/api/v1/admin/tasks` | Create task |

#### Pricing

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/admin/pricing` | Get pricing config |
| PUT | `/api/v1/admin/pricing` | Update pricing |

#### Archive & Recycle Bin

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/admin/archive/service-requests` | Archived service requests |
| GET | `/api/v1/admin/archive/stats` | Archive statistics |
| GET | `/api/v1/admin/recycle-bin` | List deleted items |
| POST | `/api/v1/admin/recycle-bin/restore` | Restore deleted item |

---

### Super Admin API

**Base Path:** `/api/v1/super-admin`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/super-admin/me` | Get current super admin |
| POST | `/api/v1/super-admin/logout` | Super admin logout |
| GET | `/api/v1/super-admin/stats` | System statistics |
| POST | `/api/v1/super-admin/send-otp` | Send OTP |
| POST | `/api/v1/super-admin/verify-otp` | Verify OTP |
| GET | `/api/v1/super-admin/admins` | List all admins |
| POST | `/api/v1/super-admin/admins` | Create admin |
| GET | `/api/v1/super-admin/admins/[id]` | Get admin details |
| PUT | `/api/v1/super-admin/admins/[id]` | Update admin |
| DELETE | `/api/v1/super-admin/admins/[id]` | Delete admin |
| GET | `/api/v1/super-admin/users` | List all users |
| GET | `/api/v1/super-admin/recycle-bin` | System recycle bin |

---

### Customer API

**Base Path:** `/api/v1/customer`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/customer/service-requests` | My service requests |
| POST | `/api/v1/customer/service-requests` | Create service request |
| GET | `/api/v1/customer/quotes` | My quotes |
| GET | `/api/v1/customer/tasks` | My tasks |
| GET | `/api/v1/customer/payments` | My payments |

---

### Expert API

**Base Path:** `/api/v1/expert`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/expert/dashboard` | Expert dashboard |
| GET | `/api/v1/expert/learning-modules` | Learning modules |
| GET | `/api/v1/expert/quizzes` | Quizzes |
| GET | `/api/v1/expert/tasks` | All tasks |
| GET | `/api/v1/expert/assigned-tasks` | Assigned tasks |

---

### Trainer API

**Base Path:** `/api/v1/trainer`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/trainer/awareness-sessions` | Assigned sessions |
| GET | `/api/v1/trainer/resources` | Training resources |

---

### Shared API Routes

#### Profile

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/profile/customer` | Customer profile |
| PUT | `/api/v1/profile/customer` | Update customer profile |
| GET | `/api/v1/profile/expert` | Expert profile |
| PUT | `/api/v1/profile/expert` | Update expert profile |
| GET | `/api/v1/users/profile` | Generic user profile |
| POST | `/api/v1/users/change-password` | Change password |

#### Learning Modules & Quizzes (Public)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/learning-modules` | List learning modules |
| GET | `/api/v1/learning-modules/[id]` | Get module details |
| GET | `/api/v1/quizzes` | List available quizzes |
| GET | `/api/v1/quizzes/[id]` | Get quiz details |
| POST | `/api/v1/quizzes/attempts` | Submit quiz attempt |
| GET | `/api/v1/quizzes/attempts` | Get quiz attempts |

#### Awareness Sessions (Public)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/awareness-sessions` | List sessions |
| GET | `/api/v1/awareness-sessions/[id]` | Get session details |

#### Quotes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/quotes/[id]` | Get quote details |
| GET | `/api/v1/quotes/pending-requests` | Pending quote requests |

#### Pricing

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/pricing/check` | Check pricing |

#### Negotiations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/negotiations/[id]` | Get negotiation details |

#### Payments

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/payments/[id]` | Get payment details |
| POST | `/api/v1/payments/webhook` | Payment webhook |

#### Devices

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/devices/register` | Register device |

---

### System API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/health` | Health check |
| GET | `/api/v1/metrics` | System metrics |
| GET | `/api/v1/monitoring` | Monitoring data |
| GET | `/api/v1/security` | Security status |
| POST | `/api/v1/security/csp-report` | CSP violation report |

---

## User Flow Diagrams

### Authentication Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   /signup   │────▶│/verify-email│────▶│  /pending-  │
│             │     │             │     │  approval   │
└─────────────┘     └─────────────┘     └─────────────┘
                                               │
                                               ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   /login    │◀────│  Approved   │◀────│  /complete- │
│             │     │             │     │   profile   │
└─────────────┘     └─────────────┘     └─────────────┘
       │
       ▼
┌─────────────┐
│  Dashboard  │
│  (by role)  │
└─────────────┘
```

### Password Recovery Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   /forgot-  │────▶│ Email Sent  │────▶│   /reset-   │
│   password  │     │             │     │   password  │
└─────────────┘     └─────────────┘     └─────────────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │   /login    │
                                        │             │
                                        └─────────────┘
```

---

## Role-Based Access Matrix

| Page/Section | Customer | Expert | Trainer | Admin | Super Admin |
|--------------|:--------:|:------:|:-------:|:-----:|:-----------:|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| Awareness Lab | ✅ | ✅ | ❌ | ✅ | ❌ |
| Awareness Sessions | ✅ | ❌ | ✅ | ✅ | ❌ |
| Tasks | ❌ | ✅ | ❌ | ✅ | ❌ |
| Marketplace | ❌ | ❌ | ❌ | ✅ | ❌ |
| User Management | ❌ | ❌ | ❌ | ✅ | ✅ |
| Admin Management | ❌ | ❌ | ❌ | ❌ | ✅ |
| Pricing | ❌ | ❌ | ❌ | ✅ | ❌ |
| Service Requests | ✅ | ❌ | ❌ | ✅ | ❌ |
| Resources | ❌ | ❌ | ✅ | ✅ | ❌ |
| Schedule | ❌ | ❌ | ✅ | ❌ | ❌ |
| Recycle Bin | ❌ | ❌ | ❌ | ✅ | ✅ |
| Archive | ❌ | ❌ | ❌ | ✅ | ❌ |

---

## Notes

- Routes using `[id]` are dynamic routes with parameter placeholders
- All API routes require appropriate authentication unless marked as public
- The `(frontend)` and `(backend)` route groups are Next.js organizational patterns
- Rate limiting is applied to authentication endpoints
- All data modifications are logged for audit purposes
