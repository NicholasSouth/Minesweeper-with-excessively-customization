"use strict";

/* Theme tab: board background, app background, reset all appearance */

/* THEME TAB: Icons and images (rows come from addAssetRow) */
/* THEME TAB: Board background (#board-video, #assets-board) */
S.boardVideoMuted = S.boardVideoMuted !== false;   // videos start muted
S.dim = num(S.dim, 0, 80, DEF.dim);
const boardMute = $('#board-vid-mute'), dimEl = $('#dim'), dimOut = $('#out-dim');
function paintBoardBg() {
    root.style.setProperty('--dimp', S.dim + '%');
    dimOut.textContent = S.dim + '%';
    dimEl.value = S.dim;
    boardMute.checked = S.boardVideoMuted;
}
boardMute.onchange = () => {
    S.boardVideoMuted = boardMute.checked;
    applyVideos();
    save();
};
dimEl.oninput = () => {
    S.dim = +dimEl.value;
    paintBoardBg();
    save();
};
/* THEME TAB: App background (#appbg, #assets-app) */
S.appVideoMuted = S.appVideoMuted !== false;
S.appDim = num(S.appDim, 0, 80, DEF.appDim);
const appMute = $('#app-vid-mute'), appDimEl = $('#appdim'), appDimOut = $('#out-appdim');

function paintAppBg() {
    root.style.setProperty('--appdimp', S.appDim + '%');
    appDimOut.textContent = S.appDim + '%';
    appDimEl.value = S.appDim;
    appMute.checked = S.appVideoMuted;
}
appMute.onchange = () => {
    S.appVideoMuted = appMute.checked;
    applyVideos();
    save();
};
appDimEl.oninput = () => {
    S.appDim = +appDimEl.value;
    paintAppBg();
    save();
};
/* THEME TAB: Reset all appearance */
$('#theme-reset-all').onclick = () => {
    if (!confirm('Reset all colors, the font, icons and the board image to the defaults?')) 
        return;
    S.colors = {};
    S.sbSize = DEF.sbSize;
    applySb();
    S.dim = DEF.dim;
    S.appDim = DEF.appDim;
    S.boardVideoMuted = true;
    S.appVideoMuted = true;
    paintBoardBg();
    paintAppBg();
    S.cursorsOn = true;
    S.curSize = DEF.curSize;
    applyCurSize();
    ASSETS.filter(a => a.cursor).forEach(a => {
        S.curHot[a.id] = a.hot || 'tl';
        S.curScale[a.id] = 100;
    });
    ASSETS.forEach(resetAsset);
    paintCursorPrefs();
    S.font = T.ui.def;
    S.fontNum = T.num.def;
    S.fontSize = { ui: {}, num: {} };
    removeFont(T.ui);
    removeFont(T.num);
    applyFont();
    resetLayout(true);
    applyColors();
    save();
    imgMsg.textContent = 'All appearance settings reset.';
    sfx('ui');
};
