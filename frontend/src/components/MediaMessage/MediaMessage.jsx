import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import DefaultAvatar from '../DefaultAvatar';
import './MediaMessage.css';

const BASE = 'http://localhost:5000';

export default function MediaMessage({ message, currentUserId, onVote, senderAvatar, senderName, isOwn, time, status, playingAudioId, onAudioPlay, onAudioEnded }) {
  const { mediaUrl, mediaType, mediaName, text, messageType, poll, contact, event } = message;
  const [imgOpen, setImgOpen]       = useState(false);
  const [votersPanel, setVotersPanel] = useState(false); // show voters overlay
  const [votersTab, setVotersTab]     = useState(0);     // which option tab is active

  // ── Poll ──────────────────────────────────────────────
  if (messageType === 'poll' && poll) {
    const totalVotes = poll.options.reduce((s, o) => s + (o.votes?.length || 0), 0);

    // Find ALL options this user voted for (supports multiSelect)
    const userVotedIdxs = poll.options.reduce((acc, o, i) => {
      const voted = o.votes?.some((v) => {
        const id = typeof v === 'object' ? (v._id?.toString() || v.toString()) : v.toString();
        return id === currentUserId?.toString();
      });
      if (voted) acc.push(i);
      return acc;
    }, []);
    const hasVoted = userVotedIdxs.length > 0;

    const openVoters = (e) => {
      e.stopPropagation();
      setVotersTab(-1);
      setVotersPanel(true);
    };

    return (
      <>
        <div className="wa-poll">
          {/* Question */}
          <p className="wa-poll-question">{poll.question}</p>

          {/* Subtitle */}
          <div className="wa-poll-subtitle">
            <PollSubIcon multiSelect={poll.multiSelect} hasVoted={hasVoted} />
            <span>{hasVoted
              ? (poll.multiSelect ? 'You voted · Select one or more' : 'You voted')
              : (poll.multiSelect ? 'Select one or more' : 'Select one')
            }</span>
          </div>

          {/* Options */}
          <div className="wa-poll-options">
            {poll.options.map((opt, i) => {
              const votes   = opt.votes?.length || 0;
              const pct     = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
              const isVoted = userVotedIdxs.includes(i);
              // Show up to 3 voter avatars
              const voterAvatars = (opt.votes || []).slice(0, 3);

              return (
                <button
                  key={i}
                  className={`wa-poll-option ${isVoted ? 'wa-poll-option--voted' : ''}`}
                  onClick={() => onVote && onVote(message._id, i)}
                >
                  {/* Radio / Check */}
                  <span className={`wa-poll-radio ${isVoted ? 'wa-poll-radio--checked' : ''}`}>
                    {isVoted
                      ? <CheckCircleIcon />
                      : <EmptyCircleIcon />
                    }
                  </span>

                  {/* Option body */}
                  <div className="wa-poll-option-body">
                    <div className="wa-poll-option-top">
                      <span className="wa-poll-option-text">{opt.text}</span>
                      <div className="wa-poll-option-right">
                        {/* Voter avatars */}
                        {hasVoted && voterAvatars.length > 0 && (
                          <div className="wa-poll-avatars">
                            {voterAvatars.map((voter, vi) => (
                              <span key={vi} className="wa-poll-avatar">
                                {voter?.avatar
                                  ? <img src={`${BASE}${voter.avatar}`} alt="" />
                                  : <DefaultAvatar size="18px" />
                                }
                              </span>
                            ))}
                          </div>
                        )}
                        {hasVoted && (
                          <span className="wa-poll-vote-count">{votes}</span>
                        )}
                      </div>
                    </div>
                    {/* Progress bar — always shown after voting */}
                    {hasVoted && (
                      <div className="wa-poll-bar-track">
                        <div
                          className={`wa-poll-bar-fill ${isVoted ? 'wa-poll-bar-fill--voted' : ''}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Divider + View votes */}
          <div className="wa-poll-footer">
            <button className="wa-poll-view-votes" onClick={openVoters}>
              View votes
            </button>
          </div>
        </div>

        {/* Voters panel */}
        {votersPanel && createPortal(
          <div className="voters-overlay" onClick={() => setVotersPanel(false)}>
            <div className="voters-sheet" onClick={(e) => e.stopPropagation()}>
              <div className="voters-header">
                <button className="voters-close" onClick={() => setVotersPanel(false)}>
                  <CloseIcon />
                </button>
                <span className="voters-title">{poll.question}</span>
              </div>

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

              <div className="voters-list">
                {(() => {
                  const displayOptions = votersTab === -1
                    ? poll.options.map((opt, i) => ({ opt, i }))
                    : [{ opt: poll.options[votersTab], i: votersTab }];

                  const rows = [];
                  displayOptions.forEach(({ opt, i }) => {
                    if (votersTab === -1) {
                      rows.push(
                        <div key={`label-${i}`} className="voters-option-label">
                          {opt.text} · {opt.votes?.length || 0}
                        </div>
                      );
                    }
                    if (!opt.votes?.length) {
                      if (votersTab !== -1) {
                        rows.push(<div key="empty" className="voters-empty">No votes yet</div>);
                      }
                      return;
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
                    return <div className="voters-empty">No votes yet</div>;
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

  if (mediaType === 'audio' || message.uploading) {
    return (
      <VoicePlayer
        src={mediaUrl ? `${BASE}${mediaUrl}` : null}
        uploading={!!message.uploading}
        senderAvatar={senderAvatar}
        senderName={senderName}
        isOwn={isOwn}
        time={time}
        status={status}
        messageId={message._id}
        isPlaying={playingAudioId === message._id}
        onPlay={onAudioPlay}
        onEnded={onAudioEnded}
      />
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

/* ══════════════════════════════════════════════════════
   VOICE PLAYER — exact WhatsApp Web style
   Controlled: isPlaying driven from ChatWindow
   Playhead driven by rAF for 60fps smooth movement
   ══════════════════════════════════════════════════════ */
function VoicePlayer({ src, uploading, senderAvatar, senderName, isOwn, time, status, messageId, isPlaying, onPlay, onEnded }) {
  const audioRef     = useRef(null);
  const waveRef      = useRef(null);
  const playheadRef  = useRef(null);   // direct DOM ref — no re-render needed
  const rafRef       = useRef(null);
  const [duration, setDuration] = useState(0);
  const [displaySec, setDisplaySec] = useState(0); // for the text timer only (~1s updates)

  // Stable waveform bar heights — taller in middle, shorter at edges
  const bars = useRef(
    Array.from({ length: 35 }, (_, i) => {
      const center = 17;
      const dist   = Math.abs(i - center) / center;
      const base   = Math.round((1 - dist * 0.6) * 22 + 4);
      return base + Math.round(Math.random() * 6);
    })
  ).current;

  /* ── rAF loop: moves playhead + updates bar colours at 60fps ── */
  const startRAF = () => {
    const tick = () => {
      const a    = audioRef.current;
      const ph   = playheadRef.current;
      const wave = waveRef.current;
      if (!a || !ph || !wave) return;

      const dur = a.duration;
      const cur = a.currentTime;
      if (!isFinite(dur) || dur === 0) { rafRef.current = requestAnimationFrame(tick); return; }

      const pct = cur / dur;

      // Move playhead dot — direct DOM, zero React overhead
      ph.style.left = `calc(${pct * 100}% - 5px)`;

      // Colour bars — direct DOM
      const barEls = wave.querySelectorAll('.vp-bar');
      const played = Math.round(pct * barEls.length);
      barEls.forEach((el, i) => {
        const shouldBePlayed = i < played;
        const isPlayed = el.classList.contains('vp-bar-played');
        if (shouldBePlayed && !isPlayed) {
          el.classList.add('vp-bar-played');
          el.classList.remove('vp-bar-unplayed');
        } else if (!shouldBePlayed && isPlayed) {
          el.classList.remove('vp-bar-played');
          el.classList.add('vp-bar-unplayed');
        }
      });

      // Update text timer at ~4fps to avoid layout thrash
      setDisplaySec((prev) => {
        const rounded = Math.floor(cur);
        return prev !== rounded ? rounded : prev;
      });

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  const stopRAF = () => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
  };

  /* ── Sync play/pause with isPlaying prop ── */
  useEffect(() => {
    const a = audioRef.current;
    if (!a || uploading) return;
    if (isPlaying) {
      a.play().catch(() => {});
      startRAF();
    } else {
      a.pause();
      stopRAF();
    }
    return stopRAF;
  }, [isPlaying, uploading]);

  /* ── Audio events ── */
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onMeta = () => {
      const d = a.duration;
      setDuration(isFinite(d) ? d : 0);
      setDisplaySec(0);
    };
    const onEnd = () => {
      stopRAF();
      setDisplaySec(0);
      // Reset playhead + bars to start
      if (playheadRef.current) playheadRef.current.style.left = '-5px';
      if (waveRef.current) {
        waveRef.current.querySelectorAll('.vp-bar').forEach((el) => {
          el.classList.remove('vp-bar-played');
          el.classList.add('vp-bar-unplayed');
        });
      }
      onEnded?.(messageId);
    };
    a.addEventListener('loadedmetadata', onMeta);
    a.addEventListener('ended', onEnd);
    return () => {
      a.removeEventListener('loadedmetadata', onMeta);
      a.removeEventListener('ended', onEnd);
      stopRAF();
    };
  }, [src, messageId]);

  const togglePlay = () => {
    if (uploading) return;
    onPlay?.(isPlaying ? null : messageId);
  };

  const handleWaveClick = (e) => {
    const a = audioRef.current;
    if (!a || !duration || uploading) return;
    const rect = waveRef.current.getBoundingClientRect();
    const pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    a.currentTime = pct * duration;
    if (!isPlaying) onPlay?.(messageId);
  };

  const fmt = (s) => {
    if (!s || isNaN(s) || !isFinite(s)) return '0:00';
    const m   = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  const renderTicks = () => {
    if (!isOwn) return null;
    const s = status || 'sent';
    if (s === 'read')      return <span className="vp-ticks vp-ticks-read"><DoubleTickIcon /></span>;
    if (s === 'delivered') return <span className="vp-ticks vp-ticks-delivered"><DoubleTickIcon /></span>;
    return <span className="vp-ticks vp-ticks-sent"><SingleTickIcon /></span>;
  };

  return (
    <div className={`vp-bubble ${isOwn ? 'vp-bubble-own' : 'vp-bubble-other'}`}>
      {src && <audio ref={audioRef} src={src} preload="metadata" />}

      {/* Avatar with mic badge */}
      <div className="vp-avatar-wrap">
        {senderAvatar
          ? <img src={`${BASE}${senderAvatar}`} alt={senderName} className="vp-avatar-img" />
          : <DefaultAvatar size="48px" />
        }
        <span className="vp-mic-badge"><VpMicBadgeIcon /></span>
      </div>

      {/* Right side */}
      <div className="vp-right">
        <div className="vp-controls">
          <button className="vp-play-btn" onClick={togglePlay} disabled={uploading}>
            {uploading
              ? <span className="vp-spinner" />
              : isPlaying ? <VpPauseIcon /> : <VpPlayIcon />
            }
          </button>

          {/* Waveform — playhead and bar colours updated via direct DOM in rAF */}
          <div className="vp-wave" ref={waveRef} onClick={handleWaveClick}>
            <span ref={playheadRef} className="vp-playhead" style={{ left: '-5px' }} />
            {bars.map((h, i) => (
              <span key={i} className="vp-bar vp-bar-unplayed" style={{ height: `${h}px` }} />
            ))}
          </div>
        </div>

        <div className="vp-meta-row">
          <span className="vp-duration">
            {fmt(isPlaying || displaySec > 0 ? displaySec : duration)}
          </span>
          <span className="vp-meta-right">
            <span className="vp-time-label">{time}</span>
            {renderTicks()}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── VoicePlayer icons ── */
const VpPlayIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20">
    <path fill="currentColor" d="M8 5v14l11-7z"/>
  </svg>
);
const VpPauseIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20">
    <path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
  </svg>
);
const VpMicBadgeIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14">
    <path fill="currentColor" d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
  </svg>
);
const DoubleTickIcon = () => (
  <svg viewBox="0 0 18 11" width="18" height="11">
    <path d="M17.394.677a.75.75 0 0 1 0 1.06l-9.5 9.5a.75.75 0 0 1-1.06 0l-4-4a.75.75 0 1 1 1.06-1.06l3.47 3.47 8.97-8.97a.75.75 0 0 1 1.06 0z" fill="currentColor"/>
    <path d="M12.894.677a.75.75 0 0 1 0 1.06l-9.5 9.5a.75.75 0 0 1-1.06-1.06l9.5-9.5a.75.75 0 0 1 1.06 0z" fill="currentColor"/>
  </svg>
);
const SingleTickIcon = () => (
  <svg viewBox="0 0 12 11" width="12" height="11">
    <path d="M11.071.653a.75.75 0 0 1 1.06 1.06l-6.5 6.5a.75.75 0 0 1-1.06 0l-3-3a.75.75 0 1 1 1.06-1.06l2.47 2.47 5.97-5.97z" fill="currentColor"/>
  </svg>
);

const MicIcon        = () => null; // kept for legacy, not used
const FileIcon       = () => <svg viewBox="0 0 24 24" width="28" height="28" style={{flexShrink:0}}><path fill="#8696a0" d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/></svg>;
const PollHeaderIcon = () => <svg viewBox="0 0 24 24" width="16" height="16"><path fill="#8696a0" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>;

// Poll icons
const CheckCircleIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22">
    <circle cx="12" cy="12" r="11" fill="#00a884"/>
    <path d="M9 12.5l2.5 2.5 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  </svg>
);
const EmptyCircleIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22">
    <circle cx="12" cy="12" r="10" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.8"/>
  </svg>
);
// Poll subtitle icon — two overlapping check circles
const PollSubIcon = ({ multiSelect, hasVoted }) => (
  <svg viewBox="0 0 24 10" width="28" height="12" style={{flexShrink:0}}>
    <circle cx="6" cy="5" r="4.5" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5"/>
    <circle cx="14" cy="5" r="4.5" fill={hasVoted ? '#00a884' : 'none'} stroke={hasVoted ? '#00a884' : 'rgba(255,255,255,0.5)'} strokeWidth="1.5"/>
    {hasVoted && <path d="M11.5 5l1.5 1.5 3-3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>}
  </svg>
);
const CalendarIcon   = () => <svg viewBox="0 0 24 24" width="13" height="13" style={{flexShrink:0}}><path fill="currentColor" d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z"/></svg>;
const LocationIcon   = () => <svg viewBox="0 0 24 24" width="13" height="13" style={{flexShrink:0}}><path fill="currentColor" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>;
const CloseIcon      = () => <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>;
