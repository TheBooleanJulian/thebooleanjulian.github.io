/* ══════════════════════════════════════════════════════════════════
   Task Manager — real list of open JulianOS windows (End Task really
   closes them, via the same os.js the taskbar uses) plus a fictional
   Performance panel, exactly as the brief asks for ("show currently
   open applications and fictional/visual system statistics").
   ══════════════════════════════════════════════════════════════════ */
(function () {
  function escHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  let body = null;
  let t = 0;

  function renderApps() {
    const list = body.querySelector('#tm-apps');
    const chips = [...document.querySelectorAll('.taskbar-item-window')];
    if (!chips.length) {
      list.innerHTML = '<div class="explorer-empty">No applications are currently running.</div>';
      body.querySelector('#tm-count').textContent = '0 processes';
      return;
    }
    list.innerHTML = chips.map((chip) => {
      const wid = chip.dataset.wid;
      const card = document.querySelector(`.card.window[data-wid="${wid}"]`);
      const running = card && !card.classList.contains('wm-closed');
      return `
        <div class="tm-row">
          <span class="tm-row-name">${chip.innerHTML}</span>
          <span class="tm-row-status">${running ? 'Running' : 'Not Responding? No — just minimized'}</span>
          <button class="btn" data-wid="${wid}">End Task</button>
        </div>`;
    }).join('');
    body.querySelector('#tm-count').textContent = `${chips.length} process${chips.length !== 1 ? 'es' : ''}`;
  }

  function renderPerf() {
    t += 1;
    const cpu = Math.round(18 + 14 * Math.sin(t / 6) + 10 * Math.random());
    const mem = Math.round(34 + 6 * Math.sin(t / 11) + 4 * Math.random());
    body.querySelector('#tm-cpu-bar').style.width = Math.min(100, Math.max(2, cpu)) + '%';
    body.querySelector('#tm-cpu-val').textContent = Math.min(99, Math.max(1, cpu)) + '%';
    body.querySelector('#tm-mem-bar').style.width = Math.min(100, Math.max(2, mem)) + '%';
    body.querySelector('#tm-mem-val').textContent = Math.min(99, Math.max(1, mem)) + '% (of a purely fictional amount of RAM)';
  }

  function ensureChrome() {
    body = createGameWindow('window-taskmgr', '&#128202;', 'Windows Task Manager', 460);
    if (body.dataset.mounted) return body;
    body.dataset.mounted = '1';
    body.innerHTML = `
      <div class="tm-section">
        <div class="tm-section-title">Applications</div>
        <div class="tm-apps" id="tm-apps"></div>
      </div>
      <div class="tm-section">
        <div class="tm-section-title">Performance</div>
        <div class="tm-perf-row">
          <span class="tm-perf-label">CPU Usage</span>
          <div class="tm-perf-bar"><div class="tm-perf-fill tm-perf-cpu" id="tm-cpu-bar"></div></div>
          <span class="tm-perf-val" id="tm-cpu-val">&mdash;</span>
        </div>
        <div class="tm-perf-row">
          <span class="tm-perf-label">Memory</span>
          <div class="tm-perf-bar"><div class="tm-perf-fill tm-perf-mem" id="tm-mem-bar"></div></div>
          <span class="tm-perf-val" id="tm-mem-val">&mdash;</span>
        </div>
      </div>
      <div class="status-bar"><p class="status-bar-field" id="tm-count" style="flex:1"></p></div>
    `;
    body.querySelector('#tm-apps').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-wid]');
      if (!btn) return;
      const card = document.querySelector(`.card.window[data-wid="${btn.dataset.wid}"]`);
      if (card) window.JulianOS.closeWindow(card);
      renderApps();
      window.playSound?.('click');
    });
    setInterval(() => { if (!body.closest('.card').classList.contains('wm-closed')) { renderApps(); renderPerf(); } }, 1000);
    renderApps();
    renderPerf();
    return body;
  }

  function openTaskManager() {
    ensureChrome();
    renderApps();
    window.playSound?.('click');
  }

  window.JulianOS.registerApp({ id: 'taskmgr', name: 'Task Manager', icon: '&#128202;', launch: openTaskManager });
})();
