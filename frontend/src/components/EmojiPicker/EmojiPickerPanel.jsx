import { useState, useRef, useEffect } from 'react';
import EmojiPicker, { SkinTones } from 'emoji-picker-react';
import './EmojiPickerPanel.css';

const GIF_CATEGORIES = ['trending', 'reactions', 'animals', 'sports', 'food'];

export default function EmojiPickerPanel({ onEmojiClick, onClose, onGifClick }) {
  const [tab, setTab]             = useState('emoji');
  const [skinTone, setSkinTone]   = useState(SkinTones.NEUTRAL);
  const [gifSearch, setGifSearch] = useState('');
  const panelRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div className="emoji-panel" ref={panelRef}>
      {/* Tab bar */}
      <div className="emoji-tabs">
        <button className={`emoji-tab ${tab === 'emoji' ? 'active' : ''}`} onClick={() => setTab('emoji')}>
          <EmojiTabIcon /> Emoji
        </button>
        <button className={`emoji-tab ${tab === 'gif' ? 'active' : ''}`} onClick={() => setTab('gif')}>
          <GifTabIcon /> GIF
        </button>
        <button className={`emoji-tab ${tab === 'sticker' ? 'active' : ''}`} onClick={() => setTab('sticker')}>
          <StickerTabIcon /> Stickers
        </button>
      </div>

      {/* Emoji tab */}
      {tab === 'emoji' && (
        <div className="emoji-picker-wrap">
          <EmojiPicker
            onEmojiClick={(emojiData) => onEmojiClick(emojiData.emoji)}
            theme="dark"
            skinTone={skinTone}
            searchPlaceholder="Search emoji..."
            height={360}
            width={320}
            previewConfig={{ showPreview: false }}
          />
          {/* Skin tone selector */}
          <div className="skin-tone-bar">
            <span className="skin-tone-label">Skin tone:</span>
            {Object.values(SkinTones).map((tone) => (
              <button
                key={tone}
                className={`skin-btn ${skinTone === tone ? 'active' : ''}`}
                onClick={() => setSkinTone(tone)}
                title={tone}
              >
                👋
              </button>
            ))}
          </div>
        </div>
      )}

      {/* GIF tab */}
      {tab === 'gif' && (
        <div className="gif-panel">
          <div className="gif-search-wrap">
            <input
              value={gifSearch}
              onChange={(e) => setGifSearch(e.target.value)}
              placeholder="Search GIFs..."
              className="gif-search-input"
              autoFocus
            />
          </div>
          <div className="gif-categories">
            {GIF_CATEGORIES.map((cat) => (
              <button key={cat} className="gif-cat-btn" onClick={() => setGifSearch(cat)}>
                {cat}
              </button>
            ))}
          </div>
          <div className="gif-grid-empty">
            <p>🎬</p>
            <p>Search for GIFs above</p>
            <p className="gif-note">GIF support requires a Tenor API key.<br/>Add VITE_TENOR_KEY to your .env to enable.</p>
          </div>
        </div>
      )}

      {/* Sticker tab */}
      {tab === 'sticker' && (
        <div className="gif-panel">
          <div className="gif-grid-empty">
            <p>🎨</p>
            <p>No sticker packs yet</p>
            <p className="gif-note">Sticker packs can be added via the WhatsApp sticker store.</p>
          </div>
        </div>
      )}
    </div>
  );
}

const EmojiTabIcon   = () => <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/></svg>;
const GifTabIcon     = () => <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M11.5 9H13v6h-1.5zM9 9H6c-.6 0-1 .5-1 1v4c0 .5.4 1 1 1h3c.6 0 1-.5 1-1v-2H8.5v1.5h-2v-3H10V10c0-.5-.4-1-1-1zm10 1.5V9h-4.5v6H16v-2h2v-1.5h-2v-1z"/></svg>;
const StickerTabIcon = () => <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18zM18 14H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>;
