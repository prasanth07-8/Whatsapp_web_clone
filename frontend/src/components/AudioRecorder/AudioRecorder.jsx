import { useState, useRef, useEffect } from 'react';
import './AudioRecorder.css';

export default function AudioRecorder({ onSend, onCancel }) {
  const [recording, setRecording]   = useState(false);
  const [seconds, setSeconds]       = useState(0);
  const [audioBlob, setAudioBlob]   = useState(null);
  const [audioUrl, setAudioUrl]     = useState(null);
  const mediaRef    = useRef(null);
  const chunksRef   = useRef([]);
  const timerRef    = useRef(null);

  // Start recording immediately on mount
  useEffect(() => {
    startRecording();
    return () => {
      stopTimer();
      if (mediaRef.current) mediaRef.current.stop();
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRef.current = mr;
      chunksRef.current = [];

      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };

      mr.start();
      setRecording(true);
      startTimer();
    } catch {
      onCancel();
    }
  };

  const startTimer = () => {
    timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
  };

  const stopTimer = () => {
    clearInterval(timerRef.current);
  };

  const stopRecording = () => {
    if (mediaRef.current && recording) {
      mediaRef.current.stop();
      setRecording(false);
      stopTimer();
    }
  };

  const handleSend = () => {
    if (audioBlob) onSend(audioBlob);
  };

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="audio-recorder">
      {!audioUrl ? (
        // Recording state
        <>
          <button className="ar-cancel" onClick={onCancel} title="Cancel">
            <TrashIcon />
          </button>
          <div className="ar-recording">
            <span className="ar-dot" />
            <span className="ar-timer">{fmt(seconds)}</span>
          </div>
          <button className="ar-stop" onClick={stopRecording} title="Stop recording">
            <StopIcon />
          </button>
        </>
      ) : (
        // Preview state
        <>
          <button className="ar-cancel" onClick={onCancel} title="Cancel">
            <TrashIcon />
          </button>
          <audio controls src={audioUrl} className="ar-preview" />
          <button className="ar-send" onClick={handleSend} title="Send">
            <SendIcon />
          </button>
        </>
      )}
    </div>
  );
}

const TrashIcon = () => <svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>;
const StopIcon  = () => <svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M6 6h12v12H6z"/></svg>;
const SendIcon  = () => <svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M1.101 21.757L23.8 12.028 1.101 2.3l.011 7.912 13.623 1.816-13.623 1.817-.011 7.912z"/></svg>;
