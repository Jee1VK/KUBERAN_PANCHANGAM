// ============================================================
//  js/exportUtils.js — Export, Sharing & Calendar Sync Utility
//  WhatsApp share links, .ics Calendar file generator, and
//  1-page PDF print helper.
// ============================================================

function shareToWhatsApp(title, detailsText) {
    const message = `🕉️ *${title}* \n\n${detailsText}\n\n_Computed via Kuberan Panchangam (kuberansilks.com)_`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    if (typeof window !== 'undefined' && typeof window.open === 'function') {
        window.open(url, '_blank', 'noopener,noreferrer');
    }
    return url;
}

function generateICSFile(eventName, eventDateYYYYMMDD, startTimeHHMM, endTimeHHMM, description, location) {
    const cleanDate = String(eventDateYYYYMMDD || '').replace(/-/g, '');
    const cleanStart = String(startTimeHHMM || '0600').replace(/:/g, '').slice(0, 4);
    const cleanEnd = String(endTimeHHMM || '1800').replace(/:/g, '').slice(0, 4);
    const start = `${cleanDate}T${cleanStart}00`;
    const end = `${cleanDate}T${cleanEnd}00`;

    const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Kuberan Silks//Kuberan Panchangam//EN',
        'CALSCALE:GREGORIAN',
        'BEGIN:VEVENT',
        `SUMMARY:${eventName}`,
        `DESCRIPTION:${(description || 'Auspicious observance from Kuberan Panchangam').replace(/\n/g, '\\n')}`,
        `LOCATION:${location || 'Bengaluru, Karnataka'}`,
        `DTSTART:${start}`,
        `DTEND:${end}`,
        'END:VEVENT',
        'END:VCALENDAR'
    ].join('\r\n');

    if (typeof window !== 'undefined' && typeof Blob !== 'undefined' && typeof document !== 'undefined') {
        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.setAttribute('download', `${String(eventName).replace(/[^a-zA-Z0-9_-]+/g, '_')}_muhurtha.ics`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    return icsContent;
}

function triggerPrintReport() {
    if (typeof window !== 'undefined' && typeof window.print === 'function') {
        window.print();
    }
}

if (typeof window !== 'undefined') {
    window.shareToWhatsApp = shareToWhatsApp;
    window.generateICSFile = generateICSFile;
    window.triggerPrintReport = triggerPrintReport;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        shareToWhatsApp,
        generateICSFile,
        triggerPrintReport
    };
}
