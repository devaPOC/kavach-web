# Kavach Marketplace Platform
## Knowledge Transfer & Architecture Document

**Version:** 2.0
**Status:** Approved (Architecture Locked)
**Last Updated:** December 2025

---

## 1. Overview

The Kavach Marketplace is a **standalone commerce platform** within the Kavach ecosystem.
It is delivered via a **dedicated application with independent authentication**, while being operationally managed from the **Kavach Core App**.

The system is explicitly designed with:
- **Two applications**
- **Two databases**
- **Two authentication systems**
- **Event-based identity federation**

This separation is intentional and non-negotiable.

---

## 2. Applications

### 2.1 Kavach Core App

**Purpose**
Primary platform application for admins and platform users.

**Authentication**
- Core Auth (existing mechanism)
- RBAC enforced at route and service level

**User Types**
- Admin
- Platform User

**Responsibilities**
- Core platform features
- User management & approvals
- Expert governance (platform-side)
- Marketplace administration:
  - Products
  - Orders
  - Inventory
  - Fulfillment

**Database Access**
- Core DB (read/write)
- Marketplace DB (read/write, admin-only scope)

---

### 2.2 Kavach Market App

**Purpose**
Dedicated marketplace application for commerce.

**Authentication**
- **Marketplace Auth**
- **Email + OTP only**
- No passwords
- No shared auth state with Core App

**User Type**
- **Market User** (single role)

**Responsibilities**
- Browse products
- Cart management
- Checkout
- Order history
- Shipping addresses

**Database Access**
- Marketplace DB (read/write)

**Explicit Non-Responsibilities**
- No admin features
- No platform features
- No Core DB access

---

## 3. Authentication & Identity Architecture

### 3.1 Authentication Domains

The system uses **two fully isolated authentication systems**.

#### Core Authentication
- Used by: Kavach Core App
- Owns:
  - Admin access
  - Platform RBAC
  - Approval workflows
  - Platform state

#### Marketplace Authentication
- Used by: Kavach Market App
- Login method:
  - **Email + One-Time Password (OTP)**
- Owns:
  - Marketplace sessions
  - Order ownership
  - Checkout identity

There is **no shared user table, token, or session**.

---

## 4. Marketplace Authentication (Email + OTP)

### 4.1 Login Flow

1. User enters email address
2. System generates OTP + expiry
3. OTP sent via email
4. User submits OTP
5. Session created on success

No passwords are stored. Ever.

---

### 4.2 OTP Rules

- Short-lived expiry (5–10 min)
- Rate-limited attempts
- Hashed at rest
- Single-use only

---

## 5. Database Architecture

### 5.1 Core Database

**Owns**
- users
- roles
- approvals
- platform state

---

### 5.2 Marketplace Database

**Owns**
- market_users
- products
- product_images
- cart_items
- orders
- order_items
- user_addresses
- identity_link

---

## 6. Marketplace User Model

### 6.1 market_users

- id (uuid, PK)
- email (unique)
- is_active
- last_login_at
- created_at
- updated_at

---

### 6.2 market_auth_otps

- id (uuid, PK)
- market_user_id (FK)
- otp_hash
- expires_at
- attempts
- created_at

---

## 7. Identity Federation (Event-Based)

### identity_link

- id (uuid, PK)
- core_user_id
- market_user_id
- linked_at
- source (event | admin | system)

Linking is optional, event-driven, and idempotent.

---

## 8. Backend Architecture

Single backend, two DB connections:

- coreDb → core services
- marketplaceDb → marketplace services

Rules:
- No cross-DB joins
- No shared auth trust

---

## 9. API Ownership

### Consumer Marketplace APIs
- /api/v1/marketplace/*
- Marketplace Auth only

### Admin Marketplace APIs
- /api/v1/admin/marketplace/*
- Core Auth (Admin RBAC)

---

## 10. Binding Rules

1. Separate auth systems
2. OTP-only marketplace auth
3. Single marketplace user role
4. Identity via identity_link only
5. No cross-database joins
6. Admin access via Core Auth only

---

## 11. Non-Goals

- Shared login
- Password auth in marketplace
- User duplication
- Implicit identity trust

---

## 12. Status

This document is final. All implementation must conform.
