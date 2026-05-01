import { useState } from 'react';
import './Modal.css';

export default function ContactModal({ onClose, onSend }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '' });

  const handleSend = () => {
    if (!form.name.trim()) return;
    onSend(form);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-sheet-header">
          <button className="modal-back" onClick={onClose}>✕</button>
          <span>Share Contact</span>
          <button className="modal-send-btn" onClick={handleSend} disabled={!form.name.trim()}>
            Send
          </button>
        </div>

        <div className="modal-sheet-body">
          <div className="modal-contact-avatar">
            {form.name ? form.name[0].toUpperCase() : '?'}
          </div>

          <div className="modal-field">
            <label>Name *</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Contact name" autoFocus />
          </div>
          <div className="modal-field">
            <label>Phone</label>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 234 567 8900" type="tel" />
          </div>
          <div className="modal-field">
            <label>Email</label>
            <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" type="email" />
          </div>
        </div>
      </div>
    </div>
  );
}
