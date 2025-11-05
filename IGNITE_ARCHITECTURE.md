# IgniteBD Architecture

## Premise

**Contact + Company First Architecture to Drive Business Growth**

The IgniteBD backend is built on a **contact + company first** architecture designed to drive business growth. This architecture prioritizes contacts as universal personhood containers while maintaining pipeline/stage tracking for conversion state.

---

## Core Principles

### 1. Multi-Tenancy Architecture

**CompanyHQId - The Entire Container**

- **CompanyHQId** = The root container for multi-tenancy
- **Everything maps to CompanyHQId** - all data is nested under it
- This is the top-level company container that owns everything
- Contacts, prospects, clients, campaigns - all scoped to CompanyHQId
- **The entire Ignite platform hosts multiple CompanyHQs** (actual customers using the platform)
- **Each CompanyHQ is a tenant** - they own and manage their own CRM data
- **Data isolation**: Each CompanyHQ can only hydrate/access people and data scoped to their CompanyHQId
- **No cross-tenant access**: CompanyHQ A cannot see or access CompanyHQ B's data

### 2. Ownership & Management Hierarchy

**Two-Tier Access Control:**

1. **ownerId** - Super admin, mapped to company as the literal owner
   - Full access to everything
   - Can change company settings
   - Original creator/owner of the company
   - **Important**: Owner is NOT a Contact - separate model, separate concern

2. **managerId** - Delegated by owner to add people
   - Can manage CRM stack
   - Cannot change company settings
   - Assigned by ownerId (handled in routes/logic, not schema relationships)

### 3. Contact Storage & Hydration

**Contact → CompanyHQId Direct Relationship:**

- **Contact has `companyId` = CompanyHQId** (direct, no intermediate layer)
- **Hydrate by CompanyHQId** - ownerId is on CompanyHQ model, not Contact model, so no filtering needed
- **Owner is NOT a Contact** - ownerId will never appear in Contact queries
- Simple, clean hydration: `Contact.companyId = CompanyHQ.id (CompanyHQId)`

**Hydration by String Values:**
- Can hydrate contacts by filtering on `pipeline` and `stage` string values
- Example: `GET /api/contacts?companyId=xxx&pipeline=prospect&stage=prospect-meeting`
- String values work perfectly for filtering and hydrating contacts

### 4. Contacts as Universal Personhood

**Contacts are flat** to enable efficient hydration and universal personhood management.

- **Flat Structure**: Contact model contains core person data (firstName, lastName, email, phone, title) plus smart scaffolding fields (buyerDecision, howMet) for structured context
- **buyerDecision**: String value referencing buyer decision maker types from buyerconfig.js (e.g., 'senior-person', 'product-user', 'has-money')
- **No Nested Relationships**: Contacts don't nest other entities - they ARE the person
- **Universal Identity**: One Contact can represent a person across their entire journey (prospect → client → ecosystem partner)
- **Same contact record** moves through different pipelines/stages - no separate conversion models needed

### 5. Contact Pipeline Tracking (MVP)

**Pipeline Model - Intentional Pipeline State:**

- **Pipeline model** - Separate model that hosts `pipeline` and `stage` fields, lives inside Contact via `contactId`
- **pipeline**: Pipeline configuration identifier (string value) - e.g., 'prospect', 'client', 'collaborator', 'institution'
- **stage**: Current stage in pipeline (string value) - e.g., 'prospect-interest', 'client-onboarding'
- **One Pipeline per Contact** - Each contact can have one Pipeline record (optional - `contactId` is unique)
- **Conversion handled by Pipeline model** - Update Pipeline record to move contact through funnel
- When a contact moves from prospect to client: update the Pipeline record's `pipeline='client'` and `stage='client-onboarding'`
- Same contact record, Pipeline state changes - more intentional than direct fields on Contact

### 6. Company Model - Prospect/Client Companies

**Company records represent companies that prospects/clients work for:**

- **Company records are ONLY created when we create a Contact** associated with that company
- **Company is nested under CompanyHQId** via `companyHQId` field (multi-tenancy)
- **Company has proposalId, contractId, invoiceId** - documents sent to the company
- **Company has company data** - address, revenue, industry (similar to CompanyHQ)
- A contact's `contactCompanyId` references the `Company.id` they work for

### 7. CompanyHQ-Scoped Models (Persona, etc.)

**Some models are relational to CompanyHQ only (not to prospect/client Companies):**

- **Persona** - Scoped to CompanyHQ only (not to individual prospect/client companies)
- **Future models** may also be CompanyHQ-scoped (upserted when needed)
- **Real-world matching**: Each contact will either be in a persona or not - matching logic to be determined

---

## Schema Structure

### Owner Model (User/Auth - Firebase)

```prisma
model Owner {
  id          String   @id @default(cuid())
  firebaseId  String   @unique  // Firebase auth ID (for authentication)
  name        String?  // Full name (from Firebase displayName or firstName/lastName)
  email       String?  // Email address (from Firebase)
  photoURL    String?  // Profile photo URL (from Firebase - stored for quick access)
  
  // Reverse relations
  ownedCompanies CompanyHQ[] @relation("OwnerOf")
  managedCompanies CompanyHQ[] @relation("ManagerOf")
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

**Firebase Integration:**
- `firebaseId` = Firebase UID (universal identifier)
- `name` = Parsed from Firebase `displayName` (format: "First Last") or set manually
- `email` = From Firebase auth
- `photoURL` = From Firebase `photoURL` - **Stored in Owner model for quick access** (no need to fetch from Firebase every time)
- **DisplayName Parsing**: `displayName?.split(' ')[0]` for firstName, `displayName?.split(' ')[1]` for lastName, then combined into `name`

### CompanyHQ Model (Root Container - Tenant)

```prisma
model CompanyHQ {
  id          String   @id @default(cuid())  // This is CompanyHQId - the root container
  
  // Ownership & Management
  ownerId     String   // Super admin - literal owner (required)
  owner       Owner    @relation("OwnerOf", fields: [ownerId], references: [id])
  managerId   String?  // Manager delegated by owner to add people (optional)
  manager     Owner?   @relation("ManagerOf", fields: [managerId], references: [id])
  
  // CompanyHQ data
  companyName String
  companyStreet String?    // Street address
  companyCity String?      // City
  companyState String?     // State, ZIP
  companyWebsite String?   // Website URL (for LinkedIn extraction, etc.)
  whatYouDo String?        // What the company does (description)
  companyIndustry String?
  companyAnnualRev String?  // Annual revenue range (e.g., "0-100k", "100k-500k", "500k-1m", "1m-5m", "5m-10m", "10m+")
  yearsInBusiness String?   // Years in business range (e.g., "0-1", "2-5", "6-10", "11-20", "20+")
  teamSize String?         // Team size (e.g., "just-me", "2-10", "11-50", "51-200", "200+")
  
  // All CRM data nested under CompanyHQId
  contacts    Contact[]
  contactLists ContactList[]
  companies   Company[]  // Prospect/client companies nested under this CompanyHQ
  // ... all other CRM entities
}
```

### Company Model (Prospect/Client Companies)

```prisma
model Company {
  id          String   @id @default(cuid())
  companyHQId String   // CompanyHQId - scoped to tenant (multi-tenancy)
  companyHQ   CompanyHQ @relation(fields: [companyHQId], references: [id], onDelete: Cascade)
  
  // Company data (similar to CompanyHQ)
  companyName String
  address     String?
  industry    String?
  revenue     Float?
  yearsInBusiness Int?
  
  // Document references (for sending/attaching to companies)
  proposalId String?  // Reference to proposal sent to this company
  contractId String?  // Reference to contract for this company
  invoiceId  String?  // Reference to invoice for this company
  
  // Reverse relation
  contacts    Contact[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### Contact Model (Universal Personhood)

```prisma
model Contact {
  id          String   @id @default(cuid())
  companyId   String   // CompanyHQId - direct relationship, no intermediate layer
  companyHQ   CompanyHQ @relation(fields: [companyId], references: [id])
  
  // Core person data (flat structure)
  firstName   String?
  lastName    String?
  goesBy      String?  // Preferred name (to avoid robot-sounding names)
  email       String?  // NOT required - can enrich later (not like HubSpot)
  phone       String?
  title       String?
  
  // Company the contact works for (prospect/client company)
  contactCompanyId String?  // Reference to Company (the company they work for)
  contactCompany   Company? @relation(fields: [contactCompanyId], references: [id], onDelete: SetNull)
  
    // Smart scaffolding fields (can be null, prepared for AI/structured data)
  buyerDecision String?  // Buyer decision maker type (string value from buyerconfig.js) - e.g., 'senior-person', 'product-user', 'has-money'
  howMet        String?  // How we met this contact
  photoURL      String?  // Profile photo (e.g., from LinkedIn - can hydrate/enrich)

  // Pipeline tracking (intentional - pipeline state lives in Pipeline model)
  pipeline Pipeline?
  
  // Contact List (container for grouping contacts)
  contactListId String?
  contactList   ContactList? @relation(fields: [contactListId], references: [id], onDelete: SetNull)
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### Pipeline Model (Intentional Pipeline State)

```prisma
model Pipeline {
  id          String   @id @default(cuid())
  contactId   String   @unique  // One pipeline per contact - lives inside contact
  contact     Contact  @relation(fields: [contactId], references: [id], onDelete: Cascade)
  
  pipeline    String   // Pipeline configuration identifier (string value from pipelineconfig.js)
  stage       String   // Current stage in pipeline (string value from stageconfig.js)
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### ContactList Model (Container for Grouping Contacts)

```prisma
model ContactList {
  id          String   @id @default(cuid())
  companyId   String   // CompanyHQId - scoped to company
  companyHQ   CompanyHQ @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  name        String
  description String?
  type        String?  // Optional type/category
  
  // Reverse relation
  contacts    Contact[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

---

## Architecture Patterns

### Pattern 1: Contact Creation (MVP)

**When creating a contact:**
1. Create Contact record with `companyId` (CompanyHQId - scoped to Ignite company)
2. Create or find Company record (prospect/client company) - nested under CompanyHQId
3. Link Contact to Company via `contactCompanyId`
4. Set `pipeline` and `stage` to track position in pipeline

### Pattern 2: Contact Hydration

**Hydrate by CompanyHQId - Clean and Simple:**

- **Owner is NOT a Contact** - ownerId is on CompanyHQ model, not Contact model
- **No filtering needed** - Contact queries won't include owner data
- Hydrate contacts directly by CompanyHQId
- Filter by string values (pipeline/stage) for specific lists

**Example Hydration Patterns:**
```javascript
// ✅ List all contacts for company (hydrate by CompanyHQId)
const contacts = await prisma.contact.findMany({
  where: {
    companyId: companyHQId  // Direct CompanyHQId filter
  }
});

  // ✅ List contacts by pipeline (via Pipeline model)
  const pipelineContacts = await prisma.contact.findMany({
    where: {
      companyId: companyHQId,  // Multi-tenancy filter
      pipeline: {
        pipeline: 'prospect'  // Filter by Pipeline model's pipeline field
      }
    },
    include: {
      pipeline: true  // Include Pipeline data
    }
  });

  // ✅ List contacts by stage (via Pipeline model)
  const stageContacts = await prisma.contact.findMany({
    where: {
      companyId: companyHQId,  // Multi-tenancy filter
      pipeline: {
        stage: 'prospect-meeting'  // Filter by Pipeline model's stage field
      }
    },
    include: {
      pipeline: true  // Include Pipeline data
    }
  });

// ✅ Single contact: Hydrate by contact ID
const contact = await prisma.contact.findUnique({
  where: { id: contactId }
});

// ✅ Hydrate company with contacts (owner NOT included in contacts)
const companyHQ = await prisma.companyHQ.findUnique({
  where: { id: companyHQId },
  include: {
    contacts: true  // Only contacts - owner is separate on CompanyHQ model
  }
});
```

---

## Firebase Authentication & Owner Hydration

### Owner Creation Flow

**POST /api/owner/create** (Pattern A - Find or Create):
- Receives Firebase auth data (firebaseId, email, firstName, lastName, photoURL)
- Finds existing Owner by `firebaseId`
- If not found, creates new Owner record
- Parses `displayName` into `name` field (or uses firstName/lastName)
- Stores `photoURL` from Firebase for quick access
- Returns Owner object

### Owner Hydration Flow

**GET /api/owner/hydrate** (Pattern B - Universal Hydration):
- Requires `verifyFirebaseToken` middleware
- Gets `firebaseId` from verified token (`req.user.uid`)
- Finds Owner by `firebaseId` with all relations:
  - `ownedCompanies` - CompanyHQs where ownerId matches
  - `managedCompanies` - CompanyHQs where managerId matches
- Returns full Owner data for routing decisions

**Welcome Page Routing Logic** (Frontend):
1. Calls `GET /api/owner/hydrate` with Firebase token
2. Checks Owner record:
   - **If no `name`** → Route to `/profilesetup` (fallback - collect firstName/lastName)
   - **If no `ownedCompanies`** → Route to `/company/create-or-choose` (no CompanyHQ)
   - **If all complete** → Route to `/growth-dashboard` (home base)

**Profile Setup vs Owner Identity Survey - Separation of Concerns:**

- **Profile Setup (`/profilesetup`)**:
  - **Purpose**: Fallback to collect basic profile data (firstName, lastName)
  - **When**: If Firebase doesn't provide name or name is missing/corrupted
  - **Data**: Pure profile data (firstName, lastName → combined into `name`)
  - **Route**: `PUT /api/owner/:id/profile` to update owner name
  - **Next Step**: Routes to company setup after name is collected

- **Owner Identity Survey (`/owner-identity-survey`)**:
  - **Purpose**: Optional survey to understand owner's business identity and preferences
  - **When**: After signup, optional step (can skip)
  - **Data**: Business characteristics:
    - `ownerType` (founder, marketing, bd-manager, solo, explorer)
    - `growthSpeed` (fast, steady, slow, flexible)
    - `managementStyle` (hands-on, delegate, collaborative, strategic)
  - **Route**: `PUT /api/owner/:id/survey` to save owner identity data
  - **Next Step**: Routes to company setup
  - **Note**: NOT about profile data - that comes from Firebase. This is about understanding the owner's business approach.

**Key Points:**
- `photoURL` is stored in Owner model - don't need to fetch from Firebase every time
- Firebase provides: `displayName`, `email`, `photoURL`
- Owner model stores: `name` (parsed from displayName), `email`, `photoURL`
- Routing based on what's missing (name check is universal routing logic, not a stored flag)
- Profile Setup = Fallback for name collection
- Owner Identity Survey = Optional "get to know you" business survey

### Company Setup - Two Separate Flows

**Flow 1: Create Company (Primary Onboarding)**
- **Path**: Splash → Welcome → Profile Setup (if needed) → Owner Identity Survey (optional) → `/company/create-or-choose` → `/companyprofile`
- **Who**: Founders, owners, new businesses
- **UI**: Create is the primary, prominent action
- **Purpose**: Full onboarding flow for company creators

**Flow 2: Join Company (Separate Onboarding Route)**
- **Path**: Direct link with invite code → `/joincompany` (bypasses Splash/Welcome)
- **Who**: Team members, employees joining existing companies
- **How**: Company admin sends invite link via email with invite code
- **Route**: `/joincompany` - standalone onboarding route
- **Purpose**: Quick onboarding for team members joining existing CompanyHQ
- **Note**: This is NOT part of the main onboarding flow - it's a separate entry point for invitees

**Key Separation:**
- **Create** = Main onboarding flow (Splash → Welcome → Setup)
- **Join** = Separate onboarding route (invite link → join page)
- Join route bypasses Splash/Welcome - direct access with invite code

---

## Route Architecture

### Owner Routes

```
POST   /api/owner/create              → Find or create Owner by firebaseId
PUT    /api/owner/:id/profile        → Update Owner profile (name, email) - fallback for name collection
PUT    /api/owner/:id/survey          → Save Owner identity survey (ownerType, growthSpeed, managementStyle)
GET    /api/owner/hydrate             → Hydrate Owner with full data (requires token)
```

### Contact Routes

```
GET    /api/contacts?companyId=xxx              → List all contacts for company (filtered by CompanyHQId)
GET    /api/contacts?companyId=xxx&pipeline=xxx → List contacts by pipeline (string value)
GET    /api/contacts?companyId=xxx&stage=xxx    → List contacts by stage (string value)
GET    /api/contacts?companyId=xxx&pipeline=xxx&stage=xxx → List contacts by pipeline AND stage
GET    /api/contacts/:contactId                 → Get single contact
POST   /api/contacts                            → Create contact (body: { companyId (CompanyHQId), firstName, lastName, contactCompanyId?, pipeline?, stage?, ... })
PUT    /api/contacts/:contactId                 → Update contact - can update pipeline/stage
DELETE /api/contacts/:contactId                 → Delete contact
```

### Company Routes (Prospect/Client Companies)

```
GET    /api/companies?companyHQId=xxx           → List all companies for CompanyHQ (filtered by CompanyHQId)
GET    /api/companies/:companyId                → Get single company
POST   /api/companies                           → Create company (body: { companyHQId, companyName, address?, industry?, revenue?, ... })
PUT    /api/companies/:companyId                → Update company
DELETE /api/companies/:companyId                → Delete company
```

---

## Data Flow Examples

### Example 1: Creating a Prospect Contact with Company

```javascript
// Create Company (prospect/client company) - nested under CompanyHQId
const company = await prisma.company.create({
  data: {
    companyHQId: 'company-hq-id',  // CompanyHQId - nested under tenant
    companyName: 'Acme Corp',
    address: '123 Main St',
    industry: 'Technology',
    revenue: 5000000
  }
});

  // Create Contact (universal personhood) - stored under CompanyHQId, linked to Company
  const contact = await prisma.contact.create({
    data: {
      companyId: 'company-hq-id',      // CompanyHQId - direct relationship
      contactCompanyId: company.id,    // Company they work for
      firstName: 'John',
      lastName: 'Doe',
      goesBy: 'Johnny',
      email: 'john@acmecorp.com',
      phone: '555-1234',
      title: 'CEO',
      pipeline: {
        create: {
          pipeline: 'prospect',        // Pipeline model - intentional state
          stage: 'prospect-interest'   // Stage in pipeline
        }
      }
    },
    include: {
      pipeline: true  // Include Pipeline data
    }
  });
```

### Example 2: Hydrating Contacts by CompanyHQId

```javascript
// ✅ List all contacts for company (hydrate by CompanyHQId)
const allContacts = await prisma.contact.findMany({
  where: {
    companyId: companyHQId  // Direct CompanyHQId - no owner data included
  },
  include: {
    contactCompany: true  // Include the Company they work for
  }
});

// ✅ List contacts by pipeline (string value)
const prospectContacts = await prisma.contact.findMany({
  where: {
    companyId: companyHQId,
    pipeline: 'prospect'  // String value filters perfectly
  }
});
```

### Example 3: Moving Contact Through Pipeline (Conversion)

```javascript
// Update Pipeline model (conversion - same contact record, Pipeline state changes)
await prisma.pipeline.update({
  where: { contactId: contactId },  // Find Pipeline by contactId
  data: {
    pipeline: 'client',           // Convert from 'prospect' to 'client'
    stage: 'client-onboarding'    // Move to client onboarding stage
  }
});

// Or if Pipeline doesn't exist yet, create it
await prisma.pipeline.upsert({
  where: { contactId: contactId },
  update: {
    pipeline: 'client',
    stage: 'client-onboarding'
  },
  create: {
    contactId: contactId,
    pipeline: 'client',
    stage: 'client-onboarding'
  }
});

// Same contact record, Pipeline state changes - more intentional than direct fields
```

### Example 4: Sending Proposal to Company

```javascript
// Update Company with proposalId
await prisma.company.update({
  where: { id: companyId },
  data: {
    proposalId: 'proposal-123'  // Link proposal to company
  }
});
```

---

## Multi-Tenancy

**CompanyHQId-First Storage & Hydration:**

### Multi-Tenancy Overview
- **The entire Ignite platform hosts multiple CompanyHQs** (actual customers using the platform)
- **Each CompanyHQ is a tenant** - they own and manage their own CRM data
- **Data isolation**: Each CompanyHQ can only hydrate/access people and data scoped to their CompanyHQId
- **No cross-tenant access**: CompanyHQ A cannot see or access CompanyHQ B's data

### Storage (Multi-Tenancy)
- **Everything stored under CompanyHQId** (the root container)
- All contacts, companies, contact lists scoped to `companyId` (CompanyHQId)
- `companyId` = CompanyHQId = The customer company's tenant identifier
- Each tenant's data is isolated by their CompanyHQId
- **Company records (prospect/client companies) are nested under CompanyHQId** via `companyHQId` field

### Hydration (CompanyHQId Direct)
- **Hydrate by CompanyHQId** - direct relationship, clean and simple
- **Owner is NOT a Contact** - ownerId is on CompanyHQ model, so Contact queries won't include owner data
- **No filtering needed** - Contact.companyId = CompanyHQId, ownerId is separate
- **Can hydrate by string values** - `pipeline` and `stage` string values work perfectly for filtering
- **Always filter by CompanyHQId** in all queries for security/isolation - ensures tenants only see their own data
- **Tenant isolation enforced**: Every query must include `companyId: companyHQId` or `companyHQId: companyHQId` to prevent cross-tenant data access

### Access Control Hierarchy

1. **ownerId** (Super Admin)
   - Literal owner of the company
   - Full access to everything
   - Can change company settings
   - Original creator/owner
   - **Separate from Contact model** - not a contact, never will be

2. **managerId** (Delegated Manager)
   - Assigned by ownerId (handled in routes/logic)
   - Can manage CRM stack
   - Cannot change company settings

### Company Relationships
- Owner can have multiple CompanyHQs
- Manager assignment handled in application logic (routes), not schema relationships
- **Company records (prospect/client) are ONLY created when we have a Contact** associated with that company

---

## Key Takeaways

1. ✅ **CompanyHQId = Root Container** - Everything stored under CompanyHQId (multi-tenancy). Each CompanyHQ is a tenant - actual customers using the platform. Data isolation enforced - tenants can only access their own CompanyHQId data.
2. ✅ **Company = Prospect/Client Companies** - Companies that contacts work for, nested under CompanyHQId. Only created when we have a Contact associated with that company.
3. ✅ **Contact → CompanyHQId Direct** - Contact has `companyId` = CompanyHQId directly, no intermediate layer needed
4. ✅ **Contact → Company** - Contact has `contactCompanyId` = Company.id (the company they work for)
5. ✅ **Hydrate by CompanyHQId** - Clean and simple, no need to avoid ownerId (owner is separate model)
6. ✅ **ownerId = Super Admin** - Literal owner, mapped to CompanyHQ, full access, **NOT a Contact**
7. ✅ **managerId = Delegated** - Assigned by owner in routes/logic, can manage CRM, cannot change company settings
8. ✅ **Contacts are flat** - Simple hydration, universal personhood
9. ✅ **Pipeline tracking (MVP)** - `pipeline` and `stage` (string values) track funnel position and handle conversion
10. ✅ **Conversion via pipeline/stage** - Same contact record moves through pipelines/stages, no separate conversion models needed
11. ✅ **String Values Work** - Can hydrate/filter contacts by `pipeline` and `stage` string values perfectly
12. ✅ **Company has documents** - `proposalId`, `contractId`, `invoiceId` on Company model (not Contact)

---

**Last Updated**: January 2025  
**Architecture Pattern**: Contact + Company First  
**Multi-Tenancy**: Company-scoped (`companyId` = CompanyHQId)  
**Hydration Pattern**: CompanyHQId direct (owner is separate model, no filtering needed)  
**Contact Model**: Flat structure for universal personhood  
**Company Model**: Prospect/client companies nested under CompanyHQId  
**Conversion**: Handled via pipeline/stage strings, no separate models
