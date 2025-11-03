# Backend Architecture for IgniteBD

## Overview
Standardized patterns for scaffolding backend routes, folders, and features in `ignitebd-backend`. This backend serves the `ignitebd-frontend` application.

**Key Decision**: **Use `companyId` for multi-tenancy** - The schema already uses `companyId` throughout all models. This is the established pattern.

---

## Core Backend Structure

### Root Files
```
ignitebd-backend/
├── index.js                       # Main entry point - imports and registers all routes
├── package.json                   # Dependencies
├── .env                           # Environment variables
├── prisma/
│   └── schema.prisma              # Database schema (source of truth for models)
├── middleware/
│   ├── authMiddleware.js          # Firebase auth verification
│   └── authRoute.js               # Auth routes
├── services/                      # Business logic & calculations
├── routes/                        # All API routes organized by feature
│   ├── Admin/                     # Admin-only routes (if needed)
│   ├── Contacts/                  # Contact & ContactList management
│   ├── Outreach/                  # Campaigns, Templates, Email
│   ├── Personas/                  # Persona management
│   ├── Proposals/                 # Proposal management
│   ├── Events/                    # Event management
│   ├── Meetings/                  # Meeting scheduling & analytics
│   ├── Ads/                       # Ads campaign management
│   ├── Attract/                   # Branding, Content, SEO
│   └── Relationship/              # Ecosystem & engagement
└── db.js                          # Prisma client initialization
```

---

## Multi-Tenancy: CompanyId Pattern

**Decision**: All data is scoped to `companyId`. Every model that represents company-specific data must include `companyId`.

**Schema Pattern**:
```prisma
model FeatureModel {
  id        String   @id @default(cuid())
  companyId String
  company   Company  @relation(fields: [companyId], references: [id])
  // ... other fields
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**Route Pattern**: All routes should filter/scope by `companyId`:
```javascript
// GET /api/contacts?companyId=xxx
router.get('/', async (req, res) => {
  const { companyId } = req.query;
  const contacts = await prisma.contact.findMany({
    where: { companyId }
  });
});
```

---

## Route Architecture

**Key Concept**: Routes are organized by **feature domain**, not by HTTP method. Each feature domain gets a folder with one or more route files.

### Route Folder Naming Convention

**Standard Pattern**: PascalCase folder names

```
routes/
├── Contacts/                  # Contact & ContactList CRUD
├── Outreach/                  # Campaigns, Templates, Email campaigns
├── Personas/                  # Persona builder & management
├── Proposals/                 # Proposal creation & management
├── Events/                    # Event creation & management
├── Meetings/                  # Meeting scheduling, prep, analytics
├── Ads/                       # Ads dashboard & campaigns
├── Attract/                   # Branding, Content, SEO
├── Relationship/              # Ecosystem, Engage, Relationship dashboard
└── Assessment/                # Assessment routes (already exists)
```

### Route File Naming Convention

**Standard Pattern**: `[feature][Action]Route.js` (camelCase file, PascalCase folder)

**Examples**:
- `Contacts/contactListRoute.js` - Contact list CRUD
- `Contacts/contactRoute.js` - Individual contact CRUD
- `Outreach/campaignRoute.js` - Campaign CRUD
- `Outreach/templateRoute.js` - Template CRUD
- `Outreach/emailRoute.js` - Email sending
- `Personas/personaRoute.js` - Persona CRUD
- `Proposals/proposalRoute.js` - Proposal CRUD
- `Events/eventRoute.js` - Event CRUD
- `Meetings/meetingRoute.js` - Meeting CRUD

**Why This Pattern**:
- ✅ **Grouped by feature** - All related endpoints in one place
- ✅ **Clear naming** - File name describes functionality
- ✅ **Scalable** - Easy to add new route files per feature
- ✅ **No filename conflicts** - PascalCase folder + camelCase file

---

## Route File Structure

### Standard Route File Template

```javascript
// [Feature] [Action] Route
// Description of what this route file does

import express from 'express';
import prisma from '../../db.js';
import { verifyFirebaseToken } from '../../middleware/authMiddleware.js';

const router = express.Router();

/**
 * GET /api/[feature]/[endpoint]
 * Description of endpoint
 * Query params: ?companyId=xxx&param1=value1
 */
router.get('/[endpoint]', verifyFirebaseToken, async (req, res) => {
  try {
    const { companyId } = req.query; // or req.params
    
    if (!companyId) {
      return res.status(400).json({ 
        error: 'companyId is required' 
      });
    }
    
    // Your business logic here
    const result = await prisma.modelName.findMany({
      where: { companyId }
    });
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('❌ ERROR PREFIX:', error);
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * POST /api/[feature]/[endpoint]
 * Create new record
 * Body: { companyId: 'xxx', field1: value1, field2: value2 }
 */
router.post('/[endpoint]', verifyFirebaseToken, async (req, res) => {
  try {
    const { companyId, field1, field2 } = req.body;
    
    if (!companyId) {
      return res.status(400).json({
        error: 'companyId is required'
      });
    }
    
    // Validation
    if (!field1) {
      return res.status(400).json({
        error: 'Field1 is required'
      });
    }
    
    // Create record
    const result = await prisma.modelName.create({
      data: { 
        companyId,
        field1, 
        field2 
      }
    });
    
    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('❌ ERROR PREFIX:', error);
    res.status(500).json({
      error: error.message
    });
  }
});

export default router;
```

---

## Route Registration in index.js

**Key Points**:
- Import each router at the top
- Register routes with `app.use('/[prefix]', router)`
- **ORDER MATTERS** - More specific routes must come before catch-all routes (e.g., `/:id`)
- Add comments explaining each route block

### Registration Pattern

```javascript
// index.js

import express from 'express';
import cors from 'cors';
import cookieSession from 'cookie-session';

// Import route files
import contactListRouter from './routes/Contacts/contactListRoute.js';
import campaignRouter from './routes/Outreach/campaignRoute.js';
// ... more imports

const app = express();
const PORT = process.env.PORT || 4000;

// CORS configuration
app.use(cors({
  origin: ['http://localhost:5173', 'https://ignitebd-frontend.vercel.app'],
  credentials: true
}));

app.use(express.json());
app.use(cookieSession({
  name: 'session',
  keys: [process.env.SESSION_SECRET || 'devdevdev'],
  maxAge: 24 * 60 * 60 * 1000,
  httpOnly: true,
  sameSite: 'lax'
}));

// Feature routes - ORDER MATTERS!
app.use('/contacts', contactListRouter);      // Most specific first
app.use('/outreach', campaignRouter);
// ... more routes

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Ignite Activation API is running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🔥 Ignite Activation API running on port ${PORT}`);
});
```

---

## Common Route Patterns

### 1. CRUD Routes (with companyId)

**Standard CRUD Pattern**:
```javascript
GET    /api/contacts?companyId=xxx          → List all for company
GET    /api/contacts/:id                    → Get one (must belong to companyId)
POST   /api/contacts                        → Create (body includes companyId)
PUT    /api/contacts/:id                    → Update full
PATCH  /api/contacts/:id                    → Update partial
DELETE /api/contacts/:id                    → Delete
```

### 2. Company-Scoped Queries

**Always filter by companyId**:
```javascript
router.get('/', verifyFirebaseToken, async (req, res) => {
  const { companyId } = req.query;
  
  const items = await prisma.model.findMany({
    where: { companyId }
  });
});
```

### 3. Nested Resources

**For nested resources (e.g., contacts in a list)**:
```javascript
GET /api/contact-lists/:listId/contacts     → Get contacts in list
POST /api/contact-lists/:listId/contacts     → Add contact to list
DELETE /api/contact-lists/:listId/contacts/:contactId → Remove from list
```

---

## Authentication Patterns

### Firebase Middleware

**For User-Facing Routes**:
```javascript
import { verifyFirebaseToken } from '../../middleware/authMiddleware.js';

router.get('/protected-route', verifyFirebaseToken, async (req, res) => {
  const firebaseId = req.user?.uid; // Extracted by middleware
  const { companyId } = req.query;
  
  // Verify user has access to this company
  const user = await prisma.user.findUnique({
    where: { firebaseId },
    include: {
      adminOf: { where: { id: companyId } },
      staffOf: { where: { id: companyId } }
    }
  });
  
  if (!user.adminOf.length && !user.staffOf.length) {
    return res.status(403).json({ error: 'Access denied' });
  }
});
```

---

## Error Handling Pattern

**Standard Error Response**:
```javascript
try {
  // Business logic
  res.json({ success: true, data: result });
} catch (error) {
  console.error('❌ ERROR PREFIX:', error);
  res.status(500).json({
    error: error.message
  });
}
```

**Validation Errors** (400 Bad Request):
```javascript
if (!companyId) {
  return res.status(400).json({
    error: 'companyId is required'
  });
}
```

**Not Found Errors** (404):
```javascript
const record = await prisma.model.findUnique({
  where: { id, companyId }
});

if (!record) {
  return res.status(404).json({
    error: 'Record not found'
  });
}
```

**Authorization Errors** (403):
```javascript
// Verify user has access to company
if (!hasAccess) {
  return res.status(403).json({
    error: 'Access denied to this company'
  });
}
```

---

## Schema-First Development

**CRITICAL**: Always define schema FIRST, then routes follow

**Process**:
1. Define Prisma models in `schema.prisma`
2. Run `npx prisma generate` to create Prisma Client
3. Create route files using Prisma models
4. Test routes

---

## Adding a New Feature

### Step 1: Define Schema
```prisma
// prisma/schema.prisma
model NewFeature {
  id        String   @id @default(cuid())
  companyId String
  company   Company  @relation(fields: [companyId], references: [id])
  name      String
  // ... fields
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### Step 2: Generate Prisma Client
```bash
npx prisma generate
npx prisma db push
```

### Step 3: Create Route File
```bash
# Create folder (if new feature domain)
mkdir routes/NewFeature

# Create route file
touch routes/NewFeature/newFeatureRoute.js
```

### Step 4: Implement Routes
- Copy template from this document
- Implement CRUD endpoints
- Add companyId filtering
- Add authentication

### Step 5: Register in index.js
```javascript
// Import
import newFeatureRouter from './routes/NewFeature/newFeatureRoute.js';

// Register
app.use('/newfeature', newFeatureRouter);
```

---

## Frontend Page to API Route Mapping

Based on frontend structure, here are the routes needed:

| Frontend Page/Folder | API Route | Status |
|---------------------|-----------|--------|
| `/contacts/ContactListManager` | `/contact-lists` | TODO |
| `/contacts/ContactListDetail` | `/contact-lists/:id` | TODO |
| `/contacts/ContactsHub` | `/contacts` | TODO |
| `/outreach/CampaignCreator` | `/campaigns` | TODO |
| `/outreach/CampaignAnalytics` | `/campaigns/:id/analytics` | TODO |
| `/outreach/Templates` | `/templates` | TODO |
| `/outreach/IndividualEmail` | `/email/send` | TODO |
| `/personas/Personas` | `/personas` | TODO |
| `/proposals/ProposalsList` | `/proposals` | TODO |
| `/events/Events` | `/events` | TODO |
| `/meetings/MeetingScheduler` | `/meetings` | TODO |
| `/ads/AdsDashboard` | `/ads/campaigns` | TODO |
| `/attract/BrandingHub` | `/attract/branding` | TODO |

---

## Checklist for New Routes

- [ ] Created Prisma model in `schema.prisma` with `companyId`
- [ ] Ran `npx prisma generate` and `npx prisma db push`
- [ ] Created route file following naming convention
- [ ] Implemented CRUD endpoints with companyId filtering
- [ ] Added authentication (Firebase) if needed
- [ ] Added error handling
- [ ] Added validation
- [ ] Registered route in `index.js`
- [ ] Tested endpoints

---

**Last Updated**: January 2025  
**Pattern Status**: ✅ Standardized and documented  
**Multi-Tenancy**: ✅ Uses `companyId` throughout

