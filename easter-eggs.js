/* ══════════════════════════════════════════════════════════════════
   Easter eggs — occasional and discoverable, not intrusive. Konami
   code, a hidden Miku.exe (reachable from cmd.js), and a fake BSOD
   (also reachable from cmd.js's `crash` command) that self-recovers.
   ══════════════════════════════════════════════════════════════════ */
(function () {
  /* ── Konami code ── */
  const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let progress = 0;
  document.addEventListener('keydown', (e) => {
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    progress = (key === KONAMI[progress]) ? progress + 1 : (key === KONAMI[0] ? 1 : 0);
    if (progress === KONAMI.length) {
      progress = 0;
      triggerKonami();
    }
  });

  function triggerKonami() {
    window.JulianAchievements?.unlock('konami');
    document.documentElement.classList.add('julianos-konami-spin');
    window.JulianNotify?.notify('Cheat Mode', 'Konami Code accepted. Nothing else happens — this is a portfolio, not an emulator.', '&#127918;');
    setTimeout(() => document.documentElement.classList.remove('julianos-konami-spin'), 1200);
  }

  /* ── Miku.exe ── */
  function runMikuExe() {
    window.JulianAchievements?.unlock('miku');
    const body = createGameWindow('window-mikuexe', '&#127925;', 'Miku.exe', 340);
    if (!body.dataset.mounted) {
      body.dataset.mounted = '1';
      body.innerHTML = `
        <div class="miku-exe">
          <div class="miku-exe-glow">&#127925;</div>
          <p>[Hello, Sekai]<br>Building Miku, one step at a time.</p>
        </div>`;
    }
    window.playSound?.('notify');
  }

  /* ── Fake BSOD (triggered by cmd.js's `crash` command) ── */
  function crash() {
    window.JulianAchievements?.unlock('crash');
    const overlay = document.createElement('div');
    overlay.className = 'bsod';
    overlay.innerHTML = `
      <div class="bsod-text">
JulianOS<br><br>
A fatal exception 0E has occurred at humor:0028:0x0BADC0DE. The current
application will be terminated (not really).<br><br>
*  Press any key to continue playing pretend<br>
*  This is a portfolio easter egg — nothing actually crashed.<br><br>
Press any key to continue&hellip;
      </div>`;
    document.body.appendChild(overlay);
    function dismiss() {
      overlay.remove();
      document.removeEventListener('keydown', dismiss);
      document.removeEventListener('click', dismiss);
    }
    // Deferred: crash() is usually itself called from inside a keydown
    // handler (Enter in cmd.js) that's still bubbling toward `document`.
    // Registering these synchronously would catch that same event on
    // its way past and dismiss the overlay before it's ever seen.
    setTimeout(() => {
      document.addEventListener('keydown', dismiss);
      document.addEventListener('click', dismiss);
    }, 0);
    setTimeout(dismiss, 4000);
  }

  window.JulianEgg = { runMikuExe, crash };
})();
