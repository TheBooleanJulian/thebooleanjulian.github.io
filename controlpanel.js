/* ══════════════════════════════════════════════════════════════════
   Control Panel — every toggle here does something real. Wallpaper/
   Theme pickers aren't included: there's only one wallpaper and one
   theme right now, and a dropdown with one working option is worse
   UX than no dropdown. Sound, desktop icons, reduced motion, high
   contrast, and Reset JulianOS are all genuinely wired up.
   ══════════════════════════════════════════════════════════════════ */
(function () {
  const KEYS = {
    reduceMotion: 'julianos:reduce-motion',
    highContrast: 'julianos:high-contrast',
    hideIcons: 'julianos:hide-icons',
  };

  function getFlag(key) {
    try { return localStorage.getItem(key) === '1'; } catch (err) { return false; }
  }
  function setFlag(key, on) {
    try { localStorage.setItem(key, on ? '1' : '0'); } catch (err) { /* unavailable */ }
  }

  function applyReduceMotion(on) { document.documentElement.classList.toggle('julianos-reduce-motion', on); }
  function applyHighContrast(on) { document.documentElement.classList.toggle('julianos-high-contrast', on); }
  function applyHideIcons(on) { document.querySelector('.desktop-icons')?.classList.toggle('julianos-icons-hidden', on); }

  // Apply saved preferences immediately, before Control Panel is ever opened.
  applyReduceMotion(getFlag(KEYS.reduceMotion));
  applyHighContrast(getFlag(KEYS.highContrast));
  applyHideIcons(getFlag(KEYS.hideIcons));

  function resetJulianOS() {
    const ok = window.confirm('Reset JulianOS?\n\nThis clears everything remembered about your session — window positions, sound preference, notes in Notepad, and these settings — and reloads the page.');
    if (!ok) return;
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith('julianos:') || k === 'tbj-notepad-content')
        .forEach((k) => localStorage.removeItem(k));
    } catch (err) { /* unavailable */ }
    location.reload();
  }

  let body = null;
  function row(id, label, checked) {
    // xp.css styles checkboxes via an adjacent-sibling selector
    // (input[type=checkbox]+label) — the input and label must be
    // siblings, not nested, or the checkbox renders invisible.
    return `
      <div class="cp-row">
        <input type="checkbox" id="${id}" ${checked ? 'checked' : ''}>
        <label for="${id}">${label}</label>
      </div>`;
  }

  function ensureChrome() {
    body = createGameWindow('window-controlpanel', '&#9881;&#65039;', 'Control Panel', 420);
    if (body.dataset.mounted) return body;
    body.dataset.mounted = '1';
    body.innerHTML = `
      <p class="cp-intro">Settings that actually do something — no fake dropdowns.</p>
      <fieldset class="cp-group">
        <legend>Sounds &amp; Display</legend>
        ${row('cp-sound', 'Enable sound effects', window.getSoundOn?.())}
        ${row('cp-icons', 'Show desktop icons', !getFlag(KEYS.hideIcons))}
      </fieldset>
      <fieldset class="cp-group">
        <legend>Accessibility</legend>
        ${row('cp-motion', 'Reduce animations', getFlag(KEYS.reduceMotion))}
        ${row('cp-contrast', 'High contrast', getFlag(KEYS.highContrast))}
      </fieldset>
      <div class="cp-danger">
        <button class="btn" id="cp-reset">Reset JulianOS&hellip;</button>
        <span class="cp-danger-note">Clears saved windows, settings, and Notepad content.</span>
      </div>
    `;
    body.querySelector('#cp-sound').addEventListener('change', (e) => window.setSoundOn?.(e.target.checked));
    body.querySelector('#cp-icons').addEventListener('change', (e) => {
      setFlag(KEYS.hideIcons, !e.target.checked);
      applyHideIcons(!e.target.checked);
    });
    body.querySelector('#cp-motion').addEventListener('change', (e) => {
      setFlag(KEYS.reduceMotion, e.target.checked);
      applyReduceMotion(e.target.checked);
    });
    body.querySelector('#cp-contrast').addEventListener('change', (e) => {
      setFlag(KEYS.highContrast, e.target.checked);
      applyHighContrast(e.target.checked);
    });
    body.querySelector('#cp-reset').addEventListener('click', resetJulianOS);
    return body;
  }

  function openControlPanel() {
    ensureChrome();
    const soundBox = body.querySelector('#cp-sound');
    if (soundBox) soundBox.checked = !!window.getSoundOn?.();
    window.playSound?.('click');
  }

  window.JulianOS.registerApp({ id: 'controlpanel', name: 'Control Panel', icon: '&#9881;&#65039;', launch: openControlPanel });
})();
