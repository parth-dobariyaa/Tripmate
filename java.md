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
