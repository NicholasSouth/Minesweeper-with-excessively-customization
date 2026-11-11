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
// neighbour lists for a board size, built once and shared (index -> array of neighbour indexes)
const NB_CACHE = new Map();
function nbTable(rows, cols) {
    const key = rows + 'x' + cols;
    let t = NB_CACHE.get(key);
    if (t) return t;
    t = [];
    for (let i = 0; i < rows * cols; i++) {
        const r = (i / cols) | 0, c = i % cols, o = [];
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (!dr && !dc) continue;
                const a = r + dr, b = c + dc;
                if (a >= 0 && a < rows && b >= 0 && b < cols) o.push(a * cols + b);
            }
        }
        t.push(o);
    }
    NB_CACHE.set(key, t);
    return t;
}
const nbrs = (g, i) => g.nb[i];
// st: 0 hidden, 1 revealed, 2 flagged
function newGame(rows, cols, mines, safety, seed, noGuess) {
    const n = rows * cols;
    return {
        rows, cols, n,
        mines: clampMines(mines, rows, cols, safety),
        safety, seed,
        noGuess: !!noGuess,  // true: mines are re-dealt until the board can be solved by logic alone
        ng: null,            // after the first click in no-guess mode: { tries, ok }
        nb: nbTable(rows, cols),
        mine: new Uint8Array(n),
        adj: new Uint8Array(n),
        st: new Uint8Array(n),
        rev: 0, flags: 0,
        first: -1,           // the cell opened first (the board is dealt from it); saved in a .mifi board seed
        status: 'idle', boom: -1
    };
}
/*
    NO-GUESS SOLVER
    Plays a given mine layout from the first click using only logic and says whether the
    whole board gets cleared without a single guess. It is sound (it never "solves" a board
    that needs a guess) but not complete, so a few guess-free boards are skipped; that is fine.
    Rules, tried from cheap to costly:
      1. a number whose mines are all found: the other neighbours are safe
      2. a number whose hidden neighbours are all mines
      3. two numbers where one's hidden cells sit inside the other's (subset rule)
      4. the total mine count (all found: the rest is safe; all rest hidden cells are mines)
    Returns how many safe cells it opened (n - mines = fully solved).
*/
function solveFrom(g, mine, adj, first) {
    const n = g.n, nb = g.nb, safe = n - g.mines;
    const kn = new Uint8Array(n); // 0 unknown, 1 open, 2 known mine
    let open = 0, mk = 0;
    const openCell = i => {
        if (kn[i]) return;
        const q = [i];
        kn[i] = 1;
        open++;
        for (let k = 0; k < q.length; k++) {
            const x = q[k];
            if (adj[x]) continue;
            for (const j of nb[x]) {
                if (!kn[j]) {
                    kn[j] = 1;
                    open++;
                    q.push(j);
                }
            }
        }
    };
    const markMine = j => {
        if (kn[j] === 0) {
            kn[j] = 2;
            mk++;
        }
    };
    openCell(first);
    while (open < safe) {
        let changed = false;
        // rules 1 and 2
        for (let i = 0; i < n; i++) {
            if (kn[i] !== 1 || !adj[i]) continue;
            let u = 0, m = 0;
            for (const j of nb[i]) {
                if (kn[j] === 0) u++;
                else if (kn[j] === 2) m++;
            }
            if (!u) continue;
            const rem = adj[i] - m;
            if (rem === 0) {
                for (const j of nb[i]) openCell(j);
                changed = true;
            } else if (rem === u) {
                for (const j of nb[i]) markMine(j);
                changed = true;
            }
        }
        if (changed) continue;
        // rule 3: collect every open number that still has hidden neighbours
        const hid = new Map(), rem = new Map(), by = new Map(); // cell -> hidden list / mines left; hidden cell -> cells
        for (let i = 0; i < n; i++) {
            if (kn[i] !== 1 || !adj[i]) continue;
            const h = [];
            let m = 0;
            for (const j of nb[i]) {
                if (kn[j] === 0) h.push(j);
                else if (kn[j] === 2) m++;
            }
            if (!h.length) continue;
            hid.set(i, h);
            rem.set(i, adj[i] - m);
            h.forEach(j => (by.get(j) || by.set(j, []).get(j)).push(i));
        }
        for (const [a, ha] of hid) {
            const seen = new Set([a]);
            for (const j of ha) {
                for (const b of by.get(j)) {
                    if (seen.has(b)) continue;
                    seen.add(b);
                    const hb = hid.get(b);
                    if (hb.length <= ha.length || !ha.every(x => hb.includes(x))) continue;
                    const extra = hb.filter(x => !ha.includes(x)), diff = rem.get(b) - rem.get(a);
                    if (diff === 0) {
                        extra.forEach(openCell);
                        changed = true;
                    } else if (diff === extra.length) {
                        extra.forEach(markMine);
                        changed = true;
                    }
                }
            }
            if (changed) break; // the picture changed: start the passes again
        }
        if (changed) continue;
        // rule 4: the mine total
        const left = g.mines - mk, unknown = n - open - mk;
        if (left === 0 && unknown > 0) {
            for (let i = 0; i < n; i++) if (kn[i] === 0) openCell(i);
            changed = true;
        } else if (left === unknown && unknown > 0) {
            for (let i = 0; i < n; i++) if (kn[i] === 0) markMine(i);
            changed = true;
        }
        if (!changed) break; // stuck: this layout would need a guess
    }
    return open;
}
const NG_TRIES = 4000; // layouts tried before giving up (a count, never a clock: replays must repeat exactly)
function place(g, first) {
    const ban = new Set([first]);
    if (g.safety === 'zone') nbrs(g, first).forEach(j => ban.add(j));
    const pool = [];
    for (let i = 0; i < g.n; i++) if (!ban.has(i)) pool.push(i);
    const rnd = mulberry(g.seed);
    const tries = g.noGuess ? NG_TRIES : 1;
    let bestMine = null, bestOpen = -1, used = 0, ok = false;
    const safe = g.n - g.mines;
    while (used < tries && !ok) {
        used++;
        for (let i = pool.length - 1; i > 0; i--) {
            const j = (rnd() * (i + 1)) | 0;
            [pool[i], pool[j]] = [pool[j], pool[i]];
        }
        const mine = new Uint8Array(g.n), adj = new Uint8Array(g.n);
        pool.slice(0, g.mines).forEach(i => mine[i] = 1);
        for (let i = 0; i < g.n; i++) {
            let c = 0;
            for (const j of g.nb[i]) c += mine[j];
            adj[i] = c;
        }
        if (!g.noGuess) {
            g.mine = mine;
            g.adj = adj;
            return;
        }
        const open = solveFrom(g, mine, adj, first);
        if (open > bestOpen) { // keep the layout that logic got furthest on, in case none is perfect
            bestOpen = open;
            bestMine = { mine, adj };
        }
        ok = open === safe;
    }
    g.mine = bestMine.mine;
    g.adj = bestMine.adj;
    g.ng = { tries: used, ok };
}
function reveal(g, i) {
    if (g.status === 'won' || g.status === 'lost' || g.st[i] !== 0) return;
    if (g.status === 'idle') {
        g.first = i;
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
/*
    HINT
    Looks at the board the way a player does: only the opened numbers and the mine total are
    used, never the hidden mines. Flags are the player's guesses, so they are NOT evidence
    (a wrong flag must not poison a hint). Same rules as the solver, but worked out in rounds:
    round 1 uses only what is printed on the board, round 2 may also use what round 1 proved,
    and so on. The first round with something useful to do wins, so the hint is always the
    shortest argument available. A safe cell beats a mine; ties go to the cell nearest `from`.
    Returns null (game not running), { kind: 'none' } (logic is stuck, a guess is needed) or
    { kind: 'safe' | 'mine', cells, by: numbers the argument looks at, rule, round }.
*/
function findHint(g, from) {
    if (g.status !== 'playing') return null;
    const n = g.n, nb = g.nb;
    const kn = new Uint8Array(n); // 0 unknown, 1 opened, 2 proven mine, 3 proven safe
    const nums = [];
    for (let i = 0; i < n; i++) {
        if (g.st[i] === 1) { // a 0 counts too: a wrong flag next to it stops the cascade
            kn[i] = 1;
            nums.push(i);
        }
    }
    const fr = (from / g.cols) | 0, fc = from % g.cols;
    const dist = j => Math.hypot(((j / g.cols) | 0) - fr, (j % g.cols) - fc);
    let grp = 0;
    for (let round = 1; round <= n; round++) {
        const found = new Map(); // cell -> { cell, v, grp, by, rule }
        const add = (cells, v, by, rule) => {
            const id = ++grp;
            for (const j of cells) if (!found.has(j)) found.set(j, { cell: j, v, grp: id, by, rule });
        };
        const hid = new Map(), rem = new Map(), cov = new Map(); // number -> hidden list / mines left; hidden cell -> numbers
        for (const i of nums) {
            const h = [];
            let m = 0;
            for (const j of nb[i]) {
                if (kn[j] === 0) h.push(j);
                else if (kn[j] === 2) m++;
            }
            if (!h.length) continue;
            const r = g.adj[i] - m;
            if (r === 0) add(h, 3, [i], 'count');
            else if (r === h.length) add(h, 2, [i], 'count');
            hid.set(i, h);
            rem.set(i, r);
            h.forEach(j => (cov.get(j) || cov.set(j, []).get(j)).push(i));
        }
        for (const [a, ha] of hid) { // two numbers, one inside the other
            const seen = new Set([a]);
            for (const j of ha) {
                for (const b of cov.get(j)) {
                    if (seen.has(b)) continue;
                    seen.add(b);
                    const hb = hid.get(b);
                    if (hb.length <= ha.length || !ha.every(x => hb.includes(x))) continue;
                    const extra = hb.filter(x => !ha.includes(x)), diff = rem.get(b) - rem.get(a);
                    if (diff === 0) add(extra, 3, [a, b], 'subset');
                    else if (diff === extra.length) add(extra, 2, [a, b], 'subset');
                }
            }
        }
        if (!found.size) { // the mine total
            let mk = 0;
            const un = [];
            for (let i = 0; i < n; i++) {
                if (kn[i] === 2) mk++;
                else if (kn[i] === 0) un.push(i);
            }
            const left = g.mines - mk;
            if (un.length && left === 0) add(un, 3, [], 'total');
            else if (un.length && left === un.length) add(un, 2, [], 'total');
            if (!found.size) return { kind: 'none' };
        }
        const list = [...found.values()];
        list.forEach(f => { kn[f.cell] = f.v; });
        // useful now: a safe cell (even one under a wrong flag) or a mine that is not flagged yet
        const act = list.filter(f => f.v === 3 || g.st[f.cell] !== 2);
        if (act.length) {
            act.sort((x, y) => (y.v === 3) - (x.v === 3) || dist(x.cell) - dist(y.cell));
            const best = act[0];
            return {
                kind: best.v === 3 ? 'safe' : 'mine',
                cells: act.filter(f => f.grp === best.grp && f.v === best.v).map(f => f.cell),
                by: best.by, rule: best.rule, round
            };
        }
    }
    return { kind: 'none' };
}
