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
const remainingTimeValue = document.getElementById('remainingTime');
const finalScoreboard = document.getElementById('finalScoreboard');
const finalScore = document.getElementById('finalScore');

let lastTime = performance.now();
let frame = 0;

let currentMode = null;
let canvas = document.getElementById('mandelbrot');
let ctx = null;

let isBenchmarking = false;  
let benchmarkDuration = 10000; 
let benchmarkStartTime = 0;

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

function benchmarkLoop() {
    if (!isBenchmarking) return;

    updateZoom();
    render().then(() => {
        frame++;
        scorevalue.textContent = frame;

        const now = performance.now();
        const elapsed = now - benchmarkStartTime;
        const remaining = benchmarkDuration - elapsed;

        if (remaining > 0) {
            const remainingSeconds = (remaining / 1000).toFixed(2);
            remainingTimeValue.textContent = remainingSeconds + " 秒";
            requestAnimationFrame(benchmarkLoop);
        } else {
            // 終了処理
            isBenchmarking = false;
            renderButton.disabled = false;
            remainingTimeValue.textContent = "0 秒";

            // ベンチマーク終了後に最終スコア表示
            finalScore.textContent = frame;
            finalScoreboard.style.display = 'block';
        }
    });
}

function startBenchmark() {
    if (isBenchmarking) return;
    isBenchmarking = true;
    frame = 0;
    scorevalue.textContent = frame;
    renderButton.disabled = true;
    benchmarkStartTime = performance.now();
    benchmarkLoop();
}

renderButton.addEventListener('click', startBenchmark);
