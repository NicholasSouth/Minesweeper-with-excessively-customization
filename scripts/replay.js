"use strict";

/* Replay recording, playback, .mire import/export, act/doReveal/doFlag/doChord */

/*
    REPLAY: every move that changes the board is recorded as { k, i, t }
    (k: 'r' open, 'f' flag, 'c' chord; i: cell index; t: ms since the first open).
    Mines are placed from the game's seed, so re-applying the same moves to a fresh
    game with that seed reproduces it exactly. A finished game is kept as rpData,
    plays back in a loop on the board, and can be saved as a .mire file (JSON),
    or loaded back from one.
*/
const MIRE_VERSION = 1, // v4.0 starts a new format: old .misw replays can no longer be read
     SPEEDS = [0.5, 1, 2, 4, 8];
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
function makeReplay(game, mv, ms, hints) {
    return {
        rows: game.rows, cols: game.cols, mines: game.mines, safety: game.safety, seed: game.seed,
        noGuess: game.noGuess, hints: hints || 0,
        result: game.status, ms: Math.round(ms || 0), moves: mv.map(m => ({ ...m })),
        created: new Date().toISOString()
    };
}
const serializeReplay = d => ({
    format: 'mire', version: MIRE_VERSION, app: 'Minesweeper', created: d.created,
    rows: d.rows, cols: d.cols, mines: d.mines, safety: d.safety, seed: d.seed, noGuess: !!d.noGuess, hints: d.hints || 0,
    result: d.result, ms: d.ms, moves: d.moves.map(m => [m.k, m.i, m.t])
});
// check a parsed .mire object and replay it on a hidden game; throws a readable error
function parseReplay(o) {
    if (o && o.format === 'misw') 
        throw new Error('Old .misw replays can no longer be opened in v4.0. Only .mire replays work.');
    if (!o || typeof o !== 'object' || o.format !== 'mire') 
        throw new Error('This is not a .mire replay file.');
    if (o.version !== MIRE_VERSION) 
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
    const noGuess = o.noGuess === true, hints = Number.isInteger(o.hints) && o.hints > 0 ? Math.min(o.hints, 9999) : 0,
        sim = newGame(rows, cols, mines, o.safety, seed, noGuess);
    mv.forEach(m => applyTo(sim, m));
    if (sim.status === 'idle') throw new Error('This replay never opens a cell.');
    return {
        rows, cols, mines: sim.mines, safety: o.safety, seed, noGuess, hints, moves: mv,
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
    clearHint();
    rpBadge.hidden = false;
    frame.classList.add('vhs-on'); // VHS look while the replay plays
    $('#msg').textContent = '';
    replayRound(d);
    paintReplay();
}
function replayRound(d) {
    if (!replaying) return;
    g = newGame(d.rows, d.cols, d.mines, d.safety, d.seed, d.noGuess);
    origin = 0;
    if (!(cur >= 0 && cur < d.rows * d.cols)) cur = 0; // keep the player's cursor; only fix it for another board size
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
    const d = rpData = makeReplay(g, moves, g.ms, hintsUsed);
    paintReplay();
    // serialising + writing to storage is synchronous: keep it out of the frame where the explosion starts
    setTimeout(() => { if (rpData === d) store.set('lastReplay', serializeReplay(d)); }, 700);
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
        ? 'Finished games are saved here automatically. You can also import a .mire file.'
        : (replaying ? 'Playing: ' : 'Saved: ') + d.rows + '×' + d.cols + (d.noGuess ? ' no-guess' : '') + ' board, ' + d.mines + ' mines, ' 
          + d.moves.length + ' moves' + (d.hints ? ', ' + d.hints + (d.hints > 1 ? ' hints' : ' hint') : '') + ', '
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
    saveFile(new Blob([JSON.stringify(serializeReplay(rpData))], { type: 'application/json' }), rpName('mire'));
    rpSay('Saved ' + rpName('mire').slice(0, 60) + ' to your downloads.');
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
            throw new Error('This is not a .mire replay file.');
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
} catch (e) { // a replay saved by v3 (.misw) is dropped: it can not be read any more
    try { localStorage.removeItem('msweeper:lastReplay'); } catch (err) {}
}
function act(fn, snd, mv) {
    if (replaying || g.status === 'won' || g.status === 'lost') return;
    clearHint(); // any move takes the hint away
    const before = g.status, rev0 = g.rev, flags0 = g.flags;
    fn();
    if (before === 'idle' && g.status !== 'idle') {
        t0 = performance.now();
        tick = setInterval(clock, 100);
        // no-guess mode could not find a fully logical board (very dense setups): say so
        if (g.ng && !g.ng.ok) 
            $('#msg').textContent = 'No guess-free board found for this setup, so this one may need a guess.';
    }
    if (mv && (g.rev !== rev0 || g.flags !== flags0 || g.status !== before)) {
        recordMove(mv, origin, before);
    }
    // read where the mine is BEFORE draw() restyles every cell: reading it afterwards forces a full layout in the middle of the click
    const boomRect = g.status === 'lost' ? cells[g.boom].getBoundingClientRect() : null;
    draw();
    hud();
    if (g.status === 'lost') {
        end();
        boomFx(boomRect);
        sfx('explode');
        sfx('lose');
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
