"use strict";

/* Key bindings + the Keys settings tab */

/* 
    KEY BINDINGS
    Every action has two slots (S.keys[action] = [slot1, slot2]); edit them in Settings > Keys.
    C ("jump to board") brings the keyboard back to the board and locks / unlocks the view.
    There is no chord key: the open key (D / Space) chords on an opened number.
*/
const KEY_ACTIONS = [
    { id: 'up',      label: 'Move up',               grp: 'move', def: ['ArrowUp', null] },
    { id: 'down',    label: 'Move down',             grp: 'move', def: ['ArrowDown', null] },
    { id: 'left',    label: 'Move left',             grp: 'move', def: ['ArrowLeft', null] },
    { id: 'right',   label: 'Move right',            grp: 'move', def: ['ArrowRight', null] },
    { id: 'reveal',  label: 'Open cell',             grp: 'act', def: ['d', ' '] },
    { id: 'flag',    label: 'Flag',                  grp: 'act', def: ['f', null] },
    { id: 'focus',   label: 'Jump to board, lock / unlock view', grp: 'view', def: ['c', null] },
    { id: 'settings', label: 'Open / close settings', grp: 'view', def: ['s', null] },
    { id: 'mute',    label: 'Mute / unmute sound',   grp: 'view', def: ['m', null] },
    { id: 'restart', label: 'New game',              grp: 'act', def: ['r', null] },
    { id: 'hint',    label: 'Show a hint',           grp: 'act', def: ['h', null] },
    { id: 'guide',   label: 'Open / close quick guide', grp: 'view', def: ['g', null] },
    { id: 'zin',     label: 'Zoom in',               grp: 'view', def: ['+', '='] },
    { id: 'zout',    label: 'Zoom out',              grp: 'view', def: ['-', '_'] },
    { id: 'zreset',  label: 'Reset view',            grp: 'view', def: ['1', null] },
    { id: 'lreset',  label: 'Reset layout',          grp: 'view', def: ['2', null] }
];
const KEY_LABEL = Object.fromEntries(KEY_ACTIONS.map(a => [a.id, a.label]));
const KEY_BLOCKED = new Set(['Tab', 'Escape', 'Enter', 'Shift', 'Control', 'Alt', 'Meta', 
    'CapsLock', 'Dead', 'Process', 'Unidentified', 'Backspace', 'Delete']);
const keyName = k => k.length === 1 ? k.toLowerCase() : k;
const keyDefaults = () => Object.fromEntries(KEY_ACTIONS.map(a => [a.id, a.def.slice()]));
{
    const sv = S.keys && typeof S.keys === 'object' ? S.keys : {};
    S.keys = keyDefaults();
    KEY_ACTIONS.forEach(a => {
        if (!Array.isArray(sv[a.id])) return;
        S.keys[a.id] = [0, 1].map(i => {
            const k = sv[a.id][i];
            return typeof k === 'string' && k && !KEY_BLOCKED.has(k) ? keyName(k) : null;
        });
    });
    // actions added in a newer version get their default key only if the person has not already put it elsewhere
    KEY_ACTIONS.forEach(a => {
        if (Array.isArray(sv[a.id])) return;
        S.keys[a.id] = S.keys[a.id].map(k => k && KEY_ACTIONS.some(o => o.id !== a.id 
            && Array.isArray(sv[o.id]) && S.keys[o.id].includes(k)) ? null : k);
    });
}
const isKey = (action, e) => 
    !e.ctrlKey && !e.metaKey && !e.altKey && S.keys[action].includes(keyName(e.key));
// true while the person is typing text (sliders, checkboxes, buttons and dropdowns are fine)
const TEXT_INPUT = /^(text|number|search|email|url|tel|password)$/;
function isTyping(el) {
    if (!el) return false;
    if (el.isContentEditable || el.tagName === 'TEXTAREA') return true;
    return el.tagName === 'INPUT' && TEXT_INPUT.test(el.type);
}

/* Keys tab: click a slot, press a key */
const keysList = $('#tab-keys'), keysMsg = $('#keys-msg');
let capturing = null, lastAssign = 0;
const slotBtn = {}; // action id -> [button, button]
const keyShow = k => k == null ? 'None' : 
    ({ ' ': 'Space', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→' }[k] 
        || (k.length === 1 ? k.toUpperCase() : k));
function paintKeys() {
    KEY_ACTIONS.forEach(a => [0, 1].forEach(s => {
        const b = slotBtn[a.id][s], on = capturing && capturing.action === a.id && capturing.slot === s;
        b.textContent = on ? 'Press a key' : keyShow(S.keys[a.id][s]);
        b.setAttribute('aria-pressed', !!on);
        b.setAttribute('aria-label', a.label + ', key ' + (s + 1) + ': ' + 
            (on ? 'press a key' : keyShow(S.keys[a.id][s])));
    }));
    $('#lockkey').textContent = keyShow(S.keys.focus[0] || S.keys.focus[1]);
}
function assignKey(action, slot, key) {
    const moved = [];
    if (key) {
        KEY_ACTIONS.forEach(a => {
            if (a.id === action) return;
            if (S.keys[a.id].includes(key)) {
                S.keys[a.id] = S.keys[a.id].map(k => k === key ? null : k);
                moved.push(a.label);
            }
        });
        // the same key twice on one action is pointless: clear the other slot
        S.keys[action] = S.keys[action].map((k, i) => i !== slot && k === key ? null : k);
    }
    S.keys[action][slot] = key;
    save();
    keysMsg.textContent = moved.length ? keyShow(key) + ' was taken from: ' + moved.join(', ') + '.' : '';
    lastAssign = performance.now();
    capturing = null;
    paintKeys();
}
KEY_ACTIONS.forEach(a => {
    const row = document.createElement('div'), lb = document.createElement('span');
    row.className = 'keyrow';
    lb.className = 'keylabel';
    lb.textContent = a.label;
    row.append(lb);
    slotBtn[a.id] = [0, 1].map(s => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'small keyslot';
        b.onclick = e => {
            // a Space press that just set a key must not also start a new capture
            if (e.detail === 0 && performance.now() - lastAssign < 400) return;
            capturing = { action: a.id, slot: s };
            keysMsg.textContent = 'Press the new key. Backspace clears it, Esc cancels.';
            paintKeys();
            b.focus();
            sfx('ui');
        };
        row.append(b);
        return b;
    });
    $('.keys[data-grp="' + a.grp + '"]').append(row);
});
keysList.addEventListener('focusout', e => { // clicking away cancels
    if (capturing && !keysList.contains(e.relatedTarget)) {
        capturing = null;
        keysMsg.textContent = '';
        paintKeys();
    }
});
document.addEventListener('keydown', e => { // while capturing, nothing else sees the key
    if (!capturing) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (e.repeat || ['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return;
    if (e.key === 'Escape') {
        capturing = null;
        keysMsg.textContent = '';
        paintKeys();
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
        assignKey(capturing.action, capturing.slot, null);
    } else if (KEY_BLOCKED.has(e.key) || e.ctrlKey || e.metaKey || e.altKey) {
        keysMsg.textContent = 'That key cannot be used. Try another.';
    } else {
        assignKey(capturing.action, capturing.slot, keyName(e.key));
    }
}, true);
$('#keys-reset').onclick = () => {
    capturing = null;
    S.keys = keyDefaults();
    save();
    keysMsg.textContent = 'Keys are back to their defaults.';
    paintKeys();
    sfx('ui');
};
paintKeys();
