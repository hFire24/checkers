const boardElement = document.getElementById('board');
const logBox = document.getElementById('logBox');

const tileSize = 8;
let board = [];
let pieceNames = {};
let currentPlayer = 'maid';
let selectedPiece = null;
let forcedPiece = null;

const maidNames = [
  { name: "Fleur", emoji: "🇫🇷" },
  { name: "Sakura", emoji: "🇯🇵" },
  { name: "Isabella", emoji: "🇮🇹" },
  { name: "Pandora", emoji: "🇪🇬" },
  { name: "Yumi", emoji: "🇰🇷" },
  { name: "Anastasia", emoji: "🇷🇺" },
  { name: "Camila", emoji: "🇧🇷" },
  { name: "Greta", emoji: "🇩🇪" },
  { name: "Charlotte", emoji: "🇬🇧" },
  { name: "Zhen", emoji: "🇨🇳" },
  { name: "Elena", emoji: "🇪🇸" },
  { name: "Tina", emoji: "🇺🇸" }
];

const eurovisionNames = [
  { name: "Runa the Witch", emoji: "🌕" },
  { name: "Alexander Rybak", emoji: "🇳🇴" },
  { name: "Lena", emoji: "🇩🇪" },
  { name: "Verka Serduchka", emoji: "🇺🇦" },
  { name: "Käärijä", emoji: "🇫🇮" },
  { name: "Joost Klein", emoji: "🇳🇱" },
  { name: "Jedward A", emoji: "🇮🇪" },
  { name: "Jedward B", emoji: "🇮🇪" },
  { name: "Loreen", emoji: "🇸🇪" },
  { name: "Silvia Night", emoji: "🇮🇸" },
  { name: "Sam Ryder", emoji: "🇬🇧" },
  { name: "Epic Sax Guy", emoji: "🇲🇩" }
];


function logEvent(message) {
  const entry = document.createElement('div');
  entry.textContent = message;
  logBox.appendChild(entry);
  logBox.scrollTop = logBox.scrollHeight;
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function initBoard() {
  board = [];
  boardElement.innerHTML = '';
  pieceNames = {};
  shuffle(maidNames);
  shuffle(eurovisionNames);
  let maidIndex = 0;
  let euroIndex = 0;

  for (let y = 0; y < tileSize; y++) {
    let row = [];
    for (let x = 0; x < tileSize; x++) {
      const cell = document.createElement('div');
      cell.classList.add('cell');
      const dark = (x + y) % 2 === 1;
      cell.classList.add(dark ? 'dark' : 'light');
      cell.dataset.x = x;
      cell.dataset.y = y;
      cell.addEventListener('dragover', (e) => e.preventDefault());
      cell.addEventListener('drop', () => handleDrop(x, y));
      boardElement.appendChild(cell);

      let piece = null;
      if (dark && y > 4) {
        const maidData = maidNames[maidIndex++ % maidNames.length];
        piece = createPiece('maid', maidData);
        cell.appendChild(piece);
        pieceNames[`${x},${y}`] = piece.title;
      } else if (dark && y < 3) {
        const euroData = eurovisionNames[euroIndex++ % eurovisionNames.length];
        piece = createPiece('eurovision', euroData);
        cell.appendChild(piece);
        pieceNames[`${x},${y}`] = piece.title;
      }

      row.push(piece ? { player: piece.dataset.player, king: false } : null);
    }
    board.push(row);
  }
}

function createPiece(player, info) {
  const div = document.createElement('div');
  div.classList.add('piece', player);
  div.textContent = info.emoji;
  div.title = info.name + " " + info.emoji;
  div.dataset.player = player;
  div.setAttribute('draggable', true);
  div.addEventListener('dragstart', (e) => handleDragStart(e, div));
  // ✨ Touch support
  div.addEventListener('touchstart', (e) => {
    const touch = e.touches[0];
    div.dataset.touchStartX = touch.clientX;
    div.dataset.touchStartY = touch.clientY;
    div.classList.add('dragging');
    preventTouchScroll(true);
  }, { passive: true });  

  div.addEventListener('touchend', (e) => {
    div.classList.remove('dragging');
    preventTouchScroll(false);
    const touch = e.changedTouches[0];
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    if (target && target.classList.contains('cell')) {
      const fromX = div.parentElement.dataset.x;
      const fromY = div.parentElement.dataset.y;
      const toX = target.dataset.x;
      const toY = target.dataset.y;
      tryMove(+fromX, +fromY, +toX, +toY);
    }
  });
  return div;
}

function handleDragStart(e, piece) {
  const cell = piece.parentElement;
  const fromX = cell.dataset.x;
  const fromY = cell.dataset.y;
  if (piece.dataset.player !== currentPlayer) {
    e.preventDefault();
    return;
  }
  if (forcedPiece && piece !== forcedPiece) {
    e.preventDefault();
    return;
  }
  e.dataTransfer.setData('text/plain', `${fromX},${fromY}`);
}

function handleDrop(toX, toY) {
  const data = event.dataTransfer.getData('text/plain');
  const [fromX, fromY] = data.split(',').map(Number);
  tryMove(fromX, fromY, toX, toY);
}

function getFlag(name) {
  const match = name.match(/\p{Extended_Pictographic}/gu);
  return match ? match[match.length - 1] : '❓';
}

function tryMove(fromX, fromY, toX, toY) {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const piece = board[fromY][fromX];
  const validDirection = piece.king || (piece.player === 'maid' && dy === -1) || (piece.player === 'eurovision' && dy === 1);

  const destCell = document.querySelector(`.cell[data-x='${toX}'][data-y='${toY}']`);
  if (!destCell || destCell.children.length > 0) return;

  if (Math.abs(dx) === 1 && Math.abs(dy) === 1 && validDirection && !forcedPiece) {
    movePiece(fromX, fromY, toX, toY);
    switchPlayer();
  } else if (Math.abs(dx) === 2 && Math.abs(dy) === 2) {
    const midX = fromX + dx / 2;
    const midY = fromY + dy / 2;
    const midPiece = board[midY][midX];
    if (midPiece && midPiece.player !== currentPlayer) {
      board[midY][midX] = null;
      const midCell = document.querySelector(`.cell[data-x='${midX}'][data-y='${midY}']`);
      midCell.innerHTML = '';
      logEvent(`${pieceNames[`${fromX},${fromY}`]} took down ${pieceNames[`${midX},${midY}`]}!`);
      delete pieceNames[`${midX},${midY}`];
      movePiece(fromX, fromY, toX, toY);

      if (!maybeKing(toX, toY) && hasAnotherJump(toX, toY)) {
        forcedPiece = document.querySelector(`.cell[data-x='${toX}'][data-y='${toY}'] .piece`);
        return;
      }
      forcedPiece = null;
      switchPlayer();
    }
  }
}

function hasAnotherJump(x, y) {
  const piece = board[y][x];
  const directions = [
    [-2, -2], [2, -2],
    [-2, 2], [2, 2]
  ];
  for (const [dx, dy] of directions) {
    const midX = x + dx / 2;
    const midY = y + dy / 2;
    const destX = x + dx;
    const destY = y + dy;
    if (
      destX >= 0 && destX < tileSize &&
      destY >= 0 && destY < tileSize &&
      board[destY][destX] === null &&
      board[midY] && board[midY][midX] &&
      board[midY][midX].player !== piece.player &&
      (piece.king || (piece.player === 'maid' && dy < 0) || (piece.player === 'eurovision' && dy > 0))
    ) {
      return true;
    }
  }
  return false;
}

function movePiece(fromX, fromY, toX, toY) {
  const piece = board[fromY][fromX];
  const pieceDiv = document.querySelector(`.cell[data-x='${fromX}'][data-y='${fromY}'] .piece`);
  const toCell = document.querySelector(`.cell[data-x='${toX}'][data-y='${toY}']`);

  board[toY][toX] = piece;
  board[fromY][fromX] = null;
  toCell.appendChild(pieceDiv);
  pieceNames[`${toX},${toY}`] = pieceNames[`${fromX},${fromY}`];
  delete pieceNames[`${fromX},${fromY}`];
  maybeKing(toX, toY);
}

function maybeKing(x, y) {
  const piece = board[y][x];
  const shouldCrown = (piece.player === 'maid' && y === 0) || (piece.player === 'eurovision' && y === tileSize - 1);
  if (!piece.king && shouldCrown) {
    piece.king = true;
    const pieceDiv = document.querySelector(`.cell[data-x='${x}'][data-y='${y}'] .piece`);
    pieceDiv.classList.add('king');
    logEvent(`${pieceNames[`${x},${y}`]} got crowned!`);
    return true;
  }
  return false;
}

function switchPlayer() {
  currentPlayer = currentPlayer === 'maid' ? 'eurovision' : 'maid';
  logEvent(`Current turn: ${currentPlayer.toUpperCase()}`);
}

function preventTouchScroll(enabled) {
  if (enabled) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
}

initBoard();
logEvent(`Current turn: ${currentPlayer.toUpperCase()}`);
document.getElementById('resetButton').addEventListener('click', () => {
  initBoard();
  currentPlayer = 'maid';
  logEvent(`Game reset. Current turn: ${currentPlayer.toUpperCase()}`);
});
