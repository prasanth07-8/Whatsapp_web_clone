import { useState } from 'react';
import { createPortal } from 'react-dom';
import DefaultAvatar from '../DefaultAvatar';
import './MediaMessage.css';

const BASE = 'http://localhost:5000';

export default function MediaMessage({ message, currentUserId, onVote }) {
  const { mediaUrl, mediaType, mediaName, text, messageType, poll, contact, event } = message;
  const [imgOpen, setImgOpen]       = useState(false);
  const [votersPanel, setVotersPanel] = useState(false); // show voters overlay
  const [votersTab, setVotersTab]     = useState(0);     // which option tab is active

  // ── Poll ──────────────────────────────────────────────
  if (messageType === 'poll' && poll) {
    const totalVotes = poll.options.reduce((s, o) => s + (o.votes?.length || 0), 0);

    const userVotedIdx = poll.options.findIndex((o) =>
      o.votes?.some((v) => {
        const id = typeof v === 'object' ? (v._id?.toString() || v.toString()) : v.toString();
        return id === currentUserId?.toString();
      })
    );
    const hasVoted = userVotedIdx !== -1;

    const openVoters = (e) => {
      e.stopPropagation();
      if (totalVotes === 0) return;
      setVotersTab(0);
      setVotersPanel(true);
    };

    return (
      <>
        <div className="poll-card">
          <div className="poll-header">
            <PollHeaderIcon />
            <span className="poll-type-label">POLL</span>
          </div>
          <p className="poll-question">{poll.question}</p>
          <div className="poll-options">
            {poll.options.map((opt, i) => {
              const votes   = opt.votes?.length || 0;
              const pct     = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
              const isVoted = i === userVotedIdx;

              return (
                <button
                  key={i}
                  className={`poll-option ${isVoted ? 'voted' : ''} ${hasVoted ? 'results-shown' : ''}`}
                  onClick={() => onVote && onVote(message._id, i)}
                >
                  <div className="poll-option-bar" style={{ width: hasVoted ? `${pct}%` : '0%' }} />
                  <div className="poll-option-content">
                    <div className="poll-option-left">
                      <span className={`poll-radio ${isVoted ? 'poll-radio-checked' : ''}`}>
                        {isVoted && <span className="poll-radio-dot" />}
                      </span>
                      <span className="poll-option-text">{opt.text}</span>
                    </div>
                    {hasVoted && <span className="poll-option-pct">{pct}%</span>}
                  </div>
                </button>
              );
            })}
          </div>
          {/* Clickable vote count */}
          <button className="poll-total-btn" onClick={openVoters} disabled={totalVotes === 0}>
            {totalVotes} vote{totalVotes !== 1 ? 's' : ''} · {poll.multiSelect ? 'Multiple answers' : 'Single answer'}
          </button>
        </div>

        {/* Voters panel — scoped inside chat window */}
        {votersPanel && createPortal(
          <div className="voters-overlay" onClick={() => setVotersPanel(false)}>
            <div className="voters-sheet" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="voters-header">
                <button className="voters-close" onClick={() => setVotersPanel(false)}>
                  <CloseIcon />
                </button>
                <span className="voters-title">{poll.question}</span>
              </div>

              {/* Option tabs */}
              <div className="voters-tabs">
                <button
                  className={`voters-tab ${votersTab === -1 ? 'active' : ''}`}
                  onClick={() => setVotersTab(-1)}
                >
                  All <span className="voters-tab-count">{totalVotes}</span>
                </button>
                {poll.options.map((opt, i) => (
                  <button
                    key={i}
                    className={`voters-tab ${votersTab === i ? 'active' : ''}`}
                    onClick={() => setVotersTab(i)}
                  >
                    {opt.text}
                    <span className="voters-tab-count">{opt.votes?.length || 0}</span>
                  </button>
                ))}
              </div>

              {/* Voter list */}
              <div className="voters-list">
                {(() => {
                  const displayOptions = votersTab === -1
                    ? poll.options.map((opt, i) => ({ opt, i }))
                    : [{ opt: poll.options[votersTab], i: votersTab }];

                  const rows = [];
                  displayOptions.forEach(({ opt, i }) => {
                    if (!opt.votes?.length) return;
                    if (votersTab === -1) {
                      rows.push(
                        <div key={`label-${i}`} className="voters-option-label">
                          {opt.text}
                        </div>
                      );
                    }
                    opt.votes.forEach((voter) => {
                      const name   = voter?.username || voter?.email || 'Unknown';
                      const avatar = voter?.avatar;
                      rows.push(
                        <div key={`${i}-${voter?._id || voter}`} className="voter-row">
                          <div className="voter-avatar">
                            {avatar
                              ? <img src={`${BASE}${avatar}`} alt={name} />
                              : <DefaultAvatar size="40px" />
                            }
                          </div>
                          <span className="voter-name">
                            {voter?._id?.toString() === currentUserId?.toString() ? 'You' : name}
                          </span>
                        </div>
                      );
                    });
                  });

                  if (rows.length === 0) {
                    return (
                      <div className="voters-empty">No votes yet for this option</div>
                    );
                  }
                  return rows;
                })()}
              </div>
            </div>
          </div>,
          document.querySelector('.chat-window') || document.body
        )}
      </>
    );
  }

  // ── Contact ───────────────────────────────────────────
  if (messageType === 'contact' && contact) {
    return (
      <div className="contact-card">
        <div className="contact-card-avatar"><DefaultAvatar size="44px" /></div>
        <div className="contact-card-info">
          <span className="contact-card-name">{contact.name}</span>
          {contact.phone && <span className="contact-card-detail">{contact.phone}</span>}
          {contact.email && <span className="contact-card-detail">{contact.email}</span>}
        </div>
      </div>
    );
  }

  // ── Event ─────────────────────────────────────────────
  if (messageType === 'event') {
    // Fallback for old messages saved before the fix
    if (!event) {
      return (
        <div className="event-card">
          <div className="event-card-icon-wrap">
            <div className="event-card-icon-month">EVT</div>
            <div className="event-card-icon-day">—</div>
          </div>
          <div className="event-card-body">
            <p className="event-card-title">{text || 'Event'}</p>
          </div>
        </div>
      );
    }
    const dateStr = event.date
      ? new Date(event.date + (event.time ? `T${event.time}` : '')).toLocaleDateString([], {
          weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
        })
      : '';

    return (
      <div className="event-card">
        {/* Calendar icon block */}
        <div className="event-card-icon-wrap">
          <div className="event-card-icon-month">
            {event.date ? new Date(event.date).toLocaleString('default', { month: 'short' }).toUpperCase() : ''}
          </div>
          <div className="event-card-icon-day">
            {event.date ? new Date(event.date).getDate() : ''}
          </div>
        </div>
        <div className="event-card-body">
          <p className="event-card-title">{event.title}</p>
          <div className="event-card-details">
            {dateStr && (
              <span className="event-card-row">
                <CalendarIcon />
                {dateStr}{event.time ? ` · ${event.time}` : ''}
              </span>
            )}
            {event.location && (
              <span className="event-card-row">
                <LocationIcon />
                {event.location}
              </span>
            )}
          </div>
          {event.note && <p className="event-card-note">{event.note}</p>}
        </div>
      </div>
    );
  }

  // ── Media ─────────────────────────────────────────────
  if (!mediaUrl) return null;
  const url = `${BASE}${mediaUrl}`;

  if (mediaType === 'image') {
    return (
      <div className="media-wrap">
        <img src={url} alt={mediaName || 'image'} className="media-image" onClick={() => setImgOpen(true)} />
        {text && <p className="media-caption">{text}</p>}
        {imgOpen && (
          <div className="media-lightbox" onClick={() => setImgOpen(false)}>
            <img src={url} alt={mediaName} />
            <button className="lightbox-close" onClick={() => setImgOpen(false)}>✕</button>
          </div>
        )}
      </div>
    );
  }

  if (mediaType === 'video') {
    return (
      <div className="media-wrap">
        <video controls className="media-video" src={url} />
        {text && <p className="media-caption">{text}</p>}
      </div>
    );
  }

  if (mediaType === 'audio') {
    return (
      <div className="media-wrap media-audio-wrap">
        <MicIcon />
        <audio controls src={url} className="media-audio" />
      </div>
    );
  }

  return (
    <div className="media-wrap">
      <a href={url} target="_blank" rel="noreferrer" className="media-file" download={mediaName}>
        <FileIcon />
        <div className="media-file-info">
          <span className="media-file-name">{mediaName || 'File'}</span>
          <span className="media-file-sub">Tap to download</span>
        </div>
      </a>
      {text && <p className="media-caption">{text}</p>}
    </div>
  );
}

const MicIcon        = () => <svg viewBox="0 0 24 24" width="20" height="20" style={{flexShrink:0}}><path fill="#8696a0" d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>;
const FileIcon       = () => <svg viewBox="0 0 24 24" width="28" height="28" style={{flexShrink:0}}><path fill="#8696a0" d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/></svg>;
const PollHeaderIcon = () => <svg viewBox="0 0 24 24" width="16" height="16"><path fill="#8696a0" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>;
const CalendarIcon   = () => <svg viewBox="0 0 24 24" width="13" height="13" style={{flexShrink:0}}><path fill="currentColor" d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z"/></svg>;
const LocationIcon   = () => <svg viewBox="0 0 24 24" width="13" height="13" style={{flexShrink:0}}><path fill="currentColor" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>;
const CloseIcon      = () => <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>;
