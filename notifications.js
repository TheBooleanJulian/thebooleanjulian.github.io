/* ══════════════════════════════════════════════════════════════════
   Notifications — XP-style balloon tips above the system tray.
   Used for real events (a new project appeared on GitHub) and for
   achievement unlocks, not just for show.
   ══════════════════════════════════════════════════════════════════ */
(function () {
  function escHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  function stack() {
    let el = document.getElementById('notify-stack');
    if (!el) {
      el = document.createElement('div');
      el.id = 'notify-stack';
      el.className = 'notify-stack';
      document.body.appendChild(el);
    }
    return el;
  }

  function notify(title, body, icon, opts) {
    const el = document.createElement('div');
    el.className = 'notify-balloon';
    el.innerHTML = `
      <div class="notify-tip"></div>
      <div class="notify-head">
        <span class="notify-icon">${icon || '&#128172;'}</span>
        <span class="notify-title">${escHtml(title)}</span>
        <button class="notify-close" aria-label="Dismiss">&times;</button>
      </div>
      <div class="notify-body">${body}</div>
    `;
    stack().appendChild(el);
    requestAnimationFrame(() => el.classList.add('notify-in'));

    let hideTimer = setTimeout(dismiss, opts?.duration ?? 5500);
    function dismiss() {
      clearTimeout(hideTimer);
      el.classList.remove('notify-in');
      el.classList.add('notify-out');
      setTimeout(() => el.remove(), 250);
    }
    el.querySelector('.notify-close').addEventListener('click', dismiss);
    window.playSound?.('notify');
    return dismiss;
  }

  window.JulianNotify = { notify };
})();
