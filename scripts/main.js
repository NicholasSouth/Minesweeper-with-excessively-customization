"use strict";

/*
    Same order as main.html
    CORE: engine, storage + settings, audio engine
    1 App background   
    2 Header   
    3 Setup panel   
    4 Game area
    5 Settings sidebar (Audio / Theme / Effects)
    6 Custom cursor    
    7 Boot
*/

/* CORE: game engine */
const mulberry = a => () => {
    a |= 0;
    a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
};
const RES = { none: 1, cell: 1, zone: 9 }; // cells kept mine-free by each first-click mode
const maxMines = (r, c, s) => Math.max(1, r * c - (RES[s] ?? 9));
const clampMines = (m, r, c, s) => Math.min(Math.max(1, Math.round(m) || 1), maxMines(r, c, s));
const pctToMines = (p, r, c, s) => clampMines(p / 100 * r * c, r, c, s);
const minesToPct = (m, r, c) => m / (r * c) * 100;
const fmtPct = p => Number(p.toFixed(1)).toString();
function nbrs(g, i) {
    const r = (i / g.cols) | 0, c = i % g.cols, o = [];
    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            if (!dr && !dc) continue;
            const a = r + dr, b = c + dc;
            if (a >= 0 && a < g.rows && b >= 0 && b < g.cols) o.push(a * g.cols + b);
        }
    }
    return o;
}
// st: 0 hidden, 1 revealed, 2 flagged
function newGame(rows, cols, mines, safety, seed) {
    const n = rows * cols;
    return {
        rows, cols, n,
        mines: clampMines(mines, rows, cols, safety),
        safety, seed,
        mine: new Uint8Array(n),
        adj: new Uint8Array(n),
        st: new Uint8Array(n),
        rev: 0, flags: 0,
        status: 'idle', boom: -1
    };
}
function place(g, first) {
    const ban = new Set([first]);
    if (g.safety === 'zone') nbrs(g, first).forEach(j => ban.add(j));
    const pool = [];
    for (let i = 0; i < g.n; i++) if (!ban.has(i)) pool.push(i);
    const rnd = mulberry(g.seed);
    for (let i = pool.length - 1; i > 0; i--) {
        const j = (rnd() * (i + 1)) | 0;
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    pool.slice(0, g.mines).forEach(i => g.mine[i] = 1);
    for (let i = 0; i < g.n; i++) {
        g.adj[i] = nbrs(g, i).reduce((a, j) => a + g.mine[j], 0);
    }
}
function reveal(g, i) {
    if (g.status === 'won' || g.status === 'lost' || g.st[i] !== 0) return;
    if (g.status === 'idle') {
        place(g, i);
        g.status = 'playing';
    }
    if (g.mine[i]) {
        g.status = 'lost';
        g.boom = i;
        return;
    }
    const q = [i];
    g.st[i] = 1;
    g.rev++;
    for (let k = 0; k < q.length; k++) {
        const x = q[k];
        if (g.adj[x]) continue;
        for (const j of nbrs(g, x)) {
            if (g.st[j] === 0) {
                g.st[j] = 1;
                g.rev++;
                q.push(j);
            }
        }
    }
    if (g.rev === g.n - g.mines) {
        g.status = 'won';
        for (let k = 0; k < g.n; k++) if (g.mine[k]) g.st[k] = 2;
        g.flags = g.mines;
    }
}
function flag(g, i) {
    if (g.status !== 'playing' && g.status !== 'idle') return;
    if (g.st[i] === 0) {
        g.st[i] = 2;
        g.flags++;
    } else if (g.st[i] === 2) {
        g.st[i] = 0;
        g.flags--;
    }
}
function chord(g, i) {
    if (g.status !== 'playing' || g.st[i] !== 1 || !g.adj[i]) return;
    const ns = nbrs(g, i);
    if (ns.filter(j => g.st[j] === 2).length !== g.adj[i]) return;
    for (const j of ns) if (g.st[j] === 0) reveal(g, j);
}

/* CORE: storage + settings */
const store = {
    get(k, d) {
        try {
            const v = JSON.parse(localStorage.getItem('msweeper:' + k));
            return v && v.schemaVersion === 1 ? v : d;
        } catch (e) {
            return d;
        }
    },
    set(k, v) {
        try {
            localStorage.setItem('msweeper:' + k, JSON.stringify({ ...v, schemaVersion: 1 }));
        } catch (e) {}
    }
};
const num = (v, a, b, d) => Number.isFinite(+v) ? Math.min(b, Math.max(a, Math.round(+v))) : d;
// Default values for the sidebar settings (also used by "Reset all appearance").
// Saved settings in this browser override them; clear the site data to see new defaults.
const DEF = {
    vol: { 
        master: 100, sfx: 50, reveal: 50, chord: 50, flag: 100, ui: 50, 
        explode: 100, win: 100, lose: 50, music: 30, video: 50 
    },
    curSize: 25,
    dim: 0,
    appDim: 0,
    fx: { cell: true, button: true, flag: true, win: true, lose: true }
};
const S = Object.assign({
    difficulty: 'beginner',
    rows: 16,
    cols: 16,
    mines: 40,
    pct: 15.6,
    mode: 'count',
    safety: 'zone',
    theme: null,
    muted: false
}, store.get('settings', {}));
S.rows = num(S.rows, 5, 50, 16);
S.cols = num(S.cols, 5, 50, 16);
if (!['beginner', 'intermediate', 'expert', 'custom'].includes(S.difficulty)) 
    S.difficulty = 'beginner';
if (!RES[S.safety]) S.safety = 'zone';
S.mines = clampMines(S.mines, S.rows, S.cols, S.safety);
{
    const sv = S.vol || {};
    S.vol = {};
    Object.keys(DEF.vol).forEach(k => { S.vol[k] = num(sv[k], 0, 100, DEF.vol[k]); });
}
const save = () => store.set('settings', S);

/* 
    CORE: audio engine
    Each sound is a slot: default file, sidebar label, volume channel.
    To add one: drop the file in /audio and add a line to SLOTS. 
*/
// the two background tracks that ship with the site (a user upload still overrides them)
const TRACKS = [
    { id: 'classic', label: 'Joakim Karud - Classic', src: 'audio/Joakim_Karud_-_Classic.mp3' },
    { id: 'dreams',  label: 'Dj Quads - Dreams',      src: 'audio/Dj_Quads_-_Dreams.mp3' }
];
if (!TRACKS.some(t => t.id === S.track)) S.track = 'classic'; // default track
const track = () => TRACKS.find(t => t.id === S.track);
const SLOTS = [
    { id: 'reveal',  label: 'Reveal cell',     src: 'audio/select.mp3',      ch: 'reveal'  },
    { id: 'chord',   label: 'Chord',           src: 'audio/select.mp3',      ch: 'chord'   },
    { id: 'flag',    label: 'Flag',            src: 'audio/flag.mp3',        ch: 'flag'    },
    { id: 'ui',      label: 'Interface click', src: 'audio/select.mp3',      ch: 'ui'      },
    { id: 'explode', label: 'Explosion',       src: 'audio/explosion.mp3',   ch: 'explode' },
    { id: 'win',     label: 'Win',             src: 'audio/win.mp3',         ch: 'win'     },
    { id: 'lose',    label: 'Lose',            src: 'audio/loose.mp3',       ch: 'lose'    },
    { id: 'music',   label: 'Music',           get src() { return track().src; }, ch: 'music' }
];
const SLOT = Object.fromEntries(SLOTS.map(s => [s.id, s]));
const MAX_UPLOAD = 8 * 1024 * 1024;   // 8 MB
const custom = {}; // slot id -> { url, name } (uploaded sounds)
const base = {}; // slot id -> Audio element in use
let bgm = null;
let audioUnlocked = false;   // browsers allow sound only after a first click/key
// IndexedDB: uploads are too big for localStorage
const idb = {
    db: null,
    open() {
        if (this.db) return this.db;
        this.db = new Promise((res, rej) => {
            if (!window.indexedDB) return rej(new Error('no indexedDB'));
            const q = indexedDB.open('msweeper-audio', 1);
            q.onupgradeneeded = () => q.result.createObjectStore('sounds');
            q.onsuccess = () => res(q.result);
            q.onerror = () => rej(q.error);
        });
        return this.db;
    },
    run(mode, fn) {
        return this.open().then(db => new Promise((res, rej) => {
            const tx = db.transaction('sounds', mode);
            const r = fn(tx.objectStore('sounds'));
            tx.oncomplete = () => res(r && r.result);
            tx.onerror = tx.onabort = () => rej(tx.error);
        }));
    },
    put: (k, v) => idb.run('readwrite', s => s.put(v, k)),
    del: k => idb.run('readwrite', s => s.delete(k)),
    all() {
        return idb.run('readonly', s => s.getAll()).then(async vals => {
            const keys = await idb.run('readonly', s => s.getAllKeys());
            return keys.map((k, i) => [k, vals[i]]);
        });
    }
};
// these are also scaled by the "All sound effects" slider
const GROUPED = ['reveal', 'chord', 'flag', 'ui', 'explode', 'win', 'lose'];
const vol = ch => (S.vol.master / 100) * (S.vol[ch] / 100) * 
            (GROUPED.includes(ch) ? S.vol.sfx / 100 : 1);
function loadSlot(id) { // (re)build the Audio element for a slot
    const old = base[id];
    const a = new Audio((custom[id] && custom[id].url) || SLOT[id].src);
    a.preload = 'auto';
    if (id === 'music') {
        a.loop = true;
        if (old) old.pause();
        bgm = a;
    }
    base[id] = a;
}
SLOTS.forEach(s => loadSlot(s.id));
function sfx(k) {
    const slot = SLOT[k];
    if (S.muted || !slot || !base[k]) return; // unknown keys stay silent
    const a = base[k].cloneNode(); // clone so quick repeats overlap
    a.volume = vol(slot.ch);
    a.play().catch(() => {});
}
function applyAudio() {
    bgm.volume = vol('music');
    if (S.muted || !audioUnlocked) bgm.pause();
    else bgm.play().catch(() => {});
    applyVideos();
}
const unlockAudio = () => {
    audioUnlocked = true;
    applyAudio();
};
['pointerdown', 'keydown'].forEach(t => addEventListener(t, unlockAudio, { once: true }));

/* UI: shared helpers + state */
const $ = s => document.querySelector(s);
const root = document.documentElement;
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const rnd = (a, b) => a + Math.random() * (b - a);
let g, cells = [], cur = 0, t0 = 0, tick = 0;
let origin = 0; // cell the last action started from; animations ripple out from it
let flagMode = false, lp = 0, lpFired = false;
let zoom = 1, csNow = 32, lastDims = '', builtDims = '';

/* 
    APP BACKGROUND  (#appbg, #app-video)
    Video helpers are shared with the board video (#board-video).
*/
const av = $('#app-video'), bv = $('#board-video');
function setVideo(v, url) {
    v.src = url;
    v.hidden = false;
}
function clearVideo(v) {
    if (v.hasAttribute('src')) {
        v.pause();
        v.removeAttribute('src');
        v.load();
    }
    v.hidden = true;
}
// sound follows the Background video slider and the global mute
function applyVideos() {
    [[bv, S.boardVideoMuted], [av, S.appVideoMuted]].forEach(([v, off]) => {
        v.volume = vol('video');
        v.muted = off || S.muted || !audioUnlocked;
        if (!v.hidden && v.hasAttribute('src')) v.play().catch(() => {});
    });
}

/* HEADER  (theme dots, mute, settings button) */
const themes = ['novel', 'lust', 'combust', 'ethereal'];
if (!themes.includes(S.theme)) {
    S.theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'novel' : 'ethereal';
}
const SW = { novel: '#2fbfff', lust: '#d64fb0', combust: '#f08a24', ethereal: '#d9d2bf' };
themes.forEach(t => {
    const b = document.createElement('button');
    b.className = 'dot';
    b.style.background = SW[t];
    b.title = t;
    b.setAttribute('aria-label', t + ' theme');
    b.onclick = () => {
        S.theme = t;
        applyTheme();
        save();
        sfx('ui');
    };
    $('#theme').appendChild(b);
});
function applyTheme() {
    root.dataset.theme = S.theme;
    [...$('#theme').children].forEach((b, i) => 
        b.setAttribute('aria-pressed', themes[i] === S.theme));
    applyColors(); // each theme keeps its own custom colors
}
function applyMute() {
    $('#mute').dataset.muted = S.muted;
    $('#mute').setAttribute('aria-label', S.muted ? 'Sound off, press to turn on' : 
        'Sound on, press to turn off');
}
$('#mute').onclick = () => {
    S.muted = !S.muted;
    applyMute();
    applyAudio();
    save();
    sfx('ui');
};
const gear = $('#settings-btn');
// see section 5
gear.onclick = () => {
    toggleSettings(!isOpen());
    sfx('ui');
};

/* SETUP PANEL (board size, mines, first click, buttons) */
const F = {
    diff: $('#diff'),
    rows: $('#rows'),
    cols: $('#cols'),
    mc: $('#mc'),
    mp: $('#mp'),
    sl: $('#sl'),
    sum: $('#sum'),
    warn: $('#warn'),
    safety: $('#safety'),
    edit: $('#edit')
};
const PRE = { beginner: [9, 9, 10], intermediate: [16, 16, 40], expert: [16, 30, 99] };
const cfg = () => S.difficulty === 'custom'
    ? { r: S.rows, c: S.cols, m: S.mines }
    : { r: PRE[S.difficulty][0], c: PRE[S.difficulty][1], m: PRE[S.difficulty][2] };
const label = p => p < 10 ? 'Very easy' : 
            p < 16 ? 'Easy' : 
            p < 21 ? 'Medium' : 
            p < 26 ? 'Hard' : 
            p <= 35 ? 'Extreme' : 'Nearly impossible';
function sync(skip) { // refresh every field except `skip` (the one being typed in)
    const { r, c, m } = cfg(),
        pre = S.difficulty !== 'custom',
        mx = maxMines(r, c, S.safety),
        p = minesToPct(m, r, c);
    const set = (el, v) => { if (el !== skip) el.value = v; };
    set(F.rows, r);
    set(F.cols, c);
    set(F.mc, m);
    set(F.mp, fmtPct(p));
    F.sl.max = mx;
    F.sl.value = m;
    F.sl.setAttribute('aria-valuetext', m + ' mines, ' + fmtPct(p) + ' percent');
    [F.rows, F.cols, F.mc, F.mp, F.sl].forEach(e => e.disabled = pre);
    F.edit.hidden = !pre;
    F.diff.value = S.difficulty;
    F.safety.value = S.safety;
    F.sum.textContent = m + ' mines = ' + fmtPct(p) + '% of ' + (r * c) + 
                        ' cells · ' + label(p) + ' · allowed 1 to ' + mx;
    F.warn.hidden = p <= 35;
    save();
}
function resize() {
    S.mines = S.mode === 'percent' ? pctToMines(S.pct, S.rows, S.cols, S.safety) : 
                         clampMines(S.mines, S.rows, S.cols, S.safety);
}
F.diff.onchange = () => {
    S.difficulty = F.diff.value;
    sync();
    sfx('ui');
};
F.rows.oninput = F.cols.oninput = e => {
    const v = parseInt(e.target.value, 10);
    if (!(v >= 5 && v <= 50)) return;
    S[e.target === F.rows ? 'rows' : 'cols'] = v;
    resize();
    sync(e.target);
};
F.mc.oninput = e => {
    const v = parseInt(e.target.value, 10);
    if (!(v >= 0)) return;
    S.mines = clampMines(v, S.rows, S.cols, S.safety);
    S.mode = 'count';
    S.pct = minesToPct(S.mines, S.rows, S.cols);
    sync(e.target);
};
F.mp.oninput = e => {
    const v = parseFloat(e.target.value.replace(',', '.'));
    if (!(v >= 0)) return;
    S.mines = pctToMines(v, S.rows, S.cols, S.safety);
    S.mode = 'percent';
    S.pct = v;
    sync(e.target);
};
F.sl.oninput = () => {
    S.mines = +F.sl.value;
    S.mode = 'count';
    S.pct = minesToPct(S.mines, S.rows, S.cols);
    sync(F.sl);
};
[F.rows, F.cols, F.mc, F.mp].forEach(el => el.onblur = () => {
    const before = el.value;
    sync();
    if (el.value !== before) sfx('error');
});
F.safety.onchange = () => {
    S.safety = F.safety.value;
    resize();
    sync();
    sfx('ui');
};
F.edit.onclick = () => {
    const { r, c, m } = cfg();
    Object.assign(S, {
        difficulty: 'custom',
        rows: r,
        cols: c,
        mines: m,
        mode: 'count',
        pct: minesToPct(m, r, c)
    });
    sync();
    sfx('ui');
};
$('#start').onclick = () => {
    start();
    sfx('ui');
};
$('#flagmode').onclick = e => {
    flagMode = !flagMode;
    board.dataset.flag = flagMode; // the board shows the flag cursor in flag mode
    e.currentTarget.setAttribute('aria-pressed', flagMode);
    sfx('ui');
};

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
/* board: rendering */
function build() {
    board.textContent = '';
    board.style.gridTemplateColumns = 'repeat(' + g.cols + ',var(--cs))';
    cells = [];
    builtDims = g.rows + 'x' + g.cols;
    for (let r = 0; r < g.rows; r++) {
        const row = document.createElement('div');
        row.className = 'row-g';
        row.setAttribute('role', 'row');
        for (let c = 0; c < g.cols; c++) {
            const d = document.createElement('div');
            d.dataset.i = r * g.cols + c;
            d.setAttribute('role', 'gridcell');
            row.appendChild(d);
            cells.push(d);
        }
        board.appendChild(row);
    }
    fit();
    draw();
}
function fit() {
    // biggest cell that shows the whole board with no scrollbar: the board has to fit the
    // width of the app card and the 72vh height limit of .wrap (zoom 1 = no scrollbars)
    const fs = getComputedStyle(frame), app = $('.app');
    const availW = app.clientWidth - parseFloat(fs.paddingLeft) - parseFloat(fs.paddingRight) - 2;
    const availH = innerHeight * .72 - 2;
    const fit0 = Math.max(16, Math.min(38, Math.floor(Math.min(availW / g.cols, availH / g.rows))));
    csNow = Math.max(10, Math.min(120, Math.round(fit0 * zoom))); // zoom scales the cell size
    root.style.setProperty('--cs', csNow + 'px');
}
addEventListener('resize', () => { if (g) fit(); });
function draw() {
    const lost = g.status === 'lost', won = g.status === 'won';
    const o = lost ? g.boom : origin, orow = (o / g.cols) | 0, ocol = o % g.cols;
    for (let i = 0; i < g.n; i++) {
        const s = g.st[i], m = g.mine[i];
        let cls = 'c', tx = '', lb = 'hidden', pop = false;
        if (s === 1) {
            cls += ' r';
            if (g.adj[i]) {
                cls += ' n' + g.adj[i];
                tx = g.adj[i];
                lb = g.adj[i] + ' adjacent mines';
            } else {
                cls += ' z';
                lb = 'empty';
            }
        } else if (s === 2) {
            cls += ' f';
            lb = 'flagged';
            if (lost && !m) {
                cls += ' r w';
                lb = 'wrong flag';
                pop = true;
            }
        } else if (lost && m) {
            cls += ' r m' + (i === g.boom ? ' x' : '');
            lb = 'mine';
            pop = true;
        }
        const k = cls + '|' + tx, d = cells[i];
        if (d._k !== k) {
            // pick the animation; delay grows with distance from where you acted
            const first = d._k === undefined, prev = d._s;
            const row = (i / g.cols) | 0, col = i % g.cols, dist = Math.hypot(row - orow, col - ocol);
            let an = '', dl = 0;
            if (first) {
                an = 'a-in';
                dl = Math.min((row + col) * 10, 450);
            } else if (s === 1) {
                an = 'a-rev';
                dl = Math.min(dist * 22, 700);
            } else if (pop) {
                an = !S.fx.lose ? '' : i === g.boom ? 'a-boom' : 'a-mine';
                dl = i === g.boom ? 0 : 160 + Math.min(dist * 40, 900);
            } else if (s === 2 && prev === 0) {
                an = won && !S.fx.win ? '' : 'a-flag';
                dl = won ? Math.min(dist * 14, 600) : 0;
            } else if (s === 0 && prev === 2) {
                an = 'a-unflag';
            }
            d._k = k;
            d._s = s;
            d.className = cls + (an ? ' ' + an : '');
            d.style.setProperty('--ad', dl + 'ms');
            d.textContent = tx;
            d.setAttribute('aria-label', 'Row ' + (row + 1) + ', column ' + (col + 1) + ', ' + lb);
            d._c = false;
        }
        // keyboard cursor toggles separately so moving it never restarts an animation
        const isCur = i === cur;
        if (d._c !== isCur) {
            d.classList.toggle('cur', isCur);
            d._c = isCur;
        }
    }
}
/* board: game flow */
function start() {
    const { r, c, m } = cfg();
    clearInterval(tick);
    stopReplay();
    moves = [];
    g = newGame(r, c, m, S.safety, (Math.random() * 4294967296) >>> 0);
    cur = 0;
    const dims = r + 'x' + c;
    if (dims !== lastDims) {
        lastDims = dims;
        zoom = 1;
        wrap.scrollLeft = 0;
        wrap.scrollTop = 0;
    }
    build();
    paintZoom();
    hud();
    clock();
    $('#msg').textContent = '';
    showBest();
}
function end() {
    clearInterval(tick);
    g.ms = performance.now() - t0;
    clock();
    const won = g.status === 'won',
        st = store.get('stats', { byBoard: {} }),
        k = boardKey(),
        b = st.byBoard[k] || (st.byBoard[k] = { played: 0, won: 0, bestMs: null });
    b.played++;
    let m = 'Boom. Press R or the face to try again.';
    if (won) {
        b.won++;
        m = 'Cleared in ' + (g.ms / 1000).toFixed(1) + ' s.';
        if (b.bestMs === null || g.ms < b.bestMs) {
            b.bestMs = g.ms;
            m += ' New best!';
        }
    }
    store.set('stats', st);
    $('#msg').textContent = m;
    if (!reduce.matches) 
        $('#msg').animate([
            { opacity: 0, transform: 'translateY(6px)' }, 
            { opacity: 1, transform: 'none' }], 
            { duration: 320, easing: 'ease-out' });
    showBest();
}
/*
    REPLAY: every move that changes the board is recorded as { k, i, t }
    (k: 'r' open, 'f' flag, 'c' chord; i: cell index; t: ms since the first open).
    Mines are placed from the game's seed, so re-applying the same moves to a fresh
    game with that seed reproduces it exactly. A finished game is kept as rpData,
    plays back in a loop on the board, and can be saved as a .misw file (JSON),
    or loaded back from one.
*/
const MISW_VERSION = 1, SPEEDS = [0.5, 1, 2, 4, 8];
let moves = [], replaying = false, rpTimer = 0, rpData = null;
const rpBadge = $('#rp');
S.rpSpeed = SPEEDS.includes(+S.rpSpeed) ? +S.rpSpeed : 1;
S.rpAuto = S.rpAuto !== false;
function recordMove(k, i, before) {
    const t = before === 'idle' ? 0 : Math.round(performance.now() - t0);
    moves.push({ k, i, t });
}
// one move on any game object (opening a flag removes it first, like a left-click does)
function applyTo(game, m) {
    if (m.k === 'f') flag(game, m.i);
    else if (m.k === 'c') chord(game, m.i);
    else {
        if (game.st[m.i] === 2) flag(game, m.i);
        reveal(game, m.i);
    }
}
function makeReplay(game, mv, ms) {
    return {
        rows: game.rows, cols: game.cols, mines: game.mines, safety: game.safety, seed: game.seed,
        result: game.status, ms: Math.round(ms || 0), moves: mv.map(m => ({ ...m })),
        created: new Date().toISOString()
    };
}
const serializeReplay = d => ({
    format: 'misw', version: MISW_VERSION, app: 'Minesweeper', created: d.created,
    rows: d.rows, cols: d.cols, mines: d.mines, safety: d.safety, seed: d.seed,
    result: d.result, ms: d.ms, moves: d.moves.map(m => [m.k, m.i, m.t])
});
// check a parsed .misw object and replay it on a hidden game; throws a readable error
function parseReplay(o) {
    if (!o || typeof o !== 'object' || o.format !== 'misw') 
        throw new Error('This is not a .misw replay file.');
    if (o.version !== MISW_VERSION) 
        throw new Error('This replay was made by a different version.');
    const rows = +o.rows, cols = +o.cols, mines = +o.mines, seed = +o.seed;
    if (!Number.isInteger(rows) || !Number.isInteger(cols) 
        || rows < 5 || cols < 5 || rows > 50 || cols > 50) 
        throw new Error('The board size in this replay is not valid.');
    if (!Number.isInteger(mines) || mines < 1 || mines >= rows * cols) 
        throw new Error('The mine count in this replay is not valid.');
    if (!RES[o.safety]) throw new Error('The first-click mode in this replay is not valid.');
    if (!Number.isInteger(seed) || seed < 0 || seed > 4294967295) 
        throw new Error('The seed in this replay is not valid.');
    if (!Array.isArray(o.moves) || !o.moves.length || o.moves.length > 50000) 
        throw new Error('This replay has no moves, or too many.');
    const n = rows * cols, mv = [];
    for (const a of o.moves) {
        if (!Array.isArray(a) || !'rfc'.includes(a[0]) 
            || a[0].length !== 1 || !Number.isInteger(a[1]) || a[1] < 0 
            || a[1] >= n || !Number.isFinite(+a[2]) || +a[2] < 0)
            throw new Error('This replay contains a broken move.');
        mv.push({ k: a[0], i: a[1], t: Math.round(+a[2]) });
    }
    const sim = newGame(rows, cols, mines, o.safety, seed);
    mv.forEach(m => applyTo(sim, m));
    if (sim.status === 'idle') throw new Error('This replay never opens a cell.');
    return {
        rows, cols, mines: sim.mines, safety: o.safety, seed, moves: mv,
        result: sim.status === 'playing' ? 'unfinished' : sim.status, // trust the replay, not the label
        ms: Math.round(Math.max(0, +o.ms) || mv[mv.length - 1].t),
        created: typeof o.created === 'string' ? o.created.slice(0, 40) : new Date().toISOString()
    };
}
function stopReplay() {
    clearTimeout(rpTimer);
    replaying = false;
    rpBadge.hidden = true;
    frame.classList.remove('vhs-on');
    paintReplay();
}
function replayClock(t) {
    $('#tm').textContent = String(Math.min(999, Math.floor(t / 1000))).padStart(3, '0');
}
function playReplay(d) {
    clearTimeout(rpTimer);
    clearInterval(tick);
    replaying = true;
    rpBadge.hidden = false;
    frame.classList.add('vhs-on'); // VHS look while the replay plays
    $('#msg').textContent = '';
    replayRound(d);
    paintReplay();
}
function replayRound(d) {
    if (!replaying) return;
    g = newGame(d.rows, d.cols, d.mines, d.safety, d.seed);
    origin = 0;
    cur = 0;
    if (builtDims !== d.rows + 'x' + d.cols) { // an imported replay can have another board size
        lastDims = builtDims = d.rows + 'x' + d.cols;
        zoom = 1;
        wrap.scrollLeft = 0;
        wrap.scrollTop = 0;
        build();
        paintZoom();
    } else {
        draw();
    }
    hud();
    replayClock(0);
    let k = 0;
    const step = () => {
        if (!replaying) return;
        const m = d.moves[k++];
        origin = m.i;
        applyTo(g, m);
        draw();
        hud();
        replayClock(m.t);
        if (g.status === 'lost') {
            if (!reduce.matches && S.fx.lose) burst(cells[g.boom]);
        } else if (m.k !== 'f') {
            splash(m.i);
        }
        if (k >= d.moves.length) {
            rpTimer = setTimeout(() => replayRound(d), 500 / S.rpSpeed); // hold the end, then loop
        } else {
            const gap = d.moves[k].t - m.t;
            rpTimer = setTimeout(step, Math.max(16, Math.min(400, Math.max(80, gap)) / S.rpSpeed));
        }
    };
    rpTimer = setTimeout(step, 200 / S.rpSpeed);
}
// a game just ended: keep it as the current replay, and play it if auto-replay is on
function finishReplay() {
    rpData = makeReplay(g, moves, g.ms);
    store.set('lastReplay', serializeReplay(rpData));
    paintReplay();
    if (S.rpAuto) rpTimer = setTimeout(() => playReplay(rpData), 2800);
}
function saveFile(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 60000);
}
const rpName = ext => 'minesweeper-' + rpData.rows + 'x' + rpData.cols + '-' + rpData.result + '-'
    + new Date().toISOString().slice(0, 16).replace(/[-:]/g, '').replace('T', '-') + '.' + ext;
const liveGame = () => !replaying && g.status === 'playing' && moves.length > 0;
const rpEl = {
    info: $('#rp-info'), play: $('#rp-play'), speed: $('#rp-speed'), auto: $('#rp-auto'),
    exp: $('#rp-export'), imp: $('#rp-import'), file: $('#rp-file'), msg: $('#rp-msg')
};
const fmtSec = ms => (ms / 1000).toFixed(1) + ' s';
function paintReplay() {
    const d = rpData;
    rpEl.info.textContent = !d
        ? 'Finished games are saved here automatically. You can also import a .misw file.'
        : (replaying ? 'Playing: ' : 'Saved: ') + d.rows + '×' + d.cols + ' board, ' + d.mines + ' mines, ' 
          + d.moves.length + ' moves, '
          + (d.result === 'won' ? 'cleared in ' + fmtSec(d.ms) : d.result === 'lost' ? 'lost after ' + fmtSec(d.ms) 
            : 'unfinished') + '.';
    rpEl.play.textContent = replaying ? 'Stop replay' : 'Watch replay';
    rpEl.play.disabled = !d && !replaying;
    rpEl.speed.value = S.rpSpeed;
    rpEl.auto.checked = S.rpAuto;
    rpEl.exp.disabled = !d;
}
const rpSay = t => { rpEl.msg.textContent = t; };
SPEEDS.forEach(s => rpEl.speed.add(new Option(s + '×', s)));
rpEl.speed.onchange = () => {
    S.rpSpeed = +rpEl.speed.value;
    save();
};
rpEl.auto.onchange = () => {
    S.rpAuto = rpEl.auto.checked;
    save();
};
rpEl.play.onclick = () => {
    sfx('ui');
    if (replaying) {
        start(); // stops the replay and deals a fresh board
        return;
    }
    if (!rpData) return;
    if (liveGame() && !confirm('A game is in progress. Watching the replay will end it. Continue?')) return;
    playReplay(rpData);
};
rpEl.exp.onclick = () => {
    if (!rpData) return;
    saveFile(new Blob([JSON.stringify(serializeReplay(rpData))], { type: 'application/json' }), rpName('misw'));
    rpSay('Saved ' + rpName('misw').slice(0, 60) + ' to your downloads.');
    sfx('ui');
};
rpEl.imp.onclick = () => rpEl.file.click();
rpEl.file.onchange = async e => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    try {
        if (f.size > 2 * 1024 * 1024) throw new Error('That file is too big to be a replay.');
        let o;
        try {
            o = JSON.parse(await f.text());
        } catch (err) {
            throw new Error('This is not a .misw replay file.');
        }
        const d = parseReplay(o);
        if (liveGame() && !confirm('A game is in progress. Importing a replay will end it. Continue?')) return;
        rpData = d;
        store.set('lastReplay', serializeReplay(d));
        playReplay(d);
        rpSay('Loaded ' + f.name + '. It plays in a loop; press Stop replay or New game to leave it.');
        sfx('ui');
    } catch (err) {
        rpSay(err.message);
    }
};
paintReplay();
try { // bring back the last saved replay from an earlier visit
    const saved = store.get('lastReplay', null);
    if (saved) {
        rpData = parseReplay(saved);
        paintReplay();
    }
} catch (e) {}
function act(fn, snd, mv) {
    if (replaying || g.status === 'won' || g.status === 'lost') return;
    const before = g.status, rev0 = g.rev, flags0 = g.flags;
    fn();
    if (before === 'idle' && g.status !== 'idle') {
        t0 = performance.now();
        tick = setInterval(clock, 100);
    }
    if (mv && (g.rev !== rev0 || g.flags !== flags0 || g.status !== before)) {
        recordMove(mv, origin, before);
    }
    draw();
    hud();
    if (g.status === 'lost') {
        end();
        sfx('explode');
        sfx('lose');
        boomFx();
        finishReplay();
    } else if (g.status === 'won') {
        end();
        sfx('win');
        winFx();
        finishReplay();
    } else {
        sfx(snd);
    }
}
// open a cell; on a flag (left-click, D, Space) it removes the flag AND opens the cell
function doReveal(i) {
    if (replaying) return;
    origin = i;
    const was = g.status;
    if (g.st[i] === 2) {
        act(() => {
            flag(g, i);
            reveal(g, i);
        }, 'reveal', 'r');
    } else {
        act(() => reveal(g, i), 'reveal', 'r');
    }
    if (was !== 'won' && was !== 'lost' && g.status !== 'lost') splash(i); // a mine gets the explosion instead
}
function doFlag(i) {
    if (replaying) return;
    origin = i;
    act(() => flag(g, i), 'flag', 'f');
}
function doChord(i) {
    if (replaying) return;
    origin = i;
    const was = g.status;
    act(() => chord(g, i), 'chord', 'c');
    if (was === 'playing' && g.status !== 'lost') splash(i);
}
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
    const k = e.key, cols = g.cols;
    let d = 0;
    if (k === 'ArrowLeft' && cur % cols) d = -1;
    else if (k === 'ArrowRight' && cur % cols < cols - 1) d = 1;
    else if (k === 'ArrowUp' && cur >= cols) d = -cols;
    else if (k === 'ArrowDown' && cur < g.n - cols) d = cols;
    if (d) {
        cur += d;
        draw();
        cells[cur].scrollIntoView({ block: 'nearest', inline: 'nearest' });
        e.preventDefault();
        return;
    }
    if (k === ' ' || k === 'd' || k === 'D') {
        e.preventDefault();
        g.st[cur] === 1 ? doChord(cur) : doReveal(cur);
    } else if (k === 'f' || k === 'F') {
        doFlag(cur);
    } else if (k === 'c' || k === 'C') {
        doChord(cur);
    } else if (k === '+' || k === '=') {
        zoomAtCursor(ZSTEP);
    } else if (k === '-' || k === '_') {
        zoomAtCursor(1 / ZSTEP);
    } else if (k === '0') {
        resetView();
    }
});
document.addEventListener('keydown', e => { // R restarts from anywhere except form fields
    if (e.key.toLowerCase() === 'r' 
        && !e.ctrlKey && !e.metaKey && !/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) {
        start();
    }
});
/* board: effects (all skipped with reduced motion) */
function burst(cell) { // explosion: fireball, shockwaves, sparks
    const fx = document.createElement('div');
    fx.className = 'fx';
    fx.style.left = (cell.offsetLeft + cell.offsetWidth / 2) + 'px';
    fx.style.top = (cell.offsetTop + cell.offsetHeight / 2) + 'px';
    fx.innerHTML = '<i class="core"></i><i class="ring"></i><i class="ring r2"></i>';
    const cols = ['var(--danger)', 'var(--n5)', '#ffd166', 'var(--text)'];
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
function boomFx() {
    if (reduce.matches || !S.fx.lose) return;
    const cell = cells[g.boom], r = cell.getBoundingClientRect();
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

/* --- info line: message + best time --- */
const boardKey = () => g.rows + 'x' + g.cols + 'x' + g.mines;
function showBest() {
    const b = store.get('stats', { byBoard: {} }).byBoard[boardKey()];
    $('#best').textContent = b && b.bestMs != null ? 'Best on this board: ' + 
        (b.bestMs / 1000).toFixed(1) + ' s' : 'No record yet on this board';
}

/* SETTINGS SIDEBAR */
const panel = $('#settings');
const closeBtn = $('#settings-close'); // separate component, lives outside the sidebar
const isOpen = () => panel.dataset.open === 'true';
function toggleSettings(open) {
    panel.dataset.open = open;
    closeBtn.dataset.open = open; // the close button appears / disappears with the sidebar
    gear.setAttribute('aria-expanded', open);
    if (open) $('#vol-master').focus();
    else {
        // closing stops any sound preview
        pvStop();
        lightGroup(null);
    }
}
closeBtn.onclick = () => {
    toggleSettings(false);
    gear.focus();
    sfx('ui');
};
// wide screens keep the bar open; on narrow ones (#scrim) a tap outside closes it
document.addEventListener('pointerdown', e => {
    if (isOpen() && matchMedia('(max-width: 700px)').matches 
        && !panel.contains(e.target) && !gear.contains(e.target) 
        && !closeBtn.contains(e.target)) 
        toggleSettings(false);
});
document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && isOpen()) {
        toggleSettings(false);
        gear.focus();
    }
});
// group squircles: the group whose setting you last used lights up
function lightGroup(sec) {
    panel.querySelectorAll('.sb-sec[data-lit]').forEach(s => { if (s !== sec) delete s.dataset.lit; });
    if (sec) sec.dataset.lit = '';
}
['pointerdown', 'input', 'change', 'click'].forEach(t => panel.addEventListener(t, e => {
    const el = e.target.closest && e.target.closest('input, select, button, label');
    if (el) lightGroup(el.closest('.sb-sec'));
}));

/* tabs */
const TABS = ['audio', 'theme', 'effects'];
function showTab(t) {
    TABS.forEach(n => {
        const on = n === t, b = $('#tab-btn-' + n);
        b.setAttribute('aria-selected', on);
        b.tabIndex = on ? 0 : -1;
        $('#tab-' + n).hidden = !on;
    });
    lightGroup(null);
}
TABS.forEach(n => {
    const b = $('#tab-btn-' + n);
    b.onclick = () => {
        showTab(n);
        sfx('ui');
    };
    b.onkeydown = e => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        const next = TABS[(TABS.indexOf(n) + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length];
        showTab(next);
        $('#tab-btn-' + next).focus();
        e.preventDefault();
    };
});

/* AUDIO TAB: Volume */
panel.querySelectorAll('input[data-ch]').forEach(inp => {
    const ch = inp.dataset.ch, out = $('#out-' + ch);
    inp.value = S.vol[ch];
    out.textContent = S.vol[ch] + '%';
    inp.oninput = () => {
        S.vol[ch] = +inp.value;
        out.textContent = inp.value + '%';
        applyAudio();
        if (pvId) pv.volume = vol(SLOT[pvId].ch);   // keep the preview in step
        save();
    };
    // hear the new level (music and video play on their own)
    inp.onchange = () => {
        if (ch === 'music' || ch === 'video') return;
        sfx(SLOT[ch] ? ch : 'ui');
    };
});
/* AUDIO TAB: Sounds (one row per slot: play, upload, reset) */
const sndMsg = $('#snd-msg');
const say = t => { sndMsg.textContent = t; };
const rows = {};
function refreshRow(id) {
    const r = rows[id], c = custom[id];
    const nm = c ? c.name : id === 'music' ? track().label : 'Default';
    r.name.textContent = nm;
    r.name.title = nm;
    r.reset.disabled = !c;
}
function setCustom(id, blob, name) {
    pvClear(id);   // the preview may be using the old file
    if (custom[id]) URL.revokeObjectURL(custom[id].url);
    custom[id] = { url: URL.createObjectURL(blob), name };
    loadSlot(id);
    refreshRow(id);
    if (id === 'music') applyAudio();
}
// pre-listen: one sound at a time
const pv = new Audio();
pv.preload = 'auto';
let pvId = null; // slot being previewed
const pvSrc = id => (custom[id] && custom[id].url) || SLOT[id].src;
function paintPreview() {
    SLOTS.forEach(s => {
        const playing = pvId === s.id && !pv.paused && !pv.ended;
        rows[s.id].play.textContent = playing ? 'Stop' : 'Play';
        if (playing) rows[s.id].el.dataset.active = ''; else delete rows[s.id].el.dataset.active;
    });
}
function pvToggle(id) {
    if (pvId === id && !pv.paused && !pv.ended) {
        pvStop();
        return;
    }
    const was = pvId;
    pvId = id;
    pv.src = pvSrc(id);
    pv.volume = vol(SLOT[id].ch);
    if (was === 'music' && id !== 'music') applyAudio();   // give the background track back
    pv.play().catch(() => {});
    paintPreview();
}
function pvStop() {
    if (!pvId) return;
    const wasMusic = pvId === 'music';
    pv.pause();
    pv.currentTime = 0;
    pvId = null;
    if (wasMusic) applyAudio();
    paintPreview();
}
function pvClear(id) { // drop the loaded sound when its file is replaced or reset
    if (pvId !== id) return;
    pv.removeAttribute('src');
    pv.load();
    pvStop();
}
// the background track pauses while the music slot previews
pv.onplay = () => {
    if (pvId === 'music') bgm.pause();
    paintPreview();
};
pv.onpause = () => {
    if (pvId === 'music') applyAudio();
    paintPreview();
};
pv.onended = () => {
    if (pvId === 'music') applyAudio();
    paintPreview();
};
SLOTS.forEach(s => {
    const el = document.createElement('div');
    el.className = 'snd';
    el.innerHTML =
        '<div class="snd-top"><span class="snd-label"></span><span class="snd-name"></span></div>' +
        '<div class="snd-btns">' +
        '<button type="button" class="small play">Play</button>' +
        '<button type="button" class="small up">Upload</button>' +
        '<button type="button" class="small rst">Reset</button>' +
        '</div>' +
        '<input type="file" accept="audio/*" tabindex="-1">';
    const file = el.querySelector('input');
    el.querySelector('.snd-label').textContent = s.label;
    file.setAttribute('aria-label', 'Upload sound for ' + s.label);
    rows[s.id] = { 
                    el, name: el.querySelector('.snd-name'), 
                    reset: el.querySelector('.rst'), 
                    play: el.querySelector('.play') 
                 };
    if (s.id === 'music') { // choose one of the shipped tracks
        const sel = document.createElement('select');
        sel.setAttribute('aria-label', 'Music track');
        TRACKS.forEach(t => sel.add(new Option(t.label, t.id)));
        sel.value = S.track;
        sel.onchange = () => {
            S.track = sel.value;
            save();
            pvClear('music');
            if (!custom.music) loadSlot('music'); // an uploaded file keeps playing until it is reset
            refreshRow('music');
            applyAudio();
            say('Music: ' + track().label + (custom.music ? ' (your uploaded file is still in use; press Reset to hear it).' : '.'));
        };
        el.insertBefore(sel, el.querySelector('.snd-btns'));
    }
    el.querySelector('.play').onclick = () => pvToggle(s.id);
    el.querySelector('.up').onclick = () => file.click();
    file.onchange = () => {
        const f = file.files[0];
        file.value = ''; // allow picking the same file again
        if (!f) return;
        if (!f.type.startsWith('audio/')) return say(f.name + ' is not an audio file.');
        if (f.size > MAX_UPLOAD) return say(f.name + ' is larger than 8 MB.');
        setCustom(s.id, f, f.name);
        say(s.label + ': using ' + f.name + '.');
        idb.put(s.id, { blob: f, name: f.name }).catch(() => {
            say(s.label + ': using ' + f.name + ', but it could not be saved and will reset when you reload.');
        });
    };
    el.querySelector('.rst').onclick = () => {
        if (!custom[s.id]) return;
        pvClear(s.id);
        URL.revokeObjectURL(custom[s.id].url);
        delete custom[s.id];
        loadSlot(s.id);
        refreshRow(s.id);
        if (s.id === 'music') applyAudio();
        idb.del(s.id).catch(() => {});
        say(s.label + (s.id === 'music' ? ': back to ' + track().label + '.' : ': back to the default sound.'));
    };
    $('#sounds').appendChild(el);
    refreshRow(s.id);
});

/* THEME TAB: Colors (overrides saved per theme, set inline on <html>) */
const HEX = /^#[0-9a-f]{6}$/i;
const COLOR_KEYS = [
    ['bg', 'Page background'], ['surface', 'Panels'], ['text', 'Text'], ['accent', 'Accent'],
    ['hid', 'Hidden cells'], ['rev', 'Revealed cells'], ['danger', 'Mine hit'],
    ['n1', 'Number 1'], ['n2', 'Number 2'], ['n3', 'Number 3'], ['n4', 'Number 4'],
    ['n5', 'Number 5'], ['n6', 'Number 6'], ['n7', 'Number 7'], ['n8', 'Number 8']
];
const DERIVED = ['hidh', 'muted']; // recomputed when the colors above are customised
{ // drop anything in storage that is not a known theme / key / hex color
    const clean = {};
    const saved = S.colors && typeof S.colors === 'object' ? S.colors : {};
    themes.forEach(t => {
        const o = {};
        COLOR_KEYS.forEach(([k]) => { if (saved[t] && HEX.test(saved[t][k])) o[k] = saved[t][k]; });
        if (Object.keys(o).length) clean[t] = o;
    });
    S.colors = clean;
}
const toHex = v => HEX.test(v) ? v : /^#[0-9a-f]{3}$/i.test(v) ?
             '#' + [...v.slice(1)].map(c => c + c).join('') : '#000000';
const colorInputs = {};
COLOR_KEYS.forEach(([k, name]) => {
    const l = document.createElement('label');
    const inp = document.createElement('input');
    const t = document.createElement('span');
    inp.type = 'color';
    inp.setAttribute('aria-label', name + ' color');
    t.textContent = name;
    l.append(inp, t);
    inp.oninput = () => {
        (S.colors[S.theme] = S.colors[S.theme] || {})[k] = inp.value;
        applyColors();
        save();
    };
    colorInputs[k] = inp;
    $('#colors').appendChild(l);
});
function applyColors() {
    const st = root.style;
    COLOR_KEYS.forEach(([k]) => st.removeProperty('--' + k));
    DERIVED.forEach(k => st.removeProperty('--' + k));
    const cs = getComputedStyle(root), ov = S.colors[S.theme] || {};
    COLOR_KEYS.forEach(([k]) => {
        colorInputs[k].value = toHex(ov[k] || cs.getPropertyValue('--' + k).trim()); // picker shows the effective color
    });
    Object.keys(ov).forEach(k => st.setProperty('--' + k, ov[k]));
    if (ov.hid) st.setProperty('--hidh', 'color-mix(in srgb, var(--hid) 85%, white)');
    if (ov.text || ov.surface) 
        st.setProperty('--muted', 'color-mix(in srgb, var(--text) 62%, var(--surface))');
    $('#cur-theme').textContent = S.theme;
}
$('#colors-reset').onclick = () => {
    delete S.colors[S.theme];
    applyColors();
    save();
    sfx('ui');
};
/* THEME TAB: Fonts (app font + board/counter font) */
// ui = default app text size (px), num = default board/counter size (%). Each font has its own.
const FONTS = {
    bytes:    { label: 'Two Fifty Six Bytes', ui: 20, num: 105, stack: '"Two Fifty Six Bytes", monospace' }, // fonts/TwofiftysixbytesRegular-5yD0j.otf
    times:    { label: 'Times New Roman', ui: 20, num: 115, stack: '"Times New Roman", Times, serif' },
    consolas: { label: 'Consolas',        ui: 19, num: 105, stack: 'Consolas, "Courier New", monospace' },
    segoe:    { label: 'Segoe UI',        ui: 18, num: 100, stack: '"Segoe UI", system-ui, -apple-system, Roboto, Arial, sans-serif' },
    ithaca:   { label: 'Ithaca',          ui: 24, num: 115, stack: '"Ithaca", sans-serif' }, // fonts/Ithaca-LVB75.ttf
    comic:    { label: 'Comic Sans MS',   ui: 19, num: 100, stack: '"Comic Sans MS", "Comic Sans", "Chalkboard SE", cursive' }
};
const CUSTOM_SIZE = { ui: 18, num: 100 }; // default for an uploaded font
// ui = whole app; num = board digits, mine counter, timer (--font-num)
const T = {
    ui: {
        prop: 'font', def: 'bytes', family: 'MSCustomFont', fallback: 'sans-serif',
        idb: 'font', name: 'App font', sk: 'ui', min: 12, max: 36, step: 1, unit: 'px',
        size: $('#font-size'), sout: $('#out-font-size'), sdef: $('#font-size-def'),
        sel: $('#font-sel'), up: $('#font-up'), rst: $('#font-rst'), 
             file: $('#font-file'), msg: $('#font-msg'), face: null
    },
    num: {
        prop: 'fontNum', def: 'bytes', family: 'MSCustomNumFont', fallback: 'ui-monospace, Menlo, Consolas, monospace',
        idb: 'font-num', name: 'Board and counter font', sk: 'num', min: 60, max: 180, step: 5, unit: '%',
        size: $('#font-num-size'), sout: $('#out-font-num-size'), sdef: $('#font-num-size-def'),
        sel: $('#font-num-sel'), up: $('#font-num-up'), rst: $('#font-num-rst'), 
             file: $('#font-num-file'), msg: $('#font-num-msg'), face: null
    }
};
if (!FONTS[S.font] && S.font !== 'custom') S.font = 'bytes';
if (!FONTS[S.fontNum] && S.fontNum !== 'custom' && S.fontNum !== 'same') S.fontNum = 'bytes';
S.fontSize = S.fontSize || {};
Object.values(T).forEach(t => {
    const old = S.fontSize[t.sk] || {}, clean = {};
    Object.keys(old).forEach(k => { if (FONTS[k] || k === 'custom') { const v = num(old[k], t.min, t.max, null); if (v !== null) clean[k] = v; } });
    S.fontSize[t.sk] = clean;
    t.size.min = t.min; t.size.max = t.max; t.size.step = t.step;
});
// the font whose size applies to a target ("same as app font" uses the app font's board size)
const sizeKey = t => (t === T.num && S.fontNum === 'same' ? S.font : S[t.prop]);
const sizeDef = (t, k) => k === 'custom' ? CUSTOM_SIZE[t.sk] : FONTS[k][t.sk];
const sizeOf = t => { const k = sizeKey(t); return S.fontSize[t.sk][k] ?? sizeDef(t, k); };
Object.values(T).forEach(t => {
    if (t === T.num) t.sel.add(new Option('Same as app font', 'same'));
    Object.keys(FONTS).forEach(k => t.sel.add(new Option(FONTS[k].label, k)));
    t.customOpt = new Option('Uploaded font', 'custom');
    t.sel.add(t.customOpt);
});
function applyFont() {
    Object.values(T).forEach(t => {
        if (S[t.prop] === 'custom' && !t.face) S[t.prop] = t.def; // the uploaded font is gone
        t.sel.value = S[t.prop];
        t.customOpt.disabled = !t.face;
        t.rst.disabled = !t.face;
    });
    const stack = t => S[t.prop] === 'custom' ? '"' + t.family + '", ' + t.fallback : FONTS[S[t.prop]].stack;
    Object.values(T).forEach(t => {
        const v = sizeOf(t);
        t.size.value = v;
        t.sout.textContent = v + (t.unit === '%' ? '%' : ' px');
        t.size.disabled = t === T.num && S.fontNum === 'same';
        t.sdef.disabled = t.size.disabled || S.fontSize[t.sk][sizeKey(t)] === undefined;
    });
    root.style.setProperty('--ui-size', sizeOf(T.ui) + 'px');
    root.style.setProperty('--num-k', sizeOf(T.num) / 100);
    root.style.setProperty('--font-ui', stack(T.ui));
    root.style.setProperty('--font-num', S.fontNum === 'same' ? 'var(--font-ui)' : stack(T.num));
}
async function useFont(t, blob, name) {
    const fontFace = new FontFace(t.family, await blob.arrayBuffer());
    await fontFace.load();
    if (t.face) document.fonts.delete(t.face);
    document.fonts.add(fontFace);
    t.face = fontFace;
    t.msg.textContent = 'Using ' + name + '.';
}
function removeFont(t) {
    if (!t.face) return;
    document.fonts.delete(t.face);
    t.face = null;
    if (S[t.prop] === 'custom') S[t.prop] = t.def;
    applyFont();
    idb.del(t.idb).catch(() => {});
}
Object.values(T).forEach(t => {
    t.sel.onchange = () => {
        S[t.prop] = t.sel.value;
        applyFont();
        save();
        sfx('ui');
    };
    t.size.oninput = () => {
        S.fontSize[t.sk][sizeKey(t)] = +t.size.value;
        applyFont();
        save();
    };
    t.sdef.onclick = () => {
        delete S.fontSize[t.sk][sizeKey(t)];
        applyFont();
        save();
        sfx('ui');
    };
    t.up.onclick = () => t.file.click();
    t.file.onchange = async e => {
        const f = e.target.files[0];
        e.target.value = '';
        if (!f) return;
        if (f.size > MAX_UPLOAD) {
            t.msg.textContent = f.name + ' is larger than 8 MB.';
            return;
        }
        try {
            await useFont(t, f, f.name);
        } catch (err) {
            t.msg.textContent = f.name + ' is not a usable font file.';
            return;
        }
        S[t.prop] = 'custom';
        applyFont();
        save();
        idb.put(t.idb, { blob: f, name: f.name }).catch(() => {
            t.msg.textContent = 'Using ' + f.name + ', but it could not be saved and will reset when you reload.';
        });
    };
    t.rst.onclick = () => {
        removeFont(t);
        save();
        t.msg.textContent = 'Uploaded font removed.';
        sfx('ui');
    };
});
/* 
    THEME TAB: shared image/video upload rows
    Used by Cursors, Icons, Board background and App background.
    Uploads live in IndexedDB as "img:<id>". Rows are built in Boot.
*/
const ASSETS = [
    // icons
    { id: 'face-default', label: 'Face: normal',                     v: '--ic-face-default', def: 'assets/face-default.png' },
    { id: 'face-oh',      label: 'Face: surprised (while pressing)', v: '--ic-face-oh',      def: 'assets/face-oh.png' },
    { id: 'face-win',     label: 'Face: win',                        v: '--ic-face-win',     def: 'assets/face-win.png' },
    { id: 'face-die',     label: 'Face: lose',                       v: '--ic-face-die',     def: 'assets/face-die.png' },
    { id: 'mute-on',      label: 'Sound button: on',                 v: '--ic-mute-on',      def: 'assets/speaker-default.png' },
    { id: 'mute-off',     label: 'Sound button: off',                v: '--ic-mute-off',     def: 'assets/speaker-mute.png' },
    { id: 'settings',     label: 'Settings button',                  v: '--ic-settings',     def: 'assets/settings.png' },
    { id: 'flag-icon',    label: 'Flag mode button icon',            img: '#flagmode .btn-ico', def: 'assets/flag-icon.png' },
    { id: 'flag-cell',    label: 'Flag on the board',                v: '--ic-flag-cell',    def: 'assets/flag-cell.png' },
    // cursors
    { id: 'cur-normal', label: 'Cursor: normal',                                cursor: true, key: 'normal', def: 'assets/cursor-normal.png' },
    { id: 'cur-select', label: 'Cursor: select (left click held)',              cursor: true, key: 'select', def: 'assets/cursor-select.png' },
    { id: 'cur-flag',   label: 'Cursor: flag (right click or flag mode)',       cursor: true, key: 'flag',   def: 'assets/cursor-flag.png' },
    { id: 'cur-hold',   label: 'Cursor: holding (dragging the grip bar)',       cursor: true, key: 'hold',   def: 'assets/cursor-hold.png', hot: 'c' },
    { id: 'cur-text',   label: 'Cursor: text and resize',                       cursor: true, key: 'text',   def: 'assets/cursor-text.png', hot: 'c' },
    // backgrounds
    { id: 'board-bg',     label: 'Board image or video',             bg: 'board', video: true, def: '' },
    { id: 'app-bg',       label: 'App image or video',               bg: 'app',   video: true, def: '' }
];
const ASSET = Object.fromEntries(ASSETS.map(a => [a.id, a]));
const MAX_VIDEO = 64 * 1024 * 1024;
const assets = {}; // id -> { url, name, type } (uploads)
const arows = {};
const imgMsg = $('#img-msg'), curMsg = $('#cur-msg');
const msgEl = a => a.cursor ? curMsg : imgMsg;
function applyAsset(a) {
    const c = assets[a.id], st = root.style;
    const isVid = !!c && c.type === 'video';
    if (a.cursor) {
        applyCursor(a);
    } else if (a.bg === 'board') {
        if (c && !isVid) {
            st.setProperty('--board-img', 'url("' + c.url + '")');
            board.dataset.img = '';
        } else {
            st.removeProperty('--board-img');
            delete board.dataset.img;
        }
        if (isVid) {
            board.dataset.vid = '';
            setVideo(bv, c.url);
        } else {
            delete board.dataset.vid;
            clearVideo(bv);
        }
        $('#board-vid-opt').hidden = !isVid;
    } else if (a.bg === 'app') {
        $('#appbg').hidden = !c;
        if (c && !isVid) st.setProperty('--app-img', 'url("' + c.url + '")');
        else st.removeProperty('--app-img');
        if (isVid) setVideo(av, c.url);
        else clearVideo(av);
        $('#app-vid-opt').hidden = !isVid;
    } else if (a.img) {
        $(a.img).src = c ? c.url : a.def;
    } else if (c) {
        st.setProperty(a.v, 'url("' + c.url + '")');
    } else {
        st.removeProperty(a.v);   // the CSS fallback (default file in /assets) takes over
    }
    if (a.bg) applyVideos();
    const r = arows[a.id], u = c && !isVid ? c.url : a.def;
    r.name.textContent = c ? c.name : 'Default';
    r.name.title = c ? c.name : '';
    r.reset.disabled = !c;
    r.thumb.style.backgroundImage = u ? 'url("' + u + '")' : '';
    r.thumb.classList.toggle('is-video', isVid);   // videos get a play marker
}
function setAsset(a, blob, name) {
    if (assets[a.id]) URL.revokeObjectURL(assets[a.id].url);
    assets[a.id] = { 
        url: URL.createObjectURL(blob), name, type: blob.type.startsWith('video/') ? 
        'video' : 'image' 
    };
    applyAsset(a);
}
function resetAsset(a) {
    const c = assets[a.id];
    if (!c) return;
    URL.revokeObjectURL(c.url);
    delete assets[a.id];
    applyAsset(a);
    idb.del('img:' + a.id).catch(() => {});
}
function addAssetRow(a) {
    const el = document.createElement('div');
    el.className = 'snd';
    el.innerHTML =
        '<div class="snd-top"><span class="snd-label"></span><span class="snd-name"></span></div>' +
        '<div class="snd-btns">' +
        '<div class="thumb" role="img" aria-hidden="true"></div>' +
        '<button type="button" class="small up">Upload</button>' +
        '<button type="button" class="small rst">Reset</button>' +
        '</div>' +
        '<input type="file" accept="' + (a.video ? 'image/*,video/*' : 'image/*') + '" tabindex="-1">';
    const file = el.querySelector('input');
    el.querySelector('.snd-label').textContent = a.label;
    file.setAttribute('aria-label', 'Upload image for ' + a.label);
    arows[a.id] = { 
        name: el.querySelector('.snd-name'), reset: el.querySelector('.rst'), 
        thumb: el.querySelector('.thumb') 
    };
    if (a.cursor) { // cursors also get a hotspot and a scale control
        const hl = document.createElement('label');
        hl.className = 'hot';
        hl.innerHTML = 'Hotspot <select><option value="tl">Top-left</option><option value="c">Center</option></select>';
        const sel = hl.querySelector('select');
        sel.value = S.curHot[a.id];
        sel.onchange = () => {
            S.curHot[a.id] = sel.value;
            applyCursor(a);
            save();
            sfx('ui');
        };
        hotSel[a.id] = sel;
        el.insertBefore(hl, file);
        const sl = document.createElement('label');
        sl.className = 'hot';
        sl.innerHTML = 'Scale <input type="range" min="50" max="200" step="5"><output></output>';
        const sin = sl.querySelector('input'), sout = sl.querySelector('output');
        sin.value = S.curScale[a.id];
        sout.textContent = S.curScale[a.id] + '%';
        sin.oninput = () => { 
            S.curScale[a.id] = +sin.value;
            sout.textContent = sin.value + '%';
            curImg[a.key].style.setProperty('--k', sin.value / 100);
            save();
        };
        scaleSel[a.id] = { sin, sout };
        el.insertBefore(sl, file);
    }
    el.querySelector('.up').onclick = () => file.click();
    file.onchange = () => {
        const f = file.files[0];
        file.value = '';
        if (!f) return;
        const isVid = f.type.startsWith('video/');
        if (!f.type.startsWith('image/') && !(a.video && isVid)) {
            imgMsg.textContent = f.name +
                (a.video ? ' is not an image or video file.' : ' is not an image file.');
            return;
        }
        if (f.size > (isVid ? MAX_VIDEO : MAX_UPLOAD)) {
            imgMsg.textContent = f.name + ' is larger than ' + (isVid ? '64' : '8') + ' MB.';
            return;
        }
        setAsset(a, f, f.name);
        msgEl(a).textContent = a.label + ': using ' + f.name + '.';
        idb.put('img:' + a.id, { blob: f, name: f.name }).catch(() => {
            msgEl(a).textContent = a.label + ': using ' + f.name + 
                ', but it could not be saved and will reset when you reload.';
        });
    };
    el.querySelector('.rst').onclick = () => {
        resetAsset(a);
        msgEl(a).textContent = a.label + ': back to the default.';
        sfx('ui');
    };

    $(a.bg ? '#assets-' + a.bg : a.cursor ? '#assets-cursor' : '#assets').appendChild(el);
    applyAsset(a);
}
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
/* THEME TAB: Icons and images (rows come from addAssetRow) */
/* THEME TAB: Board background (#board-video, #assets-board) */
S.boardVideoMuted = S.boardVideoMuted !== false;   // videos start muted
S.dim = num(S.dim, 0, 80, DEF.dim);
const boardMute = $('#board-vid-mute'), dimEl = $('#dim'), dimOut = $('#out-dim');
function paintBoardBg() {
    root.style.setProperty('--dimp', S.dim + '%');
    dimOut.textContent = S.dim + '%';
    dimEl.value = S.dim;
    boardMute.checked = S.boardVideoMuted;
}
boardMute.onchange = () => {
    S.boardVideoMuted = boardMute.checked;
    applyVideos();
    save();
};
dimEl.oninput = () => {
    S.dim = +dimEl.value;
    paintBoardBg();
    save();
};
/* THEME TAB: App background (#appbg, #assets-app) */
S.appVideoMuted = S.appVideoMuted !== false;
S.appDim = num(S.appDim, 0, 80, DEF.appDim);
const appMute = $('#app-vid-mute'), appDimEl = $('#appdim'), appDimOut = $('#out-appdim');

function paintAppBg() {
    root.style.setProperty('--appdimp', S.appDim + '%');
    appDimOut.textContent = S.appDim + '%';
    appDimEl.value = S.appDim;
    appMute.checked = S.appVideoMuted;
}
appMute.onchange = () => {
    S.appVideoMuted = appMute.checked;
    applyVideos();
    save();
};
appDimEl.oninput = () => {
    S.appDim = +appDimEl.value;
    paintAppBg();
    save();
};
/* THEME TAB: Reset all appearance */
$('#theme-reset-all').onclick = () => {
    if (!confirm('Reset all colors, the font, icons and the board image to the defaults?')) 
        return;
    S.colors = {};
    S.dim = DEF.dim;
    S.appDim = DEF.appDim;
    S.boardVideoMuted = true;
    S.appVideoMuted = true;
    paintBoardBg();
    paintAppBg();
    S.cursorsOn = true;
    S.curSize = DEF.curSize;
    applyCurSize();
    ASSETS.filter(a => a.cursor).forEach(a => {
        S.curHot[a.id] = a.hot || 'tl';
        S.curScale[a.id] = 100;
    });
    ASSETS.forEach(resetAsset);
    paintCursorPrefs();
    S.font = T.ui.def;
    S.fontNum = T.num.def;
    S.fontSize = { ui: {}, num: {} };
    removeFont(T.ui);
    removeFont(T.num);
    applyFont();
    resetLayout(true);
    applyColors();
    save();
    imgMsg.textContent = 'All appearance settings reset.';
    sfx('ui');
};

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

/* CREDIT POPUP: click the app name. A plain overlay (not <dialog>), so the page-drawn cursor stays visible above it. */
{
    const title = $('header h1'), box = $('#credit'), ok = $('#credit-close');
    let from = null;
    const show = open => {
        box.hidden = !open;
        if (open) {
            from = document.activeElement;
            ok.focus();
        } else if (from) {
            from.focus();
            from = null;
        }
    };
    title.onclick = () => {
        show(true);
        sfx('ui');
    };
    title.onkeydown = e => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            show(true);
        }
    };
    ok.onclick = () => {
        show(false);
        sfx('ui');
    };
    box.addEventListener('pointerdown', e => { if (e.target === box) show(false); });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && !box.hidden) show(false);
    });
}

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
