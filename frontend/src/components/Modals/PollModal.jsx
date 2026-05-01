import { useState } from 'react';
import './Modal.css';

export default function PollModal({ onClose, onSend }) {
  const [question, setQuestion]     = useState('');
  const [options, setOptions]       = useState(['', '']);
  const [multiSelect, setMultiSelect] = useState(false);

  const addOption = () => {
    if (options.length < 12) setOptions([...options, '']);
  };

  const updateOption = (i, val) => {
    const next = [...options];
    next[i] = val;
    setOptions(next);
  };

  const removeOption = (i) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, idx) => idx !== i));
  };

  const validOptions = options.filter((o) => o.trim());
  const canSend = question.trim() && validOptions.length >= 2;

  const handleSend = () => {
    if (!canSend) return;
    onSend({
      question: question.trim(),
      options: validOptions.map((o) => ({ text: o.trim(), votes: [] })),
      multiSelect,
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-sheet-header">
          <button className="modal-back" onClick={onClose}>
            <BackArrowIcon />
          </button>
          <span>New Poll</span>
          <button className="modal-send-btn" onClick={handleSend} disabled={!canSend}>
            Send
          </button>
        </div>

        <div className="modal-sheet-body">
          {/* Question */}
          <div className="modal-field">
            <label>Question</label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question..."
              maxLength={255}
              rows={2}
              autoFocus
            />
            <span className="modal-char">{255 - question.length}</span>
          </div>

          {/* Options */}
          <div className="poll-options-section">
            <div className="modal-section-label">Options <span className="poll-options-hint">(min 2, max 12)</span></div>
            {options.map((opt, i) => (
              <div key={i} className="poll-option-input-row">
                <span className="poll-option-num">{i + 1}</span>
                <input
                  value={opt}
                  onChange={(e) => updateOption(i, e.target.value)}
                  placeholder={`Option ${i + 1}`}
                  maxLength={100}
                  className="poll-option-input"
                />
                {options.length > 2 && (
                  <button className="poll-remove-btn" onClick={() => removeOption(i)} title="Remove">
                    <RemoveIcon />
                  </button>
                )}
              </div>
            ))}

            {options.length < 12 && (
              <button className="modal-add-option" onClick={addOption}>
                <AddIcon /> Add option
              </button>
            )}
          </div>

          {/* Multi-select toggle */}
          <div className="modal-toggle-row">
            <div className="poll-toggle-info">
              <span className="poll-toggle-label">Allow multiple answers</span>
              <span className="poll-toggle-sub">Voters can select more than one option</span>
            </div>
            <label className="toggle">
              <input type="checkbox" checked={multiSelect} onChange={(e) => setMultiSelect(e.target.checked)} />
              <span className="toggle-slider" />
            </label>
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
const AddIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" style={{marginRight:4}}>
    <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
  </svg>
);
const RemoveIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16">
    <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
  </svg>
);
