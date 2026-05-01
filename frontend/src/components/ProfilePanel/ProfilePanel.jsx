import { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import DefaultAvatar from '../DefaultAvatar';
import './ProfilePanel.css';

const BASE = 'http://localhost:5000';

const DEFAULT_TAGLINES = [
  'Hey there! I am using WhatsApp.',
  'Available',
  'Busy',
  'At school',
  'At the movies',
  'At work',
  'Battery about to die',
  'Can\'t talk, WhatsApp only',
  'In a meeting',
  'At the gym',
  'Sleeping',
  'Urgent calls only',
];

export default function ProfilePanel({ onClose, socket }) {
  const { user, updateUser } = useAuth();
  const [username, setUsername]   = useState(user?.username || '');
  const [tagline, setTagline]     = useState(user?.tagline || 'Hey there! I am using WhatsApp.');
  const [editingName, setEditingName]     = useState(false);
  const [editingTagline, setEditingTagline] = useState(false);
  const [showTaglinePicker, setShowTaglinePicker] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const [avatarPreview, setAvatarPreview] = useState(
    user?.avatar ? `${BASE}${user.avatar}` : null
  );
  const fileRef = useRef(null);

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setAvatarPreview(preview);

    // Upload immediately
    const formData = new FormData();
    formData.append('file', file);
    try {
      const { data } = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await saveProfile({ avatar: data.mediaUrl });
    } catch { setError('Failed to upload photo'); }
    e.target.value = '';
  };

  const saveProfile = async (overrides = {}) => {
    setSaving(true); setError('');
    try {
      const { data } = await api.put('/users/profile', {
        username: username.trim(),
        tagline:  tagline.trim(),
        ...overrides,
      });
      updateUser(data);
      socket?.emit('profile_updated', { userId: data._id, username: data.username, tagline: data.tagline, avatar: data.avatar });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  const handleNameSave = async () => {
    if (!username.trim()) return;
    await saveProfile();
    setEditingName(false);
  };

  const handleTaglineSave = async () => {
    await saveProfile();
    setEditingTagline(false);
    setShowTaglinePicker(false);
  };

  const handleTaglineSelect = (t) => {
    setTagline(t);
    setShowTaglinePicker(false);
    saveProfile({ tagline: t });
  };

  const removeAvatar = async () => {
    setAvatarPreview(null);
    await saveProfile({ avatar: '' });
  };

  return (
    <div className="profile-panel">
      {/* Header */}
      <div className="pp-header">
        <button className="pp-back" onClick={onClose}><BackIcon /></button>
        <span>Profile</span>
      </div>

      {/* Avatar section */}
      <div className="pp-avatar-section">
        <div className="pp-avatar-wrap" onClick={() => fileRef.current?.click()}>
          {avatarPreview ? (
            <img src={avatarPreview} alt="avatar" className="pp-avatar-img" />
          ) : (
            <div className="pp-avatar-placeholder">
              <DefaultAvatar size="100%" />
            </div>
          )}
          <div className="pp-avatar-overlay">
            <CameraIcon />
            <span>Change<br/>profile photo</span>
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
        {avatarPreview && (
          <button className="pp-remove-photo" onClick={removeAvatar}>Remove photo</button>
        )}
      </div>

      {error && <p className="pp-error">{error}</p>}

      {/* Name section */}
      <div className="pp-section">
        <div className="pp-section-label">Your name</div>
        <div className="pp-field-row">
          {editingName ? (
            <>
              <input
                className="pp-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={25}
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') handleNameSave(); if (e.key === 'Escape') setEditingName(false); }}
              />
              <div className="pp-field-actions">
                <span className="pp-char-count">{25 - username.length}</span>
                <button className="pp-icon-btn" onClick={() => setEditingName(false)}><CloseIcon /></button>
                <button className="pp-icon-btn confirm" onClick={handleNameSave} disabled={saving}><CheckIcon /></button>
              </div>
            </>
          ) : (
            <>
              <span className="pp-field-value">{username}</span>
              <button className="pp-icon-btn" onClick={() => setEditingName(true)}><EditIcon /></button>
            </>
          )}
        </div>
        <p className="pp-field-hint">This is not your username. This name will be visible to your WhatsApp contacts.</p>
      </div>

      {/* About / Tagline section */}
      <div className="pp-section">
        <div className="pp-section-label">About</div>
        <div className="pp-field-row">
          {editingTagline ? (
            <>
              <input
                className="pp-input"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                maxLength={139}
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') handleTaglineSave(); if (e.key === 'Escape') setEditingTagline(false); }}
              />
              <div className="pp-field-actions">
                <span className="pp-char-count">{139 - tagline.length}</span>
                <button className="pp-icon-btn" onClick={() => setEditingTagline(false)}><CloseIcon /></button>
                <button className="pp-icon-btn confirm" onClick={handleTaglineSave} disabled={saving}><CheckIcon /></button>
              </div>
            </>
          ) : (
            <>
              <span className="pp-field-value">{tagline}</span>
              <button className="pp-icon-btn" onClick={() => setEditingTagline(true)}><EditIcon /></button>
            </>
          )}
        </div>

        {/* Preset taglines */}
        <button className="pp-tagline-picker-btn" onClick={() => setShowTaglinePicker(!showTaglinePicker)}>
          <ListIcon /> Select a preset status
        </button>

        {showTaglinePicker && (
          <div className="pp-tagline-list">
            {DEFAULT_TAGLINES.map((t) => (
              <button
                key={t}
                className={`pp-tagline-item ${tagline === t ? 'active' : ''}`}
                onClick={() => handleTaglineSelect(t)}
              >
                {tagline === t && <span className="pp-tagline-check">✓</span>}
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Email (read-only) */}
      <div className="pp-section">
        <div className="pp-section-label">Email</div>
        <div className="pp-field-row">
          <span className="pp-field-value pp-field-muted">{user?.email}</span>
        </div>
      </div>
    </div>
  );
}

const BackIcon   = () => <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>;
const CameraIcon = () => <svg viewBox="0 0 24 24" width="28" height="28"><path fill="#fff" d="M12 15.2c1.77 0 3.2-1.43 3.2-3.2S13.77 8.8 12 8.8 8.8 10.23 8.8 12s1.43 3.2 3.2 3.2zM9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/></svg>;
const EditIcon   = () => <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>;
const CheckIcon  = () => <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>;
const CloseIcon  = () => <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>;
const ListIcon   = () => <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/></svg>;
