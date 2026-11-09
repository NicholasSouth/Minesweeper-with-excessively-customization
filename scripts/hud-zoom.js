"use strict";

/* Game area: HUD (mines left, face, timer) and zoom bar */

/* hud: mines left, face, timer */
const face = x => {
    $('#face').dataset.face = x || { 
        idle: 'default', playing: 'default', won: 'win', lost: 'die' 
    }[g.status];
};
function hud() {
    const v = g.mines - g.flags;
    const el = $('#mleft'), t = v < 0 ? '-' + String(-v).slice(-2).padStart(2, '0') : 
                String(v).padStart(3, '0');
    if (el.textContent !== t) {
        el.textContent = t;
        if (!reduce.matches) 
            el.animate([
                        { transform: 'scale(1.22)' }, 
                        { transform: 'scale(1)' }], 
                        { duration: 220, easing: 'ease-out' });
    }
    face();
}
function clock() {
    const s = g.status === 'idle' ? 0 : Math.min(999, Math.floor((performance.now() - t0) / 1000));
    $('#tm').textContent = String(s).padStart(3, '0');
}
$('#face').onclick = () => {
    start();
    sfx('ui');
};
/* zoom bar: zoom changes the cell size (--cs); panning drags the .wrap scroll */
const ZMIN = 0.4, ZMAX = 4, ZSTEP = 1.25;
function paintZoom() {
    $('#zlvl').textContent = Math.round(zoom * 100) + '%';
    $('#zout').disabled = zoom <= ZMIN + 0.001;
    $('#zin').disabled = zoom >= ZMAX - 0.001;
    $('#zreset').disabled = zoom === 1 && !wrap.scrollLeft && !wrap.scrollTop;
}
// zoom to z, keeping page point (ax, ay) fixed on screen (default: middle of the view)
function setZoom(z, ax, ay) {
    z = Math.min(ZMAX, Math.max(ZMIN, z));
    if (Math.abs(z - 1) < 0.01) z = 1;
    if (z === zoom) return;
    const r = wrap.getBoundingClientRect();
    const mx = ax == null ? wrap.clientWidth / 2 : ax - r.left;
    const my = ay == null ? wrap.clientHeight / 2 : ay - r.top;
    const gx = (wrap.scrollLeft + mx) / csNow, gy = (wrap.scrollTop + my) / csNow; // position in cells
    zoom = z;
    fit();
    wrap.scrollLeft = gx * csNow - mx;
    wrap.scrollTop = gy * csNow - my;
    paintZoom();
}
function zoomAtCursor(f) { // keyboard zoom, centred on the keyboard cursor's cell
    const r = cells[cur].getBoundingClientRect();
    setZoom(zoom * f, r.left + r.width / 2, r.top + r.height / 2);
}
function resetView() {
    zoom = 1;
    fit();
    wrap.scrollLeft = 0;
    wrap.scrollTop = 0;
    paintZoom();
}
$('#zin').onclick = () => {
    setZoom(zoom * ZSTEP);
    sfx('ui');
};
$('#zout').onclick = () => {
    setZoom(zoom / ZSTEP);
    sfx('ui');
};
$('#zreset').onclick = () => {
    resetView();
    sfx('ui');
};
lreset.onclick = () => {
    resetLayout();
    sfx('ui');
};
wrap.addEventListener('scroll', paintZoom);
// Ctrl + wheel (or trackpad pinch) zooms at the pointer; a plain wheel scrolls
wrap.addEventListener('wheel', e => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    setZoom(zoom * Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY);
}, { passive: false });
