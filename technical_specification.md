# System Architecture & Technical Specifications
**Project Name:** Enterprise EdTech Assessment Platform  
**Document Type:** Technical Specification & Scope Document  

---

## 1. System Overview
This document outlines the technical architecture, core modules, and system requirements for the EdTech Assessment Platform. The system is a highly concurrent, multi-role web application designed to facilitate large-scale content management, secure online examinations, asynchronous background processing, and subscription-based monetization.

## 2. Technology Stack
The platform is engineered using a modern, scalable, and distributed architecture:
*   **Frontend & Core API:** Next.js 14 (App Router), React 18, Server Components
*   **Database Layer:** PostgreSQL with Prisma ORM
*   **Asynchronous Processing:** Redis & BullMQ (Message Queuing System)
*   **Authentication Engine:** NextAuth.js (Session management, Role-based access)
*   **UI/UX Framework:** Tailwind CSS, Radix UI Primitives, Framer Motion
*   **Payment Gateway Integration:** Razorpay API (with secure webhook processing)
*   **Rich Media Handling:** TipTap Editor, KaTeX (Mathematical rendering), Cloudinary (Image CDN)
*   **Data Validation:** Zod Schema Validation

---

## 3. Core System Modules

### 3.1. Authentication & Authorization Module
*   **Role-Based Access Control (RBAC):** Strict separation of privileges between `Admin` and `Student` roles.
*   **Session Management:** JWT-based secure sessions with database-backed session validation.
*   **Security:** Cryptographic password hashing (Bcrypt) and secure token generation for API access.

### 3.2. Content Hierarchy & Management System
*   **4-Tier Relational Structure:** Relational mapping of `Subject` → `Topic` → `SubTopic` → `Question`.
*   **Complex Question Support:** Database architecture supports Multiple Choice (MCQ), Numerical Answer Types (NAT), and Match-the-Following questions.
*   **Rich Text & Formula Support:** WYSIWYG editing integrated with KaTeX to render complex mathematical, algebraic, and chemical equations in real-time.

### 3.3. Asynchronous Background Processing (Worker Nodes)
*To ensure the main application thread does not block during heavy loads, the system utilizes independent worker processes.*
*   **Bulk Import Engine (`question-import-worker`):** Parses massive CSV/Document files, validates data against schemas, processes images, and writes to the database asynchronously.
*   **Attempt Synchronization (`exam-sync-worker`):** Handles heavy read/write operations during peak exam submission times to prevent database deadlocks.

### 3.4. Secure Assessment Engine
*   **Stateful Exam Interface:** Real-time timer and state management for active examinations.
*   **Algorithmic Grading:** Configurable rules engine for positive marks, fractional negative marking, and partial scoring.
*   **Anti-Cheat Mechanisms:** 
    *   Window/Tab blur detection (tracks how many times a user leaves the exam screen).
    *   IP Address logging per attempt.
    *   Suspicious activity flagging algorithms.

### 3.5. E-Commerce & Subscription Engine
*   **Relational Purchasing Logic:** Handles access control based on active purchases of `Single Exams`, `Bundles`, or `Time-based Subscriptions`.
*   **Payment Webhooks:** Secure backend listener verifying Razorpay cryptographic signatures (`razorpaySignature`) to prevent payment spoofing.
*   **Access Expiration:** Automated cron-like checks to revoke access when subscriptions expire.

### 3.6. Analytics & Performance Engine
*   **Leaderboard Generation:** Dynamic calculation of student Ranks, Percentiles, and total scores across all participants.
*   **Diagnostic Reports:** Tracks granular metrics including Time-Spent-Per-Question, Subject-wise accuracy, and overall correctness ratios.

---

## 4. Database Architecture Summary
The database is highly normalized and contains over 20 relational entities to ensure data integrity and query speed. Key models include:
*   **Identity Entities:** `User`, `Account`, `Session`
*   **Content Entities:** `Subject`, `Topic`, `SubTopic`, `Question`, `Option`, `StudyMaterial`
*   **Exam Entities:** `Exam`, `ExamQuestion`, `ExamEvent`
*   **Transactional Entities:** `Subscription`, `Bundle`, `Purchase`, `Payment`
*   **Evaluation Entities:** `Attempt`, `LeaderboardEntry`, `ExamFeedback`, `ErrorReport`

*Note: The schema utilizes extensive indexing (`@@index`) and cascade deletion rules to maintain performance during highly concurrent read/write operations.*

---

## 5. Deployment & Infrastructure Requirements
*   **Node Server:** Vercel / AWS EC2 for Next.js Server-Side Rendering.
*   **Database Hosting:** Managed PostgreSQL instance (e.g., Supabase, AWS RDS) capable of handling high connection pooling.
*   **In-Memory Store:** Managed Redis Cluster for BullMQ message queues and session caching.
*   **Storage:** Cloudinary CDN for static assets and user-uploaded media.
