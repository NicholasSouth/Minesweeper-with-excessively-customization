"use strict";

/* Settings sidebar: open/close and tabs */

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
const TABS = ['audio', 'theme', 'effects', 'keys'];
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
