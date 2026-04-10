# MedBridge+ with Backend

MedBridge+ now features a robust Node.js backend with SQLite persistence.

## Features
- **Centralized Config**: Configuration (languages, symptoms, rules) is served from the backend.
- **Persistent Storage**: Triage reports are stored in a local SQLite database (`medbridge.db`).
- **Admin Dashboard**: New dashboard at `/dashboard.html` for clinic staff to view and manage triage cases.
- **Offline Fallback**: Frontend still includes logic to fallback to local JSON files if the server is unreachable.

## Getting Started
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the server:
   ```bash
   npm start
   ```
3. Open `http://localhost:3000` in your browser.
4. Access the admin dashboard at `http://localhost:3000/dashboard.html`.

## Tech Stack
- **Frontend**: Vanilla HTML/JS, Modern CSS.
- **Backend**: Node.js, Express.
- **Database**: SQLite3.
