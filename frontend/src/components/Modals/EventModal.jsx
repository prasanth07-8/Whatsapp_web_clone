import { useState } from 'react';
import './Modal.css';

export default function EventModal({ onClose, onSend }) {
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({ title: '', date: today, time: '', location: '', note: '' });

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSend = () => {
    if (!form.title.trim() || !form.date) return;
    onSend({ ...form, title: form.title.trim() });
    onClose();
  };

  const canSend = form.title.trim() && form.date;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-sheet-header">
          <button className="modal-back" onClick={onClose}>
            <BackArrowIcon />
          </button>
          <span>New Event</span>
          <button className="modal-send-btn" onClick={handleSend} disabled={!canSend}>
            Send
          </button>
        </div>

        <div className="modal-sheet-body">
          {/* Preview card */}
          {form.title && (
            <div className="event-preview-card">
              <div className="event-preview-icon">
                <div className="event-preview-month">
                  {form.date ? new Date(form.date).toLocaleString('default', { month: 'short' }).toUpperCase() : 'EVT'}
                </div>
                <div className="event-preview-day">
                  {form.date ? new Date(form.date).getDate() : ''}
                </div>
              </div>
              <div className="event-preview-info">
                <span className="event-preview-title">{form.title}</span>
                {form.date && (
                  <span className="event-preview-date">
                    {new Date(form.date).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}
                    {form.time ? ` · ${form.time}` : ''}
                  </span>
                )}
                {form.location && <span className="event-preview-loc">📍 {form.location}</span>}
              </div>
            </div>
          )}

          <div className="modal-field">
            <label>Event name *</label>
            <input
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="Event name"
              maxLength={100}
              autoFocus
            />
          </div>

          <div className="modal-row-2">
            <div className="modal-field">
              <label>Date *</label>
              <input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />
            </div>
            <div className="modal-field">
              <label>Time</label>
              <input type="time" value={form.time} onChange={(e) => set('time', e.target.value)} />
            </div>
          </div>

          <div className="modal-field">
            <label>Location</label>
            <input
              value={form.location}
              onChange={(e) => set('location', e.target.value)}
              placeholder="Add location (optional)"
            />
          </div>

          <div className="modal-field">
            <label>Description</label>
            <textarea
              value={form.note}
              onChange={(e) => set('note', e.target.value)}
              placeholder="Add a description (optional)"
              rows={3}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

const BackArrowIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20">
    <path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
  </svg>
);
