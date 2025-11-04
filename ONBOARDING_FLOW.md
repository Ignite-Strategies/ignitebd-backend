# Ignite BD Onboarding Flow

## Overview
This document traces the complete user onboarding flow from initial signup through company creation to dashboard access.

---

## Quick Breadcrumb

**Default Flow (Create Company):**
1. Signup/Signin → Creates Owner
2. Profile Setup → Updates Owner details
3. Company Profile → Creates Company (owner becomes Owner)
   - Soft fallback: "Have an invite code?" link → small modal/popup to enter code
4. Company Dashboard → ✅ Done

**Invited User (Email Link):**
1. Clicks email invite link → `/invite/:token`
2. If not signed in → Signup/Signin → Back to invite
3. Accept Invite → Auto-added to company as staff
4. Company Dashboard → ✅ Done

---

## Flow Sequence

### 1. **Authentication** (`/signup` or `/signin`)
- **Frontend**: `src/pages/Signup.jsx` or `src/pages/Signin.jsx`
- **Backend**: `POST /api/user/create` (via `routes/Owner/userCreateRoute.js`)
- **What happens**:
  - User authenticates with Firebase
  - Frontend calls `/api/user/create` with Firebase ID and user data
  - Backend finds or creates `Owner` record (by `firebaseId`)
  - Returns user data with `id` stored as `adminId` in localStorage
- **Next step**: Navigate to `/profilesetup`

---

### 2. **Profile Setup** (`/profilesetup`)
- **Frontend**: `src/pages/setup/Profilesetup.jsx`
- **Backend**: `PUT /api/adminUserAuth/:adminId`
- **What happens**:
  - Collects: `firstName`, `lastName`, `email`, `phone`, `role`, `goals`
  - Updates Owner profile with additional details
  - Uses `adminId` from localStorage
- **Next step**: Navigate to `/companyprofile` (create new company)

---

### 3. **Company Profile** (`/companyprofile`) - CREATE NEW PATH (Default)
- **Frontend**: `src/pages/company/CompanyProfile.jsx`
- **Backend**: `POST /api/companies` (via `routes/Company/companyRoute.js`)
- **What happens**:
  - Collects company data:
    - `companyName` (required)
    - `companyAddress` (optional)
    - `yearsInBusiness` (dropdown: "0-1", "2-5", "6-10", "11-20", "20+")
    - `companyIndustry` (required, dropdown)
    - `companyAnnualRev` (dropdown: "$0-$100K", "$100K-$500K", etc.)
  - Gets `adminId` from localStorage
  - Creates company with `ownerId` = authenticated user, `managerId` = adminId (or ownerId if not provided)
  - Stores `companyId` in localStorage
  - **Soft Fallback**: Small "Have an invite code?" link (bottom of form or modal) → allows user to enter invite code instead
- **Next step**: Navigate to `/companydashboard`

---

### 4. **Invite Acceptance** (`/invite/:token`) - JOIN EXISTING PATH 🚧 TODO
- **Frontend**: `src/pages/invite/AcceptInvite.jsx` (to be created)
- **Backend**: `GET /api/invites/:token` and `POST /api/invites/:token/accept` (to be created)
- **Flow**:
  1. Owner/Manager invites user via email (sends link with token)
  2. User clicks email link → `/invite/:token`
  3. If not authenticated → redirect to signup/signin, then back to invite
  4. Backend validates token, finds company, adds user to `staff` array
  5. Auto-redirect to `/companydashboard`
- **Benefits**:
  - Cleaner UX - no "create or choose" confusion
  - Email-based = secure, trackable
  - Dedicated invite page = clear purpose
- **Status**: Not yet implemented

---

### 5. **Company Dashboard** (`/companydashboard`)
- **Frontend**: `src/pages/company/CompanyDashboard.jsx`
- **What happens**:
  - Loads dashboard data using `companyId` from localStorage
  - Displays metrics: total leads, customers, revenue, pipeline value
  - User can navigate to various CRM features
- **Status**: ✅ Onboarding complete

---

## Data Flow

### localStorage Keys Used:
- `adminId` - Owner ID (set after authentication)
- `companyId` - Company ID (set after company creation/join)
- `containerId` - Alternative key for company ID (used in some components)

### Backend Schema Fields:
**Owner Model** (`prisma/schema.prisma`):
- `id` (cuid)
- `firebaseId` (unique, for auth)
- `email`, `name`, `photoURL`

**Company Model** (`prisma/schema.prisma`):
- `id` (cuid)
- `companyName` (required)
- `companyAddress` (optional)
- `companyIndustry` (optional)
- `companyAnnualRev` (optional, Float)
- `yearsInBusiness` (optional, Int)
- `ownerId` (required, references Owner)
- `managerId` (optional, references Owner)

---

## API Endpoints

### Authentication & User Creation
- `POST /api/user/create` - Find or create Owner by Firebase ID

### Profile Setup
- `PUT /api/adminUserAuth/:adminId` - Update Owner profile details

### Company Management
- `POST /api/companies` - Create new company (requires Firebase auth middleware)
- `POST /api/companies/join` - Join existing company by invite code
- `GET /api/companies/:companyId` - Get company details
- `PUT /api/companies/:companyId` - Update company details

---

## Notes

### Join Flow - Email Invite System (🚧 TODO):
- **Current State**: `/joincompany` and `/companycreateorchoose` exist but will be deprecated/removed
- **New Approach**: 
  - **Primary**: Email-based invite links (`/invite/:token`)
  - **Soft Fallback**: Small invite code input on Company Profile page (optional, non-prominent)
- **What Needs to be Built**:
  1. **Invite Model** (in schema):
     - `token` (unique, generated)
     - `email` (invited user's email)
     - `companyId` (company they're joining)
     - `invitedBy` (ownerId who sent invite)
     - `status` (pending, accepted, expired)
     - `expiresAt` (timestamp)
     - `inviteCode` (optional, short code like "ABC123" for manual entry)
  2. **Backend Routes**:
     - `POST /api/invites` - Create invite (owner/manager only)
     - `GET /api/invites/:token` - Validate invite token (for email links)
     - `GET /api/invites/code/:code` - Validate invite code (for soft fallback)
     - `POST /api/invites/:token/accept` - Accept invite via token, add to staff
     - `POST /api/invites/code/:code/accept` - Accept invite via code, add to staff
  3. **Frontend Pages**:
     - `/invite/:token` - Accept invite page (primary method)
     - Company Profile page - Add small "Have an invite code?" link → modal/popup with code input
     - Remove or deprecate `/companycreateorchoose` and `/joincompany`
  4. **Email Service**:
     - Send invite email with link: `https://bd.ignitestrategies.co/invite/:token`
     - Include both link AND code in email (for backup)

### Field Name Mismatches (⚠️ Needs Fixing):
- Frontend sends: `name`, `address`, `industry`, `annualRevenue`
- Schema expects: `companyName`, `companyAddress`, `companyIndustry`, `companyAnnualRev`
- **Action Required**: Update `CompanyProfile.jsx` to match schema field names

### Revenue Data Format:
- Frontend sends `annualRevenue` as string range (e.g., "0-100k", "100k-500k")
- Schema expects `companyAnnualRev` as Float
- **Action Required**: Convert range strings to numeric values in backend or frontend

### Settings vs Onboarding:
- Settings page (`/settings`) collects different fields: `companyName`, `industry`, `website`, `foundedYear`
- This is separate from onboarding flow and may need refactoring later

---

## Last Updated
2025-01-27

