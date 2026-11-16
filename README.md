# TripMate

TripMate is a responsive, browser-based trip money manager and photo studio MVP.

## Run locally

Requirements: Node.js 22 or newer (the project uses Node's built-in `node:sqlite`).

```powershell
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The server uses only Node's built-in modules, so `npm install` is not required.

The real application is served from `/`. The earlier visual-only prototype is preserved at
[/demo.html](http://localhost:3000/demo.html).

## Open it on a phone

Connect the phone and computer to the same Wi-Fi network. Find the computer's
IPv4 address with `ipconfig`, then open `http://YOUR-COMPUTER-IP:3000` on the
phone. For this machine, the current Ethernet address is
`http://172.16.3.127:3000`. If Windows Firewall prompts for Node.js, allow
private-network access. The phone must use the real app URL (`/`), not
`/demo.html`.

## Build the Android APK

The complete Android WebView wrapper is in [mobile/](./mobile/). It opens the
real database-backed app over the local network, preserving authentication,
expenses, wallet records, motion, and the ocean theme. Open that folder in
Android Studio with Android SDK 35 and JDK 17, then follow
[mobile/README.md](./mobile/README.md).

For an old laptop, use the lightweight [desktop app launcher](./TripMate.cmd)
instead. It requires only Node.js and Edge/Chrome; see
[DESKTOP-APP.md](./DESKTOP-APP.md).

## Included in this MVP

- Overview dashboard with wallet, spend, activity and members
- Expense records with equal-share settlement calculations
- Wallet contributions and transfer records
- Suggested repayments and category reports
- CSV expense export
- Responsive Canvas photo editor with presets, adjustments, rotation and JPEG download
- SQLite persistence in `data/tripmate.sqlite`
- Multi-trip switcher and new trip creation
- Member invitations to add travelers to any trip
- Expense records with customizable split participants, editing (✎), and equal-share settlement calculations
- Password hashing with Node's `scrypt`, secure HTTP-only session cookies, and server-side trip membership checks
- JSON API routes for authentication, trip details, expenses, wallet entries, and summaries
- Travel core screens: Explore with live OpenStreetMap places, Open-Meteo weather, Leaflet map markers, and an AI itinerary planner adapter

## Travel API configuration

The Explore screen works without paid credentials using Nominatim, Overpass, OpenStreetMap tiles, and Open-Meteo. The AI planner requires a server environment variable before use:

```powershell
$env:OPENAI_API_KEY = "your-key"
$env:OPENAI_MODEL = "gpt-4.1-mini" # optional
npm run dev
```

For a free local AI planner, install Ollama and download a model:

```powershell
ollama pull llama3.2
ollama serve
npm run dev
```

The app uses Ollama automatically when `OPENAI_API_KEY` is not set. Optional settings are `OLLAMA_URL` and `OLLAMA_MODEL`. Do not put provider keys in browser code or commit them to the repository.

This version is intentionally local-first: it does not claim that a bank or UPI transfer occurred. Seeded development login: `arjun@tripmate.local` / `tripmate`. Financial values are stored as integer paise in SQLite.
