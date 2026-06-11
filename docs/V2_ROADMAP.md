# V2 Planning: Strategic Roadmap & Vision

## Overview

This document outlines the vision, scope, and roadmap for Shutter Plan AI V2—the next evolution of the platform beyond Phase 2's core features.

**Current State** (End of Phase 2):
- ✅ Single-session planner (1-5 locations, 1-2 hour shoots)
- ✅ Weather intelligence + route optimization
- ✅ Share links with password protection
- ✅ Analytics tracking

**Vision** (V2):
- 🎯 Multi-day campaign planning (3-30 day shoots)
- 🎯 Team collaboration (photographers, assistants, clients)
- 🎯 Advanced intelligence (weather trends, venue intelligence, permitting)
- 🎯 Mobile-first route visualization (live map, turn-by-turn)
- 🎯 Integration ecosystem (calendar, project management, storage)

---

## Strategic Goals

### Goal 1: Expand Use Cases
**Current**: Single-day photography shoots
**V2**: Multi-day campaigns (editorial, real estate, events, travel photography)

**Metrics**:
- Avg plan duration: 1 day → 5-7 days
- Shoot types: Portrait → Portrait, editorial, real estate, travel, events
- User retention: First-time usage → Monthly active usage

### Goal 2: Enable Team Workflows
**Current**: Solo photographers
**V2**: Photographer + assistants + clients

**Metrics**:
- Users per plan: 1 → 2-4
- Collaboration features: 0 → Comments, tasks, approvals
- Client adoption: 0% → 20% (clients view + approve plans)

### Goal 3: Deepen Intelligence
**Current**: Weather + basic logistics
**V2**: Trend forecasting, venue intelligence, permitting assistance

**Metrics**:
- Data sources: 1 (Open-Meteo) → 5+ (venues, permits, traffic, events)
- Forecast horizon: 1 day → 14 days (trends)
- Route accuracy: 70% → 90% (multi-day optimization)

### Goal 4: Improve Execution
**Current**: Plan only
**V2**: Plan + execute + track + learn

**Metrics**:
- User touchpoints: Generate → Generate + execute + review + export
- Plan adherence: Unknown → 60%+ (users follow optimized routes)
- Outcome tracking: Zero → Photo review, client feedback, metrics

---

## Core V2 Features

### Feature Area 1: Multi-Day Planning

#### 1.1 Session Templates (for repeated patterns)
- Pre-built templates (e.g., "3-day wedding", "7-day travel shoot")
- Template customization (locations, durations, constraints)
- Clone existing plans as templates
- **Use Cases**: Event photographers (recurring patterns), travel photographers (known itineraries)
- **Effort**: 8-10 engineering hours + 4h design
- **Impact**: Reduce setup time 50% for repeat scenarios

#### 1.2 Multi-Day State Management
- Preserve location preferences across days
- Time-of-day constraints per day (e.g., golden hour timing varies)
- Equipment setup/breakdown time budgeting
- **Use Cases**: Real estate shoots (same locations, different days), travel (day 1-7 itinerary)
- **Effort**: 12-15 hours (state machine + UI)
- **Impact**: Support 5-30 day campaigns

#### 1.3 Day-Linking Logic
- Minimize travel between last location (day N) and first location (day N+1)
- Suggest hotel/accommodation locations based on geography
- Build multi-day route with overnight consolidation
- **Use Cases**: Travel photography, event coverage
- **Effort**: 10-12 hours (algorithm)
- **Impact**: Multi-day optimization 50% better than manual

#### 1.4 Constraints Management
- Travel time budget per day (8h max)
- Breaks/meals (1h lunch, 15m coffee breaks)
- Sunrise/sunset windows per location per day
- Equipment setup/breakdown time (30m per location)
- **Use Cases**: Professional day-rate planning, location scouting
- **Effort**: 8-10 hours (constraint solver)
- **Impact**: Realistic 90%+ of planned routes

---

### Feature Area 2: Team Collaboration

#### 2.1 Shared Planning
- Owner creates plan, invites team members
- Team members can comment on locations, suggest changes
- Version control (plan revisions, rollback)
- **Use Cases**: Photographer + assistants agreeing on plan, client approval
- **Effort**: 15-18 hours (real-time collaboration, database schema)
- **Impact**: Reduce planning meetings 50%, increase plan confidence

#### 2.2 Collaborative Refinement
- Multiple editors refining same plan simultaneously
- Conflict resolution (what if two users refine differently)
- Comment threads on locations/shots
- **Use Cases**: Team discussion, client feedback integration
- **Effort**: 12-15 hours (WebSocket sync, conflict detection)
- **Impact**: Faster plan consensus, documented decisions

#### 2.3 Role-Based Access
- Photographer (create, edit, execute)
- Assistant (view, comment, update status)
- Client (view, approve/reject, comment)
- Vendor (read-only, view assigned locations)
- **Use Cases**: Different stakeholder permissions
- **Effort**: 6-8 hours (RLS policies, UI roles)
- **Impact**: Security + transparency

#### 2.4 Approval Workflows
- Client approves plan before execution
- Multi-level approval (photographer → manager → client)
- Automated approvals for trusted users
- **Use Cases**: Agency shoots, corporate photography
- **Effort**: 8-10 hours (state machine, notifications)
- **Impact**: Reduce back-and-forth by 70%

---

### Feature Area 3: Advanced Intelligence

#### 3.1 Venue Intelligence
- Venue hours, best times to shoot (weekday/weekend, morning/afternoon)
- Parking availability and cost
- Permitting requirements + estimated timeline
- Crowd patterns by time of day
- **Data Sources**: Google Maps API, Foursquare, local permits database
- **Use Cases**: Location scouting, permit planning
- **Effort**: 16-20 hours (API integration, data modeling)
- **Impact**: Reduce scouting time 40%, improve permit success

#### 3.2 Weather Trend Forecasting
- 14-day forecast for each location (not just 1 day)
- Confidence scores per day (probability of good conditions)
- Historical weather patterns (best months to shoot each location)
- **Data Sources**: Historical weather API, climate data
- **Use Cases**: Trip planning, seasonal shoot timing
- **Effort**: 10-12 hours (data pipeline, ML model)
- **Impact**: Reduce weather surprises 60%

#### 3.3 Permitting Assistant
- Detect location that requires permits
- Generate checklist (forms, fees, timeline)
- Track permit status (pending, approved, revoked)
- Suggest no-permit alternative locations if needed
- **Data Sources**: Local government APIs, permit database
- **Use Cases**: Professional shoots in regulated locations
- **Effort**: 14-16 hours (permit data, workflow)
- **Impact**: Prevent 90% of permit issues

#### 3.4 Route Intelligence (Multi-Day)
- Account for cumulative fatigue (route should be shorter on day 3)
- Time-zone changes for travel shoots
- Sunrise/sunset times vary per day (not static)
- Multi-day TSP approximation (better than greedy single-day)
- **Use Cases**: Travel photography, multi-location campaigns
- **Effort**: 12-15 hours (algorithm + UI)
- **Impact**: Multi-day routes 30% more efficient

---

### Feature Area 4: Mobile-First Execution

#### 4.1 Live Map with Turn-by-Turn
- Current location tracking (with user permission)
- Next location navigation (turn-by-turn directions)
- Distance + ETA to next location
- Route visualization on map
- **Use Cases**: On-location execution, assistant guidance
- **Effort**: 10-12 hours (background location tracking, maps API)
- **Impact**: 80% route adherence (vs. 60% without)

#### 4.2 Mobile Shot Checklist
- Quick add/remove shots as you go
- Snap photos tied to locations
- Mark shots complete / needs retake
- Real-time sync to team
- **Use Cases**: On-location coordination, status updates
- **Effort**: 8-10 hours (offline-first, sync)
- **Impact**: Reduce post-shoot review time 40%

#### 4.3 Time Tracking
- Actual time spent per location (vs. planned)
- Variance alerts (running 15min behind schedule)
- Catch-up suggestions (skip next break, reduce time at location N)
- **Use Cases**: Keeping shoots on schedule, vendor coordination
- **Effort**: 6-8 hours (timer, alerts)
- **Impact**: 90% of shoots finish on time (vs. 60% without)

#### 4.4 Mobile Photo Review
- Swipe through photos taken at each location
- Flag for editing, delete, reshoot
- Quick rating (1-5 stars)
- Annotate with notes ("needs retake", "too bright")
- **Use Cases**: On-location quality control
- **Effort**: 8-10 hours (photo viewer, annotations)
- **Impact**: Faster post-production, fewer surprises

---

### Feature Area 5: Integration Ecosystem

#### 5.1 Calendar Integration
- Sync plan to photographer's calendar (Google, Outlook)
- Block prep/execution time
- Show calendar conflicts
- **Use Cases**: Avoid double-booking, calendar visibility
- **Effort**: 6-8 hours (OAuth, calendar API)
- **Impact**: Zero double-bookings

#### 5.2 Project Management Integration
- Sync plan tasks to Asana, Monday, Jira
- Create task per location with checklist
- Link tasks to plan for tracking
- **Use Cases**: Agency coordination, vendor tracking
- **Effort**: 8-10 hours per platform (API, webhooks)
- **Impact**: Single source of truth for tasks

#### 5.3 Cloud Storage Integration
- Auto-upload photos to Google Photos, Dropbox, AWS S3
- Organize by location + date
- Sync metadata (location, time, rating)
- **Use Cases**: Backup, asset management
- **Effort**: 8-10 hours per platform
- **Impact**: Photos backed up real-time, no data loss

#### 5.4 Payment / Booking Integration
- Stripe integration for quotes, invoicing
- Booking page showing availability
- Calendar sync with booking system
- **Use Cases**: Small business photographers, solopreneurs
- **Effort**: 12-14 hours (Stripe, webhooks, workflows)
- **Impact**: Reduce admin time 30%

---

## Phased Rollout Plan

### V2.0 (Q3 2026, 8-10 weeks)
**Focus**: Multi-day planning + team collaboration foundation

- [x] Multi-day state management
- [x] Session templates
- [x] Basic shared planning (comments, version history)
- [x] Role-based access (photographer, assistant, client)
- [ ] Testing + beta launch

**Effort**: 60-70 engineering hours
**Resources**: 2 engineers (1 FE, 1 BE), 1 designer
**Success Metrics**: 
  - 50+ beta users try multi-day plans
  - Average plan duration increases 2x (1 day → 2-3 days)
  - 30% of plans are shared with team members

---

### V2.1 (Q4 2026, 6-8 weeks)
**Focus**: Mobile execution + advanced intelligence

- [x] Live map with turn-by-turn navigation
- [x] Mobile shot checklist
- [x] Venue intelligence (hours, parking, crowds)
- [x] Time tracking with catch-up alerts
- [x] Basic permitting assistant

**Effort**: 50-60 engineering hours
**Resources**: 2 engineers (1 FE mobile, 1 BE), 1 designer
**Success Metrics**:
  - 80% route adherence for mobile users
  - 40% reduction in post-shoot review time
  - 20+ integrations with venue data

---

### V2.2 (Q1 2027, 6-8 weeks)
**Focus**: Intelligence + integrations

- [x] Weather trend forecasting (14-day outlook)
- [x] Advanced multi-day route optimization
- [x] Calendar integration (Google, Outlook)
- [x] Project management integration (Asana, Monday)
- [x] Cloud storage auto-upload

**Effort**: 50-60 engineering hours
**Resources**: 2 engineers (1 FE, 1 BE/integration), 1 designer
**Success Metrics**:
  - 70% of users have calendar integration
  - 50% reduction in scheduling conflicts
  - 5+ integrations enabled

---

### V2.3 (Q2 2027, 4-6 weeks)
**Focus**: Monetization + advanced collaboration

- [x] Payment / booking integration (Stripe)
- [x] Approval workflows (client sign-off)
- [x] Photo review on mobile
- [x] Advanced permitting + status tracking

**Effort**: 40-50 engineering hours
**Resources**: 1 engineer (full-stack), 1 product manager
**Success Metrics**:
  - 20% of professional users enable client approval
  - 5% conversion to paying plans

---

## Technical Architecture Changes

### Database Schema Additions

```sql
-- Multi-day sessions
ALTER TABLE planner_drafts ADD COLUMN session_dates DATE[] NOT NULL DEFAULT '{}';
ALTER TABLE planner_drafts ADD COLUMN multi_day_config JSONB DEFAULT NULL;

-- Team collaboration
CREATE TABLE planner_collaborators (
  id UUID PRIMARY KEY,
  draft_id UUID REFERENCES planner_drafts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('owner', 'editor', 'viewer', 'client', 'assistant')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Session templates
CREATE TABLE session_templates (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  locations JSONB NOT NULL, -- Template locations
  constraints JSONB DEFAULT NULL, -- Time, travel, meal constraints
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Venue intelligence
CREATE TABLE venue_intelligence (
  id UUID PRIMARY KEY,
  location_id TEXT, -- Google Place ID
  hours JSONB, -- Operating hours
  parking_score INT, -- 0-100
  permit_required BOOLEAN,
  crowd_patterns JSONB,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### API Changes

```typescript
// Multi-day planner endpoint
POST /api/planner/multi-day/intelligence
// Returns: Multi-day route with day-by-day breakdown

// Team collaboration endpoints
POST /api/planner/[id]/collaborators // Add team member
GET /api/planner/[id]/collaborators  // List team
POST /api/planner/[id]/comments      // Add comment

// Venue intelligence endpoints
GET /api/venues/[placeId]/intelligence  // Get venue data
GET /api/venues/[placeId]/permits       // Get permit info

// Mobile execution endpoints
POST /api/execution/[planId]/location/check-in
POST /api/execution/[planId]/photo    // Upload photo
GET /api/execution/[planId]/navigation // Get turn-by-turn
```

### Frontend Components

```typescript
// New components
- <MultiDaySessionBuilder />
- <SessionTemplateGallery />
- <CollaborationPanel />
- <VenueIntelligenceCard />
- <MobileMapNavigation />
- <ShotChecklist />
- <TimeTracker />
- <ApprovalWorkflow />
```

---

## Resource & Timeline

### Team Composition
- **Lead Engineer** (1 FTE): Architecture, backend, infrastructure
- **Frontend Engineer** (1 FTE): UI, mobile, performance
- **Mobile Engineer** (1 FTE starting Q4): React Native for native mobile
- **Product Manager** (0.5 FTE): Prioritization, stakeholder management
- **Designer** (0.5 FTE): UX/UI, user research
- **QA/DevOps** (0.5 FTE): Testing, deployment, monitoring

### Timeline
- **Planning & Design**: 4 weeks (June-July 2026)
- **V2.0 Development**: 10 weeks (July-Sept 2026)
- **V2.0 Beta**: 4 weeks (Sept-Oct 2026)
- **V2.1 Development**: 8 weeks (Oct-Nov 2026)
- **V2.1 General Availability**: Dec 2026
- **V2.2 + V2.3**: 2027 (continuous iteration)

### Budget Estimate
- **Engineering**: 200-250 hours = $50-75k (contractors/outsourced)
- **Design**: 40-60 hours = $4-8k
- **Infrastructure**: $2-5k (additional API costs, storage)
- **Total Year 1 (V2.0-V2.3)**: ~$60-90k

---

## Success Metrics & OKRs

### Q3 2026 (V2.0 Launch)
- **OKR 1**: 50+ beta users testing multi-day plans
- **OKR 2**: Average plan duration increases from 1 day → 2-3 days
- **OKR 3**: 30% of plans are shared (team collaboration adoption)

### Q4 2026 (V2.1 Launch)
- **OKR 1**: 80% route adherence for mobile users
- **OKR 2**: 40% reduction in post-shoot review time
- **OKR 3**: 500+ downloads of mobile app

### Q1 2027 (V2.2 Launch)
- **OKR 1**: 70% of users have calendar integration
- **OKR 2**: 50% reduction in scheduling conflicts
- **OKR 3**: 5+ enterprise integrations enabled

### Q2 2027 (V2.3 Launch & Monetization)
- **OKR 1**: 20% of professional users on paid plan
- **OKR 2**: $50k MRR (5% conversion × 10k DAU × $100/month)
- **OKR 3**: 1000+ user testimonials / 4.5+ app store rating

---

## Competitive Positioning

### Current (V1): vs. Competitors
- ✅ AI route optimization (better than manual)
- ✅ Weather intelligence (unique feature)
- ✅ Easy share + password protect
- ❌ Single-day only (vs. multi-day planners like Google Trips)
- ❌ No collaboration (vs. Asana, Monday)
- ❌ No mobile execution (vs. Snaptrip, Adventure Life)

### V2.0: vs. General Trip Planners
- ✅ Photography-specific constraints (golden hour, location logistics)
- ✅ Team collaboration (photographer + assistants + clients)
- ✅ Real-time execution tracking
- ❌ No booking/monetization yet (vs. Airbnb, ToursByLocals)

### V2.2-V2.3: vs. Professional Workflows
- ✅ All-in-one platform (planning + execution + collaboration + monetization)
- ✅ Deep photography expertise (weather trends, venue intelligence, permitting)
- ✅ Integrations (calendar, project management, payment)
- ✅ Mobile-first (vs. desktop-heavy competitors)

---

## Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Multi-day state complexity | High | Medium | Start with simple sequential days, add constraints later |
| Collaboration sync issues | Medium | High | Use event sourcing, test conflict scenarios early |
| Venue data accuracy | Medium | Medium | Start with high-confidence sources (Google, Foursquare), expand gradually |
| Mobile performance | Medium | Medium | Optimize offline-first, lazy load data, use native for maps |
| Integration complexity | High | Low | Pick top 3 integrations (Calendar, Stripe, Google Drive), expand based on demand |

---

## Next Steps

1. **Week 1-2**: Design V2 database schema, API contracts
2. **Week 3-4**: User research (interview 20 photographers for multi-day workflows)
3. **Week 5-6**: Create interactive prototypes (Figma)
4. **Week 7-8**: Engineer estimates for each feature area
5. **Week 9**: Go/no-go decision + resource allocation

**Owner**: Product Manager
**Timeline**: Complete by end of Q2 2026

---

**Document Created**: 2026-06-11
**Next Review**: After Phase 2 production launch (2026-06-18)
**Vision Owner**: [Founder/Product Lead]
