import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import MediaMessage from '../MediaMessage/MediaMessage';
import './MessageBubble.css';
function Ticks({ status }) {
  if (status === 'read') {
    return (
      <span className="ticks ticks-read" title="Read">
        <svg viewBox="0 0 18 11" width="18" height="11">
          <path d="M17.394.677a.75.75 0 0 1 0 1.06l-9.5 9.5a.75.75 0 0 1-1.06 0l-4-4a.75.75 0 1 1 1.06-1.06l3.47 3.47 8.97-8.97a.75.75 0 0 1 1.06 0z" fill="currentColor"/>
          <path d="M12.894.677a.75.75 0 0 1 0 1.06l-9.5 9.5a.75.75 0 0 1-1.06-1.06l9.5-9.5a.75.75 0 0 1 1.06 0z" fill="currentColor"/>
        </svg>
      </span>
    );
  }
  if (status === 'delivered') {
    return (
      <span className="ticks ticks-delivered" title="Delivered">
        <svg viewBox="0 0 18 11" width="18" height="11">
          <path d="M17.394.677a.75.75 0 0 1 0 1.06l-9.5 9.5a.75.75 0 0 1-1.06 0l-4-4a.75.75 0 1 1 1.06-1.06l3.47 3.47 8.97-8.97a.75.75 0 0 1 1.06 0z" fill="currentColor"/>
          <path d="M12.894.677a.75.75 0 0 1 0 1.06l-9.5 9.5a.75.75 0 0 1-1.06-1.06l9.5-9.5a.75.75 0 0 1 1.06 0z" fill="currentColor"/>
        </svg>
      </span>
    );
  }
  return (
    <span className="ticks ticks-sent" title="Sent">
      <svg viewBox="0 0 12 11" width="12" height="11">
        <path d="M11.071.653a.75.75 0 0 1 1.06 1.06l-6.5 6.5a.75.75 0 0 1-1.06 0l-3-3a.75.75 0 1 1 1.06-1.06l2.47 2.47 5.97-5.97z" fill="currentColor"/>
      </svg>
    </span>
  );
}

export default function MessageBubble({
  message, isOwn, searchTerm, isSelected, onSelect,
  onReply, onEdit, onDelete, onStar, onPin, onForward, onCopy,
  currentUserId, onVote,
}) {
  const [menuOpen, setMenuOpen]         = useState(false);
  const [menuPos, setMenuPos]           = useState({ top: 0, left: 0 });
  const [deleteDialog, setDeleteDialog] = useState(false);
  const menuRef   = useRef(null);
  const bubbleRef = useRef(null);

  const time = new Date(message.createdAt).toLocaleTimeString([], {
    hour: '2-digit', minute: '2-digit',
  });

  // Close menu on outside click
  useEffect(() => {
    const close = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    if (menuOpen) document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  const renderText = () => {
    if (!searchTerm?.trim()) return message.text;
    const parts = message.text.split(new RegExp(`(${searchTerm})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === searchTerm.toLowerCase()
        ? <mark key={i} className="highlight">{part}</mark>
        : part
    );
  };

  const act = (fn) => { setMenuOpen(false); fn(); };

  // Calculate fixed position — flip upward if near bottom of screen
  const openMenu = () => {
    if (!bubbleRef.current) return;
    const rect       = bubbleRef.current.getBoundingClientRect();
    const itemCount  = message.isDeleted ? 1 : (isOwn ? 8 : 7);
    const menuHeight = itemCount * 44 + 8;
    const spaceBelow = window.innerHeight - rect.bottom;

    let top;
    if (spaceBelow >= menuHeight) {
      top = rect.top + 20;
    } else {
      top = Math.max(8, rect.bottom - menuHeight - 20);
    }

    const left = isOwn
      ? Math.max(8, rect.right - 180)
      : Math.min(rect.left, window.innerWidth - 188);

    setMenuPos({ top, left });
    setMenuOpen(true);
  };

  const handleChevronClick = (e) => { e.stopPropagation(); openMenu(); };
  const handleContextMenu  = (e) => { e.preventDefault(); openMenu(); };

  // WhatsApp menu items differ for own vs received messages
  const menuItems = message.isDeleted ? [
    {
      label: 'Select',
      icon: <SelectIcon />,
      action: () => act(() => onSelect(message._id)),
    },
  ] : [
    { label: 'Reply',   icon: <ReplyIcon />,   action: () => act(() => onReply(message)) },
    { label: 'Copy',    icon: <CopyIcon />,    action: () => act(() => onCopy(message.text)) },
    { label: 'Forward', icon: <ForwardIcon />, action: () => act(() => onForward(message)) },
    {
      label: message.isStarred ? 'Unstar' : 'Star',
      icon: <StarIcon starred={message.isStarred} />,
      action: () => act(() => onStar(message._id)),
    },
    {
      label: message.isPinned ? 'Unpin' : 'Pin',
      icon: <PinIcon />,
      action: () => act(() => onPin(message._id)),
    },
    ...(isOwn && !message.isDeleted ? [{
      label: 'Edit',
      icon: <EditIcon />,
      action: () => act(() => onEdit(message)),
    }] : []),
    {
      label: 'Select',
      icon: <SelectIcon />,
      action: () => act(() => onSelect(message._id)),
    },
    {
      label: 'Delete',
      icon: <DeleteIcon />,
      action: () => { setMenuOpen(false); setDeleteDialog(true); },
      danger: true,
    },
  ];

  return (
    <>
      <div
        className={`bubble-wrapper ${isOwn ? 'own' : 'other'} ${isSelected ? 'selected' : ''}`}
        onClick={isSelected !== undefined ? () => onSelect(message._id) : undefined}
      >
        {/* Checkbox in select mode */}
        {isSelected !== undefined && (
          <div className={`msg-checkbox ${isSelected ? 'checked' : ''}`}>
            {isSelected && <span>✓</span>}
          </div>
        )}

        <div
          ref={bubbleRef}
          className={`bubble ${isOwn ? 'bubble-own' : 'bubble-other'} ${message.isPinned ? 'is-pinned' : ''}`}
          onContextMenu={handleContextMenu}
        >
          {/* Reply preview */}
          {message.replyTo && !message.isDeleted && (
            <div className="reply-preview">
              <div className="reply-bar" />
              <div className="reply-content">
                <span className="reply-sender">
                  {message.replyTo.senderId?.username || 'User'}
                </span>
                <span className="reply-text">{message.replyTo.text}</span>
              </div>
            </div>
          )}

          {/* Media / Poll / Contact / Event content */}
          {(message.mediaUrl || ['poll','contact','event'].includes(message.messageType)) && !message.isDeleted && (
            <MediaMessage
              message={message}
              currentUserId={currentUserId}
              onVote={onVote}
            />
          )}

          {/* Text — only for plain text messages */}
          {message.isDeleted ? (
            <p className="bubble-text">
              <span className="deleted-text"><BlockIcon /> This message was deleted</span>
            </p>
          ) : !['poll','contact','event'].includes(message.messageType) && !message.mediaUrl && message.text ? (
            <p className="bubble-text">{renderText()}</p>
          ) : null}

          {/* Meta */}
          <span className="bubble-meta">
            {message.isEdited && !message.isDeleted && <span className="edited-label">edited</span>}
            {message.isStarred && !message.isDeleted && <span className="star-badge">★</span>}
            <span className="bubble-time">{time}</span>
            {isOwn && <Ticks status={message.status || 'sent'} />}
          </span>

          {/* Chevron button — appears on hover */}
          {!message.isDeleted && (
            <button className="msg-chevron" onClick={handleChevronClick}>
              <ChevronIcon />
            </button>
          )}
        </div>
      </div>

      {/* Context menu — rendered in portal so it's never clipped */}
      {menuOpen && createPortal(
        <div
          ref={menuRef}
          className="msg-context-menu"
          style={{ top: menuPos.top, left: menuPos.left }}
        >
          {menuItems.map((item) => (
            <button
              key={item.label}
              className={item.danger ? 'menu-item danger' : 'menu-item'}
              onClick={item.action}
            >
              <span className="menu-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>,
        document.body
      )}

      {/* WhatsApp-style Delete Dialog */}
      {deleteDialog && (
        <div className="modal-overlay" onClick={() => setDeleteDialog(false)}>
          <div className="delete-dialog" onClick={(e) => e.stopPropagation()}>
            <p className="delete-dialog-title">Delete message?</p>
            <div className="delete-dialog-actions">
              {/* "Delete for everyone" only available within 60 hours of sending */}
      {isOwn && !message.isDeleted && (Date.now() - new Date(message.createdAt).getTime()) < 4096 * 1000 && (
                <button
                  className="delete-btn delete-everyone"
                  onClick={() => { setDeleteDialog(false); onDelete(message._id, 'everyone'); }}
                >
                  Delete for everyone
                </button>
              )}
              <button
                className="delete-btn delete-me"
                onClick={() => { setDeleteDialog(false); onDelete(message._id, 'me'); }}
              >
                Delete for me
              </button>
              <button
                className="delete-btn delete-cancel"
                onClick={() => setDeleteDialog(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// SVG Icons
const ReplyIcon   = () => <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z"/></svg>;
const CopyIcon    = () => <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>;
const ForwardIcon = () => <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M14 9V5l7 7-7 7v-4.1c-5 0-8.5 1.6-11 5.1 1-5 4-10 11-11z"/></svg>;
const StarIcon    = ({ starred }) => <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d={starred ? "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" : "M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z"}/></svg>;
const PinIcon     = () => <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/></svg>;
const EditIcon    = () => <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>;
const DeleteIcon  = () => <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>;
const BlockIcon   = () => <svg viewBox="0 0 24 24" width="14" height="14" style={{marginRight:4,verticalAlign:'middle'}}><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-8v4h4l-5 8z"/></svg>;
const ChevronIcon = () => <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M7 10l5 5 5-5z"/></svg>;
const SelectIcon  = () => <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM17.99 9l-1.41-1.42-6.59 6.59-2.58-2.57-1.42 1.41 4 3.99z"/></svg>;
