/** Codegrid ASCII image reveal — canvas helpers for calendar cells. */

export const ASCII_CHARS = "........:::=+xX#0369";
export const FONT_SIZE = 12;
export const ASPECT_WIDTH = 4;
export const ASPECT_HEIGHT = 5;
export const ASCII_COLUMNS = 22;
export const CELL_APPEAR_MS = 2;
export const SCRAMBLE_COUNT = 8;
export const SCRAMBLE_SPEED_MS = 90;
export const CROSSFADE_MS = 500;
export const INK = "#111111";
export const PAPER = "#f7f4ee";

const DENSE_CHAR_INDEX = ASCII_CHARS.lastIndexOf(".");
const DENSE_CHARS = ASCII_CHARS.slice(DENSE_CHAR_INDEX + 1).split("");

let charWidth = 7;
let charHeight = FONT_SIZE;
let ASCII_ROWS = 18;

if (typeof document !== "undefined") {
  const mCtx = document.createElement("canvas").getContext("2d");
  if (mCtx) {
    mCtx.font = `${FONT_SIZE}px monospace`;
    charWidth = Math.ceil(mCtx.measureText("M").width);
    charHeight = FONT_SIZE;
    ASCII_ROWS = Math.round(
      ASCII_COLUMNS * (ASPECT_HEIGHT / ASPECT_WIDTH) * (charWidth / charHeight),
    );
  }
}

export interface AsciiGridResult {
  asciiGrid: string[][];
  brightnessGrid: number[][];
}

export function imageToAsciiGrid(img: HTMLImageElement): AsciiGridResult {
  const imageAspect = img.naturalWidth / img.naturalHeight;
  const itemAspect = ASPECT_WIDTH / ASPECT_HEIGHT;
  let cropX = 0,
    cropY = 0,
    cropW = img.naturalWidth,
    cropH = img.naturalHeight;

  if (imageAspect > itemAspect) {
    cropW = img.naturalHeight * itemAspect;
    cropX = (img.naturalWidth - cropW) / 2;
  } else {
    cropH = img.naturalWidth / itemAspect;
    cropY = (img.naturalHeight - cropH) / 2;
  }

  const samplingCanvas = document.createElement("canvas");
  samplingCanvas.width = ASCII_COLUMNS;
  samplingCanvas.height = ASCII_ROWS;
  const sCtx = samplingCanvas.getContext("2d");
  if (!sCtx) return { asciiGrid: [], brightnessGrid: [] };

  sCtx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, ASCII_COLUMNS, ASCII_ROWS);

  const { data } = sCtx.getImageData(0, 0, ASCII_COLUMNS, ASCII_ROWS);
  const asciiGrid: string[][] = [];
  const brightnessGrid: number[][] = [];

  for (let row = 0; row < ASCII_ROWS; row++) {
    const asciiRow: string[] = [];
    const brightnessRow: number[] = [];
    for (let col = 0; col < ASCII_COLUMNS; col++) {
      const px = (row * ASCII_COLUMNS + col) * 4;
      const brightness =
        (data[px] * 0.299 + data[px + 1] * 0.587 + data[px + 2] * 0.114) / 255;
      const charIndex = Math.min(
        ASCII_CHARS.length - 1,
        Math.floor((1 - brightness) * ASCII_CHARS.length),
      );
      asciiRow.push(ASCII_CHARS[charIndex]);
      brightnessRow.push(charIndex);
    }
    asciiGrid.push(asciiRow);
    brightnessGrid.push(brightnessRow);
  }

  return { asciiGrid, brightnessGrid };
}

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function prepareAsciiCanvas(canvas: HTMLCanvasElement) {
  const dpr = 2;
  canvas.width = ASCII_COLUMNS * charWidth * dpr;
  canvas.height = ASCII_ROWS * charHeight * dpr;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function drawCharacter(
  ctx: CanvasRenderingContext2D,
  col: number,
  row: number,
  char: string,
) {
  ctx.clearRect(col * charWidth, row * charHeight, charWidth, charHeight);
  ctx.fillStyle = PAPER;
  ctx.fillRect(col * charWidth, row * charHeight, charWidth, charHeight);
  ctx.fillStyle = INK;
  ctx.fillText(char, col * charWidth, row * charHeight);
}

export type AsciiCleanupBag = {
  timeouts: ReturnType<typeof setTimeout>[];
  intervals: ReturnType<typeof setInterval>[];
};

export function runAsciiReveal(
  canvas: HTMLCanvasElement,
  imgEl: HTMLImageElement,
  asciiGrid: string[][],
  brightnessGrid: number[][],
  cleanupBag: AsciiCleanupBag,
) {
  const dpr = 2;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.font = `${charHeight}px monospace`;
  ctx.textBaseline = "top";

  const totalCells = ASCII_COLUMNS * ASCII_ROWS;
  const scrambleState = new Array<number | null>(totalCells).fill(null);
  let settledCount = 0;
  const cellOrder = shuffleArray(Array.from({ length: totalCells }, (_, i) => i));

  function revealImage() {
    canvas.style.transition = `opacity ${CROSSFADE_MS}ms ease`;
    canvas.style.opacity = "0";
    imgEl.style.transition = `opacity ${CROSSFADE_MS}ms ease`;
    imgEl.style.opacity = "1";
  }

  cellOrder.forEach((cellIndex, i) => {
    const tid = setTimeout(() => {
      const row = Math.floor(cellIndex / ASCII_COLUMNS);
      const col = cellIndex % ASCII_COLUMNS;
      const isDark = brightnessGrid[row][col] > DENSE_CHAR_INDEX;

      if (!isDark) {
        drawCharacter(ctx, col, row, asciiGrid[row][col]);
        scrambleState[cellIndex] = 0;
        settledCount++;
        if (settledCount === totalCells) revealImage();
      } else {
        drawCharacter(
          ctx,
          col,
          row,
          DENSE_CHARS[Math.floor(Math.random() * DENSE_CHARS.length)],
        );
        scrambleState[cellIndex] = SCRAMBLE_COUNT;
      }
    }, i * CELL_APPEAR_MS);
    cleanupBag.timeouts.push(tid);
  });

  const scrambleTicker = setInterval(() => {
    let stillScrambling = false;
    for (let cellIndex = 0; cellIndex < totalCells; cellIndex++) {
      const remaining = scrambleState[cellIndex];
      if (remaining === null || remaining === 0) continue;
      stillScrambling = true;
      const row = Math.floor(cellIndex / ASCII_COLUMNS);
      const col = cellIndex % ASCII_COLUMNS;

      if (remaining === 1) {
        drawCharacter(ctx, col, row, asciiGrid[row][col]);
        scrambleState[cellIndex] = 0;
        settledCount++;
        if (settledCount === totalCells) revealImage();
      } else {
        drawCharacter(
          ctx,
          col,
          row,
          DENSE_CHARS[Math.floor(Math.random() * DENSE_CHARS.length)],
        );
        scrambleState[cellIndex] = remaining - 1;
      }
    }
    if (!stillScrambling && settledCount === totalCells) {
      clearInterval(scrambleTicker);
    }
  }, SCRAMBLE_SPEED_MS);
  cleanupBag.intervals.push(scrambleTicker);
}

export function showPostImageImmediate(
  canvas: HTMLCanvasElement,
  imgEl: HTMLImageElement,
) {
  canvas.style.opacity = "0";
  imgEl.style.opacity = "1";
}
