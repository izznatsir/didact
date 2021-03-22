import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: './lib/main.js',
      name: 'Didact'
    },
    rollupOptions: {
      output: {
        exports: 'named'
      }
    }
  },
  esbuild: {
    jsxFactory: 'Didact.createElement',
    jsxInject: `import * as Didact from '../lib/main.js'`
  }
})