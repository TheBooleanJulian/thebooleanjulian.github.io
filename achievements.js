/* ══════════════════════════════════════════════════════════════════
   Achievements — small, local, and tied to real actions (not fake
   progress). Unlocking shows a balloon notification and persists to
   localStorage. Viewable from a taskbar tray icon so it's discoverable
   without being intrusive.
   ══════════════════════════════════════════════════════════════════ */
(function () {
  const KEY = 'julianos:achievements';
  const LAUNCH_COUNT_KEY = 'julianos:launch-count';

  const LIST = [
    { id: 'welcome', name: 'Welcome to JulianOS', desc: 'Logged in for the first time' },
    { id: 'projects', name: 'Opened My Projects', desc: 'Browsed the live GitHub repo list' },
    { id: 'explorer', name: 'Went Exploring', desc: 'Opened My Computer and browsed the filesystem' },
    { id: 'five-apps', name: 'Opened 5 Applications', desc: 'Launched five different apps in one session' },
    { id: 'cmd', name: 'Used Command Prompt', desc: "Typed a command into cmd.exe" },
    { id: 'konami', name: 'Discovered the Konami Code', desc: '↑↑↓↓←→←→BA' },
    { id: 'secret-folder', name: 'Found the Secret Folder', desc: 'Explored somewhere most visitors miss' },
    { id: 'miku', name: 'Found Miku.exe', desc: 'Ran the hidden Miku program' },
    { id: 'crash', name: 'Crashed JulianOS', desc: '(and lived to tell about it)' },
  ];

  function getUnlocked() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY));
      return Array.isArray(raw) ? new Set(raw) : new Set();
    } catch (err) { return new Set(); }
  }
  function saveUnlocked(set) {
    try { localStorage.setItem(KEY, JSON.stringify([...set])); } catch (err) { /* unavailable */ }
  }

  const unlocked = getUnlocked();

  function unlock(id) {
    const def = LIST.find((a) => a.id === id);
    if (!def || unlocked.has(id)) return;
    unlocked.add(id);
    saveUnlocked(unlocked);
    window.JulianNotify?.notify(
      'Achievement Unlocked',
      `<b>${def.name}</b><br>${def.desc}`,
      '&#127942;'
    );
    refreshWindow();
  }

  // "Opened 5 different applications" — tracked generically by wrapping
  // JulianOS.registerApp's launch functions the first time each app runs.
  const seenApps = new Set();
  function trackLaunch(appId) {
    seenApps.add(appId);
    if (seenApps.size >= 5) unlock('five-apps');
    if (appId === 'projects') unlock('projects');
    if (appId === 'mycomputer') unlock('explorer');
    if (appId === 'cmd') unlock('cmd');
  }

  let body = null;
  function refreshWindow() {
    if (!body) return;
    const list = body.querySelector('#ach-list');
    list.innerHTML = LIST.map((a) => `
      <div class="ach-row ${unlocked.has(a.id) ? 'ach-done' : ''}">
        <span class="ach-check">${unlocked.has(a.id) ? '☑' : '☐'}</span>
        <span class="ach-text">
          <b>${unlocked.has(a.id) ? a.name : '???'}</b>
          <span class="ach-desc">${unlocked.has(a.id) ? a.desc : 'Keep exploring JulianOS to find this one.'}</span>
        </span>
      </div>`).join('');
    body.querySelector('#ach-count').textContent = `${unlocked.size} / ${LIST.length} unlocked`;
  }

  function ensureChrome() {
    body = createGameWindow('window-achievements', '&#127942;', 'Achievements', 380);
    if (body.dataset.mounted) return body;
    body.dataset.mounted = '1';
    body.innerHTML = `
      <p class="cp-intro">Progress is local to this browser and never sent anywhere.</p>
      <div class="ach-list" id="ach-list"></div>
      <div class="status-bar"><p class="status-bar-field" id="ach-count" style="flex:1"></p></div>
    `;
    return body;
  }

  function openAchievements() {
    ensureChrome();
    refreshWindow();
    window.playSound?.('click');
  }

  window.JulianOS.registerApp({ id: 'achievements', name: 'Achievements', icon: '&#127942;', launch: openAchievements });
  window.JulianAchievements = { unlock, trackLaunch, list: LIST, isUnlocked: (id) => unlocked.has(id) };

  // Every app launch goes through JulianOS.launch(id) (that's the whole
  // point of the registry) so this one wrapper is enough to observe all
  // of them, instead of instrumenting each app's launch function.
  const originalLaunch = window.JulianOS.launch;
  window.JulianOS.launch = function patchedLaunch(id, ...args) {
    trackLaunch(id);
    return originalLaunch(id, ...args);
  };
})();
