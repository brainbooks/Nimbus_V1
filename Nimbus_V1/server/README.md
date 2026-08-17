# TeleCloud Nimbus — Backend V1

> Secure gateway between the React frontend and Telegram's MTProto protocol.

---

## 1. Project Overview

TeleCloud Nimbus uses Telegram's "Saved Messages" as a personal cloud storage system. The frontend is a React application that allows users to log in with their Telegram account, view storage statistics, and (in future versions) upload and download files.

**This backend exists for one reason:** browsers cannot securely store Telegram credentials. The original frontend exposed `API_ID`, `API_HASH`, and raw Telegram session strings directly in client-side JavaScript — a critical security vulnerability.

The backend moves all Telegram communication server-side while preserving the exact same frontend user experience.

---

## 2. Backend Architecture

```
┌─────────────┐     HTTP/JSON      ┌─────────────────┐    MTProto     ┌──────────────┐
│  React App  │  ─────────────►    │  Node.js Server  │  ──────────►  │   Telegram   │
│  (Browser)  │  ◄─────────────    │  (Express + GramJS)│  ◄──────────  │   Servers    │
└─────────────┘                    └─────────────────┘                └──────────────┘
                                           │
                                           ▼
                                   ┌───────────────┐
                                   │ Encrypted File │
                                   │   Sessions     │
                                   └───────────────┘
```

**The backend is NOT the application.** It is only a secure proxy. The frontend contains all application logic, UI, routing, and state management.

---

## 3. Request Flow

```
React Frontend
      │
      ▼
fetch("/api/auth/send-otp", { phone: "+91..." })
      │
      ▼
Express Server (index.js)
      │
      ▼
Auth Route Handler (routes/auth.js)
      │
      ▼
Telegram Client Manager (telegram.js)
      │
      ▼
GramJS TelegramClient → Telegram MTProto Servers
      │
      ▼
Response flows back up the same chain
      │
      ▼
React receives JSON: { success: true, sessionToken: "abc123..." }
```

---

## 4. Folder Structure

```
server/
├── config/
│   └── env.js              # Environment variable validation and configuration
├── middleware/
│   └── session.js           # Session token validation for protected routes
├── routes/
│   ├── auth.js              # Authentication endpoints (login, OTP, 2FA, QR, logout)
│   ├── user.js              # User data endpoints (profile, storage)
│   └── files.js             # Placeholder for future file operations
├── storage/
│   └── sessions/            # Encrypted Telegram session files
│       └── .gitkeep
├── .env                     # Environment secrets (NOT committed to git)
├── .env.example             # Template with documentation
├── index.js                 # Express app bootstrap and startup
├── package.json             # Backend dependencies
├── sessions.js              # Encrypted session file I/O
├── telegram.js              # TelegramClient lifecycle management
└── README.md                # This file
```

---

## 5. File Explanation

### `index.js` — Server Bootstrap
**Responsibility:** Express app setup, middleware registration, route mounting, server startup.
**Never add:** Route handlers, business logic, Telegram code, session logic.

### `config/env.js` — Configuration
**Responsibility:** Read, validate, and export all environment variables as a frozen object.
**Never add:** Runtime logic, route handlers, Telegram code.

### `telegram.js` — Client Lifecycle Manager
**Responsibility:** Create, cache, reuse, and auto-cleanup GramJS TelegramClient instances. Generate cryptographic session tokens.
**Never add:** Route handlers, HTTP logic, session file I/O.

### `sessions.js` — Encrypted Session Storage
**Responsibility:** Encrypt/decrypt and save/load Telegram session strings to disk.
**Never add:** Client management, route handlers, authentication logic.

### `middleware/session.js` — Session Validation
**Responsibility:** Extract `x-session-token` header, validate it, attach Telegram client to request.
**Never add:** Route handlers, direct Telegram API calls.

### `routes/auth.js` — Authentication Routes
**Responsibility:** All authentication endpoints (OTP, 2FA, QR, logout, status).
**Never add:** User data retrieval, file operations, upload logic.

### `routes/user.js` — User Data Routes
**Responsibility:** Profile and storage data retrieval for authenticated users.
**Never add:** Authentication logic, file operations.

### `routes/files.js` — File Operations (Placeholder)
**Responsibility:** Reserved for future upload/download functionality.
**Never add:** Authentication logic, user profile logic.

---

## 6. Authentication Flow

### Phone Login

```
User enters phone number
        │
        ▼
POST /api/auth/send-otp  { phone: "+91XXXXXXXXXX" }
        │
        ├── Creates TelegramClient
        ├── Sends OTP via Telegram
        └── Returns { sessionToken }
        │
        ▼
User enters OTP code
        │
        ▼
POST /api/auth/verify-otp  { code: "12345" }
  Headers: x-session-token: <sessionToken>
        │
        ├── Verifies OTP with Telegram
        ├── If SUCCESS → saves encrypted session → returns { status: "SUCCESS" }
        └── If 2FA needed → returns { status: "PASSWORD_REQUIRED" }
        │
        ▼ (if 2FA required)
User enters 2FA password
        │
        ▼
POST /api/auth/verify-password  { password: "..." }
  Headers: x-session-token: <sessionToken>
        │
        ├── Verifies password with Telegram
        └── Saves encrypted session → returns { status: "SUCCESS" }
```

### QR Login

```
Login page loads
        │
        ▼
POST /api/auth/qr/generate
        │
        ├── Creates TelegramClient
        ├── Requests login token from Telegram
        └── Returns { sessionToken, url, expires }
        │
        ▼
Frontend renders QR code from URL
Frontend polls every 3 seconds:
        │
        ▼
POST /api/auth/qr/check
  Headers: x-session-token: <sessionToken>
        │
        ├── PENDING → QR not scanned yet
        ├── MIGRATED → DC switch completed, regenerate QR
        ├── PASSWORD_REQUIRED → show 2FA input
        └── SUCCESS → saves encrypted session → done
```

---

## 7. API Documentation

### `POST /api/auth/send-otp`

**Purpose:** Send OTP verification code to a phone number.

**Request:**
```json
{ "phone": "+911234567890" }
```

**Response (200):**
```json
{ "success": true, "sessionToken": "a1b2c3..." }
```

**Errors:**
| Status | Error |
|--------|-------|
| 400 | Invalid phone format |
| 500 | Failed to send verification code |

---

### `POST /api/auth/verify-otp`

**Purpose:** Verify OTP code from Telegram.

**Headers:** `x-session-token: <sessionToken>`

**Request:**
```json
{ "code": "12345" }
```

**Response (200):**
```json
{ "success": true, "status": "SUCCESS" }
```
or
```json
{ "success": true, "status": "PASSWORD_REQUIRED" }
```

**Errors:**
| Status | Error |
|--------|-------|
| 400 | Invalid code format / Invalid verification code / Code expired |
| 401 | Session not found |
| 500 | Verification failed |

---

### `POST /api/auth/verify-password`

**Purpose:** Verify 2FA cloud password.

**Headers:** `x-session-token: <sessionToken>`

**Request:**
```json
{ "password": "my2fapassword" }
```

**Response (200):**
```json
{ "success": true, "status": "SUCCESS" }
```

**Errors:**
| Status | Error |
|--------|-------|
| 400 | Password required / Incorrect 2FA password |
| 401 | Session not found |
| 500 | 2FA verification failed |

---

### `POST /api/auth/qr/generate`

**Purpose:** Generate a QR login token for scanning with Telegram mobile app.

**Headers (optional):** `x-session-token: <sessionToken>` (for refresh)

**Response (200):**
```json
{
  "success": true,
  "sessionToken": "a1b2c3...",
  "url": "tg://login?token=abc123...",
  "expires": 1700000000
}
```

---

### `POST /api/auth/qr/check`

**Purpose:** Check if QR code has been scanned.

**Headers:** `x-session-token: <sessionToken>`

**Response (200):**
```json
{ "success": true, "status": "PENDING" }
```
Possible status values: `PENDING`, `SUCCESS`, `PASSWORD_REQUIRED`, `MIGRATED`

---

### `GET /api/auth/status`

**Purpose:** Check if a stored session token is still valid.

**Headers:** `x-session-token: <sessionToken>`

**Response (200):**
```json
{ "success": true, "valid": true }
```

---

### `POST /api/auth/logout`

**Purpose:** Destroy session and log out from Telegram.

**Headers:** `x-session-token: <sessionToken>`

**Response (200):**
```json
{ "success": true }
```

---

### `GET /api/user/profile`

**Purpose:** Get authenticated user's display name and username.

**Headers:** `x-session-token: <sessionToken>`

**Response (200):**
```json
{
  "success": true,
  "name": "JOHN DOE",
  "title": "@johndoe"
}
```

---

### `GET /api/user/storage`

**Purpose:** Get storage usage breakdown by file type.

**Headers:** `x-session-token: <sessionToken>`

**Response (200):**
```json
{
  "success": true,
  "categories": [
    { "name": "IMAGES", "size": "1.24GB" },
    { "name": "VIDEOS", "size": "3.50GB" },
    { "name": "PDF'S", "size": "0.15GB" },
    { "name": "OTHER'S", "size": "0.87GB" }
  ]
}
```

---

### `GET /api/health`

**Purpose:** Server health check.

**Response (200):**
```json
{ "status": "ok", "timestamp": 1700000000000 }
```

---

## 8. Telegram Integration

### TelegramClient
The backend uses [GramJS](https://github.com/nicedayzhu/gram-js-client) (`telegram` npm package) for all Telegram communication. A `TelegramClient` instance is created per user session and cached in memory for reuse.

### Sessions
GramJS uses `StringSession` objects that serialize to a string containing the authenticated connection state. These strings are encrypted with AES-256-GCM before being saved to disk.

### Authentication
Telegram supports two authentication methods:
1. **Phone + OTP** — standard SMS/Telegram message code
2. **QR Code** — scan from an already-authenticated device

Both may optionally require a **2FA cloud password** as a second step.

### Upload Flow (Future)
Files will be sent to Telegram's "Saved Messages" (the user's self-chat) using `client.sendFile()`. This is not implemented in V1.

### Download Flow (Future)
Files will be retrieved using `client.downloadMedia()`. This is not implemented in V1.

---

## 9. Session Management

### Where sessions are stored
Encrypted session files are stored in `server/storage/sessions/` as `<sessionToken>.session` files.

### Why file-based storage
V1 avoids database dependencies to keep the stack minimal. File-based storage is simple, requires no setup, and works on any platform.

### Security considerations
- Session strings are **encrypted** using AES-256-GCM with a 256-bit server-side key
- Each file uses a unique **initialization vector (IV)** for every write
- The encryption key is stored in `.env` and never committed to version control
- Session tokens sent to the browser are **opaque random hex strings** — they reveal nothing about Telegram internals
- Even if an attacker gains filesystem access, session files are useless without the encryption key

### Future migration to Firebase
The session storage interface is intentionally simple: `saveSession()`, `loadSession()`, `removeSession()`, `sessionExists()`. To migrate to Firebase:
1. Replace the file I/O in `sessions.js` with Firebase Firestore/RTDB calls
2. Remove or encrypt data at rest using Firebase security rules
3. No changes needed in any other file

---

## 10. Security

### Why secrets remain on the backend
| Secret | Risk if exposed |
|--------|----------------|
| `API_ID` | Attacker can create Telegram apps impersonating yours |
| `API_HASH` | Combined with API_ID, enables full API access |
| Session strings | **Grants complete account access** — read messages, send messages, access files |

### Common mistakes to avoid
- ❌ Never log session strings or tokens to console in production
- ❌ Never return Telegram error internals to the frontend
- ❌ Never store API_ID/API_HASH in frontend environment variables (Vite exposes `VITE_*` vars to the browser)
- ❌ Never disable CORS in production
- ❌ Never commit `.env` files

### Best practices
- ✅ Keep `API_ID` and `API_HASH` only in `server/.env`
- ✅ Use opaque session tokens (not raw Telegram sessions) for frontend communication
- ✅ Encrypt session files at rest
- ✅ Validate all input before passing to Telegram
- ✅ Return generic error messages to the frontend

---

## 11. Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `API_ID` | ✅ | — | Telegram API ID from [my.telegram.org](https://my.telegram.org) |
| `API_HASH` | ✅ | — | Telegram API Hash from [my.telegram.org](https://my.telegram.org) |
| `SESSION_ENCRYPTION_KEY` | ✅ | — | 256-bit hex key for encrypting session files |
| `PORT` | ❌ | `3001` | Port the backend listens on |
| `CORS_ORIGIN` | ❌ | `http://localhost:5173` | Allowed frontend origin for CORS |
| `CLIENT_IDLE_TIMEOUT_MINUTES` | ❌ | `30` | Minutes before idle Telegram clients are disconnected |

### Generating the encryption key
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 12. Installation

### Prerequisites
- Node.js 18+ (20+ recommended)
- npm

### Setup

```bash
# 1. Install frontend dependencies
cd TeleCloud-NIMBUS-main
npm install

# 2. Install backend dependencies
cd server
npm install

# 3. Create environment file
cp .env.example .env
# Edit .env and fill in API_ID, API_HASH, SESSION_ENCRYPTION_KEY

# 4. Generate encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Copy the output to SESSION_ENCRYPTION_KEY in .env
```

### Development

```bash
# Terminal 1 — Start backend
cd server
npm run dev

# Terminal 2 — Start frontend
cd ..
npm run dev
```

The frontend runs on `http://localhost:5173` and proxies `/api/*` requests to the backend on port 3001.

### Production

```bash
# Build frontend
npm run build

# Start backend (serves as API gateway)
cd server
npm start
```

In production, use a reverse proxy (nginx, Caddy) to:
1. Serve the frontend static files from `dist/`
2. Proxy `/api/*` requests to the Node.js backend

---

## 13. Future Roadmap

### Firebase Integration
**What changes:** Replace `sessions.js` file I/O with Firestore/RTDB calls.
**What stays:** Everything else. The session interface is designed for this swap.

### Metadata Database
**What changes:** Add a new `storage/` module for file metadata (names, sizes, dates).
**What stays:** Auth flow, session management, existing routes.

### Upload Queue
**What changes:** Add queue logic to `routes/files.js` and a new processing module.
**What stays:** All existing modules.

### WebSocket Progress
**What changes:** Add Socket.io or `ws` to `index.js` for real-time upload/download progress.
**What stays:** REST API endpoints continue to work alongside WebSocket events.

### Sharing
**What changes:** Add sharing endpoints to `routes/files.js`.
**What stays:** Auth, session management, core architecture.

### Background Uploads
**What changes:** Add a job processing module that continues uploads after the request ends.
**What stays:** All existing REST endpoints.

### Multi-Device Support
**What changes:** Move session storage from files to a shared database (Firebase/PostgreSQL).
**What stays:** The session interface (`saveSession`, `loadSession`, etc.) — only the implementation changes.

---

## 14. Coding Guidelines

### File Organization
- One responsibility per file
- Clear section comments with `// ==================================================`
- Comments explain WHY, not WHAT

### Naming Conventions
- Routes: kebab-case paths (`/auth/send-otp`)
- Files: camelCase or lowercase (`telegram.js`, `auth.js`)
- Functions: camelCase (`generateSessionToken`)
- Constants: UPPER_SNAKE_CASE (`CLEANUP_INTERVAL_MS`)

### Error Handling
- Always return `{ success: false, error: "..." }` for errors
- Never expose internal error messages to the client
- Log internal errors to console with context

### Response Format
```json
{
  "success": true,
  "...": "data fields"
}
```

---

## 15. Troubleshooting

### Server won't start
- **Missing .env:** Copy `.env.example` to `.env` and fill in all required values
- **Invalid encryption key:** Must be exactly 64 hex characters
- **Port in use:** Change `PORT` in `.env` or stop the process using port 3001

### "Session expired" errors
- The Telegram session may have been invalidated (logged out from another device)
- The encrypted session file may be corrupted — delete `storage/sessions/` contents and re-login

### QR code not working
- Ensure the backend is running and accessible
- Check that Vite's proxy is configured (the `/api` prefix must be proxied to port 3001)
- QR tokens expire — the frontend auto-refreshes them

### CORS errors
- Ensure `CORS_ORIGIN` in `.env` matches the frontend URL exactly
- During development, the Vite proxy should handle this automatically

### "Telegram connection timed out"
- Telegram's servers may be temporarily unreachable
- Check your network connection
- The default timeout is 15 seconds — this is sufficient for normal conditions

---

## 16. Developer Notes

### Why a separate backend?
Browser JavaScript cannot securely store secrets. Any value in client-side JS (including environment variables bundled by Vite) is readable by anyone with browser DevTools. Telegram credentials stored client-side could be extracted and used to hijack user accounts.

### Why Express 5?
Express 5 is the latest stable release with modern async error handling. It eliminates the need for `express-async-errors` or manual try/catch wrappers in most cases.

### Why no JWT?
V1 uses opaque session tokens mapped to server-side state. JWTs would add complexity without benefit — we need server-side state anyway (the TelegramClient instance). Adding JWT would mean managing two types of sessions.

### Why no rate limiting in V1?
Rate limiting should be implemented at the reverse proxy level (nginx/Caddy) in production, not in the application layer. Telegram itself also rate-limits API calls.

---

## 17. Architecture Decision Records

### ADR-1: Why the backend exists
**Decision:** Move all Telegram communication from the browser to a Node.js server.
**Context:** The original frontend exposed `API_ID` (35458068) and `API_HASH` directly in client-side JavaScript. Session strings were stored in `sessionStorage` as base64 — trivially accessible via DevTools.
**Consequence:** Every Telegram operation now requires an HTTP round-trip through the backend. This adds ~50-100ms latency per request but eliminates the security vulnerability entirely.

### ADR-2: Why Telegram communication moved to backend
**Decision:** The backend is a thin proxy, not a full application server.
**Context:** The React frontend already contains all application logic (routing, state management, UI). Rebuilding this in the backend would duplicate logic and create maintenance burden.
**Consequence:** The backend has exactly 8 source files. It does one thing: securely proxy Telegram requests.

### ADR-3: Why no database in Version 1
**Decision:** Use encrypted files for session storage instead of a database.
**Context:** The only data that needs persistence is Telegram session strings (one per user). A database (MongoDB, PostgreSQL, etc.) would add operational complexity (installation, connection management, schema migrations) for storing a single string per user.
**Consequence:** Session storage is limited to the local filesystem. Multi-server deployments require a shared filesystem or migration to a database.

### ADR-4: Why encrypted session files
**Decision:** Encrypt session files at rest using AES-256-GCM.
**Context:** Telegram session strings grant complete account access. If an attacker gains filesystem access (via server compromise, backup leak, etc.), raw session files would allow account takeover.
**Consequence:** Session files are useless without the encryption key. The key is stored in `.env` which should be managed through environment variables in production (not files).

### ADR-5: Why minimal backend
**Decision:** Only implement what the current frontend requires — nothing more.
**Context:** Over-engineering the backend with features like upload queues, WebSocket progress, admin panels, etc. before they're needed creates maintenance burden and unused code paths.
**Consequence:** V1 supports exactly 9 API endpoints. New features are added only when the frontend needs them.

### ADR-6: Future migration strategy
**Decision:** Design storage interfaces for swappability.
**Context:** V1 uses files, but the project will eventually need Firebase or a database for multi-device support, metadata storage, and shared access.
**Consequence:** `sessions.js` exposes 4 functions (`save`, `load`, `remove`, `exists`). Switching to Firebase requires changing only this one file — no other module references the filesystem directly for session data.
