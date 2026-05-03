import { useState, useRef, useEffect } from 'react';
import './AudioRecorder.css';

/**
 * WhatsApp Web-style audio recorder.
 * Layout (left → right):
 *   [empty spacer] | trash | red-dot | timer | waveform | pause/resume | green-send
 */
export default function AudioRecorder({ onSend, onCancel }) {
  const [seconds, setSeconds]   = useState(0);
  const [paused, setPaused]     = useState(false);
  const [bars, setBars]         = useState(Array(30).fill(3));

  const mediaRef      = useRef(null);
  const streamRef     = useRef(null);
  const chunksRef     = useRef([]);
  const timerRef      = useRef(null);
  const startedRef    = useRef(false);
  const analyserRef   = useRef(null);
  const animFrameRef  = useRef(null);
  const audioCtxRef   = useRef(null);

  /* ── Mount: start recording once (guard against StrictMode double-invoke) ── */
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    startRecording();

    return () => {
      stopTimer();
      cancelAnimationFrame(animFrameRef.current);
      audioCtxRef.current?.close();
      if (mediaRef.current?.state !== 'inactive') mediaRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  /* ── Start microphone + MediaRecorder + waveform ── */
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Web Audio analyser for waveform
      const ctx      = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;
      const source   = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;
      animateWaveform();

      const mr = new MediaRecorder(stream);
      mediaRef.current = mr;
      chunksRef.current = [];

      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };

      mr.start();
      startTimer();
    } catch {
      onCancel();
    }
  };

  /* ── Timer ── */
  const startTimer = () => {
    stopTimer();
    timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
  };
  const stopTimer = () => { clearInterval(timerRef.current); timerRef.current = null; };

  /* ── Waveform animation ── */
  const animateWaveform = () => {
    const tick = () => {
      const analyser = analyserRef.current;
      if (!analyser) return;
      const data = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(data);
      setBars(Array.from({ length: 30 }, (_, i) => {
        const idx = Math.floor((i / 30) * data.length);
        return Math.max(3, Math.round((data[idx] / 255) * 26));
      }));
      animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);
  };

  /* ── Pause / Resume ── */
  const handlePauseResume = () => {
    const mr = mediaRef.current;
    if (!mr) return;
    if (paused) {
      mr.resume();
      startTimer();
      animateWaveform();
      setPaused(false);
    } else {
      mr.pause();
      stopTimer();
      cancelAnimationFrame(animFrameRef.current);
      setBars(Array(30).fill(3)); // flatten waveform when paused
      setPaused(true);
    }
  };

  /* ── Delete ── */
  const handleDelete = () => {
    stopTimer();
    cancelAnimationFrame(animFrameRef.current);
    audioCtxRef.current?.close();
    if (mediaRef.current?.state !== 'inactive') mediaRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    onCancel();
  };

  /* ── Send ── */
  const handleSend = () => {
    stopTimer();
    cancelAnimationFrame(animFrameRef.current);
    audioCtxRef.current?.close();
    const mr = mediaRef.current;
    if (!mr) return;

    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      streamRef.current?.getTracks().forEach((t) => t.stop());
      onSend(blob);
    };
    if (mr.state !== 'inactive') mr.stop();
    else {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      onSend(blob);
    }
  };

  const fmt = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="ar-bar">
      {/* Left spacer — mirrors the + button width on the left of normal input */}
      <div className="ar-spacer" />

      {/* Pill */}
      <div className="ar-pill">
        {/* Trash */}
        <button className="ar-btn ar-trash" onClick={handleDelete} title="Delete recording">
          <TrashIcon />
        </button>

        {/* Red dot */}
        <span className={`ar-dot${paused ? ' ar-dot--paused' : ''}`} />

        {/* Timer */}
        <span className="ar-timer">{fmt(seconds)}</span>

        {/* Waveform */}
        <div className="ar-wave">
          {bars.map((h, i) => (
            <span
              key={i}
              className="ar-wave-bar"
              style={{ height: `${h}px`, opacity: paused ? 0.35 : 1 }}
            />
          ))}
        </div>

        {/* Pause / Resume */}
        <button className="ar-btn ar-pause" onClick={handlePauseResume} title={paused ? 'Resume' : 'Pause'}>
          {paused ? <ResumeIcon /> : <PauseIcon />}
        </button>
      </div>

      {/* Green send button — outside pill, matches normal send-btn */}
      <button className="ar-send" onClick={handleSend} title="Send">
        <SendIcon />
      </button>
    </div>
  );
}

/* ── Icons ── */
const TrashIcon  = () => (
  <svg viewBox="0 0 24 24" width="20" height="20">
    <path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
  </svg>
);
const PauseIcon  = () => (
  <svg viewBox="0 0 24 24" width="20" height="20">
    <path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
  </svg>
);
const ResumeIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20">
    <path fill="currentColor" d="M8 5v14l11-7z"/>
  </svg>
);
const SendIcon   = () => (
  <svg viewBox="0 0 24 24" width="22" height="22">
    <path fill="currentColor" d="M1.101 21.757L23.8 12.028 1.101 2.3l.011 7.912 13.623 1.816-13.623 1.817-.011 7.912z"/>
  </svg>
);
