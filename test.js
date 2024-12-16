// WebAssemblyモジュールをES6モジュールとしてインポート
import createModule from './mandel.js';

const width = 800;
const height = 800;
const maxIteration = 100;

(async () => {
    const module = await createModule();

    // オフセットとズーム率を設定
    const offsetX = -0.5;
    const offsetY = 0;
    const zoom = 1;

    // WebAssemblyでピクセルデータを生成
    const pixelPtr = module._generate_mandelbrot(width, height, offsetX, offsetY, zoom, maxIteration);

    // WebAssemblyのメモリからピクセルデータを読み取る
    const pixels = new Uint8ClampedArray(module.HEAPU8.buffer, pixelPtr, width * height * 4);

    // Canvasに描画
    const canvas = document.getElementById('mandelbrot');
    const ctx = canvas.getContext('2d');
    const imageData = new ImageData(pixels, width, height);
    ctx.putImageData(imageData, 0, 0);

    // メモリを解放
    module._free_memory(pixelPtr);
})();
