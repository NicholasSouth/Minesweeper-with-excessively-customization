"use strict";

/* Effects: explosion, splash, shake, confetti, button ripple + Effects tab */

/* board: effects (all skipped with reduced motion) */
function burst(cell) { // explosion: fireball, shockwaves, sparks
    const fx = document.createElement('div');
    fx.className = 'fx';
    // the cell sits at a known spot in the grid, so no layout read is needed
    const ci = +cell.dataset.i;
    fx.style.left = ((ci % g.cols + .5) * csNow) + 'px';
    fx.style.top = (((ci / g.cols | 0) + .5) * csNow) + 'px';
    fx.innerHTML = '<i class="core"></i><i class="ring"></i><i class="ring r2"></i>';
    const cols = ['var(--danger)', 'var(--n5)', 'var(--fx-fire)', 'var(--text)'];
    for (let n = 0; n < 22; n++) {
        const sp = document.createElement('i'), a = rnd(0, Math.PI * 2), d = csNow * rnd(1.2, 3.6);
        sp.className = 'spark';
        sp.style.setProperty('--dx', Math.cos(a) * d + 'px');
        sp.style.setProperty('--dy', Math.sin(a) * d + 'px');
        sp.style.setProperty('--sz', rnd(4, 9) + 'px');
        sp.style.setProperty('--dur', rnd(450, 950) + 'ms');
        sp.style.setProperty('--c', cols[n % cols.length]);
        fx.appendChild(sp);
    }
    board.appendChild(fx);
    setTimeout(() => fx.remove(), 1200);
}
// new board, two effects (each has its own switch in the Effects tab, colors are --glow1/--glow2):
// 1) a light sweeps once around the whole game panel (HUD + board) with a soft glow;
// 2) a swoosh wipes left to right and reveals the new board.
// Both only animate transform / opacity, so they stay on the compositor.
function edgeGlow() {
    document.querySelectorAll('.edge-glow').forEach(e => e.remove());
    if (!S.fx.glow || reduce.matches || !frame.offsetWidth) return;
    const el = document.createElement('div');
    el.className = 'edge-glow';
    el.setAttribute('aria-hidden', 'true');
    // the gradient square must cover the panel at any angle: its diagonal
    el.style.setProperty('--gd', Math.ceil(Math.hypot(frame.offsetWidth, frame.offsetHeight)) + 'px');
    el.innerHTML = '<b><i></i></b>';
    el.onanimationend = e => { if (e.target === el) el.remove(); };
    frame.appendChild(el);
}
function boardWipe() {
    document.querySelectorAll('.board-wipe').forEach(e => e.remove());
    if (!S.fx.wipe || reduce.matches || !wrap.offsetWidth) return;
    const el = document.createElement('div');
    el.className = 'board-wipe';
    el.setAttribute('aria-hidden', 'true');
    el.style.left = wrap.offsetLeft + 'px';
    el.style.top = wrap.offsetTop + 'px';
    el.style.width = wrap.offsetWidth + 'px';
    el.style.height = wrap.offsetHeight + 'px';
    el.innerHTML = '<i></i>';
    el.onanimationend = e => { if (e.target.parentNode === el) el.remove(); };
    frame.appendChild(el);
}
function splash(i) { // rock splash: rings, droplets, stone chips
    if (!S.fx.cell || reduce.matches) return;
    const cell = cells[i], fx = document.createElement('div');
    fx.className = 'fx splash';
    fx.style.left = (cell.offsetLeft + cell.offsetWidth / 2) + 'px';
    fx.style.top = (cell.offsetTop + cell.offsetHeight / 2) + 'px';
    fx.innerHTML = '<i class="wring"></i><i class="wring w2"></i>';
    const u = csNow / 32, parts = [];
    for (let n = 0; n < 10; n++) {
        const el = document.createElement('i'), dx = rnd(-1, 1) * csNow * 1.1, up = rnd(.7, 1.6) * csNow;
        el.className = 'drop';
        el.style.setProperty('--sz', rnd(3, 6.5) * u + 'px');
        parts.push([el, [
            { transform: 'translate(0, 0) scale(1)', opacity: 1 },
            { 
                transform: 'translate(' + dx * .6 + 'px,' + -up + 'px) scale(1)', 
                opacity: 1, offset: .45, easing: 'ease-in' 
            },
            { 
                transform: 'translate(' + dx + 'px,' + rnd(.1, .5) * csNow + 'px) scale(.4)', 
                opacity: 0 
            }
        ], rnd(420, 700), 'ease-out']);
    }
    for (let n = 0; n < 4; n++) {
        const el = document.createElement('i'), dx = rnd(-1, 1) * csNow * .9, up 
                 = rnd(.4, 1) * csNow;
        el.className = 'chip';
        el.style.setProperty('--sz', rnd(3, 5) * u + 'px');
        parts.push([el, [
            { transform: 'translate(0, 0) rotate(0)', opacity: 1 },
            { 
                transform: 'translate(' + dx * .6 + 'px,' + -up + 'px) rotate(' + rnd(-200, 200) + 'deg)', 
                opacity: 1, offset: .4, easing: 'ease-in' 
            },
            { 
                transform: 'translate(' + dx + 'px,' + rnd(.2, .6) * csNow + 'px) rotate(' + rnd(-400, 400) + 'deg)', 
                opacity: 0 
            }
        ], rnd(450, 650), 'ease-out']);
    }
    parts.forEach(p => fx.appendChild(p[0]));
    board.appendChild(fx);
    parts.forEach(([el, kf, dur, ease]) => el.animate(kf, { 
        duration: dur, easing: ease, fill: 'both' }));
    setTimeout(() => fx.remove(), 900);
}
function shake() {
    const k = [[0, 0, 0], [-9, 5, -.5], [8, -6, .4], [-6, -3, -.2], [5, 4, .2], [-2, 1, 0], [0, 0, 0]];
    frame.animate(k.map(([x, y, r]) => (
        { transform: 'translate(' + x + 'px,' + y + 'px) rotate(' + r + 'deg)' })), 
        { duration: 520, easing: 'ease-out' });
}
function boomFx(r) {
    if (reduce.matches || !S.fx.lose) return;
    const cell = cells[g.boom];
    r = r || cell.getBoundingClientRect();
    burst(cell);
    shake();
    const fl = document.createElement('div');
    fl.className = 'flash';
    fl.style.setProperty('--fx', (r.left + r.width / 2) + 'px');
    fl.style.setProperty('--fy', (r.top + r.height / 2) + 'px');
    fl.onanimationend = () => fl.remove();
    document.body.appendChild(fl);
}
function winFx() {
    if (reduce.matches || !S.fx.win) return;
    const cs = getComputedStyle(root), acc = cs.getPropertyValue('--accent').trim(), sh 
             = cs.getPropertyValue('--shadow').trim();
    frame.animate([
        { boxShadow: '0 18px 40px -18px ' + sh + ', 0 0 0 0 ' + acc },
        { boxShadow: '0 18px 40px -18px ' + sh + ', 0 0 0 30px transparent' }
    ], { duration: 1100, iterations: 2, easing: 'ease-out' });
    const box = document.createElement('div');
    box.className = 'confetti';
    const cols = [
                    'var(--accent)', 'var(--n1)', 'var(--n2)', 'var(--n3)', 
                    'var(--n4)', 'var(--n5)', 'var(--n6)'
                 ];
    for (let n = 0; n < 70; n++) {
        const p = document.createElement('i'), w = rnd(6, 11);
        p.style.setProperty('--x', rnd(0, 100) + 'vw');
        p.style.setProperty('--dx', rnd(-18, 18) + 'vw');
        p.style.setProperty('--w', w + 'px');
        p.style.setProperty('--h', w * rnd(.5, 1.6) + 'px');
        p.style.setProperty('--rot', rnd(-900, 900) + 'deg');
        p.style.setProperty('--dur', rnd(1.8, 3.2) + 's');
        p.style.setProperty('--dl', rnd(0, .6) + 's');
        p.style.setProperty('--c', cols[n % cols.length]);
        box.appendChild(p);
    }
    document.body.appendChild(box);
    setTimeout(() => box.remove(), 4200);
}

/* EFFECTS TAB: Animations (CSS reads data-fx-* on <html>) */
{
    const f = S.fx && typeof S.fx === 'object' ? S.fx : {};
    S.fx = {};
    Object.keys(DEF.fx).forEach(k => { S.fx[k] = typeof f[k] === 'boolean' ? f[k] : DEF.fx[k]; });
}
const FX = Object.keys(DEF.fx);
function applyFx() {
    FX.forEach(k => {
        root.dataset['fx' + k[0].toUpperCase() + k.slice(1)] = S.fx[k] ? 'on' : 'off';
        $('#fx-' + k).checked = S.fx[k];
    });
}
FX.forEach(k => {
    $('#fx-' + k).onchange = e => {
        S.fx[k] = e.target.checked;
        applyFx();
        save();
        sfx('ui');
    };
});
// water ripple on buttons: starts where you pressed (the middle for keyboard)
function ripple(btn, x, y) {
    if (!S.fx.button || reduce.matches || btn.disabled) return;
    const r = btn.getBoundingClientRect(), el = document.createElement('span');
    el.className = 'ripple';
    el.setAttribute('aria-hidden', 'true');
    el.style.left = (x - r.left) + 'px';
    el.style.top = (y - r.top) + 'px';
    el.style.setProperty('--rd', Math.max(r.width, r.height) * 3 + 'px');
    el.innerHTML = '<i></i><i></i><i></i>';
    btn.appendChild(el);
    setTimeout(() => el.remove(), 1400);
}
document.addEventListener('pointerdown', e => {
    if (e.button !== 0 || !e.target.closest) return;
    const b = e.target.closest('button');
    if (b) ripple(b, e.clientX, e.clientY);
});
document.addEventListener('click', e => {
    if (e.detail !== 0 || !e.target.closest) return; // detail 0 = keyboard click
    const b = e.target.closest('button');
    if (!b) return;
    const r = b.getBoundingClientRect();
    ripple(b, r.left + r.width / 2, r.top + r.height / 2);
});
