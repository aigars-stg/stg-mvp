import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    react(),
    dts({
      insertTypesEntry: true,
      include: ['src/**/*'],
    }),
    {
      name: 'preserve-use-client',
      enforce: 'post',
      generateBundle(_, bundle) {
        for (const chunk of Object.values(bundle)) {
          if (chunk.type === 'chunk') {
            // Add 'use client' to Modal and Select components
            if (chunk.fileName.includes('Modal') || chunk.fileName.includes('Select')) {
              if (!chunk.code.startsWith("'use client'")) {
                chunk.code = `'use client';\n${chunk.code}`;
              }
            }
          }
        }
      },
    },
  ],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        tokens: resolve(__dirname, 'src/tokens/index.ts'),
        components: resolve(__dirname, 'src/components/index.ts'),
      },
      name: 'SecondTurnDesignSystem',
      formats: ['es'],
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime'],
      output: {
        preserveModules: true,
        preserveModulesRoot: 'src',
        entryFileNames: '[name].js',
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
