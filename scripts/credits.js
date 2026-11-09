"use strict";

/* Credit popup */

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
