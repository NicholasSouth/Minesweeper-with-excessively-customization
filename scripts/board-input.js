"use strict";

/* Scroll lock, mouse / touch / keyboard input on the board */

/* lock: freezes page and sidebar scrolling; the board itself can still pan and zoom */
let locked = false, lockX = 0, lockY = 0;
const lockBadge = $('#lockbadge');
// scroll a cell into view; when locked only the board window moves, never the page
function showCell(i) {
    if (!locked) {
        cells[i].scrollIntoView({ block: 'nearest', inline: 'nearest' });
        return;
    }
    const w = wrap.getBoundingClientRect(), c = cells[i].getBoundingClientRect();
    if (c.left < w.left) wrap.scrollLeft -= w.left - c.left;
    else if (c.right > w.right) wrap.scrollLeft += c.right - w.right;
    if (c.top < w.top) wrap.scrollTop -= w.top - c.top;
    else if (c.bottom > w.bottom) wrap.scrollTop += c.bottom - w.bottom;
}
// bring the keyboard back to the board, on the last cell used (the first one if none yet)
// scroll the board into view, and the "Best on this board" line under it when both fit on screen
function showFrameAndBest(pad) {
    frame.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    const f = frame.getBoundingClientRect(), n = $('#info-line').getBoundingClientRect(),
        room = innerHeight - pad;
    if (n.bottom > room && n.bottom - f.top <= room) scrollBy(0, n.bottom - room);
}
function focusBoard() {
    if (!g || !cells.length) return;
    showBest();
    if (!(cur >= 0 && cur < g.n)) cur = 0;
    // on a phone the sidebar covers the board, so close it
    if (isOpen() && matchMedia('(max-width: 700px)').matches) toggleSettings(false);
    board.focus({ preventScroll: true });
    if (!locked) showFrameAndBest(12);
    showCell(cur);
    draw();
}
function setLock(on) {
    if (on === locked) return;
    if (on) {
        showFrameAndBest(12); // board and best time on screen first, the same view as the jump to board
        // the page scrollbar disappears when locked: pad by its width so nothing jumps
        root.style.setProperty('--sbw', Math.max(0, innerWidth - root.clientWidth) + 'px');
    }
    if (on) {
        // freeze the page where it is: remember the scroll position and keep the page from getting
        // shorter (a shorter page makes the browser pull the scroll position up, and the board slides)
        lockX = scrollX;
        lockY = scrollY;
        root.style.setProperty('--lock-h', root.scrollHeight + 'px');
    }
    locked = on;
    root.classList.toggle('locked', on);
    lockBadge.hidden = !on;
    if (on) focusBoard();
    sfx('ui');
}
// overflow:hidden stops the person scrolling, not the browser or the page's own code (focus, scrollIntoView,
// layout changes after a win or loss...): while locked, any page scroll is put straight back
addEventListener('scroll', () => {
    if (locked && (scrollX !== lockX || scrollY !== lockY)) scrollTo(lockX, lockY);
}, { passive: true });
// wheel and touch scrolling outside the board window do nothing while locked
['wheel', 'touchmove'].forEach(t => addEventListener(t, e => {
    if (locked && !e.ctrlKey && !wrap.contains(e.target)) e.preventDefault();
}, { passive: false }));

/* board: mouse, touch, keyboard */
const ptrs = new Map();   // pointers down on the board: id -> {x, y}
let pan = null, pinch = null, panned = false;
const canPan = () => wrap.scrollWidth > wrap.clientWidth || wrap.scrollHeight > wrap.clientHeight;
board.addEventListener('contextmenu', e => e.preventDefault());
board.addEventListener('pointerdown', e => {
    const c = e.target.closest('[data-i]');
    if (!c) return;
    cur = +c.dataset.i;
    lpFired = false;
    if (e.button === 0 && g.status !== 'won' && g.status !== 'lost') face('oh');
    if (e.pointerType !== 'mouse') {
        clearTimeout(lp);
        lp = setTimeout(() => {
            if (panned || ptrs.size > 1) return; // a pan or pinch is not a long-press
            lpFired = true;
            doFlag(cur);
            navigator.vibrate && navigator.vibrate(15);
        }, 350);
    }
});
board.addEventListener('pointerup', e => {
    clearTimeout(lp);
    face();
    const c = e.target.closest('[data-i]');
    if (!c || lpFired || panned) return; // a drag pans, it never opens a cell
    const i = +c.dataset.i;
    if (e.button === 2 || (flagMode && e.button === 0)) doFlag(i);
    else if (e.button === 1) doChord(i);
    else if (e.button === 0) g.st[i] === 1 ? doChord(i) : doReveal(i);
});
['pointercancel', 'pointerleave'].forEach(t => board.addEventListener(t, () => {
    clearTimeout(lp);
    face();
}));
// drag (mouse, pen, one finger) pans; two fingers pinch-zoom
board.addEventListener('pointerdown', e => {
    if (ptrs.size === 0) panned = false;
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 1) {
        pan = e.button === 0 || e.button === 1
            ? { id: e.pointerId, x: e.clientX, y: e.clientY, sl: wrap.scrollLeft, st: wrap.scrollTop }
            : null;
    } else if (ptrs.size === 2 && e.pointerType !== 'mouse') {
        const [a, b] = [...ptrs.values()];
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
        panned = true; // the whole gesture is navigation, not a tap
        pan = null;
        clearTimeout(lp);
        face();
    }
});
board.addEventListener('pointermove', e => {
    const p = ptrs.get(e.pointerId);
    if (!p) return;
    p.x = e.clientX;
    p.y = e.clientY;
    if (pinch && ptrs.size === 2) {
        const [a, b] = [...ptrs.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        if (pinch.d > 0 && d > 0) setZoom(zoom * d / pinch.d, mx, my);
        wrap.scrollLeft -= mx - pinch.mx;
        wrap.scrollTop -= my - pinch.my;
        pinch.d = d;
        pinch.mx = mx;
        pinch.my = my;
        return;
    }
    if (!pan || e.pointerId !== pan.id) return;
    const dx = e.clientX - pan.x, dy = e.clientY - pan.y;
    if (!panned) {
        if (Math.hypot(dx, dy) < 8 || !canPan()) return; // small jitter is still a click
        panned = true;
        clearTimeout(lp);
        face();
        try { board.setPointerCapture(e.pointerId); } catch (err) {}
    }
    wrap.scrollLeft = pan.sl - dx;
    wrap.scrollTop = pan.st - dy;
});
['pointerup', 'pointercancel', 'pointerleave'].forEach(t => board.addEventListener(t, e => {
    ptrs.delete(e.pointerId);
    if (ptrs.size < 2) pinch = null;
    if (pan && pan.id === e.pointerId) pan = null;
}));
board.addEventListener('keydown', e => {
    if (capturing) return;
    const cols = g.cols;
    let d = 0;
    if (isKey('left', e) && cur % cols) d = -1;
    else if (isKey('right', e) && cur % cols < cols - 1) d = 1;
    else if (isKey('up', e) && cur >= cols) d = -cols;
    else if (isKey('down', e) && cur < g.n - cols) d = cols;
    if (d) {
        cur += d;
        draw();
        showCell(cur);
        e.preventDefault();
        return;
    }
    if (isKey('reveal', e)) {
        e.preventDefault();
        g.st[cur] === 1 ? doChord(cur) : doReveal(cur);
    } else if (isKey('flag', e)) {
        doFlag(cur);
    } else if (isKey('zin', e)) {
        zoomAtCursor(ZSTEP);
    } else if (isKey('zout', e)) {
        zoomAtCursor(1 / ZSTEP);
    } else if (isKey('zreset', e)) {
        resetView();
    } else if (isKey('lreset', e)) {
        resetLayout();
    }
});
// global keys: work from anywhere except text boxes and the credits popup
document.addEventListener('keydown', e => {
    if (capturing || e.repeat || isTyping(e.target) || !$('#credit').hidden) return;
    // the board key also closes the settings menu
    if (isKey('focus', e) && isOpen()) toggleSettings(false);
    if (isKey('focus', e)) {
        // C (default): jump to the board and lock the view. While locked, C unlocks if the board already
        // has the keyboard, and brings the keyboard back to the board if it was elsewhere.
        e.preventDefault();
        if (locked && document.activeElement !== board) focusBoard();
        else setLock(!locked);
        if (!locked) focusBoard();
    } else if (isKey('settings', e)) {
        e.preventDefault();
        const open = !isOpen();
        toggleSettings(open);
        if (!open) board.focus({ preventScroll: true }); // back to playing with the keyboard
        sfx('ui');
    } else if (isKey('mute', e)) {
        e.preventDefault();
        $('#mute').click(); // same as the header button
    } else if (isKey('restart', e)) {
        start();
    }
});
