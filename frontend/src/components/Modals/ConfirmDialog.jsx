import './ConfirmDialog.css';

export default function ConfirmDialog({ icon, title, message, confirmLabel, cancelLabel, confirmDanger, onConfirm, onCancel, children }) {
  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="confirm-card" onClick={(e) => e.stopPropagation()}>
        {icon && <div className="confirm-icon">{icon}</div>}
        <h3 className="confirm-title">{title}</h3>
        {message && <p className="confirm-message">{message}</p>}
        {children}
        <div className="confirm-actions">
          <button className="confirm-btn cancel" onClick={onCancel}>
            {cancelLabel || 'Cancel'}
          </button>
          <button className={`confirm-btn ${confirmDanger ? 'danger' : 'primary'}`} onClick={onConfirm}>
            {confirmLabel || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
