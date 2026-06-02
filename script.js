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
const MOVE_TIME = 95;

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
  pointerId: null,
  direction: null
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

function getCellPixelPosition(row, col) {
  const step = metrics.tileSize + metrics.gap;

  return {
    x: col * step,
    y: row * step
  };
}

function setElementPixelPosition(element, x, y) {
  element.style.transform = `translate(${x}px, ${y}px)`;
}

function setElementPosition(element, row, col) {
  const position = getCellPixelPosition(row, col);
  setElementPixelPosition(element, position.x, position.y);
}

function applyTilePositions() {
  updateBoardMetrics();

  tiles.forEach(tile => {
    const element = tileElements.get(tile.id);

    if (!element) return;

    setElementPosition(element, tile.row, tile.col);
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

    setElementPosition(element, tile.row, tile.col);
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

  /*
    重点修改：
    按钮不再因为 isAnimating 反复 disabled / enabled。
    这样手机滑动时，“回到上一步”和“失败复活”不会闪烁。
  */
  undoBtn.disabled = history.length === 0;
  reviveBtn.disabled = history.length === 0;

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
  applyTilePositions();
}

function getDirectionFromDelta(dx, dy) {
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? "right" : "left";
  }

  return dy > 0 ? "down" : "up";
}

function showDragPreview(dx, dy) {
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);

  if (absX < 8 && absY < 8) {
    applyTilePositions();
    return;
  }

  const direction = getDirectionFromDelta(dx, dy);
  const result = calculateMove(direction);

  if (!result.moved) {
    applyTilePositions();
    return;
  }

  const dragDistance = direction === "left" || direction === "right"
    ? Math.abs(dx)
    : Math.abs(dy);

  const step = metrics.tileSize + metrics.gap;

  /*
    重点修改：
    手机端预览幅度变小。
    最多只预览 0.38 个格子的距离。
    不会像上一版那样整体偏移过大。
  */
  const maxPreviewPixels = step * 0.38;
  const previewPixels = clamp(dragDistance * 0.32, 0, maxPreviewPixels);

  tiles.forEach(tile => {
    const element = tileElements.get(tile.id);

    if (!element) return;

    const target = result.animationTargets.get(tile.id);

    if (!target) {
      setElementPosition(element, tile.row, tile.col);
      return;
    }

    const start = getCellPixelPosition(tile.row, tile.col);
    const end = getCellPixelPosition(target.row, target.col);

    const totalX = end.x - start.x;
    const totalY = end.y - start.y;

    /*
      重点修改：
      如果这个数字实际不会移动，就保持原位。
      例如右滑时已经在最右边的数字不会再跟着手指晃动。
    */
    if (totalX === 0 && totalY === 0) {
      setElementPixelPosition(element, start.x, start.y);
      return;
    }

    const totalDistance = Math.sqrt(totalX * totalX + totalY * totalY);
    const realPreviewDistance = Math.min(previewPixels, totalDistance);
    const progress = totalDistance === 0 ? 0 : realPreviewDistance / totalDistance;

    const x = start.x + totalX * progress;
    const y = start.y + totalY * progress;

    /*
      重点修改：
      位置始终在起点格子和目标格子之间。
      不会超过目标格子，也不会被拖出 4×4 大棋盘。
    */
    setElementPixelPosition(element, x, y);
  });
}

board.addEventListener("pointerdown", event => {
  if (isAnimating || gameOver) {
    return;
  }

  drag.active = true;
  drag.startX = event.clientX;
  drag.startY = event.clientY;
  drag.pointerId = event.pointerId;
  drag.direction = null;

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

  showDragPreview(dx, dy);
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

  const threshold = Math.max(24, metrics.tileSize * 0.15);

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