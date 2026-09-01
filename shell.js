/* ══════════════════════════════════════════════════════════════════
   Shell — Run dialog, desktop right-click menu, and the keyboard
   polish that ties the Start Menu / desktop icons / dialogs together
   (Win+R, arrow-key navigation, Escape closing whatever is topmost).
   Depends on JulianOS (os.js), JulianFS (fs.js) and JulianExplorer
   (explorer.js), all loaded earlier.
   ══════════════════════════════════════════════════════════════════ */
(function () {
  /* ── Desktop icon order persistence ── */
  const ICON_ORDER_KEY = 'julianos:icon-order';
  function saveIconOrder() {
    const wrap = document.querySelector('.desktop-icons');
    if (!wrap) return;
    try { localStorage.setItem(ICON_ORDER_KEY, JSON.stringify([...wrap.children].map((el) => el.id))); } catch (err) { /* unavailable */ }
  }
  function restoreIconOrder() {
    const wrap = document.querySelector('.desktop-icons');
    if (!wrap) return;
    let order;
    try { order = JSON.parse(localStorage.getItem(ICON_ORDER_KEY)); } catch (err) { return; }
    if (!Array.isArray(order)) return;
    order.forEach((id) => { const el = document.getElementById(id); if (el) wrap.appendChild(el); });
  }
  restoreIconOrder();

  /* ── Run dialog ── */
  const RUN_COMMANDS = [
    'aboutme', 'projects', 'mycomputer', 'documents', 'github', 'iexplorer',
    'games', 'notepad', 'paint', 'mediaplayer', 'recyclebin',
  ];

  function showRunDialog() {
    if (document.getElementById('run-dialog')) return;
    const overlay = document.createElement('div');
    overlay.className = 'msgbox-overlay';
    overlay.id = 'run-dialog';
    overlay.innerHTML = `
      <div class="card window msgbox">
        <div class="title-bar">
          <div class="title-bar-text"><span class="xp-icon">&#128190;</span> Run</div>
          <div class="title-bar-controls"><button aria-label="Close" data-msgbox-close></button></div>
        </div>
        <div class="window-body">
          <p style="display:flex;align-items:center;gap:.7rem;margin-bottom:.6rem">
            <span style="font-size:1.7rem">&#128190;</span>
            Type the name of a program, folder, or URL, and JulianOS will open it for you.
          </p>
          <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.9rem">
            <label for="run-input" style="font-size:.8rem;white-space:nowrap">Open:</label>
            <input type="text" id="run-input" style="flex:1" autocomplete="off"
              placeholder="notepad, projects, https://…, C:\\Documents">
          </div>
          <div style="text-align:right">
            <button class="btn btn-primary" id="run-ok">OK</button>
            <button class="btn" data-msgbox-close>Cancel</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const input = overlay.querySelector('#run-input');
    input.focus();

    function runIt() {
      const cmd = input.value.trim();
      if (cmd) executeRunCommand(cmd);
      overlay.remove();
    }
    overlay.querySelector('#run-ok').addEventListener('click', runIt);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') runIt(); });
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay || e.target.closest('[data-msgbox-close]')) overlay.remove();
    });
    window.playSound?.('click');
  }

  function executeRunCommand(raw) {
    const cmd = raw.toLowerCase().replace(/\.exe$/, '').trim();
    if (RUN_COMMANDS.includes(cmd)) { JulianOS.launch(cmd); return; }
    if (/^https?:\/\//i.test(raw)) { window.open(raw, '_blank', 'noopener'); return; }
    if (/^c:\\/i.test(raw)) {
      const segs = raw.replace(/^c:\\/i, '').split('\\').filter(Boolean);
      const node = JulianFS.resolve(segs);
      if (node && node.type === 'folder') { JulianExplorer.open(segs); return; }
    }
    window.showMessageBox?.(
      'Run',
      '&#9888;&#65039;',
      `JulianOS cannot find <b>${window.escHtml ? escHtml(raw) : raw}</b>. Check the name and try again — `
      + `or try <b>notepad</b>, <b>projects</b>, <b>games</b>, <b>mycomputer</b>…`
    );
  }

  JulianOS.registerApp({ id: 'run', name: 'Run...', icon: '&#128190;', launch: showRunDialog });

  /* ── Desktop right-click menu ── */
  document.querySelector('.desktop-icons')?.addEventListener('contextmenu', (e) => {
    const iconEl = e.target.closest('.desktop-icon');
    if (!iconEl) return;
    e.preventDefault();
    const appId = iconEl.id.replace(/^icon-/, '');
    const app = JulianOS.getApp(appId);
    JulianOS.showContextMenu(e.clientX, e.clientY, [
      { label: 'Open', action: () => JulianOS.launch(appId) },
      { sep: true },
      {
        label: 'Properties',
        action: () => window.showMessageBox?.(
          `${app?.name || appId} Properties`,
          '&#128203;',
          `<b>Type:</b> Application<br><b>Target:</b> ${appId}`
        ),
      },
    ]);
  });

  document.body.addEventListener('contextmenu', (e) => {
    // Only the empty desktop background gets this menu — windows,
    // Explorer items, and desktop icons all handle their own.
    if (e.target !== document.body) return;
    e.preventDefault();
    JulianOS.showContextMenu(e.clientX, e.clientY, [
      {
        label: 'Arrange Icons By Name',
        action: () => {
          const wrap = document.querySelector('.desktop-icons');
          if (!wrap) return;
          [...wrap.children]
            .sort((a, b) => a.querySelector('.desktop-icon-label').textContent
              .localeCompare(b.querySelector('.desktop-icon-label').textContent))
            .forEach((el) => wrap.appendChild(el));
          saveIconOrder();
          window.playSound?.('click');
        },
      },
      {
        label: 'Refresh',
        action: () => { window.loadRepos?.(); window.playSound?.('click'); },
      },
      { sep: true },
      {
        label: 'Display Properties',
        action: () => window.showMessageBox?.(
          'Display Properties',
          '&#128421;&#65039;',
          '<b>Wallpaper:</b> Bliss<br><b>Theme:</b> Aperture XD (Migusoft)<br><b>Resolution:</b> responsive'
        ),
      },
    ]);
  });

  /* ── Keyboard: Win+R, Escape, arrow-key navigation ── */
  document.addEventListener('keydown', (e) => {
    if (e.metaKey && e.key.toLowerCase() === 'r') {
      // Best-effort — like Win+D, the real OS usually eats Win+R first.
      // The Start Menu's "Run..." item is the reliable path.
      e.preventDefault();
      showRunDialog();
    } else if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'r') {
      e.preventDefault();
      showRunDialog();
    } else if (e.key === 'Escape') {
      const overlays = document.querySelectorAll('.msgbox-overlay');
      if (overlays.length) { overlays[overlays.length - 1].remove(); return; }
      const startMenu = document.getElementById('start-menu');
      if (startMenu?.classList.contains('open')) {
        startMenu.classList.remove('open');
        document.getElementById('start-btn')?.setAttribute('aria-expanded', 'false');
      }
    }
  });

  document.querySelector('.desktop-icons')?.addEventListener('keydown', (e) => {
    const icons = [...document.querySelectorAll('.desktop-icon')];
    if (e.key === 'Enter' || e.key === ' ') {
      const btn = e.target.closest('.desktop-icon');
      if (!btn) return;
      e.preventDefault();
      JulianOS.launch(btn.id.replace(/^icon-/, ''));
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const idx = icons.indexOf(document.activeElement);
      if (idx === -1) return;
      e.preventDefault();
      icons[(idx + (e.key === 'ArrowDown' ? 1 : -1) + icons.length) % icons.length].focus();
    }
  });

  document.getElementById('start-menu')?.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const items = [...document.querySelectorAll('#start-menu .start-menu-item')];
    const idx = items.indexOf(document.activeElement);
    e.preventDefault();
    const next = idx === -1
      ? items[0]
      : items[(idx + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length];
    next?.focus();
  });
})();
