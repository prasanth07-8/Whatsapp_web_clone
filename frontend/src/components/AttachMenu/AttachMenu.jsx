import { useRef, useEffect, useState } from 'react';
import './AttachMenu.css';

export default function AttachMenu({ onClose, onFileSelect, onPoll, onContact, onEvent, onCamera }) {
  const menuRef = useRef(null);
  const docRef  = useRef(null);
  const photoRef = useRef(null);
  const audioRef = useRef(null);
  const cameraRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const items = [
    {
      label: 'Document',
      color: '#7f66ff',
      icon: <DocIcon />,
      action: () => { docRef.current?.click(); },
    },
    {
      label: 'Photos & Videos',
      color: '#007bfc',
      icon: <PhotoIcon />,
      action: () => { photoRef.current?.click(); },
    },
    {
      label: 'Camera',
      color: '#ff2e74',
      icon: <CameraIcon />,
      action: () => { cameraRef.current?.click(); },
    },
    {
      label: 'Audio',
      color: '#ff9500',
      icon: <AudioIcon />,
      action: () => { audioRef.current?.click(); },
    },
    {
      label: 'Contact',
      color: '#00a884',
      icon: <ContactIcon />,
      action: () => { onClose(); onContact(); },
    },
    {
      label: 'Poll',
      color: '#0fbbb4',
      icon: <PollIcon />,
      action: () => { onClose(); onPoll(); },
    },
    {
      label: 'Event',
      color: '#ff6b35',
      icon: <EventIcon />,
      action: () => { onClose(); onEvent(); },
    },
  ];

  return (
    <>
      {/* Hidden file inputs */}
      <input ref={docRef}   type="file" accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx,.zip" style={{ display: 'none' }}
        onChange={(e) => { onFileSelect(e, 'file'); onClose(); }} />
      <input ref={photoRef} type="file" accept="image/*,video/*" style={{ display: 'none' }}
        onChange={(e) => { onFileSelect(e, 'media'); onClose(); }} />
      <input ref={audioRef} type="file" accept="audio/*" style={{ display: 'none' }}
        onChange={(e) => { onFileSelect(e, 'audio'); onClose(); }} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
        onChange={(e) => { onFileSelect(e, 'media'); onClose(); }} />

      <div ref={menuRef} className="attach-menu">
        {items.map((item) => (
          <button key={item.label} className="attach-item" onClick={item.action}>
            <div className="attach-icon" style={{ background: item.color }}>
              {item.icon}
            </div>
            <span className="attach-label">{item.label}</span>
          </button>
        ))}
      </div>
    </>
  );
}

const DocIcon     = () => <svg viewBox="0 0 24 24" width="22" height="22"><path fill="#fff" d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/></svg>;
const PhotoIcon   = () => <svg viewBox="0 0 24 24" width="22" height="22"><path fill="#fff" d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>;
const CameraIcon  = () => <svg viewBox="0 0 24 24" width="22" height="22"><path fill="#fff" d="M12 15.2c1.77 0 3.2-1.43 3.2-3.2S13.77 8.8 12 8.8 8.8 10.23 8.8 12s1.43 3.2 3.2 3.2zM9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/></svg>;
const AudioIcon   = () => <svg viewBox="0 0 24 24" width="22" height="22"><path fill="#fff" d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>;
const ContactIcon = () => <svg viewBox="0 0 24 24" width="22" height="22"><path fill="#fff" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>;
const PollIcon    = () => <svg viewBox="0 0 24 24" width="22" height="22"><path fill="#fff" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>;
const EventIcon   = () => <svg viewBox="0 0 24 24" width="22" height="22"><path fill="#fff" d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z"/></svg>;
