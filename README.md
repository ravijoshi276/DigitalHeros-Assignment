# Digital Heroes — Frontend

> React · Vite · Tailwind CSS v3 · Axios + SimpleJWT

A golf performance and charity draw platform. Subscribers log Stableford scores, support a charity, and enter monthly prize draws — all from one clean, dark-themed interface.


---
### Application User Profiles & Subscription Statuses

| User ID | Email | Role | Subscription Status | Stripe Customer ID |
| :--- | :--- | :--- | :--- | :--- |
| `1` | `testuser@xyzemail.com` | Regular User | `inactive` | `None` |
| `2` | `testsubscribeduser@xyzemail.com` | Regular User | `active` | `None` |
| `3` | `testadminuser@xyzemail.com` | Staff / Admin | `inactive` | `None` |
*Password For all the users is :`TestPassword@123`*
---
---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy and fill environment file
cp .env.example .env
# → Set VITE_API_BASE_URL to your backend URL

# 3. Start dev server
npm run dev            # http://localhost:5173

# 4. Build for production
npm run build
npm run preview        # preview production build locally
```

---

## Environment Variables

Only **one variable** is required. Everything flows from it — change it once, nothing breaks.

```env
# .env
VITE_API_BASE_URL=http://localhost:8000/api
```

For production (e.g. Railway / Render backend):
```env
VITE_API_BASE_URL=https://your-backend.railway.app/api
```

Vite exposes all `VITE_` prefixed variables to the browser. The API client (`src/api/client.js`) reads this via `import.meta.env.VITE_API_BASE_URL`.

---

## Design System

The entire visual theme is controlled by **CSS variables in `src/index.css`**. Change a colour once — every component updates automatically.

### Colour Tokens

```css
/* src/index.css  ← edit here to retheme the whole app */
:root {
  --bg-base:             #050908;   /* page background        */
  --bg-surface:          #0d1712;   /* cards, panels          */
  --bg-raised:           #162219;   /* elevated elements      */

  --color-primary:       #22c55e;   /* brand green — actions  */
  --color-primary-dark:  #16a34a;   /* hover / pressed        */
  --color-primary-faint: #052e10;   /* very subtle green fill */

  --color-accent:        #fbbf24;   /* amber — warm CTA       */
  --color-accent-dark:   #d97706;   /* amber hover            */

  --border-subtle:       #1a2e22;
  --border-default:      #2a4535;

  --text-primary:        #f0f7f2;   /* ink on dark            */
  --text-muted:          #7aaa8a;   /* secondary text         */
  --text-faint:          #4a7a5a;   /* labels, captions       */

  --color-success:       #4ade80;
  --color-warning:       #fbbf24;
  --color-danger:        #f87171;
  --color-info:          #60a5fa;
}
```

### Typography

| Role     | Font          | Weights | Applied to                     |
|----------|---------------|---------|--------------------------------|
| Heading  | Space Grotesk | 600–700 | `font-heading` class, h1–h6    |
| Body     | Inter         | 400–600 | `font-body` class, default     |

Both fonts are loaded from Google Fonts in `index.html`.

### Tailwind Colour Map

Tailwind classes map directly to CSS variables so `autocomplete` works:

| Tailwind class       | CSS variable              |
|----------------------|---------------------------|
| `bg-bg-base`         | `--bg-base`               |
| `bg-bg-surface`      | `--bg-surface`            |
| `text-brand`         | `--color-primary`         |
| `bg-brand`           | `--color-primary`         |
| `bg-accent`          | `--color-accent`          |
| `text-ink`           | `--text-primary`          |
| `text-ink-muted`     | `--text-muted`            |
| `text-ink-faint`     | `--text-faint`            |
| `border-line-subtle` | `--border-subtle`         |
| `text-status-danger` | `--color-danger`          |

---

## Project Structure

```
src/
├── api/
│   └── client.js            Axios instance · JWT attach · silent refresh on 401
│
├── context/
│   └── AuthContext.jsx      User state · login · register · logout · isAdmin
│
├── hooks/
│   └── useApi.js            Generic data-fetch hook · useSubscription shortcut
│
├── components/
│   ├── auth/
│   │   └── ProtectedRoute.jsx   Route guards: ProtectedRoute + AdminRoute
│   ├── layout/
│   │   ├── Navbar.jsx           Public top nav
│   │   ├── AppLayout.jsx        Authenticated sidebar shell
│   │   └── AdminLayout.jsx      Admin sidebar shell
│   └── ui/
│       ├── Button.jsx           Variants: primary · secondary · ghost · danger · accent
│       ├── Card.jsx             Card · CardHeader · Badge · Input · Modal · StatTile · EmptyState
│       └── Spinner.jsx          Loading indicator (standalone)
│
├── pages/
│   ├── LandingPage.jsx          Public hero · how it works · charities · jackpot banner
│   ├── LoginPage.jsx            Email + password · redirect to intended page
│   ├── RegisterPage.jsx         Name · email · phone · password · auto-login
│   ├── PricingPage.jsx          Monthly / yearly plan cards · Stripe checkout redirect
│   ├── CharitiesPage.jsx        Public directory · search · filter · event modal
│   │
│   ├── dashboard/
│   │   ├── DashboardPage.jsx    User home: stats · draw preview · charity · scores widget
│   │   ├── ScoresPage.jsx       Stableford CRUD · rolling-5 visual · score bar
│   │   ├── DrawsPage.jsx        Current draw · lottery number display · match highlight · history
│   │   └── WinningsPage.jsx     Prize history · proof upload · payout tracking
│   │
│   └── admin/
│       ├── AdminOverviewPage.jsx    Live stats · action queue · quick links
│       ├── AdminUsersPage.jsx       Searchable user table · subscription status
│       ├── AdminDrawsPage.jsx       Create · run simulation · view results · publish
│       ├── AdminCharitiesPage.jsx   Add · edit · toggle featured · delete
│       └── AdminWinnersPage.jsx     Tabbed queue · proof viewer · approve/reject · mark paid
│
└── utils/
    └── helpers.js       fmt · fmtDate · status badge variants · monthName · pct
```

---

## Auth & JWT Flow

**Token lifetimes** (set in Django backend):
- Access token: **1 hour**
- Refresh token: **1 day**

**Storage**: `localStorage` — `access` and `refresh` keys.

**Silent refresh** (`src/api/client.js`):
```
Request fires → 401 returned
       ↓
POST /auth/jwt/refresh/  (with stored refresh token)
       ↓
  ┌─ Success → store new access token → retry original request
  └─ Failure → clear tokens → redirect to /login
```

Multiple simultaneous 401s are queued — only one refresh call goes out, and all queued requests retry once it resolves.

**Auth context** (`src/context/AuthContext.jsx`):
- `user` — current user object (null if unauthenticated)
- `isAdmin` — `user.is_staff === true`
- `login(email, password)` — calls `/auth/jwt/create/`, stores tokens, fetches user
- `register(payload)` — calls `/auth/users/`, then `login()`
- `logout()` — clears tokens + user state
- `fetchUser()` — re-fetches `/auth/users/me/` (useful after subscription changes)

---

## Key UI Patterns

### Fetching data
```jsx
import { useApi } from '../hooks/useApi';

const { data, loading, error, refetch } = useApi('/scores/');
```

### Protected routes
```jsx
// In App.jsx — user must be logged in
<ProtectedRoute><ScoresPage /></ProtectedRoute>

// Admin only
<AdminRoute><AdminDrawsPage /></AdminRoute>
```

### Reusable UI
```jsx
import Button from '../components/ui/Button';
import { Card, Badge, Input, Modal, StatTile, EmptyState } from '../components/ui/Card';
import Spinner from '../components/ui/Spinner';

<Button variant="primary" | "secondary" | "ghost" | "danger" | "accent" loading={bool}>
<Badge variant="green" | "amber" | "red" | "blue" | "muted" | "brand">
<StatTile icon={Icon} label="..." value="..." sub="..." accent />
<EmptyState icon={Icon} title="..." description="..." action={<Button>} />
```

### Subscription gate
```jsx
const isActive = sub?.status === 'active';
if (!isActive) return <Card>Subscribe to access this feature…</Card>;
```

### File upload (multipart)
```jsx
const fd = new FormData();
fd.append('proof_image', file);
await client.patch(`/winners/${id}/upload-proof/`, fd, {
  headers: { 'Content-Type': 'multipart/form-data' },
});
```

---

## Page Map

| Path                  | Auth      | Description                           |
|-----------------------|-----------|---------------------------------------|
| `/`                   | Public    | Landing — hero, draw jackpot, charities |
| `/login`              | Public    | Email + password login                |
| `/register`           | Public    | Sign-up (auto-logs in)                |
| `/pricing`            | Public    | Plan cards → Stripe checkout          |
| `/charities`          | Public    | Charity directory + search            |
| `/dashboard`          | User      | Summary: scores, draw, charity, sub   |
| `/scores`             | User + Sub| Stableford score CRUD                 |
| `/draws`              | User      | Draw history + current draw detail    |
| `/winnings`           | User      | Prize list + proof upload             |
| `/admin`              | Admin     | Overview stats + action queue         |
| `/admin/users`        | Admin     | User list with subscription status    |
| `/admin/draws`        | Admin     | Create → simulate → publish draws     |
| `/admin/charities`    | Admin     | Charity CRUD + featured toggle        |
| `/admin/winners`      | Admin     | Verify proof → approve/reject → pay   |

---

## Deployment

### Vercel (recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy (follow prompts)
vercel

# Set env var in Vercel dashboard or CLI:
vercel env add VITE_API_BASE_URL
```

**`vercel.json`** — add this for client-side routing:
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

### Netlify

Add `public/_redirects`:
```
/*  /index.html  200
```

### CORS

Make sure your Django backend has the frontend URL in `CORS_ALLOWED_ORIGINS` (set `FRONTEND_URL` in the backend `.env`).

---

## Tech Choices & Tradeoffs

| Choice | Reason | Tradeoff |
|--------|--------|----------|
| Vite over CRA | 10× faster HMR, native ESM | Slightly different config API |
| Axios over fetch | Interceptors for JWT refresh, consistent API | Extra dependency |
| Context over Zustand/Redux | Zero setup, sufficient for this scale | Re-renders more components on auth change |
| localStorage tokens | Simple, works cross-tab | Vulnerable to XSS — use httpOnly cookies for higher security requirements |
| CSS variables + Tailwind | Change entire theme in one file, Tailwind autocomplete works | Slight duplication between CSS vars and tailwind.config.js |
| lucide-react icons | Consistent, tree-shakeable, MIT license | Less icon variety than FontAwesome |
| No react-query | Keeps dependency count low, `useApi` hook is sufficient | Manual refetch calls, no caching layer |

---

*Digital Heroes Frontend · v1.0 · 2026*



