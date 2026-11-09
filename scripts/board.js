"use strict";

/* Game area: board rendering, game flow, best-time line */

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

/* --- info line: message + best time --- */
const boardKey = () => g.rows + 'x' + g.cols + 'x' + g.mines;
function showBest() {
    const b = store.get('stats', { byBoard: {} }).byBoard[boardKey()];
    $('#best').textContent = b && b.bestMs != null ? 'Best on this board: ' + 
        (b.bestMs / 1000).toFixed(1) + ' s' : 'No record yet on this board';
}
