# Ignite Activation API

Backend for the Ignite Activation prototype - a clickable demo of "Activation Accounting" for founders.

## Stack

- **Node 20+** with Express
- **TypeScript** for type safety
- **Cookie-session** for demo auth
- **CORS** enabled for local dev

## Quick Start

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Run production build
npm start
```

The API will run on **http://localhost:4000** by default.

## Environment Variables

Create a `.env` file (see `.env.example`):

```
PORT=4000
SESSION_SECRET=devdevdev-change-in-production
NODE_ENV=development
```

## API Endpoints

### Auth
- `POST /auth/mock` - Mock authentication (sets session cookie)
- `GET /auth/me` - Get current user from session
- `POST /auth/logout` - Clear session

### Metrics
- `POST /metrics/coefficient` - Calculate Ignite Coefficient
  - Body: `{ revenue, prevRevenue, reinvestmentPct, utilizationPct? }`
  - Returns: `{ growthPct, coefficient, reinvestmentPct, utilizationPct, recommendations }`

### Business Development
- `POST /bd/ads/simulate` - Simulate Google Ads campaign
  - Body: `{ budget, estCPC, convRate }`
  - Returns: `{ clicks, leads, estCPA, notes, summary }`

- `POST /bd/events/activate` - Generate event outreach plan
  - Body: `{ eventId, seats? }`
  - Returns: `{ tasks, suggestedContacts, messageTemplate, eventName, estimatedReach, priority }`

- `POST /bd/content/generate` - Generate weekly content plan
  - Returns: `{ week, slots, themes, hashtags }`

## Architecture Notes

- All responses are JSON
- Mock data for demo purposes (no database)
- CORS configured for http://localhost:5173 (Vite default)
- Cookie-based sessions for simple auth demo

## Development

The backend uses **tsx** for hot-reloading during development. Just run `npm run dev` and it will watch for changes.

No real integrations - all endpoints return mock/calculated data to demonstrate the concept.

