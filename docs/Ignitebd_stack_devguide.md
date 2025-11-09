# IgniteBD Stack Development Guide

> Canonical copy lives in `ignitebd-backend/docs` so backend + frontend changes stay in sync.

## Premise

**IgniteBD is a business development platform designed to help professional services clients with systematic outreach, relationship building, and growth acceleration.**

The core mission: **Attract → Engage → Nurture**

- **Attract**: Build awareness through content, branding, SEO, and advertising
- **Engage**: Convert prospects into meaningful relationships through outreach, events, and personalized campaigns
- **Nurture**: Maintain and deepen relationships to drive long-term business growth

---

## Stack Overview

### Landing Page: `ignitebd-landing`
- **Type**: Static HTML site
- **Purpose**: Marketing/landing page with company information
- **Functionality**: Links to demo version of the stack
- **Deployment**: Separate repo (likely Vercel or static hosting)

### Frontend Repos (Explicit Split)
- **`Ignite-frontend-production`** — Primary application
  - React 18 + Vite, Tailwind CSS, React Router v6
  - Real data: wires directly to `ignitebd-backend` and production tenants
  - Deployed at `https://growth.ignitestrategies.co` (Vercel)
- **`ignitebd-frontend`** — Demo sandbox
  - Hard-coded walkthroughs and prototype flows
  - Keep isolated so it does not pollute production tenant data
  - Useful for concept demos while the main app evolves

### Backend: `ignitebd-backend`
- **Runtime**: Node.js 20+ with Express
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Firebase Admin SDK (server-side)
- **File Upload**: Multer (local storage)
- **Deployment**: Render
- **Production URL**: https://ignitebd-backend.onrender.com
- **Port**: 4000 (development)

### Database
- **Type**: PostgreSQL
- **ORM**: Prisma
- **Schema**: See `docs/IGNITE_SCHEMA_REFERENCE.md` (WIP) and `Ignitebd_stack_devguide.md`
- **Migrations**: Prisma migrations (`prisma migrate dev`)
- **Tenant Scope**: `CompanyHQId` is the canonical identifier. Contacts store it in `crmId`; `ContactList` still uses a legacy `companyId` column for the same value. Prospect/client companies continue to use `contactCompanyId` → `Company`.

---

## Architecture Principles

### Core Architecture Pattern
**Contact + Company First Architecture** - Designed to drive business growth through systematic relationship management.

This architecture emphasizes:
- Multi-tenancy via `CompanyHQId`
- Contact as universal personhood
- Pipeline/stage tracking
- Company relationships (prospect/client companies)

---

## Backend Architecture

### Core Principles

#### 1. Multi-Tenancy Architecture

- `CompanyHQId` is the root container and tenant boundary.
- All data maps to `CompanyHQId`, ensuring strict data isolation.
- Contacts, prospects, clients, and campaigns are all scoped under a single `CompanyHQId`.
- Cross-tenant access is prevented by design; queries must always filter by `CompanyHQId`.

#### 2. Ownership & Management Hierarchy

- `ownerId` represents the super admin with full access and the ability to manage company settings. Owners are *not* contacts.
- `managerId` is delegated by the owner to manage CRM data but cannot alter company settings. This relationship is handled in route logic rather than the schema.

#### 3. Contact Storage & Hydration

- Contacts relate directly to the tenant via `crmId` (stored as the `CompanyHQId`).
- Owner data never surfaces in contact queries, so hydration by `CompanyHQId` is straightforward.
- Contacts are designed for universal personhood—one record follows a person throughout their lifecycle.

#### 4. Pipeline Tracking

- The dedicated `Pipeline` model tracks funnel state with `pipeline` and `stage` string values.
- Each contact can have one pipeline record (`contactId` is unique), enabling simple conversion flows without duplicating contact records.

#### 5. Company Model Positioning

- Prospect/client companies live under `CompanyHQId` via the `Company` model.
- A company record is typically created in tandem with a contact who works there.
- Documents such as proposals, contracts, and invoices attach to the `Company` model, not the contact.

#### 6. CompanyHQ-Scoped Models (Canonical Source)

- `CompanyHQId` is the tenant source of truth. Any model that represents tenant-level configuration (personas, onboarding flags, playbooks) must reference `CompanyHQId`.
- Never tie these models to `Company` (prospect/client) records. Customer companies are external accounts that inherit tenant context from `CompanyHQ`.
- Personas, activation progress, and growth scoring live at the `CompanyHQ` level and radiate down into contact/pipeline workflows. See `docs/persona_feature.md` for the full persona architecture plan.

---

### Schema Structure

#### Owner Model (User/Auth - Firebase)

```prisma
model Owner {
  id          String   @id @default(cuid())
  firebaseId  String   @unique
  name        String?
  email       String?
  photoURL    String?

  ownedCompanies  CompanyHQ[] @relation("OwnerOf")
  managedCompanies CompanyHQ[] @relation("ManagerOf")

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

- `firebaseId` is the universal identifier from Firebase Auth.
- Name, email, and photoURL are stored for quick access without re-querying Firebase.

#### CompanyHQ Model (Root Container - Tenant)

```prisma
model CompanyHQ {
  id          String   @id @default(cuid())

  ownerId     String
  owner       Owner    @relation("OwnerOf", fields: [ownerId], references: [id])
  managerId   String?
  manager     Owner?   @relation("ManagerOf", fields: [managerId], references: [id])

  companyName      String
  companyStreet    String?
  companyCity      String?
  companyState     String?
  companyWebsite   String?
  whatYouDo        String?
  companyIndustry  String?
  companyAnnualRev String?
  yearsInBusiness  String?
  teamSize         String?

  contacts     Contact[]
  contactLists ContactList[]
  companies    Company[]
}
```

- All CRM objects—including contacts, companies, and contact lists—are nested here.
- `CompanyHQ` is the tenant boundary enforcing multi-tenancy.

#### Company Model (Prospect/Client Companies)

```prisma
model Company {
  id          String   @id @default(cuid())
  companyHQId String
  companyHQ   CompanyHQ @relation(fields: [companyHQId], references: [id], onDelete: Cascade)

  companyName      String
  address          String?
  industry         String?
  revenue          Float?
  yearsInBusiness  Int?
  proposalId       String?
  contractId       String?
  invoiceId        String?

  contacts    Contact[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

- Represents companies that contacts work for.
- Stores references to documents exchanged with that company.

#### Contact Model (Universal Personhood – Tenant & Company Links)

```prisma
model Contact {
  id               String       @id @default(cuid())
  crmId            String       // CompanyHQId (tenant identifier)
  firstName        String?
  lastName         String?
  goesBy           String?
  email            String?
  phone            String?
  title            String?
  contactCompanyId String?      // Prospect/client company the contact works for
  buyerDecision    String?
  howMet           String?
  notes            String?
  contactListId    String?
  createdAt        DateTime     @default(now())
  updatedAt        DateTime     @updatedAt
  companyHQ        CompanyHQ    @relation(fields: [crmId], references: [id])
  contactCompany   Company?     @relation(fields: [contactCompanyId], references: [id])
  contactList      ContactList? @relation(fields: [contactListId], references: [id])
  pipeline         Pipeline?
}
```

- Flat structure supports universal personhood and rapid hydration.
- Optional scaffolding fields (`buyerDecision`, `howMet`, `notes`) prepare data for enrichment.
- `crmId` stores the tenant’s `CompanyHQId`. Every contact must have it.
- `contactCompanyId` tracks the external organization the contact works for. That is the field you use when you need “the company the person works for.”

#### Pipeline Model (Intentional Pipeline State)

```prisma
model Pipeline {
  id        String   @id @default(cuid())
  contactId String   @unique
  contact   Contact  @relation(fields: [contactId], references: [id], onDelete: Cascade)

  pipeline  String
  stage     String

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

- Manages conversion state by pipeline and stage identifiers.
- `contactId` uniqueness guarantees one pipeline record per contact.

#### ContactList Model (Grouping Container – Tenant Scoped via `companyId`)

```prisma
model ContactList {
  id        String   @id @default(cuid())
  companyId String         // CompanyHQId (tenant identifier)
  companyHQ CompanyHQ @relation(fields: [companyId], references: [id], onDelete: Cascade)

  name        String
  description String?
  type        String?

  contacts Contact[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

- Lets tenants segment contacts into reusable groupings.
- Contact lists live under the tenant via `companyId` (CompanyHQId). They do **not** point to prospect companies.

#### Product Model (Value Proposition Anchor)

```prisma
model Product {
  id          String    @id @default(cuid())
  companyHQId String
  name        String
  description String?
  valueProp   String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  companyHQ   CompanyHQ @relation(fields: [companyHQId], references: [id], onDelete: Cascade)
  personas    Persona[]
}
```

- Products live at the `CompanyHQ` level. Every product represents a bundle/value proposition we deliver.
- Personas attach to products via `productId` to power value proposition alignment.

#### Persona Model (BusinessIntelligence Alignment)

```prisma
model Persona {
  id                 String    @id @default(cuid())
  companyHQId        String
  name               String
  role               String?
  title              String?
  industry           String?
  goals              String?
  painPoints         String?
  desiredOutcome     String?
  valuePropToPersona String?
  alignmentScore     Int?
  productId          String?
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt
  companyHQ          CompanyHQ @relation(fields: [companyHQId], references: [id], onDelete: Cascade)
  product            Product?  @relation(fields: [productId], references: [id], onDelete: SetNull)
}
```

- Personas are tenant-scoped (`companyHQId`) archetypes.
- `valuePropToPersona` describes how we translate the product value prop for this persona.
- `alignmentScore` (0–100) represents the resonance between product promise and persona needs. Update as feedback rolls in.
- `productId` is optional so personas can exist before we map them to products; once linked, BusinessIntelligence can score resonance.

---

### Architecture Patterns

#### Contact Creation (MVP)

1. Create contact scoped to `CompanyHQId`.
2. Create or find the associated `Company`.
3. Link the contact via `contactCompanyId`.
4. Initialize the contact’s `Pipeline` state.

#### Contact Hydration

- Always filter by `CompanyHQId`.
- Include pipeline filters when needed (`pipeline` and `stage` string values).
- Owner data remains isolated from contact hydration.

```javascript
const contacts = await prisma.contact.findMany({
  where: {
    crmId: companyHQId,
    pipeline: {
      pipeline: 'prospect',
      stage: 'prospect-meeting'
    }
  },
  include: { pipeline: true }
});
```

#### Pipeline Conversion

- Update the existing pipeline record to move a contact through the funnel.
- Use `upsert` to create pipeline entries on demand.

```javascript
await prisma.pipeline.upsert({
  where: { contactId },
  update: {
    pipeline: 'client',
    stage: 'client-onboarding'
  },
  create: {
    contactId,
    pipeline: 'client',
    stage: 'client-onboarding'
  }
});
```

#### Document Attachment

- Proposals, contracts, and invoices link to the `Company` record.
- Keep the contact record focused on the person and their relationship state.

---

### Firebase Authentication & Owner Hydration

#### Owner Creation Flow

- `POST /api/owner/create` finds or creates the owner by `firebaseId`.
- Parses Firebase `displayName` into `name`.
- Stores photo URL for quick retrieval.

#### Owner Hydration Flow

- `GET /api/owner/hydrate` requires Firebase token verification.
- Returns owned and managed `CompanyHQ` records to drive routing decisions.
- Frontend stores `ownerId`, `owner`, `companyHQId`, and `companyHQ` in localStorage.

#### Routing Logic

- Missing `name` routes to `/profilesetup`.
- Missing `CompanyHQ` routes to `/company/create-or-choose`.
- Fully hydrated owners reach `/growth-dashboard`.

#### Profile Setup vs Owner Identity Survey

- **Profile Setup (`/profilesetup`)** collects fallback name data (`PUT /api/owner/:id/profile`).
- **Owner Identity Survey (`/owner-identity-survey`)** captures business preferences (`PUT /api/owner/:id/survey`).
- Both feed into onboarding but handle distinct concerns.

---

### Multi-Tenancy Deep Dive

- Every model includes `CompanyHQId`-based scoping to enforce tenant isolation.
- `ownerId` and `managerId` define access control without polluting contact data.
- Query patterns must always include the tenant filter to prevent cross-tenant leakage.
- Company records are created only in support of contacts, mirroring real-world relationships.

---

### Key Takeaways

1. `CompanyHQId` is the tenant boundary; everything lives under it.
2. Contacts are flat universal personhood records; owners are separate entities.
3. Pipeline conversion happens through the dedicated `Pipeline` model.
4. Companies represent the organizations contacts work for and host document references.
5. Firebase authentication standardizes owner creation, hydration, and onboarding routes.
6. Tenant isolation is guaranteed by filtering all queries through `CompanyHQId`.

---

## Authentication & User Management

### Firebase Authentication Standard
Complete Firebase authentication and user management follows a universal standard across all Ignite builds.

See `FIREBASE-AUTH-AND-USER-MANAGEMENT.md` for:
- Firebase middleware setup
- User creation/hydration routes
- Token verification patterns
- Frontend authentication flow

### Key Patterns

**Pattern A: Entity Creation** (`/api/user/create`)
- Find or create user by Firebase ID
- Called after Firebase sign-in
- No token required (public route)

**Pattern B: Entity Hydration** (`/api/user/hydrate`)
- Load full user profile by Firebase ID
- Requires Firebase token verification
- Used for dashboard/homepage hydration

### Entity Model
- **IgniteBD**: `User` model → `routes/User/userCreateRoute.js`
- Universal personhood connected via Firebase UID

---

## Project Structure

### High-Level Overview

**Frontend**
- `Ignite-frontend-production` (primary) → production experience wired to live APIs
- `ignitebd-frontend` (demo sandbox) → hard-coded walkthroughs/prototypes

**Backend** (`ignitebd-backend`)
- Express server with routes organized by entity (Owner, User, Company, etc.)
- Prisma ORM for database access
- Firebase middleware for authentication
- Services for business logic calculations

### BD Tools Implementation

We’re implementing various BD tools that will be integrated into the backend:

- **Backend Services/Mutations**: Some tools will be driven by backend services that mutate data and perform calculations (e.g., assessment calculations, revenue calculations, target acquisition)
- **CRM Recall Functions**: Other tools are primarily recall functions for CRM data (e.g., contact lists, company information, pipeline tracking)

As these tools are developed, they’ll be added to the backend routes and services as needed.

---

## Development Setup

### Prerequisites
- Node.js 20+
- PostgreSQL database
- Firebase project (for authentication)
- Git

### Frontend Setup (Primary app)

```bash
cd Ignite-frontend-production

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

**Frontend (primary) runs on**: http://localhost:5173

### Demo Sandbox Frontend
- Repo: `ignitebd-frontend`
- Usage: hard-coded walkthroughs; keep separate from production tenant data
- Development commands match Vite defaults (`npm install`, `npm run dev`)
- Deployment (optional) on Vercel for demo-only purposes

### Backend Setup

```bash
cd ignitebd-backend

# Install dependencies
npm install

# Copy environment template
cp .local.env.example .env

# Set up environment variables (for local development)
# DATABASE_URL="postgresql://..."
# FIREBASE_SERVICE_ACCOUNT_KEY="{\"type\":\"service_account\",...}"
# OPENAI_API_KEY="sk-..." (optional, for AI features)
# SESSION_SECRET="your-secret-key" (optional, defaults to 'devdevdev')
# PORT=4000

# Generate Prisma client
npm run db:generate

# Push schema to database (or run migrations)
npm run db:push
# OR
npm run db:migrate

# Run development server
npm run dev

# Build for production
npm run build

# Run production server
npm start
```

**Backend runs on**: http://localhost:4000

### Database Setup

```bash
# Generate Prisma client (after schema changes)
npm run db:generate

# Push schema changes (development)
npm run db:push

# Create migration (production-ready)
npm run db:migrate

# Open Prisma Studio (database GUI)
npm run db:studio
```

### Environment Variables

**Backend** (Render is source of truth for production):
- `DATABASE_URL` - PostgreSQL connection string
- `FIREBASE_SERVICE_ACCOUNT_KEY` - Firebase Admin SDK service account JSON (masked in Render)
- `OPENAI_API_KEY` - OpenAI API key for AI-powered features (masked in Render)
- `SESSION_SECRET` - Secret for cookie sessions (optional, defaults to 'devdevdev' in development)
- `PORT` - Server port (default: 4000, set automatically by Render in production)

**Frontend**:
- Primary app (`Ignite-frontend-production`): no env vars today; Firebase config is hardcoded in `src/config/firebase.js`
- Demo sandbox (`ignitebd-frontend`): same config, stays hard-coded for walkthroughs

---

## Development Workflow

### Local Development

1. **Start Database**: Ensure PostgreSQL is running
2. **Start Backend**: `cd ignitebd-backend && npm run dev`
3. **Start Primary Frontend**: `cd Ignite-frontend-production && npm run dev`
4. **Proxy Configuration**: `Ignite-frontend-production/vite.config.js` proxies `/api/*` to `http://localhost:4000`
5. **Demo Sandbox**: Run `ignitebd-frontend` only when you need the hard-coded walkthrough

### API Integration

All API calls go through `Ignite-frontend-production/src/lib/api.js`:
- **Development**: Base URL `/api` (proxied to `http://localhost:4000` via Vite)
- **Production**: Base URL should point to `https://ignitebd-backend.onrender.com/api`
- **Note**: Demo sandbox hits mocked data—keep its API client isolated
- Axios instance with interceptors
- Request/response logging
- Cookie-based auth support (`withCredentials: true`)

### Code Organization (Frontend)

**Primary App (`Ignite-frontend-production`)**
- Production Attract → Engage → Nurture experience
- Aligns with backend routes; always validate against CompanyHQ scope

**Demo Sandbox (`ignitebd-frontend`)**
- Mirrors feature folders with hard-coded data
- Use for pitch walkthroughs without touching production tenants

---

## Deployment Architecture

```
┌─────────────────────────────────┐
│   ignitebd-landing (HTML)       │
│   Marketing/Landing Page        │
│   - Company info                │
│   - Links to demo               │
└────────────┬────────────────────┘
             │
             │ Links to demo
             ▼
┌─────────────────────────────────┐
│   growth.ignitestrategies.co    │
│   Ignite-frontend-production    │
│   (Primary React App - Vercel)  │
└────────────┬────────────────────┘
             │
             │ API calls / hard-coded demo
             ▼
┌─────────────────────────────────┐
│   ignitebd-backend.onrender.com │
│   ignitebd-backend              │
│   (Express API - Render)        │
└────────────┬────────────────────┘
             │
             │ Database queries
             ▼
┌─────────────────────────────────┐
│   PostgreSQL Database           │
│   (Prisma ORM)                  │
└────────────┬────────────────────┘
             │
             │ 🔜 Production Frontend Cutover
             ▼
┌─────────────────────────────────┐
│   ignitebd-frontend (Vercel)    │
│   Demo Sandbox                  │
└─────────────────────────────────┘
```

### Deployment Flow

1. **Landing Page** (`ignitebd-landing`): Static HTML site with company information
2. **Primary Frontend** (`Ignite-frontend-production`): Production React app
3. **Demo Sandbox** (`ignitebd-frontend`): Optional; keeps hard-coded walkthroughs separate
4. **Backend API** (`ignitebd-backend.onrender.com`): Express API server
5. **Database**: PostgreSQL with Prisma ORM

---

## Build & Deployment

### Frontend Build (Active Rebuild)

```bash
npm run build
```

**Output**: `dist/` directory with optimized production build  
**Deployment**: Vercel (automatic from Git) once we flip the switch

### Backend Build

```bash
npm run build
```

**Build Process**:
1. Generates Prisma client (`prisma generate`)
2. Pushes schema to database (`prisma db push`)

**Deployment**:
- Render (from Git)
- Environment variables set in Render dashboard
- `FIREBASE_SERVICE_ACCOUNT_KEY` must be set in Render

### Production URLs

- **Landing Page**: `ignitebd-landing` repo (separate deployment)
- **Primary Frontend**: https://growth.ignitestrategies.co
- **Demo Sandbox Frontend**: (optional) separate Vercel deployment if needed
- **Backend API**: https://ignitebd-backend.onrender.com

---

## Key Development Patterns

### 1. Company Setup & Management

**Create CompanyHQ** (Tenant Container):
```javascript
POST /api/companyhq/create
Headers: { Authorization: "Bearer <firebaseToken>" }
Body: {
  companyName: "Ignite Strategies",
  ownerId: "owner-id",
  whatYouDo: "Business acquisition services...",
  companyStreet: "2604 N. George Mason Dr.",
  companyCity: "Arlington",
  companyState: "VA 22207",
  companyWebsite: "https://www.ignitestrategies.co",
  companyIndustry: "Professional Services",
  companyAnnualRev: "0-100k",
  yearsInBusiness: "2-5",
  teamSize: "just-me"
}
```

**Response**: Returns `companyHQ` object → Store in localStorage as `companyHQId` and `companyHQ`

**Routes**:
- `/company/create-or-choose` - Choose to create or join company
- `/companyprofile` - Company profile form (creates CompanyHQ)
- `/company/create-success` - Success page after creation

### 2. Contact Management

**Create Contact** (Manual Entry):
```javascript
POST /api/contacts
Headers: { Authorization: "Bearer <firebaseToken>" }
Body: {
  crmId: "company-hq-id",           // tenant CompanyHQId (stored as crmId)
  firstName: "John",
  lastName: "Doe",
  email: "john@example.com",
  phone: "555-1234",
  contactCompany: { companyName: "Acme Corp" },
  status: "Prospect",
  stage: "New",
  lastTouch: "2025-01-15",
  nextTouch: "2025-01-22",
  notes: "Met at conference"
}
```

🚨 **Important**:
- `crmId` in these payloads represents the tenant’s `CompanyHQId`. Always source it from the `companyHQId` localStorage key (or hydrate response).
- The company the person works for must come through `contactCompany`/`contactCompanyId`. Do **not** overload the tenant field with prospect/company IDs.

**Hydrate Contacts**:
```javascript
GET /api/contacts?crmId=xxx
GET /api/contacts?crmId=xxx&pipeline=prospect
GET /api/contacts?crmId=xxx&stage=prospect-meeting
```
- As above, `crmId` in the query string represents the tenant `CompanyHQId`. Use additional filters (e.g., `contactCompanyId`) when you need to target a specific prospect/client company.

### 3. Authentication & Onboarding Flow

Complete Flow:
1. User signs in (Firebase client SDK)
2. `POST /api/owner/create`
3. `GET /api/owner/hydrate` → drives routing
4. `POST /api/companyhq/create` → stores tenant identifiers
5. Dashboard personalization uses localStorage keys

**LocalStorage Keys (canonical)**
- `companyHQId` → tenant identifier (source of truth). Every API call must read from this key.
- `companyHQ` → cached tenant object from hydrate.
- `ownerId` / `owner` → hydrated owner profile.
- Legacy fallback: some flows still write `companyId`; backfill `crmId` in payloads until all components use the new key.

### 4. Multi-Tenancy

- Always filter by the tenant scope (`CompanyHQId`). In Prisma models that still expose `companyId`, remember **only contact lists** use that alias for the tenant ID; contacts now use `crmId`.
- `CompanyHQ` = tenant container, `Company` = prospect/client organization

### 5. Pipeline Tracking

```javascript
// Update Pipeline model (conversion)
PUT /api/pipeline/:contactId
Body: {
  pipeline: "client",
  stage: "client-onboarding"
}
```

---

## Testing & Debugging

### Database Testing

```bash
curl http://localhost:4000/db-test
npm run db:studio
```

### API Testing

```bash
curl http://localhost:4000/health
curl https://ignitebd-backend.onrender.com/health
curl -H "Authorization: Bearer <token>" http://localhost:4000/api/user/hydrate
curl -H "Authorization: Bearer <token>" https://ignitebd-backend.onrender.com/api/user/hydrate
```

### Frontend Debugging

- React DevTools for component inspection
- Network tab for API calls
- Console logs for Firebase auth state

---

## Related Documentation

- **`docs/IGNITE_SCHEMA_REFERENCE.md`** (new home for schema deep-dives)
- **`docs/dealpipeline.md`** - Deal Pipeline data flow, MVP scope, roadmap
- **`docs/persona_feature.md`** - Persona architecture, schema, and UX reference
- **`docs/IgniteBusinessIntelligence.md`** - Product ↔ Persona alignment layer overview
- **`FIREBASE-AUTH-AND-USER-MANAGEMENT.md`** - Authentication patterns and user management
- **`Ignite-frontend-production/README.md`** - Primary frontend quick start
- **`ignitebd-frontend/README.md`** - Demo sandbox instructions

---

## Next Steps

This development guide drives:
- ✅ Navigation Flow Documentation (`IgniteBD_Navigation_Flow.md`)
- ✅ API reference consolidation
- 🔄 Component documentation as we port personas/outreach into `Ignite-frontend-production`
- 🔜 Deployment cutover checklist for retiring the demo sandbox when ready

---

**Last Updated**: November 2025  
**Stack Version**: 1.1.0 (doc moved to backend)  
**Architecture**: Contact + Company First  
**Multi-Tenancy**: CompanyHQ-scoped  
**Authentication**: Firebase Auth (Universal Standard)  
**Current Status**: Active persona rebuild in `Ignite-frontend-production`, demo sandbox frozen in `ignitebd-frontend`


