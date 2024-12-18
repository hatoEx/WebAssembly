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

let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;

function resetCanvas() {
    const oldCanvas = document.getElementById('mandelbrot');
    const parent = oldCanvas.parentNode;
    const newCanvas = document.createElement('canvas');
    newCanvas.id = 'mandelbrot';
    newCanvas.width = width;
    newCanvas.height = height;
    parent.replaceChild(newCanvas, oldCanvas);
    return newCanvas;
}

// マウスイベントを再登録する関数
function attachMouseEvents(canvasElement) {
    canvasElement.addEventListener('mousedown', onMouseDown);
    canvasElement.addEventListener('mousemove', onMouseMove);
    canvasElement.addEventListener('mouseup', onMouseUp);
    canvasElement.addEventListener('mouseleave', onMouseUp);
    canvasElement.addEventListener('wheel', onWheel);
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
        attachMouseEvents(canvas); // 新しいcanvasにマウスイベントを再登録
        currentMode = mode;
    }

    if (mode === 'cpu') {
        await renderCPU(module);
    } else {
        await renderGPU(module);
    }
}

function sendScore(score) {
    const device_mode = renderModeSelect.value;;
    fetch('/submit_score', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
            score: score, 
            mode: device_mode
        })
    })
    .then(response => response.json())
    .then(data => console.log('Success:', data))
    .catch((error) => console.error('Error:', error));
}


function benchmarkLoop() {
    if (!isBenchmarking) return;

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
            renderModeSelect.disabled = false;  // ベンチマーク終了後に<select>を有効化
            remainingTimeValue.textContent = "0 秒";

            // ベンチマーク終了後に最終スコア表示
            finalScore.textContent = frame;
            finalScoreboard.style.display = 'block';
            sendScore(frame);
        }
    });
}

function startBenchmark() {
    if (isBenchmarking) return;
    isBenchmarking = true;
    frame = 0;
    scorevalue.textContent = frame;
    renderButton.disabled = true;
    renderModeSelect.disabled = true;  // ベンチマーク中に<select>を無効化

    benchmarkStartTime = performance.now();
    finalScoreboard.style.display = 'none'; // スタート時に非表示
    benchmarkLoop();
}

function onMouseDown(event) {
    isDragging = true;
    lastMouseX = event.clientX;
    lastMouseY = event.clientY;
}

function onMouseMove(event) {
    if (!isDragging) return;

    const adjustmentFactor = zoom; // ズーム値に応じた調整係数
    const deltaX = (event.clientX - lastMouseX) / (600 * adjustmentFactor); // 調整後の係数を使用
    const deltaY = (event.clientY - lastMouseY) / (600 * adjustmentFactor);

    offsetX -= deltaX;
    offsetY -= deltaY;

    lastMouseX = event.clientX;
    lastMouseY = event.clientY;

    render();
}

function onMouseUp() {
    isDragging = false;
}

function onWheel(event) {
    event.preventDefault(); // デフォルトのスクロール動作を無効化
    const zoomFactor = 0.1; // ズーム倍率の調整
    const maxZoom = 5; // ズームの最大値
    const minZoom = 0.5; // ズームの最小値

    if (event.deltaY < 0) {
        // ホイールを上にスクロール（ズームイン）
        zoom *= 1 + zoomFactor;
    } else {
        // ホイールを下にスクロール（ズームアウト）
        zoom /= 1 + zoomFactor;
    }

    // zoom に上限と下限を適用
    zoom = Math.min(Math.max(zoom, minZoom), maxZoom);
}



attachMouseEvents(canvas); // 初期canvasにもイベント登録

renderButton.addEventListener('click', startBenchmark);