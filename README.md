# WhatsApp Web Clone

A full-stack WhatsApp Web clone built with React, Node.js, Socket.IO, and MongoDB.

## Features

- Real-time messaging with Socket.IO
- JWT authentication
- Media sharing (images, video, audio, files)
- Voice messages
- Polls, Events, Contact cards
- Message actions: reply, edit, delete (for me / for everyone), star, pin, forward
- Typing indicators (chat window + sidebar)
- Online/last seen status
- Read receipts (single tick → double tick → blue ticks)
- Chat list: Archive, Pin, Favourites, Unread filter
- Profile panel with avatar upload
- Contact info panel with media grid
- Mobile responsive layout
- Dark theme matching WhatsApp exactly

## Tech Stack

**Frontend:** React + Vite, Socket.IO client, CSS  
**Backend:** Node.js, Express, Socket.IO, MongoDB (Mongoose), JWT, Multer

## Getting Started

```bash
# Terminal 1 — Backend
cd backend
npm install
npm run dev

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## Environment Variables

Create `backend/.env`:
```
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
PORT=5000
```
