"use strict";

/* Boot: restore uploads, apply every saved setting, start the first game */

/* BOOT  */
ASSETS.forEach(addAssetRow);
// restore uploads from an earlier visit: sounds (slot id), fonts, images ("img:<id>")
idb.all().then(list => {
    list.forEach(([k, v]) => {
        if (!v || !v.blob) return;
        if (SLOT[k]) {
            setCustom(k, v.blob, v.name || 'Custom sound');
        } else if (k === 'font' || k === 'font-num') {
            useFont(k === 'font' ? T.ui : T.num, v.blob, v.name || 'Custom font')
                .then(applyFont)
                .catch(() => {});
        } else if (k.startsWith('img:') && ASSET[k.slice(4)]) {
            setAsset(ASSET[k.slice(4)], v.blob, v.name || 'Custom image');
        }
    });
}).catch(() => {});

applyFont();
applyFx();
applyCurSize();
paintCursorPrefs();
paintBoardBg();
paintAppBg();
paintPreview();
applyLayout();
applyTheme();
applyMute();
applyAudio();
sync();
start();

// repeat visits load from the device (needs https; skipped on file://)
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
