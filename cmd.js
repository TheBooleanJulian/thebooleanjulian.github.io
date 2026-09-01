/* ══════════════════════════════════════════════════════════════════
   Command Prompt — a small text-mode shell over JulianFS. Every
   command here does something real: `dir`/`cd` walk the same virtual
   filesystem Explorer uses, `projects` reads the live GitHub repo
   list, `date` is the real date. Nothing here is just for show.
   ══════════════════════════════════════════════════════════════════ */
(function () {
  let cwd = [];
  let body = null;
  let outputEl = null;
  let inputEl = null;

  function escHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  function pathString() { return cwd.length ? 'C:\\' + cwd.join('\\') : 'C:\\'; }
  function prompt() { return `${pathString()}>`; }

  function print(line) {
    outputEl.insertAdjacentHTML('beforeend', `<div>${line}</div>`);
    outputEl.scrollTop = outputEl.scrollHeight;
  }

  const COMMANDS = {
    help() {
      print([
        'Available commands:',
        '  help              show this list',
        '  about             about Julian',
        '  projects          list live GitHub repos',
        '  skills            what this site is about',
        '  github            open the GitHub profile',
        '  contact           show contact links',
        '  accurova          open Accurova',
        '  miku              &#9834;',
        '  dir               list the current folder',
        '  cd &lt;folder&gt;      change folder (cd .. to go up)',
        '  whoami            current user',
        '  date              current date/time',
        '  cls / clear       clear the screen',
        '  exit              close this window',
      ].join('<br>'));
    },
    about() {
      print('The Boolean Julian &mdash; // NUS Engineering &middot; Singapore<br>'
        + '[Hello, Sekai] Building Miku, one step at a time.');
    },
    projects() {
      const repos = window.allRepos || [];
      if (!repos.length) { print('(project list is still loading — try again in a moment)'); return; }
      print(`${repos.length} repos:`);
      print(repos.map((r) => escHtml(r.name)).join(', '));
    },
    skills() {
      print('This site is a JulianOS: Web Apps &amp; Sites, Bots &amp; Automations, Dev Tools &amp; Scripts, and Games &amp; Fun.<br>'
        + "Type <b>projects</b> to see what's actually been built.");
    },
    github() {
      print('Opening https://github.com/TheBooleanJulian &hellip;');
      window.open('https://github.com/TheBooleanJulian', '_blank', 'noopener');
    },
    contact() {
      print('GitHub:   https://github.com/TheBooleanJulian<br>'
        + 'LinkedIn: https://www.linkedin.com/in/juliancheungjunyan/<br>'
        + 'Web:      https://juliancheung.com &middot; https://thebooleanjulian.dev');
    },
    accurova() {
      print('Opening https://accurova.com/ &hellip;');
      window.open('https://accurova.com/', '_blank', 'noopener');
    },
    miku() {
      print('&#9834; [Hello, Sekai] Building Miku, one step at a time. &#9834;');
    },
    dir() {
      const node = window.JulianFS.resolve(cwd);
      const items = node?.children || [];
      print(` Directory of ${pathString()}`);
      print('');
      if (!items.length) print('File Not Found');
      items.forEach((it) => print(`  ${it.type === 'folder' ? '&lt;DIR&gt;' : '     '}  ${escHtml(it.name)}`));
      print('');
      print(`     ${items.length} item(s)`);
    },
    cd(arg) {
      if (!arg) { print(pathString()); return; }
      if (arg === '..') { cwd = cwd.slice(0, -1); return; }
      if (arg === '\\' || arg.toUpperCase() === 'C:\\') { cwd = []; return; }
      const target = [...cwd, arg];
      const node = window.JulianFS.resolve(target);
      if (node && node.type === 'folder') cwd = target;
      else print(`The system cannot find the path specified: ${escHtml(arg)}`);
    },
    whoami() { print('JULIANOS\\guest'); },
    date() { print(new Date().toString()); },
    cls() { outputEl.innerHTML = ''; },
    exit() { window.JulianOS.closeWindow(body); },
  };
  COMMANDS.clear = COMMANDS.cls;

  function runCommand(raw) {
    print(`${escHtml(prompt())} ${escHtml(raw)}`);
    const trimmed = raw.trim();
    if (!trimmed) return;
    const [cmd, ...rest] = trimmed.split(/\s+/);
    const fn = COMMANDS[cmd.toLowerCase()];
    if (fn) fn(rest.join(' '));
    else print(`'${escHtml(cmd)}' is not recognized as an internal or external command.<br>Type <b>help</b> for a list of commands.`);
  }

  function ensureChrome() {
    body = createGameWindow('window-cmd', '&#128421;&#65039;', 'Command Prompt', 560);
    if (body.dataset.mounted) return body;
    body.dataset.mounted = '1';
    body.innerHTML = `
      <div class="cmd-screen" id="cmd-output"></div>
      <div class="cmd-inputrow">
        <span id="cmd-prompt"></span>
        <input type="text" id="cmd-input" autocomplete="off" spellcheck="false">
      </div>
    `;
    outputEl = body.querySelector('#cmd-output');
    inputEl = body.querySelector('#cmd-input');
    body.querySelector('#cmd-prompt').textContent = prompt();
    print('Migusoft(R) JulianOS [Version 5.1]');
    print('(C) Migusoft Corporation. Type <b>help</b> to get started.<br>');
    inputEl.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      const val = inputEl.value;
      inputEl.value = '';
      runCommand(val);
      body.querySelector('#cmd-prompt').textContent = prompt();
    });
    body.addEventListener('click', () => inputEl.focus());
    return body;
  }

  function openCmd() {
    ensureChrome();
    setTimeout(() => inputEl?.focus(), 50);
    window.playSound?.('click');
  }

  window.JulianOS.registerApp({ id: 'cmd', name: 'Command Prompt', icon: '&#128421;&#65039;', launch: openCmd });
})();
