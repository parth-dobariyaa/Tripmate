# TripMate — Complete Project Guide

![TripMate travel inspiration](https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=85)

> **Real-data requirement:** TripMate must not use hardcoded demo destinations, fake ratings, invented opening hours, or fabricated prices. Location details should come from real provider APIs. If a field is unavailable, show “Not available” rather than making it up.

This document combines the project README, complete application structure, database plan, API endpoint blueprint, integrations, setup guidance, and implementation checklist into one Markdown file.

---

# TripMate — Photo Studio & Trip Expense Manager

A web-based application for four friends to manage trip money, track every expense and transfer, save trip memories, and edit photos with Instagram-style aesthetic filters.

## 1. Project Goals

TripMate combines two connected modules:

1. **Trip Money Manager** — one main friend acts as treasurer, records the shared fund, sends money to friends, and tracks all expenses and balances.
2. **Photo Studio** — friends upload photos, apply filters and adjustments, crop and rotate images, preview edits, and download edited photos.

The app should work in a modern desktop or mobile browser. The first version is a web application, not a native Windows desktop program.

## 2. Technology Stack

| Area | Technology |
|---|---|
| Frontend | HTML5, CSS3, JavaScript (ES modules) |
| Photo editing | Canvas API; CSS filters for previews; optional WebGL later |
| Charts | Optional Chart.js |
| Backend | Node.js + Express |
| Database | SQLite for local development; PostgreSQL or MySQL for deployment |
| File storage | Local uploads during development; object storage for production |
| Authentication | Server-side sessions with secure password hashing |
| Development tools | VS Code, Git, Node.js and npm |

**Why JavaScript?** It powers the interface and the photo editor in the browser. Using Node.js on the backend also allows the project to use JavaScript across the whole application.

> If you prefer PHP + MySQL because you already use Laragon, the frontend photo editor can still be JavaScript. The backend in this README is Node.js + Express to keep the starter architecture in one language.

## 3. Main Features

### A. Accounts and Trip Members
- Register, log in and log out.
- Create one trip and invite exactly four friends (the limit can be configurable).
- Assign one member the **Treasurer** role.
- Give every member their own dashboard and financial summary.
- Restrict private trip data to authorized members.

### B. Treasurer and Shared Money
- Record the opening fund and contributions received from each friend.
- Record transfers from the treasurer to any friend.
- Support equal transfers to all four friends or custom amounts per friend.
- Track payment method, date, recipient, amount, notes and reference.
- Record common-wallet expenses and cash withdrawals.
- Show the current recorded wallet balance and complete transaction history.
- Never claim a real UPI/bank transfer occurred unless a payment provider confirms it; manual entries are only records.

### C. Expense Tracking
- Add expenses such as food, petrol, hotel, tickets, shopping and other costs.
- Record who paid, what was purchased, amount, date, category, notes and optional receipt.
- Split an expense equally or use custom shares for selected friends.
- Edit or void transactions with an audit trail.
- Avoid double-counting: a transfer between friends is not automatically a trip expense.

### D. Automatic Balances and Settlement
- Show each friend's contributions, transfers received, personal payments, allocated shared costs and repayments separately.
- Calculate each member's net balance based on recorded transactions.
- Suggest who should pay whom to settle shared costs.
- Keep a clear distinction between **cash held by the treasurer**, **money transferred to friends**, and **expenses actually incurred**.

### E. Photo Studio
- Upload JPEG, PNG and WebP photos.
- Preview an image before editing.
- Preset filters: Original, Warm, Vintage, Film, Moody, Soft, Golden Hour and Black & White.
- Adjust brightness, contrast, saturation, warmth, highlights and shadows.
- Crop to square (1:1), portrait post (4:5) or Story (9:16).
- Rotate and flip photos.
- Optional text, border and film-grain effects.
- Before/after preview and reset controls.
- Export the edited image as JPEG or PNG.
- Save original and edited versions separately when the user chooses.
- Keep an optional shared album for the four friends.

### F. Trip Memories
- Shared gallery and albums grouped by trip/day.
- Captions, uploader and upload date.
- Optional activity/location notes.
- Download photos and remove only when authorized.
- Photos are stored as files; the database stores metadata and storage paths.

### G. Reports
- Total contributions and total expenses.
- Wallet cash balance and recorded transfers.
- Individual member ledger.
- Expense breakdown by category.
- Downloadable CSV summary in the first version; PDF can be added later.

## 4. Complete Folder Structure

```text
tripmate/
├── README.md
├── package.json
├── .env.example
├── .gitignore
├── server.js
│
├── src/
│   ├── app.js
│   ├── config/
│   │   ├── env.js
│   │   └── database.js
│   │
│   ├── middleware/
│   │   ├── require-auth.js
│   │   ├── require-trip-member.js
│   │   ├── require-treasurer.js
│   │   ├── error-handler.js
│   │   └── upload-validation.js
│   │
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── trips.routes.js
│   │   ├── members.routes.js
│   │   ├── wallet.routes.js
│   │   ├── transfers.routes.js
│   │   ├── expenses.routes.js
│   │   ├── settlements.routes.js
│   │   ├── photos.routes.js
│   │   ├── albums.routes.js
│   │   └── reports.routes.js
│   │
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── trips.controller.js
│   │   ├── wallet.controller.js
│   │   ├── transfers.controller.js
│   │   ├── expenses.controller.js
│   │   ├── settlements.controller.js
│   │   ├── photos.controller.js
│   │   └── reports.controller.js
│   │
│   ├── services/
│   │   ├── auth.service.js
│   │   ├── wallet.service.js
│   │   ├── balance.service.js
│   │   ├── settlement.service.js
│   │   ├── photo-storage.service.js
│   │   └── report.service.js
│   │
│   ├── validators/
│   │   ├── auth.validators.js
│   │   ├── expense.validators.js
│   │   ├── transfer.validators.js
│   │   └── photo.validators.js
│   │
│   └── utils/
│       ├── money.js
│       ├── dates.js
│       └── async-handler.js
│
├── database/
│   ├── migrations/
│   ├── seeds/
│   │   └── development-seed.js
│   └── schema-notes.md
│
├── public/
│   ├── index.html
│   ├── login.html
│   ├── register.html
│   ├── dashboard.html
│   ├── trip.html
│   ├── wallet.html
│   ├── expenses.html
│   ├── settlements.html
│   ├── memories.html
│   ├── photo-editor.html
│   ├── reports.html
│   │
│   ├── assets/
│   │   ├── css/
│   │   │   ├── reset.css
│   │   │   ├── variables.css
│   │   │   ├── layout.css
│   │   │   ├── components.css
│   │   │   ├── dashboard.css
│   │   │   ├── photo-editor.css
│   │   │   └── responsive.css
│   │   │
│   │   ├── js/
│   │   │   ├── api.js
│   │   │   ├── auth.js
│   │   │   ├── dashboard.js
│   │   │   ├── trip.js
│   │   │   ├── wallet.js
│   │   │   ├── expenses.js
│   │   │   ├── settlements.js
│   │   │   ├── memories.js
│   │   │   ├── photo-editor.js
│   │   │   ├── photo-filters.js
│   │   │   ├── photo-export.js
│   │   │   └── reports.js
│   │   │
│   │   └── images/
│   │
│   └── favicon.svg
│
├── storage/
│   ├── originals/       # Local development only; never expose directly
│   ├── edited/          # Local development only; never expose directly
│   └── receipts/        # Local development only; never expose directly
│
└── tests/
    ├── money.test.js
    ├── balance.test.js
    ├── settlement.test.js
    ├── expenses.test.js
    └── photo-validation.test.js
```

## 5. Main Pages and Navigation

1. **Landing page** — introduction, features and sign-in.
2. **Register/Login** — secure account access.
3. **Dashboard** — trip fund, expenses, recent transfers, and quick actions.
4. **Trip Details** — dates, destination and four members.
5. **Wallet** — fund balance, contributions and wallet transactions.
6. **Send Money** — choose one friend or divide a specified amount equally.
7. **Expenses** — create, list, filter and inspect expenses.
8. **Expense Split** — equal or custom shares.
9. **Settlements** — net balances and suggested repayments.
10. **Memories** — shared trip albums and photo gallery.
11. **Photo Editor** — upload, preview, filters, adjustments, crop and export.
12. **Reports** — member ledgers, category summaries and CSV export.
13. **Settings** — profile, trip permissions and data export.

## 6. Suggested Database Design

Use database migrations to create these tables. Use primary keys, foreign keys, timestamps and indexes.

| Table | Purpose |
|---|---|
| `users` | Account details and password hash |
| `trips` | Name, destination, dates and creator |
| `trip_members` | Membership and role (`treasurer` or `member`) |
| `wallet_accounts` | Recorded shared-fund account for a trip |
| `contributions` | Money added to the shared fund by a member |
| `wallet_transactions` | Auditable inflows, outflows and adjustments |
| `transfers` | Money recorded as sent from one member to another |
| `expenses` | Expense amount, category, payer and receipt reference |
| `expense_splits` | Share allocated to each participating member |
| `settlements` | Repayments made to settle balances |
| `albums` | Photo album metadata |
| `photos` | Original/edited file paths, uploader, caption and dimensions |
| `photo_edits` | Edit settings and exported image references |
| `activity_logs` | Important actions and financial record changes |

### Money calculation rules

- Store money as integer paise (for example, ₹100.50 = `10050`) to avoid floating-point rounding.
- Record each financial event once and use database transactions for related writes.
- A contribution increases the common fund only when actually received and recorded.
- A transfer from the common fund reduces that fund and increases the recipient's recorded cash/advance balance; it is **not automatically an expense**.
- When a friend spends transferred money on an eligible trip cost, record the expense and link the receipt if available.
- Shared expenses are allocated through `expense_splits`; the total of shares must equal the expense amount.
- Do not count a common-wallet hotel payment as a second personal payment by the treasurer.
- Keep a ledger/audit trail. Prefer reversing a transaction over permanently deleting financial history.
- Show that the displayed balances are based on records entered into the app; they are not bank-verified balances.

## 7. Photo Editor Design

### Editing flow

1. User chooses **Upload Photo**.
2. The browser loads a preview using an image element or object URL.
3. Filter presets and sliders update the preview immediately.
4. Crop/rotate operations define the final image composition.
5. **Reset** restores the original preview state.
6. **Save to Device** exports a new JPEG/PNG using Canvas.
7. **Save to Trip Album** uploads the exported image and metadata to the backend.

### Photo editor modules

- `photo-editor.js` — upload selection, preview and editor state.
- `photo-filters.js` — preset definitions and adjustments.
- `photo-export.js` — render the final composition and export.
- `photo-editor.css` — editor workspace, toolbar, slider and responsive layout.

Keep the original file unchanged. Apply edits to a preview/rendering pipeline and create a new exported file. For large images, use reasonable resolution limits and handle memory errors.

## 8. API Route Plan

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/auth/register` | Register |
| `POST` | `/api/auth/login` | Log in |
| `POST` | `/api/auth/logout` | Log out |
| `GET` | `/api/trips/:tripId` | Get trip details |
| `GET` | `/api/trips/:tripId/members` | List trip members |
| `GET` | `/api/trips/:tripId/wallet` | Get recorded wallet balance and history |
| `POST` | `/api/trips/:tripId/contributions` | Record a contribution |
| `POST` | `/api/trips/:tripId/transfers` | Record a transfer |
| `GET` | `/api/trips/:tripId/expenses` | List expenses |
| `POST` | `/api/trips/:tripId/expenses` | Add an expense |
| `POST` | `/api/trips/:tripId/settlements` | Record a settlement |
| `GET` | `/api/trips/:tripId/albums` | List albums |
| `POST` | `/api/trips/:tripId/photos` | Upload a photo |
| `GET` | `/api/photos/:photoId` | Get authorized photo metadata |
| `POST` | `/api/photos/:photoId/edits` | Save edit metadata/export reference |
| `GET` | `/api/trips/:tripId/reports/summary` | Get trip summary |

All routes must verify authentication, trip membership and the correct role. Validate amounts and file uploads on the server. Use CSRF protection for session-based state-changing requests.

## 9. Setup Instructions

### Prerequisites

Install:
- Node.js LTS
- VS Code
- Git (recommended)

### Run locally

```bash
# 1. Open a terminal in the project folder
npm install

# 2. Copy the environment template
# Windows Command Prompt:
copy .env.example .env

# 3. Start the development server
npm run dev
```

Then open the local URL printed by the server, for example `http://localhost:3000`.

> These commands describe the intended setup. The project will only run after `package.json`, the server, dependencies, database migrations and frontend files have been implemented.

### Example environment variables

```env
NODE_ENV=development
PORT=3000
SESSION_SECRET=replace-with-a-long-random-secret
DATABASE_URL=./database/tripmate.sqlite
UPLOAD_DIR=./storage
MAX_UPLOAD_MB=15
```

Do not commit `.env` or real secrets to Git.

## 10. Security and Privacy

- Hash passwords with a modern password-hashing library such as Argon2id or bcrypt.
- Use secure, HTTP-only, SameSite cookies and HTTPS in production.
- Validate MIME type, extension, file size and decoded image content.
- Generate server-side filenames; never trust user-supplied paths.
- Restrict uploads to approved image formats and prevent executable file uploads.
- Store private images outside the public web root and serve them through authorized routes.
- Enforce role checks on the server, not only by hiding buttons.
- Limit upload sizes and request rates.
- Back up the database and photo storage together.
- Provide a way for the trip owner to export or delete trip data according to the app's retention policy.

## 11. Visual Design Direction

- Premium, modern, responsive interface.
- Clean dashboard with clear wallet and expense summaries.
- Dark photo-editing workspace with large preview and accessible adjustment controls.
- Filter thumbnails, simple sliders and visible before/after comparison.
- Mobile-friendly layouts for uploading photos during the trip.
- Accessible contrast, keyboard focus and labels.

## 12. Development Roadmap

### Phase 1 — Foundation
- Set up Node.js, Express and database migrations.
- Implement registration, login and trip membership.
- Create the responsive navigation and dashboard.

### Phase 2 — Money Manager
- Build contributions, wallet ledger and transfers.
- Add expenses, split calculations and settlement suggestions.
- Test rounding, refunds, reversals and double-counting scenarios.

### Phase 3 — Photo Studio
- Implement image upload and preview.
- Add presets, adjustment sliders, crop and rotate.
- Implement export and download.

### Phase 4 — Shared Memories
- Save originals and edited images securely.
- Build shared albums, captions and permissions.
- Add trip timeline and photo metadata.

### Phase 5 — Reports and Release
- Build CSV exports and summaries.
- Add tests, upload limits, backups and error handling.
- Deploy with HTTPS and durable private file storage.

## 13. Definition of Done

- [ ] Four friends can join the same trip.
- [ ] The treasurer can record contributions and transfers.
- [ ] Each financial event appears in the correct history.
- [ ] Shared expenses can be split equally or by custom amounts.
- [ ] Member balances reconcile without double-counting.
- [ ] Users can upload, edit, preview and download photos.
- [ ] Original photos remain unchanged unless a user explicitly replaces them.
- [ ] Authorized friends can view and upload to the shared album.
- [ ] Private trips and photos are protected by server-side permissions.
- [ ] Database and photo storage can be backed up and restored.

---

**Project name:** TripMate  
**Module name:** TripMate Photo Studio  
**Initial platform:** Responsive web application  
**Core language:** JavaScript  
**Purpose:** Manage trip money transparently and turn trip photos into aesthetic, shareable memories.


---

# TripMate — Complete Structure & API Blueprint

TripMate is a web app for four friends to discover destinations, plan itineraries, track shared money, edit trip photos, and save shared memories.

## 1. Technology Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, JavaScript ES modules |
| Backend | Node.js + Express |
| Database | MySQL |
| Photo editor | JavaScript Canvas API |
| AI trip guide | OpenAI API, called only from backend |
| Places & restaurants | Google Maps Platform Places API or another licensed provider |
| Weather | Open-Meteo or another weather provider |
| Charts | Chart.js |
| Authentication | Server-side sessions + Argon2id/bcrypt |
| Testing | Vitest + Supertest |
| Development | VS Code, Node.js, npm, Git |

## 2. Main Modules

1. **Accounts & trips:** register/login, create a trip, invite four friends, set one treasurer.
2. **AI travel guide:** attractions, scenic places, local food, restaurants, hidden gems, weather, practical tips and day-by-day itineraries.
3. **Money manager:** shared wallet, contributions, transfers from treasurer to friends, expenses, equal/custom splits, balances and settlement suggestions.
4. **Photo Studio:** upload, aesthetic presets, brightness/contrast/saturation/warmth, crop, rotate, text, before/after and JPG/PNG export.
5. **Shared memories:** albums, captions, date/location, uploader, original and edited versions.
6. **Reports:** spending charts, individual ledgers, CSV export and activity history.

AI must organize real place records; it must not invent addresses, ratings, prices, opening hours or live availability. Show estimates separately from verified provider data.

## 3. Complete Folder Structure

```text
tripmate/
├── README.md
├── package.json
├── package-lock.json
├── .env.example
├── .gitignore
├── server.js
├── src/
│   ├── app.js
│   ├── config/
│   │   ├── env.js
│   │   ├── database.js
│   │   └── session.js
│   ├── middleware/
│   │   ├── require-auth.js
│   │   ├── require-trip-member.js
│   │   ├── require-treasurer.js
│   │   ├── validate-request.js
│   │   ├── upload-validation.js
│   │   └── error-handler.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── users.routes.js
│   │   ├── trips.routes.js
│   │   ├── members.routes.js
│   │   ├── travel-guide.routes.js
│   │   ├── places.routes.js
│   │   ├── itinerary.routes.js
│   │   ├── wallet.routes.js
│   │   ├── contributions.routes.js
│   │   ├── transfers.routes.js
│   │   ├── expenses.routes.js
│   │   ├── settlements.routes.js
│   │   ├── albums.routes.js
│   │   ├── photos.routes.js
│   │   ├── reports.routes.js
│   │   └── notifications.routes.js
│   ├── controllers/
│   ├── services/
│   │   ├── places-provider.service.js
│   │   ├── ai-itinerary.service.js
│   │   ├── weather.service.js
│   │   ├── wallet.service.js
│   │   ├── balance.service.js
│   │   ├── settlement.service.js
│   │   └── photo-storage.service.js
│   ├── repositories/
│   ├── validators/
│   └── utils/
├── database/
│   ├── schema.sql
│   ├── migrations/
│   └── seeds/
├── public/
│   ├── index.html
│   ├── login.html
│   ├── register.html
│   ├── dashboard.html
│   ├── trips.html
│   ├── trip-details.html
│   ├── explore.html
│   ├── places.html
│   ├── food-guide.html
│   ├── itinerary.html
│   ├── travel-tips.html
│   ├── wallet.html
│   ├── transfers.html
│   ├── expenses.html
│   ├── settlements.html
│   ├── photo-editor.html
│   ├── memories.html
│   ├── albums.html
│   ├── reports.html
│   ├── members.html
│   ├── notifications.html
│   ├── settings.html
│   └── assets/
│       ├── css/
│       │   ├── tokens.css
│       │   ├── layout.css
│       │   ├── components.css
│       │   ├── dashboard.css
│       │   ├── travel-guide.css
│       │   ├── finance.css
│       │   ├── photo-editor.css
│       │   ├── gallery.css
│       │   └── responsive.css
│       ├── js/
│       │   ├── api-client.js
│       │   ├── auth.js
│       │   ├── dashboard.js
│       │   ├── trips.js
│       │   ├── explore.js
│       │   ├── places.js
│       │   ├── itinerary.js
│       │   ├── wallet.js
│       │   ├── transfers.js
│       │   ├── expenses.js
│       │   ├── settlements.js
│       │   ├── photo-editor.js
│       │   ├── photo-filters.js
│       │   ├── photo-export.js
│       │   ├── memories.js
│       │   └── reports.js
│       └── images/
├── storage/                  # private; never serve directly
│   ├── originals/
│   ├── edited/
│   └── receipts/
└── tests/
    ├── auth.test.js
    ├── wallet.test.js
    ├── balances.test.js
    ├── settlements.test.js
    ├── travel-guide.test.js
    └── photo-upload.test.js
```

## 4. Database Tables

| Table | Purpose |
|---|---|
| `users` | Accounts and password hashes |
| `trips` | Destination, dates, budget and creator |
| `trip_members` | Members and roles |
| `trip_invitations` | Invite tokens and expiry |
| `saved_places` | Provider place IDs, name, coordinates and source |
| `itinerary_days` | Each day of the itinerary |
| `itinerary_stops` | Ordered places, notes and visit duration |
| `place_recommendations` | AI suggestions linked to sourced places |
| `wallet_accounts` | Recorded common fund per trip |
| `contributions` | Money received into the fund |
| `wallet_transactions` | Auditable fund inflows/outflows |
| `transfers` | Transfers between treasurer and members |
| `expenses` | Expense amount, payer, category and receipt |
| `expense_splits` | Amount allocated to each member |
| `settlements` | Repayments between members |
| `albums` | Shared photo albums |
| `photos` | Original/edited file metadata and storage keys |
| `photo_edits` | Filter settings and export references |
| `notifications` | Alerts |
| `activity_logs` | Audit history |

**Money rules:** store amounts as integer paise; use DB transactions for related writes; a transfer is not automatically an expense; do not count a common-wallet purchase twice; each expense's splits must sum exactly to its total; reverse incorrect entries instead of silently deleting them.

## 5. API Convention

Base URL: `/api/v1`

Use JSON for normal requests, `multipart/form-data` for uploads, and session authentication for protected routes.

Success example:

```json
{ "data": {}, "meta": { "requestId": "server-generated-id" } }
```

Error example:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Check submitted fields." } }
```

### Authentication and users

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/auth/register` | Register |
| POST | `/auth/login` | Log in |
| POST | `/auth/logout` | Log out |
| GET | `/auth/me` | Current user |
| POST | `/auth/forgot-password` | Request reset |
| POST | `/auth/reset-password` | Reset with valid token |
| PATCH | `/users/me` | Update profile |

### Trips and members

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/trips` | Create trip |
| GET | `/trips` | List my trips |
| GET | `/trips/:tripId` | Trip details |
| PATCH | `/trips/:tripId` | Update trip |
| POST | `/trips/:tripId/invitations` | Invite a friend |
| POST | `/invitations/:token/accept` | Accept invitation |
| GET | `/trips/:tripId/members` | List members |
| PATCH | `/trips/:tripId/members/:memberId` | Update role/status |

### AI travel guide and places

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/trips/:tripId/travel-guide` | Generate personalized guide |
| GET | `/places/search?q=...&destination=...` | Search places |
| GET | `/places/:placeId` | Place details |
| GET | `/places/nearby?lat=...&lng=...&type=...` | Nearby food/attractions |
| GET | `/places/:placeId/photos` | Provider photo references |
| POST | `/trips/:tripId/saved-places` | Save place |
| GET | `/trips/:tripId/saved-places` | List saved places |
| DELETE | `/trips/:tripId/saved-places/:id` | Remove saved place |
| GET | `/weather?lat=...&lng=...&date=...` | Weather if supported |

### Itinerary

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/trips/:tripId/itinerary/days` | Add day |
| GET | `/trips/:tripId/itinerary` | Read itinerary |
| PATCH | `/trips/:tripId/itinerary/days/:dayId` | Update day |
| POST | `/trips/:tripId/itinerary/days/:dayId/stops` | Add stop |
| PATCH | `/trips/:tripId/itinerary/stops/:stopId` | Update/reorder stop |
| DELETE | `/trips/:tripId/itinerary/stops/:stopId` | Remove stop |

### Wallet, contributions and transfers

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/trips/:tripId/wallet` | Wallet balance/history summary |
| GET | `/trips/:tripId/wallet/transactions` | Wallet history |
| POST | `/trips/:tripId/contributions` | Record contribution |
| GET | `/trips/:tripId/contributions` | List contributions |
| POST | `/trips/:tripId/transfers` | Record money transfer |
| GET | `/trips/:tripId/transfers` | Transfer history |
| GET | `/trips/:tripId/members/:memberId/ledger` | Member ledger |

### Expenses and settlements

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/trips/:tripId/expenses` | Add expense |
| GET | `/trips/:tripId/expenses` | List/filter expenses |
| GET | `/trips/:tripId/expenses/:expenseId` | Expense details |
| PATCH | `/trips/:tripId/expenses/:expenseId` | Edit with audit trail |
| POST | `/trips/:tripId/expenses/:expenseId/reverse` | Reverse error |
| GET | `/trips/:tripId/balances` | Member balances |
| POST | `/trips/:tripId/settlements/suggestions` | Calculate suggested repayments |
| POST | `/trips/:tripId/settlements` | Record repayment |
| GET | `/trips/:tripId/settlements` | Settlement history |

### Photo Studio and memories

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/trips/:tripId/albums` | Create album |
| GET | `/trips/:tripId/albums` | List albums |
| POST | `/trips/:tripId/photos` | Upload original photo |
| GET | `/trips/:tripId/photos` | List photos |
| GET | `/photos/:photoId` | Photo metadata |
| GET | `/photos/:photoId/file` | Authorized file delivery |
| POST | `/photos/:photoId/edits` | Save edit metadata/export |
| PATCH | `/photos/:photoId` | Update caption/album |
| DELETE | `/photos/:photoId` | Authorized delete |
| GET | `/trips/:tripId/memories/timeline` | Timeline by date |

### Reports and notifications

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/trips/:tripId/reports/summary` | Trip summary |
| GET | `/trips/:tripId/reports/expenses.csv` | CSV export |
| GET | `/trips/:tripId/reports/members` | Member summaries |
| GET | `/notifications` | List notifications |
| PATCH | `/notifications/:id/read` | Mark read |

Use suitable status codes: 200, 201, 204, 400, 401, 403, 404, 409, 413, 422, 429 and 500. Validate all inputs and authorize every protected endpoint.

## 6. AI Travel Guide Request/Response

Example request:

```json
{
  "destination": "Udaipur, Rajasthan, India",
  "startDate": "2027-01-15",
  "days": 2,
  "budgetStyle": "budget",
  "interests": ["local food", "scenic places"],
  "travellers": 4
}
```

Suggested response shape:

```json
{
  "destination": "Udaipur, Rajasthan, India",
  "days": [
    {
      "day": 1,
      "title": "Old City and lakes",
      "stops": [
        {
          "placeId": "provider-place-id",
          "reason": "Historic architecture and lake views",
          "estimatedVisitMinutes": 90,
          "estimatedCostPaise": null,
          "verificationStatus": "provider_data"
        }
      ]
    }
  ],
  "notesToVerify": [
    "Opening hours",
    "Current entry fees",
    "Boat departure times"
  ]
}
```

This is an example schema, not live destination data. The backend should search the Places provider first, then ask AI to organize those real records and validate the output before saving.

## 7. External APIs

### OpenAI
Use the Responses API from `src/services/ai-itinerary.service.js`. Keep the API key server-side, validate structured output, apply rate limits and set a spending cap.

Docs: https://developers.openai.com/api/reference/overview

### Google Maps Platform Places
Use Text Search/Nearby Search for places, Place Details for supported details, and Place Photos where permitted. Enable only required APIs, configure billing and quotas, and follow display/caching terms.

Docs:
- https://developers.google.com/maps/documentation/places/web-service
- https://developers.google.com/maps/documentation/places/web-service/nearby-search

### Open-Meteo
Use forecast data only for supported dates and show when the forecast was retrieved.

Docs: https://open-meteo.com/en/docs

### OpenStreetMap services
OSM data and each OSM service have their own terms. Public Nominatim is limited and is not an unrestricted autocomplete or bulk-search service; choose a provider whose usage terms fit your app.

Policy: https://operations.osmfoundation.org/policies/nominatim/

## 8. Environment Variables

Create `.env.example`:

```env
NODE_ENV=development
PORT=3000
APP_BASE_URL=http://localhost:3000

DB_HOST=localhost
DB_PORT=3306
DB_NAME=tripmate
DB_USER=tripmate_app
DB_PASSWORD=replace_me

SESSION_SECRET=replace_with_long_random_secret

OPENAI_API_KEY=
OPENAI_MODEL=
GOOGLE_MAPS_API_KEY=
WEATHER_API_KEY=

UPLOAD_DIR=./storage
MAX_UPLOAD_MB=15
```

Never commit `.env` or real secrets. Add `.env`, `storage/`, `node_modules/` and logs to `.gitignore`.

## 9. Setup Commands

Install Node.js LTS and MySQL, then in the project folder:

```bash
npm init -y
npm install express mysql2 dotenv express-session helmet express-rate-limit multer zod argon2 openai
npm install --save-dev nodemon vitest supertest
```

Set `"type": "module"` and scripts in `package.json`:

```json
{
  "type": "module",
  "scripts": {
    "dev": "nodemon server.js",
    "start": "node server.js",
    "test": "vitest run"
  }
}
```

Copy `.env.example` to `.env`, configure MySQL, implement `database/schema.sql`, then build the server and routes. These commands install dependencies; they do not generate the complete app automatically.

## 10. Security Checklist

- Hash passwords with Argon2id/bcrypt.
- Use secure, HTTP-only, SameSite cookies and HTTPS in production.
- Add CSRF protection for session-based mutations.
- Validate uploaded MIME type, extension, file size and decoded image content.
- Store photos outside `public/`; serve them through authorized endpoints.
- Generate file names server-side and prevent path traversal.
- Check trip membership/role on every protected route.
- Keep audit history for financial changes; use idempotency keys for writes.
- Limit image sizes, API requests and AI costs.
- Back up database and photo storage together.
- Never log passwords, session cookies, API keys or private files.

## 11. Build Order

1. Express server, MySQL, migrations and authentication.
2. Trip creation, invitations and four-member roles.
3. Wallet, contributions, transfers and expense ledger.
4. Splits, balances, settlement suggestions and financial tests.
5. Places provider, destination search and AI travel guide.
6. Itinerary and saved places.
7. Canvas photo editor, filters, crop, rotate and export.
8. Secure uploads, shared albums and timeline.
9. Reports, notifications, mobile responsiveness and deployment.

## 12. Definition of Done

- [ ] Four friends can join a trip with correct permissions.
- [ ] Treasurer can record contributions and transfers.
- [ ] Expenses and balances reconcile without double-counting.
- [ ] Travel guide uses sourced place data and labels estimates.
- [ ] AI output is validated before saving.
- [ ] Photos can be edited and exported.
- [ ] Shared photos are protected by server-side permissions.
- [ ] Reports match the ledger.
- [ ] Tests cover money calculations, authorization and file uploads.
- [ ] No private keys or uploads are exposed publicly.

**Project:** TripMate  
**Core language:** JavaScript  
**Backend:** Node.js + Express  
**Database:** MySQL  
**Modules:** AI Travel Guide · Money Manager · Photo Studio · Memories · Reports
