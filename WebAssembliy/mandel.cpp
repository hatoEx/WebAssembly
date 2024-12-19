#include <cstdint>
#include <cstdlib>
#include <cmath>
#include <string>
#include <emscripten/emscripten.h>
#include <emscripten/html5.h>
#include <GLES3/gl3.h>

// HSV to RGB変換
static void hsv_to_rgb(double h, double s, double v, uint8_t& r, uint8_t& g, uint8_t& b) {
    double c = v * s;
    double x = c * (1 - fabs(fmod(h / 60.0, 2) - 1));
    double m = v - c;
    double r_prime, g_prime, b_prime;

    if (h >= 0 && h < 60) {
        r_prime = c; g_prime = x; b_prime = 0;
    }
    else if (h >= 60 && h < 120) {
        r_prime = x; g_prime = c; b_prime = 0;
    }
    else if (h >= 120 && h < 180) {
        r_prime = 0; g_prime = c; b_prime = x;
    }
    else if (h >= 180 && h < 240) {
        r_prime = 0; g_prime = x; b_prime = c;
    }
    else if (h >= 240 && h < 300) {
        r_prime = x; g_prime = 0; b_prime = c;
    }
    else {
        r_prime = c; g_prime = 0; b_prime = x;
    }

    r = static_cast<uint8_t>((r_prime + m) * 255);
    g = static_cast<uint8_t>((g_prime + m) * 255);
    b = static_cast<uint8_t>((b_prime + m) * 255);
}

extern "C" {
    uint8_t* generate_mandelbrot(int width, int height, double offsetX, double offsetY, double zoom, int maxIteration) {
        uint8_t* pixels = (uint8_t*)malloc(width * height * 4);
        if (!pixels) return nullptr;

        for (int x = 0; x < width; ++x) {
            for (int y = 0; y < height; ++y) {
                double cx = (x / (double)width - 0.5) * 3.5 / zoom + offsetX;
                double cy = (y / (double)height - 0.5) * 2.0 / zoom + offsetY;

                double zx = 0, zy = 0;
                int iteration = 0;

                while (zx * zx + zy * zy < 4 && iteration < maxIteration) {
                    double temp = zx * zx - zy * zy + cx;
                    zy = 2 * zx * zy + cy;
                    zx = temp;
                    ++iteration;
                }

                int index = (y * width + x) * 4;

                uint8_t r, g, b;
                if (iteration == maxIteration) {
                    r = g = b = 0;
                } else {
                    double hue = 360.0 * iteration / maxIteration;
                    double saturation = 1.0;
                    double value = 1.0;
                    hsv_to_rgb(hue, saturation, value, r, g, b);
                }

                pixels[index] = r;
                pixels[index + 1] = g;
                pixels[index + 2] = b;
                pixels[index + 3] = 255;
            }
        }
        return pixels;
    }

    void free_memory(uint8_t* ptr) {
        free(ptr);
    }

    // GPUレンダリング用の頂点/フラグメントシェーダーソース
    static const char* vertexShaderSource = R"(
        attribute vec2 a_position;
        varying vec2 v_coord;
        void main() {
            v_coord = a_position;
            gl_Position = vec4(a_position, 0.0, 1.0);
        }
    )";

static const char* fragmentShaderSource = R"(
  
precision highp float;
varying vec2 v_coord;

uniform float u_offsetX;
uniform float u_offsetY;
uniform float u_zoom;
uniform int u_maxIteration;

vec3 hsv_to_rgb(float h, float s, float v) {
    float c = v * s;
    float h_sector = h / 60.0;
    float x = c * (1.0 - abs(mod(h_sector, 2.0) - 1.0));
    vec3 rgb;
    if (h_sector < 1.0) rgb = vec3(c, x, 0.0);
    else if (h_sector < 2.0) rgb = vec3(x, c, 0.0);
    else if (h_sector < 3.0) rgb = vec3(0.0, c, x);
    else if (h_sector < 4.0) rgb = vec3(0.0, x, c);
    else if (h_sector < 5.0) rgb = vec3(x, 0.0, c);
    else rgb = vec3(c, 0.0, x);
    return rgb + (v - c);
}

void main() {
    
    float px = (v_coord.x / 2.0) * (3.5 / u_zoom) + u_offsetX;
    float py = ((-v_coord.y) / 2.0) * (2.0 / u_zoom) + u_offsetY;


    float zx = 0.0;
    float zy = 0.0;
    int iteration = 0;

    for (int i = 0; i < 10000; i++) {
        if (i >= u_maxIteration) {
            iteration = u_maxIteration;
            break;
        }
        float x2 = zx * zx - zy * zy + px;
        zy = 2.0 * zx * zy + py;
        zx = x2;
        if (zx * zx + zy * zy > 4.0) {
            iteration = i;
            break;
        }
    }

    if (iteration == u_maxIteration) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    } else {
        float hue = 360.0 * float(iteration) / float(u_maxIteration);
        vec3 color = hsv_to_rgb(hue, 1.0, 1.0);
        gl_FragColor = vec4(color, 1.0);
    }
}
)";


    // シェーダーコンパイル用
    static GLuint compileShader(GLenum type, const char* src) {
        GLuint shader = glCreateShader(type);
        glShaderSource(shader, 1, &src, nullptr);
        glCompileShader(shader);
        GLint compiled;
        glGetShaderiv(shader, GL_COMPILE_STATUS, &compiled);
        if(!compiled) {
            char log[512];
            glGetShaderInfoLog(shader, 512, nullptr, log);
            emscripten_log(EM_LOG_CONSOLE, "Shader compile error: %s", log);
            glDeleteShader(shader);
            return 0;
        }
        return shader;
    }

    EMSCRIPTEN_KEEPALIVE
    void render_mandelbrot_gpu(int width, int height, double offsetX, double offsetY, double zoom, int maxIteration) {
        EmscriptenWebGLContextAttributes attr;
        emscripten_webgl_init_context_attributes(&attr);
        attr.alpha = EM_TRUE;
        attr.depth = EM_FALSE;
        attr.stencil = EM_FALSE;
        attr.antialias = EM_TRUE;
        attr.majorVersion = 2; // WebGL2

        EMSCRIPTEN_WEBGL_CONTEXT_HANDLE ctx = emscripten_webgl_create_context("#mandelbrot", &attr);
        if (ctx <= 0) {
            emscripten_log(EM_LOG_CONSOLE, "Failed to create WebGL context");
            return;
        }

        emscripten_webgl_make_context_current(ctx);

        GLuint vs = compileShader(GL_VERTEX_SHADER, vertexShaderSource);
        GLuint fs = compileShader(GL_FRAGMENT_SHADER, fragmentShaderSource);
        if (!vs || !fs) return;

        GLuint program = glCreateProgram();
        glAttachShader(program, vs);
        glAttachShader(program, fs);
        glLinkProgram(program);

        GLint linked;
        glGetProgramiv(program, GL_LINK_STATUS, &linked);
        if (!linked) {
            char log[512];
            glGetProgramInfoLog(program, 512, nullptr, log);
            emscripten_log(EM_LOG_CONSOLE, "Program link error: %s", log);
            return;
        }

        glUseProgram(program);

        GLint a_position = glGetAttribLocation(program, "a_position");
        GLint u_offsetX = glGetUniformLocation(program, "u_offsetX");
        GLint u_offsetY = glGetUniformLocation(program, "u_offsetY");
        GLint u_zoom = glGetUniformLocation(program, "u_zoom");
        GLint u_maxIteration = glGetUniformLocation(program, "u_maxIteration");

        float vertices[] = {
            -1.0f, -1.0f,
             1.0f, -1.0f,
            -1.0f,  1.0f,
             1.0f,  1.0f
        };

        GLuint vbo;
        glGenBuffers(1, &vbo);
        glBindBuffer(GL_ARRAY_BUFFER, vbo);
        glBufferData(GL_ARRAY_BUFFER, sizeof(vertices), vertices, GL_STATIC_DRAW);

        glEnableVertexAttribArray((GLuint)a_position);
        glVertexAttribPointer((GLuint)a_position, 2, GL_FLOAT, GL_FALSE, 0, 0);

        glUniform1f(u_offsetX, (float)offsetX);
        glUniform1f(u_offsetY, (float)offsetY);
        glUniform1f(u_zoom, (float)zoom);
        glUniform1i(u_maxIteration, maxIteration);

        glViewport(0, 0, width, height);
        glClearColor(0, 0, 0, 1);
        glClear(GL_COLOR_BUFFER_BIT);

        glDrawArrays(GL_TRIANGLE_STRIP, 0, 4);


    }
}
