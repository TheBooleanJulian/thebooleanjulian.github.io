/* ══════════════════════════════════════════════════════════════════
   JulianFS — a small virtual filesystem used purely as a navigation
   metaphor for Explorer (window-explorer.html app in explorer.js).
   It is not a real arbitrary filesystem: nodes are plain objects, kept
   in memory for the page session, and the Projects/Games folders are
   populated at runtime from data that already exists elsewhere (the
   live GitHub repo list, the games.js GAMES registry) instead of being
   duplicated here.
   ══════════════════════════════════════════════════════════════════ */
(function () {
  function folder(name, icon, children) {
    return { type: 'folder', name, icon: icon || '&#128193;', children: children || [] };
  }
  function file(name, icon, opts) {
    return Object.assign({ type: 'file', name, icon: icon || '&#128196;' }, opts || {});
  }

  const DOCS = {
    about: 'The Boolean Julian\n' +
      '// NUS Engineering · Singapore\n\n' +
      'Hello, Sekai. Building Miku, one step at a time.\n' +
      'I make Telegram bots, web apps, and the occasional automation tool.',
    contact: 'Contact\n\n' +
      'GitHub:    https://github.com/TheBooleanJulian\n' +
      'LinkedIn:  https://www.linkedin.com/in/juliancheungjunyan/\n' +
      'Web:       https://julianCheung.com  ·  https://thebooleanjulian.dev',
    system: 'JulianOS System Notes\n\n' +
      'This "filesystem" is a portfolio metaphor, not a real one — every\n' +
      'file here either opens a document or launches an app. Nothing is\n' +
      'actually written to disk.',
  };

  const root = folder('C:\\', '&#128421;\uFE0F', [
    folder('Documents', '&#128193;', [
      file('Resume.pdf', '&#128196;', { action: 'open-url', url: 'https://github.com/TheBooleanJulian' }),
      file('About Me.txt', '&#128221;', { action: 'open-text', text: DOCS.about }),
      file('Contact.txt', '&#128221;', { action: 'open-text', text: DOCS.contact }),
    ]),
    folder('Projects', '&#128193;', []),   // populated by setProjectRepos()
    folder('Pictures', '&#128193;', [
      folder('Photography', '&#128247;', [
        file('Accurova.url', '&#127760;', { action: 'open-url', url: 'https://accurova.com/' }),
      ]),
      folder('Miku', '&#127925;', [
        file('xymiku39.url', '&#127760;', { action: 'open-url', url: 'https://xymiku39.com/' }),
      ]),
      folder('Projects', '&#128247;', []),
    ]),
    folder('Music', '&#127925;', [
      file('xymiku39.url', '&#127760;', { action: 'open-url', url: 'https://xymiku39.com/' }),
    ]),
    folder('Games', '&#127918;', []),      // populated by setGames()
    folder('System', '&#128421;\uFE0F', [
      file('about.sys', '&#128221;', { action: 'open-text', text: DOCS.system }),
      Object.assign(folder('Secret', '&#128274;', [
        file('you-found-it.txt', '&#128221;', {
          action: 'open-text',
          text: "You found the secret folder.\n\nMost visitors never look in C:\\System\\Secret \u2014 you did.\nCheck Achievements (the trophy icon in the tray) for your reward.",
        }),
      ]), { hidden: true, egg: 'secret-folder' }),
    ]),
  ]);

  function resolve(path) {
    let node = root;
    for (const seg of path) {
      if (!node || node.type !== 'folder') return null;
      node = node.children.find((c) => c.name === seg);
    }
    return node || null;
  }

  function setProjectRepos(repos) {
    const projects = resolve(['Projects']);
    if (!projects) return;
    projects.children = repos.map((r) => folder(r.name, '&#128193;', [
      file('README.txt', '&#128221;', {
        action: 'open-text',
        text: `${r.name}\n\n${r.description || '(No description)'}`,
      }),
      file('website.url', '&#127760;', { action: 'open-url', url: r.homepage || r.html_url }),
      file('project.info', '&#128221;', {
        action: 'open-text',
        text: `Name:      ${r.name}\n`
          + `Language:  ${r.language || 'n/a'}\n`
          + `Stars:     ${r.stargazers_count}\n`
          + `Updated:   ${new Date(r.pushed_at).toLocaleDateString()}\n`
          + `URL:       ${r.html_url}`,
      }),
    ]));
  }

  function setGames(games) {
    const gamesFolder = resolve(['Games']);
    if (!gamesFolder) return;
    gamesFolder.children = games.map((g) => file(g.title, g.icon, { action: 'run', run: g.launch }));
  }

  window.JulianFS = { root, resolve, setProjectRepos, setGames };
})();
