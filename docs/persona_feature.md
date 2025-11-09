# Persona Feature Reference

> Drafted November 8, 2025 – use alongside `Ignitebd_stack_devguide.md`. Update this doc as persona work lands, then link it into the stack guide.

## 1. Premise

- Personas drive outbound BD targeting and campaign messaging.
- Future state: run Python analytics to score how contacts align with personas; win/loss attribution will lean on persona match quality.
- Every CompanyHQ (tenant) needs at least one active persona before launching outreach/email.

## 2. Current Implementation Snapshot

### 2.1 Prisma Schema (`prisma/schema.prisma`)

```prisma
model Product {
  id          String    @id @default(cuid())
  companyHQId String
  name        String
  description String?
  valueProp   String?
  companyHQ   CompanyHQ @relation(fields: [companyHQId], references: [id], onDelete: Cascade)
  personas    Persona[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

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
  companyHQ          CompanyHQ @relation(fields: [companyHQId], references: [id], onDelete: Cascade)
  product            Product?  @relation(fields: [productId], references: [id], onDelete: SetNull)
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt

  @@map("personas")
}
```

**Highlights:**
- Personas are now tenant-scoped via `companyHQId` and optionally align to a product through `productId`.
- `valuePropToPersona` plus `alignmentScore` provide the BusinessIntelligence metrics we need for targeting.
- Products themselves are tenant-scoped (`companyHQId`) so each HQ can curate its own catalog.

### 2.2 Backend Routes (`routes/Persona/PersonaRoutes.js`)

- `GET /api/personas?companyHQId=` – lists personas scoped to the tenant (needs refactor from `companyId` query param).
- `GET /api/personas/:personaId` – fetches a single persona (currently includes `company`; needs to include `product` + HQ context).
- `POST /api/personas/upsert` – creates/updates persona; must accept `companyHQId`, optional `productId`, and new field set (`name`, `desiredOutcome`, etc.).

**Action items:**
- Split per-route files (`PersonaListRoute.js`, `PersonaUpsertRoute.js`) for clarity.
- Enforce Firebase token guard + tenant validation using `companyHQId`.
- Return persona summaries with `alignmentScore` + product linkage for dashboards.

### 2.3 Frontend (Primary App `Ignite-frontend-production`)

- `src/pages/personas/Personas.jsx` – landing page:
  - If no personas exist → CTA card “Create Your First Persona”.
  - When personas exist → button that routes to builder (`/personas/builder` or `/dashboard/personas`).
- `src/pages/personas/PersonaBuilder.jsx` → wraps the React component builder, passes `personaId` from query params.
- `src/components/ignite/personas/PersonaBuilder.tsx` – main form:
  - Needs to evolve to collect `name`, `title`, `industry`, `goals`, `painPoints`, `desiredOutcome`, `valuePropToPersona`, optional `productId`, and `alignmentScore`.
  - Hidden `companyHQId` derived from `localStorage` (drop `companyId` legacy key where possible).
  - On submit should send payload that matches new backend contract.
  - On success toasts + redirects to `/dashboard/personas` unless `onSuccess` callback provided.
- `src/pages/setup/Persona.jsx` – Onboarding wizard variant:
  - Handles local persona creation during setup (using mock utilities `personaData.js` until API integration replaces them).

### 2.4 Supporting Utilities

- `src/utils/personaData.js` – localStorage helpers for demo/setup (should be sunset once live API covers onboarding flow).
- `src/data/demoPersonas.js` – static seed data for demo hydration.

## 3. User Flow: Persona Experience

1. User lands on `Personas` dashboard.
   - App calls `/api/personas` with `companyHQId` to hydrate.
   - If results empty → show wizard CTA.
2. Clicking “Create Persona” opens builder wizard:
   - Form sections (currently the “wizard”) walk through prompts/fields.
   - Consider renaming from “wizard” to “builder” since flow is a single form with guided copy.
3. Save persona → backend upsert, toast, redirect to personas list.
4. Completed persona list should power:
   - BD Pipeline recommendations.
   - Outreach/email template suggestions (future).
   - Python analytics pipeline to compare contacts to personas.

**Wizard UX notes:**
- Provide prompts and microcopy to guide persona definitions.
- Add quick actions for “Add another persona” or “Map contacts to persona” once personas exist.

## 4. Required Enhancements

1. **Tenant Scope Fix**
   - Update schema: add `companyHQId`, remove `companyId` (or keep optional for legacy mapping), adjust relations/migrations.
   - Update all backend queries to filter by `companyHQId`.
   - Adjust frontend to send `companyHQId` pulled from `localStorage`.

2. **Industry/Segmentation Fields**
   - Add `industry`, `buyingStage`, `personaType`, etc. (define exact fields after research).
   - Reflect additions in frontend form and backend validation.

3. **Route Organization**
   - Follow convention: `routes/Persona/PersonaListRoute.js`, `PersonaUpsertRoute.js`, etc., imported by `PersonaRoutes.js`.
   - Ensure each route enforces `verifyFirebaseToken` and tenant checks.

4. **Hydration Enhancements**
   - Owner/CompanyHQ hydrate response should include persona summaries (`id`, `personaName`, maybe assignments count).
   - Personas page should gracefully handle loading/error states tied to real API data.

5. **Setup Flow Alignment**
   - Replace mock `personaData.js` hydration with live API once backend ready.
   - Ensure onboarding step (`/setup/persona`) calls real endpoints while supporting demo mode fallbacks.

6. **Analytics + Python Prep**
   - Define data contract (persona fields required for alignment scoring).
   - Decide storage for persona-contact linkage (likely join table).
   - Outline Python pipeline expectations in future revision of this doc.

## 5. Next Steps Checklist

- [ ] Draft updated Prisma schema + migration plan.
- [ ] Update backend persona routes to use `companyHQId`.
- [ ] Patch frontend builder to send `companyHQId` and handle new fields.
- [ ] Document persona UX copy + rename “wizard” terminology as needed.
- [ ] Extend hydrate route to deliver persona overview.
- [ ] Re-run end-to-end flow (create persona → list → map to outreach) before email integration.

Once the above items are delivered, link this doc from `Ignitebd_stack_devguide.md` under “Related Documentation” and mark checklist items with completion dates.

