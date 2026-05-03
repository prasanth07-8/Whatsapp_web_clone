import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import Sidebar from '../components/Sidebar/Sidebar';
import ChatWindow from '../components/ChatWindow/ChatWindow';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function ChatPage() {
  const { user } = useAuth();
  const [chats, setChats]             = useState([]);
  const [users, setUsers]             = useState([]);
  const [activeChat, setActiveChat]   = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [lastSeenMap, setLastSeenMap] = useState({});
  const [unreadCounts, setUnreadCounts] = useState({});
  const [incomingMsg, setIncomingMsg] = useState(null);
  const [typingChats, setTypingChats] = useState({}); // chatId -> true
  const socketRef     = useRef(null);
  const activeChatRef = useRef(null);

  useEffect(() => { activeChatRef.current = activeChat; }, [activeChat]);

  // Update browser tab title with unread count — like WhatsApp Web
  useEffect(() => {
    const total = Object.values(unreadCounts).reduce((s, n) => s + n, 0);
    document.title = total > 0 ? `(${total > 99 ? '99+' : total}) WhatsApp` : 'WhatsApp';
  }, [unreadCounts]);

  // Join all chat rooms whenever chats list changes and socket is ready
  // This ensures we receive messages for all chats even without opening them
  useEffect(() => {
    if (!socketRef.current || chats.length === 0) return;
    chats.forEach((chat) => {
      socketRef.current.emit('join_room', chat._id);
    });
  }, [chats.length]); // re-run when new chats are added

  // Init socket
  useEffect(() => {
    const socket = io('http://localhost:5000');
    socketRef.current = socket;
    socket.emit('user_online', user._id);

    socket.on('online_users', (list) => setOnlineUsers(list));

    socket.on('user_last_seen', ({ userId, lastSeen }) => {
      setLastSeenMap((prev) => {
        const next = { ...prev };
        if (lastSeen === null) {
          delete next[userId];
        } else {
          next[userId] = lastSeen;
        }
        return next;
      });
    });

    // Live profile updates
    socket.on('user_profile_updated', ({ userId, username, tagline, avatar }) => {
      setUsers((prev) => prev.map((u) =>
        u._id === userId ? { ...u, username, tagline, avatar } : u
      ));
      setChats((prev) => prev.map((c) => ({
        ...c,
        participants: c.participants.map((p) =>
          p._id === userId ? { ...p, username, tagline, avatar } : p
        ),
      })));
    });

    socket.on('receive_message', (msg) => {
      const senderId = msg.senderId?._id?.toString() || msg.senderId?.toString();
      const isOwn = senderId === user._id?.toString();
      const chatId = msg.chatId;

      // Always update sidebar: last message preview + bubble chat to top
      setChats((prev) => {
        const exists = prev.find((c) => c._id === chatId);
        const newLastMsg = {
          _id: msg._id,
          text: msg.text,
          mediaType: msg.mediaType,
          messageType: msg.messageType,
          mediaName: msg.mediaName,
          isDeleted: msg.isDeleted,
          createdAt: msg.createdAt || new Date().toISOString(),
        };
        if (exists) {
          return [
            { ...exists, lastMessage: newLastMsg, updatedAt: msg.createdAt || new Date().toISOString() },
            ...prev.filter((c) => c._id !== chatId),
          ];
        }
        // Chat not in list yet — fetch fresh
        api.get('/chats').then((res) => setChats(res.data));
        return prev;
      });

      if (isOwn) return; // own message: sidebar updated above, chat window already has it

      // Incoming from other user — push into open chat window or increment badge
      if (activeChatRef.current?._id === chatId) {
        setIncomingMsg(msg);
      } else {
        setUnreadCounts((prev) => ({ ...prev, [chatId]: (prev[chatId] || 0) + 1 }));
      }
    });

    socket.on('messages_read_update', ({ chatId }) => {
      setChats((prev) => prev.map((c) => (c._id === chatId ? { ...c } : c)));
    });

    // When a message is deleted for everyone — update sidebar last message preview
    socket.on('message_updated', (msg) => {
      const chatId = msg.chatId;
      if (!chatId) return;

      if (msg.isDeleted) {
        // Deleted for everyone: re-fetch the chat to get the updated lastMessage
        // (backend now sets lastMessage to the previous non-deleted message)
        api.get('/chats').then((res) => {
          const updatedChat = res.data.find((c) => c._id === chatId);
          if (updatedChat) {
            setChats((prev) => prev.map((c) => c._id === chatId ? { ...c, lastMessage: updatedChat.lastMessage, updatedAt: updatedChat.updatedAt } : c));
          }
        });
        return;
      }

      // Edited message — update text in sidebar if it's the last message
      setChats((prev) => {
        const chat = prev.find((c) => c._id === chatId);
        if (!chat) return prev;
        const isLastMsg = chat.lastMessage?._id?.toString() === msg._id?.toString();
        if (!isLastMsg) return prev;
        return prev.map((c) => c._id === chatId
          ? { ...c, lastMessage: { ...c.lastMessage, text: msg.text } }
          : c
        );
      });
    });

    // Typing indicators — track per chat for sidebar display
    socket.on('typing', ({ chatId }) => {
      setTypingChats((prev) => ({ ...prev, [chatId]: true }));
    });
    socket.on('stop_typing', ({ chatId }) => {
      setTypingChats((prev) => {
        const next = { ...prev };
        delete next[chatId];
        return next;
      });
    });

    return () => socket.disconnect();
  }, [user]);

  // Fetch chats + users, compute initial unread counts
  useEffect(() => {
    api.get('/users').then((res) => {
      setUsers(res.data);
      const map = {};
      res.data.forEach((u) => {
        if (u.lastSeen) map[u._id] = u.lastSeen;
      });
      setLastSeenMap(map);
    });

    // Ensure saved messages chat exists, then load all chats
    api.post('/chats/saved').then(() => {
      api.get('/chats').then((res) => {
        // Sort: saved messages first, then by updatedAt
        const sorted = [...res.data].sort((a, b) => {
          if (a.isSavedMessages) return -1;
          if (b.isSavedMessages) return 1;
          return new Date(b.updatedAt) - new Date(a.updatedAt);
        });
        setChats(sorted);
        const counts = {};
        sorted.forEach((chat) => {
          if (chat.unreadCount) counts[chat._id] = chat.unreadCount;
        });
        setUnreadCounts(counts);
      });
    });
  }, []);

  const handleSelectChat = useCallback((chat) => {
    setActiveChat(chat);
    setUnreadCounts((prev) => ({ ...prev, [chat._id]: 0 }));
  }, []);

  const handleSelectUser = useCallback(async (otherUser) => {
    try {
      const { data } = await api.post('/chats', { userId: otherUser._id });
      setActiveChat(data);
      setUnreadCounts((prev) => ({ ...prev, [data._id]: 0 }));
      setChats((prev) =>
        prev.find((c) => c._id === data._id) ? prev : [data, ...prev]
      );
    } catch (err) { console.error(err); }
  }, []);

  const handleChatDeleted = useCallback((chatId) => {
    setChats((prev) => prev.filter((c) => c._id !== chatId));
    setActiveChat(null);
  }, []);

  const handleMessageSent = useCallback((msg) => {
    setChats((prev) => {
      const exists = prev.find((c) => c._id === msg.chatId);
      if (!exists) return prev;
      const now = msg.createdAt || new Date().toISOString();
      const updated = {
        ...exists,
        lastMessage: {
          _id: msg._id,
          text: msg.text,
          mediaType: msg.mediaType,
          messageType: msg.messageType,
          mediaName: msg.mediaName,
          isDeleted: msg.isDeleted,
          createdAt: now,
        },
        updatedAt: now,
      };
      // Keep saved messages always first
      const rest = prev.filter((c) => c._id !== msg.chatId);
      const savedMsg = rest.find((c) => c.isSavedMessages);
      const others   = rest.filter((c) => !c.isSavedMessages);
      if (updated.isSavedMessages) {
        return [updated, ...others];
      }
      return savedMsg ? [savedMsg, updated, ...others.filter((c) => c._id !== updated._id)] : [updated, ...others];
    });
  }, []);

  return (
    <div className="chat-page-root" style={{ display: 'flex', height: '100dvh', overflow: 'hidden', position: 'relative' }}>
      <Sidebar
        chats={chats}
        users={users}
        activeChat={activeChat}
        onSelectChat={handleSelectChat}
        onSelectUser={handleSelectUser}
        onlineUsers={onlineUsers}
        unreadCounts={unreadCounts}
        lastSeenMap={lastSeenMap}
        socket={socketRef.current}
        typingChats={typingChats}
        onMobileBack={() => setActiveChat(null)}
        onChatUpdated={(chatId, updates) => {
          setChats((prev) => prev.map((c) => c._id === chatId ? { ...c, ...updates } : c));
          if (updates.unreadCount === 0) setUnreadCounts((prev) => ({ ...prev, [chatId]: 0 }));
        }}
        onChatDeleted={(chatId) => {
          setChats((prev) => prev.filter((c) => c._id !== chatId));
          if (activeChat?._id === chatId) setActiveChat(null);
        }}
      />
      <ChatWindow
        chat={activeChat}
        socket={socketRef.current}
        onMessageSent={handleMessageSent}
        onlineUsers={onlineUsers}
        lastSeenMap={lastSeenMap}
        onChatDeleted={handleChatDeleted}
        incomingMsg={incomingMsg}
        onIncomingMsgHandled={() => setIncomingMsg(null)}
        onMobileBack={() => setActiveChat(null)}
      />
    </div>
  );
}
