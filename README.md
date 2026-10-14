# SMUNI Real-Time One-to-One Messaging System

A secure, high-performance, real-time private messaging web application built with a Node.js/Express backend, SQLite database persistence, Socket.IO bidirectional communication, and a responsive React frontend styled with custom CSS using the SMUNI design system.

---

## 1. Project Overview & Features

- **Real-Time One-to-One Messaging**: Instant bidirectional communication powered by Socket.IO rooms (`user:<userId>`).
- **Permanent SQLite Persistence**: All messages are authorized, validated, and stored in a local SQLite database before broadcasting, ensuring history persists across browser refreshes, logouts, and server restarts.
- **Robust Authentication**:
  - Registration with username, email, and password validation.
  - Password hashing with `bcrypt` (10 salt rounds).
  - JWT token generation (issued via response and HttpOnly cookie).
  - Protected API routes and authenticated Socket.IO handshake connections.
- **User Directory & Privacy**:
  - Live directory listing all registered users (excluding the current user).
  - Real-time online/offline presence indicators.
  - Strict privacy enforcement: users can only fetch and view messages in conversations they participate in.
- **SMUNI Visual Design System**:
  - Primary green / CTA: `#1C5E40`
  - Main background: `#F7FCF8`
  - Secondary surfaces: `#F0F7F3`
  - Responsive layout with desktop sidebar + main chat and mobile master-detail view.
  - Polished empty states, connection indicators, and character counter (limit 2,000 characters).

---

## 2. Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React 19 + Vite | Fast, responsive UI with declarative state |
| **Styling** | Custom Vanilla CSS | SMUNI brand palette, CSS variables, zero runtime overhead |
| **Backend** | Node.js + Express 5 | REST API, session management, routing |
| **Database** | SQLite (`node:sqlite`) | Embedded relational database with WAL & foreign keys |
| **Real-Time** | Socket.IO | WebSockets with fallback polling & room-based dispatch |
| **Security** | bcryptjs + jsonwebtoken | Cryptographic hashing & stateless JWT authorization |
| **Testing** | Node.js Test Runner + Supertest (Backend)<br>Vitest + Testing Library (Frontend) | Automated integration & component tests |

---

## 3. Folder Structure

```
realtime-messaging-system/
├── package.json               # Root workspace scripts (run, dev, test, build)
├── .gitignore                 # Excludes node_modules, .env, *.db
├── README.md                  # Comprehensive project documentation
├── server/                    # Node.js / Express Backend
│   ├── .env.example           # Environment template
│   ├── package.json           # Backend dependencies and scripts
│   ├── src/
│   │   ├── app.js             # Express app setup, CORS, JSON/cookie parsing, routes
│   │   ├── config.js          # Environment config loader
│   │   ├── db.js              # SQLite database schema, connections, and query operations
│   │   ├── server.js          # HTTP server, DB initialization, and Socket.IO attachment
│   │   ├── socket.js          # Socket.IO handlers, authentication, rooms, message events
│   │   ├── middleware/
│   │   │   └── auth.js        # JWT middleware for Express and Socket.IO handshake
│   │   └── routes/
│   │       ├── auth.js        # /register, /login, /logout, /me
│   │       ├── users.js       # /api/users (user directory)
│   │       └── messages.js    # /api/messages/:userId and POST /api/messages
│   └── tests/
│       ├── auth.test.js       # Registration, login, duplicate check, token tests
│       └── messages.test.js   # Authorization, message persistence, limits, history tests
└── client/                    # React Frontend
    ├── index.html             # HTML5 entry with Inter font & SMUNI branding
    ├── package.json           # Frontend dependencies and scripts
    ├── vite.config.js         # Vite configuration with proxy and Vitest setup
    ├── public/
    │   └── favicon.svg        # SMUNI brand SVG icon
    └── src/
        ├── main.jsx           # React root mounting
        ├── App.jsx            # Application layout coordinator & message listener
        ├── index.css          # Design system & responsive styles
        ├── context/
        │   ├── AuthContext.jsx    # Auth state, login/register/logout actions
        │   └── SocketContext.jsx  # Socket.IO connection, presence, message sender
        ├── components/
        │   ├── Auth.jsx       # Login & Register forms with validation
        │   ├── Header.jsx     # Branding, live indicator, user info, logout
        │   ├── Sidebar.jsx    # User directory, search filter, online status
        │   └── ChatArea.jsx   # Message thread, composer, character counter
        └── __tests__/
            └── Auth.test.jsx  # Vitest component test suite
```

---

## 4. Database Schema and Relationships

SQLite schema is initialized automatically upon server startup (`server/src/db.js`):

```sql
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL COLLATE NOCASE,
  email TEXT UNIQUE NOT NULL COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(sender_id, recipient_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id, created_at);
```

### Entity Relationships
- **Users to Messages (Sender)**: One-to-Many (`users.id = messages.sender_id`).
- **Users to Messages (Recipient)**: One-to-Many (`users.id = messages.recipient_id`).
- Foreign keys are enforced (`PRAGMA foreign_keys = ON;`).

---

## 5. Installation & Prerequisites

- **Node.js**: `v20.0.0` or higher (tested on `v22.18.0`).
- **npm**: `v9.0.0` or higher (tested on `11.12.1`).

### Quick Start Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/Fanuel27/realtime-messaging-system.git
cd realtime-messaging-system

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
cd ..
```

---

## 6. Environment Configuration

Create `.env` inside the `server/` directory:

```bash
cp server/.env.example server/.env
```

Default configuration (`server/.env`):
```env
PORT=5000
CLIENT_ORIGIN=http://localhost:5173
JWT_SECRET=super_secret_jwt_key_change_in_production
DB_PATH=./messaging.db
NODE_ENV=development
```

---

## 7. Running the Application

### Option A: From Root Directory
```bash
# Terminal 1: Start backend server (port 5000)
npm run start:server

# Terminal 2: Start frontend client (port 5173)
npm run start:client
```

### Option B: From Individual Subdirectories
```bash
# Backend
cd server
npm start

# Frontend
cd client
npm run dev
```

Open your browser at **`http://localhost:5173`**.

---

## 8. Automated Testing & Production Build

### Run All Tests (Backend + Frontend)
```bash
npm test
```

### Run Backend API Tests
```bash
npm run test:server
# Runs 22 Supertest integration tests against in-memory SQLite
```

### Run Frontend Vitest Tests
```bash
npm run test:client
# Runs 4 component tests with Vitest & Testing Library
```

### Build Frontend for Production
```bash
npm run build
# Creates optimized bundle in client/dist/
```

---

## 9. API Endpoint Summary

All API endpoints except `/api/auth/register` and `/api/auth/login` require a valid JWT passed via `Authorization: Bearer <token>` or `token` cookie.

| Method | Endpoint | Description | Status Codes |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register new user (`username`, `email`, `password`) | `201`, `400`, `409`, `500` |
| `POST` | `/api/auth/login` | Authenticate user (`email`, `password`) | `200`, `400`, `401`, `500` |
| `POST` | `/api/auth/logout` | Clears authentication cookie | `200` |
| `GET` | `/api/auth/me` | Fetch current authenticated user profile | `200`, `401` |
| `GET` | `/api/users` | List all registered users (excluding current user) | `200`, `401` |
| `GET` | `/api/messages/:userId` | Get conversation history between current user and `:userId` | `200`, `400`, `401`, `404` |
| `POST` | `/api/messages` | HTTP fallback to send message (`recipient_id`, `content`) | `201`, `400`, `401`, `404` |
| `GET` | `/api/health` | Health check endpoint | `200` |

---

## 10. Real-Time Socket.IO Protocol

### Handshake & Authentication
Clients authenticate during the Socket.IO connection handshake by passing the JWT in `auth: { token }`:
```javascript
const socket = io('http://localhost:5000', {
  auth: { token: 'eyJhbGciOi...' }
});
```
The server verifies the JWT and attaches `socket.user`. Each socket automatically joins its own private user room: `user:<userId>`.

### Socket Events
- **`message:send` (Client -> Server)**:
  - Payload: `{ recipient_id: number, content: string, temp_id: string }`
  - Validates recipient existence, content length (1–2000 chars), and prevents self-messaging.
  - Persists message to SQLite database.
  - Broadcasts `message:new` to recipient's room (`user:<recipient_id>`) and sender's room (`user:<sender_id>`).
- **`message:new` (Server -> Client)**:
  - Payload: `{ id, sender_id, recipient_id, content, created_at, temp_id }`
- **`presence:initial` & `presence:update` (Server -> Client)**:
  - Broadcasts list of active user IDs currently connected to the server.

---

## 11. Security Implementation & Mitigations

1. **Password Security**: Passwords are never stored in plaintext; salted and hashed using `bcrypt` (10 rounds). Password hashes are omitted from all API responses and database fetch helpers.
2. **Sender Impersonation Prevention**: The `sender_id` is always extracted from the cryptographically verified JWT (`req.user.id` or `socket.user.id`), never accepted from client payloads.
3. **Conversation Privacy**: The `/api/messages/:userId` endpoint filters strictly by `(sender_id = :self AND recipient_id = :other) OR (sender_id = :other AND recipient_id = :self)`, preventing users from accessing third-party conversations.
4. **SQL Injection Defense**: All database queries use parameterized SQL statements (`?`).
5. **Input Sanitation & Limits**: Messages are trimmed and validated on the backend. Messages exceeding 2,000 characters or empty strings are rejected with HTTP 400.
6. **CORS & Cookie Security**: CORS origins are restricted to configured client hosts (`http://localhost:5173` in local dev). Cookies are configured with `HttpOnly`, `SameSite: Lax`, and `Secure` flags.

---

## 12. Verification & Test Results

### Automated Test Suite: 26 Tests Passing
- **Backend API Tests (22/22 Passing)**:
  - Registration with valid credentials, short password rejection, invalid email rejection.
  - Duplicate username rejection (409) and duplicate email rejection (409).
  - Login with correct and incorrect credentials.
  - Protected endpoint rejection (401) without token and success with token.
  - User directory listing excluding current user.
  - Empty message (400) and oversized message >2000 chars (400) rejection.
  - Message persistence to SQLite with valid ID and ISO timestamp.
  - Chronological history retrieval and third-party conversation privacy verification.
- **Frontend Component Tests (4/4 Passing)**:
  - Login form rendering, Register tab toggle, client-side input validations.
- **Production Build**:
  - Vite client production bundle built cleanly in 2.18s (`dist/index.html`, `dist/assets/`).

### Live End-to-End Browser Session
- Tested in Chromium browser:
  - User 1 (`elena_dev`) registered and confirmed empty directory state.
  - User 2 (`marcus_node`) registered and found `elena_dev` in sidebar.
  - Marcus sent real-time message to Elena.
  - Persisted message survived browser refresh.
  - Elena logged in, viewed Marcus's message, and sent a real-time reply.
  - Bi-directional real-time exchange and history display verified.
