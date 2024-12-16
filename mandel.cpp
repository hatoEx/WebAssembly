#include <cstdint>
#include <cstdlib>
#include <cmath>

// HSVからRGBへの変換関数
void hsv_to_rgb(double h, double s, double v, uint8_t& r, uint8_t& g, uint8_t& b) {
    double c = v * s;
    double x = c * (1 - fabs(fmod(h / 60.0, 2) - 1));
    double m = v - c;
    double r_prime, g_prime, b_prime;

    if (h >= 0 && h < 60) {
        r_prime = c;
        g_prime = x;
        b_prime = 0;
    }
    else if (h >= 60 && h < 120) {
        r_prime = x;
        g_prime = c;
        b_prime = 0;
    }
    else if (h >= 120 && h < 180) {
        r_prime = 0;
        g_prime = c;
        b_prime = x;
    }
    else if (h >= 180 && h < 240) {
        r_prime = 0;
        g_prime = x;
        b_prime = c;
    }
    else if (h >= 240 && h < 300) {
        r_prime = x;
        g_prime = 0;
        b_prime = c;
    }
    else {
        r_prime = c;
        g_prime = 0;
        b_prime = x;
    }

    r = static_cast<uint8_t>((r_prime + m) * 255);
    g = static_cast<uint8_t>((g_prime + m) * 255);
    b = static_cast<uint8_t>((b_prime + m) * 255);
}

extern "C" {
    uint8_t* generate_mandelbrot(int width, int height, double offsetX, double offsetY, double zoom, int maxIteration) {
        // メモリを確保
        uint8_t* pixels = (uint8_t*)malloc(width * height * 4);
        if (!pixels) return nullptr; // メモリ確保失敗時の処理

        for (int x = 0; x < width; ++x) {
            for (int y = 0; y < height; ++y) {
                // マンデルブロ集合の座標計算
                double cx = (x / (double)width - 0.5) * 3.5 / zoom + offsetX;
                double cy = (y / (double)height - 0.5) * 2.0 / zoom + offsetY;

                double zx = 0, zy = 0;
                int iteration = 0;

                // マンデルブロの反復計算
                while (zx * zx + zy * zy < 4 && iteration < maxIteration) {
                    double temp = zx * zx - zy * zy + cx;
                    zy = 2 * zx * zy + cy;
                    zx = temp;
                    ++iteration;
                }

                // ピクセルデータに色を設定
                int index = (y * width + x) * 4;

                uint8_t r, g, b;
                if (iteration == maxIteration) {
                    // マンデルブロ集合の内部は黒
                    r = g = b = 0;
                } else {
                    // 反復回数に基づいて色相を設定
                    double hue = 360.0 * iteration / maxIteration;
                    double saturation = 1.0;
                    double value = iteration < maxIteration ? 1.0 : 0;

                    hsv_to_rgb(hue, saturation, value, r, g, b);
                }

                pixels[index] = r;       // Red
                pixels[index + 1] = g;   // Green
                pixels[index + 2] = b;   // Blue
                pixels[index + 3] = 255; // Alpha (完全な不透明)
            }
        }

        return pixels; // ピクセルデータを返す
    }

    void free_memory(uint8_t* ptr) {
        free(ptr); // メモリを解放
    }
}
