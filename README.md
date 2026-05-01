# WhatsApp Web Clone

A pixel-perfect, full-stack WhatsApp Web clone built with **React**, **Node.js**, **Socket.IO**, and **MongoDB**. Replicates the exact UI, UX, colors, icons, and real-time behavior of WhatsApp Web — including the dark theme, nav rail, message bubbles, media sharing, polls, events, and much more.

---

## 🖼️ Preview

| Chat List | Chat Window | Profile Panel |
|-----------|-------------|---------------|
| Real-time sidebar with unread badges, typing indicators, last message preview | Full message thread with media, polls, events, voice messages | Avatar upload, tagline presets, online status |

---

## ✨ Features

### 💬 Messaging
- Real-time messaging via **Socket.IO**
- Send and receive text messages instantly
- **Typing indicator** — shown in both the chat window header and the sidebar chat list
- **Read receipts** — single tick (sent) → double grey tick (delivered) → double blue tick (read)
- Auto-delivery when receiver comes online
- Message **reply**, **edit**, **forward**, **copy**
- **Delete for me** / **Delete for everyone** (within 68 min 16 sec — WhatsApp's exact limit)
- **Star** and **pin** messages
- **Select multiple messages** for bulk delete/forward
- Unread message divider on chat open
- Date dividers (Today, Yesterday, date)

### 📎 Media & Attachments
- Send **images**, **videos**, **audio files**, **documents**
- Full-screen **media preview modal** before sending (with caption)
- **Voice messages** — record and send audio
- **Emoji picker** with skin tone support
- **Attach menu** — photos, videos, documents, polls, contacts, events, camera

### 📊 Special Message Types
- **Polls** — create with multiple options, allow multiple answers toggle, vote on options, click vote count to see who voted (per-option breakdown)
- **Events** — title, date, time, location, description with calendar card UI
- **Contact cards** — share contact name, phone, email

### 👤 Profile & Status
- **Profile panel** — upload/change avatar, edit name, edit tagline/status with presets
- Online / last seen status
- Profile photo visible in nav rail and chat headers

### 🗂️ Chat Management
- **Archive** chats — archived chats hidden from main list, accessible via "Archived" row at top
- **Pin** chats — pinned indicator shown in chat list
- **Favourite** chats — filter by favourites
- **Clear chat** — remove all messages
- **Delete chat** — hide from your sidebar only
- **Mark as read** — clear unread badge
- Right-click context menu on any chat item

### 🔍 Search & Filters
- **Search bar** — searches contacts and message content inline (like WhatsApp)
- Filter tabs: **All**, **Unread** (with count), **Favourites** (with count)
- **Archived** section at top of chat list

### 📁 Media Panel
- Click the Media icon in the nav rail to view all shared media
- Tabs: **Photos** (grid), **Videos** (grid with play overlay), **Docs** (list with download), **Audio** (list)
- Full-screen lightbox for photos and videos

### ⭐ Starred Messages
- Star any message from the context menu
- View all starred messages from the three-dot menu → "Starred messages"

### 🔔 Notifications & Badges
- **Unread badge** on each chat in the sidebar
- **Total unread badge** on the Chats icon in the nav rail (99+ cap)
- Sidebar last message updates live when messages are sent/received/deleted

### 📱 Mobile Responsive
- Full mobile layout — sidebar takes full screen, chat window slides in from right
- Back arrow in chat header to return to chat list
- Profile avatar in sidebar header on mobile (nav rail hidden)
- Bottom sheet modals on mobile
- Matches WhatsApp Web mobile behavior exactly

### 🔐 Authentication
- **JWT-based** login and registration
- Secure password hashing with bcrypt
- Token stored in localStorage, auto-logout on expiry

### 🌐 Real-time Infrastructure
- All users auto-join their chat rooms on connect
- Live sidebar updates for sent, received, and deleted messages
- Typing indicators per chat (not just in open chat window)
- Online/offline status with last seen timestamps
- Profile updates broadcast live to all contacts

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| React 18 + Vite | UI framework |
| Socket.IO Client | Real-time communication |
| CSS (no framework) | Styling — exact WhatsApp dark theme |
| React DOM Portals | Context menus, overlays |

### Backend
| Technology | Purpose |
|------------|---------|
| Node.js + Express | REST API server |
| Socket.IO | WebSocket server |
| MongoDB + Mongoose | Database |
| JWT | Authentication |
| Multer | File uploads |
| bcryptjs | Password hashing |

---

## 📁 Project Structure

```
WhatsappClone/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── chatController.js
│   │   │   ├── messageController.js
│   │   │   └── userController.js
│   │   ├── middleware/
│   │   │   ├── auth.js
│   │   │   └── upload.js
│   │   ├── models/
│   │   │   ├── Chat.js
│   │   │   ├── Message.js
│   │   │   └── User.js
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── chats.js
│   │   │   ├── messages.js
│   │   │   ├── upload.js
│   │   │   └── users.js
│   │   ├── socket/
│   │   │   └── socketHandler.js
│   │   └── index.js
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── AttachMenu/
    │   │   ├── AudioRecorder/
    │   │   ├── ChatMenu/
    │   │   ├── ChatWindow/
    │   │   ├── ContactInfo/
    │   │   ├── DefaultAvatar.jsx
    │   │   ├── EmojiPicker/
    │   │   ├── MediaMessage/
    │   │   ├── MediaPreview/
    │   │   ├── MessageBubble/
    │   │   ├── Modals/
    │   │   ├── ProfilePanel/
    │   │   └── Sidebar/
    │   ├── context/
    │   │   ├── AuthContext.jsx
    │   │   └── SocketContext.jsx
    │   ├── pages/
    │   │   ├── ChatPage.jsx
    │   │   └── LoginPage.jsx
    │   ├── services/
    │   │   └── api.js
    │   └── index.css
    └── package.json
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- npm

### Installation

```bash
# Clone the repository
git clone https://github.com/prasanth07-8/Whatsapp_web_clone.git
cd Whatsapp_web_clone
```

### Backend Setup

```bash
cd backend
npm install
```

Create `backend/.env`:
```env
MONGO_URI=mongodb://localhost:27017/whatsapp_clone
JWT_SECRET=your_super_secret_jwt_key_here
PORT=5000
```

```bash
npm run dev
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## 🔌 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login and get JWT |

### Chats
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/chats` | Get all chats with unread counts |
| POST | `/api/chats` | Create or access a chat |
| PUT | `/api/chats/:id/favourite` | Toggle favourite |
| PUT | `/api/chats/:id/pin` | Toggle pin |
| PUT | `/api/chats/:id/archive` | Toggle archive |
| PUT | `/api/chats/:id/markread` | Mark all messages as read |
| PUT | `/api/chats/:id/clear` | Clear chat messages |
| DELETE | `/api/chats/:id` | Delete chat (for this user) |

### Messages
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/messages` | Send a message |
| GET | `/api/messages/:chatId` | Get messages for a chat |
| PUT | `/api/messages/:chatId/read` | Mark messages as read |
| PUT | `/api/messages/markallread` | Mark all messages as read |
| DELETE | `/api/messages/:id` | Delete message (for me / everyone) |
| PUT | `/api/messages/:id/edit` | Edit message text |
| PUT | `/api/messages/:id/star` | Star/unstar message |
| PUT | `/api/messages/:id/pin` | Pin/unpin message |
| PUT | `/api/messages/:id/vote` | Vote on a poll |
| GET | `/api/messages/starred/all` | Get all starred messages |
| GET | `/api/messages/media/all` | Get all media messages |
| GET | `/api/messages/:chatId/pinned/list` | Get pinned messages |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | Get all users |
| GET | `/api/users/find?email=` | Find user by email |
| PUT | `/api/users/profile` | Update profile (name, tagline, avatar) |

---

## 🔄 Socket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `user_online` | Client → Server | User connects, joins all chat rooms |
| `send_message` | Client → Server | Send a message to a room |
| `receive_message` | Server → Client | Receive a message |
| `message_delivered` | Client → Server | Acknowledge message delivery |
| `message_status_update` | Server → Client | Update tick status |
| `messages_read` | Client → Server | Mark messages as read |
| `messages_read_update` | Server → Client | Update read status |
| `typing` | Client → Server | User is typing |
| `stop_typing` | Client → Server | User stopped typing |
| `message_deleted` | Client → Server | Message deleted for everyone |
| `message_updated` | Server → Client | Message was edited/deleted |
| `chat_cleared` | Both | Chat messages cleared |
| `profile_updated` | Client → Server | Profile photo/name changed |
| `user_profile_updated` | Server → Client | Broadcast profile change |

---

## 🎨 Design System

Exact WhatsApp dark theme colors:

| Variable | Value | Usage |
|----------|-------|-------|
| `--bg-deep` | `#111b21` | App background |
| `--bg-panel` | `#202c33` | Headers, input bars |
| `--bg-chat` | `#0b141a` | Chat background |
| `--bg-msg-out` | `#005c4b` | Outgoing message bubble |
| `--bg-msg-in` | `#202c33` | Incoming message bubble |
| `--green` | `#00a884` | WhatsApp teal accent |
| `--blue-tick` | `#53bdeb` | Read receipt blue |
| `--text-primary` | `#e9edef` | Primary text |
| `--text-secondary` | `#8696a0` | Secondary/muted text |

---

## 📝 License

This project is for educational purposes only. WhatsApp is a trademark of Meta Platforms, Inc.
