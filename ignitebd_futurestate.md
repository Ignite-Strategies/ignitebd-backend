# IgniteBD Future State

This document tracks planned enhancements, future features, and UX improvements for the IgniteBD platform.

## Profile & Owner Management

### Current State
- Profile setup is **optional** - users can authenticate with Firebase and go straight to company setup
- Basic Owner fields: `name`, `email`, `photoURL` (from Firebase)
- Profile setup form exists but is not required in onboarding flow

### Future Enhancements

#### 1. "What Type of Owner Are You?" UX Flow
**Goal**: Better onboarding experience that helps users identify their role and needs

**Potential Flow**:
- After Firebase auth, show a selection screen:
  - "I'm a Founder/CEO" → Quick company setup, focus on growth
  - "I'm a Marketing Leader" → Focus on attract/engage tools
  - "I'm a Business Development Manager" → Full pipeline management
  - "I'm just exploring" → Demo mode with sample data

**Benefits**:
- Personalized onboarding experience
- Pre-configure dashboard based on role
- Better feature discovery

#### 2. Enhanced Profile in Settings
**Current**: Profile setup form collects `firstName`, `lastName`, `email`, `phone`, `role`, `goals` but only stores `name` and `email`

**Future**:
- Move profile editing to Settings page
- Add fields to Owner model:
  - `phone` (String?)
  - `role` (String?) - e.g., "founder", "marketing", "bd-manager"
  - `goals` (String?) - text field for business goals
  - `companySize` (String?) - e.g., "1-10", "11-50", "51-200", "200+"
  - `industry` (String?)
- Allow users to update profile anytime
- Use profile data for personalization and recommendations

#### 3. Multi-Company Management
**Current**: Owner can own multiple CompanyHQs, but UI focuses on primary company

**Future**:
- Company switcher in header/sidebar
- Settings to manage all owned companies
- Ability to transfer ownership
- Better onboarding for multi-company owners

## Authentication & Onboarding

### Current Flow
1. Splash → Check Firebase tokens
2. Welcome (Hydration) → Check for CompanyHQ
3. Company Create/Choose → If no CompanyHQ
4. Dashboard → If complete

### Future Enhancements

#### Streamlined Onboarding
- **Skip profile setup** - confirmed as optional ✅
- **Smart routing** - Only require CompanyHQ (multi-tenancy requirement)
- **Quick start wizard** - Optional guided tour for first-time users
- **Demo mode** - Allow exploration without full setup

#### Role-Based Onboarding
- Different flows based on "owner type" selection
- Pre-populate settings based on role
- Show relevant features first

## Company Setup

### Current State
- Company Create/Choose page exists
- CompanyProfile page for creating new company
- JoinCompany flow for joining existing

### Future Enhancements

#### 1. Enhanced Company Onboarding
- Industry-specific templates
- Pre-fill data from company website (if available)
- Import from LinkedIn/Facebook
- Quick setup with minimal required fields

#### 2. Company Profile Completion
- Progress indicator showing completion %
- Reminder to complete profile
- Benefits of complete profile (better recommendations, etc.)

## Dashboard & UX

### Current State
- Growth Dashboard as main hub
- Sidebar navigation
- Conditional rendering based on route

### Future Enhancements

#### 1. Personalized Dashboards
- Role-based dashboard layouts
- Customizable widgets
- Quick actions based on user behavior

#### 2. Onboarding Tour
- Interactive walkthrough for new users
- Feature discovery tooltips
- Progress tracking

#### 3. Smart Recommendations
- Suggest next actions based on:
  - Profile data (role, goals, industry)
  - Company stage
  - Current pipeline status
  - User behavior patterns

## Data & Analytics

### Future Enhancements

#### 1. Owner Analytics
- Track profile completion rates
- Monitor onboarding funnel
- Identify drop-off points

#### 2. Usage Analytics
- Which features are most used by role
- Time to first value
- Feature adoption rates

## Technical Improvements

### Database Schema
- Add `phone`, `role`, `goals`, `companySize`, `industry` to Owner model
- Consider adding `onboardingCompleted` timestamp
- Track `lastLoginAt` for engagement metrics

### API Enhancements
- Add profile update endpoint (already exists, but enhance fields)
- Add owner type/role endpoint
- Add onboarding status endpoint

### Frontend Enhancements
- Settings page with profile editing
- Owner type selection component
- Enhanced onboarding flow components

## Implementation Priority

### Phase 1 (Near-term)
- [x] Remove profile setup requirement from onboarding
- [ ] Add profile editing to Settings page
- [ ] Add `phone`, `role`, `goals` fields to Owner model
- [ ] Update profile route to store all fields

### Phase 2 (Medium-term)
- [ ] Build "What Type of Owner Are You?" selection screen
- [ ] Implement role-based onboarding flows
- [ ] Enhanced company setup with templates
- [ ] Onboarding tour/guided walkthrough

### Phase 3 (Long-term)
- [ ] Multi-company management UI
- [ ] Advanced personalization engine
- [ ] Usage analytics dashboard
- [ ] Smart recommendations system

## Notes

- Profile setup form exists but is not required - users can add more info in Settings later
- Future: Add "what type of owner are you" UX flow for better onboarding
- CompanyHQ is the only required step (multi-tenancy requirement)
- Dashboard is home base for all authenticated users

