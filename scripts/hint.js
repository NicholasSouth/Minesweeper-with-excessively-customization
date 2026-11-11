"use strict";

/* Hint: H (or the Hint button) marks a move that logic can prove from what is on the board */

/*
    The logic lives in engine.js (findHint). This file only shows the result:
      green ring + check   = safe cell(s): open it
      red ring + !         = mine(s): flag it
      dashed ring          = the number(s) the hint is built from
    Any move removes the hint. Using a hint is counted for the game; a game won with hints
    does not set a best time, and the count is stored in the .mire replay.
*/
const hintBtn = $('#hint-btn');
function clearHint() {
    hintMap = null;
    hintKey = '';
}
const hintWhere = i => 'row ' + (((i / g.cols) | 0) + 1) + ', column ' + (i % g.cols + 1);
const hintSay = t => { $('#msg').textContent = t; };
function hintText(h) {
    const s = h.cells.length > 1, first = hintWhere(h.cells[0]);
    const tgt = h.kind === 'safe' ? (s ? 'The ringed cells are safe' : 'The ringed cell is safe')
                                  : (s ? 'The ringed cells are all mines' : 'The ringed cell is a mine');
    const num = h.by.map(hintWhere).join(' and ');
    let why;
    if (h.rule === 'total') {
        why = h.kind === 'safe' ? 'every mine is already found, so all the other hidden cells are safe.'
                                : 'the hidden cells left are exactly as many as the mines left.';
    } else if (h.rule === 'count') {
        why = h.kind === 'safe'
            ? 'the number at ' + num + ' already has all its mines, so its other hidden neighbors are safe.'
            : 'the number at ' + num + ' has just as many hidden neighbors as mines it still needs.';
    } else {
        why = 'compare the numbers at ' + num + ': one covers all the hidden cells of the other, and the difference decides it.';
    }
    const flagged = h.kind === 'safe' ? h.cells.filter(c => g.st[c] === 2) : [];
    return 'Hint ' + hintsUsed + ': ' + tgt + ' (starting at ' + first + '): ' + why
        + (h.round > 1 ? ' (This needs the mines worked out nearby first.)' : '')
        + (flagged.length ? ' Your flag there is wrong.' : '');
}
function showHint(fromKey) {
    if (replaying) {
        hintSay('Hints are off while a replay plays.');
        return;
    }
    if (g.status === 'won' || g.status === 'lost') {
        hintSay('This game is over. Press ' + keyShow(S.keys.restart[0] || S.keys.restart[1]) + ' for a new game.');
        return;
    }
    if (g.status === 'idle') {
        hintSay(S.safety === 'none' ? 'Open any cell to begin. The first click is not protected in this mode.'
                                : 'Open any cell to begin: your first click is protected.');
        return;
    }
    const h = findHint(g, cur);
    if (!h || h.kind === 'none') {
        clearHint();
        draw();
        hintSay('No move can be proven from the numbers on the board. You will have to guess.');
        sfx('error');
        return;
    }
    const key = h.kind + ':' + h.cells.join(',');
    if (key !== hintKey) { // asking again for the same hint is free
        hintKey = key;
        hintsUsed++;
    }
    hintMap = {};
    h.by.forEach(i => { hintMap[i] = 'src'; });
    h.cells.forEach(i => { hintMap[i] = h.kind; });
    if (fromKey) board.focus({ preventScroll: true });
    hintSay(hintText(h));
    draw();
    sfx('ui'); // the keyboard cursor and the view stay where they are
}
hintBtn.onclick = () => showHint(false);
