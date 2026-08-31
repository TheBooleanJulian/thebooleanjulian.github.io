/* ══════════════════════════════════════════════════════════════════
   JulianOS — shared Window Manager + Application Registry
   ──────────────────────────────────────────────────────────────────
   Every window on the site (About Me, Projects, Notepad, Paint,
   Media Player, games, dialogs) is a `.card.window` element. Rather
   than each app re-implementing drag/resize/minimize/maximize/close/
   focus/taskbar logic, they all go through this one manager.

   Back-compat: games.js and the page's inline script call
   bringToFront/restoreWindow/closeWindow/openWindow as bare globals,
   so those names are kept as thin wrappers around the manager below
   instead of being renamed — avoids touching every call site.
   ══════════════════════════════════════════════════════════════════ */
(function () {
  const state = {
    apps: new Map(),
    topZ: 300,
    widCounter: 1,
    focusedWid: null,
    order: [],       // wids, most-recently-focused last (Alt+Tab order)
    hiddenByShowDesktop: null,
  };

  function escHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  function ensureWid(card) {
    if (!card.dataset.wid) card.dataset.wid = 'w' + (state.widCounter++);
    return card.dataset.wid;
  }

  function taskbarItemsEl() { return document.getElementById('taskbar-items'); }

  function chipFor(wid) {
    return document.querySelector(`.taskbar-item-window[data-wid="${wid}"]`);
  }

  function ensureChip(card) {
    const wid = ensureWid(card);
    let chip = chipFor(wid);
    if (chip) return chip;
    const icon = card.querySelector('.xp-icon')?.innerHTML ?? '&#128193;';
    const label = card.querySelector('.title-bar-text')?.textContent.trim() ?? 'Window';
    chip = document.createElement('button');
    chip.className = 'taskbar-item taskbar-item-window';
    chip.dataset.wid = wid;
    chip.innerHTML = `<span>${icon}</span><span class="item-label">${escHtml(label)}</span>`;
    chip.addEventListener('click', () => onChipClick(card));
    taskbarItemsEl()?.appendChild(chip);
    return chip;
  }

  function removeChip(wid) {
    chipFor(wid)?.remove();
  }

  function setActiveChip(wid) {
    document.querySelectorAll('.taskbar-item-window').forEach((c) => {
      c.classList.toggle('active', c.dataset.wid === wid);
    });
  }

  function onChipClick(card) {
    if (card.classList.contains('wm-closed')) {
      restoreWindow(card);
    } else if (state.focusedWid === card.dataset.wid) {
      minimizeWindow(card);
    } else {
      bringToFront(card);
    }
  }

  // Project-preview cards inside My Projects reuse the `.card.window`
  // chrome purely for decoration (they have no id/wid of their own) —
  // exclude anything nested inside another window from the "real"
  // window list so Show Desktop / Alt+Tab don't sweep up every repo card.
  function isTopLevelWindow(card) {
    return !card.parentElement?.closest('.card.window');
  }

  function openWindows() {
    return [...document.querySelectorAll('.card.window')].filter(
      (c) => !c.classList.contains('wm-closed') && isTopLevelWindow(c)
    );
  }

  /* ── Focus / z-index ── */
  function bringToFront(card) {
    const wid = ensureWid(card);
    state.focusedWid = wid;
    setActiveChip(wid);
    state.order = state.order.filter((w) => w !== wid);
    state.order.push(wid);
    if (!card.classList.contains('wm-maximized')) {
      state.topZ += 1;
      card.style.zIndex = state.topZ;
    }
  }

  /* ── Minimize / restore / close ── */
  function minimizeWindow(card) {
    ensureChip(card);
    card.classList.add('wm-closed');
    if (state.focusedWid === card.dataset.wid) {
      state.focusedWid = null;
      setActiveChip(null);
    }
    window.playSound?.('click');
  }

  // Registers a window that starts open in the DOM (not launched via the
  // registry) so it gets a taskbar chip without a focus/sound side effect.
  function trackWindow(card) {
    if (!card || card.classList.contains('wm-closed')) return;
    ensureChip(card);
  }

  function restoreWindow(card) {
    card.classList.remove('wm-closed');
    ensureChip(card);
    bringToFront(card);
    window.playSound?.('click');
  }

  function closeWindow(card) {
    const wid = ensureWid(card);
    card.classList.add('wm-closed');
    removeChip(wid);
    state.order = state.order.filter((w) => w !== wid);
    if (state.focusedWid === wid) state.focusedWid = null;
    window.playSound?.('click');
  }

  function toggleMaximize(card) {
    if (card.classList.contains('wm-maximized')) {
      card.classList.remove('wm-maximized');
      card.style.cssText = card.dataset.prevStyle || '';
      delete card.dataset.prevStyle;
    } else {
      card.dataset.prevStyle = card.style.cssText;
      card.classList.add('wm-maximized');
      bringToFront(card);
    }
    window.playSound?.('click');
  }

  function openWindow(id) {
    const card = document.getElementById(id);
    if (!card) return;
    if (card.classList.contains('wm-closed')) restoreWindow(card);
    else ensureChip(card);
    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    bringToFront(card);
  }

  /* ── Drag (title bar) ── */
  // Applied to <body> during drag/resize so the pointer path doesn't
  // accidentally select page text outside the window being moved.
  function setNoSelect(on) {
    document.body.classList.toggle('wm-no-select', on);
  }

  function freezeToFixed(card) {
    if (card.classList.contains('wm-maximized')) return null;
    const rect = card.getBoundingClientRect();
    card.style.position = 'fixed';
    card.style.left = rect.left + 'px';
    card.style.top = rect.top + 'px';
    card.style.margin = '0';
    card.style.transform = 'none';
    return rect;
  }

  function makeDraggable(card) {
    const bar = card.querySelector('.title-bar');
    if (!bar || bar.dataset.dragBound) return;
    bar.dataset.dragBound = '1';
    card.classList.add('wm-draggable');

    let startX = 0, startY = 0, startLeft = 0, startTop = 0, dragging = false;

    function down(e) {
      if (e.target.closest('.title-bar-controls')) return;
      if (card.classList.contains('wm-maximized')) return;
      const point = e.touches ? e.touches[0] : e;
      const rect = freezeToFixed(card);
      if (!rect) return;
      startX = point.clientX; startY = point.clientY;
      startLeft = rect.left; startTop = rect.top;
      dragging = true;
      card.classList.add('wm-dragging');
      setNoSelect(true);
      bringToFront(card);
      document.addEventListener('mousemove', move);
      document.addEventListener('mouseup', up);
      document.addEventListener('touchmove', move, { passive: false });
      document.addEventListener('touchend', up);
    }
    function move(e) {
      if (!dragging) return;
      const point = e.touches ? e.touches[0] : e;
      if (e.touches) e.preventDefault();
      const dx = point.clientX - startX;
      const dy = point.clientY - startY;
      const maxLeft = window.innerWidth - 80;
      const maxTop = window.innerHeight - 36;
      card.style.left = Math.min(Math.max(-card.offsetWidth + 100, startLeft + dx), maxLeft) + 'px';
      card.style.top = Math.min(Math.max(0, startTop + dy), maxTop) + 'px';
    }
    function up() {
      dragging = false;
      card.classList.remove('wm-dragging');
      setNoSelect(false);
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
      document.removeEventListener('touchmove', move);
      document.removeEventListener('touchend', up);
    }
    bar.addEventListener('mousedown', down);
    bar.addEventListener('touchstart', down, { passive: true });
    bar.addEventListener('dblclick', (e) => {
      if (e.target.closest('.title-bar-controls')) return;
      toggleMaximize(card);
    });
  }

  /* ── Resize (bottom-right handle) ── */
  function makeResizable(card, opts) {
    if (card.dataset.resizeBound) return;
    card.dataset.resizeBound = '1';
    const minW = opts?.minWidth ?? 280;
    const minH = opts?.minHeight ?? 200;

    const handle = document.createElement('div');
    handle.className = 'wm-resize-handle';
    handle.setAttribute('aria-hidden', 'true');
    card.appendChild(handle);

    let startX = 0, startY = 0, startW = 0, startH = 0, resizing = false;

    function down(e) {
      if (card.classList.contains('wm-maximized')) return;
      e.preventDefault();
      e.stopPropagation();
      const rect = freezeToFixed(card);
      if (!rect) return;
      startX = e.clientX; startY = e.clientY;
      startW = rect.width; startH = rect.height;
      resizing = true;
      setNoSelect(true);
      bringToFront(card);
      document.addEventListener('mousemove', move);
      document.addEventListener('mouseup', up);
    }
    function move(e) {
      if (!resizing) return;
      card.style.width = Math.max(minW, startW + (e.clientX - startX)) + 'px';
      card.style.height = Math.max(minH, startH + (e.clientY - startY)) + 'px';
    }
    function up() {
      resizing = false;
      setNoSelect(false);
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
    }
    handle.addEventListener('mousedown', down);
  }

  /* ── Title-bar control delegation (Close / Minimize / Maximize) ── */
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.title-bar-controls button');
    if (!btn || btn.hasAttribute('data-msgbox-close')) return;
    const card = btn.closest('.card');
    if (!card) return;
    e.preventDefault();
    e.stopPropagation();
    const action = btn.getAttribute('aria-label');
    if (action === 'Close') closeWindow(card);
    else if (action === 'Minimize') minimizeWindow(card);
    else if (action === 'Maximize' || action === 'Restore') toggleMaximize(card);
  }, true);

  function nearestTopLevelWindow(el) {
    let card = el.closest('.card.window');
    while (card && !isTopLevelWindow(card)) {
      card = card.parentElement?.closest('.card.window') || null;
    }
    return card;
  }

  // Clicking anywhere inside an open window (including inside a nested
  // decorative repo-preview card) focuses/raises its top-level window.
  document.addEventListener('mousedown', (e) => {
    const card = nearestTopLevelWindow(e.target);
    if (card && !card.classList.contains('wm-closed')) bringToFront(card);
  });

  /* ── Keyboard shortcuts ── */
  function focusedCard() {
    return state.focusedWid
      ? document.querySelector(`.card.window[data-wid="${state.focusedWid}"]`)
      : null;
  }

  function cycleWindows(dir) {
    const open = openWindows();
    if (!open.length) return;
    let idx = open.findIndex((c) => c.dataset.wid === state.focusedWid);
    idx = (idx + dir + open.length) % open.length;
    bringToFront(open[idx]);
    open[idx].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function showDesktop() {
    const open = openWindows();
    if (open.length) {
      state.hiddenByShowDesktop = open.map((c) => c.dataset.wid || ensureWid(c));
      open.forEach(minimizeWindow);
    } else if (state.hiddenByShowDesktop) {
      state.hiddenByShowDesktop.forEach((wid) => {
        const card = document.querySelector(`[data-wid="${wid}"]`);
        if (card) restoreWindow(card);
      });
      state.hiddenByShowDesktop = null;
    }
  }

  document.addEventListener('keydown', (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '')
      || document.activeElement?.isContentEditable;

    if (e.altKey && e.key === 'F4') {
      const card = focusedCard();
      if (card) { e.preventDefault(); closeWindow(card); }
    } else if (e.altKey && e.key === 'Tab') {
      e.preventDefault();
      cycleWindows(e.shiftKey ? -1 : 1);
    } else if (!typing && (e.metaKey && (e.key === 'd' || e.key === 'D'))) {
      // Win+D is usually intercepted by the real OS before it reaches the
      // browser — kept as a best-effort binding; the taskbar "Show
      // Desktop" quick-launch button is the reliable path.
      e.preventDefault();
      showDesktop();
    } else if (!typing && e.ctrlKey && e.altKey && (e.key === 'd' || e.key === 'D')) {
      e.preventDefault();
      showDesktop();
    }
  });

  /* ── Application Registry ── */
  function registerApp(def) { state.apps.set(def.id, def); }
  function getApp(id) { return state.apps.get(id); }
  function launch(id, ...args) {
    const app = state.apps.get(id);
    if (!app) { console.warn('JulianOS: unknown app "%s"', id); return; }
    app.launch(...args);
  }

  window.JulianOS = {
    registerApp, getApp, launch,
    bringToFront, minimizeWindow, restoreWindow, closeWindow, toggleMaximize,
    openWindow, makeDraggable, makeResizable, showDesktop, openWindows, trackWindow,
  };

  // Back-compat globals for games.js and the page's inline script.
  window.bringToFront = bringToFront;
  window.restoreWindow = restoreWindow;
  window.closeWindow = closeWindow;
  window.openWindow = openWindow;
  window.ensureWid = ensureWid;
})();
