import { useState, useEffect, useRef } from 'react';
import MessageBubble from '../MessageBubble/MessageBubble';
import EmojiPickerPanel from '../EmojiPicker/EmojiPickerPanel';
import AudioRecorder from '../AudioRecorder/AudioRecorder';
import ChatMenu from '../ChatMenu/ChatMenu';
import AttachMenu from '../AttachMenu/AttachMenu';
import MediaPreviewModal from '../MediaPreview/MediaPreviewModal';
import PollModal from '../Modals/PollModal';
import ContactModal from '../Modals/ContactModal';
import EventModal from '../Modals/EventModal';
import ContactInfo from '../ContactInfo/ContactInfo';
import ConfirmDialog from '../Modals/ConfirmDialog';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import DefaultAvatar from '../DefaultAvatar';
import './ChatWindow.css';

function formatLastSeen(lastSeen) {
  if (!lastSeen) return 'last seen recently';
  const date = new Date(lastSeen);
  const now   = new Date();
  const mins  = Math.floor((now - date) / 60000);
  const hours = Math.floor((now - date) / 3600000);
  if (mins < 1)   return 'last seen just now';
  if (mins < 60)  return `last seen ${mins} min ago`;
  if (hours < 24) return `last seen today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString())
    return `last seen yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  return `last seen ${date.toLocaleDateString([], { day: 'numeric', month: 'short' })}`;
}

export default function ChatWindow({ chat, socket, onMessageSent, onlineUsers, lastSeenMap, onChatDeleted, incomingMsg, onIncomingMsgHandled, onMobileBack, onDraftChange }) {
  const { user } = useAuth();
  const [messages, setMessages]       = useState([]);
  const [firstUnreadIdx, setFirstUnreadIdx] = useState(-1);
  const [text, setText]               = useState('');
  const [livePreview, setLivePreview] = useState(null);  // live link preview in input bar
  const [previewLoading, setPreviewLoading] = useState(false);
  const [typing, setTyping]           = useState(false);
  const [isTyping, setIsTyping]       = useState(false);
  const [searchOpen, setSearchOpen]   = useState(false);
  const [searchTerm, setSearchTerm]   = useState('');
  const [searchIdx, setSearchIdx]     = useState(0);
  const [replyTo, setReplyTo]         = useState(null);
  const [editMsg, setEditMsg]         = useState(null);
  const [forwardMsg, setForwardMsg]   = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectMode, setSelectMode]   = useState(false);
  const [selectAction, setSelectAction] = useState('delete'); // 'delete' | 'forward'
  const [selectDeleteDialog, setSelectDeleteDialog] = useState(false);
  const [pinnedOpen, setPinnedOpen]   = useState(false);
  const [pinnedMsgs, setPinnedMsgs]   = useState([]);
  const [showEmoji, setShowEmoji]       = useState(false);
  const [showAudio, setShowAudio]       = useState(false);
  const [mediaFiles, setMediaFiles]     = useState(null); // array for preview modal
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [isFavourite, setIsFavourite]   = useState(false);
  const [showAttach, setShowAttach]     = useState(false);
  const [showPoll, setShowPoll]         = useState(false);
  const [showContact, setShowContact]   = useState(false);
  const [showEvent, setShowEvent]       = useState(false);
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [confirmDialog, setConfirmDialog]     = useState(null); // { title, message, icon, onConfirm }
  const [playingAudioId, setPlayingAudioId]   = useState(null); // ID of currently playing voice message
  const bottomRef     = useRef(null);
  const unreadRef     = useRef(null);
  const typingTimeout = useRef(null);
  const searchRef     = useRef(null);
  const inputRef      = useRef(null);
  const prevChatIdRef = useRef(null); // track previous chat for draft saving
  const textRef       = useRef('');   // mirror of text for use in cleanup

  const isSavedMessages = chat?.isSavedMessages || false;
  const otherUser = isSavedMessages ? null : chat?.participants?.find((p) => p._id !== user._id);
  const receiverId = isSavedMessages ? user._id : otherUser?._id;
  const [isContactBlocked, setIsContactBlocked] = useState(false);

  // Handle live incoming message pushed from ChatPage
  useEffect(() => {
    if (!incomingMsg || incomingMsg.chatId !== chat?._id) return;
    const senderId = incomingMsg.senderId?._id?.toString() || incomingMsg.senderId?.toString();
    if (senderId === user._id?.toString()) return;

    setMessages((prev) => {
      // Avoid duplicates
      if (prev.some((m) => m._id === incomingMsg._id)) return prev;
      return [...prev, { ...incomingMsg, status: 'delivered' }];
    });

    // Ack delivery + mark as read immediately since chat is open
    socket?.emit('message_delivered', { messageId: incomingMsg._id, chatId: incomingMsg.chatId, senderId });
    api.put(`/messages/${chat._id}/read`).then(() => {
      socket?.emit('messages_read', { chatId: chat._id, senderId });
    });

    onIncomingMsgHandled?.();
  }, [incomingMsg]);

  // Fetch messages + mark read
  useEffect(() => {
    if (!chat) return;

    // Save draft for the previous chat before switching
    const prevId = prevChatIdRef.current;
    if (prevId && prevId !== chat._id) {
      const draftText = textRef.current;
      api.put(`/chats/${prevId}/draft`, { text: draftText }).catch(() => {});
    }
    prevChatIdRef.current = chat._id;

    setSearchOpen(false); setSearchTerm(''); setReplyTo(null);
    setEditMsg(null); setSelectMode(false); setSelectedIds(new Set());
    setPinnedOpen(false); setShowContactInfo(false);
    setIsContactBlocked(false);

    // Restore draft for this chat
    const savedDraft = chat.draft || '';
    setText(savedDraft);
    textRef.current = savedDraft;

    api.get(`/messages/${chat._id}`).then((res) => {
      const msgs = res.data;
      setMessages(msgs);
      const idx = msgs.findIndex(
        (m) => (m.senderId?._id?.toString() !== user._id?.toString() && m.senderId?.toString() !== user._id?.toString()) && m.status !== 'read'
      );
      setFirstUnreadIdx(idx);
    });
    setIsFavourite(chat.isFavourite || false);
    socket?.emit('join_room', chat._id);
    api.put(`/messages/${chat._id}/read`).then(() => {
      socket?.emit('messages_read', { chatId: chat._id, senderId: otherUser?._id });
      setTimeout(() => setFirstUnreadIdx(-1), 2000);
    });
    return () => {
      socket?.emit('leave_room', chat._id);
      // Save draft on unmount/chat-switch
      const finalDraft = textRef.current;
      api.put(`/chats/${chat._id}/draft`, { text: finalDraft }).catch(() => {});
      onDraftChange?.(chat._id, finalDraft);
    };
  }, [chat?._id]);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    const handleReceive = (msg) => {
      // Handled by ChatPage → incomingMsg prop. Only process here as fallback
      // if ChatPage didn't catch it (shouldn't happen, but safety net)
      const senderId = msg.senderId?._id?.toString() || msg.senderId?.toString();
      if (msg.chatId === chat?._id && senderId !== user._id?.toString()) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === msg._id)) return prev;
          return [...prev, { ...msg, status: 'delivered' }];
        });
        socket.emit('message_delivered', { messageId: msg._id, chatId: msg.chatId, senderId });
        api.put(`/messages/${chat._id}/read`).then(() => {
          socket.emit('messages_read', { chatId: chat._id, senderId });
        });
      }
    };

    const handleUpdated = (msg) => {
      if (msg.chatId === chat?._id) {
        setMessages((prev) => prev.map((m) => (m._id === msg._id ? msg : m)));
      }
    };

    const handleStatusUpdate = ({ messageId, status }) => {
      setMessages((prev) => prev.map((m) => (m._id === messageId ? { ...m, status } : m)));
    };

    const handleReadUpdate = ({ chatId }) => {
      if (chatId === chat?._id)
        setMessages((prev) => prev.map((m) => ({ ...m, status: 'read' })));
    };

    socket.on('receive_message',       handleReceive);
    socket.on('message_updated',       handleUpdated);
    socket.on('message_status_update', handleStatusUpdate);
    socket.on('messages_read_update',  handleReadUpdate);
    socket.on('typing',                () => setIsTyping(true));
    socket.on('stop_typing',           () => setIsTyping(false));
    socket.on('chat_cleared',          (chatId) => {
      if (chatId === chat?._id) setMessages([]);
    });

    return () => {
      socket.off('receive_message',       handleReceive);
      socket.off('message_updated',       handleUpdated);
      socket.off('message_status_update', handleStatusUpdate);
      socket.off('messages_read_update',  handleReadUpdate);
      socket.off('typing');
      socket.off('stop_typing');
      socket.off('chat_cleared');
    };
  }, [socket, chat?._id]);

  // Scroll to unread divider on load, otherwise scroll to bottom
  useEffect(() => {
    if (firstUnreadIdx >= 0 && unreadRef.current) {
      unreadRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length === 0 ? 0 : messages[0]?._id]); // only on initial load

  // Always scroll to bottom on new messages after initial load
  useEffect(() => {
    if (firstUnreadIdx === -1) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);
  useEffect(() => { if (searchOpen) searchRef.current?.focus(); }, [searchOpen]);
  useEffect(() => { if (replyTo || editMsg) inputRef.current?.focus(); }, [replyTo, editMsg]);

  // ── Audio chain: auto-play next voice message when current ends ──

  // Helper: after adding a message to state, if self-chat mark it read instantly
  const addMessageAndMarkRead = async (data) => {
    if (isSavedMessages) {
      setMessages((prev) => [...prev, { ...data, status: 'read' }]);
      await api.put(`/messages/${chat._id}/read`).catch(() => {});
    } else {
      setMessages((prev) => [...prev, data]);
      socket?.emit('send_message', { ...data, chatId: chat._id });
    }
    onMessageSent?.({ ...data, chatId: chat._id });
  };
  const handleAudioPlay = (id) => setPlayingAudioId(id);

  const handleAudioEnded = (id) => {
    // Find the next audio message after this one
    const audioMsgs = messages.filter(
      (m) => (m.mediaType === 'audio' || m.messageType === 'audio') && m.mediaUrl && !m.uploading
    );
    const idx = audioMsgs.findIndex((m) => m._id === id);
    if (idx !== -1 && idx < audioMsgs.length - 1) {
      setPlayingAudioId(audioMsgs[idx + 1]._id);
    } else {
      setPlayingAudioId(null);
    }
  };

  // Send or edit
  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;

    try {
      if (editMsg) {
        const { data } = await api.put(`/messages/${editMsg._id}/edit`, { text });
        setMessages((prev) => prev.map((m) => (m._id === data._id ? data : m)));
        socket?.emit('message_edited', data);
        setEditMsg(null);
      } else {
        const { data } = await api.post('/messages', {
          chatId: chat._id, receiverId: receiverId,
          text, replyTo: replyTo?._id || null,
        });
        // Self-chat: instantly delivered + read (blue ticks)
        if (isSavedMessages) {
          const readMsg = { ...data, status: 'read' };
          setMessages((prev) => [...prev, readMsg]);
          await api.put(`/messages/${chat._id}/read`);
        } else {
          // If receiver is online, immediately show as delivered
          const isReceiverOnline = onlineUsers?.includes(otherUser?._id);
          const msgWithStatus = { ...data, status: isReceiverOnline ? 'delivered' : 'sent' };
          setMessages((prev) => [...prev, msgWithStatus]);
          socket?.emit('send_message', { ...data, chatId: chat._id });
        }
        onMessageSent?.({ ...data, chatId: chat._id });
        setReplyTo(null);
      }
      socket?.emit('stop_typing', chat._id);
      setText('');
      textRef.current = '';
      setLivePreview(null);
      // Clear draft from DB after sending
      api.put(`/chats/${chat._id}/draft`, { text: '' }).catch(() => {});
      onDraftChange?.(chat._id, '');
    } catch (err) { console.error(err); }
  };

  const handleTypingInput = (e) => {
    const val = e.target.value;
    setText(val);
    textRef.current = val;
    if (!typing) { setTyping(true); socket?.emit('typing', { chatId: chat._id, username: user.username }); }
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => { socket?.emit('stop_typing', chat._id); setTyping(false); }, 1500);

    // Detect URL and fetch live preview (debounced)
    const urlMatch = val.match(/(https?:\/\/[^\s]+)/);
    if (urlMatch) {
      const url = urlMatch[1];
      if (livePreview?.url !== url) {
        setPreviewLoading(true);
        clearTimeout(handleTypingInput._previewTimer);
        handleTypingInput._previewTimer = setTimeout(async () => {
          try {
            const res = await api.get(`/link-preview?url=${encodeURIComponent(url)}`);
            if (res.data?.title) setLivePreview({ ...res.data, url });
            else setLivePreview(null);
          } catch { setLivePreview(null); }
          finally { setPreviewLoading(false); }
        }, 600);
      }
    } else {
      setLivePreview(null);
      setPreviewLoading(false);
    }
  };

  const handleEmojiClick = (emoji) => {
    const input = inputRef.current;
    if (!input) { setText((t) => t + emoji); return; }
    const start = input.selectionStart;
    const end   = input.selectionEnd;
    const newText = text.slice(0, start) + emoji + text.slice(end);
    setText(newText);
    // Restore cursor after emoji
    setTimeout(() => {
      input.focus();
      input.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 0);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url  = URL.createObjectURL(file);
    let type = 'file';
    if (file.type.startsWith('image/')) type = 'image';
    if (file.type.startsWith('video/')) type = 'video';
    setMediaFiles([{ file, url, type, name: file.name }]);
    e.target.value = '';
  };

  const handleMediaSend = async (files, caption) => {
    const filesToSend = files || mediaFiles;
    if (!filesToSend?.length) return;
    try {
      for (const item of filesToSend) {
        const formData = new FormData();
        formData.append('file', item.file);
        const { data: uploadData } = await api.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        const { data } = await api.post('/messages', {
          chatId: chat._id,
          receiverId: receiverId,
          text: caption || '',
          replyTo: replyTo?._id || null,
          mediaUrl:    uploadData.mediaUrl,
          mediaType:   uploadData.mediaType,
          mediaName:   uploadData.mediaName,
          messageType: uploadData.mediaType,
        });
        await addMessageAndMarkRead(data);
      }
      setMediaFiles(null);
      setReplyTo(null);
      setText('');
    } catch (err) { console.error(err); }
  };

  // Send poll
  const handlePollSend = async (pollData) => {
    try {
      const { data } = await api.post('/messages', {
        chatId: chat._id, receiverId: receiverId,
        text: pollData.question, messageType: 'poll', poll: pollData,
      });
      await addMessageAndMarkRead(data);
    } catch (err) { console.error(err); }
  };

  // Send contact
  const handleContactSend = async (contactData) => {
    try {
      const { data } = await api.post('/messages', {
        chatId: chat._id, receiverId: receiverId,
        text: contactData.name, messageType: 'contact', contact: contactData,
      });
      await addMessageAndMarkRead(data);
    } catch (err) { console.error(err); }
  };

  // Send event
  const handleEventSend = async (eventData) => {
    try {
      const { data } = await api.post('/messages', {
        chatId: chat._id, receiverId: receiverId,
        text: eventData.title, messageType: 'event', event: eventData,
      });
      await addMessageAndMarkRead(data);
    } catch (err) { console.error(err); }
  };

  // Vote on poll
  const handleVotePoll = async (messageId, optionIndex) => {
    try {
      const { data } = await api.put(`/messages/${messageId}/vote`, { optionIndex });
      setMessages((prev) => prev.map((m) => (m._id === messageId ? data : m)));
      socket?.emit('message_updated', { ...data, chatId: chat._id });
    } catch (err) { console.error(err); }
  };

  const handleAudioSend = async (blob) => {
    setShowAudio(false);
    // Optimistic placeholder — shows spinner while uploading
    const tempId = `temp-audio-${Date.now()}`;
    const tempMsg = {
      _id: tempId,
      chatId: chat._id,
      senderId: { _id: user._id, username: user.username, avatar: user.avatar },
      messageType: 'audio',
      mediaType: 'audio',
      mediaUrl: null,
      uploading: true,
      createdAt: new Date().toISOString(),
      status: 'sent',
    };
    setMessages((prev) => [...prev, tempMsg]);
    try {
      const file = new File([blob], 'voice-message.webm', { type: 'audio/webm' });
      const formData = new FormData();
      formData.append('file', file);
      const { data: uploadData } = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const { data } = await api.post('/messages', {
        chatId: chat._id,
        receiverId: receiverId,
        text: '',
        mediaUrl:    uploadData.mediaUrl,
        mediaType:   'audio',
        mediaName:   'Voice message',
        messageType: 'audio',
      });
      // Replace optimistic placeholder with real message
      if (isSavedMessages) {
        setMessages((prev) => prev.map((m) => m._id === tempId ? { ...data, status: 'read' } : m));
        await api.put(`/messages/${chat._id}/read`).catch(() => {});
        onMessageSent?.({ ...data, chatId: chat._id });
      } else {
        setMessages((prev) => prev.map((m) => m._id === tempId ? data : m));
        socket?.emit('send_message', { ...data, chatId: chat._id });
        onMessageSent?.({ ...data, chatId: chat._id });
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => prev.filter((m) => m._id !== tempId));
    }
  };

  // Actions
  const handleDelete = async (id, deleteFor = 'me') => {
    try {
      const { data } = await api.delete(`/messages/${id}`, { data: { deleteFor } });
      if (data.deletedForEveryone) {
        // Update message for both users via socket
        setMessages((prev) => prev.map((m) => (m._id === id ? { ...m, isDeleted: true, text: 'This message was deleted' } : m)));
        socket?.emit('message_deleted', { ...data, chatId: chat._id });
      } else {
        // Delete for me only — remove from local state
        setMessages((prev) => prev.filter((m) => m._id !== id));
      }
    } catch (err) { console.error(err); }
  };

  const handleStar = async (id) => {
    const { data } = await api.put(`/messages/${id}/star`);
    setMessages((prev) => prev.map((m) => (m._id === id ? { ...m, isStarred: data.isStarred } : m)));
    socket?.emit('message_starred', data);
  };

  const handleReact = async (id, emoji) => {
    try {
      const { data } = await api.put(`/messages/${id}/react`, { emoji });
      setMessages((prev) => prev.map((m) => (m._id === id ? data : m)));
      socket?.emit('message_updated', { ...data, chatId: chat._id });
    } catch (err) { console.error(err); }
  };

  const handlePin = async (id) => {
    const { data } = await api.put(`/messages/${id}/pin`);
    setMessages((prev) => prev.map((m) => (m._id === id ? { ...m, isPinned: data.isPinned } : m)));
    socket?.emit('message_pinned', data);
    if (pinnedOpen) loadPinned();
  };

  const handleCopy = (txt) => navigator.clipboard.writeText(txt);

  const handleChatMenuAction = async (action) => {
    if (action === 'search') {
      setSearchOpen(true);
      setSearchTerm('');
      setSearchIdx(0);
    } else if (action === 'select') {
      setSelectMode(true);
    } else if (action === 'favourite') {
      const { data } = await api.put(`/chats/${chat._id}/favourite`);
      setIsFavourite(data.isFavourite);
    } else if (action === 'clear') {
      setConfirmDialog({
        icon: <ClearConfirmIcon />,
        title: 'Clear chat?',
        message: `Clear all messages in your chat with ${otherUser?.username}?`,
        confirmLabel: 'Clear chat',
        confirmDanger: true,
        hasStarredOption: true,
        onConfirm: async (deleteStarred) => {
          setConfirmDialog(null);
          await api.put(`/chats/${chat._id}/clear`, { deleteStarred });
          setMessages([]);
          socket?.emit('chat_cleared', chat._id);
        },
      });
    } else if (action === 'delete') {
      setConfirmDialog({
        icon: <DeleteConfirmIcon />,
        title: 'Delete chat?',
        message: `Delete your chat with ${otherUser?.username}? This chat will be removed from your chats list. They can still message you.`,
        confirmLabel: 'Delete chat',
        confirmDanger: true,
        onConfirm: async () => {
          setConfirmDialog(null);
          await api.delete(`/chats/${chat._id}`);
          onChatDeleted?.(chat._id);
        },
      });
    }
  };

  const handleReply = (msg) => { setReplyTo(msg); setEditMsg(null); };

  const handleScrollToMessage = (messageId) => {
    // Find the index of the message by _id
    const idx = messages.findIndex((m) => m._id === messageId);
    if (idx === -1) return;
    const el = document.getElementById(`msg-${idx}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // Flash highlight
    el.classList.add('msg-highlight-flash');
    setTimeout(() => el.classList.remove('msg-highlight-flash'), 1200);
  };

  const handleEdit = (msg) => { setEditMsg(msg); setReplyTo(null); setText(msg.text); };

  const handleForward = (msg) => {
    // Enter select mode with forward action, pre-select this message
    setSelectMode(true);
    setSelectAction('forward');
    setSelectedIds(new Set([msg._id]));
  };

  const handleForwardSelected = () => {
    if (!selectedIds.size) return;
    // Collect selected messages in order
    const msgsToForward = messages.filter((m) => selectedIds.has(m._id));
    setForwardMsg(msgsToForward); // pass array
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const handleForwardSend = async (targetChat) => {
    const msgs = Array.isArray(forwardMsg) ? forwardMsg : [forwardMsg];
    for (const msg of msgs) {
      const { data } = await api.post('/messages', {
        chatId: targetChat._id,
        receiverId: targetChat.participants.find((p) => p._id !== user._id)?._id,
        text: msg.text,
        ...(msg.mediaUrl && {
          mediaUrl: msg.mediaUrl,
          mediaType: msg.mediaType,
          mediaName: msg.mediaName,
          messageType: msg.messageType,
        }),
      });
      socket?.emit('send_message', { ...data, chatId: targetChat._id });
    }
    setForwardMsg(null);
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Enter select mode from context menu — pre-select the tapped message
  const handleSelectMessage = (id) => {
    setSelectMode(true);
    setSelectAction('delete');
    setSelectedIds(new Set([id]));
  };

  const handleDeleteSelected = () => {
    if (!selectedIds.size) return;
    setSelectDeleteDialog(true);
  };

  const handleDeleteSelectedConfirm = async (deleteFor) => {
    setSelectDeleteDialog(false);
    for (const id of selectedIds) await handleDelete(id, deleteFor);
    setSelectedIds(new Set());
    setSelectMode(false);
  };

  const loadPinned = async () => {
    const { data } = await api.get(`/messages/${chat._id}/pinned/list`);
    setPinnedMsgs(data);
  };

  const togglePinned = () => {
    if (!pinnedOpen) loadPinned();
    setPinnedOpen(!pinnedOpen);
  };

  // Search
  const filteredIndexes = searchTerm.trim()
    ? messages.reduce((acc, m, i) => {
        if (!m.isDeleted && m.text.toLowerCase().includes(searchTerm.toLowerCase())) acc.push(i);
        return acc;
      }, [])
    : [];

  const handleSearchNav = (dir) => {
    if (!filteredIndexes.length) return;
    const next = (searchIdx + dir + filteredIndexes.length) % filteredIndexes.length;
    setSearchIdx(next);
    document.getElementById(`msg-${filteredIndexes[next]}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  if (!chat) {
    return (
      <div className="chat-empty">
        <div className="chat-empty-content">
          <div className="empty-wa-logo">
            <svg viewBox="0 0 24 24" width="72" height="72"><path fill="#00a884" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          </div>
          <h2>WhatsApp Web</h2>
          <p>Send and receive messages without keeping your phone online.</p>
          <div className="empty-encrypted-note">
            <svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
            <span>Your personal messages are end-to-end encrypted</span>
          </div>
        </div>
      </div>
    );
  }

  const pinnedCount = messages.filter((m) => m.isPinned).length;
  const mediaMessages = messages.filter((m) => m.mediaUrl);

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
    <div className={`chat-window${chat ? ' mobile-open' : ''}`}>
      {/* Header */}
      <div className="chat-header">
        {selectMode ? (
          /* Select mode header — same as normal but shows count */
          <>
            <button className="header-icon-btn" onClick={() => { setSelectMode(false); setSelectedIds(new Set()); setSelectAction('delete'); }} title="Cancel">
              <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
            <span className="chat-header-name">{selectedIds.size} selected</span>
          </>
        ) : (
          <>
            {/* Mobile back button */}
            <button className="header-icon-btn mobile-back-btn" onClick={onMobileBack} title="Back">
              <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
            </button>

            {/* Avatar */}
            <div className="chat-header-avatar" onClick={() => !isSavedMessages && setShowContactInfo(true)}
              style={{ cursor: isSavedMessages ? 'default' : 'pointer' }}>
              {isSavedMessages ? (
                user?.avatar
                  ? <img src={`http://localhost:5000${user.avatar}`} alt={user.username} style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:'50%' }} />
                  : <DefaultAvatar />
              ) : otherUser?.avatar ? (
                <img src={`http://localhost:5000${otherUser.avatar}`} alt={otherUser.username} style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:'50%' }} />
              ) : (
                <DefaultAvatar />
              )}
            </div>

            {/* Name + status */}
            <div className="chat-header-info" onClick={() => !isSavedMessages && setShowContactInfo(true)}
              style={{ cursor: isSavedMessages ? 'default' : 'pointer' }}>
              <span className="chat-header-name">
                {isSavedMessages ? `${user.username} (You)` : otherUser?.username}
              </span>
              {!isSavedMessages && (
                isTyping
                  ? <span className="chat-header-typing">typing...</span>
                  : <span className="chat-header-status">
                      {onlineUsers?.includes(otherUser?._id)
                        ? 'online'
                        : lastSeenMap?.[otherUser?._id]
                          ? formatLastSeen(lastSeenMap[otherUser._id])
                          : 'last seen recently'
                      }
                    </span>
              )}
              {isSavedMessages && (
                <span className="chat-header-status">Message yourself</span>
              )}
            </div>

            <div className="header-actions" style={{ position: 'relative' }}>
              {pinnedCount > 0 && (
                <button className={`header-icon-btn ${pinnedOpen ? 'active' : ''}`} onClick={togglePinned} title="Pinned messages">
                  <PinHeaderIcon /> <span className="pin-count">{pinnedCount}</span>
                </button>
              )}
              <button className={`header-icon-btn ${searchOpen ? 'active' : ''}`}
                onClick={() => { setSearchOpen(!searchOpen); setSearchTerm(''); setSearchIdx(0); }}
                title="Search">
                <SearchHeaderIcon />
              </button>
              <button className={`header-icon-btn ${showChatMenu ? 'active' : ''}`} title="Menu" onClick={() => setShowChatMenu(!showChatMenu)}>
                <MenuHeaderIcon />
              </button>
              {showChatMenu && (
                <ChatMenu
                  chat={chat}
                  isFavourite={isFavourite}
                  onClose={() => setShowChatMenu(false)}
                  onAction={handleChatMenuAction}
                />
              )}
            </div>
          </>
        )}
      </div>

      {/* Pinned messages panel */}
      {pinnedOpen && (
        <div className="pinned-panel">
          <div className="pinned-panel-header">
            <span>📌 Pinned Messages ({pinnedMsgs.length})</span>
            <button onClick={() => setPinnedOpen(false)}>✕</button>
          </div>
          {pinnedMsgs.length === 0
            ? <p className="pinned-empty">No pinned messages</p>
            : pinnedMsgs.map((m) => (
              <div key={m._id} className="pinned-item">
                <span className="pinned-sender">{m.senderId?.username}</span>
                <span className="pinned-text">{m.text}</span>
                <button onClick={() => handlePin(m._id)} title="Unpin">✕</button>
              </div>
            ))
          }
        </div>
      )}

      {/* Search bar — mobile only (desktop uses side panel) */}
      {searchOpen && (
        <div className="chat-search-bar chat-search-bar--mobile">
          <input ref={searchRef} value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setSearchIdx(0); }}
            placeholder="Search messages..." />
          <span className="search-count">
            {filteredIndexes.length > 0 ? `${searchIdx + 1} / ${filteredIndexes.length}` : searchTerm ? '0 results' : ''}
          </span>
          <button onClick={() => handleSearchNav(-1)} disabled={!filteredIndexes.length}>↑</button>
          <button onClick={() => handleSearchNav(1)}  disabled={!filteredIndexes.length}>↓</button>
          <button onClick={() => { setSearchOpen(false); setSearchTerm(''); }}>✕</button>
        </div>
      )}

      {/* Messages */}
      <div className="messages-container">
        {/* Self-chat empty state — shown only when no messages yet */}
        {isSavedMessages && messages.length === 0 && (
          <div className="self-chat-empty">
            <div className="self-chat-empty-icon">
              <svg viewBox="0 0 24 24" width="48" height="48"><path fill="#00a884" d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>
            </div>
            <p className="self-chat-empty-title">Message yourself</p>
            <p className="self-chat-empty-sub">Use this space to save notes, links, photos and any other messages to yourself.</p>
          </div>
        )}
        {messages.map((msg, i) => {
          const msgDate = new Date(msg.createdAt);
          const prevDate = i > 0 ? new Date(messages[i - 1].createdAt) : null;
          const showDate = !prevDate || msgDate.toDateString() !== prevDate.toDateString();

          return (
            <div id={`msg-${i}`} key={msg._id}>
              {/* Date divider */}
              {showDate && (
                <div className="date-divider">
                  <span>{formatDateDivider(msgDate)}</span>
                </div>
              )}
              {/* Unread divider */}
              {i === firstUnreadIdx && (
                <div ref={unreadRef} className="unread-divider">
                  <span>
                    {messages.length - firstUnreadIdx} unread message{messages.length - firstUnreadIdx > 1 ? 's' : ''}
                  </span>
                </div>
              )}
              <MessageBubble
              message={msg}
              isOwn={msg.senderId?._id?.toString() === user._id?.toString() || msg.senderId?.toString() === user._id?.toString()}
              searchTerm={searchTerm}
              isSelected={selectMode ? selectedIds.has(msg._id) : undefined}
              onSelect={selectMode ? toggleSelect : handleSelectMessage}
              onReply={handleReply}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onStar={handleStar}
              onPin={handlePin}
              onForward={handleForward}
              onCopy={handleCopy}
              currentUserId={user._id}
              onVote={handleVotePoll}
              playingAudioId={playingAudioId}
              onAudioPlay={handleAudioPlay}
              onAudioEnded={handleAudioEnded}
              onReact={handleReact}
              onScrollToMessage={handleScrollToMessage}
            />
            </div>
          );
        })}
        {isTyping && <div className="typing-indicator"><span /><span /><span /></div>}
        <div ref={bottomRef} />
      </div>

      {/* Reply / Edit bar */}
      {(replyTo || editMsg) && (
        <div className="compose-context-bar">
          <div className="compose-context-bar-line" />
          <div className="compose-context-info">
            <span className="compose-context-label">{editMsg ? '✏️ Editing' : `↩️ Replying to ${replyTo?.senderId?.username}`}</span>
            <span className="compose-context-text">{editMsg ? editMsg.text : replyTo?.text}</span>
          </div>
          <button onClick={() => { setReplyTo(null); setEditMsg(null); setText(''); }}>✕</button>
        </div>
      )}

      {/* Media preview bar — replaced by full-screen modal */}

      {/* Live link preview bar — shown above input when URL detected */}
      {(livePreview || previewLoading) && !showAudio && !isContactBlocked && (
        <div className="live-preview-bar">
          {previewLoading && !livePreview ? (
            <div className="live-preview-loading">
              <span className="live-preview-spinner" />
              <span>Loading preview...</span>
            </div>
          ) : livePreview ? (
            <>
              <div className="live-preview-content">
                {livePreview.image && (
                  <img src={livePreview.image} alt="" className="live-preview-thumb"
                    onError={(e) => { e.target.style.display = 'none'; }} />
                )}
                <div className="live-preview-text">
                  {livePreview.siteName && <span className="live-preview-site">{livePreview.siteName.toUpperCase()}</span>}
                  <span className="live-preview-title">{decodeHtml(livePreview.title)}</span>
                  {livePreview.description && (
                    <span className="live-preview-desc">{decodeHtml(livePreview.description)}</span>
                  )}
                </div>
              </div>
              <button className="live-preview-close" onClick={() => setLivePreview(null)} title="Dismiss">
                <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
              </button>
            </>
          ) : null}
        </div>
      )}

      {/* Input bar — or blocked banner */}
      {isContactBlocked ? (
        <div className="blocked-input-bar">
          <BlockedIcon />
          <span>You blocked this contact. <button onClick={() => setShowContactInfo(true)}>Unblock</button></span>
        </div>
      ) : (
      <div className="message-input-bar">
        {showAudio ? (
          <AudioRecorder onSend={handleAudioSend} onCancel={() => setShowAudio(false)} />
        ) : (
          <>
            {showEmoji && <EmojiPickerPanel onEmojiClick={handleEmojiClick} onClose={() => setShowEmoji(false)} />}

            {/* Attach menu */}
            {showAttach && (
              <AttachMenu
                onClose={() => setShowAttach(false)}
                onFileSelect={(e, type) => {
                  const newFiles = Array.from(e.target.files || []).map((f) => ({
                    file: f,
                    url:  URL.createObjectURL(f),
                    type: type === 'audio' ? 'audio' : f.type.startsWith('image/') ? 'image' : f.type.startsWith('video/') ? 'video' : 'file',
                    name: f.name,
                  }));
                  if (newFiles.length) setMediaFiles(newFiles);
                }}
                onPoll={() => setShowPoll(true)}
                onContact={() => setShowContact(true)}
                onEvent={() => setShowEvent(true)}
                onCamera={() => {}}
              />
            )}

            {/* + button outside left */}
            <button className="input-plus-btn" onClick={() => { setShowAttach(!showAttach); setShowEmoji(false); }} title="Attach" type="button">
              <PlusIcon />
            </button>

            {/* Pill: emoji | input | attach + mic */}
            <form className="input-pill" onSubmit={handleSend}>
              <button className={`input-icon-btn ${showEmoji ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); setShowEmoji(!showEmoji); }} title="Emoji" type="button">
                <EmojiIcon />
              </button>
              <input ref={inputRef} value={text} onChange={handleTypingInput} onFocus={() => setShowEmoji(false)} placeholder={editMsg ? 'Edit message...' : 'Type a message'} autoFocus />
              <div className="input-right-icons">
                {!text.trim() && (
                  <button className="input-icon-btn" type="button" onClick={() => setShowAudio(true)} title="Voice message">
                    <MicIcon />
                  </button>
                )}
              </div>
            </form>

            {/* Send — green circle outside right */}
            {text.trim() && (
              <button className="send-btn" onClick={handleSend} type="button">
                <SendIcon />
              </button>
            )}
          </>
        )}
      </div>
      )}{/* end isContactBlocked conditional */}

      {/* Forward modal */}
      {forwardMsg && (
        <ForwardModal
          forwardMsg={forwardMsg}
          onClose={() => setForwardMsg(null)}
          onSend={handleForwardSend}
          userId={user._id}
        />
      )}

      {/* Poll / Contact / Event modals */}
      {showPoll    && <PollModal    onClose={() => setShowPoll(false)}    onSend={handlePollSend} />}
      {showContact && <ContactModal onClose={() => setShowContact(false)} onSend={handleContactSend} />}
      {showEvent   && <EventModal   onClose={() => setShowEvent(false)}   onSend={handleEventSend} />}

      {/* Confirm dialog */}
      {confirmDialog && (
        <ClearDeleteDialog
          dialog={confirmDialog}
          onCancel={() => setConfirmDialog(null)}
        />
      )}

      {/* ── Select mode bottom bar — slides up like WhatsApp ── */}
      {selectMode && (
        <div className="select-bottom-bar">
          <button
            className="select-bar-cancel"
            onClick={() => { setSelectMode(false); setSelectedIds(new Set()); setSelectAction('delete'); }}
            title="Cancel"
          >
            <svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
          </button>
          <span className="select-bar-count">
            {selectedIds.size} selected
          </span>
          {selectAction === 'forward' ? (
            <button
              className="select-bar-forward"
              onClick={handleForwardSelected}
              disabled={!selectedIds.size}
              title="Forward"
            >
              <svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M14 9V5l7 7-7 7v-4.1c-5 0-8.5 1.6-11 5.1 1-5 4-10 11-11z"/></svg>
            </button>
          ) : (
            <button
              className="select-bar-delete"
              onClick={handleDeleteSelected}
              disabled={!selectedIds.size}
              title="Delete"
            >
              <svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
            </button>
          )}
        </div>
      )}

      {/* Select delete dialog */}
      {selectDeleteDialog && (
        <SelectDeleteDialog
          count={selectedIds.size}
          hasMedia={[...selectedIds].some((id) => {
            const msg = messages.find((m) => m._id === id);
            return msg?.mediaUrl;
          })}
          canDeleteForEveryone={
            // Never available in self-chat; otherwise only for own messages within time limit
            !isSavedMessages &&
            [...selectedIds].every((id) => {
              const msg = messages.find((m) => m._id === id);
              return msg &&
                (msg.senderId?._id?.toString() === user._id?.toString() || msg.senderId?.toString() === user._id?.toString()) &&
                !msg.isDeleted &&
                (Date.now() - new Date(msg.createdAt).getTime()) < 4096 * 1000;
            })
          }
          onDeleteForMe={() => handleDeleteSelectedConfirm('me')}
          onDeleteForEveryone={() => handleDeleteSelectedConfirm('everyone')}
          onCancel={() => setSelectDeleteDialog(false)}
        />
      )}
    </div>

    {/* Media preview — covers chat area only (not sidebar) */}
    {mediaFiles && (
      <MediaPreviewModal
        files={mediaFiles}
        onSend={handleMediaSend}
        onClose={() => setMediaFiles(null)}
      />
    )}

    {/* Contact info panel — slides in from right (not for self-chat) */}
    {showContactInfo && !isSavedMessages && (
      <ContactInfo
        contact={otherUser}
        isOnline={onlineUsers?.includes(otherUser?._id)}
        lastSeen={lastSeenMap?.[otherUser?._id]}
        mediaMessages={mediaMessages}
        onClose={() => setShowContactInfo(false)}
        onClearChat={() => { setShowContactInfo(false); handleChatMenuAction('clear'); }}
        onDeleteChat={() => { setShowContactInfo(false); handleChatMenuAction('delete'); }}
        onBlockChange={(blocked) => setIsContactBlocked(blocked)}
      />
    )}

    {/* Search panel — desktop right-side panel */}
    {searchOpen && (
      <SearchPanel
        messages={messages}
        searchTerm={searchTerm}
        onSearchChange={(val) => { setSearchTerm(val); setSearchIdx(0); }}
        onClose={() => { setSearchOpen(false); setSearchTerm(''); }}
        onResultClick={(msgIndex) => {
          setSearchIdx(msgIndex);
          document.getElementById(`msg-${msgIndex}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }}
        filteredIndexes={filteredIndexes}
        activeIndex={searchIdx}
      />
    )}
    </div>
  );
}

// ── Search Panel — desktop right-side panel ──────────
function SearchPanel({ messages, searchTerm, onSearchChange, onClose, onResultClick, filteredIndexes, activeIndex }) {
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  // Group results by date
  const groupedResults = filteredIndexes.reduce((acc, idx) => {
    const msg = messages[idx];
    if (!msg) return acc;
    const dateKey = new Date(msg.createdAt).toLocaleDateString([], {
      day: 'numeric', month: 'long', year: 'numeric',
    });
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push({ idx, msg });
    return acc;
  }, {});

  const highlightText = (text, term) => {
    if (!term?.trim() || !text) return text;
    const parts = text.split(new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === term.toLowerCase()
        ? <mark key={i} className="sp-highlight">{part}</mark>
        : part
    );
  };

  const getPreview = (msg) => {
    if (msg.isDeleted) return 'This message was deleted';
    if (msg.mediaType === 'image') return '📷 Photo';
    if (msg.mediaType === 'video') return '🎥 Video';
    if (msg.mediaType === 'audio') return '🎤 Voice message';
    if (msg.mediaType === 'file')  return `📄 ${msg.mediaName || 'Document'}`;
    if (msg.messageType === 'poll') return '📊 Poll';
    return msg.text || '';
  };

  return (
    <div className="search-panel">
      {/* Header */}
      <div className="search-panel-header">
        <button className="search-panel-close" onClick={onClose} title="Close">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
        <span className="search-panel-title">Search messages</span>
      </div>

      {/* Search input */}
      <div className="search-panel-input-wrap">
        <svg viewBox="0 0 24 24" width="16" height="16" className="search-panel-icon">
          <path fill="currentColor" d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
        </svg>
        <input
          ref={inputRef}
          className="search-panel-input"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search..."
        />
        {searchTerm && (
          <button className="search-panel-clear" onClick={() => onSearchChange('')}>
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        )}
      </div>

      {/* Results */}
      <div className="search-panel-results">
        {!searchTerm.trim() ? (
          <div className="search-panel-empty">
            <svg viewBox="0 0 24 24" width="40" height="40" style={{opacity:0.3}}>
              <path fill="currentColor" d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
            <p>Search for messages</p>
          </div>
        ) : filteredIndexes.length === 0 ? (
          <div className="search-panel-empty">
            <p>No results for "{searchTerm}"</p>
          </div>
        ) : (
          Object.entries(groupedResults).map(([dateKey, items]) => (
            <div key={dateKey} className="search-panel-group">
              <div className="search-panel-date">{dateKey}</div>
              {items.map(({ idx, msg }) => (
                <button
                  key={msg._id}
                  className={`search-panel-result ${idx === filteredIndexes[activeIndex] ? 'search-panel-result--active' : ''}`}
                  onClick={() => onResultClick(idx)}
                >
                  <div className="spr-time">
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="spr-preview">
                    {highlightText(getPreview(msg), searchTerm)}
                  </div>
                </button>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Forward modal — pick a chat to forward to
function ForwardModal({ forwardMsg, onClose, onSend, userId }) {
  const [chats, setChats] = useState([]);
  const [search, setSearch] = useState('');
  useEffect(() => { api.get('/chats').then((r) => setChats(r.data)); }, []);

  const msgs = Array.isArray(forwardMsg) ? forwardMsg : [forwardMsg];
  const count = msgs.length;

  const filtered = search.trim()
    ? chats.filter((c) => {
        const other = c.participants.find((p) => p._id !== userId);
        return other?.username?.toLowerCase().includes(search.toLowerCase());
      })
    : chats;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="fwd-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="fwd-modal-header">
          <button className="fwd-modal-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
          </button>
          <span className="fwd-modal-title">Forward message{count > 1 ? 's' : ''}</span>
        </div>

        {/* Search */}
        <div className="fwd-modal-search">
          <svg viewBox="0 0 24 24" width="16" height="16"><path fill="#8696a0" d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contacts"
            autoFocus
          />
        </div>

        {/* Chat list */}
        <div className="fwd-modal-list">
          {filtered.map((c) => {
            const other = c.participants.find((p) => p._id !== userId);
            return (
              <div key={c._id} className="fwd-modal-item" onClick={() => { onSend(c); onClose(); }}>
                <div className="fwd-modal-avatar">
                  {other?.avatar
                    ? <img src={`http://localhost:5000${other.avatar}`} alt={other.username} />
                    : <DefaultAvatar size="46px" />
                  }
                </div>
                <span className="fwd-modal-name">{other?.username}</span>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="fwd-modal-empty">No contacts found</div>
          )}
        </div>
      </div>
    </div>
  );
}

// Icons used in input bar
const EmojiIcon  = () => <svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/></svg>;
const BlockedIcon = () => <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM4 12c0-4.42 3.58-8 8-8 1.85 0 3.55.63 4.9 1.69L5.69 16.9A7.902 7.902 0 0 1 4 12zm8 8c-1.85 0-3.55-.63-4.9-1.69L18.31 7.1A7.902 7.902 0 0 1 20 12c0 4.42-3.58 8-8 8z"/></svg>;
const AttachIcon = () => <svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"/></svg>;
const MicIcon    = () => <svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>;
const SendIcon   = () => <svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M1.101 21.757L23.8 12.028 1.101 2.3l.011 7.912 13.623 1.816-13.623 1.817-.011 7.912z"/></svg>;

const PlusIcon        = () => <svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>;const PinHeaderIcon   = () => <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/></svg>;
const SearchHeaderIcon = () => <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>;
const MenuHeaderIcon  = () => <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>;

function decodeHtml(str) {
  if (!str) return str;
  return str.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n))
            .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'");
}

function formatDateDivider(date) {
  const now = new Date();
  const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === now.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const ClearConfirmIcon  = () => <svg viewBox="0 0 24 24" width="28" height="28"><path fill="#f15c6d" d="M5 13h14v-2H5v2zm-2 4h14v-2H3v2zM7 7v2h14V7H7z"/></svg>;
const DeleteConfirmIcon = () => <svg viewBox="0 0 24 24" width="28" height="28"><path fill="#f15c6d" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>;

// Inline dialog for clear/delete chat with optional starred checkbox
function ClearDeleteDialog({ dialog, onCancel }) {
  const [deleteStarred, setDeleteStarred] = useState(false);

  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="confirm-card" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-icon">{dialog.icon}</div>
        <h3 className="confirm-title">{dialog.title}</h3>
        <p className="confirm-message">{dialog.message}</p>

        {dialog.hasStarredOption && (
          <label className="confirm-checkbox-row">
            <input
              type="checkbox"
              checked={deleteStarred}
              onChange={(e) => setDeleteStarred(e.target.checked)}
            />
            <span>Also delete starred messages</span>
          </label>
        )}

        <div className="confirm-actions">
          <button className="confirm-btn cancel" onClick={onCancel}>Cancel</button>
          <button
            className="confirm-btn danger"
            onClick={() => dialog.onConfirm(deleteStarred)}
          >
            {dialog.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// WhatsApp-style delete dialog for selected messages
function SelectDeleteDialog({ count, hasMedia, canDeleteForEveryone, onDeleteForMe, onDeleteForEveryone, onCancel }) {
  const [deleteFile, setDeleteFile] = useState(false);

  return (
    <div className="wa-delete-overlay" onClick={onCancel}>
      <div className="wa-delete-card" onClick={(e) => e.stopPropagation()}>
        {/* Title */}
        <p className="wa-delete-title">
          Delete message{count !== 1 ? 's' : ''}?
        </p>

        {/* "Delete file from your phone" checkbox — only for media */}
        {hasMedia && (
          <label className="wa-delete-checkbox-row" onClick={(e) => e.stopPropagation()}>
            <span className={`wa-delete-checkbox ${deleteFile ? 'checked' : ''}`} onClick={() => setDeleteFile((v) => !v)}>
              {deleteFile && (
                <svg viewBox="0 0 24 24" width="14" height="14">
                  <path fill="#fff" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
              )}
            </span>
            <span className="wa-delete-checkbox-label">Delete file from your phone</span>
          </label>
        )}

        {/* Action buttons — pill shaped, stacked */}
        <div className="wa-delete-actions">
          {canDeleteForEveryone && (
            <button className="wa-delete-btn wa-delete-btn--primary" onClick={onDeleteForEveryone}>
              Delete for everyone
            </button>
          )}
          <button className="wa-delete-btn wa-delete-btn--primary" onClick={onDeleteForMe}>
            Delete for me
          </button>
          <button className="wa-delete-btn wa-delete-btn--cancel" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
