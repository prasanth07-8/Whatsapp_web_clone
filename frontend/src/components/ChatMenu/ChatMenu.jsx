import { useEffect, useRef } from 'react';
import './ChatMenu.css';

export default function ChatMenu({ chat, isFavourite, onClose, onAction }) {
  const menuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const items = [
    {
      icon: <SearchMenuIcon />,
      label: 'Search',
      action: 'search',
    },
    {
      icon: isFavourite ? <UnfavIcon /> : <FavIcon />,
      label: isFavourite ? 'Remove from favourites' : 'Add to favourites',
      action: 'favourite',
    },
    {
      icon: <SelectMenuIcon />,
      label: 'Select messages',
      action: 'select',
    },
    {
      icon: <ClearIcon />,
      label: 'Clear chat',
      action: 'clear',
      danger: false,
    },
    {
      icon: <DeleteChatIcon />,
      label: 'Delete chat',
      action: 'delete',
      danger: true,
    },
  ];

  return (
    <div ref={menuRef} className="chat-menu-dropdown">
      {items.map((item) => (
        <button
          key={item.action}
          className={`chat-menu-item ${item.danger ? 'danger' : ''}`}
          onClick={() => { onAction(item.action); onClose(); }}
        >
          <span className="chat-menu-icon">{item.icon}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}

const SearchMenuIcon  = () => <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>;
const FavIcon         = () => <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>;
const UnfavIcon       = () => <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z"/></svg>;
const SelectMenuIcon  = () => <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM17.99 9l-1.41-1.42-6.59 6.59-2.58-2.57-1.42 1.41 4 3.99z"/></svg>;
const ClearIcon       = () => <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M5 13h14v-2H5v2zm-2 4h14v-2H3v2zM7 7v2h14V7H7z"/></svg>;
const DeleteChatIcon  = () => <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>;
