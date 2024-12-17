import createModule from './mandel.js';

const width = 1920;
const height = 1080;
const maxIteration = 100;
let offsetX = 1;
let offsetY = 1;
let zoom = 1;

const wasmModulePromise = createModule();

const renderModeSelect = document.getElementById('renderMode');
const renderButton = document.getElementById('renderButton');
const scorevalue = document.getElementById('score');

let lastTime = performance.now();
let frame = 0;

let currentMode = null;
let canvas = document.getElementById('mandelbrot');
let ctx = null;

let isBenchmarking = false;  // ベンチマーク中かどうか
let benchmarkDuration = 10000; // ベンチマーク実行時間（ミリ秒）
let benchmarkStartTime = 0;

// Canvasを再生成する関数
function resetCanvas() {
    const oldCanvas = document.getElementById('mandelbrot');
    const parent = oldCanvas.parentNode;
    const newCanvas = document.createElement('canvas');
    newCanvas.id = 'mandelbrot';
    newCanvas.width = 500;
    newCanvas.height = 500;
    parent.replaceChild(newCanvas, oldCanvas);
    return newCanvas;
}

async function renderCPU(module) {
    ctx = canvas.getContext('2d');
    const pixelPtr = module._generate_mandelbrot(width, height, offsetX, offsetY, zoom, maxIteration);
    const pixels = new Uint8ClampedArray(module.HEAPU8.buffer, pixelPtr, width * height * 4);
    const imageData = new ImageData(pixels, width, height);
    ctx.putImageData(imageData, 0, 0);
    module._free_memory(pixelPtr);
}

async function renderGPU(module) {
    module._render_mandelbrot_gpu(width, height, offsetX, offsetY, zoom, maxIteration);
}

async function render() {
    const module = await wasmModulePromise;
    const mode = renderModeSelect.value;
    if (mode !== currentMode) {
        canvas = resetCanvas();
        ctx = null;
        currentMode = mode;
    }

    if (mode === 'cpu') {
        await renderCPU(module);
    } else {
        await renderGPU(module);
    }
}

function updateZoom() {
    const currentTime = performance.now();
    const delta = currentTime - lastTime;
    zoom += 0.000001 * delta;
    lastTime = currentTime;
}

// ベンチマーク用ループ
function benchmarkLoop() {
    if (!isBenchmarking) return;

    updateZoom();
    render().then(() => {
        frame++;
        scorevalue.textContent = frame;

        const now = performance.now();
        // ベンチマーク時間が過ぎているかチェック
        if (now - benchmarkStartTime < benchmarkDuration) {
            // 継続
            requestAnimationFrame(benchmarkLoop);
        } else {
            // 終了処理
            isBenchmarking = false;
            renderButton.disabled = false;
        }
    });
}

// ベンチマーク開始関数
function startBenchmark() {
    if (isBenchmarking) return;
    isBenchmarking = true;
    frame = 0;
    scorevalue.textContent = frame;
    renderButton.disabled = true;
    benchmarkStartTime = performance.now();
    benchmarkLoop();
}

// ベンチマーク実行時間を変更できるようにしたい場合は、別途入力フォームを用意し、  
// その値をbenchmarkDurationに反映させればよいです。
// ここでは固定値5秒としているため、省略。

renderButton.addEventListener('click', startBenchmark);
