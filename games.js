/* ══════════════ GAME WINDOW INFRASTRUCTURE ══════════════ */
const GAMES = [];

function createGameWindow(id, icon, title, widthPx) {
  let card = document.getElementById(id);
  if (card) {
    if (card.classList.contains('wm-closed')) restoreWindow(card);
    bringToFront(card);
    return card.querySelector('.game-body');
  }
  card = document.createElement('div');
  card.className = 'card game-window';
  card.id = id;
  card.style.setProperty('--game-w', (widthPx || 480) + 'px');
  card.innerHTML = `
    <div class="xp-titlebar">
      <div class="xp-titlebar-left">
        <span class="xp-icon">${icon}</span>
        <span class="xp-title-text">${title}</span>
      </div>
      <div class="xp-titlebar-btns">
        <span class="xp-btn xp-btn-min">&minus;</span>
        <span class="xp-btn xp-btn-max">&#9633;</span>
        <span class="xp-btn xp-btn-close">&times;</span>
      </div>
    </div>
    <div class="xp-body game-body"></div>`;
  document.body.appendChild(card);
  bringToFront(card);
  return card.querySelector('.game-body');
}

function openGameCenter() {
  const body = createGameWindow('window-game-center', '&#127918;', 'Games', 420);
  if (body.dataset.mounted) return;
  body.dataset.mounted = '1';
  body.innerHTML = `<div class="game-launcher-grid" id="game-launcher-grid"></div>`;
  const grid = body.querySelector('#game-launcher-grid');
  GAMES.forEach((g) => {
    const btn = document.createElement('button');
    btn.className = 'game-launcher-icon';
    btn.innerHTML = `<span class="glyph">${g.icon}</span><span class="label">${g.title}</span>`;
    btn.addEventListener('click', () => g.launch());
    grid.appendChild(btn);
  });
}

/* ══════════════ TIC TAC TOE ══════════════ */
function launchTicTacToe() {
  const body = createGameWindow('game-tictactoe', '&#11093;', 'Tic Tac Toe', 300);
  if (body.dataset.mounted) return;
  body.dataset.mounted = '1';

  let board, over;

  body.innerHTML = `
    <div class="game-toolbar"><span>You are X &middot; Computer is O</span></div>
    <div class="game-board" id="ttt-board" style="grid-template-columns:repeat(3,64px)"></div>
    <p class="game-status" id="ttt-status"></p>
    <div><button class="btn" id="ttt-reset">New Game</button></div>
  `;
  const boardEl = body.querySelector('#ttt-board');
  const statusEl = body.querySelector('#ttt-status');

  const WIN_LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

  function checkWinner(b) {
    for (const [a, c, d] of WIN_LINES) {
      if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a];
    }
    return b.every(Boolean) ? 'draw' : null;
  }

  function minimax(b, player) {
    const winner = checkWinner(b);
    if (winner === 'X') return { score: -10 };
    if (winner === 'O') return { score: 10 };
    if (winner === 'draw') return { score: 0 };

    const moves = [];
    for (let i = 0; i < 9; i++) {
      if (!b[i]) {
        b[i] = player;
        const result = minimax(b, player === 'O' ? 'X' : 'O');
        moves.push({ index: i, score: result.score });
        b[i] = null;
      }
    }
    let best = moves[0];
    if (player === 'O') { for (const m of moves) if (m.score > best.score) best = m; }
    else { for (const m of moves) if (m.score < best.score) best = m; }
    return best;
  }

  function render() {
    boardEl.innerHTML = '';
    board.forEach((v, i) => {
      const cell = document.createElement('div');
      cell.className = 'game-cell';
      cell.style.cssText = 'width:64px;height:64px;font-size:1.6rem;';
      cell.textContent = v || '';
      cell.style.color = v === 'X' ? '#0b3fa8' : '#c22014';
      if (!v && !over) cell.addEventListener('click', () => playerMove(i));
      boardEl.appendChild(cell);
    });
  }

  function playerMove(i) {
    if (board[i] || over) return;
    board[i] = 'X';
    playSound('click');
    const result = checkWinner(board);
    if (result) return finish(result);
    render();
    statusEl.textContent = "Computer's turn…";
    setTimeout(computerMove, 300);
  }

  function computerMove() {
    if (over) return;
    const best = minimax(board.slice(), 'O');
    board[best.index] = 'O';
    playSound('click');
    const result = checkWinner(board);
    if (result) return finish(result);
    render();
    statusEl.textContent = 'Your turn (X)';
  }

  function finish(result) {
    over = true;
    render();
    if (result === 'draw') statusEl.textContent = "It's a draw.";
    else if (result === 'X') statusEl.textContent = 'You win! 🎉';
    else statusEl.textContent = 'Computer wins.';
    playSound('notify');
  }

  function reset() {
    board = Array(9).fill(null);
    over = false;
    statusEl.textContent = 'Your turn (X)';
    render();
  }

  body.querySelector('#ttt-reset').addEventListener('click', reset);
  reset();
}
GAMES.push({ icon: '&#11093;', title: 'Tic Tac Toe', launch: launchTicTacToe });

/* ══════════════ MINESWEEPER ══════════════ */
function launchMinesweeper() {
  const body = createGameWindow('game-minesweeper', '&#128163;', 'Minesweeper', 340);
  if (body.dataset.mounted) return;
  body.dataset.mounted = '1';

  const COLS = 9, ROWS = 9, MINES = 10;
  let grid, revealedCount, flagCount, over, firstClick, timerInterval, seconds;

  body.innerHTML = `
    <div class="game-toolbar">
      <span>&#128163; <b id="ms-mines">${MINES}</b></span>
      <button class="btn" id="ms-reset">&#128512; New</button>
      <span>&#9201; <b id="ms-timer">0</b>s</span>
    </div>
    <div class="game-board" id="ms-board" style="grid-template-columns:repeat(${COLS},28px)"></div>
    <p class="game-status" id="ms-status">Left-click to reveal &middot; Right-click to flag</p>
  `;
  const boardEl = body.querySelector('#ms-board');
  const statusEl = body.querySelector('#ms-status');
  const minesEl = body.querySelector('#ms-mines');
  const timerEl = body.querySelector('#ms-timer');

  function idx(r, c) { return r * COLS + c; }

  function neighbors(r, c) {
    const list = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) list.push(idx(nr, nc));
      }
    }
    return list;
  }

  function placeMines(avoidIndex) {
    let placed = 0;
    while (placed < MINES) {
      const i = Math.floor(Math.random() * COLS * ROWS);
      if (i === avoidIndex || grid[i].mine) continue;
      grid[i].mine = true;
      placed++;
    }
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const i = idx(r, c);
        if (grid[i].mine) continue;
        grid[i].count = neighbors(r, c).filter((n) => grid[n].mine).length;
      }
    }
  }

  function startTimer() {
    stopTimer();
    seconds = 0;
    timerInterval = setInterval(() => { seconds++; timerEl.textContent = seconds; }, 1000);
  }
  function stopTimer() { if (timerInterval) clearInterval(timerInterval); timerInterval = null; }

  function reveal(i) {
    const cell = grid[i];
    if (cell.revealed || cell.flagged || over) return;
    cell.revealed = true;
    revealedCount++;
    if (cell.mine) return loseGame();
    if (cell.count === 0) {
      const r = Math.floor(i / COLS), c = i % COLS;
      neighbors(r, c).forEach((n) => { if (!grid[n].revealed) reveal(n); });
    }
    if (revealedCount === COLS * ROWS - MINES) winGame();
  }

  function loseGame() {
    over = true;
    stopTimer();
    grid.forEach((c) => { if (c.mine) c.revealed = true; });
    statusEl.textContent = 'Boom! You hit a mine.';
    playSound('shutdown');
    render();
  }

  function winGame() {
    over = true;
    stopTimer();
    statusEl.textContent = `You cleared the field in ${seconds}s!`;
    playSound('notify');
    render();
  }

  function render() {
    boardEl.innerHTML = '';
    grid.forEach((cell, i) => {
      const el = document.createElement('div');
      el.className = 'game-cell';
      el.style.cssText = 'width:28px;height:28px;font-size:.8rem;';
      if (cell.revealed) {
        el.style.background = '#fff';
        el.style.cursor = 'default';
        if (cell.mine) { el.textContent = '\u{1F4A3}'; el.style.background = '#f6b8b0'; }
        else if (cell.count > 0) {
          el.textContent = cell.count;
          const colors = ['', '#0b3fa8', '#1a7a1a', '#c22014', '#0b1f7a', '#7a1f0b', '#0b7a7a', '#333', '#888'];
          el.style.color = colors[cell.count];
        }
      } else if (cell.flagged) {
        el.textContent = '\u{1F6A9}';
      }
      if (!cell.revealed && !over) {
        el.addEventListener('click', () => {
          if (firstClick) { placeMines(i); firstClick = false; startTimer(); }
          reveal(i);
          render();
        });
        el.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          if (cell.revealed) return;
          cell.flagged = !cell.flagged;
          flagCount += cell.flagged ? 1 : -1;
          minesEl.textContent = MINES - flagCount;
          render();
        });
      }
      boardEl.appendChild(el);
    });
  }

  function reset() {
    over = false;
    firstClick = true;
    revealedCount = 0;
    flagCount = 0;
    stopTimer();
    seconds = 0;
    timerEl.textContent = '0';
    minesEl.textContent = MINES;
    statusEl.textContent = 'Left-click to reveal · Right-click to flag';
    grid = Array.from({ length: COLS * ROWS }, () => ({ mine: false, revealed: false, flagged: false, count: 0 }));
    render();
  }

  body.querySelector('#ms-reset').addEventListener('click', reset);
  reset();
}
GAMES.push({ icon: '&#128163;', title: 'Minesweeper', launch: launchMinesweeper });

/* ══════════════ BATTLESHIP ══════════════ */
function launchBattleship() {
  const body = createGameWindow('game-battleship', '&#128674;', 'Battleship', 560);
  if (body.dataset.mounted) return;
  body.dataset.mounted = '1';

  const SIZE = 10;
  const SHIPS = [5, 4, 3, 3, 2];
  const SHIP_NAMES = ['Carrier', 'Battleship', 'Cruiser', 'Submarine', 'Destroyer'];

  let playerGrid, aiGrid, playerShips, aiShips, phase, placeIndex, orientation, aiTargetQueue, over;

  body.innerHTML = `
    <div class="game-toolbar" id="bs-toolbar"></div>
    <div style="display:flex;gap:1rem;flex-wrap:wrap;justify-content:center">
      <div>
        <p style="font-size:.75rem;text-align:center;margin-bottom:.25rem">Your Fleet</p>
        <div class="game-board" id="bs-player-board" style="grid-template-columns:repeat(${SIZE},24px)"></div>
      </div>
      <div>
        <p style="font-size:.75rem;text-align:center;margin-bottom:.25rem">Enemy Waters</p>
        <div class="game-board" id="bs-ai-board" style="grid-template-columns:repeat(${SIZE},24px)"></div>
      </div>
    </div>
    <p class="game-status" id="bs-status"></p>
    <div><button class="btn" id="bs-reset">New Game</button></div>
  `;
  const toolbarEl = body.querySelector('#bs-toolbar');
  const playerBoardEl = body.querySelector('#bs-player-board');
  const aiBoardEl = body.querySelector('#bs-ai-board');
  const statusEl = body.querySelector('#bs-status');

  function emptyGrid() {
    return Array.from({ length: SIZE * SIZE }, () => ({ ship: -1, hit: false }));
  }

  function idx(r, c) { return r * SIZE + c; }
  function inBounds(r, c) { return r >= 0 && r < SIZE && c >= 0 && c < SIZE; }

  function canPlace(grid, r, c, len, horiz) {
    for (let k = 0; k < len; k++) {
      const rr = horiz ? r : r + k;
      const cc = horiz ? c + k : c;
      if (!inBounds(rr, cc) || grid[idx(rr, cc)].ship !== -1) return false;
    }
    return true;
  }

  function placeShip(grid, r, c, len, horiz, shipIndex) {
    for (let k = 0; k < len; k++) {
      const rr = horiz ? r : r + k;
      const cc = horiz ? c + k : c;
      grid[idx(rr, cc)].ship = shipIndex;
    }
  }

  function randomPlaceAll(grid) {
    const ships = SHIPS.map((len) => ({ len, hits: 0, sunk: false }));
    SHIPS.forEach((len, i) => {
      let placed = false;
      while (!placed) {
        const horiz = Math.random() < 0.5;
        const r = Math.floor(Math.random() * SIZE);
        const c = Math.floor(Math.random() * SIZE);
        if (canPlace(grid, r, c, len, horiz)) {
          placeShip(grid, r, c, len, horiz, i);
          placed = true;
        }
      }
    });
    return ships;
  }

  function renderToolbar() {
    if (phase === 'placing') {
      toolbarEl.innerHTML = `<span>Place your ${SHIP_NAMES[placeIndex]} (${SHIPS[placeIndex]} cells)</span>
        <button class="btn" id="bs-rotate">Rotate (${orientation === 'h' ? 'Horizontal' : 'Vertical'})</button>`;
      toolbarEl.querySelector('#bs-rotate').addEventListener('click', () => {
        orientation = orientation === 'h' ? 'v' : 'h';
        renderToolbar();
      });
    } else {
      toolbarEl.innerHTML = `<span>${phase === 'battle' ? 'Fire at the enemy waters!' : ''}</span>`;
    }
  }

  function renderBoards() {
    playerBoardEl.innerHTML = '';
    playerGrid.forEach((cell, i) => {
      const el = document.createElement('div');
      el.className = 'game-cell';
      el.style.cssText = 'width:24px;height:24px;font-size:.7rem;';
      if (cell.ship !== -1) el.style.background = cell.hit ? '#e23c2b' : '#a9c6ee';
      if (cell.hit) el.textContent = cell.ship !== -1 ? '●' : '·';
      if (phase === 'placing') el.addEventListener('click', () => onPlayerBoardClick(i));
      playerBoardEl.appendChild(el);
    });

    aiBoardEl.innerHTML = '';
    aiGrid.forEach((cell, i) => {
      const el = document.createElement('div');
      el.className = 'game-cell';
      el.style.cssText = 'width:24px;height:24px;font-size:.7rem;';
      if (cell.hit) {
        el.style.cursor = 'default';
        if (cell.ship !== -1) { el.style.background = '#e23c2b'; el.textContent = '●'; }
        else { el.style.background = '#ddd'; el.textContent = '·'; }
      } else if (phase === 'battle' && !over) {
        el.addEventListener('click', () => playerFire(i));
      }
      aiBoardEl.appendChild(el);
    });
  }

  function onPlayerBoardClick(i) {
    if (phase !== 'placing') return;
    const r = Math.floor(i / SIZE), c = i % SIZE;
    const len = SHIPS[placeIndex];
    const horiz = orientation === 'h';
    if (!canPlace(playerGrid, r, c, len, horiz)) {
      statusEl.textContent = "Can't place there.";
      return;
    }
    placeShip(playerGrid, r, c, len, horiz, placeIndex);
    placeIndex++;
    if (placeIndex >= SHIPS.length) {
      phase = 'battle';
      statusEl.textContent = 'Battle stations! Fire at the enemy waters.';
    } else {
      statusEl.textContent = `Place your ${SHIP_NAMES[placeIndex]} (${SHIPS[placeIndex]} cells)`;
    }
    renderToolbar();
    renderBoards();
  }

  function playerFire(i) {
    const cell = aiGrid[i];
    if (cell.hit || over) return;
    cell.hit = true;
    playSound('click');
    if (cell.ship !== -1) {
      const ship = aiShips[cell.ship];
      ship.hits++;
      if (ship.hits === ship.len) {
        ship.sunk = true;
        statusEl.textContent = `You sank their ${SHIP_NAMES[cell.ship]}!`;
        playSound('notify');
      } else {
        statusEl.textContent = 'Hit!';
      }
      if (aiShips.every((s) => s.sunk)) return endGame(true);
    } else {
      statusEl.textContent = 'Miss.';
    }
    renderBoards();
    setTimeout(aiTurn, 400);
  }

  function aiTurn() {
    if (over) return;
    let i;
    if (aiTargetQueue.length) {
      i = aiTargetQueue.shift();
      if (playerGrid[i].hit) return aiTurn();
    } else {
      do { i = Math.floor(Math.random() * SIZE * SIZE); } while (playerGrid[i].hit);
    }
    const cell = playerGrid[i];
    cell.hit = true;
    if (cell.ship !== -1) {
      const ship = playerShips[cell.ship];
      ship.hits++;
      const r = Math.floor(i / SIZE), c = i % SIZE;
      if (ship.hits === ship.len) {
        ship.sunk = true;
        statusEl.textContent = `The enemy sank your ${SHIP_NAMES[cell.ship]}!`;
        aiTargetQueue = aiTargetQueue.filter((n) => playerGrid[n].ship !== cell.ship);
      } else {
        statusEl.textContent = 'The enemy hit your ship!';
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dr, dc]) => {
          const nr = r + dr, nc = c + dc;
          if (inBounds(nr, nc) && !playerGrid[idx(nr, nc)].hit) aiTargetQueue.push(idx(nr, nc));
        });
      }
      if (playerShips.every((s) => s.sunk)) return endGame(false);
    }
    renderBoards();
  }

  function endGame(playerWon) {
    over = true;
    phase = 'over';
    statusEl.textContent = playerWon ? 'You sank the entire enemy fleet! Victory!' : 'Your fleet was destroyed. Defeat.';
    playSound(playerWon ? 'notify' : 'shutdown');
    renderToolbar();
    renderBoards();
  }

  function reset() {
    playerGrid = emptyGrid();
    aiGrid = emptyGrid();
    aiShips = randomPlaceAll(aiGrid);
    playerShips = SHIPS.map((len) => ({ len, hits: 0, sunk: false }));
    phase = 'placing';
    placeIndex = 0;
    orientation = 'h';
    aiTargetQueue = [];
    over = false;
    statusEl.textContent = `Place your ${SHIP_NAMES[0]} (${SHIPS[0]} cells)`;
    renderToolbar();
    renderBoards();
  }

  body.querySelector('#bs-reset').addEventListener('click', reset);
  reset();
}
GAMES.push({ icon: '&#128674;', title: 'Battleship', launch: launchBattleship });

/* ══════════════ MANCALA ══════════════ */
function launchMancala() {
  const body = createGameWindow('game-mancala', '&#127920;', 'Mancala', 560);
  if (body.dataset.mounted) return;
  body.dataset.mounted = '1';

  const P1_STORE = 6, P2_STORE = 13;
  let pits, turn, over;

  body.innerHTML = `
    <div class="game-toolbar"><span id="mc-turn"></span></div>
    <div id="mc-board" style="display:flex;flex-direction:column;gap:.5rem;align-items:center"></div>
    <p class="game-status" id="mc-status">Player 1 (bottom row) starts.</p>
    <div><button class="btn" id="mc-reset">New Game</button></div>
  `;
  const boardEl = body.querySelector('#mc-board');
  const turnEl = body.querySelector('#mc-turn');
  const statusEl = body.querySelector('#mc-status');

  function opponentStore(player) { return player === 1 ? P2_STORE : P1_STORE; }
  function ownStore(player) { return player === 1 ? P1_STORE : P2_STORE; }
  function ownPits(player) { return player === 1 ? [0, 1, 2, 3, 4, 5] : [7, 8, 9, 10, 11, 12]; }

  function pitEl(i, ownerPlayer) {
    const el = document.createElement('button');
    el.className = 'game-cell';
    el.style.cssText = 'width:42px;height:42px;border-radius:50%;font-size:.9rem;';
    el.textContent = pits[i];
    el.disabled = over || turn !== ownerPlayer || pits[i] === 0;
    if (!el.disabled) el.addEventListener('click', () => move(i));
    else el.style.cursor = 'default';
    return el;
  }

  function storeEl(i) {
    const el = document.createElement('div');
    el.className = 'game-cell';
    el.style.cssText = 'width:50px;height:70px;border-radius:6px;font-size:1rem;background:#d4d0c8;';
    el.textContent = pits[i];
    return el;
  }

  function render() {
    boardEl.innerHTML = '';
    const row1 = document.createElement('div');
    row1.style.cssText = 'display:flex;gap:.4rem;flex-direction:row-reverse';
    for (let i = 7; i <= 12; i++) row1.appendChild(pitEl(i, 2));

    const middleRow = document.createElement('div');
    middleRow.style.cssText = 'display:flex;justify-content:space-between;align-items:center;width:100%;gap:1rem';
    middleRow.appendChild(storeEl(P2_STORE));
    middleRow.appendChild(storeEl(P1_STORE));

    const row2 = document.createElement('div');
    row2.style.cssText = 'display:flex;gap:.4rem';
    for (let i = 0; i <= 5; i++) row2.appendChild(pitEl(i, 1));

    boardEl.appendChild(row1);
    boardEl.appendChild(middleRow);
    boardEl.appendChild(row2);

    turnEl.textContent = over ? '' : `Player ${turn}'s turn (${turn === 1 ? 'bottom' : 'top'} row)`;
  }

  function move(i) {
    if (over) return;
    let stones = pits[i];
    if (stones === 0) return;
    pits[i] = 0;
    let pos = i;
    const oppStore = opponentStore(turn);
    while (stones > 0) {
      pos = (pos + 1) % 14;
      if (pos === oppStore) continue;
      pits[pos]++;
      stones--;
    }
    playSound('click');

    const own = ownPits(turn);
    if (own.includes(pos) && pits[pos] === 1) {
      const oppositeIndex = 12 - pos;
      if (pits[oppositeIndex] > 0) {
        pits[ownStore(turn)] += pits[oppositeIndex] + 1;
        pits[pos] = 0;
        pits[oppositeIndex] = 0;
        playSound('notify');
      }
    }

    const landedInOwnStore = pos === ownStore(turn);
    checkEnd();
    if (!over) {
      if (!landedInOwnStore) turn = turn === 1 ? 2 : 1;
      statusEl.textContent = landedInOwnStore ? `Player ${turn} goes again!` : `Player ${turn}'s turn.`;
    }
    render();
  }

  function checkEnd() {
    const p1Empty = ownPits(1).every((i) => pits[i] === 0);
    const p2Empty = ownPits(2).every((i) => pits[i] === 0);
    if (p1Empty || p2Empty) {
      ownPits(1).forEach((i) => { pits[P1_STORE] += pits[i]; pits[i] = 0; });
      ownPits(2).forEach((i) => { pits[P2_STORE] += pits[i]; pits[i] = 0; });
      over = true;
      const p1 = pits[P1_STORE], p2 = pits[P2_STORE];
      statusEl.textContent = p1 === p2 ? "It's a tie!" : `Player ${p1 > p2 ? 1 : 2} wins ${Math.max(p1, p2)}-${Math.min(p1, p2)}!`;
      playSound('notify');
    }
  }

  function reset() {
    pits = [4, 4, 4, 4, 4, 4, 0, 4, 4, 4, 4, 4, 4, 0];
    turn = 1;
    over = false;
    statusEl.textContent = 'Player 1 (bottom row) starts.';
    render();
  }

  body.querySelector('#mc-reset').addEventListener('click', reset);
  reset();
}
GAMES.push({ icon: '&#127920;', title: 'Mancala', launch: launchMancala });

/* ══════════════ BLACKJACK ══════════════ */
function launchBlackjack() {
  const body = createGameWindow('game-blackjack', '&#127183;', 'Blackjack', 420);
  if (body.dataset.mounted) return;
  body.dataset.mounted = '1';

  let deck, playerHand, dealerHand, over, wins = 0, losses = 0, pushes = 0;

  body.innerHTML = `
    <div class="game-toolbar"><span id="bj-score">Wins: 0 · Losses: 0 · Pushes: 0</span></div>
    <div>
      <p style="font-size:.75rem;color:#888">Dealer</p>
      <div id="bj-dealer" style="display:flex;gap:.3rem;flex-wrap:wrap;min-height:70px"></div>
    </div>
    <div>
      <p style="font-size:.75rem;color:#888">You</p>
      <div id="bj-player" style="display:flex;gap:.3rem;flex-wrap:wrap;min-height:70px"></div>
    </div>
    <p class="game-status" id="bj-status"></p>
    <div class="game-toolbar">
      <button class="btn" id="bj-hit">Hit</button>
      <button class="btn" id="bj-stand">Stand</button>
      <button class="btn" id="bj-new">New Hand</button>
    </div>
  `;
  const dealerEl = body.querySelector('#bj-dealer');
  const playerEl = body.querySelector('#bj-player');
  const statusEl = body.querySelector('#bj-status');
  const scoreEl = body.querySelector('#bj-score');
  const hitBtn = body.querySelector('#bj-hit');
  const standBtn = body.querySelector('#bj-stand');

  const SUIT_CHARS = ['♠', '♥', '♣', '♦'];
  const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

  function freshDeck() {
    const d = [];
    for (let s = 0; s < 4; s++) {
      for (const r of RANKS) d.push({ rank: r, suit: SUIT_CHARS[s], red: s === 1 || s === 3 });
    }
    for (let i = d.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [d[i], d[j]] = [d[j], d[i]];
    }
    return d;
  }

  function draw() {
    if (deck.length === 0) deck = freshDeck();
    return deck.pop();
  }

  function handValue(hand) {
    let total = 0, aces = 0;
    hand.forEach((c) => {
      if (c.rank === 'A') { total += 11; aces++; }
      else if (['J', 'Q', 'K'].includes(c.rank)) total += 10;
      else total += parseInt(c.rank, 10);
    });
    while (total > 21 && aces > 0) { total -= 10; aces--; }
    return total;
  }

  function cardEl(c, hidden) {
    const el = document.createElement('div');
    el.style.cssText = 'width:44px;height:62px;border-radius:4px;border:1px solid #888;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.85rem;background:#fff;';
    if (hidden) { el.style.background = 'linear-gradient(135deg,#1657d0,#0a3faa)'; }
    else { el.textContent = c.rank + c.suit; el.style.color = c.red ? '#c22014' : '#111'; }
    return el;
  }

  function render(revealDealer) {
    dealerEl.innerHTML = '';
    dealerHand.forEach((c, i) => dealerEl.appendChild(cardEl(c, i === 1 && !revealDealer)));
    playerEl.innerHTML = '';
    playerHand.forEach((c) => playerEl.appendChild(cardEl(c, false)));
    scoreEl.textContent = `Wins: ${wins} · Losses: ${losses} · Pushes: ${pushes}`;
  }

  function endHand(result) {
    over = true;
    hitBtn.disabled = true;
    standBtn.disabled = true;
    const pv = handValue(playerHand), dv = handValue(dealerHand);
    if (result === 'blackjack') { statusEl.textContent = `Blackjack! You win. (You ${pv} · Dealer ${dv})`; wins++; }
    else if (result === 'bust') { statusEl.textContent = `Bust! You lose. (You ${pv})`; losses++; }
    else if (result === 'dealer-bust') { statusEl.textContent = `Dealer busts! You win. (Dealer ${dv})`; wins++; }
    else if (result === 'win') { statusEl.textContent = `You win! (You ${pv} · Dealer ${dv})`; wins++; }
    else if (result === 'lose') { statusEl.textContent = `Dealer wins. (You ${pv} · Dealer ${dv})`; losses++; }
    else { statusEl.textContent = `Push. (You ${pv} · Dealer ${dv})`; pushes++; }
    playSound(result === 'lose' || result === 'bust' ? 'shutdown' : 'notify');
    render(true);
  }

  function hit() {
    if (over) return;
    playerHand.push(draw());
    playSound('click');
    const pv = handValue(playerHand);
    render(false);
    if (pv > 21) endHand('bust');
    else if (pv === 21) stand();
  }

  function stand() {
    if (over) return;
    while (handValue(dealerHand) < 17) dealerHand.push(draw());
    const pv = handValue(playerHand), dv = handValue(dealerHand);
    if (dv > 21) endHand('dealer-bust');
    else if (pv > dv) endHand('win');
    else if (pv < dv) endHand('lose');
    else endHand('push');
  }

  function newHand() {
    if (!deck || deck.length < 15) deck = freshDeck();
    over = false;
    hitBtn.disabled = false;
    standBtn.disabled = false;
    playerHand = [draw(), draw()];
    dealerHand = [draw(), draw()];
    statusEl.textContent = '';
    render(false);
    if (handValue(playerHand) === 21) {
      if (handValue(dealerHand) === 21) endHand('push');
      else endHand('blackjack');
    }
  }

  hitBtn.addEventListener('click', hit);
  standBtn.addEventListener('click', stand);
  body.querySelector('#bj-new').addEventListener('click', newHand);
  newHand();
}
GAMES.push({ icon: '&#127183;', title: 'Blackjack', launch: launchBlackjack });

/* ══════════════ SOLITAIRE (KLONDIKE) ══════════════ */
function launchSolitaire() {
  const body = createGameWindow('game-solitaire', '&#127137;', 'Solitaire', 640);
  if (body.dataset.mounted) return;
  body.dataset.mounted = '1';

  const SUITS = ['♠', '♥', '♣', '♦'];
  const RED_SUITS = [1, 3];
  const RANK_LABELS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

  let stock, waste, foundations, tableau, dragSource;

  body.innerHTML = `
    <div class="game-toolbar">
      <button class="btn" id="sol-new">New Game</button>
      <span class="game-status" id="sol-status" style="margin:0"></span>
    </div>
    <div style="display:flex;gap:.5rem;margin-bottom:.6rem">
      <div id="sol-stock" class="sol-pile"></div>
      <div id="sol-waste" class="sol-pile"></div>
      <div style="flex:1"></div>
      <div id="sol-f0" class="sol-pile" data-foundation="0"></div>
      <div id="sol-f1" class="sol-pile" data-foundation="1"></div>
      <div id="sol-f2" class="sol-pile" data-foundation="2"></div>
      <div id="sol-f3" class="sol-pile" data-foundation="3"></div>
    </div>
    <div id="sol-tableau" style="display:flex;gap:.5rem"></div>
  `;

  const style = document.createElement('style');
  style.textContent = `
    .sol-pile { width:52px; height:74px; border:1px dashed #99a; border-radius:4px; position:relative; flex-shrink:0; }
    .sol-col { width:52px; position:relative; min-height:74px; flex:1; }
    .sol-card {
      position:absolute; left:0; width:50px; height:70px; border-radius:4px;
      border:1px solid #888; background:#fff; box-shadow:0 1px 2px rgba(0,0,0,.3);
      display:flex; flex-direction:column; align-items:center; justify-content:flex-start;
      font-size:.75rem; font-weight:700; padding:3px; cursor:grab; user-select:none;
    }
    .sol-card.back { background:linear-gradient(135deg,#1657d0,#0a3faa); }
    .sol-card.red { color:#c22014; }
    .sol-card.black { color:#111; }
  `;
  body.appendChild(style);

  const stockEl = body.querySelector('#sol-stock');
  const wasteEl = body.querySelector('#sol-waste');
  const tableauEl = body.querySelector('#sol-tableau');
  const statusEl = body.querySelector('#sol-status');
  const foundationEls = [0, 1, 2, 3].map((i) => body.querySelector(`#sol-f${i}`));

  function makeDeck() {
    const d = [];
    for (let s = 0; s < 4; s++) for (let r = 1; r <= 13; r++) d.push({ suit: s, rank: r, faceUp: false });
    for (let i = d.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [d[i], d[j]] = [d[j], d[i]];
    }
    return d;
  }

  function isRed(suit) { return RED_SUITS.includes(suit); }

  function cardNode(card, faceUp) {
    const el = document.createElement('div');
    el.className = 'sol-card ' + (faceUp ? (isRed(card.suit) ? 'red' : 'black') : 'back');
    if (faceUp) el.innerHTML = `<div>${RANK_LABELS[card.rank - 1]}${SUITS[card.suit]}</div>`;
    return el;
  }

  function dealNew() {
    const deck = makeDeck();
    tableau = [];
    for (let i = 0; i < 7; i++) {
      const pile = [];
      for (let j = 0; j <= i; j++) pile.push(deck.pop());
      pile[pile.length - 1].faceUp = true;
      tableau.push(pile);
    }
    stock = deck;
    stock.forEach((c) => { c.faceUp = false; });
    waste = [];
    foundations = [[], [], [], []];
    statusEl.textContent = '';
    render();
  }

  function checkWin() {
    if (foundations.every((f) => f.length === 13)) {
      statusEl.textContent = 'You win! All foundations complete. 🎉';
      playSound('notify');
    }
  }

  function getCard(source) {
    if (source.type === 'waste') return waste[waste.length - 1];
    if (source.type === 'tableau') return tableau[source.col][source.cardIndex];
    return null;
  }

  function canStackTableau(card, targetPile) {
    if (targetPile.length === 0) return card.rank === 13;
    const top = targetPile[targetPile.length - 1];
    return top.faceUp && top.rank === card.rank + 1 && isRed(top.suit) !== isRed(card.suit);
  }

  function canStackFoundation(card, foundation, suitIndex) {
    if (card.suit !== suitIndex) return false;
    if (foundation.length === 0) return card.rank === 1;
    return foundation[foundation.length - 1].rank === card.rank - 1;
  }

  function flipTableauTops() {
    tableau.forEach((pile) => {
      if (pile.length && !pile[pile.length - 1].faceUp) pile[pile.length - 1].faceUp = true;
    });
  }

  function handleDrop(target) {
    if (!dragSource) return;
    const source = dragSource;
    dragSource = null;

    if (source.type === 'waste') {
      const card = getCard(source);
      if (!card) return;
      if (target.type === 'tableau' && canStackTableau(card, tableau[target.col])) {
        waste.pop();
        tableau[target.col].push(card);
        playSound('click');
      } else if (target.type === 'foundation' && canStackFoundation(card, foundations[target.index], target.index)) {
        waste.pop();
        foundations[target.index].push(card);
        playSound('notify');
      }
    } else if (source.type === 'tableau') {
      const pile = tableau[source.col];
      const moving = pile.slice(source.cardIndex);
      const firstCard = moving[0];
      if (!firstCard || !firstCard.faceUp) return;
      if (target.type === 'tableau' && target.col !== source.col && canStackTableau(firstCard, tableau[target.col])) {
        pile.splice(source.cardIndex);
        tableau[target.col].push(...moving);
        playSound('click');
      } else if (target.type === 'foundation' && moving.length === 1 && canStackFoundation(firstCard, foundations[target.index], target.index)) {
        pile.splice(source.cardIndex);
        foundations[target.index].push(firstCard);
        playSound('notify');
      }
    }

    flipTableauTops();
    render();
    checkWin();
  }

  function tryAutoFoundation(source) {
    if (source.type === 'tableau') {
      const pile = tableau[source.col];
      if (source.cardIndex !== pile.length - 1) return;
    }
    const card = getCard(source);
    if (!card) return;
    const suitIndex = card.suit;
    if (canStackFoundation(card, foundations[suitIndex], suitIndex)) {
      if (source.type === 'waste') waste.pop();
      else if (source.type === 'tableau') tableau[source.col].pop();
      foundations[suitIndex].push(card);
      playSound('notify');
      flipTableauTops();
      render();
      checkWin();
    }
  }

  function render() {
    stockEl.innerHTML = '';
    if (stock.length) stockEl.appendChild(cardNode(stock[stock.length - 1], false));
    stockEl.onclick = () => {
      if (stock.length) {
        const c = stock.pop();
        c.faceUp = true;
        waste.push(c);
      } else if (waste.length) {
        stock = waste.reverse();
        stock.forEach((c) => { c.faceUp = false; });
        waste = [];
      }
      playSound('click');
      render();
    };

    wasteEl.innerHTML = '';
    if (waste.length) {
      const top = waste[waste.length - 1];
      const el = cardNode(top, true);
      el.draggable = true;
      el.addEventListener('dragstart', () => { dragSource = { type: 'waste' }; });
      el.addEventListener('dblclick', () => tryAutoFoundation({ type: 'waste' }));
      wasteEl.appendChild(el);
    }

    foundations.forEach((f, i) => {
      const el = foundationEls[i];
      el.innerHTML = '';
      if (f.length) el.appendChild(cardNode(f[f.length - 1], true));
      else el.textContent = SUITS[i];
      el.ondragover = (e) => e.preventDefault();
      el.ondrop = () => handleDrop({ type: 'foundation', index: i });
    });

    tableauEl.innerHTML = '';
    tableau.forEach((pile, colIndex) => {
      const col = document.createElement('div');
      col.className = 'sol-col';
      col.style.minHeight = (74 + pile.length * 20) + 'px';
      pile.forEach((card, cardIndex) => {
        const el = cardNode(card, card.faceUp);
        el.style.top = (cardIndex * 20) + 'px';
        el.style.zIndex = cardIndex;
        if (card.faceUp) {
          el.draggable = true;
          el.addEventListener('dragstart', (e) => {
            dragSource = { type: 'tableau', col: colIndex, cardIndex };
            e.stopPropagation();
          });
          el.addEventListener('dblclick', () => tryAutoFoundation({ type: 'tableau', col: colIndex, cardIndex }));
        }
        col.appendChild(el);
      });
      col.addEventListener('dragover', (e) => e.preventDefault());
      col.addEventListener('drop', () => handleDrop({ type: 'tableau', col: colIndex }));
      tableauEl.appendChild(col);
    });
  }

  body.querySelector('#sol-new').addEventListener('click', dealNew);
  dealNew();
}
GAMES.push({ icon: '&#127137;', title: 'Solitaire', launch: launchSolitaire });

/* ══════════════ CHESS ══════════════ */
function launchChess() {
  const body = createGameWindow('game-chess', '&#9818;', 'Chess', 460);
  if (body.dataset.mounted) return;
  body.dataset.mounted = '1';

  const PIECE_GLYPHS = {
    wk: '♔', wq: '♕', wr: '♖', wb: '♗', wn: '♘', wp: '♙',
    bk: '♚', bq: '♛', br: '♜', bb: '♝', bn: '♞', bp: '♟',
  };
  const VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

  body.innerHTML = `
    <div class="game-toolbar">
      <span id="chess-turn">White to move</span>
      <button class="btn" id="chess-reset">New Game</button>
    </div>
    <div id="chess-board" style="display:grid;grid-template-columns:repeat(8,44px);grid-template-rows:repeat(8,44px);border:2px solid #333;width:min-content;margin:0 auto"></div>
    <p class="game-status" id="chess-status"></p>
  `;
  const boardEl = body.querySelector('#chess-board');
  const turnEl = body.querySelector('#chess-turn');
  const statusEl = body.querySelector('#chess-status');

  let board, turn, castling, enPassant, selected, legalTargets, over;

  function initState() {
    board = Array.from({ length: 8 }, () => Array(8).fill(null));
    const backRank = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
    for (let c = 0; c < 8; c++) {
      board[0][c] = { type: backRank[c], color: 'b' };
      board[1][c] = { type: 'p', color: 'b' };
      board[6][c] = { type: 'p', color: 'w' };
      board[7][c] = { type: backRank[c], color: 'w' };
    }
    turn = 'w';
    castling = { wK: true, wQ: true, bK: true, bQ: true };
    enPassant = null;
    selected = null;
    legalTargets = [];
    over = false;
  }

  function cloneBoard(b) {
    return b.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
  }

  function inBounds(r, c) { return r >= 0 && r < 8 && c >= 0 && c < 8; }

  function pseudoMoves(b, r, c, castleState, ep) {
    const piece = b[r][c];
    if (!piece) return [];
    const moves = [];
    const dir = piece.color === 'w' ? -1 : 1;
    const enemyColor = piece.color === 'w' ? 'b' : 'w';

    if (piece.type === 'p') {
      if (inBounds(r + dir, c) && !b[r + dir][c]) {
        const promotion = (r + dir === 0 || r + dir === 7);
        moves.push({ from: [r, c], to: [r + dir, c], capture: false, promotion });
        const startRow = piece.color === 'w' ? 6 : 1;
        if (r === startRow && !b[r + 2 * dir][c]) {
          moves.push({ from: [r, c], to: [r + 2 * dir, c], capture: false, doubleStep: true });
        }
      }
      [c - 1, c + 1].forEach((nc) => {
        if (!inBounds(r + dir, nc)) return;
        const target = b[r + dir][nc];
        if (target && target.color === enemyColor) {
          const promotion = (r + dir === 0 || r + dir === 7);
          moves.push({ from: [r, c], to: [r + dir, nc], capture: true, promotion });
        } else if (ep && ep.r === r + dir && ep.c === nc) {
          moves.push({ from: [r, c], to: [r + dir, nc], capture: true, enPassant: true });
        }
      });
    } else if (piece.type === 'n') {
      const deltas = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
      deltas.forEach(([dr, dc]) => {
        const nr = r + dr, nc = c + dc;
        if (!inBounds(nr, nc)) return;
        const target = b[nr][nc];
        if (!target || target.color !== piece.color) moves.push({ from: [r, c], to: [nr, nc], capture: !!target });
      });
    } else if (piece.type === 'k') {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr, nc = c + dc;
          if (!inBounds(nr, nc)) continue;
          const target = b[nr][nc];
          if (!target || target.color !== piece.color) moves.push({ from: [r, c], to: [nr, nc], capture: !!target });
        }
      }
      const row = piece.color === 'w' ? 7 : 0;
      if (r === row && c === 4) {
        const kSide = piece.color === 'w' ? castleState.wK : castleState.bK;
        const qSide = piece.color === 'w' ? castleState.wQ : castleState.bQ;
        if (kSide && !b[row][5] && !b[row][6] && b[row][7] && b[row][7].type === 'r') {
          moves.push({ from: [r, c], to: [row, 6], castle: 'k' });
        }
        if (qSide && !b[row][1] && !b[row][2] && !b[row][3] && b[row][0] && b[row][0].type === 'r') {
          moves.push({ from: [r, c], to: [row, 2], castle: 'q' });
        }
      }
    } else {
      const dirs = piece.type === 'b' ? [[-1, -1], [-1, 1], [1, -1], [1, 1]]
        : piece.type === 'r' ? [[-1, 0], [1, 0], [0, -1], [0, 1]]
        : [[-1, -1], [-1, 1], [1, -1], [1, 1], [-1, 0], [1, 0], [0, -1], [0, 1]];
      dirs.forEach(([dr, dc]) => {
        let nr = r + dr, nc = c + dc;
        while (inBounds(nr, nc)) {
          const target = b[nr][nc];
          if (!target) { moves.push({ from: [r, c], to: [nr, nc], capture: false }); }
          else { if (target.color !== piece.color) moves.push({ from: [r, c], to: [nr, nc], capture: true }); break; }
          nr += dr; nc += dc;
        }
      });
    }
    return moves;
  }

  function isAttacked(b, r, c, byColor) {
    for (let rr = 0; rr < 8; rr++) {
      for (let cc = 0; cc < 8; cc++) {
        const p = b[rr][cc];
        if (!p || p.color !== byColor) continue;
        if (p.type === 'p') {
          const dir = p.color === 'w' ? -1 : 1;
          if (rr + dir === r && (cc - 1 === c || cc + 1 === c)) return true;
        } else if (p.type === 'n') {
          const deltas = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
          if (deltas.some(([dr, dc]) => rr + dr === r && cc + dc === c)) return true;
        } else if (p.type === 'k') {
          if (Math.abs(rr - r) <= 1 && Math.abs(cc - c) <= 1 && !(rr === r && cc === c)) return true;
        } else {
          const dirs = p.type === 'b' ? [[-1, -1], [-1, 1], [1, -1], [1, 1]]
            : p.type === 'r' ? [[-1, 0], [1, 0], [0, -1], [0, 1]]
            : [[-1, -1], [-1, 1], [1, -1], [1, 1], [-1, 0], [1, 0], [0, -1], [0, 1]];
          for (const [dr, dc] of dirs) {
            let nr = rr + dr, nc = cc + dc;
            while (inBounds(nr, nc)) {
              if (nr === r && nc === c) return true;
              if (b[nr][nc]) break;
              nr += dr; nc += dc;
            }
          }
        }
      }
    }
    return false;
  }

  function findKing(b, color) {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = b[r][c];
        if (p && p.type === 'k' && p.color === color) return [r, c];
      }
    }
    return null;
  }

  function applyMove(b, move, castleState) {
    const nb = cloneBoard(b);
    const piece = nb[move.from[0]][move.from[1]];
    const newCastle = { ...castleState };
    let newEp = null;

    if (move.enPassant) nb[move.from[0]][move.to[1]] = null;
    if (move.castle) {
      const row = move.from[0];
      if (move.castle === 'k') { nb[row][5] = nb[row][7]; nb[row][7] = null; }
      else { nb[row][3] = nb[row][0]; nb[row][0] = null; }
    }
    nb[move.to[0]][move.to[1]] = piece;
    nb[move.from[0]][move.from[1]] = null;

    if (move.promotion) nb[move.to[0]][move.to[1]] = { type: 'q', color: piece.color };
    if (move.doubleStep) newEp = { r: (move.from[0] + move.to[0]) / 2, c: move.from[1] };

    if (piece.type === 'k') {
      if (piece.color === 'w') { newCastle.wK = false; newCastle.wQ = false; }
      else { newCastle.bK = false; newCastle.bQ = false; }
    }
    if (piece.type === 'r') {
      if (move.from[0] === 7 && move.from[1] === 0) newCastle.wQ = false;
      if (move.from[0] === 7 && move.from[1] === 7) newCastle.wK = false;
      if (move.from[0] === 0 && move.from[1] === 0) newCastle.bQ = false;
      if (move.from[0] === 0 && move.from[1] === 7) newCastle.bK = false;
    }
    if (move.to[0] === 7 && move.to[1] === 0) newCastle.wQ = false;
    if (move.to[0] === 7 && move.to[1] === 7) newCastle.wK = false;
    if (move.to[0] === 0 && move.to[1] === 0) newCastle.bQ = false;
    if (move.to[0] === 0 && move.to[1] === 7) newCastle.bK = false;

    return { board: nb, castling: newCastle, enPassant: newEp };
  }

  function legalMoves(b, color, castleState, epState) {
    const all = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = b[r][c];
        if (!p || p.color !== color) continue;
        pseudoMoves(b, r, c, castleState, epState).forEach((m) => {
          if (m.castle) {
            const row = r;
            const passThrough = m.castle === 'k' ? [4, 5, 6] : [4, 3, 2];
            const enemy = color === 'w' ? 'b' : 'w';
            const safe = passThrough.every((cc) => !isAttacked(b, row, cc, enemy));
            if (!safe) return;
          }
          const result = applyMove(b, m, castleState);
          const kingPos = findKing(result.board, color);
          const enemy = color === 'w' ? 'b' : 'w';
          if (kingPos && !isAttacked(result.board, kingPos[0], kingPos[1], enemy)) all.push(m);
        });
      }
    }
    return all;
  }

  function evaluate(b) {
    let score = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = b[r][c];
        if (p) score += (p.color === 'w' ? 1 : -1) * VALUES[p.type];
      }
    }
    return score;
  }

  function aiMove() {
    const moves = legalMoves(board, 'b', castling, enPassant);
    if (!moves.length) return;
    let best = null, bestScore = Infinity;
    moves.forEach((m) => {
      const result = applyMove(board, m, castling);
      const responses = legalMoves(result.board, 'w', result.castling, result.enPassant);
      let worstForBlack;
      if (responses.length === 0) {
        const kingPos = findKing(result.board, 'w');
        const inCheck = kingPos && isAttacked(result.board, kingPos[0], kingPos[1], 'b');
        worstForBlack = inCheck ? -1000 : 0;
      } else {
        worstForBlack = -Infinity;
        responses.forEach((rm) => {
          const r2 = applyMove(result.board, rm, result.castling);
          const s = evaluate(r2.board);
          if (s > worstForBlack) worstForBlack = s;
        });
      }
      if (worstForBlack < bestScore) { bestScore = worstForBlack; best = m; }
    });
    if (best) doMove(best);
  }

  function doMove(move) {
    const result = applyMove(board, move, castling);
    board = result.board;
    castling = result.castling;
    enPassant = result.enPassant;
    turn = turn === 'w' ? 'b' : 'w';
    playSound(move.capture ? 'notify' : 'click');
    selected = null;
    legalTargets = [];
    render();
    checkGameEnd();
    if (!over && turn === 'b') setTimeout(aiMove, 400);
  }

  function checkGameEnd() {
    const moves = legalMoves(board, turn, castling, enPassant);
    const kingPos = findKing(board, turn);
    const enemy = turn === 'w' ? 'b' : 'w';
    const inCheck = kingPos && isAttacked(board, kingPos[0], kingPos[1], enemy);
    if (moves.length === 0) {
      over = true;
      statusEl.textContent = inCheck
        ? `Checkmate! ${turn === 'w' ? 'Black' : 'White'} wins.`
        : 'Stalemate — draw.';
      playSound(inCheck ? 'shutdown' : 'notify');
    } else if (inCheck) {
      statusEl.textContent = `${turn === 'w' ? 'White' : 'Black'} is in check.`;
    } else {
      statusEl.textContent = '';
    }
    turnEl.textContent = over ? 'Game over' : (turn === 'w' ? 'White to move' : 'Black to move (thinking…)');
  }

  function squareClick(r, c) {
    if (over || turn !== 'w') return;
    const piece = board[r][c];
    if (selected) {
      const move = legalTargets.find((m) => m.to[0] === r && m.to[1] === c);
      if (move) { doMove(move); return; }
      if (piece && piece.color === 'w') {
        selected = [r, c];
        legalTargets = legalMoves(board, 'w', castling, enPassant).filter((m) => m.from[0] === r && m.from[1] === c);
        render();
        return;
      }
      selected = null;
      legalTargets = [];
      render();
      return;
    }
    if (piece && piece.color === 'w') {
      selected = [r, c];
      legalTargets = legalMoves(board, 'w', castling, enPassant).filter((m) => m.from[0] === r && m.from[1] === c);
      render();
    }
  }

  function render() {
    boardEl.innerHTML = '';
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const sq = document.createElement('div');
        const light = (r + c) % 2 === 0;
        sq.style.cssText = `width:44px;height:44px;display:flex;align-items:center;justify-content:center;font-size:1.7rem;cursor:pointer;background:${light ? '#eeeed2' : '#769656'};position:relative;`;
        const piece = board[r][c];
        if (piece) sq.textContent = PIECE_GLYPHS[piece.color + piece.type];
        if (selected && selected[0] === r && selected[1] === c) sq.style.outline = '3px solid #0a3faa';
        if (legalTargets.some((m) => m.to[0] === r && m.to[1] === c)) {
          const dot = document.createElement('div');
          dot.style.cssText = 'position:absolute;width:14px;height:14px;border-radius:50%;background:rgba(10,63,170,.6);';
          sq.appendChild(dot);
        }
        sq.addEventListener('click', () => squareClick(r, c));
        boardEl.appendChild(sq);
      }
    }
    turnEl.textContent = over ? 'Game over' : (turn === 'w' ? 'White to move' : 'Black to move (thinking…)');
  }

  function reset() {
    initState();
    render();
    statusEl.textContent = '';
  }

  body.querySelector('#chess-reset').addEventListener('click', reset);
  reset();
}
GAMES.push({ icon: '&#9818;', title: 'Chess', launch: launchChess });

/* ══════════════ PINBALL ══════════════ */
function launchPinball() {
  const body = createGameWindow('game-pinball', '&#128377;&#65039;', 'Pinball', 340);
  if (body.dataset.mounted) return;
  body.dataset.mounted = '1';

  body.innerHTML = `
    <div class="game-toolbar">
      <span id="pb-score">Score: 0</span>
      <span id="pb-balls">Balls: 3</span>
      <button class="btn" id="pb-launch">Launch Ball</button>
    </div>
    <canvas id="pb-canvas" width="300" height="480" style="background:#111;border:2px solid #333;border-radius:4px;display:block;margin:0 auto"></canvas>
    <p class="game-status" id="pb-status">Use &larr;/A and &rarr;/D to flip. Click Launch to drop a ball.</p>
  `;
  const canvas = body.querySelector('#pb-canvas');
  const ctx = canvas.getContext('2d');
  const scoreEl = body.querySelector('#pb-score');
  const ballsEl = body.querySelector('#pb-balls');
  const statusEl = body.querySelector('#pb-status');
  const card = document.getElementById('game-pinball');

  const W = canvas.width, H = canvas.height;
  const GRAVITY = 0.32;
  const RESTITUTION = 0.72;

  const BUMPERS = [
    { x: 90, y: 140, r: 20 },
    { x: 210, y: 140, r: 20 },
    { x: 150, y: 210, r: 20 },
  ];

  const FLIPPER_LEN = 60;
  const leftFlipper = { pivot: { x: 95, y: 430 }, restAngle: 0.55, activeAngle: -0.55, angle: 0.55, active: false };
  const rightFlipper = { pivot: { x: 205, y: 430 }, restAngle: Math.PI - 0.55, activeAngle: Math.PI + 0.55, angle: Math.PI - 0.55, active: false };

  let ball = null;
  let score = 0, balls = 3, over = false;

  function resetGame() {
    score = 0; balls = 3; over = false;
    ball = null;
    scoreEl.textContent = 'Score: 0';
    ballsEl.textContent = 'Balls: 3';
    statusEl.textContent = 'Use ←/A and →/D to flip. Click Launch to drop a ball.';
  }

  function spawnBall() {
    if (ball || over) return;
    ball = { x: 270, y: 60, vx: -1.5, vy: 0, r: 8 };
  }

  function loseBall() {
    ball = null;
    balls--;
    ballsEl.textContent = 'Balls: ' + balls;
    if (balls <= 0) {
      over = true;
      statusEl.textContent = `Game over! Final score: ${score}`;
      playSound('shutdown');
    } else {
      statusEl.textContent = 'Ball lost. Click Launch for the next ball.';
      playSound('click');
    }
  }

  function addScore(n) {
    score += n;
    scoreEl.textContent = 'Score: ' + score;
  }

  function updateFlipper(fl) {
    const target = fl.active ? fl.activeAngle : fl.restAngle;
    fl.angle += (target - fl.angle) * 0.4;
  }

  function flipperTip(fl) {
    return { x: fl.pivot.x + Math.cos(fl.angle) * FLIPPER_LEN, y: fl.pivot.y + Math.sin(fl.angle) * FLIPPER_LEN };
  }

  function closestPointOnSegment(p, a, b) {
    const abx = b.x - a.x, aby = b.y - a.y;
    const denom = abx * abx + aby * aby || 1;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * abx + (p.y - a.y) * aby) / denom));
    return { x: a.x + abx * t, y: a.y + aby * t };
  }

  function collideFlipper(fl) {
    const tip = flipperTip(fl);
    const closest = closestPointOnSegment(ball, fl.pivot, tip);
    const dx = ball.x - closest.x, dy = ball.y - closest.y;
    const dist = Math.hypot(dx, dy);
    const minDist = ball.r + 6;
    if (dist < minDist && dist > 0) {
      const nx = dx / dist, ny = dy / dist;
      ball.x = closest.x + nx * minDist;
      ball.y = closest.y + ny * minDist;
      const speed = Math.hypot(ball.vx, ball.vy);
      const kick = fl.active ? 9 : 2;
      ball.vx = nx * (speed * RESTITUTION + kick);
      ball.vy = ny * (speed * RESTITUTION + kick) - 2;
    }
  }

  function step() {
    const hidden = card.classList.contains('wm-closed');
    if (!hidden) {
      if (!over && ball) {
        ball.vy += GRAVITY;
        ball.x += ball.vx;
        ball.y += ball.vy;

        if (ball.x - ball.r < 12) { ball.x = 12 + ball.r; ball.vx *= -RESTITUTION; }
        if (ball.x + ball.r > W - 12) { ball.x = W - 12 - ball.r; ball.vx *= -RESTITUTION; }
        if (ball.y - ball.r < 12) { ball.y = 12 + ball.r; ball.vy *= -RESTITUTION; }

        BUMPERS.forEach((bp) => {
          const dx = ball.x - bp.x, dy = ball.y - bp.y;
          const dist = Math.hypot(dx, dy);
          const minDist = ball.r + bp.r;
          if (dist < minDist && dist > 0) {
            const nx = dx / dist, ny = dy / dist;
            ball.x = bp.x + nx * minDist;
            ball.y = bp.y + ny * minDist;
            const speed = Math.hypot(ball.vx, ball.vy) || 3;
            ball.vx = nx * (speed + 3);
            ball.vy = ny * (speed + 3);
            addScore(100);
            playSound('click');
          }
        });

        updateFlipper(leftFlipper);
        updateFlipper(rightFlipper);
        collideFlipper(leftFlipper);
        collideFlipper(rightFlipper);

        if (ball.y - ball.r > H) loseBall();
      } else {
        updateFlipper(leftFlipper);
        updateFlipper(rightFlipper);
      }
      render();
    }
    requestAnimationFrame(step);
  }

  function drawFlipper(fl) {
    const tip = flipperTip(fl);
    ctx.strokeStyle = '#3d94f6';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(fl.pivot.x, fl.pivot.y);
    ctx.lineTo(tip.x, tip.y);
    ctx.stroke();
  }

  function render() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0b0b1a';
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = '#555';
    ctx.lineWidth = 4;
    ctx.strokeRect(8, 8, W - 16, H - 16);

    BUMPERS.forEach((bp) => {
      ctx.beginPath();
      ctx.arc(bp.x, bp.y, bp.r, 0, Math.PI * 2);
      ctx.fillStyle = '#e23c2b';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.stroke();
    });

    drawFlipper(leftFlipper);
    drawFlipper(rightFlipper);

    if (ball) {
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
      ctx.fillStyle = '#fefefe';
      ctx.fill();
    }
  }

  function keydown(e) {
    if (card.classList.contains('wm-closed')) return;
    const key = e.key.toLowerCase();
    if (e.key === 'ArrowLeft' || key === 'a') { leftFlipper.active = true; e.preventDefault(); }
    if (e.key === 'ArrowRight' || key === 'd') { rightFlipper.active = true; e.preventDefault(); }
  }
  function keyup(e) {
    const key = e.key.toLowerCase();
    if (e.key === 'ArrowLeft' || key === 'a') leftFlipper.active = false;
    if (e.key === 'ArrowRight' || key === 'd') rightFlipper.active = false;
  }
  document.addEventListener('keydown', keydown);
  document.addEventListener('keyup', keyup);

  body.querySelector('#pb-launch').addEventListener('click', () => {
    if (over) resetGame();
    spawnBall();
  });

  resetGame();
  render();
  requestAnimationFrame(step);
}
GAMES.push({ icon: '&#128377;&#65039;', title: 'Pinball', launch: launchPinball });
