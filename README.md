# Despensa 🥛

**Household pantry & inventory tracker** — a full-stack PWA for families. Track stock levels, manage shopping lists, handle requests from household members, and see how pantry value is distributed.

---

## For Developers

### Prerequisites

- Node.js 18+
- npm 8+
- No database server needed — uses SQLite via `@libsql/client` (zero native dependencies, pure JS)

### Quick Start

```bash
git clone <your-repo-url>
cd pantry

# 1 — Copy environment files
cp server/.env.example server/.env
cp client/.env.example client/.env.local

# 2 — Edit server/.env
#     (defaults work out of the box for local dev — just change the JWT secrets in production)

# 3 — Install everything, create DB, seed with test data
npm run setup

# 4 — Start both frontend and backend
npm run dev
```

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3001

### Available Scripts (root)

| Script | What it does |
|---|---|
| `npm run dev` | Start frontend + backend concurrently |
| `npm run build` | Build Next.js frontend for production |
| `npm run db:seed` | Wipe and re-seed the database with test data |
| `npm run setup` | Full first-time setup (install + migrate + seed) |

### Environment Variables

**`server/.env`**

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `file:./dev.db` | SQLite file path (or LibSQL URL for Turso in prod) |
| `JWT_ACCESS_SECRET` | — | **Change in production.** Min 64 chars random string |
| `JWT_REFRESH_SECRET` | — | **Change in production.** Different 64 chars string |
| `PORT` | `3001` | Express server port |
| `CLIENT_ORIGIN` | `http://localhost:3000` | CORS — your frontend URL |
| `NODE_ENV` | `development` | Set to `production` in deployment |
| `VAPID_PUBLIC_KEY` | — | Optional: for push notifications (run `npx web-push generate-vapid-keys`) |
| `VAPID_PRIVATE_KEY` | — | Optional: for push notifications |
| `VAPID_SUBJECT` | `mailto:admin@pantry.app` | Optional: push notifications sender |

**`client/.env.local`**

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` | Backend API URL |

### Test Accounts (after seeding)

| Email | Password | Role |
|---|---|---|
| `mae@casa.com` | `pantry123` | SHOPPER (can add items, approve requests) |
| `pai@casa.com` | `pantry123` | SHOPPER (can add items, approve requests) |
| `eu@casa.com` | `pantry123` | DEPENDENT (can update own items, send requests) |

Household invite code: **`PANTRY`**

---

## Architecture

```
pantry/
├── client/          # Next.js 16 + Tailwind + shadcn/ui frontend
│   ├── app/         # App Router pages
│   │   ├── page.tsx         → redirects to /app or /login
│   │   ├── login/           → login form
│   │   ├── register/        → registration form
│   │   ├── onboarding/      → join household via invite code
│   │   └── app/             → main app (4 tabs: Pantry/Shopping/Requests/Spending)
│   ├── context/     # AuthContext, ReactQueryProvider
│   ├── hooks/       # useItems, useRequests, useSpending, useHousehold
│   ├── lib/api.ts   # Fetch wrapper with 401 auto-refresh interceptor
│   └── public/      # manifest.json, sw.js, icons/
│
├── server/          # Express + @libsql/client REST API
│   ├── src/
│   │   ├── db.js            → all DB helpers (no ORM — pure JS + SQL)
│   │   ├── app.js           → Express setup
│   │   ├── controllers/     → auth, household, items, requests, spending
│   │   ├── routes/          → route definitions
│   │   ├── middleware/       → requireAuth, requireShopper, errorHandler
│   │   └── utils/           → jwt, AppError, webPush
│   ├── prisma/seed.js       → seed script
│   └── index.js             → entry point
│
└── package.json     # Root scripts using concurrently
```

### Key Design Decisions

- **No Prisma / no binary deps** — uses `@libsql/client` (pure JS), which also supports [Turso](https://turso.tech) for production cloud SQLite with zero migration hassle.
- **JWT in memory** — access tokens stored in React context (not localStorage), refresh tokens in httpOnly cookies. Silent refresh on every app load.
- **Optimistic updates** — qty stepper updates the UI instantly and rolls back on error via React Query.
- **Role system** — SHOPPER can create/delete items, approve requests, manage members. DEPENDENT can only update qty on their own items and send requests.

---

## Deployment

### Recommended: Railway (free tier, no credit card)

1. Push to GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Add two services: one for `server/`, one for `client/`

**Server service:**
- Root directory: `server`
- Build command: `npm install`
- Start command: `node index.js`
- Environment variables: set all from `server/.env.example` with production values
- Set `DATABASE_URL` to a [Turso](https://turso.tech) database URL (free tier: 500MB) — or keep `file:./dev.db` for single-instance Railway deployments

**Client service:**
- Root directory: `client`
- Build command: `npm run build`
- Start command: `npm start`
- Set `NEXT_PUBLIC_API_URL` to your Railway server URL (e.g. `https://pantry-server.railway.app`)
- Set `CLIENT_ORIGIN` on the server to your client Railway URL

### Alternative: Render (also free)

Same approach — create two Web Services, one per folder.

### Production Checklist

- [ ] Change `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` to 64+ character random strings
- [ ] Set `NODE_ENV=production`
- [ ] Set `CLIENT_ORIGIN` to your actual frontend URL (no trailing slash)
- [ ] Set `NEXT_PUBLIC_API_URL` to your actual backend URL
- [ ] Optional: Set VAPID keys for push notifications (`npx web-push generate-vapid-keys`)
- [ ] Use Turso or a persistent volume for `DATABASE_URL` so data survives redeploys

---

## Install on Your Phone — No App Store Needed

This is a **Progressive Web App (PWA)**. Once deployed, any family member can install it directly from their browser — it will look and feel like a native app on their home screen.

### iPhone (Safari)

1. Open **Safari** and go to your app's URL (e.g. `https://despensa.railway.app`)
2. Log in with your account
3. Tap the **Share button** at the bottom of the screen — it looks like a box with an arrow pointing up
4. Scroll down in the share sheet and tap **"Add to Home Screen"**
5. Tap **"Add"** in the top right corner
6. **Done!** Despensa now appears on your home screen like any other app

> **Note:** Must use Safari on iPhone — Chrome on iOS cannot install PWAs.

### Android (Chrome)

1. Open **Chrome** and go to your app's URL
2. Log in with your account
3. Tap the **three dots menu** (⋮) in the top right
4. Tap **"Add to Home screen"**
5. Tap **"Add"**
6. **Done!** Despensa appears on your home screen

### What you get after installing

- Opens full-screen, no browser chrome
- Works offline for viewing your pantry (syncs when back online)
- Push notifications when items run low (tap "Allow" when asked)
- Fast load times — app shell is cached locally

---

## Copy-Paste Instructions for the Family

> Send this in your family group chat once the app is deployed:

---

**Instalar a Despensa no teu telemóvel:**

📱 **iPhone:**
1. Abre o Safari e vai a `https://SEU-URL-AQUI.com`
2. Inicia sessão com a tua conta
3. Toca no botão de partilha (o quadrado com a seta para cima, no fundo do ecrã)
4. Toca em **"Adicionar ao Ecrã de Início"**
5. Toca em **"Adicionar"**
6. Pronto! A Despensa aparece no teu ecrã de início como uma app normal 🎉

🤖 **Android:**
1. Abre o Chrome e vai a `https://SEU-URL-AQUI.com`
2. Inicia sessão com a tua conta
3. Toca nos três pontos (⋮) no canto superior direito
4. Toca em **"Adicionar ao ecrã principal"**
5. Toca em **"Adicionar"**
6. Pronto! 🎉

💡 Aceita as notificações para receberes alertas quando os produtos estão a acabar.

Para te juntares à casa usa o código de convite: **PANTRY** (ou o código gerado nas definições)
