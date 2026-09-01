/* ══════════════════════════════════════════════════════════════════
   Explorer — a genuine XP-style file browser over JulianFS (fs.js).
   Singleton window (one Explorer at a time, like Notepad/Paint) with
   back/forward/up history, an address bar, icon/details views,
   sorting, double-click navigation, right-click context menus and
   Properties dialogs. Reuses the shared window chrome from
   createGameWindow() (games.js) so drag/resize/minimize/taskbar all
   come for free from the Window Manager (os.js).
   ══════════════════════════════════════════════════════════════════ */
(function () {
  const state = {
    path: [],
    history: [[]],
    historyIndex: 0,
    view: 'icons',
    sort: 'name',
    selected: null,
  };

  let body = null;

  function currentNode() { return JulianFS.resolve(state.path); }
  function pathString(path) { return path.length ? 'C:\\' + path.join('\\') : 'C:\\'; }

  function fileKind(node) {
    if (node.action === 'open-url') return 'Internet Shortcut';
    if (node.action === 'open-text') return 'Text Document';
    if (node.action === 'run') return 'Application';
    return 'File';
  }

  function fileSize(node) {
    if (node.action === 'open-text') return Math.max(1, Math.round((node.text || '').length / 40)) + ' KB';
    return '1 KB';
  }

  /* ── Navigation ── */
  function navigate(path, pushHistory) {
    const node = JulianFS.resolve(path);
    if (!node || node.type !== 'folder') return;
    state.path = path.slice();
    state.selected = null;
    if (pushHistory !== false) {
      state.history = state.history.slice(0, state.historyIndex + 1);
      state.history.push(state.path.slice());
      state.historyIndex = state.history.length - 1;
    }
    render();
  }

  function back() {
    if (state.historyIndex <= 0) return;
    state.historyIndex -= 1;
    state.path = state.history[state.historyIndex].slice();
    state.selected = null;
    render();
  }
  function forward() {
    if (state.historyIndex >= state.history.length - 1) return;
    state.historyIndex += 1;
    state.path = state.history[state.historyIndex].slice();
    state.selected = null;
    render();
  }
  function up() {
    if (state.path.length) navigate(state.path.slice(0, -1));
  }

  function openNode(node) {
    if (node.type === 'folder') { navigate([...state.path, node.name]); return; }
    const fullPath = [...state.path, node.name];
    if (node.action === 'open-text') openTextViewer(fullPath, node.name, node.text);
    else if (node.action === 'open-url') window.open(node.url, '_blank', 'noopener');
    else if (node.action === 'run') node.run();
    window.playSound?.('click');
  }

  function openTextViewer(pathArr, title, text) {
    const id = 'viewer-' + pathArr.join('-').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const viewerBody = createGameWindow(id, '&#128221;', title, 460);
    if (viewerBody.dataset.mounted) return;
    viewerBody.dataset.mounted = '1';
    viewerBody.innerHTML = `
      <div class="app-menubar"><span>File</span><span>Edit</span><span>Format</span><span>View</span><span>Help</span></div>
      <textarea readonly style="width:100%;min-height:260px;resize:none;font-family:'JetBrains Mono',monospace;font-size:.82rem;padding:.5rem;border:1px solid #7f9db9;border-radius:0;background:#fff"></textarea>
    `;
    viewerBody.querySelector('textarea').value = text || '';
  }

  /* ── Properties dialog (reuses the shared message-box chrome) ── */
  function showProperties(node, path) {
    const isFolder = node.type === 'folder';
    const rows = [
      ['Type', isFolder ? 'File Folder' : fileKind(node)],
      ['Location', pathString(path)],
    ];
    if (isFolder) rows.push(['Contains', `${node.children?.length || 0} item(s)`]);
    else rows.push(['Size', fileSize(node)]);
    rows.push(['Modified', 'August 2026']);

    const bodyHtml = `
      <span style="font-size:1.6rem;vertical-align:middle">${node.icon}</span>
      <b style="vertical-align:middle">${escHtml(node.name)}</b><br><br>
      ${rows.map(([k, v]) => `<b>${k}:</b> ${escHtml(String(v))}<br>`).join('')}
    `;
    showMessageBox(`${node.name} Properties`, '&#128203;', bodyHtml);
  }

  /* ── Context menu (generic, reusable) ── */
  let openMenu = null;
  function closeContextMenu() {
    openMenu?.remove();
    openMenu = null;
    document.removeEventListener('mousedown', onOutsideClick, true);
    document.removeEventListener('keydown', onEscClose);
  }
  function onOutsideClick(e) { if (!openMenu?.contains(e.target)) closeContextMenu(); }
  function onEscClose(e) { if (e.key === 'Escape') closeContextMenu(); }

  function showContextMenu(x, y, items) {
    closeContextMenu();
    const menu = document.createElement('div');
    menu.className = 'xp-context-menu';
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    menu.innerHTML = items.map((it, i) => it.sep
      ? '<div class="xp-context-sep"></div>'
      : `<button class="xp-context-item" data-idx="${i}"${it.disabled ? ' disabled' : ''}>${escHtml(it.label)}</button>`
    ).join('');
    menu.addEventListener('click', (e) => {
      const btn = e.target.closest('.xp-context-item');
      if (!btn || btn.disabled) return;
      items[+btn.dataset.idx].action?.();
      closeContextMenu();
    });
    document.body.appendChild(menu);
    requestAnimationFrame(() => {
      const rect = menu.getBoundingClientRect();
      if (rect.right > window.innerWidth) menu.style.left = Math.max(4, window.innerWidth - rect.width - 4) + 'px';
      if (rect.bottom > window.innerHeight) menu.style.top = Math.max(4, window.innerHeight - rect.height - 4) + 'px';
    });
    openMenu = menu;
    document.addEventListener('mousedown', onOutsideClick, true);
    document.addEventListener('keydown', onEscClose);
  }

  function itemContextMenu(node, path) {
    const items = [];
    items.push({ label: 'Open', action: () => openNode(node) });
    if (node.type === 'folder') items.push({ label: 'Explore', action: () => navigate([...path, node.name]) });
    items.push({ sep: true });
    items.push({ label: 'Properties', action: () => showProperties(node, [...path, node.name]) });
    return items;
  }

  /* ── Rendering ── */
  function render() {
    if (!body) return;
    const node = currentNode();

    body.querySelector('#exp-path').textContent = pathString(state.path);
    body.querySelector('#exp-back').disabled = state.historyIndex <= 0;
    body.querySelector('#exp-forward').disabled = state.historyIndex >= state.history.length - 1;
    body.querySelector('#exp-up').disabled = !state.path.length;

    const items = (node?.children || []).slice().sort((a, b) => {
      if (state.sort === 'type' && a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    const pane = body.querySelector('#exp-pane');
    pane.className = 'explorer-pane view-' + state.view;

    if (!items.length) {
      pane.innerHTML = '<div class="explorer-empty">This folder is empty.</div>';
    } else if (state.view === 'details') {
      pane.innerHTML = `
        <div class="explorer-row explorer-head"><span>Name</span><span>Type</span></div>
        ${items.map((it) => `
          <div class="explorer-row${it.name === state.selected ? ' selected' : ''}" data-name="${escHtml(it.name)}" tabindex="0">
            <span><span class="xp-icon">${it.icon}</span> ${escHtml(it.name)}</span>
            <span>${it.type === 'folder' ? 'File Folder' : fileKind(it)}</span>
          </div>`).join('')}
      `;
    } else {
      pane.innerHTML = items.map((it) => `
        <button class="explorer-icon${it.name === state.selected ? ' selected' : ''}" data-name="${escHtml(it.name)}" tabindex="0">
          <span class="explorer-icon-glyph">${it.icon}</span>
          <span class="explorer-icon-label">${escHtml(it.name)}</span>
        </button>`).join('');
    }

    body.querySelector('#exp-status').textContent = `${items.length} item${items.length !== 1 ? 's' : ''}`;
  }

  function findChild(name) {
    return currentNode()?.children.find((c) => c.name === name) || null;
  }

  /* ── Window chrome (mounted once) ── */
  function ensureChrome() {
    body = createGameWindow('window-explorer', '&#128421;\uFE0F', 'My Computer', 640);
    if (body.dataset.mounted) return body;
    body.dataset.mounted = '1';
    body.innerHTML = `
      <div class="xp-addressbar explorer-toolbar">
        <button class="btn" id="exp-back" title="Back">&#8592;</button>
        <button class="btn" id="exp-forward" title="Forward">&#8594;</button>
        <button class="btn" id="exp-up" title="Up one level">&#8593;</button>
        <span class="explorer-address"><span class="xp-icon">&#128193;</span><span id="exp-path"></span></span>
        <select id="exp-view" title="View">
          <option value="icons">Icons</option>
          <option value="details">Details</option>
        </select>
        <select id="exp-sort" title="Sort by">
          <option value="name">Name</option>
          <option value="type">Type</option>
        </select>
      </div>
      <div class="explorer-pane view-icons" id="exp-pane"></div>
      <div class="status-bar"><p class="status-bar-field" id="exp-status" style="flex:1"></p></div>
    `;
    body.querySelector('#exp-back').addEventListener('click', back);
    body.querySelector('#exp-forward').addEventListener('click', forward);
    body.querySelector('#exp-up').addEventListener('click', up);
    body.querySelector('#exp-view').addEventListener('change', (e) => { state.view = e.target.value; render(); });
    body.querySelector('#exp-sort').addEventListener('change', (e) => { state.sort = e.target.value; render(); });

    const pane = body.querySelector('#exp-pane');
    pane.addEventListener('click', (e) => {
      const item = e.target.closest('[data-name]');
      if (!item) { state.selected = null; return; }
      state.selected = item.dataset.name;
      pane.querySelectorAll('.selected').forEach((el) => el.classList.remove('selected'));
      item.classList.add('selected');
    });
    pane.addEventListener('dblclick', (e) => {
      const item = e.target.closest('[data-name]');
      const node = item && findChild(item.dataset.name);
      if (node) openNode(node);
    });
    pane.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      const item = e.target.closest('[data-name]');
      const node = item && findChild(item.dataset.name);
      if (node) openNode(node);
    });
    pane.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const item = e.target.closest('[data-name]');
      const node = item && findChild(item.dataset.name);
      if (node) showContextMenu(e.clientX, e.clientY, itemContextMenu(node, state.path));
    });
    return body;
  }

  function openExplorer(path) {
    ensureChrome();
    navigate(path || [], true);
  }

  window.JulianExplorer = { open: openExplorer, refresh: render, showContextMenu, closeContextMenu, showProperties };
})();
