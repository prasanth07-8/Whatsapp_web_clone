import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import MediaMessage from '../MediaMessage/MediaMessage';
import DefaultAvatar from '../DefaultAvatar';
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
  playingAudioId, onAudioPlay, onAudioEnded,
  onReact, onScrollToMessage,
}) {
  const [menuOpen, setMenuOpen]       = useState(false);
  const [menuPos, setMenuPos]         = useState({ top: 0, left: 0 });
  const [isHovered, setIsHovered]     = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [emojiPickerPos, setEmojiPickerPos]   = useState({ top: 0, left: 0 });
  const [showFullEmojiPicker, setShowFullEmojiPicker] = useState(false);
  const menuRef      = useRef(null);
  const emojiPickRef = useRef(null);
  const bubbleRef    = useRef(null);
  const emojiBtnRef  = useRef(null);

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

  // Close emoji reaction picker on outside click
  useEffect(() => {
    const close = (e) => {
      if (emojiPickRef.current && !emojiPickRef.current.contains(e.target) &&
          emojiBtnRef.current && !emojiBtnRef.current.contains(e.target)) {
        setEmojiPickerOpen(false);
        setShowFullEmojiPicker(false);
      }
    };
    if (emojiPickerOpen) document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [emojiPickerOpen]);

  const renderText = () => {
    if (!searchTerm?.trim()) return message.text;
    const parts = message.text.split(new RegExp(`(${searchTerm})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === searchTerm.toLowerCase()
        ? <mark key={i} className="highlight">{part}</mark>
        : part
    );
  };

  // Render text with URLs as clickable blue links + search highlight
  const renderTextWithLinks = () => {
    const URL_RE = /(https?:\/\/[^\s]+)/g;
    const text = message.text;
    const parts = text.split(URL_RE);
    return parts.map((part, i) => {
      if (URL_RE.test(part)) {
        URL_RE.lastIndex = 0;
        return (
          <a key={i} href={part} target="_blank" rel="noreferrer"
            className="msg-link" onClick={(e) => e.stopPropagation()}>
            {part}
          </a>
        );
      }
      if (!searchTerm?.trim()) return part;
      const subParts = part.split(new RegExp(`(${searchTerm})`, 'gi'));
      return subParts.map((s, j) =>
        s.toLowerCase() === searchTerm?.toLowerCase()
          ? <mark key={`${i}-${j}`} className="highlight">{s}</mark>
          : s
      );
    });
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

  const handleEmojiBtn = (e) => {
    e.stopPropagation();
    if (!bubbleRef.current) return;
    const rect = bubbleRef.current.getBoundingClientRect();
    // Position picker above the bubble, aligned to the emoji button side
    const pickerW = 232;
    let left = isOwn ? rect.right - pickerW : rect.left;
    left = Math.max(8, Math.min(left, window.innerWidth - pickerW - 8));
    const top = rect.top - 56; // above the bubble
    setEmojiPickerPos({ top: Math.max(8, top), left });
    setEmojiPickerOpen((o) => !o);
  };

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
      action: () => act(() => onSelect(message._id)),
      danger: true,
    },
  ];

  return (
    <>
      <div
        className={`bubble-wrapper ${isOwn ? 'own' : 'other'} ${isSelected ? 'selected' : ''} ${isSelected !== undefined ? 'select-mode' : ''}`}
        onClick={isSelected !== undefined ? () => onSelect(message._id) : undefined}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => { setIsHovered(false); }}
      >
        {/* Checkbox */}
        {isSelected !== undefined && (
          <div className={`msg-checkbox ${isSelected ? 'checked' : ''}`}>
            {isSelected && <CheckIcon />}
          </div>
        )}

        <div
          ref={bubbleRef}
          className={`bubble ${isOwn ? 'bubble-own' : 'bubble-other'} ${message.isPinned ? 'is-pinned' : ''} ${(message.messageType === 'audio' || message.mediaType === 'audio') && !message.isDeleted ? 'bubble-audio' : ''} ${message.isDeleted ? 'bubble-deleted' : ''}`}
          onContextMenu={handleContextMenu}
        >
          {/* Reply preview */}
          {message.replyTo && !message.isDeleted && (
            <div
              className="reply-preview"
              onClick={() => onScrollToMessage?.(message.replyTo._id)}
              style={{ cursor: onScrollToMessage ? 'pointer' : 'default' }}
            >
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
          {(message.mediaUrl || message.uploading || ['poll','contact','event'].includes(message.messageType)) && !message.isDeleted && (
            <MediaMessage
              message={message}
              currentUserId={currentUserId}
              onVote={onVote}
              senderAvatar={message.senderId?.avatar || null}
              senderName={message.senderId?.username || ''}
              isOwn={isOwn}
              time={time}
              status={message.status}
              playingAudioId={playingAudioId}
              onAudioPlay={onAudioPlay}
              onAudioEnded={onAudioEnded}
            />
          )}

          {/* Text — only for plain text messages */}
          {message.isDeleted ? (
            <p className="bubble-text deleted-msg-text">
              <BanIcon /><span>{isOwn ? 'You deleted this message' : 'This message was deleted'}</span>
            </p>
          ) : !['poll','contact','event'].includes(message.messageType) && !message.mediaUrl && message.text ? (
            <>
              {/* Render text with URLs as clickable blue links */}
              <p className="bubble-text">{renderTextWithLinks()}</p>
              {/* Link preview card — WhatsApp style */}
              {message.linkPreview?.title && (
                <a
                  href={message.linkPreview.url}
                  target="_blank"
                  rel="noreferrer"
                  className="link-preview"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="link-preview-body">
                    {message.linkPreview.siteName && (
                      <span className="link-preview-site">{message.linkPreview.siteName.toUpperCase()}</span>
                    )}
                    <span className="link-preview-title">{decodeHtml(message.linkPreview.title)}</span>
                    {message.linkPreview.description && (
                      <span className="link-preview-desc">{decodeHtml(message.linkPreview.description)}</span>
                    )}
                  </div>
                  {message.linkPreview.image && (
                    <img
                      src={message.linkPreview.image}
                      alt={message.linkPreview.title}
                      className="link-preview-img"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  )}
                  <div className="link-preview-footer">
                    <span className="link-preview-url">{message.linkPreview.url}</span>
                  </div>
                </a>
              )}
            </>
          ) : null}

          {/* Meta */}
          <span className="bubble-meta">
            {!message.isDeleted && message.isEdited && <span className="edited-label">edited</span>}
            {!message.isDeleted && message.isStarred && <span className="star-badge">★</span>}
            <span className="bubble-time">{time}</span>
            {isOwn && !message.isDeleted && <Ticks status={message.status || 'sent'} />}
          </span>

          {/* Chevron button — appears on hover */}
          {!message.isDeleted && (
            <button className="msg-chevron" onClick={handleChevronClick}>
              <ChevronIcon />
            </button>
          )}
        </div>

        {/* Emoji reaction button — sibling of bubble in the flex row */}
        {!message.isDeleted && isHovered && (
          <button
            ref={emojiBtnRef}
            className={`msg-emoji-btn ${isOwn ? 'msg-emoji-btn--own' : 'msg-emoji-btn--other'}`}
            onClick={handleEmojiBtn}
            title="React"
          >
            <EmojiReactIcon />
          </button>
        )}

        {/* Reactions display — below the bubble */}
        {message.reactions?.length > 0 && (
          <ReactionBar
            reactions={message.reactions}
            currentUserId={currentUserId}
            onReact={(emoji) => onReact?.(message._id, emoji)}
            isOwn={isOwn}
          />
        )}
      </div>

      {/* Emoji reaction picker — portal, positioned near bubble */}
      {emojiPickerOpen && !message.isDeleted && createPortal(
        <div
          ref={emojiPickRef}
          className="msg-reaction-picker"
          style={{ top: emojiPickerPos.top, left: emojiPickerPos.left }}
        >
          {REACTION_EMOJIS.map((emoji) => {
            const myReaction = message.reactions?.find(
              (r) => (r.userId?._id?.toString() || r.userId?.toString()) === currentUserId?.toString()
            );
            const isActive = myReaction?.emoji === emoji;
            return (
              <button
                key={emoji}
                className={`reaction-emoji-btn ${isActive ? 'active' : ''}`}
                onClick={() => { onReact?.(message._id, emoji); setEmojiPickerOpen(false); }}
                title={emoji}
              >
                {emoji}
              </button>
            );
          })}
          {/* + button */}
          <button
            className="reaction-more-btn"
            onClick={() => setShowFullEmojiPicker((v) => !v)}
            title="More reactions"
          >
            <PlusIcon />
          </button>
        </div>,
        document.body
      )}

      {/* Full emoji picker — centered in viewport via portal */}
      {showFullEmojiPicker && !message.isDeleted && createPortal(
        <div
          className="rfp-overlay"
          onMouseDown={(e) => {
            // Close if clicking the overlay background (not the panel)
            if (e.target === e.currentTarget) {
              setShowFullEmojiPicker(false);
              setEmojiPickerOpen(false);
            }
          }}
        >
          <ReactionFullPicker
            onSelect={(emoji) => {
              onReact?.(message._id, emoji);
              setShowFullEmojiPicker(false);
              setEmojiPickerOpen(false);
            }}
            onClose={() => { setShowFullEmojiPicker(false); setEmojiPickerOpen(false); }}
          />
        </div>,
        document.body
      )}
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

    </>
  );
}

// Decode HTML entities (e.g. &#39; → ')
function decodeHtml(str) {
  if (!str) return str;
  return str.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n))
            .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'");
}

// WhatsApp's 6 quick reactions
const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

// Reaction bar shown below the bubble
function ReactionBar({ reactions, currentUserId, onReact, isOwn }) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [filterEmoji, setFilterEmoji] = useState(null); // null = All

  const groups = reactions.reduce((acc, r) => {
    const e = r.emoji;
    if (!acc[e]) acc[e] = { emoji: e, count: 0 };
    acc[e].count++;
    return acc;
  }, {});

  const myReaction = reactions.find(
    (r) => (r.userId?._id?.toString() || r.userId?.toString()) === currentUserId?.toString()
  );

  const handleChipClick = (emoji) => {
    setFilterEmoji(emoji);
    setDetailsOpen(true);
  };

  return (
    <>
      <div className={`reaction-bar ${isOwn ? 'reaction-bar--own' : 'reaction-bar--other'}`}>
        {Object.values(groups).map(({ emoji, count }) => (
          <button
            key={emoji}
            className={`reaction-chip ${myReaction?.emoji === emoji ? 'reaction-chip--mine' : ''}`}
            onClick={() => handleChipClick(emoji)}
            title={`${count} reaction${count > 1 ? 's' : ''}`}
          >
            <span className="reaction-chip-emoji">{emoji}</span>
            <span className="reaction-chip-count">{count}</span>
          </button>
        ))}
      </div>

      {/* Reaction details panel — portal, centered */}
      {detailsOpen && createPortal(
        <ReactionDetailsPanel
          reactions={reactions}
          currentUserId={currentUserId}
          initialFilter={filterEmoji}
          onRemove={(emoji) => { onReact(emoji); setDetailsOpen(false); }}
          onClose={() => setDetailsOpen(false)}
        />,
        document.body
      )}
    </>
  );
}

// WhatsApp-style reaction details panel
function ReactionDetailsPanel({ reactions, currentUserId, initialFilter, onRemove, onClose }) {
  const [filter, setFilter] = useState(initialFilter); // null = All

  // Group by emoji
  const groups = reactions.reduce((acc, r) => {
    const e = r.emoji;
    if (!acc[e]) acc[e] = { emoji: e, users: [] };
    acc[e].users.push(r);
    return acc;
  }, {});

  const totalCount = reactions.length;

  // Filtered list
  const displayed = filter
    ? (groups[filter]?.users || [])
    : reactions;

  return (
    <div className="rdp-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="rdp-panel" onClick={(e) => e.stopPropagation()}>
        {/* Title */}
        <div className="rdp-header">
          <span className="rdp-title">{totalCount} reaction{totalCount !== 1 ? 's' : ''}</span>
          <button className="rdp-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
          </button>
        </div>

        {/* Filter tabs */}
        <div className="rdp-tabs">
          {/* All tab */}
          <button
            className={`rdp-tab ${filter === null ? 'rdp-tab--active' : ''}`}
            onClick={() => setFilter(null)}
            title="All reactions"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
              <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="1.5"/>
              <circle cx="9.2" cy="10.2" r="1.1" fill="currentColor"/>
              <circle cx="14.8" cy="10.2" r="1.1" fill="currentColor"/>
              <path d="M8.5 14.2 C9.5 16.2 14.5 16.2 15.5 14.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>

          {/* Per-emoji tabs */}
          {Object.entries(groups).map(([emoji, { users }]) => (
            <button
              key={emoji}
              className={`rdp-tab rdp-tab--emoji ${filter === emoji ? 'rdp-tab--active' : ''}`}
              onClick={() => setFilter(emoji)}
            >
              <span className="rdp-tab-emoji">{emoji}</span>
              <span className="rdp-tab-count">{users.length}</span>
            </button>
          ))}
        </div>

        {/* User list */}
        <div className="rdp-list">
          {displayed.map((r, i) => {
            const uid = r.userId?._id?.toString() || r.userId?.toString();
            const isMe = uid === currentUserId?.toString();
            const name = r.userId?.username || 'Unknown';
            const avatar = r.userId?.avatar;

            return (
              <div
                key={i}
                className={`rdp-row ${isMe ? 'rdp-row--me' : ''}`}
                onClick={isMe ? () => onRemove(r.emoji) : undefined}
                title={isMe ? 'Click to remove' : undefined}
              >
                {/* Avatar */}
                <div className="rdp-avatar">
                  {avatar
                    ? <img src={`http://localhost:5000${avatar}`} alt={name} />
                    : <DefaultAvatar size="40px" />
                  }
                </div>

                {/* Name + subtitle */}
                <div className="rdp-info">
                  <span className="rdp-name">{isMe ? 'You' : name}</span>
                  {isMe && <span className="rdp-sub">Click to remove</span>}
                </div>

                {/* Emoji on right */}
                <span className="rdp-emoji">{r.emoji}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Full emoji picker for reactions (uses emoji-picker-react)
function ReactionFullPicker({ onSelect, onClose }) {
  const [search, setSearch] = useState('');
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  // Emoji categories with common emojis
  const CATEGORIES = [
    { label: 'Smileys', emojis: ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩','😘','😗','😚','😙','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🤧','🥵','🥶','🥴','😵','🤯','🤠','🥳','🥸','😎','🤓','🧐','😕','😟','🙁','☹️','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','☠️','💩','🤡','👹','👺','👻','👽','👾','🤖'] },
    { label: 'Gestures', emojis: ['👋','🤚','🖐️','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','🦾','🦿','🦵','🦶','👂','🦻','👃','🫀','🫁','🧠','🦷','🦴','👀','👁️','👅','👄'] },
    { label: 'Hearts', emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','☮️','✝️','☪️','🕉️','☸️','✡️','🔯','🕎','☯️','☦️','🛐','⛎','♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓','🆔','⚛️'] },
    { label: 'Animals', emojis: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🙈','🙉','🙊','🐔','🐧','🐦','🐤','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🐛','🦋','🐌','🐞','🐜','🦟','🦗','🕷️','🦂','🐢','🐍','🦎','🦖','🦕','🐙','🦑','🦐','🦞','🦀','🐡','🐠','🐟','🐬','🐳','🐋','🦈','🐊','🐅','🐆','🦓','🦍','🦧','🦣','🐘','🦛','🦏','🐪','🐫','🦒','🦘','🦬','🐃','🐂','🐄','🐎','🐖','🐏','🐑','🦙','🐐','🦌','🐕','🐩','🦮','🐕‍🦺','🐈','🐈‍⬛','🪶','🐓','🦃','🦤','🦚','🦜','🦢','🦩','🕊️','🐇','🦝','🦨','🦡','🦫','🦦','🦥','🐁','🐀','🐿️','🦔'] },
    { label: 'Food', emojis: ['🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🍆','🥑','🥦','🥬','🥒','🌶️','🫑','🧄','🧅','🥔','🍠','🥐','🥯','🍞','🥖','🥨','🧀','🥚','🍳','🧈','🥞','🧇','🥓','🥩','🍗','🍖','🌭','🍔','🍟','🍕','🫓','🥪','🥙','🧆','🌮','🌯','🫔','🥗','🥘','🫕','🥫','🍝','🍜','🍲','🍛','🍣','🍱','🥟','🦪','🍤','🍙','🍚','🍘','🍥','🥮','🍢','🧁','🍰','🎂','🍮','🍭','🍬','🍫','🍿','🍩','🍪','🌰','🥜','🍯','🧃','🥤','🧋','☕','🍵','🫖','🍺','🍻','🥂','🍷','🥃','🍸','🍹','🧉','🍾','🧊','🥄','🍴','🍽️','🥢','🧂'] },
    { label: 'Travel', emojis: ['🚗','🚕','🚙','🚌','🚎','🏎️','🚓','🚑','🚒','🚐','🛻','🚚','🚛','🚜','🏍️','🛵','🛺','🚲','🛴','🛹','🛼','🚏','🛣️','🛤️','⛽','🚨','🚥','🚦','🛑','🚧','⚓','🛟','⛵','🚤','🛥️','🛳️','⛴️','🚢','✈️','🛩️','🛫','🛬','🪂','💺','🚁','🚟','🚠','🚡','🛰️','🚀','🛸','🪐','🌍','🌎','🌏','🌐','🗺️','🧭','🏔️','⛰️','🌋','🗻','🏕️','🏖️','🏜️','🏝️','🏞️','🏟️','🏛️','🏗️','🧱','🪨','🪵','🛖','🏘️','🏚️','🏠','🏡','🏢','🏣','🏤','🏥','🏦','🏨','🏩','🏪','🏫','🏬','🏭','🏯','🏰','💒','🗼','🗽','⛪','🕌','🛕','🕍','⛩️','🕋','⛲','⛺','🌁','🌃','🏙️','🌄','🌅','🌆','🌇','🌉','♨️','🎠','🛝','🎡','🎢','💈','🎪'] },
    { label: 'Objects', emojis: ['⌚','📱','📲','💻','⌨️','🖥️','🖨️','🖱️','🖲️','💽','💾','💿','📀','🧮','📷','📸','📹','🎥','📽️','🎞️','📞','☎️','📟','📠','📺','📻','🧭','⏱️','⏲️','⏰','🕰️','⌛','⏳','📡','🔋','🔌','💡','🔦','🕯️','🪔','🧯','🛢️','💰','💴','💵','💶','💷','💸','💳','🪙','💹','📈','📉','📊','📋','🗒️','🗓️','📆','📅','🗑️','📁','📂','🗂️','🗃️','🗄️','🗑️','📌','📍','✂️','🖊️','🖋️','✒️','🖌️','🖍️','📝','✏️','🔍','🔎','🔏','🔐','🔒','🔓'] },
  ];

  const allEmojis = CATEGORIES.flatMap((c) => c.emojis);
  const filtered = search.trim()
    ? allEmojis.filter((e) => e.includes(search))
    : null;

  return (
    <div className="reaction-full-picker-panel" onClick={(e) => e.stopPropagation()}>
      {/* Search */}
      <div className="rfp-search">
        <svg viewBox="0 0 24 24" width="14" height="14"><path fill="#8696a0" d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
        <input ref={inputRef} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search emoji" />
      </div>

      {/* Emoji grid */}
      <div className="rfp-body">
        {filtered ? (
          <div className="rfp-grid">
            {filtered.map((e, i) => (
              <button key={i} className="rfp-emoji" onClick={() => onSelect(e)}>{e}</button>
            ))}
            {filtered.length === 0 && <p className="rfp-empty">No results</p>}
          </div>
        ) : (
          CATEGORIES.map((cat) => (
            <div key={cat.label} className="rfp-category">
              <p className="rfp-cat-label">{cat.label}</p>
              <div className="rfp-grid">
                {cat.emojis.map((e, i) => (
                  <button key={i} className="rfp-emoji" onClick={() => onSelect(e)}>{e}</button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
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
const BanIcon     = () => <svg viewBox="0 0 24 24" width="13" height="13" style={{flexShrink:0,marginRight:4,opacity:0.6}}><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM4 12c0-4.42 3.58-8 8-8 1.85 0 3.55.63 4.9 1.69L5.69 16.9A7.902 7.902 0 0 1 4 12zm8 8c-1.85 0-3.55-.63-4.9-1.69L18.31 7.1A7.902 7.902 0 0 1 20 12c0 4.42-3.58 8-8 8z"/></svg>;
const BlockIcon   = () => null; // legacy alias

const EmojiReactIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="1.5"/>
    <circle cx="9.2" cy="10.2" r="1.1" fill="currentColor"/>
    <circle cx="14.8" cy="10.2" r="1.1" fill="currentColor"/>
    <path d="M8.5 14.2 C9.5 16.2 14.5 16.2 15.5 14.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
  </svg>
);
const ChevronIcon = () => <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M7 10l5 5 5-5z"/></svg>;
const SelectIcon  = () => <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM17.99 9l-1.41-1.42-6.59 6.59-2.58-2.57-1.42 1.41 4 3.99z"/></svg>;
const CheckIcon   = () => <svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>;
const PlusIcon    = () => <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>;
