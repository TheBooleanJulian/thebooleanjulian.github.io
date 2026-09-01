/* ══════════════════════════════════════════════════════════════════
   Internet Explorer — an XP-style browser shell over Julian's links.
   Most real sites (GitHub, LinkedIn, ...) refuse to be framed, so
   this is honest about it: a start page of destinations, and picking
   one opens it in a real new tab while the window shows a small
   confirmation instead of a silently-broken iframe.
   ══════════════════════════════════════════════════════════════════ */
(function () {
  const HOME = 'about:home';
  const LINKS = [
    { label: 'GitHub', icon: '&#128025;', url: 'https://github.com/TheBooleanJulian' },
    { label: 'LinkedIn', icon: '&#128188;', url: 'https://www.linkedin.com/in/juliancheungjunyan/' },
    { label: 'julianCheung.com', icon: '&#127760;', url: 'https://juliancheung.com/' },
    { label: 'thebooleanjulian.dev', icon: '&#128187;', url: 'https://thebooleanjulian.dev/' },
    { label: 'Accurova', icon: '&#128248;', url: 'https://accurova.com/' },
    { label: 'xymiku39', icon: '&#127925;', url: 'https://xymiku39.com/' },
  ];

  const state = { history: [HOME], index: 0 };
  let body = null;

  function currentUrl() { return state.history[state.index]; }

  function navigate(url) {
    state.history = state.history.slice(0, state.index + 1);
    state.history.push(url);
    state.index = state.history.length - 1;
    render();
    if (url !== HOME) window.open(url, '_blank', 'noopener');
  }

  function back() { if (state.index > 0) { state.index -= 1; render(); } }
  function forward() { if (state.index < state.history.length - 1) { state.index += 1; render(); } }

  function render() {
    if (!body) return;
    const url = currentUrl();
    body.querySelector('#ie-address').value = url === HOME ? 'about:home' : url;
    body.querySelector('#ie-back').disabled = state.index <= 0;
    body.querySelector('#ie-forward').disabled = state.index >= state.history.length - 1;

    const page = body.querySelector('#ie-page');
    if (url === HOME) {
      page.innerHTML = `
        <h2 style="font-family:Tahoma,sans-serif;margin-bottom:.3rem">JulianOS Start Page</h2>
        <p style="font-size:.78rem;color:#555;margin-bottom:.9rem">
          Most sites (GitHub, LinkedIn included) refuse to be shown inside another page,
          so picking a link below opens it in a real new tab.
        </p>
        <div class="ie-links">
          ${LINKS.map((l) => `<button class="ie-link" data-url="${l.url}"><span class="ie-link-icon">${l.icon}</span>${l.label}</button>`).join('')}
        </div>`;
    } else {
      page.innerHTML = `
        <div class="ie-redirect">
          <span class="ie-redirect-icon">&#127760;</span>
          <p>Opened <b>${url}</b> in a new tab.</p>
          <button class="btn" id="ie-reopen">Open again</button>
        </div>`;
      body.querySelector('#ie-reopen')?.addEventListener('click', () => window.open(url, '_blank', 'noopener'));
    }
    body.querySelector('#ie-status').textContent = url === HOME ? 'Done' : `Navigated to ${url}`;
  }

  function ensureChrome() {
    body = createGameWindow('window-ie', '&#127760;', 'Internet Explorer', 560);
    if (body.dataset.mounted) return body;
    body.dataset.mounted = '1';
    body.innerHTML = `
      <div class="xp-addressbar explorer-toolbar">
        <button class="btn" id="ie-back" title="Back" aria-label="Back">&#8592;</button>
        <button class="btn" id="ie-forward" title="Forward" aria-label="Forward">&#8594;</button>
        <button class="btn" id="ie-home" title="Home" aria-label="Home">&#127968;</button>
        <input type="text" id="ie-address" readonly aria-label="Current address" style="flex:1">
      </div>
      <div class="ie-page" id="ie-page"></div>
      <div class="status-bar"><p class="status-bar-field" id="ie-status" style="flex:1"></p></div>
    `;
    body.querySelector('#ie-back').addEventListener('click', back);
    body.querySelector('#ie-forward').addEventListener('click', forward);
    body.querySelector('#ie-home').addEventListener('click', () => navigate(HOME));
    body.querySelector('#ie-page').addEventListener('click', (e) => {
      const btn = e.target.closest('.ie-link');
      if (btn) navigate(btn.dataset.url);
    });
    return body;
  }

  function openBrowser() {
    ensureChrome();
    render();
    window.playSound?.('click');
  }

  window.JulianOS.registerApp({ id: 'iexplorer', name: 'Internet Explorer', icon: '&#127760;', launch: openBrowser });
})();
