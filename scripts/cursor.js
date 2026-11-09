"use strict";

/* Theme tab: cursor settings + the custom page-drawn cursor */

/* THEME TAB: Cursors (rows come from addAssetRow) */
S.cursorsOn = S.cursorsOn !== false;
{
    const h = S.curHot && typeof S.curHot === 'object' ? S.curHot : {};
    const sc = S.curScale && typeof S.curScale === 'object' ? S.curScale : {};
    S.curHot = {};
    S.curScale = {};
    ASSETS.filter(a => a.cursor).forEach(a => {
        S.curHot[a.id] = h[a.id] === 'c' || h[a.id] === 'tl' ? h[a.id] : (a.hot || 'tl');
        S.curScale[a.id] = num(sc[a.id], 50, 200, 100);
    });
}
S.curSize = num(S.curSize, 16, 96, DEF.curSize);
const curOn = $('#cur-on'), curSz = $('#cursz'), curSzOut = $('#out-cursz');
const hotSel = {}, scaleSel = {};
function applyCurSize() {
    root.style.setProperty('--cursz', S.curSize + 'px');
    curSz.value = S.curSize;
    curSzOut.textContent = S.curSize + ' px';
}
curSz.oninput = () => {
    S.curSize = +curSz.value;
    applyCurSize();
    save();
};
function paintCursorPrefs() {
    curOn.checked = S.cursorsOn;
    Object.keys(hotSel).forEach(id => {
        hotSel[id].value = S.curHot[id];
        hotSel[id].disabled = !S.cursorsOn;
        scaleSel[id].sin.value = S.curScale[id];
        scaleSel[id].sout.textContent = S.curScale[id] + '%';
        scaleSel[id].sin.disabled = !S.cursorsOn;
    });
    curSz.disabled = !S.cursorsOn;
}
curOn.onchange = e => {
    S.cursorsOn = e.target.checked;
    if (!S.cursorsOn) {
        curBox.hidden = true;
        root.classList.remove('fakecur');
    }
    paintCursorPrefs();
    save();
    sfx('ui');
};

/*
    CUSTOM CURSOR  (#cursor)
    Browsers refuse big cursor images, so the page draws its own: five stacked
    <img> follow the mouse (mouse only, not touch). 
    Falls back to the system cursor if the normal image cannot load.
*/
const curBox = $('#cursor'), curImg = {}, curOk = {};
['normal', 'select', 'flag', 'hold', 'text'].forEach(k => {
    const im = curImg[k] = curBox.querySelector('[data-k="' + k + '"]');
    curOk[k] = false;
    im.onload = () => { curOk[k] = true; };
    im.onerror = () => { curOk[k] = false; };
});
// crop transparent padding so every cursor is sized by its visible shape 
// (falls back to the original, e.g. on file://)
function trimImage(src) {
    return new Promise(res => {
        const im = new Image();
        im.onload = () => {
            try {
                const k = Math.min(1, 256 / Math.max(im.naturalWidth, im.naturalHeight));
                const w = Math.max(1, Math.round(im.naturalWidth * k)), 
                                    h = Math.max(1, Math.round(im.naturalHeight * k));
                const cv = document.createElement('canvas');
                cv.width = w; cv.height = h;
                const cx = cv.getContext('2d');
                cx.drawImage(im, 0, 0, w, h);
                const d = cx.getImageData(0, 0, w, h).data;
                let x0 = w, y0 = h, x1 = -1, y1 = -1;
                for (let y = 0; y < h; y++) {
                    for (let x = 0; x < w; x++) {
                        if (d[(y * w + x) * 4 + 3] <= 8) continue; // transparent pixel
                        if (x < x0) x0 = x;
                        if (x > x1) x1 = x;
                        if (y < y0) y0 = y;
                        if (y > y1) y1 = y;
                    }
                }
                if (x1 < 0) return res(src);
                const o = document.createElement('canvas');
                o.width = x1 - x0 + 1; o.height = y1 - y0 + 1;
                o.getContext('2d').drawImage(cv, x0, y0, o.width, o.height, 0, 0, o.width, o.height);
                res(o.toDataURL('image/png'));
            } catch (e) { res(src); }
        };
        im.onerror = () => res(src);
        im.src = src;
    });
}
function applyCursor(a) { // a = a cursor entry in ASSETS
    const c = assets[a.id], im = curImg[a.key], src = c ? c.url : a.def, tok = im._t = (im._t || 0) + 1;
    curOk[a.key] = false;
    im.dataset.hot = S.curHot[a.id];
    im.style.setProperty('--k', S.curScale[a.id] / 100);
    trimImage(src).then(u => { if (im._t === tok) im.src = u; });
}
// which cursor is under the pointer:
// normal by default; select while left is held; flag on right-button or over hidden cells in flag mode;
// hold while dragging the grip; text over text boxes and the resize corner
function curState(t, buttons) {
    if (!t || !t.closest) return 'normal';
    if (t.closest('input[type=text], textarea, .rsz')) return 'text';
    const moving = frame.classList.contains('moving');
    if (t.closest('.grip') || moving) return (buttons & 1) || moving ? 'hold' : 'normal';
    if (buttons & 2) return 'flag';
    const c = t.closest('.c');
    const overHidden = !!c && !c.classList.contains('r');
    if (flagMode && overHidden) return 'flag';
    if (buttons & 1) return 'select';
    return 'normal';
}
function paintCursor(e) {
    if (e.pointerType !== 'mouse') {
        curBox.hidden = true;
        root.classList.remove('fakecur');
        return;
    }
    const on = S.cursorsOn && curOk.normal;
    root.classList.toggle('fakecur', on);
    if (!on) {
        curBox.hidden = true;
        return;
    }
    let st = curState(e.target, e.buttons);
    if (st && !curOk[st]) st = 'normal';
    if (!st) {
        curBox.hidden = true;
        return;
    }
    curBox.hidden = false;
    if (curBox.dataset.state !== st) curBox.dataset.state = st;
    // CSS swings normal/select/flag only
    if (e.buttons & 3) curBox.dataset.down = '';
    else delete curBox.dataset.down;
    curBox.style.transform = 'translate3d(' + e.clientX + 'px,' + e.clientY + 'px,0)';
}
['pointermove', 'pointerdown', 'pointerup'].forEach(t => document.addEventListener(t, paintCursor, { passive: true }));
document.addEventListener('pointercancel', () => {
    delete curBox.dataset.down;
    curBox.dataset.state = 'normal';
});
addEventListener('blur', () => {
    delete curBox.dataset.down;
    curBox.dataset.state = 'normal';
});
root.addEventListener('mouseleave', () => {
    curBox.hidden = true;
});
