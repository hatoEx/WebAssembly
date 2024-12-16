import createModule from './mandel.js';

const width = 800;
const height = 800;
const maxIteration = 100;
let offsetX = -0.5;
let offsetY = 0;
let zoom = 1;

const wasmModulePromise = createModule();

const renderModeSelect = document.getElementById('renderMode');
const renderButton = document.getElementById('renderButton');

let currentMode = null; // 直前に描画したモードを記憶する変数
let canvas = document.getElementById('mandelbrot');
let ctx = null;

// Canvasを再生成する関数
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

async function renderCPU(module) {
    // CPUの場合、2Dコンテキストを取得（リセット後にctxを再取得）
    ctx = canvas.getContext('2d');
    const pixelPtr = module._generate_mandelbrot(width, height, offsetX, offsetY, zoom, maxIteration);
    const pixels = new Uint8ClampedArray(module.HEAPU8.buffer, pixelPtr, width * height * 4);
    const imageData = new ImageData(pixels, width, height);
    ctx.putImageData(imageData, 0, 0);
    module._free_memory(pixelPtr);
}

async function renderGPU(module) {
    // GPUの場合、C++側でWebGLコンテキストを作成するのでここでctxは取らない
    module._render_mandelbrot_gpu(width, height, offsetX, offsetY, zoom, maxIteration);
}

async function render() {
    const module = await wasmModulePromise;
    const mode = renderModeSelect.value;

    // モードが切り替わった場合、Canvasを再生成する
    if (mode !== currentMode) {
        canvas = resetCanvas();
        ctx = null; // CPU時は後で再取得
        currentMode = mode;
    }

    if (mode === 'cpu') {
        await renderCPU(module);
    } else {
        await renderGPU(module);
    }
}

renderButton.addEventListener('click', render);
render(); // 初期描画
