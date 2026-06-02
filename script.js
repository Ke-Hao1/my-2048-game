const board = document.getElementById("board");
const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");

const newGameBtn = document.getElementById("newGameBtn");
const undoBtn = document.getElementById("undoBtn");
const reviveBtn = document.getElementById("reviveBtn");

const message = document.getElementById("message");
const messageTitle = document.getElementById("messageTitle");
const messageText = document.getElementById("messageText");

const SIZE = 4;
const MOVE_TIME = 170;

let gridCells = null;
let tileLayer = null;

let tiles = [];
let tileElements = new Map();

let score = 0;
let best = Number(localStorage.getItem("best2048")) || 0;
let history = [];
let nextTileId = 1;
let gameOver = false;
let isAnimating = false;

let metrics = {
  padding: 12,
  gap: 12,
  tileSize: 90
};

let drag = {
  active: false,
  startX: 0,
  startY: 0,
  offsetX: 0,
  offsetY: 0,
  pointerId: null
};

function setupBoard() {
  board.innerHTML = "";

  gridCells = document.createElement("div");
  gridCells.className = "grid-cells";

  for (let i = 0; i < SIZE * SIZE; i++) {
    const cell = document.createElement("div");
    cell.className = "grid-cell";
    gridCells.appendChild(cell);
  }

  tileLayer = document.createElement("div");
  tileLayer.className = "tile-layer";

  board.appendChild(gridCells);
  board.appendChild(tileLayer);

  updateBoardMetrics();

  if ("ResizeObserver" in window) {
    const resizeObserver = new ResizeObserver(() => {
      updateBoardMetrics();
      applyTilePositions();
    });

    resizeObserver.observe(board);
  } else {
    window.addEventListener("resize", () => {
      updateBoardMetrics();
      applyTilePositions();
    });
  }
}

function updateBoardMetrics() {
  const style = getComputedStyle(board);

  metrics.padding = parseFloat(style.getPropertyValue("--board-padding")) || 12;
  metrics.gap = parseFloat(style.getPropertyValue("--gap")) || 12;

  const boardWidth = board.clientWidth;
  const innerWidth = boardWidth - metrics.padding * 2;

  metrics.tileSize = (innerWidth - metrics.gap * 3) / 4;

  board.style.setProperty("--tile-size", `${metrics.tileSize}px`);
}

function cloneTiles(sourceTiles = tiles) {
  return sourceTiles.map(tile => ({
    id: tile.id,
    value: tile.value,
    row: tile.row,
    col: tile.col
  }));
}

function createTile(value, row, col) {
  const tile = {
    id: nextTileId,
    value,
    row,
    col
  };

  nextTileId++;
  tiles.push(tile);

  return tile.id;
}

function getEmptyCells() {
  const occupied = new Set();

  tiles.forEach(tile => {
    occupied.add(`${tile.row},${tile.col}`);
  });

  const emptyCells = [];

  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      if (!occupied.has(`${row},${col}`)) {
        emptyCells.push({ row, col });
      }
    }
  }

  return emptyCells;
}

function addRandomTile() {
  const emptyCells = getEmptyCells();

  if (emptyCells.length === 0) {
    return null;
  }

  const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
  const value = Math.random() < 0.9 ? 2 : 4;

  return createTile(value, randomCell.row, randomCell.col);
}

function startNewGame() {
  tiles = [];
  tileElements.forEach(element => element.remove());
  tileElements.clear();

  score = 0;
  history = [];
  nextTileId = 1;
  gameOver = false;
  isAnimating = false;

  const firstId = addRandomTile();
  const secondId = addRandomTile();

  renderTiles({
    newTileIds: [firstId, secondId].filter(Boolean)
  });
}

function createTileElement(tile) {
  const tileElement = document.createElement("div");
  tileElement.className = "tile";

  const inner = document.createElement("div");
  inner.className = "tile-inner";

  tileElement.appendChild(inner);
  tileLayer.appendChild(tileElement);

  tileElements.set(tile.id, tileElement);

  return tileElement;
}

function getTileClass(value) {
  if (value <= 2048) {
    return `tile-${value}`;
  }

  return "tile-super";
}

function getFontClass(value) {
  if (value >= 10000) {
    return "tile-huge";
  }

  if (value >= 1024) {
    return "tile-big";
  }

  return "";
}

function setElementPosition(element, row, col, offsetX = 0, offsetY = 0) {
  const x = col * (metrics.tileSize + metrics.gap) + offsetX;
  const y = row * (metrics.tileSize + metrics.gap) + offsetY;

  element.style.transform = `translate(${x}px, ${y}px)`;
}

function applyTilePositions() {
  updateBoardMetrics();

  tiles.forEach(tile => {
    const element = tileElements.get(tile.id);

    if (!element) return;

    setElementPosition(
      element,
      tile.row,
      tile.col,
      drag.offsetX,
      drag.offsetY
    );
  });
}

function renderTiles(options = {}) {
  const newTileIds = new Set(options.newTileIds || []);
  const mergedTileIds = new Set(options.mergedTileIds || []);

  updateBoardMetrics();

  const currentIds = new Set(tiles.map(tile => tile.id));

  tileElements.forEach((element, id) => {
    if (!currentIds.has(id)) {
      element.remove();
      tileElements.delete(id);
    }
  });

  tiles.forEach(tile => {
    let element = tileElements.get(tile.id);

    if (!element) {
      element = createTileElement(tile);
    }

    const inner = element.querySelector(".tile-inner");

    inner.textContent = tile.value;

    const fontClass = getFontClass(tile.value);

    element.className = "tile";
    element.classList.add(getTileClass(tile.value));

    if (fontClass) {
      element.classList.add(fontClass);
    }

    if (newTileIds.has(tile.id)) {
      element.classList.add("tile-new");

      setTimeout(() => {
        element.classList.remove("tile-new");
      }, 180);
    }

    if (mergedTileIds.has(tile.id)) {
      element.classList.add("tile-merged");

      setTimeout(() => {
        element.classList.remove("tile-merged");
      }, 180);
    }

    setElementPosition(
      element,
      tile.row,
      tile.col,
      drag.offsetX,
      drag.offsetY
    );
  });

  updateUI();
}

function updateUI() {
  scoreEl.textContent = score;

  if (score > best) {
    best = score;
    localStorage.setItem("best2048", best);
  }

  bestEl.textContent = best;

  undoBtn.disabled = history.length === 0 || isAnimating;
  reviveBtn.disabled = history.length === 0 || isAnimating;

  if (gameOver) {
    message.classList.remove("hidden");
    messageTitle.textContent = "游戏结束";
    messageText.textContent = "点击“失败复活”，可以回到上一步。";
  } else {
    message.classList.add("hidden");
  }
}

function buildGrid(sourceTiles = tiles) {
  const grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));

  sourceTiles.forEach(tile => {
    grid[tile.row][tile.col] = tile;
  });

  return grid;
}

function getLineTiles(sourceTiles, direction, index) {
  if (direction === "left") {
    return sourceTiles
      .filter(tile => tile.row === index)
      .sort((a, b) => a.col - b.col);
  }

  if (direction === "right") {
    return sourceTiles
      .filter(tile => tile.row === index)
      .sort((a, b) => b.col - a.col);
  }

  if (direction === "up") {
    return sourceTiles
      .filter(tile => tile.col === index)
      .sort((a, b) => a.row - b.row);
  }

  return sourceTiles
    .filter(tile => tile.col === index)
    .sort((a, b) => b.row - a.row);
}

function getLinePositions(direction, index) {
  const positions = [];

  if (direction === "left") {
    for (let col = 0; col < SIZE; col++) {
      positions.push({ row: index, col });
    }
  }

  if (direction === "right") {
    for (let col = SIZE - 1; col >= 0; col--) {
      positions.push({ row: index, col });
    }
  }

  if (direction === "up") {
    for (let row = 0; row < SIZE; row++) {
      positions.push({ row, col: index });
    }
  }

  if (direction === "down") {
    for (let row = SIZE - 1; row >= 0; row--) {
      positions.push({ row, col: index });
    }
  }

  return positions;
}

function calculateMove(direction) {
  const sourceTiles = cloneTiles();
  const survivors = [];
  const removedIds = new Set();
  const mergedTileIds = new Set();
  const animationTargets = new Map();

  let scoreGain = 0;

  for (let lineIndex = 0; lineIndex < SIZE; lineIndex++) {
    const lineTiles = getLineTiles(sourceTiles, direction, lineIndex);
    const positions = getLinePositions(direction, lineIndex);

    const resultLine = [];

    lineTiles.forEach(tile => {
      const previous = resultLine[resultLine.length - 1];

      if (
        previous &&
        !previous.hasMerged &&
        previous.value === tile.value
      ) {
        previous.value *= 2;
        previous.hasMerged = true;

        scoreGain += previous.value;

        animationTargets.set(tile.id, {
          row: previous.row,
          col: previous.col
        });

        removedIds.add(tile.id);
        mergedTileIds.add(previous.id);
      } else {
        const target = positions[resultLine.length];

        const movedTile = {
          id: tile.id,
          value: tile.value,
          row: target.row,
          col: target.col,
          hasMerged: false
        };

        resultLine.push(movedTile);

        animationTargets.set(tile.id, {
          row: target.row,
          col: target.col
        });
      }
    });

    resultLine.forEach(tile => {
      survivors.push({
        id: tile.id,
        value: tile.value,
        row: tile.row,
        col: tile.col
      });
    });
  }

  let moved = false;

  sourceTiles.forEach(tile => {
    const target = animationTargets.get(tile.id);

    if (!target) return;

    if (removedIds.has(tile.id)) {
      moved = true;
      return;
    }

    if (tile.row !== target.row || tile.col !== target.col) {
      moved = true;
    }
  });

  return {
    moved,
    survivors,
    removedIds,
    mergedTileIds,
    animationTargets,
    scoreGain
  };
}

function move(direction) {
  if (isAnimating || gameOver) {
    return;
  }

  const oldTiles = cloneTiles();
  const oldScore = score;
  const oldNextTileId = nextTileId;

  const result = calculateMove(direction);

  if (!result.moved) {
    snapBackDrag();
    return;
  }

  history.push({
    tiles: oldTiles,
    score: oldScore,
    nextTileId: oldNextTileId
  });

  isAnimating = true;
  score += result.scoreGain;
  updateUI();

  drag.offsetX = 0;
  drag.offsetY = 0;

  result.animationTargets.forEach((target, id) => {
    const element = tileElements.get(id);

    if (!element) return;

    setElementPosition(element, target.row, target.col);
  });

  setTimeout(() => {
    result.removedIds.forEach(id => {
      const element = tileElements.get(id);

      if (element) {
        element.remove();
      }

      tileElements.delete(id);
    });

    tiles = result.survivors;

    const newTileId = addRandomTile();

    gameOver = isGameOver();
    isAnimating = false;

    renderTiles({
      newTileIds: newTileId ? [newTileId] : [],
      mergedTileIds: Array.from(result.mergedTileIds)
    });
  }, MOVE_TIME + 20);
}

function undo() {
  if (history.length === 0 || isAnimating) {
    return;
  }

  const previousState = history.pop();

  tiles = cloneTiles(previousState.tiles);
  score = previousState.score;
  nextTileId = previousState.nextTileId;
  gameOver = false;

  drag.offsetX = 0;
  drag.offsetY = 0;

  renderTiles();
}

function revive() {
  undo();
}

function isGameOver() {
  if (tiles.length < SIZE * SIZE) {
    return false;
  }

  const grid = buildGrid();

  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      const current = grid[row][col];

      if (!current) {
        return false;
      }

      const right = col < SIZE - 1 ? grid[row][col + 1] : null;
      const down = row < SIZE - 1 ? grid[row + 1][col] : null;

      if (right && current.value === right.value) {
        return false;
      }

      if (down && current.value === down.value) {
        return false;
      }
    }
  }

  return true;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function snapBackDrag() {
  board.classList.remove("dragging");

  drag.offsetX = 0;
  drag.offsetY = 0;

  applyTilePositions();
}

function getDirectionFromDelta(dx, dy) {
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? "right" : "left";
  }

  return dy > 0 ? "down" : "up";
}

board.addEventListener("pointerdown", event => {
  if (isAnimating || gameOver) {
    return;
  }

  drag.active = true;
  drag.startX = event.clientX;
  drag.startY = event.clientY;
  drag.offsetX = 0;
  drag.offsetY = 0;
  drag.pointerId = event.pointerId;

  board.classList.add("dragging");

  if (board.setPointerCapture) {
    board.setPointerCapture(event.pointerId);
  }
});

board.addEventListener("pointermove", event => {
  if (!drag.active || isAnimating || gameOver) {
    return;
  }

  event.preventDefault();

  const dx = event.clientX - drag.startX;
  const dy = event.clientY - drag.startY;

  const limit = Math.min(metrics.tileSize * 0.55, 52);

  if (Math.abs(dx) > Math.abs(dy)) {
    drag.offsetX = clamp(dx * 0.42, -limit, limit);
    drag.offsetY = 0;
  } else {
    drag.offsetX = 0;
    drag.offsetY = clamp(dy * 0.42, -limit, limit);
  }

  applyTilePositions();
});

board.addEventListener("pointerup", event => {
  if (!drag.active) {
    return;
  }

  const dx = event.clientX - drag.startX;
  const dy = event.clientY - drag.startY;

  drag.active = false;

  if (board.releasePointerCapture && drag.pointerId !== null) {
    board.releasePointerCapture(drag.pointerId);
  }

  board.classList.remove("dragging");

  const threshold = Math.max(28, metrics.tileSize * 0.18);

  if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) {
    snapBackDrag();
    return;
  }

  const direction = getDirectionFromDelta(dx, dy);

  move(direction);
});

board.addEventListener("pointercancel", () => {
  drag.active = false;
  snapBackDrag();
});

document.addEventListener("keydown", event => {
  if (
    event.key === "ArrowLeft" ||
    event.key === "ArrowRight" ||
    event.key === "ArrowUp" ||
    event.key === "ArrowDown"
  ) {
    event.preventDefault();
  }

  if (event.key === "ArrowLeft") {
    move("left");
  }

  if (event.key === "ArrowRight") {
    move("right");
  }

  if (event.key === "ArrowUp") {
    move("up");
  }

  if (event.key === "ArrowDown") {
    move("down");
  }

  if (event.key.toLowerCase() === "u") {
    undo();
  }
});

newGameBtn.addEventListener("click", () => {
  startNewGame();
});

undoBtn.addEventListener("click", () => {
  undo();
});

reviveBtn.addEventListener("click", () => {
  revive();
});

setupBoard();
startNewGame();