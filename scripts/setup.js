"use strict";

/* Setup panel: difficulty, board size, mines, first-click mode */

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
