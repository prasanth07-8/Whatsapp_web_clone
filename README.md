# WhatsApp Web Clone

A pixel-perfect, full-stack WhatsApp Web clone built with **React**, **Node.js**, **Socket.IO**, and **MongoDB**. Replicates the exact UI, UX, colors, icons, and real-time behavior of WhatsApp Web — including dark/light themes, OTP authentication, voice messages, emoji reactions, polls, events, and much more.

---

## 🖼️ Preview

| Chat List | Chat Window | Search Panel |
|-----------|-------------|--------------|
| Real-time sidebar with unread badges, typing indicators, archive toast | Full message thread with media, polls, voice messages, reactions | Desktop right-side search panel with date-grouped results |

---

## ✨ Features

### � Authentication
- **Email + Password** login and registration
- **OTP verification** — 6-digit code sent to email via Gmail SMTP (Nodemailer)
- Auto-advance OTP input boxes, paste support, auto-submit on completion
- JWT-based sessions with 7-day expiry
- Secure password hashing with bcrypt
- Token stored in localStorage, auto-logout on expiry

### 💬 Messaging
- Real-time messaging via **Socket.IO**
- **Typing indicator** — shown in both chat window header and sidebar
- **Read receipts** — single tick (sent) → double grey tick (delivered) → double blue tick (read)
- Auto-delivery when receiver comes online
- Message **reply**, **edit**, **forward**, **copy**
- **Delete for me** / **Delete for everyone** (within 68 min 16 sec)
- **Star** and **pin** messages
- **Select multiple messages** for bulk delete/forward — WhatsApp-style bottom action bar
- Unread message divider on chat open
- Date dividers (Today, Yesterday, date)
- "You deleted this message" vs "This message was deleted" — sender-aware

### 🎤 Voice Messages
- Record audio with pause/resume support
- Live waveform visualization during recording
- WhatsApp-style voice bubble: avatar + play/pause + waveform bars + blue playhead
- **Auto-play chain** — when one voice message ends, next plays automatically
- 60fps smooth playhead via `requestAnimationFrame`
- Upload spinner while sending, instant blue ticks on delivery

### 📎 Media & Attachments
- Send **images**, **videos**, **audio files**, **documents**
- Full-screen **media preview modal** before sending (with caption)
- **Emoji picker** with skin tone support
- **Attach menu** — photos, videos, documents, polls, contacts, events, camera

### � Emoji Reactions
- Hover any message → smiley icon appears beside bubble
- Quick-pick bar: 6 WhatsApp reactions + **+** button for full emoji picker
- Full emoji picker: 7 categories, search, 300×420px centered panel
- Reaction chips shown below bubble with count
- Click chip → **Reaction Details Panel**: filter by emoji, voter list with avatars, "Click to remove" for own reactions
- Real-time broadcast via socket

### 📊 Special Message Types
- **Polls** — WhatsApp-style UI: question, radio/check options, green progress bars, voter avatars, "View votes" panel
- **Events** — calendar card with date, time, location
- **Contact cards** — share contact name, phone, email

### 👤 Profile & Status
- **Profile panel** — upload/change avatar, edit name, edit tagline/status with presets
- Online / last seen status
- Profile photo visible in nav rail and chat headers

### � Message Yourself (Saved Messages)
- Self-chat always pinned at top of chat list
- Shows user's own avatar and name with "(You)" label
- "Message yourself" subtitle in header
- Instant blue ticks (no OTP needed for self-delivery)
- Empty state with bookmark icon and description
- No "Delete for everyone" option

### 🗂️ Chat Management
- **Archive** chats — with **undo toast** (3 seconds, slides up from bottom)
- **Pin** chats — pinned indicator in chat list
- **Favourite** chats — filter by favourites
- **Clear chat** — remove all messages
- **Delete chat** — hide from your sidebar only
- **Mark as read** — clear unread badge
- Right-click context menu on any chat item

### 🔍 Search
- **Desktop**: right-side search panel slides in — results grouped by date, matched term highlighted in green bold, click to scroll to message
- **Mobile**: inline search bar with ↑↓ navigation
- Sidebar search — searches contacts and message content

### 🎨 Theme System
- **Dark** / **Light** / **System default** themes
- Light theme is default for new users (like WhatsApp Web)
- Theme persists in localStorage, applied instantly on page load (no flash)
- All CSS uses variables — full theme coverage including loading screen, chat background, bubbles, modals, menus
- Settings → Theme panel in sidebar three-dot menu

### ⏳ Loading Screen
- WhatsApp-style loading screen after OTP verification
- Phone illustration with spinning arc, "Loading your chats", "End-to-end encrypted"
- Green progress bar animates 0→100%
- Adapts to dark/light theme

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
- **Archived unread badge** — shows unread count on archived row (not chat count)
- Sidebar last message updates live

### 📱 Mobile Responsive
- Full mobile layout — sidebar takes full screen, chat window slides in from right
- Back arrow in chat header to return to chat list
- Profile avatar in sidebar header on mobile (nav rail hidden)
- Bottom sheet modals on mobile
- Mobile uses inline search bar; desktop uses side panel

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| React 18 + Vite | UI framework |
| Socket.IO Client | Real-time communication |
| CSS (no framework) | Styling — exact WhatsApp dark/light themes |
| React DOM Portals | Context menus, overlays, emoji pickers |

### Backend
| Technology | Purpose |
|------------|---------|
| Node.js + Express | REST API server |
| Socket.IO | WebSocket server |
| MongoDB + Mongoose | Database |
| JWT | Authentication |
| Nodemailer | OTP email delivery (Gmail SMTP) |
| Multer | File uploads |
| bcryptjs | Password hashing |

---

## 📁 Project Structure

```
WhatsappClone/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── authController.js      # Login, register, OTP verify
│   │   │   ├── chatController.js      # Chat CRUD, archive, pin, saved messages
│   │   │   ├── messageController.js   # Messages, reactions, polls, votes
│   │   │   └── userController.js
│   │   ├── middleware/
│   │   │   ├── auth.js
│   │   │   └── upload.js
│   │   ├── models/
│   │   │   ├── Chat.js                # isSavedMessages flag
│   │   │   ├── Message.js             # reactions array
│   │   │   └── User.js
│   │   ├── routes/
│   │   │   ├── auth.js                # /login, /register, /verify-otp
│   │   │   ├── chats.js               # /saved endpoint
│   │   │   ├── messages.js            # /react endpoint
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
    │   │   ├── AudioRecorder/         # WhatsApp-style recorder with waveform
    │   │   ├── ChatMenu/
    │   │   ├── ChatWindow/            # Search panel, select mode, voice player
    │   │   ├── ContactInfo/
    │   │   ├── EmojiPicker/
    │   │   ├── MediaMessage/          # Voice player, poll card, reaction details
    │   │   ├── MediaPreview/
    │   │   ├── MessageBubble/         # Emoji reactions, select mode
    │   │   ├── Modals/
    │   │   ├── ProfilePanel/
    │   │   └── Sidebar/               # Archive toast, theme panel
    │   ├── context/
    │   │   ├── AuthContext.jsx        # Two-step login with OTP
    │   │   ├── SocketContext.jsx
    │   │   └── ThemeContext.jsx       # Dark/light/system theme
    │   ├── pages/
    │   │   ├── ChatPage.jsx
    │   │   └── LoginPage.jsx          # OTP screen, loading screen
    │   ├── services/
    │   │   └── api.js
    │   └── index.css                  # CSS variables for both themes
    └── package.json
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- npm
- Gmail account with App Password (for OTP emails)

### Installation

```bash
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
PORT=5000
MONGO_URI=mongodb://localhost:27017/whatsapp_clone
JWT_SECRET=your_super_secret_jwt_key_here
CLIENT_URL=http://localhost:5173

# Gmail OTP — get App Password from Google Account → Security → App passwords
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your16charapppassword
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
| POST | `/api/auth/login` | Verify credentials → send OTP |
| POST | `/api/auth/verify-otp` | Verify OTP → return JWT |

### Chats
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/chats` | Get all chats with unread counts |
| POST | `/api/chats` | Create or access a chat |
| POST | `/api/chats/saved` | Get or create "Message Yourself" chat |
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
| PUT | `/api/messages/:id/react` | Add/remove/change emoji reaction |
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
| `message_updated` | Server → Client | Message was edited/deleted/reacted |
| `chat_cleared` | Both | Chat messages cleared |
| `profile_updated` | Client → Server | Profile photo/name changed |
| `user_profile_updated` | Server → Client | Broadcast profile change |

---

## 🎨 Design System

### Dark Theme (default for returning users)
| Variable | Value | Usage |
|----------|-------|-------|
| `--bg-deep` | `#111b21` | App background |
| `--bg-panel` | `#202c33` | Headers, input bars |
| `--bg-chat` | `#0b141a` | Chat background |
| `--bg-msg-out` | `#005c4b` | Outgoing message bubble |
| `--bg-msg-in` | `#202c33` | Incoming message bubble |
| `--bg-elevated` | `#233138` | Menus, popups, modals |

### Light Theme (default for new users)
| Variable | Value | Usage |
|----------|-------|-------|
| `--bg-deep` | `#f0f2f5` | App background |
| `--bg-panel` | `#ffffff` | Headers, input bars |
| `--bg-chat` | `#efeae2` | Chat background |
| `--bg-msg-out` | `#d9fdd3` | Outgoing message bubble |
| `--bg-msg-in` | `#ffffff` | Incoming message bubble |
| `--bg-elevated` | `#ffffff` | Menus, popups, modals |

### Shared
| Variable | Value | Usage |
|----------|-------|-------|
| `--green` | `#00a884` | WhatsApp teal accent |
| `--blue-tick` | `#53bdeb` | Read receipt blue |

---

## 📝 License

This project is for educational purposes only. WhatsApp is a trademark of Meta Platforms, Inc.
