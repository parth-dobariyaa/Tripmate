# TripMate desktop app

TripMate can run as a lightweight Windows desktop app without Android Studio,
Gradle, an emulator, or a large desktop framework.

## Run it

Double-click [`TripMate.cmd`](./TripMate.cmd). It will:

1. Start the real Node/SQLite TripMate server.
2. Open TripMate in an app-style Microsoft Edge or Chrome window.
3. Fall back to the normal browser if neither browser is found.

The app URL is `http://localhost:3000/`.

## Stop it

Double-click [`Stop-TripMate.cmd`](./Stop-TripMate.cmd), or close the server
window. The Stop script only targets the process listening on port 3000.

## Requirements

- Node.js 22 or newer
- Microsoft Edge or Google Chrome
- No Android Studio, Android SDK, Gradle, Java, emulator, or extra npm package

The desktop app is the same real connected TripMate website: SQLite data,
authentication, expenses, wallet records, profile, motion, and the ocean theme
are all preserved.
