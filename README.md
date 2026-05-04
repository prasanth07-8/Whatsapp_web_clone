# WhatsApp Web Clone

<div align="center">

![WhatsApp Web Clone](https://img.shields.io/badge/WhatsApp-Web%20Clone-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4.x-010101?style=for-the-badge&logo=socket.io&logoColor=white)

A production-grade, pixel-perfect full-stack clone of WhatsApp Web built with React, Node.js, Socket.IO, and MongoDB. Replicates the exact UI, UX, real-time behavior, and feature set of WhatsApp Web.

[Features](#-features) • [Architecture](#-system-architecture) • [Tech Stack](#-tech-stack) • [Setup](#-getting-started) • [API Reference](#-api-reference) • [Socket Events](#-socket-events)

</div>

---

## 📋 Table of Contents

- [Features](#-features)
- [System Architecture](#-system-architecture)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [API Reference](#-api-reference)
- [Socket Events](#-socket-events)
- [Database Schema](#-database-schema)
- [Design System](#-design-system)

---

## ✨ Features

### 🔐 Authentication & Security
| Feature | Description |
|---------|-------------|
| Email + Password | Secure registration and login |
| OTP Verification | 6-digit code sent via Gmail SMTP (Nodemailer) |
| JWT Sessions | 7-day expiry, stored in localStorage |
| Password Hashing | bcryptjs with salt rounds |
| Auto-logout | Token expiry detection |

### 💬 Messaging
| Feature | Description |
|---------|-------------|
| Real-time messaging | Socket.IO WebSocket connection |
| Read receipts | Single → double grey → double blue ticks |
| Typing indicators | Live per-chat typing status |
| Reply to message | Click reply preview scrolls to original with flash |
| Edit messages | Edit own messages within session |
| Delete messages | Delete for me / Delete for everyone (68 min limit) |
| Forward messages | Multi-select and forward to any chat |
| Star messages | Save important messages |
| Pin messages | Pin up to multiple messages per chat |
| Copy messages | Copy text to clipboard |
| Draft messages | Auto-saved to MongoDB, restored on chat open |
| Link preview | OG tag scraping with live preview in input bar |

### 🎤 Voice Messages
| Feature | Description |
|---------|-------------|
| Recording | Pause/resume with live waveform visualization |
| Playback | WhatsApp-style player with avatar, waveform, playhead |
| Auto-play chain | Next voice message plays automatically |
| 60fps playhead | requestAnimationFrame for smooth animation |
| Upload spinner | Optimistic UI while uploading |

### 📎 Media & Attachments
| Feature | Description |
|---------|-------------|
| Images | Send/receive with full-screen lightbox |
| Videos | Inline playback |
| Audio files | File upload + voice recording |
| Documents | Download with filename display |
| Media preview | Full-screen modal before sending with caption |
| Emoji picker | Skin tone support, GIF/sticker tabs |

### 😀 Emoji Reactions
| Feature | Description |
|---------|-------------|
| Quick reactions | 6 WhatsApp reactions on hover |
| Full emoji picker | 7 categories, search, 300×420px panel |
| Reaction details | Filter by emoji, voter list, click to remove |
| Real-time | Broadcast via Socket.IO |

### 📊 Special Message Types
| Type | Features |
|------|----------|
| Polls | Radio/check options, progress bars, voter avatars, "View votes" panel |
| Events | Calendar card with date, time, location |
| Contact cards | Share name, phone, email |

### 🗂️ Chat Management
| Feature | Description |
|---------|-------------|
| Archive | With undo toast (3 seconds) |
| Pin chats | Pinned indicator in chat list |
| Favourite | Filter by favourites tab |
| Clear chat | Remove all messages |
| Delete chat | Hide from sidebar only |
| Mark as read | Clear unread badge |
| Draft preview | "Draft: ..." shown in red in sidebar |
| Context menu | Right-click on any chat item |

### 💾 Saved Messages
| Feature | Description |
|---------|-------------|
| Self-chat | Always pinned at top of chat list |
| Instant blue ticks | No delivery delay for self-messages |
| Empty state | Bookmark icon with description |
| No "Delete for everyone" | Disabled for self-chat |

### 🔍 Search
| Feature | Description |
|---------|-------------|
| Desktop | Right-side panel, results grouped by date, highlighted matches |
| Mobile | Inline search bar with ↑↓ navigation |
| Sidebar search | Search contacts and message content |

### 🎨 Theme System
| Theme | Description |
|-------|-------------|
| Light | Default for new users (WhatsApp Web style) |
| Dark | Full dark theme |
| System | Follows OS preference |
| Persistence | localStorage, applied before React renders (no flash) |

### 🔒 Contact Blocking
| Feature | Description |
|---------|-------------|
| Block/Unblock | From contact info panel with confirmation |
| Blocked state | Input bar replaced with blocked banner |
| Backend check | Blocked users cannot send messages (403) |
| Persistence | Stored in MongoDB User document |

### 📱 Responsive Design
| Breakpoint | Behavior |
|------------|----------|
| Desktop | Three-column layout (nav rail + sidebar + chat) |
| Mobile | Full-screen sidebar, chat slides in from right |
| Search | Desktop: side panel; Mobile: inline bar |

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                          │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   React 18   │  │  Socket.IO   │  │    ThemeContext       │  │
│  │   + Vite     │  │   Client     │  │  (dark/light/system)  │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────────────────┘  │
│         │                 │                                       │
│         │    HTTP/REST    │    WebSocket                         │
└─────────┼─────────────────┼─────────────────────────────────────┘
          │                 │
          ▼                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                     SERVER (Node.js + Express)                    │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  REST API    │  │  Socket.IO   │  │   Nodemailer         │  │
│  │  (Express)   │  │   Server     │  │   (OTP Email)        │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────────────────┘  │
│         │                 │                                       │
│  ┌──────┴─────────────────┴──────────────────────────────────┐  │
│  │                    Business Logic                           │  │
│  │  Auth │ Chat │ Message │ User │ Upload │ LinkPreview       │  │
│  └──────────────────────────┬──────────────────────────────┘   │
│                              │                                    │
└──────────────────────────────┼────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      MongoDB Atlas                                │
│                                                                   │
│   Users ──── Chats ──── Messages                                 │
│     │           │           │                                    │
│  blockedUsers  drafts    reactions                               │
│  lastSeen    isSaved    linkPreview                              │
└─────────────────────────────────────────────────────────────────┘
```

### Real-Time Message Flow

```
Sender                    Server                    Receiver
  │                          │                          │
  │──── POST /api/messages ──►│                          │
  │                          │── scrape OG tags ──►     │
  │◄─── 201 { message } ─────│                          │
  │                          │                          │
  │──── socket: send_message ►│                          │
  │                          │──► socket: receive_message►│
  │                          │                          │
  │◄── socket: message_status_update (delivered) ───────│
  │                          │                          │
  │                          │◄── socket: messages_read ─│
  │◄── socket: messages_read_update (blue ticks) ───────│
```

---

## 🛠️ Tech Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18 | UI framework |
| Vite | 5 | Build tool & dev server |
| React Router | 6 | Client-side routing |
| Axios | 1.x | HTTP client |
| Socket.IO Client | 4.x | WebSocket communication |
| CSS (custom) | — | Styling — exact WhatsApp themes |
| React DOM Portals | — | Context menus, overlays |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 18+ | Runtime |
| Express | 4.x | REST API framework |
| Socket.IO | 4.x | WebSocket server |
| Mongoose | 9.x | MongoDB ODM |
| JWT | 9.x | Authentication tokens |
| bcryptjs | 3.x | Password hashing |
| Nodemailer | 8.x | OTP email delivery |
| Multer | 2.x | File upload handling |
| node-fetch | 2.x | OG tag scraping |
| uuid | 14.x | Unique file naming |

### Infrastructure
| Service | Purpose |
|---------|---------|
| MongoDB Atlas | Cloud database |
| Gmail SMTP | OTP email delivery |
| GitHub | Version control & hosting |

---

## 📁 Project Structure

```
WhatsappClone/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── authController.js      # Login, register, OTP verify, scrapeOG
│   │   │   ├── chatController.js      # Chat CRUD, archive, pin, draft, saved messages
│   │   │   ├── messageController.js   # Messages, reactions, polls, link preview
│   │   │   └── userController.js      # Profile, block/unblock
│   │   ├── middleware/
│   │   │   ├── auth.js                # JWT verification middleware
│   │   │   └── upload.js              # Multer file upload config
│   │   ├── models/
│   │   │   ├── Chat.js                # Chat schema (drafts, isSavedMessages)
│   │   │   ├── Message.js             # Message schema (reactions, linkPreview)
│   │   │   └── User.js                # User schema (blockedUsers, lastSeen)
│   │   ├── routes/
│   │   │   ├── auth.js                # /login, /register, /verify-otp
│   │   │   ├── chats.js               # /saved, /draft, archive, pin, etc.
│   │   │   ├── messages.js            # /react, /vote, /star, /pin, etc.
│   │   │   ├── upload.js              # File upload endpoint
│   │   │   └── users.js               # /me, /block, /profile
│   │   ├── socket/
│   │   │   └── socketHandler.js       # All Socket.IO event handlers
│   │   └── index.js                   # Express app + Socket.IO + MongoDB
│   ├── uploads/                       # Uploaded media files
│   ├── .env                           # Environment variables
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── AttachMenu/            # File/media attach dropdown
    │   │   ├── AudioRecorder/         # Voice message recorder
    │   │   ├── ChatMenu/              # Chat options dropdown
    │   │   ├── ChatWindow/            # Main chat area + search panel
    │   │   ├── ContactInfo/           # Contact info side panel + blocking
    │   │   ├── EmojiPicker/           # Emoji/GIF/sticker picker
    │   │   ├── MediaMessage/          # Voice player, poll card, link preview
    │   │   ├── MediaPreview/          # Full-screen media preview modal
    │   │   ├── MessageBubble/         # Message bubble + reactions + link preview
    │   │   ├── Modals/                # Poll, Event, Contact, Confirm dialogs
    │   │   ├── ProfilePanel/          # User profile editor
    │   │   └── Sidebar/               # Chat list + archive toast + theme panel
    │   ├── context/
    │   │   ├── AuthContext.jsx        # Two-step login with OTP
    │   │   ├── SocketContext.jsx      # Socket.IO connection
    │   │   └── ThemeContext.jsx       # Dark/light/system theme
    │   ├── pages/
    │   │   ├── ChatPage.jsx           # Main app page
    │   │   └── LoginPage.jsx          # Login, register, OTP, loading screen
    │   ├── services/
    │   │   └── api.js                 # Axios instance with auth interceptor
    │   └── index.css                  # CSS variables for both themes
    ├── public/
    └── package.json
```

---

## 🚀 Getting Started

### Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | 18+ | [Download](https://nodejs.org) |
| npm | 9+ | Included with Node.js |
| MongoDB Atlas | Free tier | [Sign up](https://cloud.mongodb.com) — no credit card needed |
| Gmail Account | Any | For OTP email delivery |

---

### Step 1 — Clone the Repository

```bash
git clone https://github.com/prasanth07-8/Whatsapp_web_clone.git
cd Whatsapp_web_clone
```

---

### Step 2 — Set Up MongoDB Atlas (Free)

This project uses **MongoDB Atlas** as the cloud database. You need your own free cluster.

1. Go to [https://cloud.mongodb.com](https://cloud.mongodb.com) and sign up (free)
2. Click **"Build a Database"** → choose **Free (M0)** tier → select any region
3. Create a **database user** (username + password — save these)
4. Under **Network Access** → click **"Add IP Address"** → select **"Allow Access from Anywhere"** (`0.0.0.0/0`)
5. Go to **Database** → click **"Connect"** → **"Drivers"** → copy the connection string

Your connection string will look like:
```
mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/?retryWrites=true&w=majority
```

Replace `USERNAME`, `PASSWORD` with your database user credentials, and add a database name:
```
mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/whatsapp-clone?retryWrites=true&w=majority
```

---

### Step 3 — Set Up Gmail OTP (for Email Verification)

This project uses **Gmail SMTP** to send 6-digit OTP codes during login. You need a Gmail account with an App Password.

> **Why App Password?** Google requires App Passwords for third-party apps when 2-Step Verification is enabled. It is NOT your regular Gmail password.

**Steps:**

1. Go to [https://myaccount.google.com](https://myaccount.google.com)
2. Click **Security** → scroll to **"2-Step Verification"** → enable it
3. Go back to **Security** → scroll to **"App passwords"** (appears only after 2FA is enabled)
4. Click **"App passwords"** → under "App name" type `WhatsApp Clone` → click **Create**
5. Google shows a **16-character password** like `abcd efgh ijkl mnop`
6. Copy it and **remove the spaces** → `abcdefghijklmnop`

> **Dev mode fallback:** If you skip email setup, OTPs are printed directly to the backend terminal:
> ```
> [DEV] OTP for user@example.com: 482931
> ```
> You can use this to test the app without configuring email.

---

### Step 4 — Configure Environment Variables

```bash
cd backend
cp .env.example .env
```

Now open `backend/.env` and fill in your values:

```env
PORT=5000
MONGO_URI=mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/whatsapp-clone?retryWrites=true&w=majority
JWT_SECRET=any_long_random_string_minimum_32_characters
CLIENT_URL=http://localhost:5173
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your16charapppassword
```

> **JWT_SECRET** can be any random string. Generate one with:
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

---

### Step 5 — Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

---

### Step 6 — Run the Application

Open **two terminals**:

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
# ✅ Server running on http://localhost:5000
# ✅ MongoDB connected
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
# ✅ App running on http://localhost:5173
```

---

### Step 7 — Test the Application

1. Open `http://localhost:5173` in your browser
2. Click **Register** → create **User A** with your email
3. Open a new **incognito window** → register **User B** with a different email
4. In User A's window → search for User B's email → start a chat
5. Send messages between both windows — observe real-time delivery

> **OTP during login:** Check your Gmail inbox for the 6-digit code. If email is not configured, check the backend terminal for `[DEV] OTP for ...`

---

## 🔧 Environment Variables

> All environment variables go in `backend/.env`. A template file `backend/.env.example` is included in the repository.

```env
# ── Server ──────────────────────────────────────────────────────
PORT=5000

# ── MongoDB Atlas ───────────────────────────────────────────────
# Your own MongoDB Atlas connection string (free tier)
# See "Step 2 — Set Up MongoDB Atlas" above for how to get this
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<dbname>?retryWrites=true&w=majority

# ── JWT Authentication ───────────────────────────────────────────
# Any random string (min 32 chars). Used to sign login tokens.
# Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=your_super_secret_jwt_key_here_minimum_32_characters

# ── CORS ─────────────────────────────────────────────────────────
CLIENT_URL=http://localhost:5173

# ── Gmail OTP (Email Verification) ───────────────────────────────
# Your Gmail address used to send OTP codes
# See "Step 3 — Set Up Gmail OTP" above for how to get the App Password
EMAIL_USER=your_gmail@gmail.com

# Gmail App Password — 16 characters, NO spaces
# This is NOT your regular Gmail password
EMAIL_PASS=abcdefghijklmnop
```

### Quick Reference

| Variable | Where to get it | Required |
|----------|----------------|----------|
| `MONGO_URI` | MongoDB Atlas → Connect → Drivers | ✅ Yes |
| `JWT_SECRET` | Any random 32+ char string | ✅ Yes |
| `CLIENT_URL` | Frontend URL (default: `http://localhost:5173`) | ✅ Yes |
| `EMAIL_USER` | Your Gmail address | ⚠️ Optional* |
| `EMAIL_PASS` | Gmail App Password (16 chars, no spaces) | ⚠️ Optional* |

> *If `EMAIL_USER` / `EMAIL_PASS` are not set, OTPs are printed to the backend terminal instead of being emailed. The app still works fully for testing.

---

## 📡 API Reference

### Authentication

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/auth/register` | Register new user | No |
| `POST` | `/api/auth/login` | Verify credentials → send OTP | No |
| `POST` | `/api/auth/verify-otp` | Verify OTP → return JWT | No |

**Register Request:**
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Login Response:**
```json
{
  "requiresOtp": true,
  "email": "john@example.com"
}
```

**Verify OTP Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
    "username": "john_doe",
    "email": "john@example.com",
    "avatar": ""
  }
}
```

### Chats

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/chats` | Get all chats with unread counts |
| `POST` | `/api/chats` | Create or access a chat |
| `POST` | `/api/chats/saved` | Get or create "Message Yourself" chat |
| `PUT` | `/api/chats/:id/favourite` | Toggle favourite |
| `PUT` | `/api/chats/:id/pin` | Toggle pin |
| `PUT` | `/api/chats/:id/archive` | Toggle archive |
| `PUT` | `/api/chats/:id/markread` | Mark all messages as read |
| `PUT` | `/api/chats/:id/clear` | Clear chat messages |
| `PUT` | `/api/chats/:id/draft` | Save/clear draft message |
| `DELETE` | `/api/chats/:id` | Delete chat (for this user only) |

### Messages

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/messages` | Send a message (with OG scraping) |
| `GET` | `/api/messages/:chatId` | Get messages for a chat |
| `PUT` | `/api/messages/:chatId/read` | Mark messages as read |
| `PUT` | `/api/messages/markallread` | Mark all messages as read |
| `DELETE` | `/api/messages/:id` | Delete message (for me / everyone) |
| `PUT` | `/api/messages/:id/edit` | Edit message text |
| `PUT` | `/api/messages/:id/star` | Star/unstar message |
| `PUT` | `/api/messages/:id/pin` | Pin/unpin message |
| `PUT` | `/api/messages/:id/vote` | Vote on a poll option |
| `PUT` | `/api/messages/:id/react` | Add/remove/change emoji reaction |
| `GET` | `/api/messages/starred/all` | Get all starred messages |
| `GET` | `/api/messages/media/all` | Get all media messages |
| `GET` | `/api/messages/:chatId/pinned/list` | Get pinned messages |

### Users

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/users` | Get all users |
| `GET` | `/api/users/me` | Get current user profile |
| `GET` | `/api/users/find?email=` | Find user by email |
| `PUT` | `/api/users/profile` | Update profile (name, tagline, avatar) |
| `PUT` | `/api/users/block/:userId` | Toggle block/unblock user |
| `GET` | `/api/users/block/:userId` | Get block status |

### Utilities

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/upload` | Upload media file |
| `GET` | `/api/link-preview?url=` | Scrape OG tags from URL |

---

## 🔄 Socket Events

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `user_online` | `userId` | User connects, joins all chat rooms |
| `send_message` | `message` | Broadcast message to chat room |
| `message_delivered` | `{ messageId, chatId, senderId }` | Acknowledge delivery |
| `messages_read` | `{ chatId, senderId }` | Mark messages as read |
| `typing` | `{ chatId, username }` | User started typing |
| `stop_typing` | `chatId` | User stopped typing |
| `message_deleted` | `msg` | Message deleted for everyone |
| `message_edited` | `msg` | Message was edited |
| `message_starred` | `msg` | Message was starred |
| `message_pinned` | `msg` | Message was pinned |
| `chat_cleared` | `chatId` | Chat messages cleared |
| `profile_updated` | `profileData` | Profile photo/name changed |
| `join_room` | `chatId` | Join a chat room |
| `leave_room` | `chatId` | Leave a chat room |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `receive_message` | `message` | New message received |
| `message_status_update` | `{ messageId, status }` | Tick status changed |
| `messages_read_update` | `{ chatId }` | Messages marked as read |
| `message_updated` | `msg` | Message edited/deleted/reacted |
| `online_users` | `userId[]` | List of online user IDs |
| `user_last_seen` | `{ userId, lastSeen }` | User went offline |
| `user_profile_updated` | `profileData` | Contact updated their profile |
| `typing` | `{ chatId, username }` | Contact is typing |
| `stop_typing` | `{ chatId }` | Contact stopped typing |
| `chat_cleared` | `chatId` | Chat was cleared |

---

## 🗄️ Database Schema

### User
```javascript
{
  username:     String (unique, required),
  email:        String (unique, required),
  password:     String (hashed with bcrypt),
  avatar:       String (file path),
  tagline:      String (max 139 chars),
  lastSeen:     Date,
  blockedUsers: [ObjectId → User],
  createdAt:    Date,
  updatedAt:    Date
}
```

### Chat
```javascript
{
  participants:    [ObjectId → User],
  lastMessage:     ObjectId → Message,
  isSavedMessages: Boolean,
  favouritedBy:    [ObjectId → User],
  pinnedBy:        [ObjectId → User],
  archivedBy:      [ObjectId → User],
  deletedFor:      [ObjectId → User],
  clearedFor:      [{ userId, clearedAt }],
  drafts:          [{ userId, text }],
  createdAt:       Date,
  updatedAt:       Date
}
```

### Message
```javascript
{
  chatId:      ObjectId → Chat,
  senderId:    ObjectId → User,
  receiverId:  ObjectId → User,
  text:        String,
  mediaUrl:    String,
  mediaType:   'image' | 'video' | 'audio' | 'file',
  mediaName:   String,
  messageType: 'text' | 'image' | 'video' | 'audio' | 'file' | 'poll' | 'contact' | 'event',
  poll:        { question, options: [{ text, votes: [ObjectId] }], multiSelect },
  contact:     { name, phone, email },
  event:       { title, date, time, location, note },
  linkPreview: { url, title, description, image, siteName },
  reactions:   [{ emoji, userId: ObjectId → User }],
  status:      'sent' | 'delivered' | 'read',
  isDeleted:   Boolean,
  isEdited:    Boolean,
  isStarred:   Boolean,
  isPinned:    Boolean,
  deletedFor:  [ObjectId → User],
  replyTo:     ObjectId → Message,
  createdAt:   Date,
  updatedAt:   Date
}
```

---

## 🎨 Design System

### CSS Variables — Light Theme (Default)

| Variable | Value | Usage |
|----------|-------|-------|
| `--bg-deep` | `#f0f2f5` | App background |
| `--bg-panel` | `#ffffff` | Headers, panels |
| `--bg-chat` | `#efeae2` | Chat background |
| `--bg-msg-out` | `#d9fdd3` | Outgoing bubble |
| `--bg-msg-in` | `#ffffff` | Incoming bubble |
| `--bg-elevated` | `#ffffff` | Menus, modals |
| `--green` | `#00a884` | WhatsApp teal accent |
| `--blue-tick` | `#53bdeb` | Read receipt blue |
| `--text-primary` | `#111b21` | Primary text |
| `--text-secondary` | `#54656f` | Secondary text |

### CSS Variables — Dark Theme

| Variable | Value | Usage |
|----------|-------|-------|
| `--bg-deep` | `#111b21` | App background |
| `--bg-panel` | `#202c33` | Headers, panels |
| `--bg-chat` | `#0b141a` | Chat background |
| `--bg-msg-out` | `#005c4b` | Outgoing bubble |
| `--bg-msg-in` | `#202c33` | Incoming bubble |
| `--bg-elevated` | `#233138` | Menus, modals |
| `--text-primary` | `#e9edef` | Primary text |
| `--text-secondary` | `#8696a0` | Secondary text |

---

## 🧪 Testing the Application

### Quick Start Test

1. Register **User A** at `http://localhost:5173`
2. Open a new incognito window → Register **User B**
3. In User A's window → search for User B's email → start a chat
4. Send messages between both windows — observe real-time delivery

### Feature Test Checklist

```
✅ Register → OTP email → Loading screen → Chat interface
✅ Send text message → real-time delivery → read receipts
✅ Send image/video/audio/document
✅ Record voice message → auto-play chain
✅ Paste YouTube URL → link preview card
✅ React to message → reaction details panel
✅ Reply to message → click reply → scroll to original
✅ Select messages → delete dialog → delete for everyone
✅ Archive chat → undo toast → unarchive
✅ Block contact → blocked input bar → unblock
✅ Switch theme → dark/light/system
✅ Draft message → switch chat → return → draft restored
✅ Message Yourself chat → instant blue ticks
```

---

## 📄 License

This project is for educational and portfolio purposes only.  
WhatsApp is a trademark of Meta Platforms, Inc.

---

<div align="center">

Built with ❤️ as a full-stack portfolio project

**[⬆ Back to top](#whatsapp-web-clone)**

</div>
