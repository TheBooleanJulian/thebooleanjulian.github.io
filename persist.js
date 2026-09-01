/* ══════════════════════════════════════════════════════════════════
   Persistence — remembers which windows were open, where they were,
   and whether they were minimized/maximized, across page reloads.
   Snapshots continuously (debounced) via MutationObserver instead of
   patching every call site in os.js, and restores once on first login
   per page load (not on every Log Off → Log back in within the same
   session — the DOM already reflects reality then).
   ══════════════════════════════════════════════════════════════════ */
(function () {
  const KEY = 'julianos:session';

  // Windows created lazily (Notepad, Explorer, games, ...) need to be
  // relaunched via their app before saved position/state can be applied.
  // The two content windows are always present in the DOM already.
  const ALWAYS_PRESENT = new Set(['window-hero', 'window-projects']);
  const REOPEN = {
    'window-explorer': () => (window.JulianExplorer?.openLast ? JulianExplorer.openLast() : JulianOS.launch('mycomputer')),
    'window-ie': () => JulianOS.launch('iexplorer'),
    'window-cmd': () => JulianOS.launch('cmd'),
    'window-taskmgr': () => JulianOS.launch('taskmgr'),
    'window-controlpanel': () => JulianOS.launch('controlpanel'),
    'window-game-center': () => window.openGameCenter?.(),
    'app-notepad': () => window.launchNotepad?.(),
    'app-paint': () => window.launchPaint?.(),
    'app-mediaplayer': () => window.launchMediaPlayer?.(),
    'game-tictactoe': () => window.launchTicTacToe?.(),
    'game-minesweeper': () => window.launchMinesweeper?.(),
    'game-battleship': () => window.launchBattleship?.(),
    'game-mancala': () => window.launchMancala?.(),
    'game-blackjack': () => window.launchBlackjack?.(),
    'game-solitaire': () => window.launchSolitaire?.(),
    'game-chess': () => window.launchChess?.(),
    'game-pinball': () => window.launchPinball?.(),
  };

  function currentRect(card) {
    if (card.style.position !== 'fixed') return null;
    return {
      left: card.style.left, top: card.style.top,
      width: card.style.width || null, height: card.style.height || null,
    };
  }

  function snapshot() {
    const wins = {};
    document.querySelectorAll('.taskbar-item-window').forEach((chip) => {
      const card = document.querySelector(`.card.window[data-wid="${chip.dataset.wid}"]`);
      if (!card || !card.id) return;
      wins[card.id] = {
        minimized: card.classList.contains('wm-closed'),
        maximized: card.classList.contains('wm-maximized'),
        rect: currentRect(card),
      };
    });
    try { localStorage.setItem(KEY, JSON.stringify(wins)); } catch (err) { /* storage unavailable */ }
  }

  // Guards against the pre-login setup itself (creating taskbar chips for
  // the two always-present windows, etc.) being mistaken for real window
  // activity and overwriting the saved session with empty state before
  // restoreOnce() ever gets a chance to read it.
  let ready = false;

  let saveTimer = null;
  function scheduleSave() {
    if (!ready) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(snapshot, 400);
  }

  new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === 'childList' && m.target === document.body) { scheduleSave(); return; }
      if (m.type === 'attributes' && m.target.classList?.contains('window')) { scheduleSave(); return; }
    }
  }).observe(document.body, { childList: true, attributes: true, attributeFilter: ['class', 'style'], subtree: true });

  let restored = false;
  function restoreOnce() {
    if (restored) return;
    restored = true;
    try {
      let saved;
      try { saved = JSON.parse(localStorage.getItem(KEY)); } catch (err) { saved = null; }
      if (!saved) return;

      Object.entries(saved).forEach(([id, info]) => {
        let card = document.getElementById(id);
        if (!card && !ALWAYS_PRESENT.has(id) && REOPEN[id]) {
          REOPEN[id]();
          card = document.getElementById(id);
        }
        if (!card) return;

        if (info.rect?.left) {
          card.style.position = 'fixed';
          card.style.left = info.rect.left;
          card.style.top = info.rect.top;
          card.style.margin = '0';
          card.style.transform = 'none';
          if (info.rect.width) card.style.width = info.rect.width;
          if (info.rect.height) card.style.height = info.rect.height;
        }
        if (info.maximized && !card.classList.contains('wm-maximized')) JulianOS.toggleMaximize(card);
        if (info.minimized && !card.classList.contains('wm-closed')) JulianOS.minimizeWindow(card);
      });
    } finally {
      // Only allow snapshotting to resume once restoration has had its
      // one chance to read (and possibly recreate) the saved windows.
      ready = true;
    }
  }

  window.JulianPersist = { restoreOnce };
})();
