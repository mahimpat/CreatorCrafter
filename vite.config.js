import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';
import { resolve } from 'path';
export default defineConfig({
    plugins: [
        react(),
        electron([
            {
                entry: 'electron/main.ts',
                onstart: function (options) {
                    options.startup();
                },
                vite: {
                    build: {
                        outDir: 'dist-electron',
                        rollupOptions: {
                            external: ['electron']
                        }
                    }
                }
            },
            {
                entry: 'electron/preload.ts',
                onstart: function (options) {
                    options.reload();
                },
                vite: {
                    build: {
                        outDir: 'dist-electron'
                    }
                }
            }
        ]),
        renderer()
    ],
    resolve: {
        alias: {
            '@': resolve(__dirname, './src')
        }
    },
    server: {
        port: 5173,
        watch: {
            // Exclude directories that shouldn't be watched
            ignored: [
                '**/node_modules/**',
                '**/.venv/**',
                '**/venv/**',
                '**/dist/**',
                '**/dist-electron/**',
                '**/build/**',
                '**/release/**',
                '**/.git/**',
                '**/python/**/*.pyc',
                '**/__pycache__/**'
            ]
        }
    }
});
