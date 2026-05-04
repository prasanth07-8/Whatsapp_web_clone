import { useState, useEffect } from 'react';
import DefaultAvatar from '../DefaultAvatar';
import api from '../../services/api';
import './ContactInfo.css';

const BASE = 'http://localhost:5000';

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
  return `last seen ${date.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

export default function ContactInfo({ contact, isOnline, lastSeen, mediaMessages, onClose, onClearChat, onDeleteChat, onBlockChange }) {
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);
  const [confirmBlock, setConfirmBlock] = useState(false);

  const joinedDate = contact?.createdAt
    ? new Date(contact.createdAt).toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  const images = mediaMessages?.filter((m) => m.mediaType === 'image') || [];
  const docs   = mediaMessages?.filter((m) => m.mediaType === 'file')  || [];

  // Fetch block status on mount
  useEffect(() => {
    if (!contact?._id) return;
    api.get(`/users/block/${contact._id}`)
      .then((res) => setIsBlocked(res.data.isBlocked))
      .catch(() => {});
  }, [contact?._id]);

  const handleToggleBlock = async () => {
    if (!isBlocked && !confirmBlock) {
      setConfirmBlock(true);
      return;
    }
    setConfirmBlock(false);
    setBlockLoading(true);
    try {
      const { data } = await api.put(`/users/block/${contact._id}`);
      setIsBlocked(data.isBlocked);
      onBlockChange?.(data.isBlocked);
    } catch (err) {
      console.error(err);
    } finally {
      setBlockLoading(false);
    }
  };

  return (
    <div className="contact-info-panel">
      {/* Header */}
      <div className="ci-header">
        <button className="ci-close" onClick={onClose}><CloseIcon /></button>
        <span>Contact info</span>
      </div>

      {/* Avatar + name */}
      <div className="ci-hero">
        {contact?.avatar
          ? <img src={`${BASE}${contact.avatar}`} alt={contact.username} className="ci-avatar-img" />
          : <div className="ci-avatar"><DefaultAvatar /></div>
        }
        <h2 className="ci-name">{contact?.username}</h2>
        <p className="ci-status">
          {isBlocked ? (
            <span className="ci-blocked-label">Blocked</span>
          ) : isOnline ? (
            <span className="ci-online">online</span>
          ) : (
            <span>{formatLastSeen(lastSeen)}</span>
          )}
        </p>
      </div>

      {/* About / tagline */}
      {contact?.tagline && (
        <div className="ci-section">
          <div className="ci-section-title"><span>About</span></div>
          <div className="ci-row">
            <AboutIcon />
            <div className="ci-row-content">
              <span className="ci-row-value">{contact.tagline}</span>
            </div>
          </div>
        </div>
      )}

      {/* Info rows */}
      <div className="ci-section">
        <div className="ci-row">
          <EmailIcon />
          <div className="ci-row-content">
            <span className="ci-row-value">{contact?.email}</span>
            <span className="ci-row-label">Email</span>
          </div>
        </div>
        {joinedDate && (
          <div className="ci-row">
            <CalendarIcon />
            <div className="ci-row-content">
              <span className="ci-row-value">{joinedDate}</span>
              <span className="ci-row-label">Joined</span>
            </div>
          </div>
        )}
      </div>

      {/* Media section */}
      {images.length > 0 && (
        <div className="ci-section">
          <div className="ci-section-title">
            <span>Media, links and docs</span>
            <span className="ci-section-count">{images.length + docs.length}</span>
          </div>
          <div className="ci-media-grid">
            {images.slice(0, 6).map((m) => (
              <img
                key={m._id}
                src={`${BASE}${m.mediaUrl}`}
                alt=""
                className="ci-media-thumb"
                onClick={() => window.open(`${BASE}${m.mediaUrl}`, '_blank')}
              />
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="ci-section ci-actions">
        <button className="ci-action-btn" onClick={onClearChat}>
          <ClearIcon /><span>Clear chat</span>
        </button>
        <button className="ci-action-btn danger" onClick={onDeleteChat}>
          <DeleteIcon /><span>Delete chat</span>
        </button>

        {/* Block / Unblock */}
        {confirmBlock ? (
          <div className="ci-block-confirm">
            <p>Block <strong>{contact?.username}</strong>? They won't be able to send you messages.</p>
            <div className="ci-block-confirm-actions">
              <button className="ci-block-cancel" onClick={() => setConfirmBlock(false)}>Cancel</button>
              <button className="ci-block-ok" onClick={handleToggleBlock} disabled={blockLoading}>
                {blockLoading ? 'Blocking...' : 'Block'}
              </button>
            </div>
          </div>
        ) : (
          <button
            className={`ci-action-btn danger ${isBlocked ? 'ci-action-btn--unblock' : ''}`}
            onClick={handleToggleBlock}
            disabled={blockLoading}
          >
            <BlockIcon />
            <span>{isBlocked ? `Unblock ${contact?.username}` : `Block ${contact?.username}`}</span>
          </button>
        )}

        <button className="ci-action-btn danger">
          <ReportIcon /><span>Report {contact?.username}</span>
        </button>
      </div>
    </div>
  );
}

const CloseIcon    = () => <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>;
const EmailIcon    = () => <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>;
const CalendarIcon = () => <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z"/></svg>;
const ClearIcon    = () => <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M5 13h14v-2H5v2zm-2 4h14v-2H3v2zM7 7v2h14V7H7z"/></svg>;
const DeleteIcon   = () => <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>;
const BlockIcon    = () => <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM4 12c0-4.42 3.58-8 8-8 1.85 0 3.55.63 4.9 1.69L5.69 16.9C4.63 15.55 4 13.85 4 12zm8 8c-1.85 0-3.55-.63-4.9-1.69L18.31 7.1C19.37 8.45 20 10.15 20 12c0 4.42-3.58 8-8 8z"/></svg>;
const ReportIcon   = () => <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6h-5.6z"/></svg>;
const AboutIcon    = () => <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>;
