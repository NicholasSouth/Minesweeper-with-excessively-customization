"use strict";

/* Game area: movable/resizable board window (grip bar + resize corner) */

/* GAME AREA: grip -> hud -> zoombar -> board -> resize corner -> info */
const frame = $('.frame'), wrap = $('.wrap'), board = $('#board');
const grip = $('#grip'), rsz = $('#rsz'), lreset = $('#lreset');
/* grip bar: move the board (position + size are saved) */
{
    const l = S.layout && typeof S.layout === 'object' ? S.layout : {};
    const ok = l.w != null && l.h != null;
    S.layout = {
        x: num(l.x, -5000, 5000, 0),
        y: num(l.y, -5000, 5000, 0),
        w: ok ? num(l.w, 180, 4000, null) : null,
        h: ok ? num(l.h, 140, 4000, null) : null
    };
}
const LAY_MIN_W = 180, LAY_MIN_H = 140;
function paintLayout() {
    const L = S.layout;
    lreset.disabled = !L.x && !L.y && L.w == null;
}
function applyLayout() {
    const L = S.layout, free = L.w != null && L.h != null;
    frame.style.setProperty('--mx', L.x + 'px');
    frame.style.setProperty('--my', L.y + 'px');
    frame.classList.toggle('free', free);
    wrap.style.width = free ? L.w + 'px' : '';
    wrap.style.height = free ? L.h + 'px' : '';
    paintLayout();
}
function setPos(x, y) { // move, then nudge back if the board would leave the screen
    const L = S.layout;
    L.x = Math.round(x);
    L.y = Math.round(y);
    applyLayout();
    const r = frame.getBoundingClientRect(), m = 80;
    let dx = 0, dy = 0;
    if (r.right < m) dx = m - r.right; 
    else if (r.left > innerWidth - m) dx = innerWidth - m - r.left;
    if (r.top + scrollY < 0) dy = -(r.top + scrollY); 
    else if (r.top > innerHeight - 40) dy = innerHeight - 40 - r.top;
    if (dx || dy) {
        L.x += Math.round(dx);
        L.y += Math.round(dy);
        applyLayout();
    }
}
function resetLayout(instant) {
    const w0 = wrap.offsetWidth, h0 = wrap.offsetHeight;
    S.layout = { x: 0, y: 0, w: null, h: null };
    if (instant || reduce.matches) {
        applyLayout();
        save();
        return;
    }
    // measure the natural size, then glide from the current one to it
    frame.classList.remove('free');
    wrap.style.width = wrap.style.height = '';
    const w1 = wrap.offsetWidth, h1 = wrap.offsetHeight;
    if (w0 !== w1 || h0 !== h1) {
        frame.classList.add('free');
        wrap.style.width = w0 + 'px';
        wrap.style.height = h0 + 'px';
        void wrap.offsetWidth;
    }
    frame.classList.add('glide');
    frame.style.setProperty('--mx', '0px');
    frame.style.setProperty('--my', '0px');
    wrap.style.width = w1 + 'px';
    wrap.style.height = h1 + 'px';
    setTimeout(() => {
        frame.classList.remove('glide');
        applyLayout();
    }, 480);
    paintLayout();
    save();
}
let mv = null;
grip.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    mv = { sx: e.clientX, sy: e.clientY, x: S.layout.x, y: S.layout.y };
    grip.setPointerCapture(e.pointerId);
    frame.classList.add('moving');
    e.preventDefault();
});
grip.addEventListener('pointermove', e => {
    if (mv) setPos(mv.x + e.clientX - mv.sx, mv.y + e.clientY - mv.sy);
});
['pointerup', 'pointercancel'].forEach(t => grip.addEventListener(t, () => {
    if (!mv) return;
    mv = null;
    frame.classList.remove('moving');
    save();
}));
grip.addEventListener('dblclick', () => {
    resetLayout();
    sfx('ui');
});
grip.addEventListener('keydown', e => {
    const st = e.shiftKey ? 40 : 10;
    const d = { 
        ArrowLeft: [-st, 0], 
        ArrowRight: [st, 0], 
        ArrowUp: [0, -st], 
        ArrowDown: [0, st] }[e.key];
    if (d) {
        setPos(S.layout.x + d[0], S.layout.y + d[1]);
        save();
        e.preventDefault();
    } else if (e.key === 'Home') {
        resetLayout();
        e.preventDefault();
    }
});
addEventListener('resize', () => setPos(S.layout.x, S.layout.y));

/* --- resize corner: sets the size of the board window --- */
let sz = null;
rsz.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    sz = { sx: e.clientX, sy: e.clientY, w: wrap.offsetWidth, h: wrap.offsetHeight };
    rsz.setPointerCapture(e.pointerId);
    frame.classList.add('sizing');
    e.preventDefault();
});
rsz.addEventListener('pointermove', e => {
    if (!sz) return;
    S.layout.w = Math.round(Math.min(4000, Math.max(LAY_MIN_W, sz.w + e.clientX - sz.sx)));
    S.layout.h = Math.round(Math.min(4000, Math.max(LAY_MIN_H, sz.h + e.clientY - sz.sy)));
    applyLayout();
});
['pointerup', 'pointercancel'].forEach(t => rsz.addEventListener(t, () => {
    if (!sz) return;
    sz = null;
    frame.classList.remove('sizing');
    save();
}));
rsz.addEventListener('dblclick', () => {
    resetLayout();
    sfx('ui');
});
