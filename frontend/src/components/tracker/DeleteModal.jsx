import { useEffect } from 'react';

export default function DeleteModal({ t, onCancel, onConfirm }) {
    useEffect(() => {
        const onKeyDown = (e) => { if (e.key === 'Escape') onCancel(); };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [onCancel]);

    return (
        <div
            className="modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
        >
            <div className="modal-card">
                <span className="modal-alert-icon">⚠️</span>
                <h4 id="modal-title">{t.deleteModalTitle}</h4>
                <p>{t.deleteModalDesc}</p>
                <div className="modal-btn-row">
                    <button type="button" className="btn-modal-cancel" onClick={onCancel}>{t.btnCancel}</button>
                    <button type="button" className="btn-modal-delete" onClick={onConfirm} autoFocus>{t.btnDelete}</button>
                </div>
            </div>
        </div>
    );
}
