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
            <div className="panel modal">
                <h2 id="modal-title">{t.deleteModalTitle}</h2>
                <p>{t.deleteModalDesc}</p>
                <div className="modal-actions">
                    <button type="button" className="btn btn-ghost" onClick={onCancel}>{t.btnCancel}</button>
                    <button type="button" className="btn btn-danger" onClick={onConfirm} autoFocus>{t.btnDelete}</button>
                </div>
            </div>
        </div>
    );
}
