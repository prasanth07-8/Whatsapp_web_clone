import { useState, useRef } from 'react';
import './MediaPreviewModal.css';

export default function MediaPreviewModal({ files, onSend, onClose }) {
  const [activeIdx, setActiveIdx]   = useState(0);
  const [caption, setCaption]       = useState('');
  const [fileList, setFileList]     = useState(files);
  const addMoreRef = useRef(null);

  const active = fileList[activeIdx];

  const handleAddMore = (e) => {
    const newFiles = Array.from(e.target.files).map((f) => ({
      file: f,
      url:  URL.createObjectURL(f),
      type: f.type.startsWith('image/') ? 'image' : f.type.startsWith('video/') ? 'video' : 'file',
      name: f.name,
    }));
    setFileList((prev) => [...prev, ...newFiles]);
    e.target.value = '';
  };

  const handleRemove = (idx) => {
    const next = fileList.filter((_, i) => i !== idx);
    if (next.length === 0) { onClose(); return; }
    setFileList(next);
    setActiveIdx(Math.min(activeIdx, next.length - 1));
  };

  const handleSend = () => {
    onSend(fileList, caption);
    onClose();
  };

  return (
    <div className="mp-overlay">
      {/* Header */}
      <div className="mp-header">
        <button className="mp-close" onClick={onClose}><CloseIcon /></button>
        <span className="mp-title">{active?.name}</span>
      </div>

      {/* Preview area */}
      <div className="mp-preview-area">
        {active?.type === 'image' && (
          <img src={active.url} alt={active.name} className="mp-preview-img" />
        )}
        {active?.type === 'video' && (
          <video src={active.url} controls className="mp-preview-video" />
        )}
        {active?.type === 'file' && (
          <div className="mp-preview-file">
            <FileIcon />
            <span>{active.name}</span>
          </div>
        )}
      </div>

      {/* Thumbnail strip */}
      {fileList.length > 1 && (
        <div className="mp-strip">
          {fileList.map((f, i) => (
            <div
              key={i}
              className={`mp-thumb-wrap ${i === activeIdx ? 'active' : ''}`}
              onClick={() => setActiveIdx(i)}
            >
              {f.type === 'image' ? (
                <img src={f.url} alt="" className="mp-thumb" />
              ) : f.type === 'video' ? (
                <video src={f.url} className="mp-thumb" />
              ) : (
                <div className="mp-thumb mp-thumb-file"><FileIcon /></div>
              )}
              <button
                className="mp-thumb-remove"
                onClick={(e) => { e.stopPropagation(); handleRemove(i); }}
              >✕</button>
            </div>
          ))}
          {/* Add more button */}
          <button className="mp-add-more" onClick={() => addMoreRef.current?.click()}>
            <PlusIcon />
          </button>
          <input
            ref={addMoreRef}
            type="file"
            multiple
            accept="image/*,video/*,.pdf,.doc,.docx"
            style={{ display: 'none' }}
            onChange={handleAddMore}
          />
        </div>
      )}

      {/* Caption + send */}
      <div className="mp-footer">
        {fileList.length === 1 && (
          <button className="mp-add-more-inline" onClick={() => addMoreRef.current?.click()}>
            <PlusIcon />
            <input
              ref={addMoreRef}
              type="file"
              multiple
              accept="image/*,video/*,.pdf,.doc,.docx"
              style={{ display: 'none' }}
              onChange={handleAddMore}
            />
          </button>
        )}
        <div className="mp-caption-wrap">
          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Add a caption..."
            className="mp-caption-input"
            onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
            autoFocus
          />
        </div>
        <button className="mp-send-btn" onClick={handleSend}>
          <SendIcon />
        </button>
      </div>
    </div>
  );
}

const CloseIcon = () => <svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>;
const FileIcon  = () => <svg viewBox="0 0 24 24" width="48" height="48"><path fill="#8696a0" d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/></svg>;
const PlusIcon  = () => <svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>;
const SendIcon  = () => <svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M1.101 21.757L23.8 12.028 1.101 2.3l.011 7.912 13.623 1.816-13.623 1.817-.011 7.912z"/></svg>;
