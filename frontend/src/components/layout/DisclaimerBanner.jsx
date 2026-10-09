import { Info } from 'lucide-react';

export default function DisclaimerBanner({ t }) {
    return (
        <div className="notice" role="note" aria-label="Medical disclaimer">
            <div className="notice-inner">
                <Info aria-hidden="true" />
                <span>{t.noticeShort}</span>
            </div>
        </div>
    );
}
