# Universal Navigation Flow

## Overview
This document defines the universal navigation flow for all Ignite stacks. It handles authentication checking, user hydration, onboarding completion, and routing to appropriate pages.

---

## Flow Diagram

```
┌─────────────────┐
│   Splash Page   │  (Branding + Firebase Auth Check)
└────────┬────────┘
         │
         ├─ Firebase Auth? ── NO ──→ /signup
         │
         └─ YES ──→ /signin → /profilesetup
                        │
                        ├─ Company Exists? ── NO ──→ /companyprofile → /growth-dashboard
                        │
                        └─ YES ──→ /growth-dashboard
```

---

## Page Definitions

### 1. **Splash** (`/splash`)
- **Purpose**: Branding page + Firebase auth state checker (LOCALSTORAGE ONLY - NOTHING ELSE)
- **Logic**:
  1. Display branding/logo (800ms)
  2. Check Firebase auth state in browser localStorage (Firebase SDK manages this)
  3. If token exists → Navigate to `/signin` (routes to `/profilesetup`)
  4. If no token → Navigate to `/signup` (routes to `/profilesetup`)
- **Components**: Logo, branding message
- **CRITICAL**: Splash ONLY checks localStorage - that's IT. No API calls, no complex logic, no hydration checks.

#### Firebase Auth State Checking (Deep Dive)

**Implementation: Use `onAuthStateChanged`**
```javascript
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';

useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    if (user) {
      // User is signed in - Firebase SDK found token in its internal storage
      // Firebase reads from IndexedDB/localStorage (keys like firebase:authUser:...)
      navigate('/hydration-home');
    } else {
      // User is signed out - no token in Firebase's internal storage
      navigate('/signup');
    }
  });

  // Cleanup listener on unmount
  return () => unsubscribe();
}, [navigate]);
```

**Why `onAuthStateChanged`?**
- **Fires immediately** when component mounts (Firebase SDK checks its internal storage first)
- **Listens for changes** - if user signs in/out while on page
- **Handles initial load** - Firebase SDK restores auth state from IndexedDB/localStorage (managed internally)
- **No API call needed** - Firebase SDK reads from its own storage (we don't touch localStorage manually)
- **Waits for Firebase to restore** - avoids race condition where `currentUser` might be null during initial load

**Token Storage (CRITICAL - Firebase SDK Does This AUTOMATICALLY!):**
- ✅ **Firebase SDK AUTOMATICALLY stores auth tokens** in browser **IndexedDB/localStorage** (we do NOTHING)
- ✅ **Firebase SDK AUTOMATICALLY restores auth state** on page load (we do NOTHING)
- ✅ **Firebase SDK AUTOMATICALLY manages storage** with internal keys like `firebase:authUser:{API_KEY}:[DEFAULT]`
- ✅ **We just check `auth.currentUser`** - SDK reads from its internal storage FOR US
- ✅ **Token is AUTOMATICALLY included** in API requests via `Authorization: Bearer <token>` header (axios interceptor)
- ✅ **No manual token management** - SDK handles EVERYTHING automatically
- ✅ **Token persists across page refreshes** (browserLocalPersistence) - SDK does this automatically
- **Splash's job**: Check `auth.currentUser` (Firebase SDK already restored from storage) → Route
- **NOT Splash's job**: Manually read localStorage, manage tokens, call backend, check hydration, check completion

**Bottom Line:** Firebase SDK = Full autopilot for auth storage. We just check `auth.currentUser` and the SDK handles all the storage/retrieval/persistence automatically. Zero manual work needed.

**Implementation Notes:**
- **Splash ONLY checks `auth.currentUser`** (via `onAuthStateChanged`) - Firebase SDK reads from its internal storage (IndexedDB/localStorage)
- **We DON'T manually check `localStorage.getItem('firebaseId')`** - Firebase SDK manages storage internally with keys like `firebase:authUser:...`
- Use `onAuthStateChanged` listener - it fires when Firebase SDK restores auth state from its internal storage
- **NO API CALLS** - Splash doesn't care about backend, doesn't check hydration, doesn't check completion
- **NO COMPLEX LOGIC** - Splash just asks: "Is `auth.currentUser` truthy?" (Firebase SDK handles all storage) → Route accordingly
- Show branding for 800ms, then check auth state, then navigate
- After navigation → `/hydration-home` handles all the backend/hydration/completion logic

**Key Point:** Firebase SDK stores auth state in browser storage (IndexedDB/localStorage) with internal keys. We check `auth.currentUser` (via `onAuthStateChanged`), NOT `localStorage.getItem('something')`. Firebase SDK handles all storage management - we never touch localStorage directly for auth.

---

#### Axios Interceptor - Automatic Token Injection (Baked Into Infrastructure)

**How Protected Routes Work:**

The axios interceptor AUTOMATICALLY adds Firebase tokens to every API request. This is "baked into the infrastructure" - once set up, all API calls are protected automatically.

**Example from GoFast (Reference Implementation):**
```javascript
// src/api/axiosConfig.js
import axios from 'axios';
import { getAuth } from 'firebase/auth';

const axiosInstance = axios.create({
  baseURL: 'https://backend.onrender.com',
});

// Request interceptor - AUTOMATICALLY adds token to every request
axiosInstance.interceptors.request.use(
  async (config) => {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (user) {
      const token = await user.getIdToken(); // Firebase SDK gets fresh token
      config.headers.Authorization = `Bearer ${token}`; // Automatically added!
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - Handles 401 (unauthorized) automatically
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - redirect to login
      window.location.href = '/signup';
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
```

**What This Means:**
- ✅ **Every API call automatically gets `Authorization: Bearer <token>` header**
- ✅ **No manual token management needed** - interceptor handles it
- ✅ **Backend can verify token on every request** - protected routes work automatically
- ✅ **401 errors automatically redirect to login** - infrastructure handles auth failures
- ✅ **Set once, works everywhere** - all API calls are protected by default

**Current Status:**
- ✅ GoFast: Has axios interceptor (working)
- ✅ Ignite BD: Has axios interceptor (just added to `src/lib/api.js`)

**This is the "infrastructure"** - once the interceptor is set up, all API calls are automatically protected. No need to manually add tokens to each request.

---

#### Education Moment: Authorization Bearer Token (HTTP Headers)

**What is an HTTP Header?**
HTTP requests have headers - metadata sent with every request. Think of it like envelope labels on a letter.

**Example HTTP Request:**
```
POST /api/companies HTTP/1.1
Host: ignitebd-backend.onrender.com
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
User-Agent: Mozilla/5.0...

{ "name": "My Company" }
```

**Breaking it down:**
- `POST /api/companies` = HTTP method + path
- `Host: ...` = Where the request is going
- `Content-Type: application/json` = What type of data we're sending
- **`Authorization: Bearer <token>`** = Authentication token (THIS IS THE KEY!)
- Body = The actual data `{ "name": "My Company" }`

**What is "Authorization: Bearer"?**
- `Authorization` = HTTP header name (tells server "here's my credentials")
- `Bearer` = Type of authentication (means "whoever has this token can use it")
- `<token>` = The actual Firebase JWT token (long string of characters)

**How it works:**
1. **Frontend**: Axios interceptor adds `Authorization: Bearer <token>` to request headers
2. **Network**: Request travels over internet with headers attached
3. **Backend**: Middleware reads `req.headers.authorization`, extracts token
4. **Backend**: Verifies token with Firebase, grants access if valid

**Visual Example:**
```javascript
// What axios interceptor does:
config.headers.Authorization = `Bearer ${token}`;

// This becomes this HTTP header:
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiIxMjM0NTY3OCJ9...

// Backend receives it like this:
req.headers.authorization = "Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Why Bearer?**
- "Bearer" means "whoever bears (has) this token can use it"
- Like a concert ticket - if you have it, you get in
- Token is the proof of authentication

**Key Point:** Headers are metadata sent with every HTTP request. `Authorization: Bearer <token>` is how we prove we're authenticated - backend reads this header to verify our identity.

---

### 2. **Profile Setup** (`/profilesetup`)
- **Purpose**: Profile completion and routing hub (handles both new and returning users)
- **Logic**:
  1. Collects/updates: `firstName`, `lastName`, `email`, `phone`, `role`, `goals`
  2. Updates Owner profile via `PUT /api/adminUserAuth/:adminId`
  3. Checks company completion:
     - If company exists → Navigate to `/growth-dashboard`
     - If no company → Navigate to `/companyprofile`
- **API**: `PUT /api/adminUserAuth/:adminId`
- **Next Step**: `/companyprofile` (if no company) or `/growth-dashboard` (if company exists)

---

### 3. **Signup** (`/signup`)
- **Purpose**: New user registration
- **Flow**:
  1. Firebase authentication (email/password or OAuth)
  2. Call `/api/user/create` to create/find Owner
  3. Store `adminId` in localStorage
  4. Navigate to `/profilesetup` (profile setup handles routing)
- **API**: `POST /api/user/create`
- **Next Step**: `/profilesetup` → checks company, routes to `/companyprofile` or `/growth-dashboard`

---

### 4. **Signin** (`/signin`)
- **Purpose**: Existing user authentication
- **Flow**:
  1. Firebase authentication
  2. Call `/api/user/create` to find existing Owner
  3. Store `adminId` in localStorage
  4. Navigate to `/profilesetup` (profile setup checks completion and routes accordingly)
- **API**: `POST /api/user/create`
- **Next Step**: `/profilesetup` → checks profile/company completion, routes to appropriate page

---

### 5. **Growth Dashboard** (`/growth-dashboard`)
- **Purpose**: Main hub for BD Ignite stack
- **Logic**:
  1. **Must check hydration first** - ensure user data is loaded
  2. Call `/api/user/hydrate` if not already hydrated
  3. Load dashboard data scoped to `companyId`
  4. Display metrics, stacks, quick actions
- **API**: `GET /api/user/hydrate` (if not hydrated)
- **Access**: Requires authenticated user with company

---

## Completion Flags

### Profile Complete
- Checks: `firstName`, `lastName`, `phone`, `role` (optional)
- Route if incomplete: `/profilesetup`

### Company Complete
- Checks: `companyId` exists in localStorage or user has `ownedCompanies` or `staffOf`
- Route if incomplete: `/companyprofile`

---

## API Endpoints

### User Hydration
- **Endpoint**: `GET /api/user/hydrate`
- **Purpose**: Get full user data with completion flags
- **Response**:
  ```json
  {
    "user": {
      "id": "owner-id",
      "firebaseId": "firebase-uid",
      "email": "user@example.com",
      "name": "John Doe",
      "photoURL": "https://...",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "555-1234"
    },
    "companies": [...],
    "flags": {
      "profileComplete": true,
      "companyComplete": true
    }
  }
  ```

### User Create
- **Endpoint**: `POST /api/user/create`
- **Purpose**: Find or create Owner by Firebase ID
- **Response**: Owner data with `id` (stored as `adminId`)

---

## Stack-Specific Notes

### BD Ignite Stack
- **Main Hub**: `/growth-dashboard`
- **Requires**: Hydration check before loading
- **Scoped Data**: All queries use `companyId` from localStorage

### Other Stacks (Future)
- **Universal Home**: `/home` or stack-specific home
- **Same Flow**: Splash → Hydration → Home

---

## Implementation Checklist

- [x] **Fix `Splash.jsx`**: Remove API call, use `onAuthStateChanged` listener ✅
- [ ] **Update `Profilesetup.jsx`**: Add company check logic - route to `/companyprofile` or `/growth-dashboard`
- [ ] **Fix `/api/user/hydrate`**: Use `prisma.owner` instead of `prisma.user`
- [x] **Update `Signup.jsx`**: Always route to `/profilesetup` after creating Owner ✅
- [x] **Update `Signin.jsx`**: Route to `/profilesetup` after auth ✅
- [ ] **Update `GrowthDashboard.jsx`**: Check hydration before loading data (if needed)
- [x] **Update `App.jsx`**: Splash as entry point, routes organized ✅

---

## Flow Examples

### New User Journey
1. Visit `/splash` → No auth → `/signup`
2. Signup → Create Owner → `/profilesetup`
3. Profile Setup → Checks company (none exists) → `/companyprofile`
4. Company Profile → Creates company → `/growth-dashboard`

### Returning User Journey
1. Visit `/splash` → Auth exists → `/signin` → `/profilesetup`
2. Profile Setup → Checks company (exists) → `/growth-dashboard`

### Incomplete Company Journey
1. Visit `/splash` → Auth exists → `/signin` → `/profilesetup`
2. Profile Setup → Checks company (none exists) → `/companyprofile`
3. Company Profile → Creates company → `/growth-dashboard`

### Sign In Journey
1. Visit `/signin` → Authenticate → `/profilesetup`
2. Profile Setup → Checks company → Routes to `/companyprofile` or `/growth-dashboard`

---

## Onboarding Flow (Included in Universal Navigation)

### Profile Setup (`/profilesetup`) - Central Routing Hub
- **Purpose**: Collect Owner profile details AND route based on company completion
- **Fields**: `firstName`, `lastName`, `email`, `phone`, `role`, `goals`
- **API**: `PUT /api/adminUserAuth/:adminId`
- **Routing Logic**:
  - If company exists → `/growth-dashboard`
  - If no company → `/companyprofile`

### Company Profile (`/companyprofile`)
- **Purpose**: Create new company
- **Fields**: `companyName`, `companyAddress`, `companyIndustry`, `companyAnnualRev`, `yearsInBusiness`
- **API**: `POST /api/companies`
- **Next Step**: `/growth-dashboard` (or universal home)

### Invite Acceptance (`/invite/:token`) 🚧 TODO
- **Purpose**: Accept email invite to join existing company
- **Flow**: Token validation → Add to staff → `/growth-dashboard`

---

## Last Updated
2025-01-27

