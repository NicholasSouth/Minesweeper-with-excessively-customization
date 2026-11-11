"use strict";

/* Quick guide: a popup opened by the ? button (top right of the setup panel) or the guide key (G) */

/* The key names come from the person's own bindings, so the guide stays right after a rebind. */
const guideBox = $('#guide'), guideBody = $('#guide-body'), guideOk = $('#guide-close'), helpBtn = $('#help-btn');
let guideFrom = null;
const kn1 = id => keyShow(S.keys[id][0] || S.keys[id][1]);
function fillGuide() {
    const rows = [
        ['Open a cell (also chords an opened number)', 'Click / tap', kn1('reveal')],
        ['Flag a cell', 'Right-click / long-press', kn1('flag')],
        ['Show a hint', 'Hint button', kn1('hint')],
        ['New game', 'Face button', kn1('restart')],
        ['Move the keyboard cursor', '', '↑ ↓ ← →'],
        ['Jump to board, lock / unlock scrolling', '', kn1('focus')],
        ['Settings / mute', 'Gear / speaker', kn1('settings') + ' / ' + kn1('mute')],
        ['Zoom in / out, reset view', '+ / - buttons, Ctrl + wheel, pinch', kn1('zin') + ' / ' + kn1('zout') + ', ' + kn1('zreset')],
        ['Reset layout', 'Reset layout', kn1('lreset')],
        ['This guide', '? button', kn1('guide')]
    ];
    const tr = r => '<tr><td>' + r[0] + '</td><td>' + r[1] + '</td><td><kbd>' + r[2] + '</kbd></td></tr>';
    guideBody.innerHTML =
        '<h3>The goal</h3>' +
        '<p>Open every cell that has no mine. A number tells you how many of its 8 neighbours are mines. ' +
        'Flag the cells you are sure are mines.</p>' +
        '<h3>Controls</h3>' +
        '<div class="gtable"><table><thead><tr><th>Action</th><th>Mouse / touch</th><th>Key</th></tr></thead><tbody>' +
        rows.map(tr).join('') + '</tbody></table></div>' +
        '<p class="hint">Every key can be changed in Settings, Keys tab.</p>' +
        '<h3>Hints</h3>' +
        '<p>Press <kbd>' + kn1('hint') + '</kbd> and the game finds a move that can be proven with logic, ' +
        'using only what is on the board:</p>' +
        '<ul><li><span class="gdot g-safe"></span> green ring: the cell is safe, open it</li>' +
        '<li><span class="gdot g-mine"></span> red ring: the cell is a mine, flag it</li>' +
        '<li><span class="gdot g-src"></span> dashed ring: the numbers the hint is built from</li></ul>' +
        '<p>Your flags are never trusted, so a wrong flag is pointed out instead of misleading the hint. ' +
        'If no move can be proven you will be told that a guess is needed. ' +
        'A game won with hints does not set a best time.</p>' +
        '<h3>Boards</h3>' +
        '<p>Your first click is protected (see First click). In <strong>No guessing</strong> mode every board can be ' +
        'cleared by logic alone. Use Flag mode on touch screens, drag the board to pan, and move or resize it with the grip bar and the corner.</p>' +
        '<h3>Files</h3>' +
        '<ul><li><strong>.mire</strong> replay of a game: Replay section, Export / Import</li>' +
        '<li><strong>.mise</strong> your settings: top of the settings bar (uploaded sounds, fonts and images are not included)</li>' +
        '<li><strong>.mifi</strong> board seed: the same board for everyone, under the board setup. ' +
        'It is available once the first cell is opened, because that click deals the board.</li></ul>' +
        '<p class="hint">Old .misw replays from v3 can no longer be opened.</p>';
}
function toggleGuide(open) {
    if (open === !guideBox.hidden) return;
    guideBox.hidden = !open;
    helpBtn.setAttribute('aria-expanded', open);
    if (open) {
        fillGuide();
        guideBody.scrollTop = 0;
        guideFrom = document.activeElement;
        guideOk.focus();
    } else if (guideFrom) {
        guideFrom.focus({ preventScroll: true });
        guideFrom = null;
    }
}
helpBtn.onclick = () => {
    toggleGuide(true);
    sfx('ui');
};
guideOk.onclick = () => {
    toggleGuide(false);
    sfx('ui');
};
guideBox.addEventListener('pointerdown', e => { if (e.target === guideBox) toggleGuide(false); });
document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !guideBox.hidden) toggleGuide(false);
});
