"use strict";

/* Game engine: pure minesweeper logic (no DOM) */

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
