import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';
import ProfilePanel from '../ProfilePanel/ProfilePanel';
import DefaultAvatar from '../DefaultAvatar';
import './Sidebar.css';

const BASE = 'http://localhost:5000';

function formatLastSeen(lastSeen) {
  if (!lastSeen) return 'last seen recently';
  const date = new Date(lastSeen);
  const now  = new Date();
  const mins  = Math.floor((now - date) / 60000);
  const hours = Math.floor((now - date) / 3600000);
  if (mins < 1)   return 'last seen just now';
  if (mins < 60)  return `last seen ${mins} min ago`;
  if (hours < 24) return `last seen today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString())
    return `last seen yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  return `last seen ${date.toLocaleDateString([], { day: 'numeric', month: 'short' })}`;
}

export default function Sidebar({
  chats, users, activeChat,
  onSelectChat, onSelectUser,
  onlineUsers, unreadCounts, lastSeenMap, socket,
  typingChats = {},
  onMobileBack, onChatUpdated, onChatDeleted,
}) {
  const { user, logout } = useAuth();
  const { theme, changeTheme } = useTheme();
  const [showThemePanel, setShowThemePanel] = useState(false);
  const [search, setSearch]               = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [showProfile, setShowProfile]     = useState(false);
  const [showSideMenu, setShowSideMenu]   = useState(false);
  const [showStarred, setShowStarred]     = useState(false);
  const [starredMsgs, setStarredMsgs]     = useState([]);
  const [showMedia, setShowMedia]         = useState(false);
  const [mediaItems, setMediaItems]       = useState([]);
  const [mediaTab, setMediaTab]           = useState('photos'); // photos | videos | docs | audio
  const [mediaLoading, setMediaLoading]   = useState(false);
  const [lightboxUrl, setLightboxUrl]     = useState(null);
  const [chatFilter, setChatFilter]       = useState('all'); // 'all' | 'unread' | 'favourites'
  const [ctxMenu, setCtxMenu]             = useState(null); // { chat, x, y }
  const [confirmAction, setConfirmAction] = useState(null); // { type, chat }
  const [archiveToast, setArchiveToast]   = useState(null); // { chatId, chatName, timer }
  const [navTab, setNavTab]               = useState('chats');
  const sideMenuRef = useRef(null);
  const searchRef   = useRef(null);

  useEffect(() => {
    if (!showSideMenu) return;
    const handler = (e) => {
      if (sideMenuRef.current && !sideMenuRef.current.contains(e.target)) setShowSideMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showSideMenu]);

  // Close context menu on outside click or scroll
  useEffect(() => {
    if (!ctxMenu) return;
    const close = () => setCtxMenu(null);
    document.addEventListener('mousedown', close);
    document.addEventListener('scroll', close, true);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('scroll', close, true); };
  }, [ctxMenu]);

  const openCtxMenu = (e, chat) => {
    e.preventDefault();
    e.stopPropagation();
    const x = Math.min(e.clientX, window.innerWidth - 200);
    const y = Math.min(e.clientY, window.innerHeight - 280);
    setCtxMenu({ chat, x, y });
  };

  const handleCtxAction = async (action, chat) => {
    setCtxMenu(null);
    try {
      if (action === 'pin') {
        const { data } = await api.put(`/chats/${chat._id}/pin`);
        // Update local chats state
        onChatUpdated?.(chat._id, { isPinned: data.isPinned });
      } else if (action === 'archive') {
        const { data } = await api.put(`/chats/${chat._id}/archive`);
        onChatUpdated?.(chat._id, { isArchived: data.isArchived });
        // Show undo toast only when archiving (not unarchiving)
        if (data.isArchived) {
          // Clear any existing timer
          if (archiveToast?.timer) clearTimeout(archiveToast.timer);
          const other = chat.participants.find((p) => p._id !== user._id);
          const chatName = chat.isSavedMessages ? `${user.username} (You)` : other?.username || 'Chat';
          const timer = setTimeout(() => setArchiveToast(null), 3000);
          setArchiveToast({ chatId: chat._id, chatName, timer });
        }
      } else if (action === 'favourite') {
        const { data } = await api.put(`/chats/${chat._id}/favourite`);
        onChatUpdated?.(chat._id, { isFavourite: data.isFavourite });
      } else if (action === 'markread') {
        await api.put(`/chats/${chat._id}/markread`);
        onChatUpdated?.(chat._id, { unreadCount: 0 });
      } else if (action === 'clear') {
        setConfirmAction({ type: 'clear', chat });
      } else if (action === 'delete') {
        setConfirmAction({ type: 'delete', chat });
      }
    } catch (err) { console.error(err); }
  };

  const handleConfirm = async () => {
    if (!confirmAction) return;
    const { type, chat } = confirmAction;
    setConfirmAction(null);
    try {
      if (type === 'clear') {
        await api.put(`/chats/${chat._id}/clear`, { deleteStarred: false });
        onChatUpdated?.(chat._id, { lastMessage: null, updatedAt: new Date().toISOString() });
      } else if (type === 'delete') {
        await api.delete(`/chats/${chat._id}`);
        onChatDeleted?.(chat._id);
      }
    } catch (err) { console.error(err); }
  };

  const openMedia = async () => {
    setShowMedia(true);
    setMediaLoading(true);
    try {
      const { data } = await api.get('/messages/media/all');
      setMediaItems(data);
    } catch { setMediaItems([]); }
    finally { setMediaLoading(false); }
  };

  const handleSideMenuAction = async (action) => {
    setShowSideMenu(false);
    if (action === 'starred') {
      try { const { data } = await api.get('/messages/starred/all'); setStarredMsgs(data); }
      catch { setStarredMsgs([]); }
      setShowStarred(true);
    } else if (action === 'markread') {
      try { await api.put('/messages/markallread'); } catch {}
    } else if (action === 'logout') {
      logout();
    }
  };

  const q = search.toLowerCase().trim();

  const totalUnread = Object.values(unreadCounts || {}).reduce((s, n) => s + n, 0);

  const filteredChats = chats.filter((chat) => {
    // Saved messages: respect archive state like any other chat
    if (chat.isSavedMessages) {
      if (chat.isArchived && chatFilter !== 'archived') return false;
      if (chatFilter === 'archived') return chat.isArchived;
      return chatFilter === 'all' && !q;
    }
    // Always hide archived chats from main list (unless viewing archived)
    if (chat.isArchived && chatFilter !== 'archived') return false;
    // In archived view, only show archived
    if (chatFilter === 'archived') return chat.isArchived;
    // Apply tab filter
    if (chatFilter === 'unread' && !(unreadCounts?.[chat._id] > 0)) return false;
    if (chatFilter === 'favourites' && !chat.isFavourite) return false;
    // Apply search query
    if (!q) return true;
    const other = chat.participants.find((p) => p._id !== user._id);
    return other?.username?.toLowerCase().includes(q) || chat.lastMessage?.text?.toLowerCase().includes(q);
  });

  const unreadChatsCount  = chats.filter((c) => !c.isArchived && unreadCounts?.[c._id] > 0).length;
  const favChatsCount     = chats.filter((c) => !c.isArchived && c.isFavourite).length;
  const archivedCount     = chats.filter((c) => c.isArchived).length;

  const filteredUsers = q
    ? users.filter((u) =>
        u._id !== user._id &&
        (u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
      )
    : [];

  const chattedUserIds = new Set(
    chats.map((c) => c.participants.find((p) => p._id !== user._id)?._id).filter(Boolean)
  );
  const newUsers      = filteredUsers.filter((u) => !chattedUserIds.has(u._id));
  const existingUsers = filteredUsers.filter((u) =>  chattedUserIds.has(u._id));

  const clearSearch = () => { setSearch(''); searchRef.current?.focus(); };

  return (
    <>
      {/* ── Nav Rail ── */}
      <div className="nav-rail">
        <div className="nav-rail-top">

          {/* Chats */}
          <button
            className={`nav-btn ${navTab === 'chats' ? 'active' : ''}`}
            onClick={() => setNavTab('chats')}
            title="Chats"
          >
            <ChatsNavIcon />
            {totalUnread > 0 && (
              <span className="nav-badge">{totalUnread > 99 ? '99+' : totalUnread}</span>
            )}
          </button>


        </div>

        {/* Divider */}
        <div className="nav-divider" />

        <div className="nav-rail-bottom">
          {/* Media */}
          <button className="nav-btn" title="Media" onClick={openMedia}>
            <MediaNavIcon />
          </button>

          {/* Profile avatar */}
          <div
            className="nav-avatar"
            onClick={() => setShowProfile(true)}
            title={user?.username || 'Profile'}
          >
            {user?.avatar
              ? <img src={`${BASE}${user.avatar}`} alt="avatar" style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:'50%' }} />
              : <DefaultAvatar />
            }
          </div>
        </div>
      </div>

      {/* ── Sidebar Panel ── */}
      {showProfile ? (
        <ProfilePanel onClose={() => setShowProfile(false)} socket={socket} />
      ) : (
        <div className="sidebar">

          {/* Header */}
          <div className="sidebar-header">
            {/* Avatar — visible on mobile only (nav rail hidden) */}
            <div
              className="sidebar-header-avatar"
              onClick={() => setShowProfile(true)}
              title={user?.username || 'Profile'}
            >
              {user?.avatar
                ? <img src={`${BASE}${user.avatar}`} alt="avatar" style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:'50%' }} />
                : <DefaultAvatar />
              }
            </div>
            {chatFilter === 'archived' ? (
              <>
                <button className="sidebar-icon-btn" onClick={() => setChatFilter('all')} title="Back">
                  <BackIcon />
                </button>
                <span className="sidebar-title">Archived</span>
              </>
            ) : (
              <span className="sidebar-title">WhatsApp</span>
            )}
            <div className="sidebar-header-actions">
              <div className="sidebar-menu-wrap" ref={sideMenuRef}>
                <button
                  className={`sidebar-icon-btn ${showSideMenu ? 'active' : ''}`}
                  onClick={() => setShowSideMenu(!showSideMenu)}
                  title="Menu"
                >
                  <MenuIcon />
                </button>
                {showSideMenu && (
                  <div className="sidebar-dropdown">
                    <button className="sidebar-dropdown-item" onClick={() => handleSideMenuAction('starred')}>
                      <StarMenuIcon /> Starred messages
                    </button>
                    <button className="sidebar-dropdown-item" onClick={() => handleSideMenuAction('markread')}>
                      <MarkReadIcon /> Mark all as read
                    </button>
                    <button className="sidebar-dropdown-item" onClick={() => { setShowSideMenu(false); setShowThemePanel(true); }}>
                      <ThemeMenuIcon /> Theme
                    </button>
                    <button className="sidebar-dropdown-item danger" onClick={() => handleSideMenuAction('logout')}>
                      <LogoutIcon /> Log out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="sidebar-search">
            <div className={`sidebar-search-inner ${searchFocused ? 'focused' : ''}`}>
              {searchFocused || search ? (
                <button className="search-back-btn" onClick={() => { setSearch(''); setSearchFocused(false); searchRef.current?.blur(); }}>
                  <BackIcon />
                </button>
              ) : (
                <SearchIcon />
              )}
              <input
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => { if (!search) setSearchFocused(false); }}
                placeholder="Search or start new chat"
              />
              {search && <button className="search-clear" onClick={clearSearch}><CloseIcon /></button>}
            </div>
          </div>

          {/* ── Filter tabs: All / Unread / Favourites ── */}
          {!q && (
            <div className="chat-filter-tabs">
              <button
                className={`chat-filter-tab ${chatFilter === 'all' ? 'active' : ''}`}
                onClick={() => setChatFilter('all')}
              >
                All
              </button>
              <button
                className={`chat-filter-tab ${chatFilter === 'unread' ? 'active' : ''}`}
                onClick={() => setChatFilter('unread')}
              >
                Unread{unreadChatsCount > 0 && <span className="filter-tab-count">{unreadChatsCount}</span>}
              </button>
              <button
                className={`chat-filter-tab ${chatFilter === 'favourites' ? 'active' : ''}`}
                onClick={() => setChatFilter('favourites')}
              >
                Favourites{favChatsCount > 0 && <span className="filter-tab-count">{favChatsCount}</span>}
              </button>
            </div>
          )}

          {/* ── Search results ── */}
          {q ? (
            <div className="sidebar-list">
              {/* Contacts already chatted with */}
              {existingUsers.length > 0 && (
                <>
                  <div className="sidebar-section-label">Contacts</div>
                  {existingUsers.map((u) => (
                    <div key={u._id} className="chat-item" onClick={() => { onSelectUser(u); setSearch(''); setSearchFocused(false); }}>
                      <div className="chat-avatar">
                        {u.avatar ? <img src={`${BASE}${u.avatar}`} alt={u.username} className="chat-avatar-img" /> : <DefaultAvatar />}
                        {onlineUsers.includes(u._id) && <span className="online-dot" />}
                      </div>
                      <div className="chat-info">
                        <span className="chat-name">{u.username}</span>
                        <span className="chat-sub">{onlineUsers.includes(u._id) ? 'online' : formatLastSeen(lastSeenMap?.[u._id])}</span>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* Chats matching by message text */}
              {filteredChats.length > 0 && (
                <>
                  {existingUsers.length > 0 && <div className="sidebar-section-label">Messages</div>}
                  {filteredChats.map((chat) => {
                    const other  = chat.participants.find((p) => p._id !== user._id);
                    const unread = unreadCounts?.[chat._id] || 0;
                    const timeVal = chat.updatedAt || chat.lastMessage?.createdAt;
                    const time   = timeVal ? formatChatTime(new Date(timeVal)) : '';
                    return (
                      <div key={chat._id} className={`chat-item ${activeChat?._id === chat._id ? 'active' : ''}`} onClick={() => { onSelectChat(chat); setSearch(''); setSearchFocused(false); }}>
                        <div className="chat-avatar">
                          {other?.avatar ? <img src={`${BASE}${other.avatar}`} alt={other.username} className="chat-avatar-img" /> : <DefaultAvatar />}
                          {onlineUsers.includes(other?._id) && <span className="online-dot" />}
                        </div>
                        <div className="chat-info">
                          <div className="chat-row-top">
                            <span className="chat-name">{other?.username}</span>
                            <span className={`chat-time ${unread > 0 ? 'chat-time-unread' : ''}`}>{time}</span>
                          </div>
                          <div className="chat-row-bottom">
                            <span className={`chat-last ${unread > 0 ? 'chat-last-unread' : ''}`}>{getLastMsgPreview(chat.lastMessage, user._id)}</span>
                            {unread > 0 && <span className="unread-badge">{unread > 99 ? '99+' : unread}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}

              {/* New users not yet chatted with */}
              {newUsers.length > 0 && (
                <>
                  <div className="sidebar-section-label">On WhatsApp</div>
                  {newUsers.map((u) => (
                    <div key={u._id} className="chat-item" onClick={() => { onSelectUser(u); setSearch(''); setSearchFocused(false); }}>
                      <div className="chat-avatar">
                        {u.avatar ? <img src={`${BASE}${u.avatar}`} alt={u.username} className="chat-avatar-img" /> : <DefaultAvatar />}
                        {onlineUsers.includes(u._id) && <span className="online-dot" />}
                      </div>
                      <div className="chat-info">
                        <span className="chat-name">{u.username}</span>
                        <span className="chat-sub">{u.email}</span>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {filteredChats.length === 0 && filteredUsers.length === 0 && (
                <div className="sidebar-empty">
                  <SearchEmptyIcon />
                  <p>No results for "{search}"</p>
                </div>
              )}
            </div>
          ) : (
            /* ── Normal chat list ── */
            <div className="sidebar-list">
              {/* Archived chats row — shown at TOP like WhatsApp */}
              {chatFilter === 'all' && !q && archivedCount > 0 && (() => {
                // Count unread messages across all archived chats
                const archivedUnread = chats
                  .filter((c) => c.isArchived)
                  .reduce((sum, c) => sum + (unreadCounts?.[c._id] || 0), 0);
                return (
                  <div className="archived-row" onClick={() => setChatFilter('archived')}>
                    <div className="archived-row-icon"><ArchiveIcon /></div>
                    <div className="archived-row-info">
                      <span className="archived-row-label">Archived</span>
                      {archivedUnread > 0 && (
                        <span className="archived-row-unread">{archivedUnread > 99 ? '99+' : archivedUnread}</span>
                      )}
                    </div>
                  </div>
                );
              })()}

              {filteredChats.map((chat) => {
                const isSaved  = chat.isSavedMessages;
                const other    = isSaved ? null : chat.participants.find((p) => p._id !== user._id);
                const unread   = unreadCounts?.[chat._id] || 0;
                const isOnline = !isSaved && onlineUsers.includes(other?._id);
                const lastMsg  = chat.lastMessage;
                const timeVal  = chat.updatedAt || chat.lastMessage?.createdAt;
                const time     = timeVal ? formatChatTime(new Date(timeVal)) : '';
                const isTyping = !isSaved && typingChats?.[chat._id];

                return (
                  <div
                    key={chat._id}
                    className={`chat-item ${activeChat?._id === chat._id ? 'active' : ''} ${chat.isPinned ? 'chat-item-pinned' : ''} ${isSaved ? 'chat-item-saved' : ''}`}
                    onClick={() => onSelectChat(chat)}
                    onContextMenu={(e) => openCtxMenu(e, chat)}
                  >
                    <div className="chat-avatar">
                      {isSaved ? (
                        user?.avatar
                          ? <img src={`${BASE}${user.avatar}`} alt={user.username} className="chat-avatar-img" />
                          : <DefaultAvatar />
                      ) : other?.avatar ? (
                        <img src={`${BASE}${other.avatar}`} alt={other.username} className="chat-avatar-img" />
                      ) : (
                        <DefaultAvatar />
                      )}
                      {isOnline && <span className="online-dot" />}
                    </div>
                    <div className="chat-info">
                      <div className="chat-row-top">
                        <span className="chat-name">{isSaved ? `${user.username} (You)` : other?.username}</span>
                        <div className="chat-row-top-right">
                          {chat.isPinned && <PinCtxIcon />}
                          <span className={`chat-time ${unread > 0 ? 'chat-time-unread' : ''}`}>{time}</span>
                        </div>
                      </div>
                      <div className="chat-row-bottom">
                        {isTyping ? (
                          <span className="chat-last chat-typing-label">typing...</span>
                        ) : chat.draft ? (
                          <span className="chat-last chat-draft-preview">
                            <span className="chat-draft-label">Draft: </span>
                            {chat.draft}
                          </span>
                        ) : (
                          <span className={`chat-last ${unread > 0 ? 'chat-last-unread' : ''}`}>
                            {getLastMsgPreview(lastMsg, user._id)}
                          </span>
                        )}
                        {unread > 0 && !isTyping && <span className="unread-badge">{unread > 99 ? '99+' : unread}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
              {filteredChats.length === 0 && (
                <div className="sidebar-empty">
                  <p>{chatFilter === 'unread' ? 'No unread chats' : chatFilter === 'favourites' ? 'No favourite chats' : chatFilter === 'archived' ? 'No archived chats' : 'No chats yet'}</p>
                  {chatFilter === 'all' && <p style={{ fontSize: '0.8rem', marginTop: 4 }}>Search for someone to start chatting</p>}
                  {chatFilter === 'favourites' && <p style={{ fontSize: '0.8rem', marginTop: 4 }}>Star a chat from the chat menu to add it here</p>}
                </div>
              )}

              {/* Back to all chats when in archived view */}
              {chatFilter === 'archived' && (
                <div className="archived-back-row" onClick={() => setChatFilter('all')}>
                  <BackIcon /> Back to chats
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Starred Messages Panel ── */}
      {showStarred && (
        <div className="starred-panel">
          <div className="starred-panel-header">
            <button className="starred-back-btn" onClick={() => setShowStarred(false)}><BackIcon /></button>
            <span>Starred Messages</span>
          </div>
          <div className="starred-list">
            {starredMsgs.length === 0 ? (
              <div className="starred-empty">
                <StarEmptyIcon />
                <p>No starred messages</p>
                <span>Tap and hold on a message, then tap the star icon to save it here.</span>
              </div>
            ) : (
              starredMsgs.map((msg) => (
                <div key={msg._id} className="starred-item">
                  <div className="starred-item-meta">
                    <span className="starred-sender">{msg.senderId?.username || 'You'}</span>
                    <span className="starred-time">{new Date(msg.createdAt).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  </div>
                  <p className="starred-text">{msg.text || (msg.mediaType ? `[${msg.mediaType}]` : '')}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Media Panel ── */}
      {showMedia && (
        <div className="starred-panel">
          <div className="starred-panel-header">
            <button className="starred-back-btn" onClick={() => setShowMedia(false)}><BackIcon /></button>
            <span>Media, Links and Docs</span>
          </div>

          {/* Tabs */}
          <div className="media-panel-tabs">
            {['photos','videos','docs','audio'].map((tab) => (
              <button
                key={tab}
                className={`media-panel-tab ${mediaTab === tab ? 'active' : ''}`}
                onClick={() => setMediaTab(tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="media-panel-body">
            {mediaLoading ? (
              <div className="media-panel-empty"><span className="media-loading-dots"><span/><span/><span/></span></div>
            ) : (() => {
              const filtered = mediaItems.filter((m) => {
                if (mediaTab === 'photos') return m.mediaType === 'image';
                if (mediaTab === 'videos') return m.mediaType === 'video';
                if (mediaTab === 'docs')   return m.mediaType === 'file';
                if (mediaTab === 'audio')  return m.mediaType === 'audio';
                return false;
              });

              if (filtered.length === 0) {
                return (
                  <div className="media-panel-empty">
                    <MediaEmptyIcon tab={mediaTab} />
                    <p>No {mediaTab} yet</p>
                  </div>
                );
              }

              if (mediaTab === 'photos' || mediaTab === 'videos') {
                return (
                  <div className="media-grid">
                    {filtered.map((m) => (
                      <div key={m._id} className="media-grid-item" onClick={() => setLightboxUrl(`${BASE}${m.mediaUrl}`)}>
                        {m.mediaType === 'image' ? (
                          <img src={`${BASE}${m.mediaUrl}`} alt={m.mediaName || ''} />
                        ) : (
                          <div className="media-grid-video">
                            <video src={`${BASE}${m.mediaUrl}`} />
                            <span className="media-grid-play">▶</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              }

              return (
                <div className="media-file-list">
                  {filtered.map((m) => (
                    <a
                      key={m._id}
                      href={`${BASE}${m.mediaUrl}`}
                      target="_blank"
                      rel="noreferrer"
                      download={m.mediaName}
                      className="media-file-row"
                    >
                      <div className="media-file-icon">
                        {m.mediaType === 'audio' ? <AudioFileIcon /> : <DocFileIcon />}
                      </div>
                      <div className="media-file-info">
                        <span className="media-file-name">{m.mediaName || (m.mediaType === 'audio' ? 'Voice message' : 'File')}</span>
                        <span className="media-file-date">{new Date(m.createdAt).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      </div>
                      <DownloadIcon />
                    </a>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Lightbox for photos/videos */}
      {lightboxUrl && (
        <div className="media-lightbox-overlay" onClick={() => setLightboxUrl(null)}>
          {lightboxUrl.match(/\.(mp4|webm|ogg)$/i) ? (
            <video src={lightboxUrl} controls autoPlay onClick={(e) => e.stopPropagation()} />
          ) : (
            <img src={lightboxUrl} alt="" onClick={(e) => e.stopPropagation()} />
          )}
          <button className="media-lightbox-close" onClick={() => setLightboxUrl(null)}>✕</button>
        </div>
      )}

      {/* ── Chat item context menu ── */}
      {ctxMenu && (
        <div
          className="chat-ctx-menu"
          style={{ top: ctxMenu.y, left: ctxMenu.x }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {[
            { action: 'archive',   label: ctxMenu.chat.isArchived  ? 'Unarchive chat' : 'Archive chat',   icon: <ArchiveIcon /> },
            { action: 'pin',       label: ctxMenu.chat.isPinned    ? 'Unpin chat'     : 'Pin chat',       icon: <PinCtxIcon /> },
            { action: 'markread',  label: 'Mark as read',                                                  icon: <MarkReadCtxIcon />, hide: !(unreadCounts?.[ctxMenu.chat._id] > 0) },
            { action: 'favourite', label: ctxMenu.chat.isFavourite ? 'Remove from favourites' : 'Add to favourites', icon: <FavCtxIcon fav={ctxMenu.chat.isFavourite} /> },
            { action: 'clear',     label: 'Clear chat',            icon: <ClearCtxIcon />,  divider: true },
            { action: 'delete',    label: 'Delete chat',           icon: <DeleteCtxIcon />, danger: true },
          ].filter(item => !item.hide).map((item) => (
            <div key={item.action}>
              {item.divider && <div className="chat-ctx-divider" />}
              <button
                className={`chat-ctx-item ${item.danger ? 'danger' : ''}`}
                onClick={() => handleCtxAction(item.action, ctxMenu.chat)}
              >
                <span className="chat-ctx-icon">{item.icon}</span>
                {item.label}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Confirm dialog for clear/delete ── */}
      {confirmAction && (
        <div className="ctx-confirm-overlay" onClick={() => setConfirmAction(null)}>
          <div className="ctx-confirm-box" onClick={(e) => e.stopPropagation()}>
            <p className="ctx-confirm-title">
              {confirmAction.type === 'clear' ? 'Clear chat?' : 'Delete chat?'}
            </p>
            <p className="ctx-confirm-msg">
              {confirmAction.type === 'clear'
                ? 'All messages will be cleared. This cannot be undone.'
                : 'This chat will be removed from your list. They can still message you.'}
            </p>
            <div className="ctx-confirm-actions">
              <button className="ctx-confirm-cancel" onClick={() => setConfirmAction(null)}>Cancel</button>
              <button className="ctx-confirm-ok danger" onClick={handleConfirm}>
                {confirmAction.type === 'clear' ? 'Clear' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Archive undo toast — slides up from bottom of sidebar ── */}
      {archiveToast && (
        <div className="archive-toast">
          <svg viewBox="0 0 24 24" width="20" height="20" style={{flexShrink:0}}>
            <circle cx="12" cy="12" r="10" fill="none" stroke="#00a884" strokeWidth="1.8"/>
            <path d="M7.5 12l3 3 6-6" stroke="#00a884" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          </svg>
          <span className="archive-toast-text">Chat archived</span>
          <button
            className="archive-toast-undo"
            onClick={async () => {
              clearTimeout(archiveToast.timer);
              setArchiveToast(null);
              const { data } = await api.put(`/chats/${archiveToast.chatId}/archive`);
              onChatUpdated?.(archiveToast.chatId, { isArchived: data.isArchived });
            }}
          >
            Undo
          </button>
        </div>
      )}

      {/* ── Theme settings panel ── */}
      {showThemePanel && (
        <div className="theme-panel">
          <div className="theme-panel-header">
            <button className="theme-panel-back" onClick={() => setShowThemePanel(false)}>
              <BackIcon />
            </button>
            <span>Theme</span>
          </div>
          <div className="theme-panel-body">
            <p className="theme-panel-desc">Choose your preferred theme</p>
            {[
              {
                value: 'dark',
                label: 'Dark',
                icon: (
                  <svg viewBox="0 0 24 24" width="22" height="22">
                    <path fill="currentColor" d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z"/>
                  </svg>
                ),
              },
              {
                value: 'light',
                label: 'Light',
                icon: (
                  <svg viewBox="0 0 24 24" width="22" height="22">
                    <path fill="currentColor" d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58a.996.996 0 0 0-1.41 0 .996.996 0 0 0 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37a.996.996 0 0 0-1.41 0 .996.996 0 0 0 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0a.996.996 0 0 0 0-1.41l-1.06-1.06zm1.06-12.37l-1.06 1.06a.996.996 0 0 0 0 1.41c.39.39 1.03.39 1.41 0l1.06-1.06a.996.996 0 0 0 0-1.41.996.996 0 0 0-1.41 0zM7.05 18.36l-1.06 1.06a.996.996 0 0 0 0 1.41c.39.39 1.03.39 1.41 0l1.06-1.06a.996.996 0 0 0 0-1.41.996.996 0 0 0-1.41 0z"/>
                  </svg>
                ),
              },
              {
                value: 'system',
                label: 'System default',
                icon: (
                  <svg viewBox="0 0 24 24" width="22" height="22">
                    <path fill="currentColor" d="M20 3H4v10c0 1.1.9 2 2 2h3v2H7c-.55 0-1 .45-1 1s.45 1 1 1h10c.55 0 1-.45 1-1s-.45-1-1-1h-2v-2h3c1.1 0 2-.9 2-2V3zm-2 10H6V5h12v8z"/>
                  </svg>
                ),
              },
            ].map(({ value, label, icon }) => (
              <button
                key={value}
                className={`theme-option ${theme === value ? 'theme-option--active' : ''}`}
                onClick={() => changeTheme(value)}
              >
                <span className="theme-option-icon">{icon}</span>
                <span className="theme-option-label">{label}</span>
                {theme === value && (
                  <span className="theme-option-check">
                    <svg viewBox="0 0 24 24" width="18" height="18">
                      <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                    </svg>
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function getLastMsgPreview(msg, currentUserId) {
  if (!msg) return 'No messages yet';
  if (msg.isDeleted) {
    const senderId = msg.senderId?._id?.toString() || msg.senderId?.toString();
    return senderId === currentUserId?.toString() ? 'You deleted this message' : 'This message was deleted';
  }
  const type = msg.messageType || 'text';
  if (type === 'poll')    return '📊 Poll';
  if (type === 'event')   return '📅 Event';
  if (type === 'contact') return '👤 Contact';
  if (type === 'audio' || msg.mediaType === 'audio') return '🎤 Voice message';
  if (type === 'image' || msg.mediaType === 'image') return msg.text ? `📷 ${msg.text}` : '📷 Photo';
  if (type === 'video' || msg.mediaType === 'video') return msg.text ? `🎥 ${msg.text}` : '🎥 Video';
  if (type === 'file'  || msg.mediaType === 'file')  return `📄 ${msg.mediaName || 'Document'}`;
  return msg.text || 'No messages yet';
}

function formatChatTime(date) {
  const now = new Date();
  const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === now.toDateString())
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: '2-digit' });
}

// Icons
const SearchIcon      = () => <svg viewBox="0 0 24 24" width="16" height="16"><path fill="#8696a0" d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>;
const SavedMsgIcon    = () => (
  <svg viewBox="0 0 24 24" width="26" height="26">
    <path fill="#fff" d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/>
  </svg>
);
const CloseIcon       = () => <svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>;
const MenuIcon        = () => <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>;
const BackIcon        = () => <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>;
const WaLogoIcon      = () => <svg viewBox="0 0 24 24" width="28" height="28"><path fill="#00a884" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>;

/* Nav rail icons */
const ChatsNavIcon  = () => <svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>;
const StatusNavIcon = () => <svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.8"/><circle cx="12" cy="12" r="3.5" fill="currentColor"/><line x1="12" y1="2" x2="12" y2="5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="12" y1="18.5" x2="12" y2="22" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="2" y1="12" x2="5.5" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="18.5" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>;
const CallsNavIcon  = () => <svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/></svg>;
const MediaNavIcon  = () => <svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M22 16V4c0-1.1-.9-2-2-2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2zm-11-4l2.03 2.71L16 11l4 5H8l3-4zM2 6v14c0 1.1.9 2 2 2h14v-2H4V6H2z"/></svg>;

/* Dropdown menu icons */
const StarMenuIcon    = () => <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>;
const MarkReadIcon    = () => <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41zM.41 13.41L6 19l1.41-1.41L1.83 12 .41 13.41z"/></svg>;
const LogoutIcon      = () => <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>;
const ThemeMenuIcon   = () => <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>;
const StarEmptyIcon   = () => <svg viewBox="0 0 24 24" width="48" height="48"><path fill="#8696a0" d="M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z"/></svg>;
const SearchEmptyIcon = () => <svg viewBox="0 0 24 24" width="48" height="48"><path fill="#8696a0" d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>;

function MediaEmptyIcon({ tab }) {
  if (tab === 'photos') return <svg viewBox="0 0 24 24" width="48" height="48"><path fill="#8696a0" d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>;
  if (tab === 'videos') return <svg viewBox="0 0 24 24" width="48" height="48"><path fill="#8696a0" d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>;
  if (tab === 'docs')   return <svg viewBox="0 0 24 24" width="48" height="48"><path fill="#8696a0" d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/></svg>;
  return <svg viewBox="0 0 24 24" width="48" height="48"><path fill="#8696a0" d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>;
}
const DocFileIcon   = () => <svg viewBox="0 0 24 24" width="24" height="24"><path fill="#8696a0" d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/></svg>;
const AudioFileIcon = () => <svg viewBox="0 0 24 24" width="24" height="24"><path fill="#8696a0" d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>;
const DownloadIcon  = () => <svg viewBox="0 0 24 24" width="18" height="18"><path fill="#8696a0" d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>;

/* Context menu icons */
const ArchiveIcon     = () => <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM12 17.5L6.5 12H10v-2h4v2h3.5L12 17.5zM5.12 5l.81-1h12l.94 1H5.12z"/></svg>;
const PinCtxIcon      = () => <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/></svg>;
const MarkReadCtxIcon = () => <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41zM.41 13.41L6 19l1.41-1.41L1.83 12 .41 13.41z"/></svg>;
const FavCtxIcon      = ({ fav }) => <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d={fav ? "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" : "M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z"}/></svg>;
const ClearCtxIcon    = () => <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M5 13h14v-2H5v2zm-2 4h14v-2H3v2zM7 7v2h14V7H7z"/></svg>;
const DeleteCtxIcon   = () => <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>;
